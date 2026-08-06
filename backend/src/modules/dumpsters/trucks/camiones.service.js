const camionesRepository = require("./camiones.repository");

const {
  registrarLog,
} = require("../../../shared/logging/logs");

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

const esSuperAdmin = (usuario) =>
  usuario?.rol === "SUPER ADMIN" ||
  usuario?.rol_nombre === "SUPER ADMIN";

const obtenerFiltroEmpresa = (usuario) => {
  if (esSuperAdmin(usuario)) {
    return null;
  }

  return Number(usuario.id_empresa);
};

const obtenerEmpresaParaCrear = ({
  usuario,
  idEmpresaSolicitada,
}) => {
  if (esSuperAdmin(usuario)) {
    return Number(
      idEmpresaSolicitada ||
      usuario.id_empresa
    );
  }

  return Number(usuario.id_empresa);
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

const normalizarDatosCamion = (datos = {}) => {
  const nombreCamion = String(
    datos.nombre_camion || ""
  ).trim();

  const placa =
    String(datos.placa || "").trim() ||
    null;

  const pesoMin = Number(
    datos.peso_min || 0
  );

  const pesoMax = Number(
    datos.peso_max
  );

  if (!nombreCamion) {
    throw crearError(
      "El nombre del camión es obligatorio",
      400,
      "NOMBRE_OBLIGATORIO"
    );
  }

  if (
    !Number.isFinite(pesoMin) ||
    pesoMin < 0
  ) {
    throw crearError(
      "El peso mínimo no es válido",
      400,
      "PESO_MIN_INVALIDO"
    );
  }

  if (
    !Number.isFinite(pesoMax) ||
    pesoMax <= 0
  ) {
    throw crearError(
      "El peso máximo debe ser mayor que cero",
      400,
      "PESO_MAX_INVALIDO"
    );
  }

  if (pesoMin > pesoMax) {
    throw crearError(
      "El peso mínimo no puede superar el peso máximo",
      400,
      "RANGO_PESO_INVALIDO"
    );
  }

  return {
    nombreCamion,
    placa,
    pesoMin,
    pesoMax,
  };
};

const listarCamiones = async ({
  usuario,
}) => {
  const idEmpresa =
    obtenerFiltroEmpresa(usuario);

  return camionesRepository.listar({
    idEmpresa,
  });
};

const crearCamion = async ({
  datos,
  usuario,
  req,
}) => {
  const {
    nombreCamion,
    placa,
    pesoMin,
    pesoMax,
  } = normalizarDatosCamion(datos);

  const idEmpresa =
    obtenerEmpresaParaCrear({
      usuario,
      idEmpresaSolicitada:
        datos.id_empresa,
    });

  if (
    !Number.isInteger(idEmpresa) ||
    idEmpresa <= 0
  ) {
    throw crearError(
      "No se pudo determinar la empresa",
      400,
      "EMPRESA_NO_DETERMINADA"
    );
  }

  const duplicado =
    await camionesRepository.buscarDuplicado({
      idEmpresa,
      nombreCamion,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe un camión con ese nombre",
      409,
      "CAMION_DUPLICADO"
    );
  }

  const idCamion =
    await camionesRepository.crear({
      idEmpresa,
      nombreCamion,
      placa,
      pesoMin,
      pesoMax,
    });

  await registrarLog({
    req,
    modulo: "Camiones",
    accion: "CREAR",
    descripcion:
      `Camión creado: ${nombreCamion} (#${idCamion})`,
  });

  return {
    id_camion: idCamion,
  };
};

const actualizarCamion = async ({
  idCamion,
  datos,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idCamion,
    "ID del camión"
  );

  const {
    nombreCamion,
    placa,
    pesoMin,
    pesoMax,
  } = normalizarDatosCamion(datos);

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const camionActual =
    await camionesRepository.buscarPorId({
      idCamion: id,
      idEmpresa: idEmpresaFiltro,
    });

  if (!camionActual) {
    throw crearError(
      "Camión no encontrado",
      404,
      "CAMION_NO_ENCONTRADO"
    );
  }

  const duplicado =
    await camionesRepository.buscarDuplicado({
      idEmpresa:
        camionActual.id_empresa,
      nombreCamion,
      excluirIdCamion: id,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe otro camión con ese nombre",
      409,
      "CAMION_DUPLICADO"
    );
  }

  const afectados =
    await camionesRepository.actualizar({
      idCamion: id,
      idEmpresa:
        camionActual.id_empresa,
      nombreCamion,
      placa,
      pesoMin,
      pesoMax,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo actualizar el camión",
      404,
      "CAMION_NO_ACTUALIZADO"
    );
  }

  await registrarLog({
    req,
    modulo: "Camiones",
    accion: "ACTUALIZAR",
    descripcion:
      `Camión actualizado: ${nombreCamion} (#${id})`,
  });

  return {
    id_camion: id,
  };
};

const cambiarEstadoCamion = async ({
  idCamion,
  estado,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idCamion,
    "ID del camión"
  );

  const estadoNormalizado =
    Number(estado);

  if (![0, 1].includes(estadoNormalizado)) {
    throw crearError(
      "Estado inválido",
      400,
      "ESTADO_INVALIDO"
    );
  }

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const camion =
    await camionesRepository.buscarPorId({
      idCamion: id,
      idEmpresa:
        idEmpresaFiltro,
    });

  if (!camion) {
    throw crearError(
      "Camión no encontrado",
      404,
      "CAMION_NO_ENCONTRADO"
    );
  }

  if (
    Number(camion.estado) ===
    estadoNormalizado
  ) {
    return {
      id_camion: id,
      estado: estadoNormalizado,
      sin_cambios: true,
    };
  }

  const afectados =
    await camionesRepository.cambiarEstado({
      idCamion: id,
      idEmpresa: camion.id_empresa,
      estado: estadoNormalizado,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo cambiar el estado del camión",
      404,
      "ESTADO_NO_ACTUALIZADO"
    );
  }

  await registrarLog({
    req,
    modulo: "Camiones",
    accion:
      estadoNormalizado === 1
        ? "ACTIVAR"
        : "DESACTIVAR",
    descripcion:
      `Camión ${
        estadoNormalizado === 1
          ? "activado"
          : "desactivado"
      }: ${camion.nombre_camion} (#${id})`,
  });

  return {
    id_camion: id,
    estado: estadoNormalizado,
    sin_cambios: false,
  };
};

module.exports = {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
};