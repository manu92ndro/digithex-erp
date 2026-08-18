const express = require("express");

const router = express.Router();

const {
  login,
  me,
  logout,
  cambiarEmpresa,
} = require("../controllers/auth.controller");

const {
  validarJWT,
} = require("../middlewares/auth.middleware");


// ======================================================
// LOGIN
// ======================================================

router.post(
  "/login",
  login
);


// ======================================================
// SESIÓN ACTUAL
// ======================================================

router.get(
  "/me",
  validarJWT,
  me
);


// ======================================================
// CAMBIAR EMPRESA ACTIVA
// ======================================================

router.post(
  "/cambiar-empresa",
  validarJWT,
  cambiarEmpresa
);


// ======================================================
// LOGOUT
// ======================================================

router.post(
  "/logout",
  validarJWT,
  logout
);


module.exports = router;