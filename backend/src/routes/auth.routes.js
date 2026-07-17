const express = require("express");
const router = express.Router();

const {
  login,
  me,
  logout
} = require("../controllers/auth.controller");

const { validarJWT } = require("../middlewares/auth.middleware");

router.post("/login", login);

router.get(
  "/me",
  validarJWT,
  me
);

router.post(
  "/logout",
  validarJWT,
  logout
);

module.exports = router;