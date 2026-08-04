const dumpstersService = require(
  "./dumpsters.service"
);

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

const listarDumpsters = async (
  req,
  res
) => {
  try {
    const dumpsters =
      await dumpstersService.listarDumpsters({
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      dumpsters,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al listar dumpsters"
    );
  }
};

const obtenerDumpster = async (
  req,
  res
) => {
  try {
    const dumpster =
      await dumpstersService.obtenerDumpster({
        idDumpster: req.params.id,
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      dumpster,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al obtener dumpster"
    );
  }
};

const crearDumpster = async (
  req,
  res
) => {
  try {
    const resultado =
      await dumpstersService.crearDumpster({
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.status(201).json({
      ok: true,
      msg: "Dumpster creado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al crear dumpster"
    );
  }
};

const actualizarDumpster = async (
  req,
  res
) => {
  try {
    const resultado =
      await dumpstersService.actualizarDumpster({
        idDumpster: req.params.id,
        datos: req.body,
        usuario: req.usuario,
        req,
      });

    return res.json({
      ok: true,
      msg: "Dumpster actualizado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al actualizar dumpster"
    );
  }
};

const cambiarEstadoDumpster = async (
  req,
  res
) => {
  try {
    const resultado =
      await dumpstersService.cambiarEstadoDumpster({
        idDumpster: req.params.id,
        estado: req.body.estado,
        usuario: req.usuario,
        req,
      });

    return res.json({
      ok: true,
      msg: resultado.sin_cambios
        ? `El dumpster ya estaba ${resultado.estado}`
        : "Estado actualizado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al cambiar estado del dumpster"
    );
  }
};

module.exports = {
  listarDumpsters,
  obtenerDumpster,
  crearDumpster,
  actualizarDumpster,
  cambiarEstadoDumpster,
};