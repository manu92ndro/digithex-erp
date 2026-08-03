const express = require("express");
const router = express.Router();

const {
  validarJWT,
} = require("../../../middlewares/auth.middleware");

const {
  validarPermiso,
} = require("../../../middlewares/permiso.middleware");

const {
  validarEstadoCuenta,
} = require("../../../middlewares/estado.middleware");

const {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
} = require("./clientes.controller");

// ===============================
// LISTAR CLIENTES
// ===============================

router.get(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("clientes.ver"),
  listarClientes
);

// ===============================
// OBTENER CLIENTE
// ===============================

router.get(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("clientes.ver"),
  obtenerCliente
);

// ===============================
// CREAR CLIENTE
// ===============================

router.post(
  "/",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("clientes.crear"),
  crearCliente
);

// ===============================
// ACTUALIZAR CLIENTE
// ===============================

router.put(
  "/:id",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("clientes.editar"),
  actualizarCliente
);

// ===============================
// CAMBIAR ESTADO
// ===============================

router.patch(
  "/:id/estado",
  validarJWT,
  validarEstadoCuenta,
  validarPermiso("clientes.eliminar"),
  cambiarEstadoCliente
);

module.exports = router;