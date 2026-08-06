const db = require("../../../shared/database/db");

const CAMPOS_CLIENTE = `
  id_cliente,
  id_empresa,
  nombres,
  celular,
  correo,
  direccion,
  estado,
  fecha_registro,
  fyh_actualizacion
`;

/**
 * Lista clientes.
 * Si idEmpresa es null, lista todas las empresas.
 */
const listar = async ({ idEmpresa = null }) => {
  let sql = `
    SELECT
      ${CAMPOS_CLIENTE}
    FROM tb_clientes
  `;

  const params = [];

  if (idEmpresa) {
    sql += ` WHERE id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += ` ORDER BY id_cliente DESC`;

  const [rows] = await db.query(sql, params);

  return rows;
};

/**
 * Busca un cliente por ID.
 * Puede limitarse a una empresa.
 */
const buscarPorId = async ({
  idCliente,
  idEmpresa = null,
}) => {
  let sql = `
    SELECT
      ${CAMPOS_CLIENTE}
    FROM tb_clientes
    WHERE id_cliente = ?
  `;

  const params = [idCliente];

  if (idEmpresa) {
    sql += ` AND id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

/**
 * Busca duplicado por celular o correo.
 */
const buscarDuplicado = async ({
  idEmpresa,
  celular,
  correo,
  excluirIdCliente = null,
}) => {
  let sql = `
    SELECT
      id_cliente,
      nombres,
      celular,
      correo
    FROM tb_clientes
    WHERE id_empresa = ?
      AND (
        celular = ?
        OR (
          ? IS NOT NULL
          AND ? <> ''
          AND correo = ?
        )
      )
  `;

  const params = [
    idEmpresa,
    celular,
    correo,
    correo,
    correo,
  ];

  if (excluirIdCliente) {
    sql += ` AND id_cliente <> ?`;
    params.push(excluirIdCliente);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

/**
 * Inserta un cliente.
 */
const crear = async ({
  idEmpresa,
  nombres,
  celular,
  correo,
  direccion,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO tb_clientes
    (
      id_empresa,
      nombres,
      celular,
      correo,
      direccion,
      estado,
      fecha_registro
    )
    VALUES (?, ?, ?, ?, ?, 1, NOW())
    `,
    [
      idEmpresa,
      nombres,
      celular,
      correo,
      direccion,
    ]
  );

  return result.insertId;
};

/**
 * Actualiza un cliente protegido por empresa.
 */
const actualizar = async ({
  idCliente,
  idEmpresa,
  nombres,
  celular,
  correo,
  direccion,
}) => {
  const [result] = await db.query(
    `
    UPDATE tb_clientes
    SET
      nombres = ?,
      celular = ?,
      correo = ?,
      direccion = ?,
      fyh_actualizacion = NOW()
    WHERE id_cliente = ?
      AND id_empresa = ?
    `,
    [
      nombres,
      celular,
      correo,
      direccion,
      idCliente,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

/**
 * Cambia el estado protegido por empresa.
 */
const cambiarEstado = async ({
  idCliente,
  idEmpresa,
  estado,
}) => {
  const [result] = await db.query(
    `
    UPDATE tb_clientes
    SET
      estado = ?,
      fyh_actualizacion = NOW()
    WHERE id_cliente = ?
      AND id_empresa = ?
    `,
    [
      estado,
      idCliente,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  listar,
  buscarPorId,
  buscarDuplicado,
  crear,
  actualizar,
  cambiarEstado,
};