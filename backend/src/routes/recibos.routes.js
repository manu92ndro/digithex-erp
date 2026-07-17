const express = require("express");
const router = express.Router();
const { enviarReciboPorCorreo } = require("../controllers/recibosEmail.controller");

const {
  generarReciboRenta,
} = require("../controllers/recibos.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");

router.get(
  "/rentas/:id_renta",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  generarReciboRenta
);

router.post(
  "/:id_renta/email",
  validarJWT,
  validarPermiso("rentas.ver"),
  enviarReciboPorCorreo
);

module.exports = router;

