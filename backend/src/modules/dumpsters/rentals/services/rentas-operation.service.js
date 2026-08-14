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
// FINALIZAR RENTA MANUALMENTE
//
// IMPORTANTE:
// La finalización normal ahora sucede automáticamente
// cuando se registra el RETIRO.
//
// Se conserva esta función solo para que una llamada vieja
// del frontend no cierre la renta sin registrar retiro.
// ======================================================

const finalizarRenta = async ({
  idRenta,
  usuario,
}) => {
  validarId(
    idRenta,
    "ID de la renta"
  );

  obtenerIdEmpresa({
    usuario,
  });

  throw new RentaError(
    "Para finalizar la renta debe registrar primero el retiro y la disposición. La renta se finalizará automáticamente.",
    409,
    "RETIRO_REQUERIDO_PARA_FINALIZAR"
  );
};

// ======================================================
// CANCELAR RENTA
// Solo se cancela ANTES de entregar.
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
    !Number.isInteger(canceladoPor) ||
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

        if (
          estadoActual === "cancelado"
        ) {
          throw new RentaError(
            "La renta ya se encuentra cancelada",
            409,
            "RENTA_YA_CANCELADA"
          );
        }

        if (
          estadoActual === "finalizado"
        ) {
          throw new RentaError(
            "No se puede cancelar una renta finalizada",
            409,
            "RENTA_FINALIZADA"
          );
        }

        /*
         * Después de entregar el dumpster ya no hablamos
         * de cancelación. Si está en uso debe registrarse
         * su retiro, incluso si fue anticipado.
         */
        if (
          estadoActual !== "programada"
        ) {
          throw new RentaError(
            "La renta ya fue entregada. Debe registrar un retiro, no cancelarla.",
            409,
            "RENTA_NO_CANCELABLE"
          );
        }

        const rentaCancelada =
          await repository.cancelar(
            conn,
            {
              idRenta: id,
              idEmpresa,
              motivo,
            }
          );

        if (rentaCancelada !== 1) {
          throw new RentaError(
            "No se pudo cancelar la renta",
            409,
            "RENTA_NO_CANCELADA"
          );
        }

        const finanzasCanceladas =
          await repository.cancelarFinanzas(
            conn,
            {
              idRenta: id,
              idEmpresa,
            }
          );

        if (
          finanzasCanceladas !== 1
        ) {
          throw new RentaError(
            "No se pudieron cancelar las finanzas de la renta",
            500,
            "FINANZAS_NO_CANCELADAS"
          );
        }

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
          dumpsterLiberado !== 1
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
// ACTUALIZAR / REAGENDAR FECHA DE RETIRO
//
// Si está programada, calcula desde la fecha programada.
// Si ya está en uso, calcula desde la entrega REAL.
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

        if (
          ![
            "programada",
            "en_uso",
          ].includes(estadoActual)
        ) {
          throw new RentaError(
            "Solo se puede reagendar una renta programada o en uso",
            409,
            "RENTA_NO_REAGENDABLE"
          );
        }

        let fechaBase =
          renta.fecha_inicio;

        if (
          estadoActual === "en_uso"
        ) {
          const entrega =
            await repository
              .obtenerEntregaRegistrada(
                conn,
                {
                  idRenta: id,
                  idEmpresa,
                }
              );

          if (
            !entrega ||
            !entrega.hora_fin
          ) {
            throw new RentaError(
              "No se encontró la entrega real de esta renta",
              409,
              "ENTREGA_REAL_NO_ENCONTRADA"
            );
          }

          fechaBase =
            entrega.hora_fin;
        }

        const diasRenta =
          calcularDias(
            fechaBase,
            fecha
          );

        if (
          !Number.isInteger(
            Number(diasRenta)
          ) ||
          Number(diasRenta) <= 0
        ) {
          throw new RentaError(
            "La fecha de retiro debe ser posterior al inicio real de la renta",
            400,
            "FECHA_RETIRO_INVALIDA"
          );
        }

        const afectados =
          await repository
            .actualizarFechaRetiro(
              conn,
              {
                idRenta: id,
                idEmpresa,
                fecha,
                diasRenta:
                  Number(diasRenta),
              }
            );

        if (afectados !== 1) {
          throw new RentaError(
            "No se pudo actualizar la fecha de retiro",
            404,
            "FECHA_NO_ACTUALIZADA"
          );
        }

        return {
          idRenta: id,
          fechaRetiro: fecha,
          diasRenta:
            Number(diasRenta),
        };
      }
    );

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
