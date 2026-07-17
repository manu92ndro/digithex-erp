const db = require("../config/db");

const getIdEmpresa = (req) => req.usuario.id_empresa;

const listarImpuestos = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const [rows] = await db.query(
      `
      SELECT id_tax, id_empresa, nombre, tax_rate, activo, fecha_creacion
      FROM tb_impuestos
      WHERE id_empresa = ?
      ORDER BY activo DESC, id_tax DESC
      `,
      [id_empresa]
    );

    res.json({
      ok: true,
      impuestos: rows,
    });
  } catch (error) {
    console.error("Error listando impuestos:", error);
    res.status(500).json({
      ok: false,
      msg: "Error listando impuestos",
    });
  }
};

const crearImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);
    const { nombre, tax_rate } = req.body;

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del impuesto es obligatorio",
      });
    }

    await db.query(
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
      [id_empresa, nombre, Number(tax_rate || 0)]
    );

    res.json({
      ok: true,
      msg: "Impuesto creado correctamente",
    });
  } catch (error) {
    console.error("Error creando impuesto:", error);
    res.status(500).json({
      ok: false,
      msg: "Error creando impuesto",
    });
  }
};

const actualizarImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);
    const { id_tax } = req.params;
    const { nombre, tax_rate, activo } = req.body;

    await db.query(
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
        Number(tax_rate || 0),
        activo ? 1 : 0,
        id_tax,
        id_empresa,
      ]
    );

    res.json({
      ok: true,
      msg: "Impuesto actualizado correctamente",
    });
  } catch (error) {
    console.error("Error actualizando impuesto:", error);
    res.status(500).json({
      ok: false,
      msg: "Error actualizando impuesto",
    });
  }
};

const desactivarImpuesto = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);
    const { id_tax } = req.params;

    await db.query(
      `
      UPDATE tb_impuestos
      SET activo = 0
      WHERE id_tax = ?
        AND id_empresa = ?
      `,
      [id_tax, id_empresa]
    );

    res.json({
      ok: true,
      msg: "Impuesto desactivado correctamente",
    });
  } catch (error) {
    console.error("Error desactivando impuesto:", error);
    res.status(500).json({
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