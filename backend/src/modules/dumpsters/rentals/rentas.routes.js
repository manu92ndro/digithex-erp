const express = require("express");
const router = express.Router();

const {
  getRentasFormData,
  crearRenta,
  listarRentas,
  obtenerRentaDetalle,
  agregarExtraRenta,
  finalizarRenta,
  cancelarRenta,
  registrarPagoRenta,
  actualizarFechaRetiro,
  anularExtraRenta,
  anularPagoRenta,
  obtenerCostosRenta,
  guardarCostoRenta,
} = require("./rentas.controller");

const {
  validarJWT,
} = require(
  "../../../middlewares/auth.middleware"
);

const {
  validarPermiso,
} = require(
  "../../../middlewares/permiso.middleware"
);

const {
  validarEstadoCuenta,
} = require(
  "../../../middlewares/estado.middleware"
);


// ======================================================
// COSTOS DE LA RENTA
// ======================================================

router.get(
  "/:id/costos",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  obtenerCostosRenta
);

router.put(
  "/:id/costos",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  guardarCostoRenta
);


// ======================================================
// FORM DATA
// ======================================================

router.get(
  "/form-data",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.crear"),
  getRentasFormData
);

// ======================================================
// LISTAR RENTAS
// ======================================================

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  listarRentas
);

// ======================================================
// OBTENER DETALLE
// ======================================================

router.get(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  obtenerRentaDetalle
);

// ======================================================
// CREAR RENTA
// ======================================================

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.crear"),
  crearRenta
);

// ======================================================
// AGREGAR EXTRA
// ======================================================

router.post(
  "/:id/extras",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  agregarExtraRenta
);

// ======================================================
// REGISTRAR PAGO
// ======================================================

router.post(
  "/:id/pagos",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  registrarPagoRenta
);

// ======================================================
// ANULAR PAGO
// ======================================================

router.patch(
  "/:id/pagos/:id_pago/anular",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  anularPagoRenta
);

// ======================================================
// ACTUALIZAR FECHA DE RETIRO
// ======================================================

router.patch(
  "/:id/fecha-retiro",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  actualizarFechaRetiro
);

// ======================================================
// FINALIZAR RENTA
// ======================================================

router.patch(
  "/:id/finalizar",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.finalizar"),
  finalizarRenta
);

// ======================================================
// CANCELAR RENTA
// ======================================================

router.patch(
  "/:id/cancelar",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.eliminar"),
  cancelarRenta
);

// ======================================================
// ANULAR EXTRA CON MOTIVO
// ======================================================

router.patch(
  "/extras/:id_extra/anular",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  anularExtraRenta
);

module.exports = router;