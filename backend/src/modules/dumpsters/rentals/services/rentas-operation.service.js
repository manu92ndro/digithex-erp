const db = require(
  "../../../../shared/database/db"
);

const repository = require(
  "../repositories/rentas-operation.repository"
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
  calcularDias,
  ejecutarTransaccion,
} = require(
  "../utils/rentas.utils"
);

// ======================================================
// ESTADOS PERMITIDOS POR OPERACIÓN
// ======================================================

/*
 * Cancelar significa que el servicio no llegó a completarse.
 *
 * "en_entrega" se permite únicamente si ese estado significa
 * que el chofer está en camino, pero todavía no ha entregado.
 *
 * Si en tu negocio "en_entrega" significa que el dumpster
 * ya fue entregado, elimínalo de esta lista.
 */
const ESTADOS_CANCELABLES = [
  "pendiente",
  "programada",
  "en_entrega",
];

/*
 * Una renta solo debe finalizarse cuando el dumpster ya estuvo
 * con el cliente o se encuentra en proceso de retiro.
 */
const ESTADOS_FINALIZABLES = [
  "en_uso",
  "en_retiro",
];

// ======================================================
// UTILIDADES
// ======================================================

const normalizarEstado = (estado) =>
  String(estado || "")
    .trim()
    .toLowerCase();

const validarMotivo = (
  motivoRecibido,
  {
    nombre = "El motivo",
    minimo = 3,
    maximo = 500,
  } = {}
) => {
  const motivo = String(
    motivoRecibido || ""
  ).trim();

  if (motivo.length < minimo) {
    throw new RentaError(
      `${nombre} debe tener al menos ${minimo} caracteres`,
      400,
      "MOTIVO_REQUERIDO"
    );
  }

  if (motivo.length > maximo) {
    throw new RentaError(
      `${nombre} no puede superar los ${maximo} caracteres`,
      400,
      "MOTIVO_MUY_LARGO"
    );
  }

  return motivo;
};

// ======================================================
// FINALIZAR RENTA
// ======================================================

const finalizarRenta = async ({
  idRenta,
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
    });

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 1. BLOQUEAR Y OBTENER RENTA
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

        const estadoActual =
          normalizarEstado(
            renta.estado
          );

        // ==============================================
        // 2. VALIDAR ESTADO
        // ==============================================

        if (
          estadoActual ===
          "finalizado"
        ) {
          throw new RentaError(
            "La renta ya se encuentra finalizada",
            409,
            "RENTA_YA_FINALIZADA"
          );
        }

        if (
          estadoActual ===
          "cancelado"
        ) {
          throw new RentaError(
            "No se puede finalizar una renta cancelada",
            409,
            "RENTA_CANCELADA"
          );
        }

        if (
          !ESTADOS_FINALIZABLES.includes(
            estadoActual
          )
        ) {
          throw new RentaError(
            "La renta solo puede finalizarse cuando está en uso o en proceso de retiro",
            409,
            "RENTA_NO_FINALIZABLE"
          );
        }

        // ==============================================
        // 3. FINALIZAR RENTA
        // ==============================================

        const rentaActualizada =
          await repository.finalizar(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          );

        if (
          Number(rentaActualizada) !== 1
        ) {
          throw new RentaError(
            "No se pudo finalizar la renta",
            409,
            "RENTA_NO_FINALIZADA"
          );
        }

        // ==============================================
        // 4. LIBERAR DUMPSTER
        // ==============================================

        const dumpsterLiberado =
          await repository.liberarDumpster(
            conn,
            {
              idDumpster:
                renta.id_dumpster,

              idEmpresa,
            }
          );

        if (
          Number(dumpsterLiberado) !== 1
        ) {
          throw new RentaError(
            "No se pudo liberar el dumpster",
            500,
            "DUMPSTER_NO_LIBERADO"
          );
        }

        return {
          idRenta: id,
          idDumpster:
            Number(
              renta.id_dumpster
            ),

          estadoAnterior:
            estadoActual,

          estadoNuevo:
            "finalizado",
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "FINALIZAR",
    descripcion:
      `Renta #${resultado.idRenta} finalizada. ` +
      `Estado anterior: ${resultado.estadoAnterior}. ` +
      `Dumpster #${resultado.idDumpster} liberado.`,
  });

  return {
    id_renta:
      resultado.idRenta,

    id_dumpster:
      resultado.idDumpster,

    estado:
      resultado.estadoNuevo,
  };
};

// ======================================================
// CANCELAR RENTA
// ======================================================

const cancelarRenta = async ({
  idRenta,
  datos = {},
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

  const motivo = validarMotivo(
    datos.motivo_cancelacion,
    {
      nombre:
        "El motivo de cancelación",
      minimo: 3,
      maximo: 500,
    }
  );

  const canceladoPor = Number(
    usuario?.id_usuario
  );

  if (
    !Number.isInteger(
      canceladoPor
    ) ||
    canceladoPor <= 0
  ) {
    throw new RentaError(
      "No se pudo identificar al usuario",
      401,
      "USUARIO_NO_AUTENTICADO"
    );
  }

  const resultado =
    await ejecutarTransaccion(
      db,
      async (conn) => {
        // ==============================================
        // 1. BLOQUEAR Y OBTENER RENTA
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

        const estadoActual =
          normalizarEstado(
            renta.estado
          );

        // ==============================================
        // 2. VALIDAR ESTADO CANCELABLE
        // ==============================================

        if (
          estadoActual ===
          "cancelado"
        ) {
          throw new RentaError(
            "La renta ya se encuentra cancelada",
            409,
            "RENTA_YA_CANCELADA"
          );
        }

        if (
          estadoActual ===
          "finalizado"
        ) {
          throw new RentaError(
            "No se puede cancelar una renta finalizada",
            409,
            "RENTA_FINALIZADA"
          );
        }

        if (
          !ESTADOS_CANCELABLES.includes(
            estadoActual
          )
        ) {
          throw new RentaError(
            "La renta ya fue entregada o se encuentra en uso. Debe finalizarse o registrarse un retiro anticipado, no cancelarse.",
            409,
            "RENTA_NO_CANCELABLE"
          );
        }

        // ==============================================
        // 3. CANCELAR RENTA
        // ==============================================

        const rentaCancelada =
          await repository.cancelar(
            conn,
            {
              idRenta: id,
              idEmpresa,
              motivo,
              canceladoPor,
            }
          );

        if (
          Number(rentaCancelada) !== 1
        ) {
          throw new RentaError(
            "No se pudo cancelar la renta",
            409,
            "RENTA_NO_CANCELADA"
          );
        }

        // ==============================================
        // 4. CANCELAR FINANZAS
        // ==============================================

        const finanzasCanceladas =
          await repository.cancelarFinanzas(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          );

        if (
          Number(
            finanzasCanceladas
          ) !== 1
        ) {
          throw new RentaError(
            "No se pudieron cancelar las finanzas de la renta",
            500,
            "FINANZAS_NO_CANCELADAS"
          );
        }

        // ==============================================
        // 5. ANULAR PAGOS DE LA RENTA
        // ==============================================

        /*
         * Esta operación se mantiene porque una renta cancelada
         * antes de la entrega deja de tener cargos válidos.
         *
         * El repository debe guardar motivo, usuario y fecha
         * si tb_renta_pagos ya posee esas columnas.
         */
        const pagosAnulados =
          await repository.anularPagos(
            conn,
            {
              idRenta: id,
              idEmpresa,
              motivo,
              anuladoPor:
                canceladoPor,
            }
          );

        // ==============================================
        // 6. LIBERAR DUMPSTER
        // ==============================================

        const dumpsterLiberado =
          await repository.liberarDumpster(
            conn,
            {
              idDumpster:
                renta.id_dumpster,

              idEmpresa,
            }
          );

        if (
          Number(dumpsterLiberado) !== 1
        ) {
          throw new RentaError(
            "No se pudo liberar el dumpster",
            500,
            "DUMPSTER_NO_LIBERADO"
          );
        }

        return {
          idRenta: id,

          idDumpster:
            Number(
              renta.id_dumpster
            ),

          estadoAnterior:
            estadoActual,

          estadoNuevo:
            "cancelado",

          pagosAnulados:
            Number(
              pagosAnulados || 0
            ),

          motivo,
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "CANCELAR",
    descripcion:
      `Renta #${resultado.idRenta} cancelada. ` +
      `Estado anterior: ${resultado.estadoAnterior}. ` +
      `Dumpster #${resultado.idDumpster} liberado. ` +
      `Pagos anulados: ${resultado.pagosAnulados}. ` +
      `Motivo: ${resultado.motivo}`,
  });

  return {
    id_renta:
      resultado.idRenta,

    id_dumpster:
      resultado.idDumpster,

    estado:
      resultado.estadoNuevo,

    pagos_anulados:
      resultado.pagosAnulados,

    motivo_cancelacion:
      resultado.motivo,
  };
};

// ======================================================
// ACTUALIZAR FECHA DE RETIRO
// ======================================================

const actualizarFechaRetiro = async ({
  idRenta,
  datos = {},
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

  const fecha = String(
    datos.fecha_estimada_devolucion ||
      ""
  ).trim();

  if (!fecha) {
    throw new RentaError(
      "La fecha de retiro es obligatoria",
      400,
      "FECHA_REQUERIDA"
    );
  }

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

        const estadoActual =
          normalizarEstado(
            renta.estado
          );

        // ==============================================
        // 2. VALIDAR ESTADO
        // ==============================================

        if (
          estadoActual ===
            "finalizado" ||
          estadoActual ===
            "cancelado"
        ) {
          throw new RentaError(
            "No se pueden cambiar las fechas de una renta cerrada",
            409,
            "RENTA_CERRADA"
          );
        }

        // ==============================================
        // 3. CALCULAR DÍAS
        // ==============================================

        const diasRenta =
          calcularDias(
            renta.fecha_inicio,
            fecha
          );

        if (
          !Number.isInteger(
            Number(diasRenta)
          ) ||
          Number(diasRenta) <= 0
        ) {
          throw new RentaError(
            "La fecha de retiro debe ser posterior a la fecha de inicio",
            400,
            "FECHA_RETIRO_INVALIDA"
          );
        }

        // ==============================================
        // 4. ACTUALIZAR FECHA
        // ==============================================

        const afectados =
          await repository.actualizarFechaRetiro(
            conn,
            {
              idRenta: id,
              idEmpresa,
              fecha,
              diasRenta,
            }
          );

        if (
          Number(afectados) !== 1
        ) {
          throw new RentaError(
            "No se pudo actualizar la fecha de retiro",
            404,
            "FECHA_NO_ACTUALIZADA"
          );
        }

        return {
          idRenta: id,
          fechaRetiro:
            fecha,
          diasRenta:
            Number(diasRenta),
        };
      }
    );

  // ====================================================
  // AUDITORÍA
  // ====================================================

  await registrarLog({
    req,
    modulo: "Rentas",
    accion:
      "ACTUALIZAR_FECHA_RETIRO",
    descripcion:
      `Fecha de retiro actualizada en renta #${resultado.idRenta}. ` +
      `Nueva fecha: ${resultado.fechaRetiro}. ` +
      `Días de renta: ${resultado.diasRenta}.`,
  });

  return {
    id_renta:
      resultado.idRenta,

    fecha_estimada_devolucion:
      resultado.fechaRetiro,

    dias_renta:
      resultado.diasRenta,
  };
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  finalizarRenta,
  cancelarRenta,
  actualizarFechaRetiro,
};