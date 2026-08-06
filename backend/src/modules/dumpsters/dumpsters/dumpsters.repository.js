const db = require("../../../shared/database/db");

const CAMPOS_DUMPSTER = `
  id_dumpster,
  id_empresa,
  codigo,
  tamano_yardas,
  capacidad_toneladas,
  precio_base,
  max_dias,
  precio_extra_tonelada,
  precio_extra_yarda,
  precio_extra_dia,
  estado,
  fecha_creacion,
  fecha_actualizacion
`;

const listar = async ({ idEmpresa = null }) => {
  let sql = `
    SELECT
      ${CAMPOS_DUMPSTER}
    FROM dumpsters
  `;

  const params = [];

  if (idEmpresa) {
    sql += ` WHERE id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += `
    ORDER BY
      tamano_yardas ASC,
      codigo ASC
  `;

  const [rows] = await db.query(sql, params);

  return rows;
};

const buscarPorId = async ({
  idDumpster,
  idEmpresa = null,
}) => {
  let sql = `
    SELECT
      ${CAMPOS_DUMPSTER}
    FROM dumpsters
    WHERE id_dumpster = ?
  `;

  const params = [idDumpster];

  if (idEmpresa) {
    sql += ` AND id_empresa = ?`;
    params.push(idEmpresa);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

const buscarPorCodigo = async ({
  idEmpresa,
  codigo,
  excluirIdDumpster = null,
}) => {
  let sql = `
    SELECT
      id_dumpster,
      codigo
    FROM dumpsters
    WHERE id_empresa = ?
      AND LOWER(codigo) = LOWER(?)
  `;

  const params = [
    idEmpresa,
    codigo,
  ];

  if (excluirIdDumpster) {
    sql += ` AND id_dumpster <> ?`;
    params.push(excluirIdDumpster);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);

  return rows[0] || null;
};

const crear = async ({
  idEmpresa,
  codigo,
  tamanoYardas,
  capacidadToneladas,
  precioBase,
  maxDias,
  precioExtraTonelada,
  precioExtraYarda,
  precioExtraDia,
  estado,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO dumpsters
    (
      id_empresa,
      codigo,
      tamano_yardas,
      capacidad_toneladas,
      precio_base,
      max_dias,
      precio_extra_tonelada,
      precio_extra_yarda,
      precio_extra_dia,
      estado,
      fecha_creacion
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      idEmpresa,
      codigo,
      tamanoYardas,
      capacidadToneladas,
      precioBase,
      maxDias,
      precioExtraTonelada,
      precioExtraYarda,
      precioExtraDia,
      estado,
    ]
  );

  return result.insertId;
};

const actualizar = async ({
  idDumpster,
  idEmpresa,
  codigo,
  tamanoYardas,
  capacidadToneladas,
  precioBase,
  maxDias,
  precioExtraTonelada,
  precioExtraYarda,
  precioExtraDia,
  estado,
}) => {
  const [result] = await db.query(
    `
    UPDATE dumpsters
    SET
      codigo = ?,
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
      AND id_empresa = ?
    `,
    [
      codigo,
      tamanoYardas,
      capacidadToneladas,
      precioBase,
      maxDias,
      precioExtraTonelada,
      precioExtraYarda,
      precioExtraDia,
      estado,
      idDumpster,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

const cambiarEstado = async ({
  idDumpster,
  idEmpresa,
  estado,
}) => {
  const [result] = await db.query(
    `
    UPDATE dumpsters
    SET
      estado = ?,
      fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id_dumpster = ?
      AND id_empresa = ?
    `,
    [
      estado,
      idDumpster,
      idEmpresa,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  listar,
  buscarPorId,
  buscarPorCodigo,
  crear,
  actualizar,
  cambiarEstado,
};