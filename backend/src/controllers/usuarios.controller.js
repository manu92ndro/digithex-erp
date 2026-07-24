const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarLog } = require('../helpers/logs');

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const esRolAdmin = (rol = '') => {
  const r = rol.toUpperCase();
  return r === 'ADMINISTRADOR' || r === 'ADMIN';
};

const esRolSuperAdmin = (rol = '') => {
  return rol.toUpperCase() === 'SUPER ADMIN';
};

const validarInactivacionUsuario = async ({ req, id_usuario, estadoNuevo }) => {
  const [rows] = await pool.query(
    `
    SELECT
      u.id_usuario,
      u.id_empresa,
      u.estado,
      u.nombres,
      r.rol
    FROM tb_usuarios u
    LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = ?
    LIMIT 1
    `,
    [id_usuario]
  );

  if (rows.length === 0) {
    return {
      ok: false,
      status: 404,
      message: 'Usuario no encontrado'
    };
  }

  const usuario = rows[0];

  if (Number(estadoNuevo) !== 0) {
    return {
      ok: true,
      usuario
    };
  }

  if (Number(id_usuario) === Number(req.usuario.id_usuario)) {
    return {
      ok: false,
      status: 400,
      message: 'No puedes inactivar tu propio usuario'
    };
  }

  if (esRolSuperAdmin(usuario.rol)) {
    return {
      ok: false,
      status: 403,
      message: 'No se puede inactivar un usuario SUPER ADMIN'
    };
  }

  if (esRolAdmin(usuario.rol) && !esRolSuperAdmin(req.usuario.rol)) {
    const [adminsActivos] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM tb_usuarios u
      INNER JOIN tb_roles r ON r.id_rol = u.id_rol
      WHERE u.id_empresa = ?
        AND u.estado = 1
        AND r.estado = 1
        AND (
          UPPER(r.rol) = 'ADMINISTRADOR'
          OR UPPER(r.rol) = 'ADMIN'
        )
      `,
      [usuario.id_empresa]
    );

    const totalAdmins = Number(adminsActivos[0]?.total || 0);

    if (totalAdmins <= 1) {
      return {
        ok: false,
        status: 400,
        message: 'No puedes inactivar el último administrador activo de la empresa'
      };
    }
  }

  return {
    ok: true,
    usuario
  };
};

// LISTAR USUARIOS
const getUsuarios = async (req, res) => {
  try {
    const esSuperAdmin = req.usuario.rol === "SUPER ADMIN";
    const id_empresa = req.usuario.id_empresa;

    const query = `
      SELECT
        u.id_usuario,
        u.id_empresa,
        e.nombre_empresa,
        u.id_rol,
        r.rol,
        u.nombres,
        u.email,
        u.celular,
        CAST(u.estado AS UNSIGNED) AS estado,
        u.fyh_creacion
      FROM tb_usuarios u
      LEFT JOIN tb_empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
      ${esSuperAdmin ? "" : "WHERE u.id_empresa = ?"}
      ORDER BY u.id_usuario DESC
    `;

    const params = esSuperAdmin ? [] : [id_empresa];

    const [rows] = await pool.query(query, params);

    res.json({
      ok: true,
      usuarios: rows
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Error al listar usuarios",
      error: error.message
    });
  }
};

// BUSCAR USUARIO POR ID
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT
        u.id_usuario,
        u.id_empresa,
        e.nombre_empresa,
        u.id_rol,
        r.rol,
        u.nombres,
        u.email,
        u.celular,
        CAST(u.estado AS UNSIGNED) AS estado
      FROM tb_usuarios u
      LEFT JOIN tb_empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ?
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      ok: true,
      usuario: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al buscar usuario',
      error: error.message
    });
  }
};

// CREAR USUARIO
const createUsuario = async (req, res) => {
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

    if (!id_empresa || !id_rol || !nombres || !email || !password_user) {
      return res.status(400).json({
        ok: false,
        message: 'Empresa, rol, nombres, email y contraseña son obligatorios'
      });
    }

    const [existe] = await pool.query(
      'SELECT id_usuario FROM tb_usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un usuario con ese email'
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

    await registrarLog({
      req,
      modulo: 'Usuarios',
      accion: 'CREAR',
      descripcion: `Creó el usuario ${nombres} con email ${email}`
    });

    res.status(201).json({
      ok: true,
      message: 'Usuario creado correctamente',
      id_usuario: result.insertId
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
};

// ACTUALIZAR USUARIO
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      id_empresa,
      nombres,
      email,
      celular,
      password_user,
      id_rol,
      estado
    } = req.body;

    if (!id_empresa || !id_rol || !nombres || !email) {
      return res.status(400).json({
        ok: false,
        message: 'Empresa, rol, nombres y email son obligatorios'
      });
    }

    const [existe] = await pool.query(
      `
      SELECT id_usuario
      FROM tb_usuarios
      WHERE email = ? AND id_usuario != ?
      LIMIT 1
      `,
      [email, id]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ese email ya está usado por otro usuario'
      });
    }

    const validacion = await validarInactivacionUsuario({
      req,
      id_usuario: id,
      estadoNuevo: estado
    });

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        ok: false,
        message: validacion.message
      });
    }

    if (password_user && password_user.trim() !== '') {
      const passwordHash = await bcrypt.hash(password_user, 10);

      await pool.query(`
        UPDATE tb_usuarios
        SET
          id_empresa = ?,
          nombres = ?,
          email = ?,
          celular = ?,
          password_user = ?,
          id_rol = ?,
          estado = ?,
          fyh_actualizacion = NOW()
        WHERE id_usuario = ?
      `, [
        Number(id_empresa),
        nombres,
        email,
        celular || null,
        passwordHash,
        Number(id_rol),
        Number(estado),
        id
      ]);

    } else {
      await pool.query(`
        UPDATE tb_usuarios
        SET
          id_empresa = ?,
          nombres = ?,
          email = ?,
          celular = ?,
          id_rol = ?,
          estado = ?,
          fyh_actualizacion = NOW()
        WHERE id_usuario = ?
      `, [
        Number(id_empresa),
        nombres,
        email,
        celular || null,
        Number(id_rol),
        Number(estado),
        id
      ]);
    }

    await registrarLog({
      req,
      modulo: 'Usuarios',
      accion: 'ACTUALIZAR',
      descripcion: `Actualizó el usuario ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Usuario actualizado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// DESACTIVAR USUARIO
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const validacion = await validarInactivacionUsuario({
      req,
      id_usuario: id,
      estadoNuevo: 0
    });

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        ok: false,
        message: validacion.message
      });
    }

    const usuario = validacion.usuario;

    await pool.query(
      `
      UPDATE tb_usuarios
      SET
        estado = 0,
        fyh_actualizacion = NOW()
      WHERE id_usuario = ?
      `,
      [id]
    );

    await registrarLog({
      req,
      modulo: 'Usuarios',
      accion: 'DESACTIVAR',
      descripcion: `Desactivó el usuario ${usuario.nombres} ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Usuario desactivado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al desactivar usuario',
      error: error.message
    });
  }
};

// MI PERFIL
const getMiPerfil = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const [rows] = await pool.query(`
      SELECT
        u.id_usuario,
        u.id_empresa,
        e.nombre_empresa,
        u.id_rol,
        r.rol,
        u.nombres,
        u.email,
        u.celular,
        u.foto,
        CAST(u.estado AS UNSIGNED) AS estado
      FROM tb_usuarios u
      LEFT JOIN tb_empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN tb_roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ?
      LIMIT 1
    `, [id_usuario]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      ok: true,
      usuario: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

// ACTUALIZAR MI PERFIL
const updateMiPerfil = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const {
      nombres,
      celular
    } = req.body;

    if (!nombres) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre es obligatorio'
      });
    }

    await pool.query(`
      UPDATE tb_usuarios
      SET
        nombres = ?,
        celular = ?,
        fyh_actualizacion = NOW()
      WHERE id_usuario = ?
    `, [
      nombres,
      celular || null,
      id_usuario
    ]);

    await registrarLog({
      req,
      modulo: 'Perfil Usuario',
      accion: 'ACTUALIZAR',
      descripcion: 'Actualizó su perfil de usuario'
    });

    res.json({
      ok: true,
      message: 'Perfil actualizado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

// CAMBIAR CONTRASEÑA
const cambiarPassword = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    const {
      password_actual,
      password_nuevo,
      password_confirmar
    } = req.body;

    if (!password_actual || !password_nuevo || !password_confirmar) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    if (password_nuevo !== password_confirmar) {
      return res.status(400).json({
        ok: false,
        message: 'Las contraseñas no coinciden'
      });
    }

    const [rows] = await pool.query(
      'SELECT password_user FROM tb_usuarios WHERE id_usuario = ? LIMIT 1',
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = rows[0];

    let passwordValida = false;

    if (usuario.password_user?.startsWith('$2')) {
      passwordValida = await bcrypt.compare(
        password_actual,
        usuario.password_user
      );
    } else {
      passwordValida = usuario.password_user === password_actual;
    }

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    const passwordHash = await bcrypt.hash(password_nuevo, 10);

    await pool.query(
      `
      UPDATE tb_usuarios
      SET password_user = ?,
          fyh_actualizacion = NOW()
      WHERE id_usuario = ?
      `,
      [passwordHash, id_usuario]
    );

    await registrarLog({
      req,
      modulo: 'Perfil Usuario',
      accion: 'CAMBIAR_PASSWORD',
      descripcion: 'Cambió su contraseña'
    });

    res.json({
      ok: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

// SUBIR FOTO DE MI PERFIL
const updateFotoMiPerfil = async (req, res) => {
  try {
    const id_usuario = req.usuario.id_usuario;

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Debe seleccionar una foto"
      });
    }

    // Nombre del nuevo archivo
    const nombreFoto = `usuario-${Date.now()}.webp`;

    const rutaDestino = path.join(
      process.cwd(),
      "uploads/usuarios",
      nombreFoto
    );

    // Optimizar imagen
    await sharp(req.file.path)
      .rotate()
      .resize({
        width: 1000,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: 85
      })
      .toFile(rutaDestino);

    // Eliminar imagen temporal
    fs.unlinkSync(req.file.path);

    // Obtener foto anterior
    const [[usuario]] = await pool.query(
      `
      SELECT foto
      FROM tb_usuarios
      WHERE id_usuario = ?
      `,
      [id_usuario]
    );

    // Eliminar foto anterior (excepto si no existe)
    if (usuario?.foto) {
      const rutaAnterior = path.join(
        process.cwd(),
        "uploads/usuarios",
        usuario.foto
      );

      if (fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior);
      }
    }

    // Actualizar base de datos
    await pool.query(
      `
      UPDATE tb_usuarios
      SET
        foto = ?,
        fyh_actualizacion = NOW()
      WHERE id_usuario = ?
      `,
      [
        nombreFoto,
        id_usuario
      ]
    );

    await registrarLog({
      req,
      modulo: "Perfil Usuario",
      accion: "ACTUALIZAR_FOTO",
      descripcion: "Actualizó su foto de perfil"
    });

    res.json({
      ok: true,
      message: "Foto actualizada correctamente",
      foto: nombreFoto
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al actualizar foto",
      error: error.message
    });
  }
};

module.exports = {
  cambiarPassword,
  getMiPerfil,
  updateMiPerfil,
  updateFotoMiPerfil,
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};