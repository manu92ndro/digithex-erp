const db = require(
  "../../../../shared/database/db"
);

// ======================================================
// LISTAR RENTAS
// Incluye fechas reales de entrega/retiro para cards.
// ======================================================

const listar = async (
  idEmpresa
) => {
  const [rows] = await db.query(
    `
    SELECT
      r.id_renta,
      r.fecha_inicio,
      r.dias_renta,
      r.fecha_estimada_devolucion,
      r.fecha_real_devolucion,
      r.direccion_entrega,
      r.estado,
      r.observaciones,
      r.fecha_registro,

      c.nombres AS cliente,
      c.celular,
      c.correo,

      d.codigo AS dumpster_codigo,
      d.tamano_yardas,
      d.capacidad_toneladas,

      ca.nombre_camion,
      ca.placa,

      m.nombre_material,
      u.ubicacion,

      f.subtotal_base,
      f.tax_amount,
      f.total_extras,
      f.total_final,
      f.saldo_pendiente,

      ce.hora_inicio
        AS entrega_hora_inicio,

      ce.hora_fin
        AS entrega_hora_fin,

      ce.horas_operacion
        AS entrega_horas_operacion,

      ce.observaciones
        AS entrega_observaciones,

      cr.hora_inicio
        AS retiro_hora_inicio,

      cr.hora_fin
        AS retiro_hora_fin,

      cr.horas_operacion
        AS retiro_horas_operacion,

      cr.lugar_disposicion,
      cr.numero_ticket,
      cr.costo_disposicion,

      cr.observaciones
        AS retiro_observaciones

    FROM tb_rentas r

    INNER JOIN tb_clientes c
      ON c.id_cliente = r.id_cliente
      AND c.id_empresa = r.id_empresa

    INNER JOIN dumpsters d
      ON d.id_dumpster = r.id_dumpster
      AND d.id_empresa = r.id_empresa

    LEFT JOIN tb_camion ca
      ON ca.id_camion = r.id_camion
      AND ca.id_empresa = r.id_empresa

    LEFT JOIN tb_material m
      ON m.id_material = r.id_material

    LEFT JOIN tb_ubicacion_caja u
      ON u.id_ubicacion = r.id_ubicacion

    LEFT JOIN tb_renta_finanzas f
      ON f.id_renta = r.id_renta
      AND f.id_empresa = r.id_empresa

    LEFT JOIN tb_renta_costos ce
      ON ce.id_renta = r.id_renta
      AND ce.id_empresa = r.id_empresa
      AND ce.tipo_operacion = 'entrega'
      AND ce.estado = 'registrado'

    LEFT JOIN tb_renta_costos cr
      ON cr.id_renta = r.id_renta
      AND cr.id_empresa = r.id_empresa
      AND cr.tipo_operacion = 'retiro'
      AND cr.estado = 'registrado'

    WHERE r.id_empresa = ?

    ORDER BY r.id_renta DESC
    `,
    [idEmpresa]
  );

  return rows;
};

// ======================================================
// OBTENER DETALLE PRINCIPAL
// ======================================================

const obtenerDetalle = async ({
  idRenta,
  idEmpresa,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      r.*,

      c.nombres AS cliente,
      c.celular,
      c.correo,
      c.direccion
        AS direccion_cliente,

      d.codigo AS dumpster_codigo,
      d.tamano_yardas,
      d.capacidad_toneladas,
      d.precio_base,

      ca.nombre_camion,
      ca.placa,

      m.nombre_material,
      u.ubicacion,

      f.subtotal_base,
      f.aplica_tax_base,

      COALESCE(
        f.tax_rate,
        i.tax_rate,
        0
      ) AS tax_rate,

      COALESCE(
        i.nombre,
        'Tax'
      ) AS nombre_impuesto,

      f.total_extras,
      f.tax_amount,
      f.total_final,
      f.saldo_pendiente,

      ce.id_costo
        AS entrega_id_costo,

      ce.hora_inicio
        AS entrega_hora_inicio,

      ce.hora_fin
        AS entrega_hora_fin,

      ce.horas_operacion
        AS entrega_horas_operacion,

      ce.tarifa_hora
        AS entrega_tarifa_hora,

      ce.costo_operativo
        AS entrega_costo_operativo,

      ce.observaciones
        AS entrega_observaciones,

      cr.id_costo
        AS retiro_id_costo,

      cr.hora_inicio
        AS retiro_hora_inicio,

      cr.hora_fin
        AS retiro_hora_fin,

      cr.horas_operacion
        AS retiro_horas_operacion,

      cr.tarifa_hora
        AS retiro_tarifa_hora,

      cr.costo_operativo
        AS retiro_costo_operativo,

      cr.lugar_disposicion,
      cr.numero_ticket,
      cr.costo_disposicion,

      cr.costo_total
        AS retiro_costo_total,

      cr.observaciones
        AS retiro_observaciones

    FROM tb_rentas r

    INNER JOIN tb_clientes c
      ON c.id_cliente = r.id_cliente
      AND c.id_empresa = r.id_empresa

    INNER JOIN dumpsters d
      ON d.id_dumpster = r.id_dumpster
      AND d.id_empresa = r.id_empresa

    LEFT JOIN tb_camion ca
      ON ca.id_camion = r.id_camion
      AND ca.id_empresa = r.id_empresa

    LEFT JOIN tb_material m
      ON m.id_material = r.id_material

    LEFT JOIN tb_ubicacion_caja u
      ON u.id_ubicacion = r.id_ubicacion

    LEFT JOIN tb_renta_finanzas f
      ON f.id_renta = r.id_renta
      AND f.id_empresa = r.id_empresa

    LEFT JOIN tb_impuestos i
      ON i.id_empresa = r.id_empresa
      AND i.activo = 1

    LEFT JOIN tb_renta_costos ce
      ON ce.id_renta = r.id_renta
      AND ce.id_empresa = r.id_empresa
      AND ce.tipo_operacion = 'entrega'
      AND ce.estado = 'registrado'

    LEFT JOIN tb_renta_costos cr
      ON cr.id_renta = r.id_renta
      AND cr.id_empresa = r.id_empresa
      AND cr.tipo_operacion = 'retiro'
      AND cr.estado = 'registrado'

    WHERE r.id_renta = ?
      AND r.id_empresa = ?

    LIMIT 1
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows[0] || null;
};

// ======================================================
// OBTENER PAGOS
// ======================================================

const obtenerPagos = async ({
  idRenta,
  idEmpresa,
}) => {
  const [rows] = await db.query(
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
      creado_por,
      fecha_pago

    FROM tb_renta_pagos

    WHERE id_renta = ?
      AND id_empresa = ?

    ORDER BY
      fecha_pago DESC,
      id_pago DESC
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows;
};

// ======================================================
// OBTENER EXTRAS
// ======================================================

const obtenerExtras = async ({
  idRenta,
  idEmpresa,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      id_extra,
      id_empresa,
      id_renta,
      tipo_extra,
      descripcion,
      monto,
      fecha_registro,
      creado_por,
      estado_pago

    FROM tb_renta_extras

    WHERE id_renta = ?
      AND id_empresa = ?

    ORDER BY id_extra DESC
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows;
};

// ======================================================
// OBTENER DETALLES DE LOS PAGOS
// ======================================================

const obtenerDetallesPago = async ({
  idRenta,
  idEmpresa,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      dp.id_pago_detalle,
      dp.id_empresa,
      dp.id_pago,
      dp.id_renta,
      dp.tipo_concepto,
      dp.id_extra,
      dp.descripcion,
      dp.monto_base,
      dp.tax_monto,
      dp.total_cobrado,
      dp.fecha_creacion,

      p.tipo_pago,
      p.estado_pago
        AS estado_pago_general,
      p.fecha_pago,
      p.observaciones
        AS observaciones_pago,

      ex.tipo_extra,
      ex.descripcion
        AS descripcion_extra

    FROM tb_renta_pago_detalles dp

    INNER JOIN tb_renta_pagos p
      ON p.id_pago = dp.id_pago
      AND p.id_empresa = dp.id_empresa
      AND p.id_renta = dp.id_renta

    LEFT JOIN tb_renta_extras ex
      ON ex.id_extra = dp.id_extra
      AND ex.id_empresa = dp.id_empresa
      AND ex.id_renta = dp.id_renta

    WHERE dp.id_renta = ?
      AND dp.id_empresa = ?

    ORDER BY
      p.fecha_pago DESC,
      dp.id_pago DESC,
      dp.id_pago_detalle ASC
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows;
};

module.exports = {
  listar,
  obtenerDetalle,
  obtenerPagos,
  obtenerExtras,
  obtenerDetallesPago,
};
