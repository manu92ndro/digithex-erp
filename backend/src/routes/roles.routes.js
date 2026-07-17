const express = require('express');
const router = express.Router();

const {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol
} = require('../controllers/roles.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');

router.get('/', validarJWT, validarPermiso('roles.ver'), getRoles);
router.get('/:id', validarJWT, validarPermiso('roles.ver'), getRolById);
router.post('/', validarJWT, validarPermiso('roles.crear'), createRol);
router.put('/:id', validarJWT,validarEstadoCuenta, validarPermiso('roles.editar'), updateRol);
router.delete('/:id', validarJWT, validarPermiso('roles.eliminar'), deleteRol);

module.exports = router;