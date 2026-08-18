const jwt = require("jsonwebtoken");

const pool = require(
  "../shared/database/db"
);


// ======================================================
// VALIDAR JWT
// ======================================================

const validarJWT = async (
  req,
  res,
  next
) => {

  try {

    // ==================================================
    // OBTENER TOKEN
    // ==================================================

    const authHeader =
      req.headers.authorization;


    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return res
        .status(401)
        .json({
          ok: false,

          code:
            "TOKEN_NO_ENVIADO",

          message:
            "Token no proporcionado",
        });
    }


    const token =
      authHeader.split(" ")[1];


    // ==================================================
    // VERIFICAR TOKEN
    // ==================================================

    let decoded;


    try {

      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

    } catch (error) {

      return res
        .status(401)
        .json({
          ok: false,

          code:
            error.name ===
            "TokenExpiredError"
              ? "TOKEN_EXPIRADO"
              : "TOKEN_NO_VALIDO",

          message:
            error.name ===
            "TokenExpiredError"
              ? "Token expirado"
              : "Token inválido",
        });
    }


    // ==================================================
    // OBTENER CONTEXTO DEL JWT
    // ==================================================

    const id_usuario =
      Number(
        decoded.id_usuario ||
        decoded.id ||
        decoded.uid ||
        decoded.id_user ||
        decoded.usuario_id
      );


    const id_empresa =
      Number(
        decoded.id_empresa
      );


    if (
      !Number.isInteger(
        id_usuario
      ) ||
      id_usuario <= 0
    ) {

      return res
        .status(401)
        .json({
          ok: false,

          code:
            "TOKEN_NO_VALIDO",

          message:
            "Token no contiene un usuario válido",
        });
    }


    if (
      !Number.isInteger(
        id_empresa
      ) ||
      id_empresa <= 0
    ) {

      return res
        .status(401)
        .json({
          ok: false,

          code:
            "TOKEN_SIN_EMPRESA",

          message:
            "Token no contiene una empresa activa válida",
        });
    }


    // ==================================================
    // BUSCAR USUARIO + EMPRESA ASIGNADA + ROL
    // ==================================================

    const [rows] =
      await pool.query(
        `
          SELECT
            u.id_usuario,

            u.nombres,
            u.email,
            u.celular,

            u.foto,
            u.foto_public_id,

            ue.id_usuario_empresa,
            ue.id_empresa,
            ue.id_rol,

            CAST(
              ue.es_principal
              AS UNSIGNED
            ) AS es_principal,

            CAST(
              ue.estado
              AS UNSIGNED
            ) AS estado_asignacion,

            e.nombre_empresa,

            e.logo,
            e.logo_public_id,

            r.rol,

            CAST(
              u.estado
              AS UNSIGNED
            ) AS estado,

            CAST(
              e.estado
              AS UNSIGNED
            ) AS estado_empresa,

            CAST(
              r.estado
              AS UNSIGNED
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


    // ==================================================
    // VALIDAR EXISTENCIA
    // ==================================================

    if (
      rows.length === 0
    ) {

      return res
        .status(403)
        .json({
          ok: false,

          code:
            "EMPRESA_NO_AUTORIZADA",

          message:
            "El usuario no tiene acceso a esta empresa",
        });
    }


    const usuario =
      rows[0];


    // ==================================================
    // VALIDAR USUARIO
    // ==================================================

    if (
      Number(
        usuario.estado
      ) !== 1
    ) {

      return res
        .status(403)
        .json({
          ok: false,

          code:
            "USUARIO_INACTIVO",

          message:
            "Usuario inactivo",
        });
    }


    // ==================================================
    // VALIDAR ASIGNACIÓN
    // ==================================================

    if (
      Number(
        usuario.estado_asignacion
      ) !== 1
    ) {

      return res
        .status(403)
        .json({
          ok: false,

          code:
            "ACCESO_EMPRESA_INACTIVO",

          message:
            "El acceso del usuario a esta empresa está inactivo",
        });
    }


    // ==================================================
    // VALIDAR EMPRESA
    // ==================================================

    if (
      Number(
        usuario.estado_empresa
      ) !== 1
    ) {

      return res
        .status(403)
        .json({
          ok: false,

          code:
            "EMPRESA_INACTIVA",

          message:
            "Empresa inactiva",
        });
    }


    // ==================================================
    // VALIDAR ROL
    // ==================================================

    if (
      Number(
        usuario.estado_rol
      ) !== 1
    ) {

      return res
        .status(403)
        .json({
          ok: false,

          code:
            "ROL_INACTIVO",

          message:
            "Rol inactivo",
        });
    }


    // ==================================================
    // USUARIO AUTENTICADO
    //
    // IMPORTANTE:
    // id_empresa e id_rol vienen de
    // tb_usuario_empresas.
    // ==================================================

    req.usuario = {
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


      // EMPRESA ACTIVA
      id_empresa:
        usuario.id_empresa,

      nombre_empresa:
        usuario.nombre_empresa,

      logo:
        usuario.logo,

      logo_public_id:
        usuario.logo_public_id,


      // ROL EN ESTA EMPRESA
      id_rol:
        usuario.id_rol,

      rol:
        usuario.rol,


      // RELACIÓN
      id_usuario_empresa:
        usuario.id_usuario_empresa,

      es_principal:
        usuario.es_principal,


      // ESTADOS
      estado:
        usuario.estado,

      estado_empresa:
        usuario.estado_empresa,

      estado_rol:
        usuario.estado_rol,

      estado_asignacion:
        usuario.estado_asignacion,
    };


    // Dejamos disponible el token por si
    // posteriormente queremos implementar
    // revocación de sesiones.
    req.token = token;


    next();

  } catch (error) {

    console.error(
      "===== ERROR validarJWT ====="
    );

    console.error(
      "Mensaje:",
      error.message
    );

    console.error(
      "Código:",
      error.code
    );

    console.error(
      "Stack:",
      error.stack
    );


    return res
      .status(500)
      .json({
        ok: false,

        code:
          "ERROR_AUTH",

        message:
          "Error validando la sesión",
      });
  }
};


// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  validarJWT,
};