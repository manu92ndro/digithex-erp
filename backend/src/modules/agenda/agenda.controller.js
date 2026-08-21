const pool = require("../../config/db");

const service = require("./agenda.service");

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

const getFormData = async (req, res) => {
  try {
    // ==================================================
    // EMPRESA ACTIVA
    // ==================================================

    const id_empresa = Number(
      req.usuario.id_empresa
    );

    if (!id_empresa) {
      return res.status(400).json({
        ok: false,
        code: "EMPRESA_NO_VALIDA",
        message:
          "No se pudo determinar la empresa activa",
      });
    }


    // ==================================================
    // MEDIOS DE CONTACTO
    // ==================================================

    const [mediosContacto] =
      await pool.query(
        `
        SELECT
          id_medio,
          id_empresa,
          nombre,
          estado
        FROM tb_agenda_medios_contacto
        WHERE id_empresa = ?
          AND estado = 1
        ORDER BY nombre ASC
        `,
        [id_empresa]
      );


    // ==================================================
    // TIPOS DE CITA
    // ==================================================

    const [tiposCita] =
      await pool.query(
        `
        SELECT
          id_tipo_cita,
          id_empresa,
          nombre,
          duracion_minutos,
          estado
        FROM tb_agenda_tipos_cita
        WHERE id_empresa = ?
          AND estado = 1
        ORDER BY nombre ASC
        `,
        [id_empresa]
      );


    // ==================================================
    // USUARIOS DE LA EMPRESA
    // ==================================================

    const [usuarios] =
      await pool.query(
        `
        SELECT DISTINCT
          u.id_usuario,
          u.nombres,
          r.id_rol,
          r.rol

        FROM tb_usuarios u

        INNER JOIN tb_usuarios_empresas ue
          ON ue.id_usuario = u.id_usuario

        INNER JOIN tb_roles r
          ON r.id_rol = ue.id_rol

        WHERE ue.id_empresa = ?
          AND ue.estado = 1
          AND u.estado = 1
          AND r.estado = 1

        ORDER BY u.nombres ASC
        `,
        [id_empresa]
      );


    // ==================================================
    // RESPUESTA
    // ==================================================

    return res.json({
      ok: true,

      medios_contacto:
        mediosContacto,

      tipos_cita:
        tiposCita,

      usuarios,

      configuracion: {
        hora_inicio: "08:00",
        hora_fin: "17:00",
        intervalo_minutos: 30,
      },
    });

  } catch (error) {
    console.error(
      "ERROR GET FORM DATA AGENDA:",
      error
    );

    return res.status(500).json({
      ok: false,
      code: "AGENDA_FORM_DATA_ERROR",
      message:
        "Error cargando datos de la agenda",
    });
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
// EXPORTACIONES
// ======================================================

module.exports = {
  getFormData,
  getCitas,
  getCita,
  postCita,
  cancelarCita,
  completarCita,
};