// ======================================================
// BLOQUEAR RENTA
// ======================================================

const bloquearRenta = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_renta,
      id_empresa,
      estado

    FROM tb_rentas

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
// INSERTAR CARGO EXTRA
// ======================================================

const insertarExtra = async (
  conn,
  {
    idEmpresa,
    idRenta,
    tipoExtra,
    descripcion,
    monto,
    creadoPor,
  }
) => {
  const [result] = await conn.query(
    `
    INSERT INTO tb_renta_extras
    (
      id_empresa,
      id_renta,
      tipo_extra,
      descripcion,
      monto,
      fecha_registro,
      creado_por,
      estado_pago
    )
    VALUES
    (
      ?, ?, ?, ?, ?,
      NOW(),
      ?,
      'pendiente'
    )
    `,
    [
      idEmpresa,
      idRenta,
      tipoExtra,
      descripcion || null,
      monto,
      creadoPor,
    ]
  );

  return result.insertId;
};

// ======================================================
// SUMAR EXTRAS ACTIVOS
// Excluye los cargos anulados.
// ======================================================

const sumarExtras = async (
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

    WHERE id_empresa = ?
      AND id_renta = ?
      AND estado_pago <> 'anulado'
    `,
    [
      idEmpresa,
      idRenta,
    ]
  );

  return Number(
    rows[0]?.total_extras || 0
  );
};

// ======================================================
// SUMAR PAGOS VÁLIDOS
// Excluye pagos anulados.
// ======================================================

const sumarPagos = async (
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
        SUM(monto_abonado),
        0
      ) AS total_pagado

    FROM tb_renta_pagos

    WHERE id_empresa = ?
      AND id_renta = ?
      AND estado_pago <> 'anulado'
    `,
    [
      idEmpresa,
      idRenta,
    ]
  );

  return Number(
    rows[0]?.total_pagado || 0
  );
};

// ======================================================
// BLOQUEAR FINANZAS
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
      tax_amount,
      total_extras,
      total_final,
      saldo_pendiente

    FROM tb_renta_finanzas

    WHERE id_empresa = ?
      AND id_renta = ?

    LIMIT 1
    FOR UPDATE
    `,
    [
      idEmpresa,
      idRenta,
    ]
  );

  return rows[0] || null;
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
    totalFinal,
    saldoPendiente,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_finanzas

    SET
      total_extras = ?,
      total_final = ?,
      saldo_pendiente = ?

    WHERE id_empresa = ?
      AND id_renta = ?
    `,
    [
      totalExtras,
      totalFinal,
      saldoPendiente,
      idEmpresa,
      idRenta,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// BLOQUEAR EXTRA
// Se usa tanto para consultar como para anular.
// ======================================================

const bloquearExtra = async (
  conn,
  {
    idExtra,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_extra,
      id_empresa,
      id_renta,
      tipo_extra,
      descripcion,
      monto,
      estado_pago,
      motivo_anulacion,
      anulado_por,
      fecha_anulacion

    FROM tb_renta_extras

    WHERE id_extra = ?
      AND id_empresa = ?

    LIMIT 1
    FOR UPDATE
    `,
    [
      idExtra,
      idEmpresa,
    ]
  );

  return rows[0] || null;
};

// ======================================================
// ANULAR EXTRA
// Conserva el registro y guarda auditoría de negocio.
// ======================================================

const anularExtra = async (
  conn,
  {
    idExtra,
    idEmpresa,
    motivo,
    anuladoPor,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_extras

    SET
      estado_pago = 'anulado',
      motivo_anulacion = ?,
      anulado_por = ?,
      fecha_anulacion = NOW()

    WHERE id_extra = ?
      AND id_empresa = ?
      AND estado_pago = 'pendiente'
    `,
    [
      motivo,
      anuladoPor,
      idExtra,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  bloquearRenta,
  insertarExtra,
  sumarExtras,
  sumarPagos,
  bloquearFinanzas,
  actualizarFinanzas,
  bloquearExtra,
  anularExtra,
};