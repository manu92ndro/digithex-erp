// ======================================================
// REPOSITORY: COSTOS / OPERACIÓN DE RENTAS
// Tabla principal: tb_renta_costos
// ======================================================

// ======================================================
// BLOQUEAR Y OBTENER RENTA
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
      r.id_renta,
      r.id_empresa,
      r.id_dumpster,
      r.id_camion,
      r.estado,
      r.fecha_inicio,
      r.dias_renta,
      r.fecha_estimada_devolucion,
      r.fecha_real_devolucion,

      f.subtotal_base,
      f.total_extras,
      f.tax_amount,
      f.total_final

    FROM tb_rentas r

    LEFT JOIN tb_renta_finanzas f
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
// OBTENER TARIFA CONFIGURADA
// ======================================================

const obtenerTarifaHora = async (
  conn,
  {
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      costo_operativo_hora

    FROM tb_empresa_configuracion

    WHERE id_empresa = ?

    LIMIT 1
    `,
    [idEmpresa]
  );

  return rows[0] || null;
};

// ======================================================
// GUARDAR COSTO / OPERACIÓN
// ======================================================

const guardarCosto = async (
  conn,
  {
    idEmpresa,
    idRenta,
    tipoOperacion,
    horaInicio,
    horaFin,
    horasOperacion,
    tarifaHora,
    costoOperativo,
    lugarDisposicion,
    numeroTicket,
    costoDisposicion,
    costoTotal,
    observaciones,
    creadoPor,
  }
) => {
  const [result] = await conn.query(
    `
    INSERT INTO tb_renta_costos
    (
      id_empresa,
      id_renta,
      tipo_operacion,
      hora_inicio,
      hora_fin,
      horas_operacion,
      tarifa_hora,
      costo_operativo,
      lugar_disposicion,
      numero_ticket,
      costo_disposicion,
      costo_total,
      observaciones,
      estado,
      creado_por,
      fecha_registro,
      fyh_actualizacion
    )
    VALUES
    (
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      'registrado',
      ?,
      NOW(),
      NOW()
    )
    `,
    [
      idEmpresa,
      idRenta,
      tipoOperacion,
      horaInicio,
      horaFin,
      horasOperacion,
      tarifaHora,
      costoOperativo,
      lugarDisposicion,
      numeroTicket,
      costoDisposicion,
      costoTotal,
      observaciones,
      creadoPor,
    ]
  );

  return {
    insertId: Number(result.insertId || 0),
    affectedRows: Number(result.affectedRows || 0),
  };
};

// ======================================================
// CAMBIO DE ESTADO DESPUÉS DE ENTREGA
// programada -> en_uso
// La fecha programada original (fecha_inicio) NO se toca.
// ======================================================

const registrarEntregaEnRenta = async (
  conn,
  {
    idRenta,
    idEmpresa,
    fechaEstimadaDevolucion,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_rentas

    SET
      estado = 'en_uso',
      fecha_estimada_devolucion = ?,
      fyh_actualizacion = NOW()

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado = 'programada'
    `,
    [
      fechaEstimadaDevolucion,
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// FINALIZAR DESPUÉS DEL RETIRO
// en_uso -> finalizado
// ======================================================

const registrarRetiroEnRenta = async (
  conn,
  {
    idRenta,
    idEmpresa,
    fechaRealDevolucion,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_rentas

    SET
      estado = 'finalizado',
      fecha_real_devolucion = ?,
      fyh_actualizacion = NOW()

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado = 'en_uso'
    `,
    [
      fechaRealDevolucion,
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// LIBERAR DUMPSTER AL REGISTRAR RETIRO
// ======================================================

const liberarDumpster = async (
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
      estado = 'disponible',
      fecha_actualizacion = CURRENT_TIMESTAMP

    WHERE id_dumpster = ?
      AND id_empresa = ?
    `,
    [
      idDumpster,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// OBTENER COSTOS DE UNA RENTA
// ======================================================

const obtenerCostos = async (
  db,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await db.query(
    `
    SELECT
      c.id_costo,
      c.id_empresa,
      c.id_renta,
      c.tipo_operacion,

      c.hora_inicio,
      c.hora_fin,

      c.horas_operacion,
      c.tarifa_hora,
      c.costo_operativo,

      c.lugar_disposicion,
      c.numero_ticket,
      c.costo_disposicion,

      c.costo_total,
      c.observaciones,

      c.estado,
      c.creado_por,
      c.fecha_registro,
      c.fyh_actualizacion,

      u.nombres AS registrado_por_nombre,
      u.email AS registrado_por_email

    FROM tb_renta_costos c

    LEFT JOIN tb_usuarios u
      ON u.id_usuario = c.creado_por
      AND u.id_empresa = c.id_empresa

    WHERE c.id_renta = ?
      AND c.id_empresa = ?
      AND c.estado = 'registrado'

    ORDER BY FIELD(
      c.tipo_operacion,
      'entrega',
      'retiro'
    )
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return rows;
};

// ======================================================
// OBTENER RESUMEN DE COSTOS
// ======================================================

const obtenerResumenCostos = async (
  db,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await db.query(
    `
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN tipo_operacion = 'entrega'
            THEN costo_operativo
            ELSE 0
          END
        ),
        0
      ) AS costo_entrega,

      COALESCE(
        SUM(
          CASE
            WHEN tipo_operacion = 'retiro'
            THEN costo_operativo
            ELSE 0
          END
        ),
        0
      ) AS costo_retiro,

      COALESCE(
        SUM(costo_disposicion),
        0
      ) AS costo_disposicion,

      COALESCE(
        SUM(costo_operativo),
        0
      ) AS costo_operativo_total,

      COALESCE(
        SUM(costo_total),
        0
      ) AS costo_total

    FROM tb_renta_costos

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado = 'registrado'
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return (
    rows[0] || {
      costo_entrega: 0,
      costo_retiro: 0,
      costo_disposicion: 0,
      costo_operativo_total: 0,
      costo_total: 0,
    }
  );
};

// ======================================================
// OBTENER FINANZAS PARA RENTABILIDAD
// ======================================================

const obtenerFinanzas = async (
  db,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await db.query(
    `
    SELECT
      subtotal_base,
      total_extras,
      tax_amount,
      total_final,
      saldo_pendiente

    FROM tb_renta_finanzas

    WHERE id_renta = ?
      AND id_empresa = ?

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
// EXPORTACIONES
// ======================================================

module.exports = {
  bloquearRenta,
  obtenerTarifaHora,
  guardarCosto,
  registrarEntregaEnRenta,
  registrarRetiroEnRenta,
  liberarDumpster,
  obtenerCostos,
  obtenerResumenCostos,
  obtenerFinanzas,
};
