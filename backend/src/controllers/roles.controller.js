const pool = require('../config/db');
const { registrarLog } = require('../helpers/logs');

const esSuperAdminRol = (rol = '') => {
  return rol.toUpperCase() === 'SUPER ADMIN';
};

const esAdminRol = (rol = '') => {
  const r = rol.toUpperCase();
  return r === 'ADMINISTRADOR' || r === 'ADMIN';
};

const usuarioEsSuperAdmin = (req) => {
  return esSuperAdminRol(req.usuario?.rol || '');
};

// LISTAR ROLES
const getRoles = async (req, res) => {
  try {
    const esSuperAdmin = usuarioEsSuperAdmin(req);
    const id_empresa = req.usuario.id_empresa;

    const query = `
      SELECT
        r.id_rol,
        r.id_empresa,
        e.nombre_empresa,
        r.rol,
        CAST(r.estado AS UNSIGNED) AS estado,
        r.fyh_creacion,
        r.fyh_actualizacion
      FROM tb_roles r
      LEFT JOIN tb_empresas e ON e.id_empresa = r.id_empresa
      ${
        esSuperAdmin
          ? ""
          : "WHERE r.id_empresa = ? AND UPPER(r.rol) <> 'SUPER ADMIN'"
      }
      ORDER BY r.id_rol DESC
    `;

    const params = esSuperAdmin ? [] : [id_empresa];

    const [rows] = await pool.query(query, params);

    res.json({
      ok: true,
      roles: rows
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Error al listar roles",
      error: error.message
    });
  }
};

// BUSCAR ROL
const getRolById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT
        r.id_rol,
        r.id_empresa,
        e.nombre_empresa,
        r.rol,
        CAST(r.estado AS UNSIGNED) AS estado,
        r.fyh_creacion,
        r.fyh_actualizacion
      FROM tb_roles r
      LEFT JOIN tb_empresas e ON e.id_empresa = r.id_empresa
      WHERE r.id_rol = ?
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Rol no encontrado'
      });
    }

    const rol = rows[0];

    if (!usuarioEsSuperAdmin(req)) {
      if (
        Number(rol.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rol.rol)
      ) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para ver este rol'
        });
      }
    }

    res.json({
      ok: true,
      rol
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al buscar rol',
      error: error.message
    });
  }
};

// CREAR ROL
const createRol = async (req, res) => {
  try {
    const { rol, estado = 1, id_empresa } = req.body;

    const esSuperAdmin = usuarioEsSuperAdmin(req);

    const idEmpresaRol = esSuperAdmin
      ? id_empresa || null
      : req.usuario.id_empresa;

    if (!rol) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre del rol es obligatorio'
      });
    }

    if (!esSuperAdmin && esSuperAdminRol(rol)) {
      return res.status(403).json({
        ok: false,
        message: 'No puedes crear un rol SUPER ADMIN'
      });
    }

    const [existe] = await pool.query(
      `
      SELECT id_rol
      FROM tb_roles
      WHERE UPPER(rol) = UPPER(?)
        AND (
          id_empresa = ?
          OR (id_empresa IS NULL AND ? IS NULL)
        )
      LIMIT 1
      `,
      [rol, idEmpresaRol, idEmpresaRol]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ese rol ya existe para esta empresa'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO tb_roles
      (
        id_empresa,
        rol,
        estado,
        fyh_creacion
      )
      VALUES (?, ?, ?, NOW())
    `, [
      idEmpresaRol,
      rol,
      Number(estado)
    ]);

    await registrarLog({
      req,
      modulo: 'Roles',
      accion: 'CREAR',
      descripcion: `Creó el rol ${rol}`
    });

    res.status(201).json({
      ok: true,
      message: 'Rol creado correctamente',
      id_rol: result.insertId
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al crear rol',
      error: error.message
    });
  }
};

// ACTUALIZAR ROL
const updateRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, estado = 1 } = req.body;

    if (!rol) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre del rol es obligatorio'
      });
    }

    const [rolActualRows] = await pool.query(
      `
      SELECT
        id_rol,
        id_empresa,
        rol,
        CAST(estado AS UNSIGNED) AS estado
      FROM tb_roles
      WHERE id_rol = ?
      LIMIT 1
      `,
      [id]
    );

    if (rolActualRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Rol no encontrado'
      });
    }

    const rolActual = rolActualRows[0];
    const esSuperAdmin = usuarioEsSuperAdmin(req);

    if (!esSuperAdmin) {
      if (
        Number(rolActual.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rolActual.rol)
      ) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para actualizar este rol'
        });
      }
    }

    if (esSuperAdminRol(rolActual.rol)) {
      return res.status(403).json({
        ok: false,
        message: 'No se puede editar el rol SUPER ADMIN'
      });
    }

    if (!esSuperAdmin && esSuperAdminRol(rol)) {
      return res.status(403).json({
        ok: false,
        message: 'No puedes convertir un rol en SUPER ADMIN'
      });
    }

    if (Number(estado) === 0 && esAdminRol(rolActual.rol)) {
      const [adminsActivos] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM tb_roles
        WHERE id_empresa = ?
          AND estado = 1
          AND id_rol != ?
          AND (
            UPPER(rol) = 'ADMINISTRADOR'
            OR UPPER(rol) = 'ADMIN'
          )
        `,
        [rolActual.id_empresa, id]
      );

      const totalAdmins = Number(adminsActivos[0]?.total || 0);

      if (totalAdmins < 1) {
        return res.status(400).json({
          ok: false,
          message: 'No puedes desactivar el último rol administrador activo de la empresa'
        });
      }
    }

    const [existe] = await pool.query(`
      SELECT id_rol
      FROM tb_roles
      WHERE UPPER(rol) = UPPER(?)
        AND id_rol != ?
        AND (
          id_empresa = ?
          OR (id_empresa IS NULL AND ? IS NULL)
        )
      LIMIT 1
    `, [rol, id, rolActual.id_empresa, rolActual.id_empresa]);

    if (existe.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ese rol ya existe para esta empresa'
      });
    }

    await pool.query(`
      UPDATE tb_roles
      SET
        rol = ?,
        estado = ?,
        fyh_actualizacion = NOW()
      WHERE id_rol = ?
    `, [
      rol,
      Number(estado),
      id
    ]);

    await registrarLog({
      req,
      modulo: 'Roles',
      accion: 'ACTUALIZAR',
      descripcion: `Actualizó el rol ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Rol actualizado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al actualizar rol',
      error: error.message
    });
  }
};

// DESACTIVAR ROL
const deleteRol = async (req, res) => {
  try {
    const { id } = req.params;

    const [rolRows] = await pool.query(
      `
      SELECT
        id_rol,
        id_empresa,
        rol,
        CAST(estado AS UNSIGNED) AS estado
      FROM tb_roles
      WHERE id_rol = ?
      LIMIT 1
      `,
      [id]
    );

    if (rolRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Rol no encontrado'
      });
    }

    const rolActual = rolRows[0];
    const esSuperAdmin = usuarioEsSuperAdmin(req);

    if (!esSuperAdmin) {
      if (
        Number(rolActual.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rolActual.rol)
      ) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para desactivar este rol'
        });
      }
    }

    if (esSuperAdminRol(rolActual.rol)) {
      return res.status(403).json({
        ok: false,
        message: 'No se puede desactivar el rol SUPER ADMIN'
      });
    }

    const [usuarios] = await pool.query(
      `
      SELECT id_usuario
      FROM tb_usuarios
      WHERE id_rol = ?
        AND estado = 1
      LIMIT 1
      `,
      [id]
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'No puedes desactivar este rol porque tiene usuarios activos asignados'
      });
    }

    if (esAdminRol(rolActual.rol)) {
      const [adminsActivos] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM tb_roles
        WHERE id_empresa = ?
          AND estado = 1
          AND id_rol != ?
          AND (
            UPPER(rol) = 'ADMINISTRADOR'
            OR UPPER(rol) = 'ADMIN'
          )
        `,
        [rolActual.id_empresa, id]
      );

      const totalAdmins = Number(adminsActivos[0]?.total || 0);

      if (totalAdmins < 1) {
        return res.status(400).json({
          ok: false,
          message: 'No puedes desactivar el último rol administrador activo de la empresa'
        });
      }
    }

    await pool.query(`
      UPDATE tb_roles
      SET estado = 0, fyh_actualizacion = NOW()
      WHERE id_rol = ?
    `, [id]);

    await registrarLog({
      req,
      modulo: 'Roles',
      accion: 'DESACTIVAR',
      descripcion: `Desactivó el rol ${rolActual.rol} ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Rol desactivado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al desactivar rol',
      error: error.message
    });
  }
};

module.exports = {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol
};