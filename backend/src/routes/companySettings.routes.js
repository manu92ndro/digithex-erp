const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  obtenerConfiguracionEmpresa,
  actualizarConfiguracionEmpresa,
  probarCorreoEmpresa,
} = require("../controllers/companySettings.controller");

const { validarJWT } = require("../middlewares/auth.middleware");
const { validarEstadoCuenta } = require("../middlewares/estado.middleware");
const { validarPermiso } = require("../middlewares/permiso.middleware");

const qrDir = path.join(__dirname, "../uploads/qr");

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

router.post(
  "/qr",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("company_settings.editar"),
  uploadQR.single("qr"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          msg: "No se recibió imagen QR",
        });
      }

      const id_empresa = req.usuario.id_empresa;

      await require("../config/db").query(
        `
        UPDATE tb_empresa_configuracion
        SET qr_imagen = ?,
            mostrar_qr = 1,
            fyh_actualizacion = NOW()
        WHERE id_empresa = ?
        `,
        [req.file.filename, id_empresa]
      );

      res.json({
        ok: true,
        qr_imagen: req.file.filename,
        msg: "QR actualizado correctamente",
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Error subiendo QR",
        error: error.message,
      });
    }
  }
);

module.exports = router;