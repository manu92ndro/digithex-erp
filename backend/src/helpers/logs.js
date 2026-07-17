const pool = require('../config/db');

const registrarLog = async ({
  req,
  usuarioManual = null,
  modulo,
  accion,
  descripcion
}) => {
  try {
    const usuario = req.usuario || usuarioManual || {};

    const ip =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      null;

    const userAgent =
      req.headers['user-agent'] ||
      null;

    await pool.query(
      `
      INSERT INTO tb_logs
      (
        id_usuario,
        id_empresa,
        modulo,
        accion,
        descripcion,
        ip,
        user_agent,
        fyh_creacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        usuario.id_usuario || null,
        usuario.id_empresa || null,
        modulo,
        accion,
        descripcion || null,
        ip,
        userAgent
      ]
    );

  } catch (error) {
    console.error('ERROR REGISTRANDO LOG:', error.message);
  }
};

module.exports = {
  registrarLog
};