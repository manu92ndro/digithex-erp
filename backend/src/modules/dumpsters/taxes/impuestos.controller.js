const impuestosService = require(
  "./impuestos.service"
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

const listarImpuestos = async (
  req,
  res
) => {
  try {
    const impuestos =
      await impuestosService.listarImpuestos({
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      impuestos,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error listando impuestos"
    );
  }
};

const crearImpuesto = async (
  req,
  res
) => {
  try {
    const resultado =
      await impuestosService.crearImpuesto({
        datos: req.body,
        usuario: req.usuario,
      });

    return res.status(201).json({
      ok: true,
      msg: "Impuesto creado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error creando impuesto"
    );
  }
};

const actualizarImpuesto = async (
  req,
  res
) => {
  try {
    const resultado =
      await impuestosService.actualizarImpuesto({
        idTax: req.params.id_tax,
        datos: req.body,
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      msg: "Impuesto actualizado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error actualizando impuesto"
    );
  }
};

const desactivarImpuesto = async (
  req,
  res
) => {
  try {
    const resultado =
      await impuestosService.desactivarImpuesto({
        idTax: req.params.id_tax,
        usuario: req.usuario,
      });

    return res.json({
      ok: true,
      msg: resultado.sin_cambios
        ? "El impuesto ya estaba desactivado"
        : "Impuesto desactivado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "Error desactivando impuesto"
    );
  }
};

module.exports = {
  listarImpuestos,
  crearImpuesto,
  actualizarImpuesto,
  desactivarImpuesto,
};