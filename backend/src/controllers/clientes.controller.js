const db = require("../config/db");
const { registrarLog } = require("../helpers/logs");

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" || usuario?.rol_nombre === "SUPER ADMIN";

const getEmpresaFiltro = (usuario) => {
  if (esSuperAdmin(usuario)) return null;
  return usuario.id_empresa;
};

const listarClientes = async (req, res) => {
  try {
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `
      SELECT 
        id_cliente,
        id_empresa,
        nombres,
        celular,
        correo,
        direccion,
        estado,
        fecha_registro,
        fyh_actualizacion
      FROM tb_clientes
    `;

    const params = [];

    if (empresaFiltro) {
      sql += ` WHERE id_empresa = ?`;
      params.push(empresaFiltro);
    }

    sql += ` ORDER BY id_cliente DESC`;

    const [clientes] = await db.query(sql, params);

    res.json({ ok: true, clientes });
  } catch (error) {
    console.error("Error al listar clientes:", error);
    res.status(500).json({ ok: false, msg: "Error al listar clientes" });
  }
};

const obtenerCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    let sql = `
      SELECT 
        id_cliente,
        id_empresa,
        nombres,
        celular,
        correo,
        direccion,
        estado,
        fecha_registro,
        fyh_actualizacion
      FROM tb_clientes
      WHERE id_cliente = ?
    `;

    const params = [id];

    if (empresaFiltro) {
      sql += ` AND id_empresa = ?`;
      params.push(empresaFiltro);
    }

    const [rows] = await db.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: "Cliente no encontrado" });
    }

    res.json({ ok: true, cliente: rows[0] });
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ ok: false, msg: "Error al obtener cliente" });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { nombres, celular, correo, direccion } = req.body;

    if (!nombres || !celular) {
      return res.status(400).json({
        ok: false,
        msg: "Nombre y celular son obligatorios",
      });
    }

    const id_empresa = esSuperAdmin(req.usuario)
      ? req.body.id_empresa || req.usuario.id_empresa
      : req.usuario.id_empresa;

    if (!id_empresa) {
      return res.status(400).json({
        ok: false,
        msg: "No se pudo determinar la empresa del cliente",
      });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_cliente 
      FROM tb_clientes 
      WHERE id_empresa = ?
      AND (
        celular = ?
        OR (correo IS NOT NULL AND correo <> '' AND correo = ?)
      )
      LIMIT 1
      `,
      [id_empresa, celular, correo || ""]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe un cliente con ese celular o correo en esta empresa",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tb_clientes 
      (id_empresa, nombres, celular, correo, direccion, estado, fecha_registro)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
      `,
      [id_empresa, nombres, celular, correo || null, direccion || null]
    );

    await registrarLog({
      req,
      modulo: "Clientes",
      accion: "CREAR",
      descripcion: `Cliente creado: ${nombres}`,
    });

    res.status(201).json({
      ok: true,
      msg: "Cliente creado correctamente",
      id_cliente: result.insertId,
    });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({ ok: false, msg: "Error al crear cliente" });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, celular, correo, direccion } = req.body;
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    if (!nombres || !celular) {
      return res.status(400).json({
        ok: false,
        msg: "Nombre y celular son obligatorios",
      });
    }

    let checkSql = `SELECT * FROM tb_clientes WHERE id_cliente = ?`;
    const checkParams = [id];

    if (empresaFiltro) {
      checkSql += ` AND id_empresa = ?`;
      checkParams.push(empresaFiltro);
    }

    const [clienteActual] = await db.query(checkSql, checkParams);

    if (clienteActual.length === 0) {
      return res.status(404).json({ ok: false, msg: "Cliente no encontrado" });
    }

    const [duplicado] = await db.query(
      `
      SELECT id_cliente 
      FROM tb_clientes 
      WHERE id_empresa = ?
      AND id_cliente <> ?
      AND (
        celular = ?
        OR (correo IS NOT NULL AND correo <> '' AND correo = ?)
      )
      LIMIT 1
      `,
      [
        clienteActual[0].id_empresa,
        id,
        celular,
        correo || "",
      ]
    );

    if (duplicado.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ya existe otro cliente con ese celular o correo",
      });
    }

    await db.query(
      `
      UPDATE tb_clientes
      SET nombres = ?,
          celular = ?,
          correo = ?,
          direccion = ?,
          fyh_actualizacion = NOW()
      WHERE id_cliente = ?
      `,
      [nombres, celular, correo || null, direccion || null, id]
    );

    await registrarLog({
      req,
      modulo: "Clientes",
      accion: "ACTUALIZAR",
      descripcion: `Cliente actualizado: ${nombres}`,
    });

    res.json({ ok: true, msg: "Cliente actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ ok: false, msg: "Error al actualizar cliente" });
  }
};

const cambiarEstadoCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const empresaFiltro = getEmpresaFiltro(req.usuario);

    if (![0, 1].includes(Number(estado))) {
      return res.status(400).json({
        ok: false,
        msg: "Estado inválido",
      });
    }

    let sql = `SELECT * FROM tb_clientes WHERE id_cliente = ?`;
    const params = [id];

    if (empresaFiltro) {
      sql += ` AND id_empresa = ?`;
      params.push(empresaFiltro);
    }

    const [cliente] = await db.query(sql, params);

    if (cliente.length === 0) {
      return res.status(404).json({ ok: false, msg: "Cliente no encontrado" });
    }

    await db.query(
      `
      UPDATE tb_clientes
      SET estado = ?,
          fyh_actualizacion = NOW()
      WHERE id_cliente = ?
      `,
      [Number(estado), id]
    );

    await registrarLog({
      req,
      modulo: "Clientes",
      accion: Number(estado) === 1 ? "ACTIVAR" : "DESACTIVAR",
      descripcion: `Cliente ${Number(estado) === 1 ? "activado" : "desactivado"}: ${cliente[0].nombres}`,
    });

    res.json({
      ok: true,
      msg: Number(estado) === 1
        ? "Cliente activado correctamente"
        : "Cliente desactivado correctamente",
    });
  } catch (error) {
    console.error("Error al cambiar estado cliente:", error);
    res.status(500).json({ ok: false, msg: "Error al cambiar estado del cliente" });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
};