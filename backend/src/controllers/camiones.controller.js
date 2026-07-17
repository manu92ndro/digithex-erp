const db = require("../config/db");
const { registrarLog } = require("../helpers/logs");

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" || usuario?.rol_nombre === "SUPER ADMIN";

const getEmpresaFiltro = (usuario) => {
  if (esSuperAdmin(usuario)) return null;
  return usuario.id_empresa;
};

const listarCamiones = async (req, res) => {
  try {
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `SELECT * FROM tb_camion`;
    const params = [];

    if (empresaFiltro) {
      sql += ` WHERE id_empresa = ?`;
      params.push(empresaFiltro);
    }

    sql += ` ORDER BY nombre_camion ASC`;

    const [camiones] = await db.query(sql, params);

    res.json({ ok: true, camiones });
  } catch (error) {
    console.error("Error al listar camiones:", error);
    res.status(500).json({ ok: false, msg: "Error al listar camiones" });
  }
};

const crearCamion = async (req, res) => {
  try {
    const { nombre_camion, placa, peso_min, peso_max } = req.body;

    if (!nombre_camion || !peso_max) {
      return res.status(400).json({
        ok: false,
        msg: "Nombre del camión y peso máximo son obligatorios",
      });
    }

    const id_empresa = esSuperAdmin(req.usuario)
      ? req.body.id_empresa || req.usuario.id_empresa
      : req.usuario.id_empresa;

    const [duplicado] = await db.query(
      `SELECT id_camion FROM tb_camion WHERE id_empresa = ? AND nombre_camion = ? LIMIT 1`,
      [id_empresa, nombre_camion]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe un camión con ese nombre",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tb_camion
      (id_empresa, nombre_camion, placa, peso_min, peso_max, estado, fyh_creacion)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
      `,
      [id_empresa, nombre_camion, placa || null, peso_min || 0, peso_max]
    );

    await registrarLog({
      req,
      modulo: "Camiones",
      accion: "CREAR",
      descripcion: `Camión creado: ${nombre_camion}`,
    });

    res.status(201).json({
      ok: true,
      msg: "Camión creado correctamente",
      id_camion: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear camión:", error);
    res.status(500).json({ ok: false, msg: "Error al crear camión" });
  }
};

const actualizarCamion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_camion, placa, peso_min, peso_max } = req.body;
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `SELECT * FROM tb_camion WHERE id_camion = ?`;
    const params = [id];

    if (empresaFiltro) {
      sql += ` AND id_empresa = ?`;
      params.push(empresaFiltro);
    }

    const [camion] = await db.query(sql, params);

    if (camion.length === 0) {
      return res.status(404).json({ ok: false, msg: "Camión no encontrado" });
    }

    await db.query(
      `
      UPDATE tb_camion
      SET nombre_camion = ?,
          placa = ?,
          peso_min = ?,
          peso_max = ?,
          fyh_actualizacion = NOW()
      WHERE id_camion = ?
      `,
      [nombre_camion, placa || null, peso_min || 0, peso_max, id]
    );

    await registrarLog({
      req,
      modulo: "Camiones",
      accion: "ACTUALIZAR",
      descripcion: `Camión actualizado: ${nombre_camion}`,
    });

    res.json({ ok: true, msg: "Camión actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar camión:", error);
    res.status(500).json({ ok: false, msg: "Error al actualizar camión" });
  }
};

const cambiarEstadoCamion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (![0, 1].includes(Number(estado))) {
      return res.status(400).json({ ok: false, msg: "Estado inválido" });
    }

    await db.query(
      `
      UPDATE tb_camion
      SET estado = ?,
          fyh_actualizacion = NOW()
      WHERE id_camion = ?
      `,
      [Number(estado), id]
    );

    await registrarLog({
      req,
      modulo: "Camiones",
      accion: Number(estado) === 1 ? "ACTIVAR" : "DESACTIVAR",
      descripcion: `Camión ${Number(estado) === 1 ? "activado" : "desactivado"}`,
    });

    res.json({ ok: true, msg: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    res.status(500).json({ ok: false, msg: "Error al cambiar estado" });
  }
};

module.exports = {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
};