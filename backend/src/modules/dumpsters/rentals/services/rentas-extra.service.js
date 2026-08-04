const db = require("../../../../shared/database/db");
const repository = require("../repositories/rentas-extra.repository");
const { registrarLog } = require("../../../../shared/logging/logs");
const { ESTADOS_RENTA_CERRADA } = require("../constants/rentas.constants");
const { RentaError, obtenerIdEmpresa, validarId, money, ejecutarTransaccion } = require("../utils/rentas.utils");
const { validarExtra } = require("../validators/rentas.validator");

const agregarExtra = async ({ idRenta, datos, usuario, req }) => {
  const id = validarId(idRenta, "ID de la renta");
  const idEmpresa = obtenerIdEmpresa({ usuario, body: datos });
  const creadoPor = Number(usuario.id_usuario);
  const extra = validarExtra(datos);

  const result = await ejecutarTransaccion(db, async (conn) => {
    const renta = await repository.bloquearRenta(conn, { idRenta: id, idEmpresa });
    if (!renta) throw new RentaError("Renta no encontrada", 404, "RENTA_NO_ENCONTRADA");
    if (ESTADOS_RENTA_CERRADA.includes(renta.estado)) {
      throw new RentaError(
        "No se pueden agregar extras a una renta cerrada",
        400,
        "RENTA_CERRADA"
      );
    }

    const idExtra = await repository.insertarExtra(conn, {
      idEmpresa,
      idRenta: id,
      tipoExtra: extra.tipoExtra,
      descripcion: extra.descripcion,
      monto: extra.monto,
      creadoPor,
    });

    const [totalExtras, totalPagado, finanzas] = await Promise.all([
      repository.sumarExtras(conn, { idRenta: id, idEmpresa }),
      repository.sumarPagos(conn, { idRenta: id, idEmpresa }),
      repository.bloquearFinanzas(conn, { idRenta: id, idEmpresa }),
    ]);

    if (!finanzas) {
      throw new RentaError(
        "Finanzas de renta no encontradas",
        404,
        "FINANZAS_NO_ENCONTRADAS"
      );
    }

    const totalFinal = money(
      Number(finanzas.subtotal_base || 0) +
      Number(finanzas.tax_amount || 0) +
      totalExtras
    );
    const saldoPendiente = money(Math.max(totalFinal - totalPagado, 0));

    await repository.actualizarFinanzas(conn, {
      idRenta: id,
      idEmpresa,
      totalExtras,
      totalFinal,
      saldoPendiente,
    });

    return { idExtra, totalExtras, totalFinal, saldoPendiente };
  });

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "AGREGAR_EXTRA",
    descripcion: `Cargo extra #${result.idExtra} agregado a renta #${id}`,
  });

  return {
    id_extra: result.idExtra,
    total_extras: result.totalExtras,
    total_final: result.totalFinal,
    saldo_pendiente: result.saldoPendiente,
  };
};

const inactivarExtra = async ({ idExtra, usuario, req }) => {
  const id = validarId(idExtra, "ID del cargo extra");
  const idEmpresa = obtenerIdEmpresa({ usuario });

  const result = await ejecutarTransaccion(db, async (conn) => {
    const extra = await repository.bloquearExtra(conn, { idExtra: id, idEmpresa });
    if (!extra) throw new RentaError("Cargo extra no encontrado", 404, "EXTRA_NO_ENCONTRADO");
    if (extra.estado_pago !== "pendiente") {
      throw new RentaError(
        "Solo se pueden anular cargos extras pendientes",
        400,
        "EXTRA_NO_PENDIENTE"
      );
    }

    const afectados = await repository.anularExtra(conn, { idExtra: id, idEmpresa });
    if (!afectados) {
      throw new RentaError("No se pudo anular el cargo extra", 409, "EXTRA_NO_ANULADO");
    }

    const monto = money(extra.monto);
    await repository.restarExtraFinanzas(conn, {
      idRenta: extra.id_renta,
      idEmpresa,
      monto,
    });

    return { idRenta: extra.id_renta, monto };
  });

  await registrarLog({
    req,
    modulo: "Rentas",
    accion: "ANULAR_EXTRA",
    descripcion: `Cargo extra #${id} anulado en renta #${result.idRenta}`,
  });

  return { id_extra: id, id_renta: result.idRenta };
};

module.exports = { agregarExtra, inactivarExtra };
