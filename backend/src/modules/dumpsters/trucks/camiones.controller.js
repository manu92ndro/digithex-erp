const db = require("../../../shared/database/db");

const {
  registrarLog,
} = require("../../../shared/logging/logs");

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" ||
  usuario?.rol_nombre === "SUPER ADMIN";

const getEmpresaFiltro = (usuario) => {
  if (esSuperAdmin(usuario)) {
    return null;
  }

  return usuario.id_empresa;
};

// ===============================
// LISTAR CAMIONES
// ===============================

const listarCamiones = async (req, res) => {
  try {
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `
      SELECT *
      FROM tb_camion
    `;

    const params = [];

    if (empresaFiltro) {
      sql += ` WHERE id_empresa = ?`;
      params.push(empresaFiltro);
    }

    sql += ` ORDER BY nombre_camion ASC`;

    const [camiones] = await db.query(sql, params);

    return res.json({
      ok: true,
      camiones,
    });
  } catch (error) {
    console.error("Error al listar camiones:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error al listar camiones",
    });
  }
};

// ===============================
// CREAR CAMIÓN
// ===============================

const crearCamion = async (req, res) => {
  try {
    const {
      nombre_camion,
      placa,
      peso_min,
      peso_max,
    } = req.body;

    const nombreLimpio = String(nombre_camion || "").trim();
    const placaLimpia = String(placa || "").trim() || null;

    const pesoMinimo = Number(peso_min || 0);
    const pesoMaximo = Number(peso_max);

    if (!nombreLimpio) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del camión es obligatorio",
      });
    }

    if (!Number.isFinite(pesoMaximo) || pesoMaximo <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "El peso máximo debe ser mayor que cero",
      });
    }

    if (!Number.isFinite(pesoMinimo) || pesoMinimo < 0) {
      return res.status(400).json({
        ok: false,
        msg: "El peso mínimo no puede ser negativo",
      });
    }

    if (pesoMinimo > pesoMaximo) {
      return res.status(400).json({
        ok: false,
        msg: "El peso mínimo no puede superar el peso máximo",
      });
    }

    const id_empresa = esSuperAdmin(req.usuario)
      ? Number(req.body.id_empresa || req.usuario.id_empresa)
      : Number(req.usuario.id_empresa);

    if (!id_empresa) {
      return res.status(400).json({
        ok: false,
        msg: "No se pudo determinar la empresa",
      });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_camion
      FROM tb_camion
      WHERE id_empresa = ?
        AND nombre_camion = ?
      LIMIT 1
      `,
      [id_empresa, nombreLimpio]
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
      (
        id_empresa,
        nombre_camion,
        placa,
        peso_min,
        peso_max,
        estado,
        fyh_creacion
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW())
      `,
      [
        id_empresa,
        nombreLimpio,
        placaLimpia,
        pesoMinimo,
        pesoMaximo,
      ]
    );

    await registrarLog({
      req,
      modulo: "Camiones",
      accion: "CREAR",
      descripcion: `Camión creado: ${nombreLimpio}`,
    });

    return res.status(201).json({
      ok: true,
      msg: "Camión creado correctamente",
      id_camion: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear camión:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error al crear camión",
    });
  }
};

// ===============================
// ACTUALIZAR CAMIÓN
// ===============================

const actualizarCamion = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      nombre_camion,
      placa,
      peso_min,
      peso_max,
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "ID de camión inválido",
      });
    }

    const nombreLimpio = String(nombre_camion || "").trim();
    const placaLimpia = String(placa || "").trim() || null;

    const pesoMinimo = Number(peso_min || 0);
    const pesoMaximo = Number(peso_max);

    if (!nombreLimpio) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del camión es obligatorio",
      });
    }

    if (!Number.isFinite(pesoMaximo) || pesoMaximo <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "El peso máximo debe ser mayor que cero",
      });
    }

    if (!Number.isFinite(pesoMinimo) || pesoMinimo < 0) {
      return res.status(400).json({
        ok: false,
        msg: "El peso mínimo no puede ser negativo",
      });
    }

    if (pesoMinimo > pesoMaximo) {
      return res.status(400).json({
        ok: false,
        msg: "El peso mínimo no puede superar el peso máximo",
      });
    }

    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sqlBuscar = `
      SELECT id_camion, id_empresa
      FROM tb_camion
      WHERE id_camion = ?
    `;

    const paramsBuscar = [id];

    if (empresaFiltro) {
      sqlBuscar += ` AND id_empresa = ?`;
      paramsBuscar.push(empresaFiltro);
    }

    sqlBuscar += ` LIMIT 1`;

    const [camiones] = await db.query(
      sqlBuscar,
      paramsBuscar
    );

    if (camiones.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Camión no encontrado",
      });
    }

    const camionActual = camiones[0];

    const [duplicado] = await db.query(
      `
      SELECT id_camion
      FROM tb_camion
      WHERE id_empresa = ?
        AND nombre_camion = ?
        AND id_camion <> ?
      LIMIT 1
      `,
      [
        camionActual.id_empresa,
        nombreLimpio,
        id,
      ]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe otro camión con ese nombre",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tb_camion
      SET
        nombre_camion = ?,
        placa = ?,
        peso_min = ?,
        peso_max = ?,
        fyh_actualizacion = NOW()
      WHERE id_camion = ?
        AND id_empresa = ?
      `,
      [
        nombreLimpio,
        placaLimpia,
        pesoMinimo,
        pesoMaximo,
        id,
        camionActual.id_empresa,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Camión no encontrado",
      });
    }

    await registrarLog({
      req,
      modulo: "Camiones",
      accion: "ACTUALIZAR",
      descripcion: `Camión actualizado: ${nombreLimpio}`,
    });

    return res.json({
      ok: true,
      msg: "Camión actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar camión:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error al actualizar camión",
    });
  }
};

// ===============================
// CAMBIAR ESTADO
// ===============================

const cambiarEstadoCamion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const estado = Number(req.body.estado);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "ID de camión inválido",
      });
    }

    if (![0, 1].includes(estado)) {
      return res.status(400).json({
        ok: false,
        msg: "Estado inválido",
      });
    }

    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sqlBuscar = `
      SELECT
        id_camion,
        id_empresa,
        nombre_camion,
        estado
      FROM tb_camion
      WHERE id_camion = ?
    `;

    const paramsBuscar = [id];

    if (empresaFiltro) {
      sqlBuscar += ` AND id_empresa = ?`;
      paramsBuscar.push(empresaFiltro);
    }

    sqlBuscar += ` LIMIT 1`;

    const [camiones] = await db.query(
      sqlBuscar,
      paramsBuscar
    );

    if (camiones.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Camión no encontrado",
      });
    }

    const camion = camiones[0];

    if (Number(camion.estado) === estado) {
      return res.json({
        ok: true,
        msg:
          estado === 1
            ? "El camión ya estaba activo"
            : "El camión ya estaba inactivo",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tb_camion
      SET
        estado = ?,
        fyh_actualizacion = NOW()
      WHERE id_camion = ?
        AND id_empresa = ?
      `,
      [
        estado,
        id,
        camion.id_empresa,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Camión no encontrado",
      });
    }

    await registrarLog({
      req,
      modulo: "Camiones",
      accion:
        estado === 1
          ? "ACTIVAR"
          : "DESACTIVAR",
      descripcion: `Camión ${
        estado === 1
          ? "activado"
          : "desactivado"
      }: ${camion.nombre_camion}`,
    });

    return res.json({
      ok: true,
      msg: "Estado actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al cambiar estado:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error al cambiar estado",
    });
  }
};

module.exports = {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
};