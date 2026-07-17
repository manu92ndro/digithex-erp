const pool = require('../config/db');
const { registrarLog } = require('../helpers/logs');

// LISTAR TODOS LOS PERMISOS AGRUPADOS POR MÓDULO
const getPermisos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        m.id_modulo,
        m.nombre_modulo,
        m.ruta,
        m.icono,
        m.orden,
        p.id_permiso,
        p.permiso,
        p.descripcion
      FROM tb_modulos m
      INNER JOIN tb_permisos p ON p.id_modulo = m.id_modulo
      WHERE m.estado = 1
        AND p.estado = 1
      ORDER BY m.orden ASC, p.id_permiso ASC
    `);

    res.json({
      ok: true,
      permisos: rows
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al listar permisos',
      error: error.message
    });
  }
};

// PERMISOS ACTUALES DE UN ROL
const getPermisosByRol = async (req, res) => {
  try {
    const { id_rol } = req.params;

    const [rows] = await pool.query(`
      SELECT id_permiso
      FROM tb_roles_permisos
      WHERE id_rol = ?
        AND estado = 1
    `, [id_rol]);

    res.json({
      ok: true,
      permisos: rows.map((p) => p.id_permiso)
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al obtener permisos del rol',
      error: error.message
    });
  }
};

// ACTUALIZAR PERMISOS DE UN ROL
const updatePermisosRol = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id_rol } = req.params;
    const { permisos = [] } = req.body;

    const [rolRows] = await connection.query(
      `
      SELECT
        id_rol,
        rol,
        CAST(estado AS UNSIGNED) AS estado
      FROM tb_roles
      WHERE id_rol = ?
      LIMIT 1
      `,
      [id_rol]
    );

    if (rolRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Rol no encontrado'
      });
    }

    const rolActual = rolRows[0];

    if (rolActual.rol?.toUpperCase() === 'SUPER ADMIN') {
      return res.status(403).json({
        ok: false,
        message: 'No se pueden modificar los permisos del rol SUPER ADMIN'
      });
    }

    if (Number(rolActual.estado) !== 1) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden modificar permisos de un rol inactivo'
      });
    }

    if (!Array.isArray(permisos)) {
      return res.status(400).json({
        ok: false,
        message: 'El formato de permisos no es válido'
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE tb_roles_permisos
      SET estado = 0
      WHERE id_rol = ?
      `,
      [id_rol]
    );

    for (const id_permiso of permisos) {
      const [permisoRows] = await connection.query(
        `
        SELECT id_permiso
        FROM tb_permisos
        WHERE id_permiso = ?
          AND estado = 1
        LIMIT 1
        `,
        [id_permiso]
      );

      if (permisoRows.length === 0) {
        continue;
      }

      const [existe] = await connection.query(
        `
        SELECT id_rol_permiso
        FROM tb_roles_permisos
        WHERE id_rol = ?
          AND id_permiso = ?
        LIMIT 1
        `,
        [id_rol, id_permiso]
      );

      if (existe.length > 0) {
        await connection.query(
          `
          UPDATE tb_roles_permisos
          SET estado = 1
          WHERE id_rol = ?
            AND id_permiso = ?
          `,
          [id_rol, id_permiso]
        );
      } else {
        await connection.query(
          `
          INSERT INTO tb_roles_permisos
          (
            id_rol,
            id_permiso,
            estado,
            fyh_creacion
          )
          VALUES (?, ?, 1, NOW())
          `,
          [id_rol, id_permiso]
        );
      }
    }

    await connection.commit();

    await registrarLog({
      req,
      modulo: 'Permisos',
      accion: 'ACTUALIZAR',
      descripcion: `Actualizó permisos del rol ${rolActual.rol} ID ${id_rol}`
    });

    res.json({
      ok: true,
      message: 'Permisos actualizados correctamente'
    });

  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      ok: false,
      message: 'Error al actualizar permisos del rol',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPermisos,
  getPermisosByRol,
  updatePermisosRol
};