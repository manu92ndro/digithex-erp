const express = require('express');
const router = express.Router();

const {
  getDashboard
} = require('../controllers/dashboard.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');

router.get(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('dashboard.ver'),
  getDashboard
);

module.exports = router;