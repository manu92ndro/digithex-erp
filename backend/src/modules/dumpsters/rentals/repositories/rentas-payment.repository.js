// ======================================================
// BLOQUEAR FINANZAS DE LA RENTA
// ======================================================

const bloquearRentaFinanzas = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      r.id_renta,
      r.id_empresa,
      r.id_cliente,
      r.estado,

      f.id_finanza,
      f.subtotal_base,
      f.total_estimado,
      f.aplica_tax_base,
      f.tax_rate,
      f.total_extras,
      f.tax_amount,
      f.total_final,
      f.saldo_pendiente

    FROM tb_rentas r

    INNER JOIN tb_renta_finanzas f
      ON f.id_renta = r.id_renta
     AND f.id_empresa = r.id_empresa

    WHERE r.id_renta = ?
      AND r.id_empresa = ?

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
// BLOQUEAR EXTRAS PENDIENTES
// ======================================================

const bloquearExtrasPendientes = async (
  conn,
  {
    idRenta,
    idEmpresa,
    idsExtras,
  }
) => {
  if (
    !Array.isArray(idsExtras) ||
    idsExtras.length === 0
  ) {
    return [];
  }

  const [rows] = await conn.query(
    `
    SELECT
      id_extra,
      id_empresa,
      id_renta,
      tipo_extra,
      descripcion,
      monto,
      estado_pago

    FROM tb_renta_extras

    WHERE id_empresa = ?
      AND id_renta = ?
      AND id_extra IN (?)
      AND estado_pago = 'pendiente'

    FOR UPDATE
    `,
    [
      idEmpresa,
      idRenta,
      idsExtras,
    ]
  );

  return rows;
};

// ======================================================
// ACUMULAR TAX
// ======================================================

const agregarTax = async (
  conn,
  {
    idRenta,
    idEmpresa,
    taxPago,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_finanzas
    SET
      tax_amount =
        COALESCE(tax_amount, 0) + ?,

      total_final =
        COALESCE(total_final, 0) + ?

    WHERE id_renta = ?
      AND id_empresa = ?
    `,
    [
      taxPago,
      taxPago,
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// INSERTAR PAGO
// ======================================================

const insertarPago = async (
  conn,
  {
    idEmpresa,
    idRenta,
    idCliente,
    montoPago,
    taxPago,
    tipoPago,
    estadoPago,
    observaciones,
    creadoPor,
  }
) => {
  const [result] = await conn.query(
    `
    INSERT INTO tb_renta_pagos
    (
      id_empresa,
      id_renta,
      id_cliente,
      monto_abonado,
      tax_pago,
      tipo_pago,
      estado_pago,
      observaciones,
      creado_por,
      fecha_pago
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      idEmpresa,
      idRenta,
      idCliente,
      montoPago,
      taxPago,
      tipoPago,
      estadoPago,
      observaciones || null,
      creadoPor,
    ]
  );

  return result.insertId;
};

// ======================================================
// INSERTAR DETALLES DEL PAGO
// ======================================================

const insertarDetallesPago = async (
  conn,
  {
    idEmpresa,
    idPago,
    idRenta,
    detalles,
  }
) => {
  if (
    !Array.isArray(detalles) ||
    detalles.length === 0
  ) {
    return 0;
  }

  const valores = detalles.map(
    (detalle) => [
      idEmpresa,
      idPago,
      idRenta,
      detalle.tipoConcepto,
      detalle.tipoConcepto === "extra"
        ? detalle.idExtra
        : null,
      detalle.descripcion || null,
      Number(detalle.montoBase || 0),
      Number(detalle.taxMonto || 0),
      Number(detalle.totalCobrado || 0),
    ]
  );

  const [result] = await conn.query(
    `
    INSERT INTO tb_renta_pago_detalles
    (
      id_empresa,
      id_pago,
      id_renta,
      tipo_concepto,
      id_extra,
      descripcion,
      monto_base,
      tax_monto,
      total_cobrado
    )
    VALUES ?
    `,
    [valores]
  );

  return result.affectedRows;
};

// ======================================================
// MARCAR EXTRAS COMO PAGADOS
// ======================================================

const marcarExtrasPagados = async (
  conn,
  {
    idRenta,
    idEmpresa,
    idsExtras,
  }
) => {
  if (
    !Array.isArray(idsExtras) ||
    idsExtras.length === 0
  ) {
    return 0;
  }

  const [result] = await conn.query(
    `
    UPDATE tb_renta_extras
    SET estado_pago = 'pagado'
    WHERE id_empresa = ?
      AND id_renta = ?
      AND id_extra IN (?)
      AND estado_pago = 'pendiente'
    `,
    [
      idEmpresa,
      idRenta,
      idsExtras,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// ACTUALIZAR SALDO
// ======================================================

const actualizarSaldo = async (
  conn,
  {
    idRenta,
    idEmpresa,
    saldo,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_finanzas
    SET saldo_pendiente = ?
    WHERE id_renta = ?
      AND id_empresa = ?
    `,
    [
      saldo,
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// BLOQUEAR PAGO PARA ANULAR
// ======================================================

const bloquearPago = async (
  conn,
  {
    idPago,
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_pago,
      id_empresa,
      id_renta,
      id_cliente,
      monto_abonado,
      tax_pago,
      tipo_pago,
      estado_pago,
      observaciones,
      motivo_anulacion,
      anulado_por,
      fecha_anulacion
    FROM tb_renta_pagos
    WHERE id_pago = ?
      AND id_renta = ?
      AND id_empresa = ?
    LIMIT 1
    FOR UPDATE
    `,
    [
      idPago,
      idRenta,
      idEmpresa,
    ]
  );

  return rows[0] || null;
};

// ======================================================
// BLOQUEAR RENTA PARA VALIDAR ESTADO
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
// OBTENER EXTRAS VINCULADOS AL PAGO
// ======================================================

const obtenerIdsExtrasPago = async (
  conn,
  {
    idPago,
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT DISTINCT
      id_extra
    FROM tb_renta_pago_detalles
    WHERE id_pago = ?
      AND id_renta = ?
      AND id_empresa = ?
      AND tipo_concepto = 'extra'
      AND id_extra IS NOT NULL
    `,
    [
      idPago,
      idRenta,
      idEmpresa,
    ]
  );

  return rows
    .map((row) =>
      Number(row.id_extra)
    )
    .filter(
      (id) =>
        Number.isInteger(id) &&
        id > 0
    );
};

// ======================================================
// ANULAR PAGO
// ======================================================

const anularPago = async (
  conn,
  {
    idPago,
    idRenta,
    idEmpresa,
    motivo,
    anuladoPor,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_pagos
    SET
      estado_pago = 'anulado',
      motivo_anulacion = ?,
      anulado_por = ?,
      fecha_anulacion = NOW()
    WHERE id_pago = ?
      AND id_renta = ?
      AND id_empresa = ?
      AND estado_pago <> 'anulado'
    `,
    [
      motivo,
      anuladoPor,
      idPago,
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// DEVOLVER EXTRAS A PENDIENTE
// ======================================================

const devolverExtrasAPendiente = async (
  conn,
  {
    idRenta,
    idEmpresa,
    idsExtras,
  }
) => {
  if (
    !Array.isArray(idsExtras) ||
    idsExtras.length === 0
  ) {
    return 0;
  }

  const [result] = await conn.query(
    `
    UPDATE tb_renta_extras
    SET estado_pago = 'pendiente'
    WHERE id_renta = ?
      AND id_empresa = ?
      AND id_extra IN (?)
      AND estado_pago = 'pagado'
    `,
    [
      idRenta,
      idEmpresa,
      idsExtras,
    ]
  );

  return result.affectedRows;
};
// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  bloquearRentaFinanzas,
  bloquearExtrasPendientes,
  agregarTax,
  insertarPago,
  insertarDetallesPago,
  marcarExtrasPagados,
  actualizarSaldo,
  bloquearPago,
  bloquearRenta,
  obtenerIdsExtrasPago,
  anularPago,
  devolverExtrasAPendiente,
  
};