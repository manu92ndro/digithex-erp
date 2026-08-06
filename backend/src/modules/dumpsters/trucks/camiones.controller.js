const camionesService = require("./camiones.service");

// =============================================
// MANEJO CENTRAL DE ERRORES DEL MÓDULO
// =============================================

const responderError = (
  res,
  error,
  mensajePredeterminado
) => {
  console.error(mensajePredeterminado, error);

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
// LISTAR CAMIONES
// =============================================

const listarCamiones = async (req, res) => {
  try {
    const camiones =
      await camionesService.listarCamiones({
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      camiones,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al listar camiones"
    );
  }
};

// =============================================
// CREAR CAMIÓN
// =============================================

const crearCamion = async (req, res) => {
  try {
    const resultado =
      await camionesService.crearCamion({
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.status(201).json({
      ok: true,
      msg: "Camión creado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al crear camión"
    );
  }
};

// =============================================
// ACTUALIZAR CAMIÓN
// =============================================

const actualizarCamion = async (
  req,
  res
) => {
  try {
    const resultado =
      await camionesService.actualizarCamion({
        idCamion: req.params.id,
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.json({
      ok: true,
      msg: "Camión actualizado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al actualizar camión"
    );
  }
};

// =============================================
// CAMBIAR ESTADO
// =============================================

const cambiarEstadoCamion = async (
  req,
  res
) => {
  try {
    const resultado =
      await camionesService.cambiarEstadoCamion({
        idCamion: req.params.id,
        estado: req.body.estado,
        usuario: req.usuario,
        req,
      });

    const activo =
      resultado.estado === 1;

    let msg;

    if (resultado.sin_cambios) {
      msg = activo
        ? "El camión ya estaba activo"
        : "El camión ya estaba inactivo";
    } else {
      msg = activo
        ? "Camión activado correctamente"
        : "Camión desactivado correctamente";
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
      "Error al cambiar estado del camión"
    );
  }
};

module.exports = {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
};