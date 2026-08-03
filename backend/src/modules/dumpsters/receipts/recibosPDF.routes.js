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
  verReciboPDF,
} = require("./recibosPDF.controller");

// =====================================
// VER / REIMPRIMIR RECIBO PDF
// GET /api/recibos-pdf/rentas/:id_renta
// =====================================

router.get(
  "/rentas/:id_renta",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("rentas.ver"),
  verReciboPDF
);

module.exports = router;