// ======================================================
// BLOQUEAR FINANZAS DE UNA RENTA
// ======================================================

const bloquearFinanzas = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_finanza,
      id_empresa,
      id_renta,
      subtotal_base,
      total_estimado,
      aplica_tax_base,
      tax_rate,
      total_extras,
      tax_amount,
      total_final,
      saldo_pendiente
    FROM tb_renta_finanzas
    WHERE id_renta = ?
      AND id_empresa = ?
    LIMIT 1
    FOR UPDATE
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows[0] || null;
};

// ======================================================
// SUMAR EXTRAS ACTIVOS
// ======================================================

const sumarExtrasActivos = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      COALESCE(
        SUM(monto),
        0
      ) AS total_extras
    FROM tb_renta_extras
    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado_pago <> 'anulado'
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return Number(
    rows[0]?.total_extras || 0
  );
};

// ======================================================
// SUMAR BASE PAGADA
// Excluye pagos anulados.
// ======================================================

const sumarBasePagada = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      COALESCE(
        SUM(d.monto_base),
        0
      ) AS total_base_pagada
    FROM tb_renta_pago_detalles d
    INNER JOIN tb_renta_pagos p
      ON p.id_pago = d.id_pago
     AND p.id_empresa = d.id_empresa
     AND p.id_renta = d.id_renta
    WHERE d.id_renta = ?
      AND d.id_empresa = ?
      AND p.estado_pago <> 'anulado'
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return Number(
    rows[0]?.total_base_pagada || 0
  );
};

// ======================================================
// SUMAR TAX DE PAGOS ACTIVOS
// ======================================================

const sumarTaxPagado = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      COALESCE(
        SUM(tax_pago),
        0
      ) AS total_tax
    FROM tb_renta_pagos
    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado_pago <> 'anulado'
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return Number(
    rows[0]?.total_tax || 0
  );
};

// ======================================================
// ACTUALIZAR FINANZAS RECALCULADAS
// ======================================================

const actualizarFinanzas = async (
  conn,
  {
    idRenta,
    idEmpresa,
    totalExtras,
    taxAmount,
    totalFinal,
    saldoPendiente,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_finanzas
    SET
      total_extras = ?,
      tax_amount = ?,
      total_final = ?,
      saldo_pendiente = ?
    WHERE id_renta = ?
      AND id_empresa = ?
    `,
    [
      totalExtras,
      taxAmount,
      totalFinal,
      saldoPendiente,
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  bloquearFinanzas,
  sumarExtrasActivos,
  sumarBasePagada,
  sumarTaxPagado,
  actualizarFinanzas,
};