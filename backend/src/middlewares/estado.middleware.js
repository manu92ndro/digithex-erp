const pool = require('../config/db');

const validarEstadoCuenta = async (req, res, next) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const [rows] = await pool.query(`
      SELECT
        CAST(u.estado AS UNSIGNED) AS estado_usuario,
        CAST(r.estado AS UNSIGNED) AS estado_rol,
        CAST(e.estado AS UNSIGNED) AS estado_empresa
      FROM tb_usuarios u
      LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
      LEFT JOIN tb_empresas e ON e.id_empresa = u.id_empresa
      WHERE u.id_usuario = ?
      LIMIT 1
    `, [id_usuario]);

    if (rows.length === 0) {
      return res.status(403).json({
        ok: false,
        code: "USUARIO_NO_VALIDO",
        message: "Usuario no válido",
      });
    }

    const data = rows[0];

    if (Number(data.estado_usuario) !== 1) {
      return res.status(403).json({
        ok: false,
        code: 'USUARIO_INACTIVO',
        message: 'Tu usuario está inactivo'
      });
    }

    if (Number(data.estado_empresa) !== 1) {
      return res.status(403).json({
        ok: false,
        code: 'EMPRESA_INACTIVA',
        message: 'La empresa está inactiva'
      });
    }

    if (Number(data.estado_rol) !== 1) {
      return res.status(403).json({
        ok: false,
        code: 'ROL_INACTIVO',
        message: 'Tu rol está inactivo'
      });
    }

    next();

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error validando estado de cuenta',
      error: error.message
    });
  }
};

module.exports = {
  validarEstadoCuenta
};