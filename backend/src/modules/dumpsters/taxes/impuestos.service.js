const impuestosRepository = require(
  "./impuestos.repository"
);

const crearError = (
  message,
  status = 500,
  code = "ERROR_INTERNO"
) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;

  return error;
};

const validarIdPositivo = (
  valor,
  nombre
) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw crearError(
      `${nombre} inválido`,
      400,
      "ID_INVALIDO"
    );
  }

  return numero;
};

const obtenerIdEmpresa = (usuario) => {
  const idEmpresa = Number(usuario?.id_empresa);

  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
    throw crearError(
      "No se pudo identificar la empresa",
      400,
      "EMPRESA_NO_DETERMINADA"
    );
  }

  return idEmpresa;
};

const normalizarDatosImpuesto = (
  datos = {}
) => {
  const nombre = String(
    datos.nombre || ""
  ).trim();

  const taxRate = Number(
    datos.tax_rate
  );

  if (!nombre) {
    throw crearError(
      "El nombre del impuesto es obligatorio",
      400,
      "NOMBRE_OBLIGATORIO"
    );
  }

  if (nombre.length > 100) {
    throw crearError(
      "El nombre del impuesto es demasiado largo",
      400,
      "NOMBRE_DEMASIADO_LARGO"
    );
  }

  if (
    !Number.isFinite(taxRate) ||
    taxRate < 0 ||
    taxRate > 1
  ) {
    throw crearError(
      "La tasa del impuesto debe estar entre 0 y 1",
      400,
      "TASA_INVALIDA"
    );
  }

  return {
    nombre,
    taxRate,
  };
};

const listarImpuestos = async ({
  usuario,
}) => {
  const idEmpresa =
    obtenerIdEmpresa(usuario);

  return impuestosRepository.listarPorEmpresa(
    idEmpresa
  );
};

const crearImpuesto = async ({
  datos,
  usuario,
}) => {
  const idEmpresa =
    obtenerIdEmpresa(usuario);

  const {
    nombre,
    taxRate,
  } = normalizarDatosImpuesto(datos);

  const duplicado =
    await impuestosRepository.buscarDuplicado({
      idEmpresa,
      nombre,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe un impuesto con ese nombre",
      409,
      "IMPUESTO_DUPLICADO"
    );
  }

  const idTax =
    await impuestosRepository.crear({
      idEmpresa,
      nombre,
      taxRate,
    });

  return {
    id_tax: idTax,
  };
};

const actualizarImpuesto = async ({
  idTax,
  datos,
  usuario,
}) => {
  const idEmpresa =
    obtenerIdEmpresa(usuario);

  const id = validarIdPositivo(
    idTax,
    "ID del impuesto"
  );

  const {
    nombre,
    taxRate,
  } = normalizarDatosImpuesto(datos);

  const activo =
    Number(datos.activo) === 1
      ? 1
      : 0;

  const impuestoActual =
    await impuestosRepository.buscarPorId({
      idTax: id,
      idEmpresa,
    });

  if (!impuestoActual) {
    throw crearError(
      "Impuesto no encontrado",
      404,
      "IMPUESTO_NO_ENCONTRADO"
    );
  }

  const duplicado =
    await impuestosRepository.buscarDuplicado({
      idEmpresa,
      nombre,
      excluirIdTax: id,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe otro impuesto con ese nombre",
      409,
      "IMPUESTO_DUPLICADO"
    );
  }

  const afectados =
    await impuestosRepository.actualizar({
      idTax: id,
      idEmpresa,
      nombre,
      taxRate,
      activo,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo actualizar el impuesto",
      404,
      "IMPUESTO_NO_ACTUALIZADO"
    );
  }

  return {
    id_tax: id,
  };
};

const desactivarImpuesto = async ({
  idTax,
  usuario,
}) => {
  const idEmpresa =
    obtenerIdEmpresa(usuario);

  const id = validarIdPositivo(
    idTax,
    "ID del impuesto"
  );

  const impuesto =
    await impuestosRepository.buscarPorId({
      idTax: id,
      idEmpresa,
    });

  if (!impuesto) {
    throw crearError(
      "Impuesto no encontrado",
      404,
      "IMPUESTO_NO_ENCONTRADO"
    );
  }

  if (Number(impuesto.activo) === 0) {
    return {
      id_tax: id,
      activo: 0,
      sin_cambios: true,
    };
  }

  const afectados =
    await impuestosRepository.cambiarEstado({
      idTax: id,
      idEmpresa,
      activo: 0,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo desactivar el impuesto",
      404,
      "IMPUESTO_NO_DESACTIVADO"
    );
  }

  return {
    id_tax: id,
    activo: 0,
    sin_cambios: false,
  };
};

module.exports = {
  listarImpuestos,
  crearImpuesto,
  actualizarImpuesto,
  desactivarImpuesto,
};