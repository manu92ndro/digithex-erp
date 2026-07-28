const express = require("express");
const router = express.Router();
const uploadQr = require("../middlewares/uploadQr.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  obtenerConfiguracionEmpresa,
  actualizarConfiguracionEmpresa,
  probarCorreoEmpresa,
  updateQrEmpresa
} = require("../controllers/companySettings.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");

const qrDir = path.join(process.cwd(), "uploads/qr");

if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
}

const storageQR = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, qrDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `qr-${req.usuario.id_empresa}-${Date.now()}${ext}`);
  },
});

const uploadQR = multer({ storage: storageQR });

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.ver"),
  obtenerConfiguracionEmpresa
);

router.put(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  actualizarConfiguracionEmpresa
);

router.post(
  "/email/test",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  probarCorreoEmpresa
);


router.put(
  "/qr",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  uploadQr.single("qr"),
  updateQrEmpresa
);

module.exports = router;