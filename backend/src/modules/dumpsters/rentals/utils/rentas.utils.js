class RentaError extends Error {
  constructor(message, status = 500, code = "ERROR_RENTA") {
    super(message);
    this.name = "RentaError";
    this.status = status;
    this.code = code;
  }
}

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" || usuario?.rol_nombre === "SUPER ADMIN";

const obtenerIdEmpresa = ({ usuario, body = {}, query = {} }) => {
  const valor = esSuperAdmin(usuario)
    ? body.id_empresa || query.id_empresa || usuario?.id_empresa
    : usuario?.id_empresa;

  const idEmpresa = Number(valor);

  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
    throw new RentaError(
      "No se pudo identificar la empresa",
      400,
      "EMPRESA_NO_DETERMINADA"
    );
  }

  return idEmpresa;
};

const validarId = (valor, nombre = "ID") => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new RentaError(`${nombre} inválido`, 400, "ID_INVALIDO");
  }
  return id;
};

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const money = (valor) => Number(numero(valor).toFixed(2));

const calcularDias = (fechaInicio, fechaRetiro) => {
  const inicio = new Date(fechaInicio);
  const retiro = new Date(fechaRetiro);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(retiro.getTime())) {
    throw new RentaError("Fecha inválida", 400, "FECHA_INVALIDA");
  }

  if (retiro < inicio) {
    throw new RentaError(
      "La fecha de retiro no puede ser menor a la fecha de inicio",
      400,
      "RANGO_FECHAS_INVALIDO"
    );
  }

  return Math.max(1, Math.ceil((retiro - inicio) / 86400000));
};

const ejecutarTransaccion = async (db, callback) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Error ejecutando rollback:", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  RentaError,
  esSuperAdmin,
  obtenerIdEmpresa,
  validarId,
  numero,
  money,
  calcularDias,
  ejecutarTransaccion,
};
