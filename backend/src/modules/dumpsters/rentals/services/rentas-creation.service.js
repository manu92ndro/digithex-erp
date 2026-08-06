const db = require("../../../../shared/database/db");

const repository = require(
  "../repositories/rentas-creation.repository"
);

const {
  registrarLog,
} = require("../../../../shared/logging/logs");

const {
  RentaError,
  obtenerIdEmpresa,
  money,
  ejecutarTransaccion,
} = require("../utils/rentas.utils");

const {
  validarCrearRenta,
} = require("../validators/rentas.validator");

// ======================================================
// NORMALIZAR TAX
// Permite almacenar 65 o 0.65 en la base de datos.
// Ambos representan 65 %.
// ======================================================

const normalizarTaxRate = (valor) => {
  const rate = Number(valor || 0);

  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }

  return rate > 1
    ? rate / 100
    : rate;
};

// ======================================================
// NORMALIZAR ESTADO DE PAGO
// ======================================================

const normalizarEstadoPago = (valor) => {
  const estado = String(
    valor || "pending"
  )
    .trim()
    .toLowerCase();

  const estadosValidos = [
    "pending",
    "partial",
    "paid",
  ];

  if (!estadosValidos.includes(estado)) {
    throw new RentaError(
      "El estado de pago no es válido",
      400,
      "ESTADO_PAGO_INVALIDO"
    );
  }

  return estado;
};

// ======================================================
// CREAR RENTA
// ======================================================

const crearRenta = async ({
  datos,
  usuario,
  req,
}) => {
  const idEmpresa = obtenerIdEmpresa({
    usuario,
    body: datos,
  });

  const creadoPor = Number(
    usuario.id_usuario
  );

  if (
    !Number.isInteger(creadoPor) ||
    creadoPor <= 0
  ) {
    throw new RentaError(
      "No se pudo identificar al usuario",
      400,
      "USUARIO_NO_IDENTIFICADO"
    );
  }

  const validado =
    validarCrearRenta(datos);

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==================================================
        // 1. BLOQUEAR Y VALIDAR DUMPSTER
        // ==================================================

        const dumpster =
          await repository.bloquearDumpsterDisponible(
            conn,
            {
              idDumpster:
                validado.idDumpster,
              idEmpresa,
            }
          );

        if (!dumpster) {
          throw new RentaError(
            "El dumpster no está disponible",
            409,
            "DUMPSTER_NO_DISPONIBLE"
          );
        }

        // ==================================================
        // 2. IMPUESTO DE LA EMPRESA
        // ==================================================

        const impuesto =
          await repository.obtenerImpuestoActivo(
            conn,
            idEmpresa
          );

        const taxRate =
          normalizarTaxRate(
            impuesto?.tax_rate
          );

        // ==================================================
        // 3. INFORMACIÓN DEL PAGO INICIAL
        // ==================================================

        const estadoPago =
          normalizarEstadoPago(
            datos.estado_pago
          );

        const precioBase = money(
          validado.precioBase
        );

        let montoBasePagado = 0;

        if (estadoPago === "paid") {
          montoBasePagado =
            precioBase;
        }

        if (estadoPago === "partial") {
          montoBasePagado = money(
            datos.monto_abonado
          );
        }

        if (estadoPago === "pending") {
          montoBasePagado = 0;
        }

        // ==================================================
        // 4. VALIDACIONES DEL ABONO BASE
        // ==================================================

        if (
          !Number.isFinite(
            montoBasePagado
          ) ||
          montoBasePagado < 0
        ) {
          throw new RentaError(
            "El monto abonado no es válido",
            400,
            "MONTO_ABONADO_INVALIDO"
          );
        }

        if (
          estadoPago === "partial" &&
          montoBasePagado <= 0
        ) {
          throw new RentaError(
            "El abono parcial debe ser mayor que cero",
            400,
            "ABONO_PARCIAL_INVALIDO"
          );
        }

        /*
         * Esta comparación se hace contra el precio base.
         * No se compara el total con tax.
         *
         * Ejemplo:
         * precio base = 250
         * abono base = 200
         * tax = 130
         * total cobrado = 330
         *
         * 200 no supera 250, por tanto es válido.
         */
        if (
          montoBasePagado >
          precioBase
        ) {
          throw new RentaError(
            "El abono base no puede ser mayor al precio de la renta",
            400,
            "ABONO_MAYOR_SUBTOTAL"
          );
        }

        // ==================================================
        // 5. CÁLCULO DEL TAX DEL PAGO INICIAL
        // ==================================================

        const aplicaTaxBase =
          Boolean(
            datos.aplica_tax_base
          );

        const taxPagoInicial =
          money(
            aplicaTaxBase &&
              montoBasePagado > 0
              ? montoBasePagado *
                  taxRate
              : 0
          );

        /*
         * Dinero real recibido.
         *
         * Ejemplo:
         * base pagada = 200
         * tax = 130
         * total recibido = 330
         */
        const totalCobradoInicial =
          money(
            montoBasePagado +
              taxPagoInicial
          );

        /*
         * Total acumulado de la renta hasta este momento:
         *
         * precio base completo
         * + impuesto generado por los pagos realizados
         */
        const totalFinal = money(
          precioBase +
            taxPagoInicial
        );

        /*
         * El saldo representa únicamente el precio base
         * que todavía falta pagar.
         *
         * El tax del pago ya fue cobrado y no debe volver
         * a quedar pendiente.
         */
        const saldoPendiente =
          money(
            Math.max(
              precioBase -
                montoBasePagado,
              0
            )
          );

        // ==================================================
        // 6. CREAR RENTA
        // ==================================================

        const idRenta =
          await repository.insertarRenta(
            conn,
            {
              idEmpresa,

              idDumpster:
                validado.idDumpster,

              idCliente:
                validado.idCliente,

              idCamion:
                validado.idCamion,

              idMaterial:
                validado.idMaterial,

              idUbicacion:
                validado.idUbicacion,

              fechaInicio:
                datos.fecha_inicio,

              diasRenta:
                validado.diasRenta,

              fechaEstimadaDevolucion:
                datos.fecha_estimada_devolucion,

              direccionEntrega:
                datos.direccion_entrega ||
                null,

              latitud:
                datos.latitud || null,

              longitud:
                datos.longitud || null,

              observaciones:
                datos.observaciones ||
                null,

              creadoPor,
            }
          );

        // ==================================================
        // 7. CREAR FINANZAS
        // ==================================================

        await repository.insertarFinanzas(
          conn,
          {
            idEmpresa,
            idRenta,

            subtotalBase:
              precioBase,

            aplicaTaxBase,

            taxRate,

            taxAmount:
              taxPagoInicial,

            totalFinal,

            saldoPendiente,
          }
        );

        // ==================================================
        // 8. REGISTRAR PAGO INICIAL Y SU DETALLE
        // ==================================================

        if (
          estadoPago !== "pending" &&
          totalCobradoInicial > 0
        ) {
          /*
          * Guardaremos estados en español dentro de la BD,
          * igual que los pagos posteriores:
          *
          * pagado
          * parcial
          */
          const estadoPagoRegistro =
            saldoPendiente <= 0
              ? "pagado"
              : "parcial";

          const observacionPagoInicial =
            `Pago inicial de renta. ` +
            `Base: $${montoBasePagado.toFixed(2)}, ` +
            `Tax: $${taxPagoInicial.toFixed(2)}, ` +
            `Total cobrado: $${totalCobradoInicial.toFixed(2)}`;

          // ================================================
          // 8.1 INSERTAR ENCABEZADO DEL PAGO
          // ================================================

          const idPagoInicial =
            await repository.insertarPagoInicial(
              conn,
              {
                idEmpresa,
                idRenta,

                idCliente:
                  validado.idCliente,

                /*
                * Total realmente recibido:
                * base + impuesto.
                */
                montoAbonado:
                  totalCobradoInicial,

                taxPago:
                  taxPagoInicial,

                tipoPago:
                  datos.tipo_pago ||
                  "cash",

                estadoPago:
                  estadoPagoRegistro,

                observaciones:
                  observacionPagoInicial,

                creadoPor,
              }
            );

          if (
            !Number.isInteger(
              Number(idPagoInicial)
            ) ||
            Number(idPagoInicial) <= 0
          ) {
            throw new RentaError(
              "No se pudo obtener el ID del pago inicial",
              500,
              "ID_PAGO_INICIAL_NO_GENERADO"
            );
          }

          // ================================================
          // 8.2 INSERTAR DETALLE DEL PAGO
          // ================================================

          await repository.insertarDetallePagoInicial(
            conn,
            {
              idEmpresa,

              idPago:
                Number(idPagoInicial),

              idRenta,

              /*
              * Parte del pago que reduce el saldo.
              */
              montoBase:
                montoBasePagado,

              /*
              * Impuesto cobrado en esta operación.
              */
              taxMonto:
                taxPagoInicial,

              /*
              * Dinero total entregado por el cliente.
              */
              totalCobrado:
                totalCobradoInicial,

              descripcion:
                "Pago inicial de renta",
            }
          );
        }
        // ==================================================
        // 9. MARCAR DUMPSTER COMO RENTADO
        // ==================================================

        await repository.marcarDumpsterRentado(
          conn,
          {
            idDumpster:
              validado.idDumpster,

            idEmpresa,
          }
        );

        return {
          idRenta,
          precioBase,
          montoBasePagado,
          taxPagoInicial,
          totalCobradoInicial,
          saldoPendiente,
          totalFinal,
        };
      }
    );

  // ======================================================
  // 10. AUDITORÍA
  // ======================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "CREAR",
    descripcion:
      `Renta creada #${resultado.idRenta}. ` +
      `Base: $${resultado.precioBase.toFixed(2)}, ` +
      `abono base: $${resultado.montoBasePagado.toFixed(2)}, ` +
      `tax: $${resultado.taxPagoInicial.toFixed(2)}, ` +
      `cobrado: $${resultado.totalCobradoInicial.toFixed(2)}, ` +
      `saldo: $${resultado.saldoPendiente.toFixed(2)}`,
  });

  return {
    id_renta:
      resultado.idRenta,

    subtotal_base:
      resultado.precioBase,

    monto_base_pagado:
      resultado.montoBasePagado,

    tax_pago:
      resultado.taxPagoInicial,

    total_cobrado:
      resultado.totalCobradoInicial,

    saldo_pendiente:
      resultado.saldoPendiente,

    total_final:
      resultado.totalFinal,
  };
};

module.exports = {
  crearRenta,
};