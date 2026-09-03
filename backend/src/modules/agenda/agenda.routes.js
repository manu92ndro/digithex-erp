const express =
  require("express");


const router =
  express.Router();


const {
  getFormData,

  getCitas,

  getCita,

  postCita,

  reagendarCita,

  cancelarCita,

  completarCita,

  enviarEmailCita,
} =
  require(
    "./agenda.controller"
  );


const {
  validarJWT,
} =
  require(
    "../../middlewares/auth.middleware"
  );


const {
  validarPermiso,
} =
  require(
    "../../middlewares/permiso.middleware"
  );


// ======================================================
// FORM DATA
// ======================================================

router.get(
  "/form-data",

  validarJWT,

  validarPermiso(
    "agenda.ver"
  ),

  getFormData
);


// ======================================================
// LISTAR
// ======================================================

router.get(
  "/",

  validarJWT,

  validarPermiso(
    "agenda.ver"
  ),

  getCitas
);


// ======================================================
// DETALLE
// ======================================================

router.get(
  "/:id_cita",

  validarJWT,

  validarPermiso(
    "agenda.ver"
  ),

  getCita
);


// ======================================================
// CREAR
// ======================================================

router.post(
  "/",

  validarJWT,

  validarPermiso(
    "agenda.crear"
  ),

  postCita
);




// ======================================================
// REAGENDAR
// ======================================================

router.patch(
  "/:id_cita/reagendar",

  validarJWT,

  validarPermiso(
    "agenda.editar"
  ),

  reagendarCita
);


// ======================================================
// CANCELAR
// ======================================================

router.patch(
  "/:id_cita/cancelar",

  validarJWT,

  validarPermiso(
    "agenda.cancelar"
  ),

  cancelarCita
);


// ======================================================
// COMPLETAR
// ======================================================

router.patch(
  "/:id_cita/completar",

  validarJWT,

  validarPermiso(
    "agenda.completar"
  ),

  completarCita
);


// ======================================================
// SEND EMAIL TO CLIENT
// Uses the company's SMTP configuration.
// ======================================================

router.post(
  "/:id_cita/email",

  validarJWT,

  validarPermiso(
    "agenda.ver"
  ),

  enviarEmailCita
);


module.exports =
  router;