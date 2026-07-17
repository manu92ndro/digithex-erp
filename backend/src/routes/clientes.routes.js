const express = require('express');
const router = express.Router();

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');

const {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
} = require('../controllers/clientes.controller');

router.get(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('clientes.ver'),
  listarClientes
);

router.get(
  '/:id',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('clientes.ver'),
  obtenerCliente
);

router.post(
  '/',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('clientes.crear'),
  crearCliente
);

router.put(
  '/:id',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('clientes.editar'),
  actualizarCliente
);

router.patch(
  '/:id/estado',
  validarJWT,
  validarEstadoCuenta,
  validarPermiso('clientes.eliminar'),
  cambiarEstadoCliente
);

module.exports = router;