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

const {
  validarMonto,
  sumarConceptos,
  calcularNuevoSaldo,
  distribuirTaxEntreConceptos,
  validarConsistenciaPago,
  recalcularFinanzasRenta,
} = require("./rentas-finance.service");


const anularPago = async ({
  idRenta,
  idPago,
  datos = {},
  usuario,
  req,
}) => {
  const rentaId = validarId(
    idRenta,
    "ID de la renta"
  );

  const pagoId = validarId(
    idPago,
    "ID del pago"
  );

  const idEmpresa =
    obtenerIdEmpresa({
      usuario,
      body: datos,
    });

  const anuladoPor = Number(
    usuario?.id_usuario
  );

  if (
    !Number.isInteger(anuladoPor) ||
    anuladoPor <= 0
  ) {
    throw new RentaError(
      "Usuario no autenticado",
      401,
      "USUARIO_NO_AUTENTICADO"
    );
  }

  const motivo = String(
    datos?.motivo || ""
  ).trim();

  if (motivo.length < 3) {
    throw new RentaError(
      "Debe ingresar el motivo de la anulación",
      400,
      "MOTIVO_ANULACION_REQUERIDO"
    );
  }

  if (motivo.length > 500) {
    throw new RentaError(
      "El motivo no puede superar los 500 caracteres",
      400,
      "MOTIVO_ANULACION_MUY_LARGO"
    );
  }

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        const renta =
          await repository.bloquearRenta(
            conn,
            {
              idRenta: rentaId,
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

        const estadoRenta = String(
          renta.estado || ""
        )
          .trim()
          .toLowerCase();

        const estadosBloqueados = [
          "cancelado",
          "finalizado",
        ];

        if (
          estadosBloqueados.includes(
            estadoRenta
          )
        ) {
          throw new RentaError(
            "No se pueden anular pagos de una renta cerrada",
            409,
            "RENTA_CERRADA"
          );
        }

        const pago =
          await repository.bloquearPago(
            conn,
            {
              idPago: pagoId,
              idRenta: rentaId,
              idEmpresa,
            }
          );

        if (!pago) {
          throw new RentaError(
            "Pago no encontrado",
            404,
            "PAGO_NO_ENCONTRADO"
          );
        }

        if (
          String(
            pago.estado_pago || ""
          ).toLowerCase() === "anulado"
        ) {
          throw new RentaError(
            "El pago ya se encuentra anulado",
            409,
            "PAGO_YA_ANULADO"
          );
        }

        const idsExtras =
          await repository.obtenerIdsExtrasPago(
            conn,
            {
              idPago: pagoId,
              idRenta: rentaId,
              idEmpresa,
            }
          );

        const filasPago =
          await repository.anularPago(
            conn,
            {
              idPago: pagoId,
              idRenta: rentaId,
              idEmpresa,
              motivo,
              anuladoPor,
            }
          );

        if (Number(filasPago) !== 1) {
          throw new RentaError(
            "No se pudo anular el pago",
            409,
            "PAGO_NO_ANULADO"
          );
        }

        if (idsExtras.length > 0) {
          await repository.devolverExtrasAPendiente(
            conn,
            {
              idRenta: rentaId,
              idEmpresa,
              idsExtras,
            }
          );
        }

        const finanzas =
          await recalcularFinanzasRenta(
            conn,
            {
              idRenta: rentaId,
              idEmpresa,
            }
          );

        return {
          idPago: pagoId,
          idRenta: rentaId,
          montoAnulado: money(
            pago.monto_abonado
          ),
          taxAnulado: money(
            pago.tax_pago
          ),
          idsExtras,
          finanzas,
        };
      }
    );

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "ANULAR_PAGO",
    descripcion:
      `Pago #${resultado.idPago} anulado en renta #${resultado.idRenta}. ` +
      `Monto: $${resultado.montoAnulado.toFixed(2)}. ` +
      `Tax: $${resultado.taxAnulado.toFixed(2)}. ` +
      `Motivo: ${motivo}`,
  });

  return {
    id_pago: resultado.idPago,
    id_renta: resultado.idRenta,
    monto_anulado:
      resultado.montoAnulado,
    tax_anulado:
      resultado.taxAnulado,
    extras_reabiertos:
      resultado.idsExtras,
    motivo_anulacion:
      motivo,
    estado_pago:
      "anulado",
    total_extras:
      resultado.finanzas.totalExtras,
    tax_amount:
      resultado.finanzas.taxAmount,
    total_final:
      resultado.finanzas.totalFinal,
    saldo_pendiente:
      resultado.finanzas.saldoPendiente,
  };
};
// ======================================================
// OBTENER TEXTO DEL MÉTODO DE PAGO
// ======================================================


const obtenerTextoMetodoPago = (tipoPago) => {
  const metodo = String(
    tipoPago || ""
  )
    .trim()
    .toLowerCase();

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
// NORMALIZAR CONCEPTOS RECIBIDOS
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
      const tipoRecibido = String(
        concepto?.tipo || ""
      )
        .trim()
        .toLowerCase();

      const tipoConcepto =
        tipoRecibido === "extra"
          ? "extra"
          : "renta";

      let idExtra = null;

      // ================================================
      // VALIDAR EXTRA
      // ================================================

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

        if (
          extrasProcesados.has(idExtra)
        ) {
          throw new RentaError(
            `El extra #${idExtra} está repetido en el pago`,
            400,
            "EXTRA_REPETIDO"
          );
        }

        extrasProcesados.add(idExtra);
      }

      // ================================================
      // VALIDAR MONTO DEL CONCEPTO
      // ================================================

      const montoBase = validarMonto(
        concepto.total,
        `El monto del concepto ${
          index + 1
        }`,
        {
          permitirCero: false,
        }
      );

      const descripcion =
        String(
          concepto.descripcion || ""
        ).trim() ||
        (tipoConcepto === "extra"
          ? `Cargo extra #${idExtra}`
          : "Saldo pendiente de renta");

      const numeroExtra =
        tipoConcepto === "extra"
          ? Number(
              concepto.numero_extra || 0
            ) || null
          : null;

      return {
        tipoConcepto,
        idExtra,
        numeroExtra,
        descripcion,
        montoBase,
      };
    }
  );
};

// ======================================================
// VALIDAR TOTALES ENVIADOS POR EL FRONTEND
// ======================================================

const validarTotalesPago = ({
  conceptos,
  montoPago,
  taxPago,
}) => {
  const montoPagoNormalizado =
    validarMonto(
      montoPago,
      "El total del pago",
      {
        permitirCero: false,
      }
    );

  const taxPagoNormalizado =
    validarMonto(
      taxPago,
      "El impuesto del pago"
    );

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
   * montoPago contiene:
   *
   * monto base + tax
   */
  const montoBasePago = money(
    montoPagoNormalizado -
      taxPagoNormalizado
  );

  if (montoBasePago <= 0) {
    throw new RentaError(
      "El monto base del pago debe ser mayor que cero",
      400,
      "MONTO_BASE_PAGO_INVALIDO"
    );
  }

  /*
   * La base real se calcula usando los conceptos
   * seleccionados, no confiando únicamente en el total
   * enviado desde el frontend.
   */
  const montoBaseConceptos =
    sumarConceptos(conceptos);

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
    montoPago:
      montoPagoNormalizado,

    taxPago:
      taxPagoNormalizado,

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
  // ====================================================
  // 1. VALIDACIONES GENERALES
  // ====================================================

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
   * validarPago debe devolver:
   *
   * montoPago
   * taxPago
   * tipoPago
   * observaciones
   * conceptos
   */
  const pago = validarPago(datos);

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

      montoPago:
        pago.montoPago,

      taxPago:
        pago.taxPago,
    });

  // ====================================================
  // 2. DISTRIBUIR TAX ENTRE LOS CONCEPTOS
  // ====================================================

  const detallesPago =
    distribuirTaxEntreConceptos(
      conceptosNormalizados,
      totalesPago.taxPago
    );

  /*
   * Valida:
   *
   * SUM(detalles.taxMonto) = taxPago
   * SUM(detalles.totalCobrado) = montoPago
   */
  validarConsistenciaPago({
    detalles:
      detallesPago,

    montoPago:
      totalesPago.montoPago,

    taxPago:
      totalesPago.taxPago,
  });

  // ====================================================
  // 3. EJECUTAR TRANSACCIÓN
  // ====================================================

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 3.1 BLOQUEAR RENTA Y FINANZAS
        // ==============================================

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

        const estadoRenta = String(
          renta.estado || ""
        )
          .trim()
          .toLowerCase();

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

        const saldoActual =
          validarMonto(
            renta.saldo_pendiente,
            "El saldo pendiente"
          );

        if (saldoActual <= 0) {
          throw new RentaError(
            "Esta renta no tiene saldo pendiente",
            400,
            "SIN_SALDO_PENDIENTE"
          );
        }

        /*
         * saldo_pendiente representa solamente la base
         * pendiente. El tax no se resta del saldo base.
         */
        const nuevoSaldo =
          calcularNuevoSaldo({
            saldoActual,

            montoBasePagado:
              totalesPago.montoBasePago,
          });

        const estadoPago =
          nuevoSaldo <= 0
            ? "pagado"
            : "parcial";

        // ==============================================
        // 3.2 OBTENER IDS DE EXTRAS
        // ==============================================

        const conceptosExtras =
          conceptosNormalizados.filter(
            (concepto) =>
              concepto.tipoConcepto ===
              "extra"
          );

        const idsExtras =
          conceptosExtras.map(
            (concepto) =>
              concepto.idExtra
          );

        // ==============================================
        // 3.3 VALIDAR EXTRAS PENDIENTES
        // ==============================================

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
           * Verificar que el valor enviado desde el
           * frontend coincida con el valor almacenado.
           */
          const mapaExtras =
            new Map(
              extrasValidos.map(
                (extra) => [
                  Number(
                    extra.id_extra
                  ),
                  extra,
                ]
              )
            );

          conceptosExtras.forEach(
            (concepto) => {
              const extraReal =
                mapaExtras.get(
                  concepto.idExtra
                );

              const montoReal =
                money(
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

        // ==============================================
        // 3.4 CONSTRUIR OBSERVACIÓN
        // ==============================================

        const extrasTexto =
          conceptosExtras
            .map((concepto) =>
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

        const observacionUsuario =
          String(
            pago.observaciones || ""
          ).trim();

        const observacionFinal =
          observacionUsuario ||
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

        // ==============================================
        // 3.5 INSERTAR ENCABEZADO DEL PAGO
        // ==============================================

        const idPago =
          await repository.insertarPago(
            conn,
            {
              idEmpresa,

              idRenta: id,

              idCliente:
                renta.id_cliente,

              /*
               * Dinero total recibido:
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

        const idPagoNumero =
          Number(idPago);

        if (
          !Number.isInteger(
            idPagoNumero
          ) ||
          idPagoNumero <= 0
        ) {
          throw new RentaError(
            "No se pudo obtener el ID del pago registrado",
            500,
            "ID_PAGO_NO_GENERADO"
          );
        }

        // ==============================================
        // 3.6 INSERTAR DETALLES DEL PAGO
        // ==============================================

        const detallesInsertados =
          await repository.insertarDetallesPago(
            conn,
            {
              idEmpresa,

              idPago:
                idPagoNumero,

              idRenta:
                id,

              detalles:
                detallesPago,
            }
          );

        if (
          Number(detallesInsertados) !==
          detallesPago.length
        ) {
          throw new RentaError(
            "No se pudieron registrar todos los detalles del pago",
            500,
            "DETALLES_PAGO_INCOMPLETOS"
          );
        }

        // ==============================================
        // 3.7 MARCAR EXTRAS COMO PAGADOS
        // ==============================================

        if (idsExtras.length > 0) {
          const extrasActualizados =
            await repository.marcarExtrasPagados(
              conn,
              {
                idRenta:
                  id,

                idEmpresa,

                idsExtras,
              }
            );

          if (
            Number(extrasActualizados) !==
            idsExtras.length
          ) {
            throw new RentaError(
              "No se pudieron marcar todos los extras como pagados",
              409,
              "EXTRAS_NO_ACTUALIZADOS"
            );
          }
        }

        // ==============================================
        // 3.8 ACUMULAR TAX EN FINANZAS
        // ==============================================

        if (
          totalesPago.taxPago > 0
        ) {
          const finanzasTaxActualizadas =
            await repository.agregarTax(
              conn,
              {
                idRenta:
                  id,

                idEmpresa,

                taxPago:
                  totalesPago.taxPago,
              }
            );

          if (
            Number(
              finanzasTaxActualizadas
            ) === 0
          ) {
            throw new RentaError(
              "No se pudo actualizar el impuesto de la renta",
              500,
              "TAX_NO_ACTUALIZADO"
            );
          }
        }

        // ==============================================
        // 3.9 ACTUALIZAR SALDO
        // ==============================================

        const finanzasActualizadas =
          await repository.actualizarSaldo(
            conn,
            {
              idRenta:
                id,

              idEmpresa,

              saldo:
                nuevoSaldo,
            }
          );

        if (
          Number(
            finanzasActualizadas
          ) === 0
        ) {
          throw new RentaError(
            "No se pudo actualizar el saldo de la renta",
            500,
            "SALDO_NO_ACTUALIZADO"
          );
        }

        return {
          idPago:
            idPagoNumero,

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

  // ====================================================
  // 4. REGISTRAR AUDITORÍA
  // ====================================================

  await registrarLog({
    req,

    modulo:
      "Rentas",

    accion:
      "REGISTRAR_PAGO",

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

  // ====================================================
  // 5. RESPUESTA DEL SERVICE
  // ====================================================

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
  anularPago,

};