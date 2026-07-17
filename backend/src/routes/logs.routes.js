const express = require('express');
const router = express.Router();

const {
  getLogs,
  exportLogsExcel
} = require('../controllers/logs.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');

router.get(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('logs.ver'),
  getLogs
);

router.get(
  '/export/excel',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('logs.ver'),
  exportLogsExcel
);

module.exports = router;