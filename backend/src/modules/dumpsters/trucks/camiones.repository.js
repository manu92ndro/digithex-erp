const db = require("../../../shared/database/db");

const CAMPOS_CAMION = `
  id_camion,
  id_empresa,
  nombre_camion,
  placa,
  peso_min,
  peso_max,
  estado,
  fyh_creacion,
  fyh_actualizacion
`;

const listar = async ({ idEmpresa = null }) => {
  let sql = `
    SELECT
      ${CAMPOS_CAMION}
    FROM tb_camion
  `;

  const params = [];

  if (idEmpresa) {
    sql += ` WHERE id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += ` ORDER BY nombre_camion ASC`;

  const [rows] = await db.query(sql, params);

  return rows;
};

const buscarPorId = async ({
  idCamion,
  idEmpresa = null,
}) => {
  let sql = `
    SELECT
      ${CAMPOS_CAMION}
    FROM tb_camion
    WHERE id_camion = ?
  `;

  const params = [idCamion];

  if (idEmpresa) {
    sql += ` AND id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

const buscarDuplicado = async ({
  idEmpresa,
  nombreCamion,
  excluirIdCamion = null,
}) => {
  let sql = `
    SELECT id_camion
    FROM tb_camion
    WHERE id_empresa = ?
      AND nombre_camion = ?
  `;

  const params = [
    idEmpresa,
    nombreCamion,
  ];

  if (excluirIdCamion) {
    sql += ` AND id_camion <> ?`;
    params.push(excluirIdCamion);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

const crear = async ({
  idEmpresa,
  nombreCamion,
  placa,
  pesoMin,
  pesoMax,
}) => {
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
      idEmpresa,
      nombreCamion,
      placa,
      pesoMin,
      pesoMax,
    ]
  );

  return result.insertId;
};

const actualizar = async ({
  idCamion,
  idEmpresa,
  nombreCamion,
  placa,
  pesoMin,
  pesoMax,
}) => {
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
      nombreCamion,
      placa,
      pesoMin,
      pesoMax,
      idCamion,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

const cambiarEstado = async ({
  idCamion,
  idEmpresa,
  estado,
}) => {
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
      idCamion,
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