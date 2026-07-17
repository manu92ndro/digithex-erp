const express = require("express");
const router = express.Router();

const {
  generarReciboPDF,
} = require("../controllers/recibosPDF.controller");

const {
  enviarReciboPorCorreo,
} = require("../controllers/recibosEmail.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");

router.get(
  "/rentas/:id_renta",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  generarReciboPDF
);

router.post(
  "/rentas/:id_renta/email",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  enviarReciboPorCorreo
);

module.exports = router;