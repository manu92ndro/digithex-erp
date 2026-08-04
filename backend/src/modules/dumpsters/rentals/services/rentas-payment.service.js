const db = require(
  "../../../../shared/database/db"
);

const repository = require(
  "../repositories/rentas-payment.repository"
);

const {
  registrarLog,
} = require(
  "../../../../shared/logging/logs"
);

const {
  RentaError,
  obtenerIdEmpresa,
  validarId,
  money,
  ejecutarTransaccion,
} = require("../utils/rentas.utils");

const {
  validarPago,
} = require("../validators/rentas.validator");

// ======================================================
// UTILIDADES
// ======================================================

const redondear = (valor) =>
  Number(Number(valor || 0).toFixed(2));

const obtenerTextoMetodoPago = (tipoPago) => {
  const metodo = String(
    tipoPago || ""
  ).toLowerCase();

  if (metodo === "cash") {
    return "Efectivo";
  }

  if (metodo === "card") {
    return "Tarjeta";
  }

  if (metodo === "transfer") {
    return "Transferencia";
  }

  return metodo || "No especificado";
};

// ======================================================
// NORMALIZAR CONCEPTOS
// ======================================================

const normalizarConceptos = (
  conceptosRecibidos
) => {
  if (
    !Array.isArray(conceptosRecibidos) ||
    conceptosRecibidos.length === 0
  ) {
    throw new RentaError(
      "Debes seleccionar al menos un concepto",
      400,
      "CONCEPTOS_REQUERIDOS"
    );
  }

  const extrasProcesados = new Set();

  return conceptosRecibidos.map(
    (concepto, index) => {
      const tipoConcepto =
        String(concepto?.tipo || "")
          .trim()
          .toLowerCase() === "extra"
          ? "extra"
          : "renta";

      let idExtra = null;

      if (tipoConcepto === "extra") {
        idExtra = Number(
          concepto.id_extra
        );

        if (
          !Number.isInteger(idExtra) ||
          idExtra <= 0
        ) {
          throw new RentaError(
            `El extra seleccionado en la posición ${
              index + 1
            } no es válido`,
            400,
            "ID_EXTRA_INVALIDO"
          );
        }

        if (extrasProcesados.has(idExtra)) {
          throw new RentaError(
            `El extra #${idExtra} está repetido en el pago`,
            400,
            "EXTRA_REPETIDO"
          );
        }

        extrasProcesados.add(idExtra);
      }

      const montoBase = redondear(
        concepto.total
      );

      if (
        !Number.isFinite(montoBase) ||
        montoBase <= 0
      ) {
        throw new RentaError(
          `El monto del concepto ${
            index + 1
          } debe ser mayor que cero`,
          400,
          "MONTO_CONCEPTO_INVALIDO"
        );
      }

      const descripcion =
        String(
          concepto.descripcion || ""
        ).trim() ||
        (tipoConcepto === "extra"
          ? `Cargo extra #${idExtra}`
          : "Saldo de renta");

      return {
        tipoConcepto,
        idExtra,
        descripcion,
        montoBase,

        numeroExtra:
          tipoConcepto === "extra"
            ? Number(
                concepto.numero_extra || 0
              ) || null
            : null,
      };
    }
  );
};

// ======================================================
// DISTRIBUIR TAX ENTRE CONCEPTOS
// ======================================================

const distribuirTaxEntreConceptos = (
  conceptos,
  taxTotal
) => {
  const taxNormalizado =
    redondear(taxTotal);

  const baseTotal = redondear(
    conceptos.reduce(
      (total, concepto) =>
        total +
        Number(
          concepto.montoBase || 0
        ),
      0
    )
  );

  if (
    conceptos.length === 0 ||
    baseTotal <= 0 ||
    taxNormalizado <= 0
  ) {
    return conceptos.map(
      (concepto) => ({
        ...concepto,
        taxMonto: 0,
        totalCobrado: redondear(
          concepto.montoBase
        ),
      })
    );
  }

  let taxDistribuido = 0;

  return conceptos.map(
    (concepto, index) => {
      const esUltimo =
        index === conceptos.length - 1;

      /*
       * Al último concepto se le asigna la diferencia
       * restante para evitar errores de uno o dos centavos.
       */
      const taxMonto = esUltimo
        ? redondear(
            taxNormalizado -
              taxDistribuido
          )
        : redondear(
            (concepto.montoBase /
              baseTotal) *
              taxNormalizado
          );

      taxDistribuido = redondear(
        taxDistribuido + taxMonto
      );

      return {
        ...concepto,
        taxMonto,
        totalCobrado: redondear(
          concepto.montoBase +
            taxMonto
        ),
      };
    }
  );
};

// ======================================================
// VALIDAR TOTALES DEL PAGO
// ======================================================

const validarTotalesPago = ({
  conceptos,
  montoPago,
  taxPago,
}) => {
  const montoPagoNormalizado =
    redondear(montoPago);

  const taxPagoNormalizado =
    redondear(taxPago);

  if (
    montoPagoNormalizado <= 0
  ) {
    throw new RentaError(
      "El monto del pago debe ser mayor que cero",
      400,
      "MONTO_PAGO_INVALIDO"
    );
  }

  if (
    taxPagoNormalizado < 0
  ) {
    throw new RentaError(
      "El impuesto del pago no puede ser negativo",
      400,
      "TAX_PAGO_INVALIDO"
    );
  }

  if (
    taxPagoNormalizado >
    montoPagoNormalizado
  ) {
    throw new RentaError(
      "El impuesto no puede ser mayor que el total cobrado",
      400,
      "TAX_MAYOR_PAGO"
    );
  }

  /*
   * montoPago representa:
   * base pagada + impuesto.
   */
  const montoBasePago = redondear(
    montoPagoNormalizado -
      taxPagoNormalizado
  );

  const montoBaseConceptos =
    redondear(
      conceptos.reduce(
        (total, concepto) =>
          total +
          concepto.montoBase,
        0
      )
    );

  /*
   * La base calculada desde los conceptos debe coincidir
   * con el pago sin tax.
   */
  if (
    Math.abs(
      montoBasePago -
        montoBaseConceptos
    ) > 0.01
  ) {
    throw new RentaError(
      `La suma de los conceptos ($${montoBaseConceptos.toFixed(
        2
      )}) no coincide con el pago base ($${montoBasePago.toFixed(
        2
      )})`,
      400,
      "TOTAL_CONCEPTOS_NO_COINCIDE"
    );
  }

  return {
    montoPago: montoPagoNormalizado,
    taxPago: taxPagoNormalizado,
    montoBasePago,
    montoBaseConceptos,
  };
};

// ======================================================
// REGISTRAR PAGO
// ======================================================

const registrarPago = async ({
  idRenta,
  datos,
  usuario,
  req,
}) => {
  const id = validarId(
    idRenta,
    "ID de la renta"
  );

  const idEmpresa =
    obtenerIdEmpresa({
      usuario,
      body: datos,
    });

  const creadoPor = Number(
    usuario?.id_usuario
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

  /*
   * validarPago debe seguir validando:
   * - montoPago
   * - taxPago
   * - tipoPago
   * - conceptos
   * - observaciones
   */
  const pago = validarPago(datos);

  /*
   * Usamos primero lo validado.
   * Si tu validator conserva conceptos en datos,
   * también dejamos ese respaldo.
   */
  const conceptosRecibidos =
    Array.isArray(pago.conceptos)
      ? pago.conceptos
      : Array.isArray(datos.conceptos)
        ? datos.conceptos
        : [];

  const conceptosNormalizados =
    normalizarConceptos(
      conceptosRecibidos
    );

  const totalesPago =
    validarTotalesPago({
      conceptos:
        conceptosNormalizados,
      montoPago: pago.montoPago,
      taxPago: pago.taxPago,
    });

  const detallesPago =
    distribuirTaxEntreConceptos(
      conceptosNormalizados,
      totalesPago.taxPago
    );

  /*
   * Verificación interna adicional:
   * suma de detalles = total cobrado.
   */
  const sumaDetalles = redondear(
    detallesPago.reduce(
      (total, detalle) =>
        total +
        detalle.totalCobrado,
      0
    )
  );

  if (
    Math.abs(
      sumaDetalles -
        totalesPago.montoPago
    ) > 0.01
  ) {
    throw new RentaError(
      "La distribución del pago no coincide con el total cobrado",
      500,
      "ERROR_DISTRIBUCION_PAGO"
    );
  }

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ================================================
        // 1. BLOQUEAR FINANZAS DE LA RENTA
        // ================================================

        const renta =
          await repository.bloquearRentaFinanzas(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          );

        if (!renta) {
          throw new RentaError(
            "Renta no encontrada",
            404,
            "RENTA_NO_ENCONTRADA"
          );
        }

        const estadoRenta =
          String(
            renta.estado || ""
          ).toLowerCase();

        if (
          estadoRenta === "finalizado" ||
          estadoRenta === "cancelado"
        ) {
          throw new RentaError(
            "No se pueden registrar pagos en una renta cerrada",
            400,
            "RENTA_CERRADA"
          );
        }

        const saldoActual = money(
          renta.saldo_pendiente
        );

        if (saldoActual <= 0) {
          throw new RentaError(
            "Esta renta no tiene saldo pendiente",
            400,
            "SIN_SALDO_PENDIENTE"
          );
        }

        /*
         * El saldo pendiente representa base sin pagar.
         * Por eso se compara contra montoBasePago,
         * no contra el total con tax.
         */
        if (
          totalesPago.montoBasePago >
          saldoActual + 0.01
        ) {
          throw new RentaError(
            `El pago base ($${totalesPago.montoBasePago.toFixed(
              2
            )}) no puede ser mayor al saldo pendiente ($${saldoActual.toFixed(
              2
            )})`,
            400,
            "PAGO_MAYOR_SALDO"
          );
        }

        // ================================================
        // 2. VALIDAR EXTRAS SELECCIONADOS
        // ================================================

        const idsExtras =
          conceptosNormalizados
            .filter(
              (concepto) =>
                concepto.tipoConcepto ===
                "extra"
            )
            .map(
              (concepto) =>
                concepto.idExtra
            );

        if (idsExtras.length > 0) {
          const extrasValidos =
            await repository.bloquearExtrasPendientes(
              conn,
              {
                idRenta: id,
                idEmpresa,
                idsExtras,
              }
            );

          if (
            !Array.isArray(extrasValidos) ||
            extrasValidos.length !==
              idsExtras.length
          ) {
            throw new RentaError(
              "Uno o más extras ya fueron pagados, anulados o no pertenecen a esta renta",
              409,
              "EXTRAS_NO_DISPONIBLES"
            );
          }

          /*
           * Validamos que el monto enviado por el frontend
           * coincida con el valor real almacenado.
           */
          const mapaExtras = new Map(
            extrasValidos.map(
              (extra) => [
                Number(
                  extra.id_extra
                ),
                extra,
              ]
            )
          );

          conceptosNormalizados
            .filter(
              (concepto) =>
                concepto.tipoConcepto ===
                "extra"
            )
            .forEach(
              (concepto) => {
                const extraReal =
                  mapaExtras.get(
                    concepto.idExtra
                  );

                const montoReal =
                  redondear(
                    extraReal?.monto
                  );

                if (
                  Math.abs(
                    montoReal -
                      concepto.montoBase
                  ) > 0.01
                ) {
                  throw new RentaError(
                    `El monto del extra #${concepto.idExtra} no coincide con el valor registrado`,
                    400,
                    "MONTO_EXTRA_NO_COINCIDE"
                  );
                }
              }
            );
        }

        // ================================================
        // 3. CALCULAR NUEVO SALDO
        // ================================================

        const nuevoSaldo = money(
          Math.max(
            saldoActual -
              totalesPago.montoBasePago,
            0
          )
        );

        const estadoPago =
          nuevoSaldo <= 0
            ? "pagado"
            : "parcial";

        // ================================================
        // 4. GENERAR OBSERVACIÓN
        // ================================================

        const extrasTexto =
          conceptosNormalizados
            .filter(
              (concepto) =>
                concepto.tipoConcepto ===
                "extra"
            )
            .map(
              (concepto) =>
                concepto.numeroExtra
                  ? `Extra #${concepto.numeroExtra}`
                  : `Extra ID ${concepto.idExtra}`
            )
            .join(", ");

        const contieneRenta =
          conceptosNormalizados.some(
            (concepto) =>
              concepto.tipoConcepto ===
              "renta"
          );

        const conceptosTexto = [
          contieneRenta
            ? "saldo de renta"
            : null,
          extrasTexto || null,
        ]
          .filter(Boolean)
          .join(" y ");

        const observacionFinal =
          String(
            pago.observaciones || ""
          ).trim() ||
          `Pago de ${
            conceptosTexto ||
            "conceptos seleccionados"
          }. Base: $${totalesPago.montoBasePago.toFixed(
            2
          )}, tax: $${totalesPago.taxPago.toFixed(
            2
          )}, total: $${totalesPago.montoPago.toFixed(
            2
          )}`;

        // ================================================
        // 5. INSERTAR ENCABEZADO DEL PAGO
        // ================================================

        const idPago =
          await repository.insertarPago(
            conn,
            {
              idEmpresa,
              idRenta: id,

              idCliente:
                renta.id_cliente,

              /*
               * Total realmente recibido:
               * base + tax.
               */
              montoPago:
                totalesPago.montoPago,

              taxPago:
                totalesPago.taxPago,

              tipoPago:
                pago.tipoPago,

              estadoPago,

              observaciones:
                observacionFinal,

              creadoPor,
            }
          );

        if (
          !Number.isInteger(
            Number(idPago)
          ) ||
          Number(idPago) <= 0
        ) {
          throw new RentaError(
            "No se pudo obtener el ID del pago registrado",
            500,
            "ID_PAGO_NO_GENERADO"
          );
        }

        // ================================================
        // 6. INSERTAR DETALLES DEL PAGO
        // Tabla: tb_renta_pago_detalles
        // ================================================

        await repository.insertarDetallesPago(
          conn,
          {
            idEmpresa,
            idPago: Number(idPago),
            idRenta: id,
            detalles:
              detallesPago,
          }
        );

        // ================================================
        // 7. MARCAR EXTRAS COMO PAGADOS
        // ================================================

        if (idsExtras.length > 0) {
          await repository.marcarExtrasPagados(
            conn,
            {
              idRenta: id,
              idEmpresa,
              idsExtras,
            }
          );
        }

        // ================================================
        // 8. ACUMULAR TAX DEL PAGO
        // ================================================

        if (
          totalesPago.taxPago > 0
        ) {
          await repository.agregarTax(
            conn,
            {
              idRenta: id,
              idEmpresa,
              taxPago:
                totalesPago.taxPago,
            }
          );
        }

        // ================================================
        // 9. ACTUALIZAR SALDO
        // ================================================

        await repository.actualizarSaldo(
          conn,
          {
            idRenta: id,
            idEmpresa,
            saldo: nuevoSaldo,
          }
        );

        return {
          idPago:
            Number(idPago),

          nuevoSaldo,

          estadoPago,

          montoBase:
            totalesPago.montoBasePago,

          taxPago:
            totalesPago.taxPago,

          totalCobrado:
            totalesPago.montoPago,

          detallesRegistrados:
            detallesPago.length,
        };
      }
    );

  // ======================================================
  // AUDITORÍA
  // ======================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "REGISTRAR_PAGO",
    descripcion:
      `Pago #${resultado.idPago} registrado en renta #${id}. ` +
      `Base: $${resultado.montoBase.toFixed(
        2
      )}, ` +
      `tax: $${resultado.taxPago.toFixed(
        2
      )}, ` +
      `total cobrado: $${resultado.totalCobrado.toFixed(
        2
      )}, ` +
      `método: ${obtenerTextoMetodoPago(
        pago.tipoPago
      )}, ` +
      `saldo restante: $${resultado.nuevoSaldo.toFixed(
        2
      )}`,
  });

  return {
    id_pago:
      resultado.idPago,

    monto_base:
      resultado.montoBase,

    tax_pago:
      resultado.taxPago,

    total_cobrado:
      resultado.totalCobrado,

    saldo_pendiente:
      resultado.nuevoSaldo,

    estado_pago:
      resultado.estadoPago,

    detalles_registrados:
      resultado.detallesRegistrados,
  };
};

module.exports = {
  registrarPago,
};