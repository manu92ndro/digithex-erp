const express = require("express");
const router = express.Router();

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");

const {
  listarImpuestos,
  crearImpuesto,
  actualizarImpuesto,
  desactivarImpuesto,
} = require("../controllers/impuestos.controller");

router.get(
  "/",
  validarJWT,
  validarPermiso("company_settings.ver"),
  listarImpuestos
);

router.post(
  "/",
  validarJWT,
  validarPermiso("company_settings.editar"),
  crearImpuesto
);

router.put(
  "/:id_tax",
  validarJWT,
  validarPermiso("company_settings.editar"),
  actualizarImpuesto
);

router.delete(
  "/:id_tax",
  validarJWT,
  validarPermiso("company_settings.editar"),
  desactivarImpuesto
);

module.exports = router;