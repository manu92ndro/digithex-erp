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
  inactivarExtraRenta,
} = require("../controllers/rentas.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");

router.get(
  "/form-data",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.crear"),
  getRentasFormData
);

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  listarRentas
);

router.get(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  obtenerRentaDetalle
);

router.post(
  "/:id/extras",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  agregarExtraRenta
);

router.patch(
  "/:id/finalizar",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.finalizar"),
  finalizarRenta
);



router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.crear"),
  crearRenta
);

router.post(
  "/:id/pagos",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  registrarPagoRenta
);

router.patch(
  "/:id/fecha-retiro",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  actualizarFechaRetiro
);


router.patch(
  "/:id/cancelar",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.eliminar"),
  cancelarRenta
);

router.patch(
  "/extras/:id_extra/inactivar",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.editar"),
  inactivarExtraRenta
);




module.exports = router;