const pool = require('../config/db');

const getDashboard = async (req, res) => {
  try {
    const id_empresa = req.usuario.id_empresa;
    const rol = req.usuario.rol;

    const esSuperAdmin =
      rol === 'SUPER ADMIN' ||
      rol === 'Super Admin';

    let usuariosQuery = '';
    let empresasQuery = '';
    let rolesQuery = '';

    let usuariosParams = [];
    let empresasParams = [];
    let rolesParams = [];

    if (esSuperAdmin) {
      usuariosQuery = `
        SELECT COUNT(*) AS total
        FROM tb_usuarios
      `;

      empresasQuery = `
        SELECT COUNT(*) AS total
        FROM tb_empresas
      `;

      rolesQuery = `
        SELECT COUNT(*) AS total
        FROM tb_roles
      `;
    } else {
      usuariosQuery = `
        SELECT COUNT(*) AS total
        FROM tb_usuarios
        WHERE id_empresa = ?
      `;

      empresasQuery = `
        SELECT COUNT(*) AS total
        FROM tb_empresas
        WHERE id_empresa = ?
      `;

      rolesQuery = `
        SELECT COUNT(DISTINCT id_rol) AS total
        FROM tb_usuarios
        WHERE id_empresa = ?
      `;

      usuariosParams = [id_empresa];
      empresasParams = [id_empresa];
      rolesParams = [id_empresa];
    }

    const [[usuarios]] = await pool.query(
      usuariosQuery,
      usuariosParams
    );

    const [[empresas]] = await pool.query(
      empresasQuery,
      empresasParams
    );

    const [[roles]] = await pool.query(
      rolesQuery,
      rolesParams
    );

    const [[usuariosActivos]] = await pool.query(
      esSuperAdmin
        ? `
          SELECT COUNT(*) AS total
          FROM tb_usuarios
          WHERE estado = 1
        `
        : `
          SELECT COUNT(*) AS total
          FROM tb_usuarios
          WHERE estado = 1
          AND id_empresa = ?
        `,
      esSuperAdmin ? [] : [id_empresa]
    );

    res.json({
      ok: true,
      dashboard: {
        total_usuarios: usuarios.total,
        total_empresas: empresas.total,
        total_roles: roles.total,
        usuarios_activos: usuariosActivos.total
      }
    });

  } catch (error) {
    console.error('ERROR DASHBOARD:', error);

    res.status(500).json({
      ok: false,
      message: 'Error al obtener dashboard',
      error: error.message
    });
  }
};

module.exports = {
  getDashboard
};