const db = require("../../../shared/database/db");

const getIdEmpresa = (req) => Number(req.usuario.id_empresa);

// ===============================
// LISTAR IMPUESTOS
// ===============================

const listarImpuestos = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const [rows] = await db.query(
      `
      SELECT
        id_tax,
        id_empresa,
        nombre,
        tax_rate,
        activo,
        fecha_creacion
      FROM tb_impuestos
      WHERE id_empresa = ?
      ORDER BY activo DESC, id_tax DESC
      `,
      [id_empresa]
    );

    return res.json({
      ok: true,
      impuestos: rows,
    });
  } catch (error) {
    console.error("Error listando impuestos:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error listando impuestos",
    });
  }
};

// ===============================
// CREAR IMPUESTO
// ===============================

const crearImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const nombre = String(req.body.nombre || "").trim();
    const tax_rate = Number(req.body.tax_rate);

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del impuesto es obligatorio",
      });
    }

    if (!Number.isFinite(tax_rate) || tax_rate < 0) {
      return res.status(400).json({
        ok: false,
        msg: "La tasa del impuesto es inválida",
      });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_tax
      FROM tb_impuestos
      WHERE id_empresa = ?
        AND nombre = ?
      LIMIT 1
      `,
      [id_empresa, nombre]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe un impuesto con ese nombre",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tb_impuestos (
        id_empresa,
        nombre,
        tax_rate,
        activo,
        fecha_creacion
      )
      VALUES (?, ?, ?, 1, NOW())
      `,
      [id_empresa, nombre, tax_rate]
    );

    return res.status(201).json({
      ok: true,
      msg: "Impuesto creado correctamente",
      id_tax: result.insertId,
    });
  } catch (error) {
    console.error("Error creando impuesto:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error creando impuesto",
    });
  }
};

// ===============================
// ACTUALIZAR IMPUESTO
// ===============================

const actualizarImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);
    const id_tax = Number(req.params.id_tax);

    const nombre = String(req.body.nombre || "").trim();
    const tax_rate = Number(req.body.tax_rate);
    const activo = Number(req.body.activo) === 1 ? 1 : 0;

    if (!Number.isInteger(id_tax) || id_tax <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "ID de impuesto inválido",
      });
    }

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del impuesto es obligatorio",
      });
    }

    if (!Number.isFinite(tax_rate) || tax_rate < 0) {
      return res.status(400).json({
        ok: false,
        msg: "La tasa del impuesto es inválida",
      });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_tax
      FROM tb_impuestos
      WHERE id_empresa = ?
        AND nombre = ?
        AND id_tax <> ?
      LIMIT 1
      `,
      [id_empresa, nombre, id_tax]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe otro impuesto con ese nombre",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tb_impuestos
      SET nombre = ?,
          tax_rate = ?,
          activo = ?
      WHERE id_tax = ?
        AND id_empresa = ?
      `,
      [
        nombre,
        tax_rate,
        activo,
        id_tax,
        id_empresa,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Impuesto no encontrado",
      });
    }

    return res.json({
      ok: true,
      msg: "Impuesto actualizado correctamente",
    });
  } catch (error) {
    console.error("Error actualizando impuesto:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error actualizando impuesto",
    });
  }
};

// ===============================
// DESACTIVAR IMPUESTO
// ===============================

const desactivarImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);
    const id_tax = Number(req.params.id_tax);

    if (!Number.isInteger(id_tax) || id_tax <= 0) {
      return res.status(400).json({
        ok: false,
        msg: "ID de impuesto inválido",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tb_impuestos
      SET activo = 0
      WHERE id_tax = ?
        AND id_empresa = ?
      `,
      [id_tax, id_empresa]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Impuesto no encontrado",
      });
    }

    return res.json({
      ok: true,
      msg: "Impuesto desactivado correctamente",
    });
  } catch (error) {
    console.error("Error desactivando impuesto:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error desactivando impuesto",
    });
  }
};

module.exports = {
  listarImpuestos,
  crearImpuesto,
  actualizarImpuesto,
  desactivarImpuesto,
};