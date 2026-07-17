const pool = require('../config/db');

const validarPermiso = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      const usuario = req.usuario;

      if (!usuario) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario no autenticado'
        });
      }

      const [rows] = await pool.query(`
        SELECT p.permiso
        FROM tb_roles_permisos rp
        INNER JOIN tb_permisos p ON p.id_permiso = rp.id_permiso
        WHERE rp.id_rol = ?
          AND p.permiso = ?
          AND p.estado = 1
        LIMIT 1
      `, [
        usuario.id_rol,
        permisoRequerido
      ]);

      if (rows.length === 0) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permiso para realizar esta acción'
        });
      }

      next();

    } catch (error) {
      res.status(500).json({
        ok: false,
        message: 'Error al validar permiso',
        error: error.message
      });
    }
  };
};

module.exports = {
  validarPermiso
};