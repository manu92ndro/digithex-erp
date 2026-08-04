const bloquearRenta = async (conn, { idRenta, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT * FROM tb_rentas
     WHERE id_renta = ? AND id_empresa = ? LIMIT 1 FOR UPDATE`,
    [idRenta, idEmpresa]
  );
  return rows[0] || null;
};

const finalizar = async (conn, { idRenta, idEmpresa }) => {
  await conn.query(
    `UPDATE tb_rentas SET estado = 'finalizado',
       fecha_real_devolucion = CURDATE(), fyh_actualizacion = NOW()
     WHERE id_renta = ? AND id_empresa = ?`,
    [idRenta, idEmpresa]
  );
};

const cancelar = async (conn, { idRenta, idEmpresa, motivo }) => {
  await conn.query(
    `UPDATE tb_rentas SET estado = 'cancelado',
       observaciones = CONCAT(COALESCE(observaciones, ''), '\nCancelación: ', ?)
     WHERE id_renta = ? AND id_empresa = ?`,
    [motivo, idRenta, idEmpresa]
  );
};

const liberarDumpster = async (conn, { idDumpster, idEmpresa }) => {
  await conn.query(
    `UPDATE dumpsters SET estado = 'disponible', fecha_actualizacion = CURRENT_TIMESTAMP
     WHERE id_dumpster = ? AND id_empresa = ?`,
    [idDumpster, idEmpresa]
  );
};

const cancelarFinanzas = async (conn, { idRenta, idEmpresa }) => {
  await conn.query(
    `UPDATE tb_renta_finanzas SET saldo_pendiente = 0
     WHERE id_renta = ? AND id_empresa = ?`,
    [idRenta, idEmpresa]
  );
};

const anularPagos = async (conn, { idRenta, idEmpresa, motivo }) => {
  await conn.query(
    `UPDATE tb_renta_pagos SET estado_pago = 'anulado',
       observaciones = CONCAT(COALESCE(observaciones, ''),
       '\nPago anulado por cancelación: ', ?)
     WHERE id_renta = ? AND id_empresa = ?`,
    [motivo, idRenta, idEmpresa]
  );
};

const obtenerFechaInicio = async ({ db, idRenta, idEmpresa }) => {
  const [rows] = await db.query(
    `SELECT fecha_inicio FROM tb_rentas
     WHERE id_renta = ? AND id_empresa = ? LIMIT 1`,
    [idRenta, idEmpresa]
  );
  return rows[0] || null;
};

const actualizarFechaRetiro = async ({ db, idRenta, idEmpresa, fecha, diasRenta }) => {
  const [result] = await db.query(
    `UPDATE tb_rentas SET fecha_estimada_devolucion = ?, dias_renta = ?,
       fyh_actualizacion = NOW()
     WHERE id_renta = ? AND id_empresa = ?`,
    [fecha, diasRenta, idRenta, idEmpresa]
  );
  return result.affectedRows;
};

module.exports = {
  bloquearRenta,
  finalizar,
  cancelar,
  liberarDumpster,
  cancelarFinanzas,
  anularPagos,
  obtenerFechaInicio,
  actualizarFechaRetiro,
};
