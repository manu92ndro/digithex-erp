const db = require("../../../shared/database/db");

const CAMPOS_IMPUESTO = `
  id_tax,
  id_empresa,
  nombre,
  tax_rate,
  activo,
  fecha_creacion
`;

const listarPorEmpresa = async (idEmpresa) => {
  const [rows] = await db.query(
    `
    SELECT
      ${CAMPOS_IMPUESTO}
    FROM tb_impuestos
    WHERE id_empresa = ?
    ORDER BY activo DESC, id_tax DESC
    `,
    [idEmpresa]
  );

  return rows;
};

const buscarPorId = async ({
  idTax,
  idEmpresa,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      ${CAMPOS_IMPUESTO}
    FROM tb_impuestos
    WHERE id_tax = ?
      AND id_empresa = ?
    LIMIT 1
    `,
    [idTax, idEmpresa]
  );

  return rows[0] || null;
};

const buscarDuplicado = async ({
  idEmpresa,
  nombre,
  excluirIdTax = null,
}) => {
  let sql = `
    SELECT id_tax
    FROM tb_impuestos
    WHERE id_empresa = ?
      AND LOWER(nombre) = LOWER(?)
  `;

  const params = [
    idEmpresa,
    nombre,
  ];

  if (excluirIdTax) {
    sql += ` AND id_tax <> ?`;
    params.push(excluirIdTax);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

const crear = async ({
  idEmpresa,
  nombre,
  taxRate,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO tb_impuestos
    (
      id_empresa,
      nombre,
      tax_rate,
      activo,
      fecha_creacion
    )
    VALUES (?, ?, ?, 1, NOW())
    `,
    [
      idEmpresa,
      nombre,
      taxRate,
    ]
  );

  return result.insertId;
};

const actualizar = async ({
  idTax,
  idEmpresa,
  nombre,
  taxRate,
  activo,
}) => {
  const [result] = await db.query(
    `
    UPDATE tb_impuestos
    SET
      nombre = ?,
      tax_rate = ?,
      activo = ?
    WHERE id_tax = ?
      AND id_empresa = ?
    `,
    [
      nombre,
      taxRate,
      activo,
      idTax,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

const cambiarEstado = async ({
  idTax,
  idEmpresa,
  activo,
}) => {
  const [result] = await db.query(
    `
    UPDATE tb_impuestos
    SET activo = ?
    WHERE id_tax = ?
      AND id_empresa = ?
    `,
    [
      activo,
      idTax,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  listarPorEmpresa,
  buscarPorId,
  buscarDuplicado,
  crear,
  actualizar,
  cambiarEstado,
};