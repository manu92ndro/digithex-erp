const express = require('express');
const router = express.Router();

const {
  cambiarPassword,
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getMiPerfil,
  updateMiPerfil,
  updateFotoMiPerfil
} = require('../controllers/usuarios.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');

const uploadFotoUsuario = require('../middlewares/uploadFotoUsuario');

router.put(
  '/perfil/cambiar-password',
  validarJWT,
  validarEstadoCuenta,
  cambiarPassword
);

router.get(
  '/perfil/mi-perfil',
  validarJWT,
  validarEstadoCuenta,
  getMiPerfil
);

router.put(
  '/perfil/mi-perfil',
  validarJWT,
  validarEstadoCuenta,
  updateMiPerfil
);

router.put(
  '/perfil/foto',
  validarJWT,
  validarEstadoCuenta,
  uploadFotoUsuario.single('foto'),
  updateFotoMiPerfil
);

router.get(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('usuarios.ver'),
  getUsuarios
);

router.get(
  '/:id',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('usuarios.ver'),
  getUsuarioById
);

router.post(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('usuarios.crear'),
  createUsuario
);

router.put(
  '/:id',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('usuarios.editar'),
  updateUsuario
);

router.delete(
  '/:id',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('usuarios.eliminar'),
  deleteUsuario
);

module.exports = router;