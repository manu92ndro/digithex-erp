const db = require("../config/db");
const { registrarLog } = require("../helpers/logs");

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" || usuario?.rol_nombre === "SUPER ADMIN";

const getEmpresaFiltro = (usuario) => {
  if (esSuperAdmin(usuario)) return null;
  return usuario.id_empresa;
};

const listarDumpsters = async (req, res) => {
  try {
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `
      SELECT *
      FROM dumpsters
    `;
    const params = [];

    if (empresaFiltro) {
      sql += " WHERE id_empresa = ?";
      params.push(empresaFiltro);
    }

    sql += " ORDER BY tamano_yardas ASC, codigo ASC";

    const [dumpsters] = await db.query(sql, params);

    res.json({ ok: true, dumpsters });
  } catch (error) {
    console.error("Error al listar dumpsters:", error);
    res.status(500).json({ ok: false, msg: "Error al listar dumpsters" });
  }
};

const obtenerDumpster = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = "SELECT * FROM dumpsters WHERE id_dumpster = ?";
    const params = [id];

    if (empresaFiltro) {
      sql += " AND id_empresa = ?";
      params.push(empresaFiltro);
    }

    const [rows] = await db.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: "Dumpster no encontrado" });
    }

    res.json({ ok: true, dumpster: rows[0] });
  } catch (error) {
    console.error("Error al obtener dumpster:", error);
    res.status(500).json({ ok: false, msg: "Error al obtener dumpster" });
  }
};

const crearDumpster = async (req, res) => {
  try {
    const {
      codigo,
      tamano_yardas,
      capacidad_toneladas,
      precio_base,
      max_dias,
      precio_extra_tonelada,
      precio_extra_yarda,
      precio_extra_dia,
      estado,
    } = req.body;

    if (!codigo || !tamano_yardas || !capacidad_toneladas || !precio_base || !max_dias) {
      return res.status(400).json({
        ok: false,
        msg: "Código, tamaño, capacidad, precio base y máximo de días son obligatorios",
      });
    }

    const id_empresa = esSuperAdmin(req.usuario)
      ? req.body.id_empresa || req.usuario.id_empresa
      : req.usuario.id_empresa;

    const [duplicado] = await db.query(
      "SELECT id_dumpster FROM dumpsters WHERE id_empresa = ? AND codigo = ? LIMIT 1",
      [id_empresa, codigo]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe un dumpster con ese código en esta empresa",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO dumpsters (
        id_empresa,
        codigo,
        tamano_yardas,
        capacidad_toneladas,
        precio_base,
        max_dias,
        precio_extra_tonelada,
        precio_extra_yarda,
        precio_extra_dia,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_empresa,
        codigo,
        tamano_yardas,
        capacidad_toneladas,
        precio_base,
        max_dias,
        precio_extra_tonelada || 0,
        precio_extra_yarda || 0,
        precio_extra_dia || 0,
        estado || "disponible",
      ]
    );

    await registrarLog({
      req,
      modulo: "Dumpsters",
      accion: "CREAR",
      descripcion: `Dumpster creado: ${codigo}`,
    });

    res.status(201).json({
      ok: true,
      msg: "Dumpster creado correctamente",
      id_dumpster: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear dumpster:", error);
    res.status(500).json({ ok: false, msg: "Error al crear dumpster" });
  }
};

const actualizarDumpster = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      tamano_yardas,
      capacidad_toneladas,
      precio_base,
      max_dias,
      precio_extra_tonelada,
      precio_extra_yarda,
      precio_extra_dia,
      estado,
    } = req.body;

    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let checkSql = "SELECT * FROM dumpsters WHERE id_dumpster = ?";
    const checkParams = [id];

    if (empresaFiltro) {
      checkSql += " AND id_empresa = ?";
      checkParams.push(empresaFiltro);
    }

    const [actual] = await db.query(checkSql, checkParams);

    if (actual.length === 0) {
      return res.status(404).json({ ok: false, msg: "Dumpster no encontrado" });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_dumpster 
      FROM dumpsters 
      WHERE id_empresa = ? 
      AND codigo = ? 
      AND id_dumpster <> ?
      LIMIT 1
      `,
      [actual[0].id_empresa, codigo, id]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe otro dumpster con ese código",
      });
    }

    await db.query(
      `
      UPDATE dumpsters
      SET codigo = ?,
          tamano_yardas = ?,
          capacidad_toneladas = ?,
          precio_base = ?,
          max_dias = ?,
          precio_extra_tonelada = ?,
          precio_extra_yarda = ?,
          precio_extra_dia = ?,
          estado = ?,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_dumpster = ?
      `,
      [
        codigo,
        tamano_yardas,
        capacidad_toneladas,
        precio_base,
        max_dias,
        precio_extra_tonelada || 0,
        precio_extra_yarda || 0,
        precio_extra_dia || 0,
        estado || "disponible",
        id,
      ]
    );

    await registrarLog({
      req,
      modulo: "Dumpsters",
      accion: "ACTUALIZAR",
      descripcion: `Dumpster actualizado: ${codigo}`,
    });

    res.json({ ok: true, msg: "Dumpster actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar dumpster:", error);
    res.status(500).json({ ok: false, msg: "Error al actualizar dumpster" });
  }
};

const cambiarEstadoDumpster = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = [
      "disponible",
      "rentado",
      "mantenimiento",
      "inactivo",
    ];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, msg: "Estado inválido" });
    }

    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = "SELECT * FROM dumpsters WHERE id_dumpster = ?";
    const params = [id];

    if (empresaFiltro) {
      sql += " AND id_empresa = ?";
      params.push(empresaFiltro);
    }

    const [dumpster] = await db.query(sql, params);

    if (dumpster.length === 0) {
      return res.status(404).json({ ok: false, msg: "Dumpster no encontrado" });
    }

    await db.query(
      `
      UPDATE dumpsters
      SET estado = ?,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_dumpster = ?
      `,
      [estado, id]
    );

    await registrarLog({
      req,
      modulo: "Dumpsters",
      accion: "CAMBIAR_ESTADO",
      descripcion: `Dumpster ${dumpster[0].codigo} cambiado a ${estado}`,
    });

    res.json({ ok: true, msg: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error al cambiar estado dumpster:", error);
    res.status(500).json({ ok: false, msg: "Error al cambiar estado" });
  }
};

module.exports = {
  listarDumpsters,
  obtenerDumpster,
  crearDumpster,
  actualizarDumpster,
  cambiarEstadoDumpster,
};