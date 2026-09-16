const service = require("./agenda.service");
const emailService = require("./agenda-email.service");

const {
  ESTADOS_CITA,
} = require("./agenda.constants");


// ======================================================
// MANEJO CENTRALIZADO DE ERRORES
// ======================================================

const responderError = (res, error) => {
  console.error("ERROR AGENDA:", error);

  return res
    .status(error.status || 500)
    .json({
      ok: false,
      code:
        error.code ||
        "AGENDA_ERROR",
      message:
        error.message ||
        "Error procesando agenda",
    });
};


// ======================================================
// FORM DATA
// ======================================================
//
// IMPORTANTE:
// No consultamos MySQL directamente desde el controller.
// El flujo correcto es:
//
// Controller -> Service -> Repository -> MySQL
//
// Así obtenerMediosContacto() puede aplicar la regla:
// id_empresa IS NULL OR id_empresa = empresa actual.
// ======================================================

const getFormData = async (req, res) => {
  try {
    const id_empresa = Number(
      req.usuario?.id_empresa
    );

    if (!id_empresa) {
      return res.status(400).json({
        ok: false,
        code: "EMPRESA_NO_VALIDA",
        message:
          "No se pudo determinar la empresa activa",
      });
    }

    const datos =
      await service.obtenerFormData(
        req.usuario
      );

    // Evita respuestas antiguas 304/cacheadas
    // durante cambios de empresa.
    res.set({
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    return res.json({
      ok: true,
      ...datos,
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// LISTAR CITAS
// ======================================================

const getCitas = async (req, res) => {
  try {
    const citas =
      await service.listarCitas(
        req.usuario,
        req.query
      );

    return res.json({
      ok: true,
      citas,
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// OBTENER DETALLE DE UNA CITA
// ======================================================

const getCita = async (req, res) => {
  try {
    const id_cita = Number(
      req.params.id_cita
    );

    if (!id_cita) {
      return res.status(400).json({
        ok: false,
        code: "CITA_NO_VALIDA",
        message:
          "El identificador de la cita no es válido",
      });
    }

    const cita =
      await service.obtenerDetalle(
        req.usuario,
        id_cita
      );

    return res.json({
      ok: true,
      cita,
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// CREAR CITA
// ======================================================

const postCita = async (req, res) => {
  try {
    const resultado =
      await service.crearCita(
        req.usuario,
        req.body
      );

    return res
      .status(201)
      .json({
        ok: true,
        message:
          "Cita registrada correctamente",
        ...resultado,
      });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// REAGENDAR CITA
// ======================================================

const reagendarCita = async (
  req,
  res
) => {
  try {
    const id_cita = Number(
      req.params.id_cita
    );

    if (!id_cita) {
      return res.status(400).json({
        ok: false,
        code: "CITA_NO_VALIDA",
        message:
          "El identificador de la cita no es válido",
      });
    }

    const cita =
      await service.reagendarCita(
        req.usuario,
        id_cita,
        req.body
      );

    return res.json({
      ok: true,
      message:
        "Cita reagendada correctamente",
      cita,
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// CANCELAR CITA
// ======================================================

const cancelarCita = async (
  req,
  res
) => {
  try {
    const id_cita = Number(
      req.params.id_cita
    );

    if (!id_cita) {
      return res.status(400).json({
        ok: false,
        code: "CITA_NO_VALIDA",
        message:
          "El identificador de la cita no es válido",
      });
    }

    await service.cambiarEstado(
      req.usuario,
      id_cita,
      ESTADOS_CITA.CANCELADA
    );

    return res.json({
      ok: true,
      message:
        "Cita cancelada correctamente",
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// COMPLETAR CITA
// ======================================================

const completarCita = async (
  req,
  res
) => {
  try {
    const id_cita = Number(
      req.params.id_cita
    );

    if (!id_cita) {
      return res.status(400).json({
        ok: false,
        code: "CITA_NO_VALIDA",
        message:
          "El identificador de la cita no es válido",
      });
    }

    await service.cambiarEstado(
      req.usuario,
      id_cita,
      ESTADOS_CITA.COMPLETADA
    );

    return res.json({
      ok: true,
      message:
        "Cita completada correctamente",
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// SEND APPOINTMENT CONFIRMATION EMAIL TO CLIENT
// ======================================================

const enviarEmailCita = async (
  req,
  res
) => {
  try {
    const id_cita =
      Number(
        req.params.id_cita
      );

    if (!id_cita) {
      return res
        .status(400)
        .json({
          ok: false,
          code:
            "CITA_NO_VALIDA",
          message:
            "El identificador de la cita no es válido",
        });
    }

    const resultado =
      await emailService
        .enviarConfirmacionCliente(
          req.usuario,
          id_cita,
          req.body
        );

    return res.json({
      ok: true,
      message:
        "Appointment confirmation sent successfully",
      ...resultado,
    });

  } catch (error) {
    return responderError(
      res,
      error
    );
  }
};


// ======================================================
// EXPORTACIONES
// ======================================================

module.exports = {
  getFormData,
  getCitas,
  getCita,
  postCita,
  reagendarCita,
  cancelarCita,
  completarCita,
  enviarEmailCita,
};
