const pool = require('../config/db');
const ExcelJS = require('exceljs');

const construirFiltrosLogs = (query) => {
  const {
    usuario = '',
    empresa = '',
    modulo = '',
    accion = '',
    fecha_desde = '',
    fecha_hasta = ''
  } = query;

  const condiciones = [];
  const params = [];

  if (usuario) {
    condiciones.push('u.nombres LIKE ?');
    params.push(`%${usuario}%`);
  }

  if (empresa) {
    condiciones.push('e.nombre_empresa LIKE ?');
    params.push(`%${empresa}%`);
  }

  if (modulo) {
    condiciones.push('l.modulo LIKE ?');
    params.push(`%${modulo}%`);
  }

  if (accion) {
    condiciones.push('l.accion LIKE ?');
    params.push(`%${accion}%`);
  }

  if (fecha_desde) {
    condiciones.push('DATE(l.fyh_creacion) >= ?');
    params.push(fecha_desde);
  }

  if (fecha_hasta) {
    condiciones.push('DATE(l.fyh_creacion) <= ?');
    params.push(fecha_hasta);
  }

  return {
    where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
    params
  };
};

const getLogs = async (req, res) => {
  try {
    const { where, params } = construirFiltrosLogs(req.query);

    const [rows] = await pool.query(
      `
      SELECT
        l.id_log,
        l.id_usuario,
        u.nombres AS usuario,
        l.id_empresa,
        e.nombre_empresa,
        l.modulo,
        l.accion,
        l.descripcion,
        l.ip,
        l.user_agent,
        l.fyh_creacion
      FROM tb_logs l
      LEFT JOIN tb_usuarios u ON u.id_usuario = l.id_usuario
      LEFT JOIN tb_empresas e ON e.id_empresa = l.id_empresa
      ${where}
      ORDER BY l.id_log DESC
      LIMIT 500
      `,
      params
    );

    res.json({
      ok: true,
      logs: rows
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al listar logs',
      error: error.message
    });
  }
};

const exportLogsExcel = async (req, res) => {
  try {
    const { where, params } = construirFiltrosLogs(req.query);

    const [rows] = await pool.query(
      `
      SELECT
        l.id_log,
        l.fyh_creacion,
        u.nombres AS usuario,
        e.nombre_empresa,
        l.modulo,
        l.accion,
        l.descripcion,
        l.ip,
        l.user_agent
      FROM tb_logs l
      LEFT JOIN tb_usuarios u ON u.id_usuario = l.id_usuario
      LEFT JOIN tb_empresas e ON e.id_empresa = l.id_empresa
      ${where}
      ORDER BY l.id_log DESC
      LIMIT 1000
      `,
      params
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoria');

    worksheet.columns = [
      { header: 'ID', key: 'id_log', width: 10 },
      { header: 'Fecha', key: 'fyh_creacion', width: 22 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Empresa', key: 'nombre_empresa', width: 25 },
      { header: 'Módulo', key: 'modulo', width: 20 },
      { header: 'Acción', key: 'accion', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
      { header: 'IP', key: 'ip', width: 20 },
      { header: 'User Agent', key: 'user_agent', width: 50 }
    ];

    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=auditoria_digithex.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al exportar logs',
      error: error.message
    });
  }
};

module.exports = {
  getLogs,
  exportLogsExcel
};