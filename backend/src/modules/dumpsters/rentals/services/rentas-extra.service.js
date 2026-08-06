const db = require(
  "../../../../shared/database/db"
);

const repository = require(
  "../repositories/rentas-extra.repository"
);

const {
  registrarLog,
} = require(
  "../../../../shared/logging/logs"
);

const {
  ESTADOS_RENTA_CERRADA,
} = require(
  "../constants/rentas.constants"
);

const {
  RentaError,
  obtenerIdEmpresa,
  validarId,
  money,
  ejecutarTransaccion,
} = require(
  "../utils/rentas.utils"
);

const {
  validarExtra,
} = require(
  "../validators/rentas.validator"
);

// ======================================================
// AGREGAR CARGO EXTRA
// ======================================================

const agregarExtra = async ({
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

  const extra = validarExtra(datos);

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 1. BLOQUEAR RENTA
        // ==============================================

        const renta =
          await repository.bloquearRenta(
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
          ESTADOS_RENTA_CERRADA.includes(
            estadoRenta
          )
        ) {
          throw new RentaError(
            "No se pueden agregar cargos extras a una renta cerrada",
            400,
            "RENTA_CERRADA"
          );
        }

        // ==============================================
        // 2. INSERTAR EXTRA
        // ==============================================

        const idExtra =
          await repository.insertarExtra(
            conn,
            {
              idEmpresa,
              idRenta: id,
              tipoExtra:
                extra.tipoExtra,
              descripcion:
                extra.descripcion,
              monto:
                extra.monto,
              creadoPor,
            }
          );

        const idExtraNumero =
          Number(idExtra);

        if (
          !Number.isInteger(
            idExtraNumero
          ) ||
          idExtraNumero <= 0
        ) {
          throw new RentaError(
            "No se pudo registrar el cargo extra",
            500,
            "ID_EXTRA_NO_GENERADO"
          );
        }

        // ==============================================
        // 3. RECALCULAR FINANZAS
        // ==============================================

        const [
          totalExtras,
          totalPagado,
          finanzas,
        ] = await Promise.all([
          repository.sumarExtras(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          ),

          repository.sumarPagos(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          ),

          repository.bloquearFinanzas(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          ),
        ]);

        if (!finanzas) {
          throw new RentaError(
            "Finanzas de renta no encontradas",
            404,
            "FINANZAS_NO_ENCONTRADAS"
          );
        }

        const subtotalBase = money(
          finanzas.subtotal_base
        );

        const taxAmount = money(
          finanzas.tax_amount
        );

        const extrasActualizados =
          money(totalExtras);

        const pagadoActual =
          money(totalPagado);

        const totalFinal = money(
          subtotalBase +
            taxAmount +
            extrasActualizados
        );

        const saldoPendiente =
          money(
            Math.max(
              totalFinal -
                pagadoActual,
              0
            )
          );

        const filasActualizadas =
          await repository.actualizarFinanzas(
            conn,
            {
              idRenta: id,
              idEmpresa,

              totalExtras:
                extrasActualizados,

              totalFinal,

              saldoPendiente,
            }
          );

        if (
          Number(filasActualizadas) === 0
        ) {
          throw new RentaError(
            "No se pudieron actualizar las finanzas de la renta",
            500,
            "FINANZAS_NO_ACTUALIZADAS"
          );
        }

        return {
          idExtra:
            idExtraNumero,

          totalExtras:
            extrasActualizados,

          totalFinal,

          saldoPendiente,

          monto:
            money(extra.monto),

          tipoExtra:
            extra.tipoExtra,

          descripcion:
            extra.descripcion,
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "AGREGAR_EXTRA",
    descripcion:
      `Cargo extra #${resultado.idExtra} agregado a renta #${id}. ` +
      `Tipo: ${resultado.tipoExtra}. ` +
      `Monto: $${resultado.monto.toFixed(2)}`,
  });

  return {
    id_extra:
      resultado.idExtra,

    total_extras:
      resultado.totalExtras,

    total_final:
      resultado.totalFinal,

    saldo_pendiente:
      resultado.saldoPendiente,
  };
};

// ======================================================
// ANULAR CARGO EXTRA
// ======================================================

const anularExtra = async ({
  idExtra,
  datos = {},
  usuario,
  req,
}) => {
  const id = validarId(
    idExtra,
    "ID del cargo extra"
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
      "No se pudo identificar al usuario",
      400,
      "USUARIO_NO_IDENTIFICADO"
    );
  }

  // ====================================================
  // VALIDAR MOTIVO
  // ====================================================

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
      "El motivo de anulación no puede superar los 500 caracteres",
      400,
      "MOTIVO_ANULACION_MUY_LARGO"
    );
  }

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 1. BLOQUEAR EXTRA
        // ==============================================

        const extra =
          await repository.bloquearExtra(
            conn,
            {
              idExtra: id,
              idEmpresa,
            }
          );

        if (!extra) {
          throw new RentaError(
            "Cargo extra no encontrado",
            404,
            "EXTRA_NO_ENCONTRADO"
          );
        }

        const estadoExtra = String(
          extra.estado_pago || ""
        )
          .trim()
          .toLowerCase();

        if (
          estadoExtra === "anulado"
        ) {
          throw new RentaError(
            "El cargo extra ya se encuentra anulado",
            409,
            "EXTRA_YA_ANULADO"
          );
        }

        if (
          estadoExtra === "pagado"
        ) {
          throw new RentaError(
            "No se puede anular un cargo extra pagado. Primero debe anularse el pago relacionado.",
            409,
            "EXTRA_PAGADO_NO_ANULABLE"
          );
        }

        if (
          estadoExtra !== "pendiente"
        ) {
          throw new RentaError(
            "Solo se pueden anular cargos extras pendientes",
            409,
            "EXTRA_NO_PENDIENTE"
          );
        }

        const idRenta = Number(
          extra.id_renta
        );

        const montoExtra = money(
          extra.monto
        );

        // ==============================================
        // 2. VALIDAR ESTADO DE LA RENTA
        // ==============================================

        const renta =
          await repository.bloquearRenta(
            conn,
            {
              idRenta,
              idEmpresa,
            }
          );

        if (!renta) {
          throw new RentaError(
            "La renta asociada al cargo no fue encontrada",
            404,
            "RENTA_NO_ENCONTRADA"
          );
        }

        /*
         * Permitimos anular un extra pendiente aunque la renta
         * esté cerrada si fue generado por error.
         *
         * Si prefieres bloquearlo en rentas cerradas,
         * agrega aquí la validación de ESTADOS_RENTA_CERRADA.
         */

        // ==============================================
        // 3. ANULAR EXTRA
        // ==============================================

        const extraActualizado =
          await repository.anularExtra(
            conn,
            {
              idExtra: id,
              idEmpresa,
              motivo,
              anuladoPor,
            }
          );

        if (
          Number(extraActualizado) !== 1
        ) {
          throw new RentaError(
            "No se pudo anular el cargo extra",
            409,
            "EXTRA_NO_ANULADO"
          );
        }

        // ==============================================
        // 4. RECALCULAR FINANZAS DESDE DATOS REALES
        // ==============================================

        const [
          totalExtras,
          totalPagado,
          finanzas,
        ] = await Promise.all([
          repository.sumarExtras(
            conn,
            {
              idRenta,
              idEmpresa,
            }
          ),

          repository.sumarPagos(
            conn,
            {
              idRenta,
              idEmpresa,
            }
          ),

          repository.bloquearFinanzas(
            conn,
            {
              idRenta,
              idEmpresa,
            }
          ),
        ]);

        if (!finanzas) {
          throw new RentaError(
            "Finanzas de renta no encontradas",
            404,
            "FINANZAS_NO_ENCONTRADAS"
          );
        }

        const subtotalBase = money(
          finanzas.subtotal_base
        );

        const taxAmount = money(
          finanzas.tax_amount
        );

        const extrasActualizados =
          money(totalExtras);

        const pagadoActual =
          money(totalPagado);

        const totalFinal = money(
          subtotalBase +
            taxAmount +
            extrasActualizados
        );

        const saldoPendiente =
          money(
            Math.max(
              totalFinal -
                pagadoActual,
              0
            )
          );

        const finanzasActualizadas =
          await repository.actualizarFinanzas(
            conn,
            {
              idRenta,
              idEmpresa,

              totalExtras:
                extrasActualizados,

              totalFinal,

              saldoPendiente,
            }
          );

        if (
          Number(
            finanzasActualizadas
          ) === 0
        ) {
          throw new RentaError(
            "No se pudieron actualizar las finanzas de la renta",
            500,
            "FINANZAS_NO_ACTUALIZADAS"
          );
        }

        return {
          idExtra: id,
          idRenta,
          monto: montoExtra,

          descripcion:
            extra.descripcion ||
            extra.tipo_extra ||
            "Cargo extra",

          totalExtras:
            extrasActualizados,

          totalFinal,

          saldoPendiente,
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "ANULAR_EXTRA",
    descripcion:
      `Cargo extra #${resultado.idExtra} anulado en renta #${resultado.idRenta}. ` +
      `Monto: $${resultado.monto.toFixed(2)}. ` +
      `Motivo: ${motivo}`,
  });

  return {
    id_extra:
      resultado.idExtra,

    id_renta:
      resultado.idRenta,

    monto_anulado:
      resultado.monto,

    motivo_anulacion:
      motivo,

    estado_pago:
      "anulado",

    total_extras:
      resultado.totalExtras,

    total_final:
      resultado.totalFinal,

    saldo_pendiente:
      resultado.saldoPendiente,
  };
};


// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  agregarExtra,
  anularExtra,
};