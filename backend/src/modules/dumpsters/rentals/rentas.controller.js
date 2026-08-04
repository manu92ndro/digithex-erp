const queryService = require("./services/rentas-query.service");
const creationService = require("./services/rentas-creation.service");
const extraService = require("./services/rentas-extra.service");
const operationService = require("./services/rentas-operation.service");
const paymentService = require("./services/rentas-payment.service");

const responderError = (res, error, mensajePredeterminado) => {
  console.error(mensajePredeterminado, error);
  return res.status(error.status || 500).json({
    ok: false,
    code: error.code || "ERROR_INTERNO",
    msg: error.status ? error.message : mensajePredeterminado,
  });
};

const getRentasFormData = async (req, res) => {
  try {
    const resultado = await queryService.obtenerFormData({
      usuario: req.usuario,
      query: req.query,
      body: req.body,
    });
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al cargar datos del formulario de renta");
  }
};

const listarRentas = async (req, res) => {
  try {
    const rentas = await queryService.listarRentas({
      usuario: req.usuario,
      query: req.query,
    });
    return res.json({ ok: true, rentas });
  } catch (error) {
    return responderError(res, error, "Error al listar rentas");
  }
};

const obtenerRentaDetalle = async (req, res) => {
  try {
    const resultado = await queryService.obtenerDetalle({
      idRenta: req.params.id,
      usuario: req.usuario,
      query: req.query,
    });
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al obtener detalle de la renta");
  }
};

const crearRenta = async (req, res) => {
  try {
    const resultado = await creationService.crearRenta({
      datos: req.body,
      usuario: req.usuario,
      req,
    });
    return res.status(201).json({
      ok: true,
      msg: "Renta creada correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(res, error, "Error al crear renta");
  }
};

const agregarExtraRenta = async (req, res) => {
  try {
    const resultado = await extraService.agregarExtra({
      idRenta: req.params.id,
      datos: req.body,
      usuario: req.usuario,
      req,
    });
    return res.json({
      ok: true,
      msg: "Cargo extra agregado correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(res, error, "Error al agregar cargo extra");
  }
};

const finalizarRenta = async (req, res) => {
  try {
    const resultado = await operationService.finalizarRenta({
      idRenta: req.params.id,
      usuario: req.usuario,
      req,
    });
    return res.json({ ok: true, msg: "Renta finalizada correctamente", ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al finalizar renta");
  }
};

const cancelarRenta = async (req, res) => {
  try {
    const resultado = await operationService.cancelarRenta({
      idRenta: req.params.id,
      datos: req.body,
      usuario: req.usuario,
      req,
    });
    return res.json({ ok: true, msg: "Renta cancelada correctamente", ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al cancelar renta");
  }
};

const registrarPagoRenta = async (req, res) => {
  try {
    const resultado = await paymentService.registrarPago({
      idRenta: req.params.id,
      datos: req.body,
      usuario: req.usuario,
      req,
    });
    return res.json({ ok: true, msg: "Pago registrado correctamente", ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al registrar pago");
  }
};

const actualizarFechaRetiro = async (req, res) => {
  try {
    const resultado = await operationService.actualizarFechaRetiro({
      idRenta: req.params.id,
      datos: req.body,
      usuario: req.usuario,
      req,
    });
    return res.json({ ok: true, msg: "Fecha de retiro actualizada correctamente", ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al actualizar fecha de retiro");
  }
};

const inactivarExtraRenta = async (req, res) => {
  try {
    const resultado = await extraService.inactivarExtra({
      idExtra: req.params.id_extra,
      usuario: req.usuario,
      req,
    });
    return res.json({ ok: true, msg: "Cargo extra anulado correctamente", ...resultado });
  } catch (error) {
    return responderError(res, error, "Error al anular cargo extra");
  }
};

module.exports = {
  getRentasFormData,
  listarRentas,
  crearRenta,
  obtenerRentaDetalle,
  agregarExtraRenta,
  finalizarRenta,
  cancelarRenta,
  registrarPagoRenta,
  actualizarFechaRetiro,
  inactivarExtraRenta,
};
