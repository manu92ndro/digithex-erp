const pool = require('../config/db');
const { registrarLog } = require('../helpers/logs');

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const esSuperAdmin = (req) => {
  return req.usuario?.rol?.toUpperCase() === 'SUPER ADMIN';
};

const validarEmpresaDuplicada = async ({
  nombre_empresa,
  email,
  id_empresa = null
}) => {
  const condiciones = [];
  const params = [];

  if (nombre_empresa) {
    condiciones.push('UPPER(TRIM(nombre_empresa)) = UPPER(TRIM(?))');
    params.push(nombre_empresa);
  }

  if (email) {
    condiciones.push('UPPER(TRIM(email)) = UPPER(TRIM(?))');
    params.push(email);
  }

  if (condiciones.length === 0) {
    return null;
  }

  let sql = `
    SELECT id_empresa, nombre_empresa, email
    FROM tb_empresas
    WHERE (${condiciones.join(' OR ')})
  `;

  if (id_empresa) {
    sql += ' AND id_empresa != ?';
    params.push(id_empresa);
  }

  sql += ' LIMIT 1';

  const [rows] = await pool.query(sql, params);

  if (rows.length === 0) return null;

  const empresa = rows[0];

  if (
    nombre_empresa &&
    empresa.nombre_empresa?.trim().toUpperCase() === nombre_empresa.trim().toUpperCase()
  ) {
    return 'Ya existe una empresa con ese nombre';
  }

  if (
    email &&
    empresa.email &&
    empresa.email.trim().toUpperCase() === email.trim().toUpperCase()
  ) {
    return 'Ya existe una empresa con ese email';
  }

  return 'Ya existe una empresa con esos datos';
};

const getEmpresas = async (req, res) => {
  try {
    const superAdmin = esSuperAdmin(req);
    const id_empresa = req.usuario.id_empresa;

    const query = `
      SELECT *
      FROM tb_empresas
      ${superAdmin ? "" : "WHERE id_empresa = ?"}
      ORDER BY id_empresa DESC
    `;

    const params = superAdmin ? [] : [id_empresa];

    const [rows] = await pool.query(query, params);

    res.json({
      ok: true,
      empresas: rows
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Error al listar empresas",
      error: error.message
    });
  }
};

const getEmpresaById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!esSuperAdmin(req) && Number(id) !== Number(req.usuario.id_empresa)) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para ver esta empresa'
      });
    }

    const [rows] = await pool.query(`
      SELECT
        id_empresa,
        nombre_empresa,
        email,
        telefono,
        telefono_secundario,
        website,
        direccion,
        logo,
        CAST(estado AS UNSIGNED) AS estado,
        fyh_creacion,
        fyh_actualizacion
      FROM tb_empresas
      WHERE id_empresa = ?
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Empresa no encontrada'
      });
    }

    res.json({
      ok: true,
      empresa: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al buscar empresa',
      error: error.message
    });
  }
};

const createEmpresa = async (req, res) => {
  try {
    const {
      nombre_empresa,
      email,
      telefono,
      telefono_secundario, // ✅ NUEVO: ya estaba en el body
      website, // ✅ NUEVO: ya estaba en el body
      direccion,
      estado = 1
    } = req.body;

    if (!esSuperAdmin(req)) {
      return res.status(403).json({
        ok: false,
        message: 'Solo SUPER ADMIN puede crear empresas'
      });
    }

    if (!nombre_empresa) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre de la empresa es obligatorio'
      });
    }

    const duplicado = await validarEmpresaDuplicada({
      nombre_empresa,
      email
    });

    if (duplicado) {
      return res.status(409).json({
        ok: false,
        message: duplicado
      });
    }

    const [result] = await pool.query(`
      INSERT INTO tb_empresas
      (
        nombre_empresa,
        email,
        telefono,
        telefono_secundario,
        website,
        direccion,
        estado,
        fyh_creacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      nombre_empresa.trim(),
      email ? email.trim() : null,
      telefono || null,
      telefono_secundario || null, // ✅ NUEVO: agregado
      website || null, // ✅ NUEVO: agregado
      direccion || null,
      Number(estado)
    ]);

    await registrarLog({
      req,
      modulo: 'Empresas',
      accion: 'CREAR',
      descripcion: `Creó la empresa ${nombre_empresa}`
    });

    res.status(201).json({
      ok: true,
      message: 'Empresa creada correctamente',
      id_empresa: result.insertId
    });

  } catch (error) {
    console.error("Error creando empresa:", error);

    res.status(500).json({
      ok: false,
      message: 'Error al crear empresa',
      error: error.message
    });
  }
};

const updateEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre_empresa,
      email,
      telefono,
      telefono_secundario, // ✅ NUEVO: agregado
      website, // ✅ NUEVO: agregado
      direccion,
      estado = 1
    } = req.body;

    if (!esSuperAdmin(req) && Number(id) !== Number(req.usuario.id_empresa)) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para actualizar esta empresa'
      });
    }

    if (!nombre_empresa) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre de la empresa es obligatorio'
      });
    }

    const duplicado = await validarEmpresaDuplicada({
      nombre_empresa,
      email,
      id_empresa: id
    });

    if (duplicado) {
      return res.status(409).json({
        ok: false,
        message: duplicado
      });
    }

    const [result] = await pool.query(`
      UPDATE tb_empresas
      SET
        nombre_empresa = ?,
        email = ?,
        telefono = ?,
        telefono_secundario = ?, -- ✅ NUEVO: agregado
        website = ?, -- ✅ NUEVO: agregado
        direccion = ?,
        estado = ?,
        fyh_actualizacion = NOW()
      WHERE id_empresa = ?
    `, [
      nombre_empresa.trim(),
      email ? email.trim() : null,
      telefono || null,
      telefono_secundario || null, // ✅ NUEVO: agregado
      website || null, // ✅ NUEVO: agregado
      direccion || null,
      Number(estado),
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Empresa no encontrada'
      });
    }

    await registrarLog({
      req,
      modulo: 'Empresas',
      accion: 'ACTUALIZAR',
      descripcion: `Actualizó la empresa ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Empresa actualizada correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al actualizar empresa',
      error: error.message
    });
  }
};

const deleteEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    if (!esSuperAdmin(req)) {
      return res.status(403).json({
        ok: false,
        message: 'Solo SUPER ADMIN puede desactivar empresas'
      });
    }

    const [empresaRows] = await pool.query(
      `
      SELECT id_empresa, nombre_empresa, estado
      FROM tb_empresas
      WHERE id_empresa = ?
      LIMIT 1
      `,
      [id]
    );

    if (empresaRows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Empresa no encontrada'
      });
    }

    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM tb_usuarios WHERE id_empresa = ? AND estado = 1 LIMIT 1',
      [id]
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'No puedes desactivar esta empresa porque tiene usuarios activos'
      });
    }

    await pool.query(
      `
      UPDATE tb_empresas
      SET estado = 0,
          fyh_actualizacion = NOW()
      WHERE id_empresa = ?
      `,
      [id]
    );

    await registrarLog({
      req,
      modulo: 'Empresas',
      accion: 'DESACTIVAR',
      descripcion: `Desactivó la empresa ${empresaRows[0].nombre_empresa} ID ${id}`
    });

    res.json({
      ok: true,
      message: 'Empresa desactivada correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al desactivar empresa',
      error: error.message
    });
  }
};

const getMiEmpresa = async (req, res) => {
  try {
    const id_empresa = req.usuario.id_empresa;

    const [rows] = await pool.query(
      `SELECT 
        id_empresa, 
        nombre_empresa, 
        email, 
        telefono,
        telefono_secundario, -- ✅ NUEVO: agregado
        website, -- ✅ NUEVO: agregado
        direccion, 
        logo, 
        estado
       FROM tb_empresas
       WHERE id_empresa = ?
       LIMIT 1`,
      [id_empresa]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Empresa no encontrada'
      });
    }

    res.json({
      ok: true,
      empresa: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al obtener perfil de empresa',
      error: error.message
    });
  }
};

const updateMiEmpresa = async (req, res) => {
  try {
    const id_empresa = req.usuario.id_empresa;

    const {
      nombre_empresa,
      email,
      telefono,
      telefono_secundario, // ✅ NUEVO: agregado
      website, // ✅ NUEVO: agregado
      direccion
    } = req.body;

    if (!nombre_empresa) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre de la empresa es obligatorio'
      });
    }

    const duplicado = await validarEmpresaDuplicada({
      nombre_empresa,
      email,
      id_empresa
    });

    if (duplicado) {
      return res.status(409).json({
        ok: false,
        message: duplicado
      });
    }

    await pool.query(
      `UPDATE tb_empresas
       SET 
        nombre_empresa = ?,
        email = ?,
        telefono = ?,
        telefono_secundario = ?, -- ✅ NUEVO: agregado
        website = ?, -- ✅ NUEVO: agregado
        direccion = ?,
        fyh_actualizacion = NOW()
       WHERE id_empresa = ?`,
      [
        nombre_empresa.trim(),
        email ? email.trim() : null,
        telefono || null,
        telefono_secundario || null, // ✅ NUEVO: agregado
        website || null, // ✅ NUEVO: agregado
        direccion || null,
        id_empresa
      ]
    );

    await registrarLog({
      req,
      modulo: 'Perfil Empresa',
      accion: 'ACTUALIZAR',
      descripcion: 'Actualizó el perfil de empresa'
    });

    res.json({
      ok: true,
      message: 'Perfil de empresa actualizado'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al actualizar perfil de empresa',
      error: error.message
    });
  }
};

// SUBIR LOGO DE MI EMPRESA
// SUBIR LOGO DE MI EMPRESA
const updateLogoMiEmpresa = async (req, res) => {
  try {
    const id_empresa = req.usuario.id_empresa;

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Debe seleccionar un logo"
      });
    }

    // Nombre del nuevo archivo
    const nombreLogo = `empresa-${Date.now()}.webp`;

    const rutaDestino = path.join(
      __dirname,
      "../uploads/logos",
      nombreLogo
    );

    // Optimizar imagen
    await sharp(req.file.path)
      .rotate()
      .resize({
        width: 600,
        height: 600,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: 85
      })
      .toFile(rutaDestino);

    // Eliminar archivo original
    fs.unlinkSync(req.file.path);

    // Obtener logo anterior
    const [[empresa]] = await pool.query(
      `
      SELECT logo
      FROM tb_empresas
      WHERE id_empresa = ?
      `,
      [id_empresa]
    );

    // Eliminar logo anterior
    if (empresa?.logo) {
      const rutaAnterior = path.join(
        __dirname,
        "../uploads/logos",
        empresa.logo
      );

      if (fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior);
      }
    }

    // Actualizar base de datos
    await pool.query(
      `
      UPDATE tb_empresas
      SET
        logo = ?,
        fyh_actualizacion = NOW()
      WHERE id_empresa = ?
      `,
      [nombreLogo, id_empresa]
    );

    await registrarLog({
      req,
      modulo: "Perfil Empresa",
      accion: "ACTUALIZAR_LOGO",
      descripcion: "Actualizó el logo de la empresa"
    });

    res.json({
      ok: true,
      message: "Logo actualizado correctamente",
      logo: nombreLogo
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al actualizar logo",
      error: error.message
    });
  }
};

module.exports = {
  getEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getMiEmpresa,
  updateMiEmpresa,
  updateLogoMiEmpresa
};