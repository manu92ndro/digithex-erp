const express = require('express');
const router = express.Router();

const {
  getPermisos,
  getPermisosByRol,
  updatePermisosRol
} = require('../controllers/permisos.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');

router.get('/', validarJWT, validarPermiso('roles.ver'), getPermisos);
router.get('/rol/:id_rol', validarJWT, validarPermiso('roles.ver'), getPermisosByRol);
router.put('/rol/:id_rol', validarJWT, validarEstadoCuenta, validarPermiso('roles.editar'), updatePermisosRol);

module.exports = router;