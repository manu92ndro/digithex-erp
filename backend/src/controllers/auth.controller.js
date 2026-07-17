const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { registrarLog } = require('../helpers/logs');

const obtenerUsuarioSesion = async (id_usuario) => {
  const [rows] = await pool.query(`
    SELECT
      u.id_usuario,
      u.id_empresa,
      e.nombre_empresa,
      u.nombres,
      u.email,
      u.celular,
      u.password_user,
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
  `, [id_usuario]);

  return rows[0] || null;
};

const obtenerPermisosYModulos = async (id_rol) => {
  const [permisosRows] = await pool.query(`
    SELECT
      p.permiso
    FROM tb_roles_permisos rp
    INNER JOIN tb_permisos p ON p.id_permiso = rp.id_permiso
    WHERE rp.id_rol = ?
      AND rp.estado = 1
      AND p.estado = 1
  `, [id_rol]);

  const permisos = permisosRows.map((p) => p.permiso);

  const [modulosRows] = await pool.query(`
    SELECT DISTINCT
      m.id_modulo,
      m.nombre_modulo,
      m.ruta,
      m.icono,
      m.orden
    FROM tb_roles_permisos rp
    INNER JOIN tb_permisos p ON p.id_permiso = rp.id_permiso
    INNER JOIN tb_modulos m ON m.id_modulo = p.id_modulo
    WHERE rp.id_rol = ?
      AND rp.estado = 1
      AND p.estado = 1
      AND m.estado = 1
      AND p.permiso LIKE '%.ver'
    ORDER BY m.orden ASC
  `, [id_rol]);

  return {
    permisos,
    modulos: modulosRows
  };
};

const validarEstados = (usuario, res) => {
  if (!usuario) {
    res.status(401).json({
      ok: false,
      code: 'USUARIO_NO_VALIDO',
      message: 'Usuario no válido'
    });

    return false;
  }

  if (Number(usuario.estado) !== 1) {
    res.status(403).json({
      ok: false,
      code: 'USUARIO_INACTIVO',
      message: 'Usuario inactivo. Contacte al administrador'
    });

    return false;
  }

  if (Number(usuario.estado_empresa) !== 1) {
    res.status(403).json({
      ok: false,
      code: 'EMPRESA_INACTIVA',
      message: 'La empresa se encuentra inactiva'
    });

    return false;
  }

  if (Number(usuario.estado_rol) !== 1) {
    res.status(403).json({
      ok: false,
      code: 'ROL_INACTIVO',
      message: 'El rol se encuentra inactivo'
    });

    return false;
  }

  return true;
};

const construirUsuarioResponse = async (usuario) => {
  const {
    permisos,
    modulos
  } = await obtenerPermisosYModulos(usuario.id_rol);

  return {
    id_usuario: usuario.id_usuario,
    id_empresa: usuario.id_empresa,
    nombre_empresa: usuario.nombre_empresa,
    nombres: usuario.nombres,
    email: usuario.email,
    celular: usuario.celular,
    foto: usuario.foto,
    logo_empresa: usuario.logo,
    id_rol: usuario.id_rol,
    rol: usuario.rol,
    estado: usuario.estado,
    estado_empresa: usuario.estado_empresa,
    estado_rol: usuario.estado_rol,
    permisos,
    modulos
  };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    const [rows] = await pool.query(`
      SELECT
        u.id_usuario
      FROM tb_usuarios u
      WHERE u.email = ?
      LIMIT 1
    `, [email]);

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const usuario = await obtenerUsuarioSesion(rows[0].id_usuario);

    if (!validarEstados(usuario, res)) return;

    let passwordValida = false;

    if (usuario.password_user?.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, usuario.password_user);
    } else {
      passwordValida = usuario.password_user === password;
    }

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const payload = {
      id_usuario: usuario.id_usuario,
      id_empresa: usuario.id_empresa,
      id_rol: usuario.id_rol
    };

    const token = generarJWT(payload);

    await pool.query(
      'UPDATE tb_usuarios SET token = ? WHERE id_usuario = ?',
      [token, usuario.id_usuario]
    );

    await registrarLog({
      req,
      usuarioManual: usuario,
      modulo: 'Auth',
      accion: 'LOGIN',
      descripcion: `Inicio de sesión correcto: ${usuario.email}`
    });

    const usuarioResponse = await construirUsuarioResponse(usuario);

    res.json({
      ok: true,
      token,
      usuario: usuarioResponse
    });

  } catch (error) {
    console.error('ERROR LOGIN:', error);

    res.status(500).json({
      ok: false,
      message: 'Error en login',
      error: error.message
    });
  }
};

const logout = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    await pool.query(
      'UPDATE tb_usuarios SET token = NULL WHERE id_usuario = ?',
      [id_usuario]
    );

    await registrarLog({
      req,
      modulo: 'Auth',
      accion: 'LOGOUT',
      descripcion: 'Cierre de sesión correcto'
    });

    res.json({
      ok: true,
      message: 'Sesión cerrada correctamente'
    });

  } catch (error) {
    console.error('ERROR LOGOUT:', error);

    res.status(500).json({
      ok: false,
      message: 'Error al cerrar sesión',
      error: error.message
    });
  }
};

const me = async (req, res) => {
  try {
    console.log("========== ME ==========");
    console.log("req.usuario:", req.usuario);

    const id_usuario = req.usuario.id_usuario;
    console.log("ID:", id_usuario);

    const usuario = await obtenerUsuarioSesion(id_usuario);
    console.log("Usuario:", usuario);

    if (!validarEstados(usuario, res)) return;
    console.log("Estados OK");

    const usuarioResponse = await construirUsuarioResponse(usuario);
    console.log("Response OK");

    res.json({
      ok: true,
      usuario: usuarioResponse
    });

  } catch (error) {
    console.error("ERROR ME:", error);

    res.status(500).json({
      ok: false,
      message: "Error obteniendo sesión",
      error: error.message
    });
  }
};

const register = async (req, res) => {
  try {
    const {
      id_empresa,
      nombres,
      email,
      celular,
      password_user,
      id_rol,
      estado = 1
    } = req.body;

    if (!id_empresa || !nombres || !email || !password_user || !id_rol) {
      return res.status(400).json({
        ok: false,
        message: 'Empresa, nombre, email, contraseña y rol son obligatorios'
      });
    }

    const [existe] = await pool.query(
      'SELECT id_usuario FROM tb_usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'El email ya está registrado'
      });
    }

    const passwordHash = await bcrypt.hash(password_user, 10);

    const [result] = await pool.query(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      Number(id_empresa),
      nombres,
      email,
      celular || null,
      passwordHash,
      Number(id_rol),
      Number(estado)
    ]);

    res.status(201).json({
      ok: true,
      message: 'Usuario registrado correctamente',
      id_usuario: result.insertId
    });

  } catch (error) {
    console.error('ERROR REGISTER:', error);

    res.status(500).json({
      ok: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

module.exports = {
  login,
  register,
  me,
  logout
};