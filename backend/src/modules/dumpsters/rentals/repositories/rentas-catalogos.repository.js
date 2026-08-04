const db = require("../../../../shared/database/db");

const obtenerClientesActivos = async (idEmpresa) => {
  const [rows] = await db.query(
    `SELECT id_cliente, nombres, celular, correo, direccion
     FROM tb_clientes
     WHERE id_empresa = ? AND estado = 1
     ORDER BY nombres ASC`,
    [idEmpresa]
  );
  return rows;
};

const obtenerDumpstersDisponibles = async (idEmpresa) => {
  const [rows] = await db.query(
    `SELECT id_dumpster, codigo, tamano_yardas, capacidad_toneladas,
            precio_base, max_dias, precio_extra_tonelada,
            precio_extra_yarda, precio_extra_dia, estado
     FROM dumpsters
     WHERE id_empresa = ? AND estado = 'disponible'
     ORDER BY tamano_yardas ASC, codigo ASC`,
    [idEmpresa]
  );
  return rows;
};

const obtenerCamionesActivos = async (idEmpresa) => {
  const [rows] = await db.query(
    `SELECT id_camion, nombre_camion, placa, peso_min, peso_max
     FROM tb_camion
     WHERE id_empresa = ? AND estado = 1
     ORDER BY nombre_camion ASC`,
    [idEmpresa]
  );
  return rows;
};

const obtenerMateriales = async () => {
  const [rows] = await db.query(
    `SELECT id_material, nombre_material
     FROM tb_material
     ORDER BY nombre_material ASC`
  );
  return rows;
};

const obtenerUbicaciones = async () => {
  const [rows] = await db.query(
    `SELECT id_ubicacion, ubicacion
     FROM tb_ubicacion_caja
     ORDER BY ubicacion ASC`
  );
  return rows;
};

const obtenerImpuestoActivo = async (idEmpresa) => {
  const [rows] = await db.query(
    `SELECT id_tax, nombre, tax_rate
     FROM tb_impuestos
     WHERE id_empresa = ? AND activo = 1
     ORDER BY id_tax DESC
     LIMIT 1`,
    [idEmpresa]
  );
  return rows[0] || null;
};

module.exports = {
  obtenerClientesActivos,
  obtenerDumpstersDisponibles,
  obtenerCamionesActivos,
  obtenerMateriales,
  obtenerUbicaciones,
  obtenerImpuestoActivo,
};
