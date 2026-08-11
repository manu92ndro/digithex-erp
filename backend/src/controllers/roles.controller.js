const pool = require("../shared/database/db");
const { registrarLog } = require("../shared/logging/logs");


// ======================================================
// HELPERS
// ======================================================

const esSuperAdminRol = (rol = "") => {
  return String(rol).trim().toUpperCase() === "SUPER ADMIN";
};


const esAdminRol = (rol = "") => {
  const r = String(rol).trim().toUpperCase();

  return r === "ADMINISTRADOR" || r === "ADMIN";
};


const usuarioEsSuperAdmin = (req) => {
  return esSuperAdminRol(req.usuario?.rol || "");
};


// ======================================================
// LISTAR ROLES
// ======================================================

const getRoles = async (req, res) => {
  try {
    const esSuperAdmin = usuarioEsSuperAdmin(req);

    const idEmpresaUsuario = req.usuario.id_empresa;

    // El SUPER ADMIN puede enviar:
    // GET /api/roles?id_empresa=2
    const idEmpresaFiltro = req.query.id_empresa
      ? Number(req.query.id_empresa)
      : null;


    let query = `
      SELECT
        r.id_rol,
        r.id_empresa,
        e.nombre_empresa,
        r.rol,
        CAST(r.estado AS UNSIGNED) AS estado,
        r.fyh_creacion,
        r.fyh_actualizacion

      FROM tb_roles r

      LEFT JOIN tb_empresas e
        ON e.id_empresa = r.id_empresa
    `;


    const params = [];


    // ==================================================
    // SUPER ADMIN
    // ==================================================

    if (esSuperAdmin) {

      // Si envía empresa, devolver SOLO roles de esa empresa
      if (idEmpresaFiltro) {

        query += `
          WHERE r.id_empresa = ?
            AND UPPER(r.rol) <> 'SUPER ADMIN'
        `;

        params.push(idEmpresaFiltro);
      }

      // Si no envía empresa:
      // devuelve todos los roles
    }


    // ==================================================
    // USUARIO NORMAL / ADMINISTRADOR
    // ==================================================

    else {

      query += `
        WHERE r.id_empresa = ?
          AND UPPER(r.rol) <> 'SUPER ADMIN'
      `;

      params.push(idEmpresaUsuario);
    }


    query += `
      ORDER BY
        e.nombre_empresa ASC,
        r.rol ASC
    `;


    const [rows] = await pool.query(query, params);


    return res.json({
      ok: true,
      roles: rows
    });


  } catch (error) {

    console.error("Error getRoles:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al listar roles",
      error: error.message
    });
  }
};


// ======================================================
// BUSCAR ROL POR ID
// ======================================================

const getRolById = async (req, res) => {
  try {

    const { id } = req.params;


    const [rows] = await pool.query(
      `
      SELECT
        r.id_rol,
        r.id_empresa,
        e.nombre_empresa,
        r.rol,
        CAST(r.estado AS UNSIGNED) AS estado,
        r.fyh_creacion,
        r.fyh_actualizacion

      FROM tb_roles r

      LEFT JOIN tb_empresas e
        ON e.id_empresa = r.id_empresa

      WHERE r.id_rol = ?

      LIMIT 1
      `,
      [id]
    );


    if (rows.length === 0) {

      return res.status(404).json({
        ok: false,
        message: "Rol no encontrado"
      });
    }


    const rol = rows[0];


    // Un usuario normal solamente puede acceder
    // a roles pertenecientes a su empresa
    if (!usuarioEsSuperAdmin(req)) {

      if (
        Number(rol.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rol.rol)
      ) {

        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para ver este rol"
        });
      }
    }


    return res.json({
      ok: true,
      rol
    });


  } catch (error) {

    console.error("Error getRolById:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al buscar rol",
      error: error.message
    });
  }
};


// ======================================================
// CREAR ROL
// ======================================================

const createRol = async (req, res) => {
  try {

    const {
      rol,
      estado = 1,
      id_empresa
    } = req.body;


    const esSuperAdmin = usuarioEsSuperAdmin(req);


    // ==================================================
    // VALIDAR NOMBRE
    // ==================================================

    if (!rol || !String(rol).trim()) {

      return res.status(400).json({
        ok: false,
        message: "El nombre del rol es obligatorio"
      });
    }


    const nombreRol = String(rol).trim();


    // ==================================================
    // DETERMINAR EMPRESA
    // ==================================================

    let idEmpresaRol;


    if (esSuperAdmin) {

      // SUPER ADMIN puede escoger empresa
      idEmpresaRol = id_empresa
        ? Number(id_empresa)
        : null;

    } else {

      // Los demás usuarios solamente crean
      // roles para su propia empresa
      idEmpresaRol = Number(req.usuario.id_empresa);
    }


    // ==================================================
    // PROTEGER SUPER ADMIN
    // ==================================================

    if (!esSuperAdmin && esSuperAdminRol(nombreRol)) {

      return res.status(403).json({
        ok: false,
        message: "No puedes crear un rol SUPER ADMIN"
      });
    }


    // Si se intenta crear SUPER ADMIN,
    // debe ser un rol global
    if (esSuperAdminRol(nombreRol)) {

      idEmpresaRol = null;
    }


    // ==================================================
    // VERIFICAR EMPRESA
    // ==================================================

    if (idEmpresaRol !== null) {

      const [empresaRows] = await pool.query(
        `
        SELECT id_empresa
        FROM tb_empresas
        WHERE id_empresa = ?
        LIMIT 1
        `,
        [idEmpresaRol]
      );


      if (empresaRows.length === 0) {

        return res.status(400).json({
          ok: false,
          message: "La empresa seleccionada no existe"
        });
      }
    }


    // ==================================================
    // EVITAR ROL DUPLICADO
    // ==================================================

    const [existe] = await pool.query(
      `
      SELECT id_rol

      FROM tb_roles

      WHERE UPPER(TRIM(rol)) = UPPER(TRIM(?))

      AND (
        id_empresa = ?
        OR (
          id_empresa IS NULL
          AND ? IS NULL
        )
      )

      LIMIT 1
      `,
      [
        nombreRol,
        idEmpresaRol,
        idEmpresaRol
      ]
    );


    if (existe.length > 0) {

      return res.status(409).json({
        ok: false,
        message: "Ese rol ya existe para esta empresa"
      });
    }


    // ==================================================
    // CREAR
    // ==================================================

    const [result] = await pool.query(
      `
      INSERT INTO tb_roles
      (
        id_empresa,
        rol,
        estado,
        fyh_creacion
      )

      VALUES (?, ?, ?, NOW())
      `,
      [
        idEmpresaRol,
        nombreRol,
        Number(estado)
      ]
    );


    await registrarLog({
      req,
      modulo: "Roles",
      accion: "CREAR",
      descripcion: `Creó el rol ${nombreRol}`
    });


    return res.status(201).json({
      ok: true,
      message: "Rol creado correctamente",
      id_rol: result.insertId
    });


  } catch (error) {

    console.error("Error createRol:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al crear rol",
      error: error.message
    });
  }
};


// ======================================================
// ACTUALIZAR ROL
// ======================================================

const updateRol = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      rol,
      estado = 1
    } = req.body;


    if (!rol || !String(rol).trim()) {

      return res.status(400).json({
        ok: false,
        message: "El nombre del rol es obligatorio"
      });
    }


    const nombreRol = String(rol).trim();


    // ==================================================
    // BUSCAR ROL ACTUAL
    // ==================================================

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
        message: "Rol no encontrado"
      });
    }


    const rolActual = rolActualRows[0];

    const esSuperAdmin = usuarioEsSuperAdmin(req);


    // ==================================================
    // SEGURIDAD MULTIEMPRESA
    // ==================================================

    if (!esSuperAdmin) {

      if (
        Number(rolActual.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rolActual.rol)
      ) {

        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para actualizar este rol"
        });
      }
    }


    // ==================================================
    // SUPER ADMIN NO SE EDITA
    // ==================================================

    if (esSuperAdminRol(rolActual.rol)) {

      return res.status(403).json({
        ok: false,
        message: "No se puede editar el rol SUPER ADMIN"
      });
    }


    // Nadie puede convertir otro rol
    // en SUPER ADMIN
    if (esSuperAdminRol(nombreRol)) {

      return res.status(403).json({
        ok: false,
        message: "No puedes convertir este rol en SUPER ADMIN"
      });
    }


    // ==================================================
    // PROTEGER ÚLTIMO ADMINISTRADOR
    // ==================================================

    if (
      Number(estado) === 0 &&
      esAdminRol(rolActual.rol)
    ) {

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
        [
          rolActual.id_empresa,
          id
        ]
      );


      const totalAdmins =
        Number(adminsActivos[0]?.total || 0);


      if (totalAdmins < 1) {

        return res.status(400).json({
          ok: false,
          message:
            "No puedes desactivar el último rol administrador activo de la empresa"
        });
      }
    }


    // ==================================================
    // VERIFICAR DUPLICADOS
    // ==================================================

    const [existe] = await pool.query(
      `
      SELECT id_rol

      FROM tb_roles

      WHERE UPPER(TRIM(rol)) = UPPER(TRIM(?))
        AND id_rol != ?

        AND (
          id_empresa = ?
          OR (
            id_empresa IS NULL
            AND ? IS NULL
          )
        )

      LIMIT 1
      `,
      [
        nombreRol,
        id,
        rolActual.id_empresa,
        rolActual.id_empresa
      ]
    );


    if (existe.length > 0) {

      return res.status(409).json({
        ok: false,
        message: "Ese rol ya existe para esta empresa"
      });
    }


    // ==================================================
    // ACTUALIZAR
    // ==================================================

    await pool.query(
      `
      UPDATE tb_roles

      SET
        rol = ?,
        estado = ?,
        fyh_actualizacion = NOW()

      WHERE id_rol = ?
      `,
      [
        nombreRol,
        Number(estado),
        id
      ]
    );


    await registrarLog({
      req,
      modulo: "Roles",
      accion: "ACTUALIZAR",
      descripcion: `Actualizó el rol ID ${id}`
    });


    return res.json({
      ok: true,
      message: "Rol actualizado correctamente"
    });


  } catch (error) {

    console.error("Error updateRol:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al actualizar rol",
      error: error.message
    });
  }
};


// ======================================================
// DESACTIVAR ROL
// ======================================================

const deleteRol = async (req, res) => {
  try {

    const { id } = req.params;


    // ==================================================
    // BUSCAR ROL
    // ==================================================

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
        message: "Rol no encontrado"
      });
    }


    const rolActual = rolRows[0];

    const esSuperAdmin = usuarioEsSuperAdmin(req);


    // ==================================================
    // SEGURIDAD MULTIEMPRESA
    // ==================================================

    if (!esSuperAdmin) {

      if (
        Number(rolActual.id_empresa) !== Number(req.usuario.id_empresa) ||
        esSuperAdminRol(rolActual.rol)
      ) {

        return res.status(403).json({
          ok: false,
          message: "No tienes permisos para desactivar este rol"
        });
      }
    }


    // ==================================================
    // PROTEGER SUPER ADMIN
    // ==================================================

    if (esSuperAdminRol(rolActual.rol)) {

      return res.status(403).json({
        ok: false,
        message: "No se puede desactivar el rol SUPER ADMIN"
      });
    }


    // ==================================================
    // VERIFICAR USUARIOS ACTIVOS
    // ==================================================

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
        message:
          "No puedes desactivar este rol porque tiene usuarios activos asignados"
      });
    }


    // ==================================================
    // PROTEGER ÚLTIMO ADMINISTRADOR
    // ==================================================

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
        [
          rolActual.id_empresa,
          id
        ]
      );


      const totalAdmins =
        Number(adminsActivos[0]?.total || 0);


      if (totalAdmins < 1) {

        return res.status(400).json({
          ok: false,
          message:
            "No puedes desactivar el último rol administrador activo de la empresa"
        });
      }
    }


    // ==================================================
    // DESACTIVAR
    // ==================================================

    await pool.query(
      `
      UPDATE tb_roles

      SET
        estado = 0,
        fyh_actualizacion = NOW()

      WHERE id_rol = ?
      `,
      [id]
    );


    await registrarLog({
      req,
      modulo: "Roles",
      accion: "DESACTIVAR",
      descripcion:
        `Desactivó el rol ${rolActual.rol} ID ${id}`
    });


    return res.json({
      ok: true,
      message: "Rol desactivado correctamente"
    });


  } catch (error) {

    console.error("Error deleteRol:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al desactivar rol",
      error: error.message
    });
  }
};


// ======================================================
// EXPORTAR
// ======================================================

module.exports = {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol
};