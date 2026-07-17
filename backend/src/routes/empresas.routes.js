const express = require('express');
const router = express.Router();

const {
  getEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getMiEmpresa,
  updateMiEmpresa,
  updateLogoMiEmpresa
} = require('../controllers/empresas.controller');

const { validarJWT } = require('../middlewares/auth.middleware');
const { validarPermiso } = require('../middlewares/permiso.middleware');
const { validarEstadoCuenta } = require('../middlewares/estado.middleware');

const uploadLogoEmpresa = require('../middlewares/uploadLogoEmpresa');

router.get('/perfil/mi-empresa', validarJWT, validarPermiso('perfil_empresa.ver'), getMiEmpresa);
router.put('/perfil/mi-empresa', validarJWT, validarPermiso('perfil_empresa.editar'), updateMiEmpresa);
router.put('/perfil/logo', validarJWT, validarPermiso('perfil_empresa.editar'), uploadLogoEmpresa.single('logo'), updateLogoMiEmpresa);
router.get('/',  validarJWT, validarPermiso('empresas.ver'),getEmpresas);

router.get(  '/:id', validarJWT, validarPermiso('empresas.ver'), getEmpresaById);
router.post('/', validarJWT, validarPermiso('empresas.crear'), createEmpresa);
router.put('/:id', validarJWT, validarEstadoCuenta, validarPermiso('empresas.editar'), updateEmpresa);
router.delete('/:id', validarJWT, validarPermiso('empresas.eliminar'), deleteEmpresa);

module.exports = router;