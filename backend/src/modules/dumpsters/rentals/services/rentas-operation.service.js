const db = require("../../../../shared/database/db");
const repository = require("../repositories/rentas-operation.repository");
const { registrarLog } = require("../../../../shared/logging/logs");
const { ESTADOS_RENTA_CERRADA } = require("../constants/rentas.constants");
const { RentaError, obtenerIdEmpresa, validarId, calcularDias, ejecutarTransaccion } = require("../utils/rentas.utils");

const finalizarRenta = async ({ idRenta, usuario, req }) => {
  const id = validarId(idRenta, "ID de la renta");
  const idEmpresa = obtenerIdEmpresa({ usuario });

  await ejecutarTransaccion(db, async (conn) => {
    const renta = await repository.bloquearRenta(conn, { idRenta: id, idEmpresa });
    if (!renta) throw new RentaError("Renta no encontrada", 404, "RENTA_NO_ENCONTRADA");
    if (ESTADOS_RENTA_CERRADA.includes(renta.estado)) {
      throw new RentaError("Esta renta ya no se puede finalizar", 400, "RENTA_CERRADA");
    }

    await repository.finalizar(conn, { idRenta: id, idEmpresa });
    await repository.liberarDumpster(conn, {
      idDumpster: renta.id_dumpster,
      idEmpresa,
    });
  });

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "FINALIZAR",
    descripcion: `Renta finalizada #${id}`,
  });

  return { id_renta: id };
};

const cancelarRenta = async ({ idRenta, datos, usuario, req }) => {
  const id = validarId(idRenta, "ID de la renta");
  const idEmpresa = obtenerIdEmpresa({ usuario, body: datos });
  const motivo = String(datos.motivo_cancelacion || "").trim();
  if (!motivo) {
    throw new RentaError("Ingresa el motivo de cancelación", 400, "MOTIVO_REQUERIDO");
  }

  await ejecutarTransaccion(db, async (conn) => {
    const renta = await repository.bloquearRenta(conn, { idRenta: id, idEmpresa });
    if (!renta) throw new RentaError("Renta no encontrada", 404, "RENTA_NO_ENCONTRADA");
    if (ESTADOS_RENTA_CERRADA.includes(renta.estado)) {
      throw new RentaError("Esta renta ya está cerrada", 400, "RENTA_CERRADA");
    }

    await repository.cancelar(conn, { idRenta: id, idEmpresa, motivo });
    await repository.cancelarFinanzas(conn, { idRenta: id, idEmpresa });
    await repository.anularPagos(conn, { idRenta: id, idEmpresa, motivo });
    await repository.liberarDumpster(conn, {
      idDumpster: renta.id_dumpster,
      idEmpresa,
    });
  });

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "CANCELAR",
    descripcion: `Renta cancelada #${id}: ${motivo}`,
  });

  return { id_renta: id };
};

const actualizarFechaRetiro = async ({ idRenta, datos, usuario, req }) => {
  const id = validarId(idRenta, "ID de la renta");
  const idEmpresa = obtenerIdEmpresa({ usuario, body: datos });
  const fecha = datos.fecha_estimada_devolucion;
  if (!fecha) {
    throw new RentaError("La fecha de retiro es obligatoria", 400, "FECHA_REQUERIDA");
  }

  const renta = await repository.obtenerFechaInicio({ db, idRenta: id, idEmpresa });
  if (!renta) throw new RentaError("Renta no encontrada", 404, "RENTA_NO_ENCONTRADA");

  const diasRenta = calcularDias(renta.fecha_inicio, fecha);
  const afectados = await repository.actualizarFechaRetiro({
    db,
    idRenta: id,
    idEmpresa,
    fecha,
    diasRenta,
  });

  if (!afectados) {
    throw new RentaError("No se pudo actualizar la fecha", 404, "FECHA_NO_ACTUALIZADA");
  }

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "ACTUALIZAR_FECHA_RETIRO",
    descripcion: `Fecha de retiro actualizada en renta #${id}`,
  });

  return { id_renta: id, dias_renta: diasRenta };
};

module.exports = { finalizarRenta, cancelarRenta, actualizarFechaRetiro };
