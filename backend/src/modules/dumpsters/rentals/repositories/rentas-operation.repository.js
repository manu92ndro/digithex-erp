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
// FINALIZAR RENTA
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
      AND estado IN (
        'en_uso',
        'en_retiro'
      )
    `,
    [
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

// ======================================================
// CANCELAR RENTA
// ======================================================

const cancelar = async (
  conn,
  {
    idRenta,
    idEmpresa,
    motivo,
    canceladoPor,
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
      AND estado IN (
        'pendiente',
        'programada',
        'en_entrega'
      )
    `,
    [
      motivo,
      idRenta,
      idEmpresa,
    ]
  );

  return result.affectedRows;
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

  return result.affectedRows;
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

  return result.affectedRows;
};

// ======================================================
// ANULAR PAGOS POR CANCELACIÓN DE RENTA
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

  return result.affectedRows;
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
      AND estado NOT IN (
        'finalizado',
        'cancelado'
      )
    `,
    [
      fecha,
      diasRenta,
      idRenta,
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
  finalizar,
  cancelar,
  liberarDumpster,
  cancelarFinanzas,
  anularPagos,
  actualizarFechaRetiro,
};