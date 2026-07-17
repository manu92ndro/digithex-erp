const express = require("express");
const router = express.Router();

const {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
} = require("../controllers/camiones.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.ver"),
  listarCamiones
);

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.crear"),
  crearCamion
);

router.put(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.editar"),
  actualizarCamion
);

router.patch(
  "/:id/estado",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.eliminar"),
  cambiarEstadoCamion
);

module.exports = router;