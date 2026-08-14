// ======================================================
// REPOSITORY: OPERACIONES GENERALES DE RENTAS
// Cancelación y reprogramación.
// La finalización normal ocurre al registrar el retiro.
// ======================================================

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
      id_dumpster,
      estado,
      fecha_inicio,
      dias_renta,
      fecha_estimada_devolucion,
      fecha_real_devolucion,
      observaciones

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
// OBTENER ENTREGA REAL
// ======================================================

const obtenerEntregaRegistrada = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [rows] = await conn.query(
    `
    SELECT
      hora_inicio,
      hora_fin

    FROM tb_renta_costos

    WHERE id_renta = ?
      AND id_empresa = ?
      AND tipo_operacion = 'entrega'
      AND estado = 'registrado'

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
// FINALIZAR MANUALMENTE
// Se conserva por compatibilidad, pero NO debe ser
// la vía normal. La vía normal es registrar el retiro.
// ======================================================

const finalizar = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_rentas

    SET
      estado = 'finalizado',
      fecha_real_devolucion = CURDATE(),
      fyh_actualizacion = NOW()

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado = 'en_uso'
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// CANCELAR RENTA
// Solo antes de entregar.
// ======================================================

const cancelar = async (
  conn,
  {
    idRenta,
    idEmpresa,
    motivo,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_rentas

    SET
      estado = 'cancelado',

      observaciones = CONCAT(
        COALESCE(observaciones, ''),
        CASE
          WHEN COALESCE(observaciones, '') = ''
          THEN ''
          ELSE '\\n'
        END,
        'Cancelación: ',
        ?
      ),

      fyh_actualizacion = NOW()

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado = 'programada'
    `,
    [
      motivo,
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// LIBERAR DUMPSTER
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
// CANCELAR FINANZAS
// ======================================================

const cancelarFinanzas = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_renta_finanzas

    SET
      saldo_pendiente = 0

    WHERE id_renta = ?
      AND id_empresa = ?
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// ANULAR PAGOS POR CANCELACIÓN
// ======================================================

const anularPagos = async (
  conn,
  {
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
      fecha_anulacion = NOW(),

      observaciones = CONCAT(
        COALESCE(observaciones, ''),
        CASE
          WHEN COALESCE(observaciones, '') = ''
          THEN ''
          ELSE '\\n'
        END,
        'Pago anulado por cancelación de renta: ',
        ?
      )

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado_pago <> 'anulado'
    `,
    [
      motivo,
      anuladoPor,
      motivo,
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// ACTUALIZAR FECHA DE RETIRO
// ======================================================

const actualizarFechaRetiro = async (
  conn,
  {
    idRenta,
    idEmpresa,
    fecha,
    diasRenta,
  }
) => {
  const [result] = await conn.query(
    `
    UPDATE tb_rentas

    SET
      fecha_estimada_devolucion = ?,
      dias_renta = ?,
      fyh_actualizacion = NOW()

    WHERE id_renta = ?
      AND id_empresa = ?
      AND estado IN (
        'programada',
        'en_uso'
      )
    `,
    [
      fecha,
      diasRenta,
      idRenta,
      idEmpresa,
    ]
  );

  return Number(result.affectedRows || 0);
};

// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  bloquearRenta,
  obtenerEntregaRegistrada,
  finalizar,
  cancelar,
  liberarDumpster,
  cancelarFinanzas,
  anularPagos,
  actualizarFechaRetiro,
};
