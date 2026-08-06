const express = require("express");
const router = express.Router();

const {
  listarCamiones,
  crearCamion,
  actualizarCamion,
  cambiarEstadoCamion,
} = require("./camiones.controller");

const {
  validarJWT,
} = require("../../../middlewares/auth.middleware");

const {
  validarPermiso,
} = require("../../../middlewares/permiso.middleware");

const {
  validarEstadoCuenta,
} = require("../../../middlewares/estado.middleware");

// ===============================
// LISTAR CAMIONES
// ===============================

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.ver"),
  listarCamiones
);

// ===============================
// CREAR CAMIÓN
// ===============================

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.crear"),
  crearCamion
);

// ===============================
// ACTUALIZAR CAMIÓN
// ===============================

router.put(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.editar"),
  actualizarCamion
);

// ===============================
// CAMBIAR ESTADO
// ===============================

router.patch(
  "/:id/estado",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("camiones.editar"),
  cambiarEstadoCamion
);

module.exports = router;