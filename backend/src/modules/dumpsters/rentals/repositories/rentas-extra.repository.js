const bloquearRenta = async (conn, { idRenta, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT id_renta, estado FROM tb_rentas
     WHERE id_renta = ? AND id_empresa = ?
     LIMIT 1 FOR UPDATE`,
    [idRenta, idEmpresa]
  );
  return rows[0] || null;
};

const insertarExtra = async (conn, data) => {
  const [result] = await conn.query(
    `INSERT INTO tb_renta_extras (
       id_empresa, id_renta, tipo_extra, descripcion, monto,
       fecha_registro, creado_por, estado_pago
     ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 'pendiente')`,
    [data.idEmpresa, data.idRenta, data.tipoExtra, data.descripcion, data.monto, data.creadoPor]
  );
  return result.insertId;
};

const sumarExtras = async (conn, { idRenta, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_extras
     FROM tb_renta_extras
     WHERE id_empresa = ? AND id_renta = ? AND estado_pago <> 'anulado'`,
    [idEmpresa, idRenta]
  );
  return Number(rows[0]?.total_extras || 0);
};

const sumarPagos = async (conn, { idRenta, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(monto_abonado), 0) AS total_pagado
     FROM tb_renta_pagos
     WHERE id_empresa = ? AND id_renta = ? AND estado_pago <> 'anulado'`,
    [idEmpresa, idRenta]
  );
  return Number(rows[0]?.total_pagado || 0);
};

const bloquearFinanzas = async (conn, { idRenta, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT subtotal_base, tax_amount FROM tb_renta_finanzas
     WHERE id_empresa = ? AND id_renta = ? LIMIT 1 FOR UPDATE`,
    [idEmpresa, idRenta]
  );
  return rows[0] || null;
};

const actualizarFinanzas = async (conn, data) => {
  await conn.query(
    `UPDATE tb_renta_finanzas
     SET total_extras = ?, total_final = ?, saldo_pendiente = ?
     WHERE id_empresa = ? AND id_renta = ?`,
    [data.totalExtras, data.totalFinal, data.saldoPendiente, data.idEmpresa, data.idRenta]
  );
};

const bloquearExtra = async (conn, { idExtra, idEmpresa }) => {
  const [rows] = await conn.query(
    `SELECT id_extra, id_renta, monto, estado_pago FROM tb_renta_extras
     WHERE id_extra = ? AND id_empresa = ? FOR UPDATE`,
    [idExtra, idEmpresa]
  );
  return rows[0] || null;
};

const anularExtra = async (conn, { idExtra, idEmpresa }) => {
  const [result] = await conn.query(
    `UPDATE tb_renta_extras SET estado_pago = 'anulado'
     WHERE id_extra = ? AND id_empresa = ? AND estado_pago = 'pendiente'`,
    [idExtra, idEmpresa]
  );
  return result.affectedRows;
};

const restarExtraFinanzas = async (conn, data) => {
  await conn.query(
    `UPDATE tb_renta_finanzas SET
       total_extras = GREATEST(total_extras - ?, 0),
       total_final = GREATEST(total_final - ?, 0),
       saldo_pendiente = GREATEST(saldo_pendiente - ?, 0)
     WHERE id_renta = ? AND id_empresa = ?`,
    [data.monto, data.monto, data.monto, data.idRenta, data.idEmpresa]
  );
};

module.exports = {
  bloquearRenta,
  insertarExtra,
  sumarExtras,
  sumarPagos,
  bloquearFinanzas,
  actualizarFinanzas,
  bloquearExtra,
  anularExtra,
  restarExtraFinanzas,
};
