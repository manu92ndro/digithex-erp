const express = require("express");
const router = express.Router();

const {
  validarJWT,
} = require("../../../middlewares/auth.middleware");

const {
  validarEstadoCuenta,
} = require("../../../middlewares/estado.middleware");

const {
  validarPermiso,
} = require("../../../middlewares/permiso.middleware");

const {
  enviarReciboPorCorreo,
} = require("./recibosEmail.controller");

// ===============================
// ENVIAR RECIBO POR CORREO
// ===============================

router.post(
  "/rentas/:id_renta/email",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  enviarReciboPorCorreo
);

module.exports = router;