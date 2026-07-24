const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const validarJWT = async (req, res, next) => {
  console.log("=================================");
  console.log("Ruta:", req.method, req.originalUrl);
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        code: "TOKEN_NO_ENVIADO",
        message: "Token no proporcionado",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        ok: false,
        code:
          error.name === "TokenExpiredError"
            ? "TOKEN_EXPIRADO"
            : "TOKEN_NO_VALIDO",
        message:
          error.name === "TokenExpiredError"
            ? "Token expirado"
            : "Token inválido",
      });
    }

    const id_usuario =
      decoded.id_usuario ||
      decoded.id ||
      decoded.uid ||
      decoded.id_user ||
      decoded.usuario_id;

    if (!id_usuario) {
      return res.status(401).json({
        ok: false,
        code: "TOKEN_NO_VALIDO",
        message: "Token no contiene id de usuario",
      });
    }
    console.log("Antes del query");
    const [rows] = await pool.query(
      `
      SELECT
        u.id_usuario,
        u.id_empresa,
        e.nombre_empresa,
        u.nombres,
        u.email,
        u.celular,
        u.id_rol,
        r.rol,
        u.foto,
        e.logo,
        CAST(u.estado AS UNSIGNED) AS estado,
        CAST(e.estado AS UNSIGNED) AS estado_empresa,
        CAST(r.estado AS UNSIGNED) AS estado_rol
      FROM tb_usuarios u
      LEFT JOIN tb_empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ?
      LIMIT 1
      `,
      [id_usuario]
    );
    console.log("Después del query");

    if (rows.length === 0) {
      return res.status(403).json({
        ok: false,
        code: "USUARIO_NO_VALIDO",
        message: "Usuario no válido",
      });
    }

    const usuario = rows[0];

    if (Number(usuario.estado) !== 1) {
      return res.status(403).json({
        ok: false,
        code: "USUARIO_INACTIVO",
        message: "Usuario inactivo",
      });
    }

    if (Number(usuario.estado_empresa) !== 1) {
      return res.status(403).json({
        ok: false,
        code: "EMPRESA_INACTIVA",
        message: "Empresa inactiva",
      });
    }

    if (Number(usuario.estado_rol) !== 1) {
      return res.status(403).json({
        ok: false,
        code: "ROL_INACTIVO",
        message: "Rol inactivo",
      });
    }

    req.usuario = usuario;
    next();
    } catch (error) {
    console.error("===== ERROR validarJWT =====");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      ok: false,
      code: "ERROR_AUTH",
      message: error.message,
    });
  }
};

module.exports = {
  validarJWT,
};