const dumpstersRepository = require(
  "./dumpsters.repository"
);

const {
  registrarLog,
} = require("../../../shared/logging/logs");

const ESTADOS_VALIDOS = [
  "disponible",
  "rentado",
  "mantenimiento",
  "inactivo",
];

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

const obtenerEmpresaParaCrear = ({
  usuario,
  idEmpresaSolicitada,
}) => {
  const idEmpresa = esSuperAdmin(usuario)
    ? Number(
        idEmpresaSolicitada ||
        usuario?.id_empresa
      )
    : Number(usuario?.id_empresa);

  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
    throw crearError(
      "No se pudo determinar la empresa del dumpster",
      400,
      "EMPRESA_NO_DETERMINADA"
    );
  }

  return idEmpresa;
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

const validarNumeroPositivo = ({
  valor,
  nombre,
  permiteCero = false,
}) => {
  const numero = Number(valor);

  const invalido =
    !Number.isFinite(numero) ||
    (permiteCero
      ? numero < 0
      : numero <= 0);

  if (invalido) {
    throw crearError(
      `${nombre} no es válido`,
      400,
      "VALOR_NUMERICO_INVALIDO"
    );
  }

  return numero;
};

const normalizarEstado = (
  valor,
  valorDefault = "disponible"
) => {
  const estado = String(
    valor || valorDefault
  )
    .trim()
    .toLowerCase();

  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw crearError(
      "Estado inválido",
      400,
      "ESTADO_INVALIDO"
    );
  }

  return estado;
};

const normalizarDatosDumpster = (
  datos = {}
) => {
  const codigo = String(
    datos.codigo || ""
  ).trim();

  if (!codigo) {
    throw crearError(
      "El código del dumpster es obligatorio",
      400,
      "CODIGO_OBLIGATORIO"
    );
  }

  if (codigo.length > 100) {
    throw crearError(
      "El código del dumpster es demasiado largo",
      400,
      "CODIGO_DEMASIADO_LARGO"
    );
  }

  const tamanoYardas =
    validarNumeroPositivo({
      valor: datos.tamano_yardas,
      nombre: "El tamaño en yardas",
    });

  const capacidadToneladas =
    validarNumeroPositivo({
      valor: datos.capacidad_toneladas,
      nombre: "La capacidad en toneladas",
    });

  const precioBase =
    validarNumeroPositivo({
      valor: datos.precio_base,
      nombre: "El precio base",
    });

  const maxDias =
    validarNumeroPositivo({
      valor: datos.max_dias,
      nombre: "El máximo de días",
    });

  if (!Number.isInteger(maxDias)) {
    throw crearError(
      "El máximo de días debe ser un número entero",
      400,
      "MAX_DIAS_INVALIDO"
    );
  }

  const precioExtraTonelada =
    validarNumeroPositivo({
      valor:
        datos.precio_extra_tonelada ?? 0,
      nombre:
        "El precio extra por tonelada",
      permiteCero: true,
    });

  const precioExtraYarda =
    validarNumeroPositivo({
      valor:
        datos.precio_extra_yarda ?? 0,
      nombre:
        "El precio extra por yarda",
      permiteCero: true,
    });

  const precioExtraDia =
    validarNumeroPositivo({
      valor:
        datos.precio_extra_dia ?? 0,
      nombre:
        "El precio extra por día",
      permiteCero: true,
    });

  const estado = normalizarEstado(
    datos.estado
  );

  return {
    codigo,
    tamanoYardas,
    capacidadToneladas,
    precioBase,
    maxDias,
    precioExtraTonelada,
    precioExtraYarda,
    precioExtraDia,
    estado,
  };
};

const listarDumpsters = async ({
  usuario,
}) => {
  const idEmpresa =
    obtenerFiltroEmpresa(usuario);

  return dumpstersRepository.listar({
    idEmpresa,
  });
};

const obtenerDumpster = async ({
  idDumpster,
  usuario,
}) => {
  const id = validarIdPositivo(
    idDumpster,
    "ID del dumpster"
  );

  const idEmpresa =
    obtenerFiltroEmpresa(usuario);

  const dumpster =
    await dumpstersRepository.buscarPorId({
      idDumpster: id,
      idEmpresa,
    });

  if (!dumpster) {
    throw crearError(
      "Dumpster no encontrado",
      404,
      "DUMPSTER_NO_ENCONTRADO"
    );
  }

  return dumpster;
};

const crearDumpster = async ({
  datos,
  usuario,
  req,
}) => {
  const datosNormalizados =
    normalizarDatosDumpster(datos);

  const idEmpresa =
    obtenerEmpresaParaCrear({
      usuario,
      idEmpresaSolicitada:
        datos.id_empresa,
    });

  const duplicado =
    await dumpstersRepository.buscarPorCodigo({
      idEmpresa,
      codigo:
        datosNormalizados.codigo,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe un dumpster con ese código en esta empresa",
      409,
      "DUMPSTER_DUPLICADO"
    );
  }

  const idDumpster =
    await dumpstersRepository.crear({
      idEmpresa,
      ...datosNormalizados,
    });

  await registrarLog({
    req,
    modulo: "Dumpsters",
    accion: "CREAR",
    descripcion:
      `Dumpster creado: ${datosNormalizados.codigo} (#${idDumpster})`,
  });

  return {
    id_dumpster: idDumpster,
  };
};

const actualizarDumpster = async ({
  idDumpster,
  datos,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idDumpster,
    "ID del dumpster"
  );

  const datosNormalizados =
    normalizarDatosDumpster(datos);

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const dumpsterActual =
    await dumpstersRepository.buscarPorId({
      idDumpster: id,
      idEmpresa: idEmpresaFiltro,
    });

  if (!dumpsterActual) {
    throw crearError(
      "Dumpster no encontrado",
      404,
      "DUMPSTER_NO_ENCONTRADO"
    );
  }

  const duplicado =
    await dumpstersRepository.buscarPorCodigo({
      idEmpresa:
        dumpsterActual.id_empresa,
      codigo:
        datosNormalizados.codigo,
      excluirIdDumpster: id,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe otro dumpster con ese código",
      409,
      "DUMPSTER_DUPLICADO"
    );
  }

  const afectados =
    await dumpstersRepository.actualizar({
      idDumpster: id,
      idEmpresa:
        dumpsterActual.id_empresa,
      ...datosNormalizados,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo actualizar el dumpster",
      404,
      "DUMPSTER_NO_ACTUALIZADO"
    );
  }

  await registrarLog({
    req,
    modulo: "Dumpsters",
    accion: "ACTUALIZAR",
    descripcion:
      `Dumpster actualizado: ${datosNormalizados.codigo} (#${id})`,
  });

  return {
    id_dumpster: id,
  };
};

const cambiarEstadoDumpster = async ({
  idDumpster,
  estado,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idDumpster,
    "ID del dumpster"
  );

  const estadoNormalizado =
    normalizarEstado(estado);

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const dumpster =
    await dumpstersRepository.buscarPorId({
      idDumpster: id,
      idEmpresa: idEmpresaFiltro,
    });

  if (!dumpster) {
    throw crearError(
      "Dumpster no encontrado",
      404,
      "DUMPSTER_NO_ENCONTRADO"
    );
  }

  if (
    String(dumpster.estado).toLowerCase() ===
    estadoNormalizado
  ) {
    return {
      id_dumpster: id,
      estado: estadoNormalizado,
      sin_cambios: true,
    };
  }

  const afectados =
    await dumpstersRepository.cambiarEstado({
      idDumpster: id,
      idEmpresa: dumpster.id_empresa,
      estado: estadoNormalizado,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo cambiar el estado del dumpster",
      404,
      "ESTADO_NO_ACTUALIZADO"
    );
  }

  await registrarLog({
    req,
    modulo: "Dumpsters",
    accion: "CAMBIAR_ESTADO",
    descripcion:
      `Dumpster ${dumpster.codigo} cambiado a ${estadoNormalizado} (#${id})`,
  });

  return {
    id_dumpster: id,
    estado: estadoNormalizado,
    sin_cambios: false,
  };
};

module.exports = {
  listarDumpsters,
  obtenerDumpster,
  crearDumpster,
  actualizarDumpster,
  cambiarEstadoDumpster,
};