const clientesService = require("./clientes.service");

// =============================================
// MANEJO DE ERRORES
// =============================================

const responderError = (
  res,
  error,
  mensajePredeterminado
) => {
  console.error(
    mensajePredeterminado,
    error
  );

  return res
    .status(error.status || 500)
    .json({
      ok: false,
      code:
        error.code ||
        "ERROR_INTERNO",
      msg:
        error.status
          ? error.message
          : mensajePredeterminado,
    });
};

// =============================================
// LISTAR CLIENTES
// =============================================

const listarClientes = async (req, res) => {
  try {
    const clientes =
      await clientesService.listarClientes({
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      clientes,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al listar clientes"
    );
  }
};

// =============================================
// OBTENER CLIENTE
// =============================================

const obtenerCliente = async (req, res) => {
  try {
    const cliente =
      await clientesService.obtenerCliente({
        idCliente: req.params.id,
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      cliente,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al obtener cliente"
    );
  }
};

// =============================================
// CREAR CLIENTE
// =============================================

const crearCliente = async (req, res) => {
  try {
    const resultado =
      await clientesService.crearCliente({
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.status(201).json({
      ok: true,
      msg: "Cliente creado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al crear cliente"
    );
  }
};

// =============================================
// ACTUALIZAR CLIENTE
// =============================================

const actualizarCliente = async (
  req,
  res
) => {
  try {
    const resultado =
      await clientesService.actualizarCliente({
        idCliente: req.params.id,
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.json({
      ok: true,
      msg: "Cliente actualizado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al actualizar cliente"
    );
  }
};

// =============================================
// CAMBIAR ESTADO
// =============================================

const cambiarEstadoCliente = async (
  req,
  res
) => {
  try {
    const resultado =
      await clientesService.cambiarEstadoCliente({
        idCliente: req.params.id,
        estado: req.body.estado,
        usuario: req.usuario,
        req,
      });

    const activo =
      resultado.estado === 1;

    let msg;

    if (resultado.sin_cambios) {
      msg = activo
        ? "El cliente ya estaba activo"
        : "El cliente ya estaba inactivo";
    } else {
      msg = activo
        ? "Cliente activado correctamente"
        : "Cliente desactivado correctamente";
    }

    return res.json({
      ok: true,
      msg,
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al cambiar estado del cliente"
    );
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
};