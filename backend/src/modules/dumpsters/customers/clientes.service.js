const clientesRepository = require("./clientes.repository");

const {
  registrarLog,
} = require("../../../shared/logging/logs");

// =============================================
// ERROR DE NEGOCIO
// =============================================

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

// =============================================
// UTILIDADES
// =============================================

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

const normalizarTexto = (valor) =>
  String(valor ?? "").trim();

const normalizarCorreo = (valor) => {
  const correo = normalizarTexto(valor).toLowerCase();

  return correo || null;
};

const normalizarDireccion = (valor) => {
  const direccion = normalizarTexto(valor);

  return direccion || null;
};

const validarIdPositivo = (
  valor,
  nombre = "ID"
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

const validarCorreo = (correo) => {
  if (!correo) {
    return;
  }

  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!patron.test(correo)) {
    throw crearError(
      "El correo ingresado no es válido",
      400,
      "CORREO_INVALIDO"
    );
  }
};

const validarDatosCliente = ({
  nombres,
  celular,
  correo,
}) => {
  if (!nombres) {
    throw crearError(
      "El nombre del cliente es obligatorio",
      400,
      "NOMBRE_OBLIGATORIO"
    );
  }

  if (!celular) {
    throw crearError(
      "El celular del cliente es obligatorio",
      400,
      "CELULAR_OBLIGATORIO"
    );
  }

  if (nombres.length > 150) {
    throw crearError(
      "El nombre del cliente es demasiado largo",
      400,
      "NOMBRE_DEMASIADO_LARGO"
    );
  }

  if (celular.length > 30) {
    throw crearError(
      "El celular ingresado es demasiado largo",
      400,
      "CELULAR_DEMASIADO_LARGO"
    );
  }

  validarCorreo(correo);
};

const normalizarDatosCliente = (datos = {}) => {
  const nombres = normalizarTexto(datos.nombres);
  const celular = normalizarTexto(datos.celular);
  const correo = normalizarCorreo(datos.correo);
  const direccion = normalizarDireccion(
    datos.direccion
  );

  validarDatosCliente({
    nombres,
    celular,
    correo,
  });

  return {
    nombres,
    celular,
    correo,
    direccion,
  };
};

// =============================================
// LISTAR
// =============================================

const listarClientes = async ({ usuario }) => {
  const idEmpresa = obtenerFiltroEmpresa(usuario);

  return clientesRepository.listar({
    idEmpresa,
  });
};

// =============================================
// OBTENER
// =============================================

const obtenerCliente = async ({
  idCliente,
  usuario,
}) => {
  const id = validarIdPositivo(
    idCliente,
    "ID del cliente"
  );

  const idEmpresa = obtenerFiltroEmpresa(usuario);

  const cliente =
    await clientesRepository.buscarPorId({
      idCliente: id,
      idEmpresa,
    });

  if (!cliente) {
    throw crearError(
      "Cliente no encontrado",
      404,
      "CLIENTE_NO_ENCONTRADO"
    );
  }

  return cliente;
};

// =============================================
// CREAR
// =============================================

const crearCliente = async ({
  datos,
  usuario,
  req,
}) => {
  const {
    nombres,
    celular,
    correo,
    direccion,
  } = normalizarDatosCliente(datos);

  const idEmpresa = obtenerEmpresaParaCrear({
    usuario,
    idEmpresaSolicitada: datos.id_empresa,
  });

  if (
    !Number.isInteger(idEmpresa) ||
    idEmpresa <= 0
  ) {
    throw crearError(
      "No se pudo determinar la empresa del cliente",
      400,
      "EMPRESA_NO_DETERMINADA"
    );
  }

  const duplicado =
    await clientesRepository.buscarDuplicado({
      idEmpresa,
      celular,
      correo,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe un cliente con ese celular o correo en esta empresa",
      409,
      "CLIENTE_DUPLICADO"
    );
  }

  const idCliente =
    await clientesRepository.crear({
      idEmpresa,
      nombres,
      celular,
      correo,
      direccion,
    });

  await registrarLog({
    req,
    modulo: "Clientes",
    accion: "CREAR",
    descripcion:
      `Cliente creado: ${nombres} (#${idCliente})`,
  });

  return {
    id_cliente: idCliente,
  };
};

// =============================================
// ACTUALIZAR
// =============================================

const actualizarCliente = async ({
  idCliente,
  datos,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idCliente,
    "ID del cliente"
  );

  const {
    nombres,
    celular,
    correo,
    direccion,
  } = normalizarDatosCliente(datos);

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const clienteActual =
    await clientesRepository.buscarPorId({
      idCliente: id,
      idEmpresa: idEmpresaFiltro,
    });

  if (!clienteActual) {
    throw crearError(
      "Cliente no encontrado",
      404,
      "CLIENTE_NO_ENCONTRADO"
    );
  }

  const duplicado =
    await clientesRepository.buscarDuplicado({
      idEmpresa: clienteActual.id_empresa,
      celular,
      correo,
      excluirIdCliente: id,
    });

  if (duplicado) {
    throw crearError(
      "Ya existe otro cliente con ese celular o correo",
      409,
      "CLIENTE_DUPLICADO"
    );
  }

  const afectados =
    await clientesRepository.actualizar({
      idCliente: id,
      idEmpresa: clienteActual.id_empresa,
      nombres,
      celular,
      correo,
      direccion,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo actualizar el cliente",
      404,
      "CLIENTE_NO_ACTUALIZADO"
    );
  }

  await registrarLog({
    req,
    modulo: "Clientes",
    accion: "ACTUALIZAR",
    descripcion:
      `Cliente actualizado: ${nombres} (#${id})`,
  });

  return {
    id_cliente: id,
  };
};

// =============================================
// CAMBIAR ESTADO
// =============================================

const cambiarEstadoCliente = async ({
  idCliente,
  estado,
  usuario,
  req,
}) => {
  const id = validarIdPositivo(
    idCliente,
    "ID del cliente"
  );

  const estadoNormalizado = Number(estado);

  if (![0, 1].includes(estadoNormalizado)) {
    throw crearError(
      "Estado inválido",
      400,
      "ESTADO_INVALIDO"
    );
  }

  const idEmpresaFiltro =
    obtenerFiltroEmpresa(usuario);

  const cliente =
    await clientesRepository.buscarPorId({
      idCliente: id,
      idEmpresa: idEmpresaFiltro,
    });

  if (!cliente) {
    throw crearError(
      "Cliente no encontrado",
      404,
      "CLIENTE_NO_ENCONTRADO"
    );
  }

  if (
    Number(cliente.estado) ===
    estadoNormalizado
  ) {
    return {
      id_cliente: id,
      estado: estadoNormalizado,
      sin_cambios: true,
    };
  }

  const afectados =
    await clientesRepository.cambiarEstado({
      idCliente: id,
      idEmpresa: cliente.id_empresa,
      estado: estadoNormalizado,
    });

  if (afectados === 0) {
    throw crearError(
      "No se pudo actualizar el estado del cliente",
      404,
      "ESTADO_NO_ACTUALIZADO"
    );
  }

  const accion =
    estadoNormalizado === 1
      ? "ACTIVAR"
      : "DESACTIVAR";

  await registrarLog({
    req,
    modulo: "Clientes",
    accion,
    descripcion:
      `Cliente ${
        estadoNormalizado === 1
          ? "activado"
          : "desactivado"
      }: ${cliente.nombres} (#${id})`,
  });

  return {
    id_cliente: id,
    estado: estadoNormalizado,
    sin_cambios: false,
  };
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
};