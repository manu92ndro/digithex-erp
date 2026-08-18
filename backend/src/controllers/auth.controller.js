const pool = require("../shared/database/db");
const bcrypt = require("bcryptjs");

const {
  generarJWT,
} = require("../helpers/jwt");

const {
  registrarLog,
} = require("../shared/logging/logs");


// ======================================================
// OBTENER USUARIO BASE
// No depende de ninguna empresa.
// ======================================================

const obtenerUsuarioBase = async (
  id_usuario
) => {
  const [rows] = await pool.query(
    `
      SELECT
        u.id_usuario,
        u.nombres,
        u.email,
        u.celular,
        u.password_user,
        u.foto,
        u.foto_public_id,

        CAST(
          u.estado AS UNSIGNED
        ) AS estado

      FROM tb_usuarios u

      WHERE u.id_usuario = ?

      LIMIT 1
    `,
    [id_usuario]
  );

  return rows[0] || null;
};


// ======================================================
// EMPRESAS ASIGNADAS AL USUARIO
// ======================================================

const obtenerEmpresasUsuario = async (
  id_usuario
) => {
  const [rows] = await pool.query(
    `
      SELECT
        ue.id_usuario_empresa,

        ue.id_empresa,
        e.nombre_empresa,
        e.logo,
        e.logo_public_id,

        ue.id_rol,
        r.rol,

        CAST(
          ue.es_principal AS UNSIGNED
        ) AS es_principal,

        CAST(
          ue.estado AS UNSIGNED
        ) AS estado_asignacion,

        CAST(
          e.estado AS UNSIGNED
        ) AS estado_empresa,

        CAST(
          r.estado AS UNSIGNED
        ) AS estado_rol

      FROM tb_usuario_empresas ue

      INNER JOIN tb_empresas e
        ON e.id_empresa =
          ue.id_empresa

      INNER JOIN tb_roles r
        ON r.id_rol =
          ue.id_rol

      WHERE
        ue.id_usuario = ?

        AND ue.estado = 1
        AND e.estado = 1
        AND r.estado = 1

      ORDER BY
        ue.es_principal DESC,
        e.nombre_empresa ASC
    `,
    [id_usuario]
  );

  return rows;
};


// ======================================================
// OBTENER SESIÓN DEL USUARIO PARA UNA EMPRESA
// ======================================================

const obtenerUsuarioSesion = async (
  id_usuario,
  id_empresa
) => {
  const [rows] = await pool.query(
    `
      SELECT
        u.id_usuario,

        u.nombres,
        u.email,
        u.celular,
        u.password_user,

        u.foto,
        u.foto_public_id,

        ue.id_usuario_empresa,
        ue.id_empresa,
        ue.id_rol,

        CAST(
          ue.es_principal AS UNSIGNED
        ) AS es_principal,

        CAST(
          ue.estado AS UNSIGNED
        ) AS estado_asignacion,

        e.nombre_empresa,
        e.logo,
        e.logo_public_id,

        r.rol,

        CAST(
          u.estado AS UNSIGNED
        ) AS estado,

        CAST(
          e.estado AS UNSIGNED
        ) AS estado_empresa,

        CAST(
          r.estado AS UNSIGNED
        ) AS estado_rol

      FROM tb_usuarios u

      INNER JOIN tb_usuario_empresas ue
        ON ue.id_usuario =
          u.id_usuario

      INNER JOIN tb_empresas e
        ON e.id_empresa =
          ue.id_empresa

      INNER JOIN tb_roles r
        ON r.id_rol =
          ue.id_rol

      WHERE
        u.id_usuario = ?
        AND ue.id_empresa = ?

      LIMIT 1
    `,
    [
      id_usuario,
      id_empresa,
    ]
  );

  return rows[0] || null;
};


// ======================================================
// EMPRESA PRINCIPAL DEL USUARIO
// ======================================================

const obtenerEmpresaInicial = async (
  id_usuario
) => {
  const empresas =
    await obtenerEmpresasUsuario(
      id_usuario
    );

  if (empresas.length === 0) {
    return null;
  }

  const principal =
    empresas.find(
      (empresa) =>
        Number(
          empresa.es_principal
        ) === 1
    );

  // Si por algún motivo no existe una
  // principal, usamos la primera activa.
  return principal || empresas[0];
};


// ======================================================
// PERMISOS Y MÓDULOS DEL ROL ACTIVO
// ======================================================

const obtenerPermisosYModulos = async (
  id_rol
) => {
  const [permisosRows] =
    await pool.query(
      `
        SELECT
          p.permiso

        FROM tb_roles_permisos rp

        INNER JOIN tb_permisos p
          ON p.id_permiso =
            rp.id_permiso

        WHERE
          rp.id_rol = ?

          AND rp.estado = 1
          AND p.estado = 1
      `,
      [id_rol]
    );

  const permisos =
    permisosRows.map(
      (item) =>
        item.permiso
    );


  const [modulosRows] =
    await pool.query(
      `
        SELECT DISTINCT
          m.id_modulo,
          m.nombre_modulo,
          m.ruta,
          m.icono,
          m.orden

        FROM tb_roles_permisos rp

        INNER JOIN tb_permisos p
          ON p.id_permiso =
            rp.id_permiso

        INNER JOIN tb_modulos m
          ON m.id_modulo =
            p.id_modulo

        WHERE
          rp.id_rol = ?

          AND rp.estado = 1
          AND p.estado = 1
          AND m.estado = 1

          AND p.permiso
            LIKE '%.ver'

        ORDER BY
          m.orden ASC
      `,
      [id_rol]
    );


  return {
    permisos,
    modulos: modulosRows,
  };
};


// ======================================================
// VALIDAR ESTADOS
// ======================================================

const validarEstados = (
  usuario,
  res
) => {

  if (!usuario) {
    res.status(401).json({
      ok: false,
      code:
        "USUARIO_NO_VALIDO",
      message:
        "Usuario no válido",
    });

    return false;
  }


  if (
    Number(usuario.estado) !== 1
  ) {
    res.status(403).json({
      ok: false,
      code:
        "USUARIO_INACTIVO",
      message:
        "Usuario inactivo. Contacte al administrador",
    });

    return false;
  }


  if (
    Number(
      usuario.estado_asignacion
    ) !== 1
  ) {
    res.status(403).json({
      ok: false,
      code:
        "ACCESO_EMPRESA_INACTIVO",
      message:
        "El usuario no tiene acceso activo a esta empresa",
    });

    return false;
  }


  if (
    Number(
      usuario.estado_empresa
    ) !== 1
  ) {
    res.status(403).json({
      ok: false,
      code:
        "EMPRESA_INACTIVA",
      message:
        "La empresa se encuentra inactiva",
    });

    return false;
  }


  if (
    Number(
      usuario.estado_rol
    ) !== 1
  ) {
    res.status(403).json({
      ok: false,
      code:
        "ROL_INACTIVO",
      message:
        "El rol se encuentra inactivo",
    });

    return false;
  }


  return true;
};


// ======================================================
// CONSTRUIR RESPONSE DEL USUARIO
// ======================================================

const construirUsuarioResponse =
  async (
    usuario
  ) => {

    const {
      permisos,
      modulos,
    } =
      await obtenerPermisosYModulos(
        usuario.id_rol
      );


    const empresas =
      await obtenerEmpresasUsuario(
        usuario.id_usuario
      );


    return {
      id_usuario:
        usuario.id_usuario,

      nombres:
        usuario.nombres,

      email:
        usuario.email,

      celular:
        usuario.celular,

      foto:
        usuario.foto,

      foto_public_id:
        usuario.foto_public_id,


      // ==============================
      // EMPRESA ACTIVA
      // ==============================

      id_empresa:
        usuario.id_empresa,

      nombre_empresa:
        usuario.nombre_empresa,

      logo_empresa:
        usuario.logo,

      logo_public_id:
        usuario.logo_public_id,


      // ==============================
      // ROL ACTUAL
      // ==============================

      id_rol:
        usuario.id_rol,

      rol:
        usuario.rol,


      // ==============================
      // ESTADOS
      // ==============================

      estado:
        usuario.estado,

      estado_empresa:
        usuario.estado_empresa,

      estado_rol:
        usuario.estado_rol,

      estado_asignacion:
        usuario.estado_asignacion,


      // ==============================
      // AUTORIZACIÓN
      // ==============================

      permisos,

      modulos,


      // ==============================
      // EMPRESAS DISPONIBLES
      // ==============================

      empresas: empresas.map(
        (empresa) => ({
          id_usuario_empresa:
            empresa.id_usuario_empresa,

          id_empresa:
            empresa.id_empresa,

          nombre_empresa:
            empresa.nombre_empresa,

          logo:
            empresa.logo,

          logo_public_id:
            empresa.logo_public_id,

          id_rol:
            empresa.id_rol,

          rol:
            empresa.rol,

          es_principal:
            empresa.es_principal,
        })
      ),
    };
  };


// ======================================================
// LOGIN
// ======================================================

const login = async (
  req,
  res
) => {

  try {

    const {
      email,
      password,
    } = req.body;


    if (
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          message:
            "Email y contraseña son obligatorios",
        });
    }


    // ==================================================
    // BUSCAR USUARIO
    // ==================================================

    const [rows] =
      await pool.query(
        `
          SELECT
            id_usuario

          FROM tb_usuarios

          WHERE email = ?

          LIMIT 1
        `,
        [email]
      );


    if (
      rows.length === 0
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          code:
            "INVALID_CREDENTIALS",
          message:
            "Usuario o contraseña incorrectos",
        });
    }


    // ==================================================
    // USUARIO BASE
    // ==================================================

    const usuarioBase =
      await obtenerUsuarioBase(
        rows[0].id_usuario
      );


    if (
      !usuarioBase ||
      Number(
        usuarioBase.estado
      ) !== 1
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          code:
            "USUARIO_INACTIVO",
          message:
            "Usuario inactivo. Contacte al administrador",
        });
    }


    // ==================================================
    // PASSWORD
    // ==================================================

    let passwordValida = false;


    if (
      usuarioBase
        .password_user
        ?.startsWith("$2")
    ) {

      passwordValida =
        await bcrypt.compare(
          password,
          usuarioBase.password_user
        );

    } else {

      passwordValida =
        usuarioBase.password_user ===
        password;

    }


    if (!passwordValida) {
      return res
        .status(401)
        .json({
          ok: false,
          code:
            "INVALID_CREDENTIALS",
          message:
            "Usuario o contraseña incorrectos",
        });
    }


    // ==================================================
    // EMPRESA PRINCIPAL / INICIAL
    // ==================================================

    const empresaInicial =
      await obtenerEmpresaInicial(
        usuarioBase.id_usuario
      );


    if (!empresaInicial) {
      return res
        .status(403)
        .json({
          ok: false,
          code:
            "SIN_EMPRESAS_ASIGNADAS",
          message:
            "El usuario no tiene empresas asignadas",
        });
    }


    // ==================================================
    // CONTEXTO COMPLETO
    // ==================================================

    const usuario =
      await obtenerUsuarioSesion(
        usuarioBase.id_usuario,
        empresaInicial.id_empresa
      );


    if (
      !validarEstados(
        usuario,
        res
      )
    ) {
      return;
    }


    // ==================================================
    // JWT
    // ==================================================

    const payload = {
      id_usuario:
        usuario.id_usuario,

      id_empresa:
        usuario.id_empresa,

      id_rol:
        usuario.id_rol,
    };


    const token =
      generarJWT(payload);


    await pool.query(
      `
        UPDATE tb_usuarios
        SET token = ?
        WHERE id_usuario = ?
      `,
      [
        token,
        usuario.id_usuario,
      ]
    );


    // ==================================================
    // LOG
    // ==================================================

    await registrarLog({
      req,

      usuarioManual:
        usuario,

      modulo:
        "Auth",

      accion:
        "LOGIN",

      descripcion:
        `Inicio de sesión correcto: ${usuario.email} - Empresa: ${usuario.nombre_empresa}`,
    });


    // ==================================================
    // RESPONSE
    // ==================================================

    const usuarioResponse =
      await construirUsuarioResponse(
        usuario
      );


    return res.json({
      ok: true,

      token,

      usuario:
        usuarioResponse,
    });

  } catch (error) {

    console.error(
      "ERROR LOGIN:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,
        code:
          "ERROR_AUTH",

        message:
          "Error en login",

        error:
          error.message,
      });
  }
};


// ======================================================
// CAMBIAR EMPRESA ACTIVA
// ======================================================

const cambiarEmpresa = async (
  req,
  res
) => {

  try {

    const id_usuario =
      Number(
        req.usuario.id_usuario
      );


    const id_empresa =
      Number(
        req.body.id_empresa
      );


    if (
      !Number.isInteger(
        id_empresa
      ) ||
      id_empresa <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          code:
            "EMPRESA_INVALIDA",
          message:
            "Seleccione una empresa válida",
        });
    }


    // ==================================================
    // COMPROBAR QUE EL USUARIO TIENE ACCESO
    // ==================================================

    const usuario =
      await obtenerUsuarioSesion(
        id_usuario,
        id_empresa
      );


    if (!usuario) {
      return res
        .status(403)
        .json({
          ok: false,
          code:
            "EMPRESA_NO_AUTORIZADA",
          message:
            "No tiene acceso a esta empresa",
        });
    }


    if (
      !validarEstados(
        usuario,
        res
      )
    ) {
      return;
    }


    // ==================================================
    // NUEVO JWT
    // ==================================================

    const payload = {
      id_usuario:
        usuario.id_usuario,

      id_empresa:
        usuario.id_empresa,

      id_rol:
        usuario.id_rol,
    };


    const token =
      generarJWT(payload);


    await pool.query(
      `
        UPDATE tb_usuarios
        SET token = ?
        WHERE id_usuario = ?
      `,
      [
        token,
        usuario.id_usuario,
      ]
    );


    // ==================================================
    // RESPONSE ACTUALIZADO
    // ==================================================

    const usuarioResponse =
      await construirUsuarioResponse(
        usuario
      );


    await registrarLog({
      req,

      usuarioManual:
        usuario,

      modulo:
        "Auth",

      accion:
        "CAMBIO_EMPRESA",

      descripcion:
        `Cambio de empresa activa a ${usuario.nombre_empresa}`,
    });


    return res.json({
      ok: true,

      message:
        "Empresa cambiada correctamente",

      token,

      usuario:
        usuarioResponse,
    });

  } catch (error) {

    console.error(
      "ERROR CAMBIO EMPRESA:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        code:
          "ERROR_CAMBIO_EMPRESA",

        message:
          "No se pudo cambiar de empresa",

        error:
          error.message,
      });
  }
};


// ======================================================
// ME
// Debe respetar la empresa que viene en el JWT.
// ======================================================

const me = async (
  req,
  res
) => {

  try {

    const id_usuario =
      Number(
        req.usuario.id_usuario
      );


    const id_empresa =
      Number(
        req.usuario.id_empresa
      );


    if (
      !id_usuario ||
      !id_empresa
    ) {
      return res
        .status(401)
        .json({
          ok: false,

          code:
            "SESION_INVALIDA",

          message:
            "Sesión inválida",
        });
    }


    const usuario =
      await obtenerUsuarioSesion(
        id_usuario,
        id_empresa
      );


    if (
      !validarEstados(
        usuario,
        res
      )
    ) {
      return;
    }


    const usuarioResponse =
      await construirUsuarioResponse(
        usuario
      );


    return res.json({
      ok: true,

      usuario:
        usuarioResponse,
    });

  } catch (error) {

    console.error(
      "ERROR ME:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        code:
          "ERROR_AUTH",

        message:
          "Error obteniendo sesión",
      });
  }
};


// ======================================================
// LOGOUT
// ======================================================

const logout = async (
  req,
  res
) => {

  try {

    const id_usuario =
      req.usuario.id_usuario;


    await pool.query(
      `
        UPDATE tb_usuarios
        SET token = NULL
        WHERE id_usuario = ?
      `,
      [id_usuario]
    );


    await registrarLog({
      req,

      modulo:
        "Auth",

      accion:
        "LOGOUT",

      descripcion:
        "Cierre de sesión correcto",
    });


    return res.json({
      ok: true,

      message:
        "Sesión cerrada correctamente",
    });

  } catch (error) {

    console.error(
      "ERROR LOGOUT:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al cerrar sesión",

        error:
          error.message,
      });
  }
};


// ======================================================
// REGISTER
// Durante la transición seguimos llenando también
// tb_usuarios.id_empresa y tb_usuarios.id_rol.
// ======================================================

const register = async (
  req,
  res
) => {

  const connection =
    await pool.getConnection();


  try {

    const {
      id_empresa,
      nombres,
      email,
      celular,
      password_user,
      id_rol,
      estado = 1,
    } = req.body;


    if (
      !id_empresa ||
      !nombres ||
      !email ||
      !password_user ||
      !id_rol
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          message:
            "Empresa, nombre, email, contraseña y rol son obligatorios",
        });
    }


    const [existe] =
      await connection.query(
        `
          SELECT
            id_usuario

          FROM tb_usuarios

          WHERE email = ?

          LIMIT 1
        `,
        [email]
      );


    if (
      existe.length > 0
    ) {
      return res
        .status(409)
        .json({
          ok: false,

          message:
            "El email ya está registrado",
        });
    }


    await connection.beginTransaction();


    const passwordHash =
      await bcrypt.hash(
        password_user,
        10
      );


    // ==================================================
    // CREAR USUARIO
    // Compatibilidad temporal con columnas antiguas
    // ==================================================

    const [result] =
      await connection.query(
        `
          INSERT INTO tb_usuarios
          (
            id_empresa,
            nombres,
            email,
            celular,
            password_user,
            id_rol,
            estado,
            fyh_creacion
          )
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?, NOW()
          )
        `,
        [
          Number(id_empresa),

          nombres.trim(),

          email
            .trim()
            .toLowerCase(),

          celular || null,

          passwordHash,

          Number(id_rol),

          Number(estado),
        ]
      );


    const id_usuario =
      result.insertId;


    // ==================================================
    // CREAR ASIGNACIÓN EMPRESA
    // ==================================================

    await connection.query(
      `
        INSERT INTO tb_usuario_empresas
        (
          id_usuario,
          id_empresa,
          id_rol,
          es_principal,
          estado,
          creado_por,
          fecha_asignacion
        )
        VALUES
        (
          ?, ?, ?, 1, 1, ?, NOW()
        )
      `,
      [
        id_usuario,

        Number(id_empresa),

        Number(id_rol),

        req.usuario
          ?.id_usuario ||
          id_usuario,
      ]
    );


    await connection.commit();


    return res
      .status(201)
      .json({
        ok: true,

        message:
          "Usuario registrado correctamente",

        id_usuario,
      });

  } catch (error) {

    await connection.rollback();


    console.error(
      "ERROR REGISTER:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "Error al registrar usuario",

        error:
          error.message,
      });

  } finally {

    connection.release();
  }
};


// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  login,
  register,
  me,
  logout,
  cambiarEmpresa,
};