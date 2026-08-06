const express = require("express");
const router = express.Router();

const {
  validarJWT,
} = require("../../../middlewares/auth.middleware");

const {
  validarPermiso,
} = require("../../../middlewares/permiso.middleware");

const {
  validarEstadoCuenta,
} = require("../../../middlewares/estado.middleware");

const {
  listarImpuestos,
  crearImpuesto,
  actualizarImpuesto,
  desactivarImpuesto,
} = require("./impuestos.controller");

// ===============================
// LISTAR IMPUESTOS
// ===============================

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.ver"),
  listarImpuestos
);

// ===============================
// CREAR IMPUESTO
// ===============================

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  crearImpuesto
);

// ===============================
// ACTUALIZAR IMPUESTO
// ===============================

router.put(
  "/:id_tax",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  actualizarImpuesto
);

// ===============================
// DESACTIVAR IMPUESTO
// ===============================

router.delete(
  "/:id_tax",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  desactivarImpuesto
);

module.exports = router;