const express = require("express");
const router = express.Router();

const {
  listarDumpsters,
  obtenerDumpster,
  crearDumpster,
  actualizarDumpster,
  cambiarEstadoDumpster,
} = require("../controllers/dumpsters.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("dumpsters.ver"),
  listarDumpsters
);

router.get(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("dumpsters.ver"),
  obtenerDumpster
);

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("dumpsters.crear"),
  crearDumpster
);

router.put(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("dumpsters.editar"),
  actualizarDumpster
);

router.patch(
  "/:id/estado",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("dumpsters.editar"),
  cambiarEstadoDumpster
);

module.exports = router;