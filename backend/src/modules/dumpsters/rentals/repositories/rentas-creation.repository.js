// ======================================================
// BLOQUEAR DUMPSTER DISPONIBLE
// ======================================================

const bloquearDumpsterDisponible = async (
  conn,
  {
    idDumpster,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_dumpster,
      id_empresa,
      codigo,
      tamano_yardas,
      capacidad_toneladas,
      precio_base,
      max_dias,
      precio_extra_tonelada,
      precio_extra_yarda,
      precio_extra_dia,
      estado

    FROM dumpsters

    WHERE id_dumpster = ?
      AND id_empresa = ?
      AND estado = 'disponible'

    LIMIT 1
    FOR UPDATE
    `,
    [
      idDumpster,
      idEmpresa,
    ]
  );

  return rows[0] || null;
};

// ======================================================
// OBTENER IMPUESTO ACTIVO
// ======================================================

const obtenerImpuestoActivo = async (
  conn,
  idEmpresa
) => {
  const [rows] = await conn.query(
    `
    SELECT
      id_tax,
      nombre,
      tax_rate

    FROM tb_impuestos

    WHERE id_empresa = ?
      AND activo = 1

    ORDER BY id_tax DESC

    LIMIT 1
    `,
    [idEmpresa]
  );

  return rows[0] || null;
};

// ======================================================
// INSERTAR RENTA
// ======================================================

const insertarRenta = async (
  conn,
  {
    idEmpresa,
    idDumpster,
    idCliente,
    idCamion,
    idMaterial,
    idUbicacion,
    fechaInicio,
    diasRenta,
    fechaEstimadaDevolucion,
    direccionEntrega,
    latitud,
    longitud,
    observaciones,
    creadoPor,
  }
) => {
  const [result] = await conn.query(
    `
    INSERT INTO tb_rentas
    (
      id_empresa,
      id_dumpster,
      id_cliente,
      id_camion,
      id_material,
      id_ubicacion,
      fecha_inicio,
      dias_renta,
      fecha_estimada_devolucion,
      direccion_entrega,
      latitud,
      longitud,
      estado,
      observaciones,
      creado_por,
      fecha_registro
    )
    VALUES
    (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      'programada',
      ?, ?,
      NOW()
    )
    `,
    [
      idEmpresa,
      idDumpster,
      idCliente,
      idCamion || null,
      idMaterial || null,
      idUbicacion || null,
      fechaInicio,
      diasRenta,
      fechaEstimadaDevolucion,
      direccionEntrega || null,
      latitud || null,
      longitud || null,
      observaciones || null,
      creadoPor,
    ]
  );

  return result.insertId;
};

// ======================================================
// INSERTAR FINANZAS DE LA RENTA
// ======================================================

const insertarFinanzas = async (
  conn,
  {
    idEmpresa,
    idRenta,
    subtotalBase,
    aplicaTaxBase,
    taxRate,
    taxAmount,
    totalFinal,
    saldoPendiente,
  }
) => {
  const [result] = await conn.query(
    `
    INSERT INTO tb_renta_finanzas
    (
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
    )
    VALUES
    (
      ?, ?, ?, ?, ?, ?, 0, ?, ?, ?
    )
    `,
    [
      idEmpresa,
      idRenta,
      subtotalBase,

      // Al crear la renta, el estimado inicial
      // corresponde al precio base.
      subtotalBase,

      aplicaTaxBase ? 1 : 0,
      taxRate,
      taxAmount,
      totalFinal,
      saldoPendiente,
    ]
  );

  return result.insertId;
};

// ======================================================
// INSERTAR PAGO INICIAL
// ======================================================

const insertarPagoInicial = async (
  conn,
  {
    idEmpresa,
    idRenta,
    idCliente,
    montoAbonado,
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
    VALUES
    (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )
    `,
    [
      idEmpresa,
      idRenta,
      idCliente,

      // Dinero total recibido:
      // monto base + tax.
      montoAbonado,

      // Parte del total correspondiente al impuesto.
      taxPago,

      tipoPago,
      estadoPago,
      observaciones || "Pago registrado al crear renta",
      creadoPor,
    ]
  );

  return result.insertId;
};

// ======================================================
// INSERTAR DETALLE DEL PAGO INICIAL
// Tabla: tb_renta_pago_detalles
// ======================================================

const insertarDetallePagoInicial = async (
  conn,
  {
    idEmpresa,
    idPago,
    idRenta,
    montoBase,
    taxMonto,
    totalCobrado,
    descripcion = "Pago inicial de renta",
  }
) => {
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
    VALUES
    (
      ?, ?, ?,
      'renta',
      NULL,
      ?, ?, ?, ?
    )
    `,
    [
      idEmpresa,
      idPago,
      idRenta,
      descripcion,
      montoBase,
      taxMonto,
      totalCobrado,
    ]
  );

  return result.insertId;
};

// ======================================================
// MARCAR DUMPSTER COMO RENTADO
// ======================================================

const marcarDumpsterRentado = async (
  conn,
  {
    idDumpster,
    idEmpresa,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE dumpsters

    SET
      estado = 'rentado',
      fecha_actualizacion = CURRENT_TIMESTAMP

    WHERE id_dumpster = ?
      AND id_empresa = ?
      AND estado = 'disponible'
    `,
    [
      idDumpster,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  bloquearDumpsterDisponible,
  obtenerImpuestoActivo,
  insertarRenta,
  insertarFinanzas,
  insertarPagoInicial,
  insertarDetallePagoInicial,
  marcarDumpsterRentado,
};