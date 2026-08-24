// ======================================================
// AGENDA - CONSTANTES
// ======================================================

const ESTADOS_CITA = {
  PROGRAMADA: "programada",
  CONFIRMADA: "confirmada",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  NO_ASISTIO: "no_asistio",
};


const ESTADOS_CITA_VALIDOS =
  Object.values(
    ESTADOS_CITA
  );


const HORA_INICIO_DEFAULT =
  "08:00";

const HORA_FIN_DEFAULT =
  "17:00";

const INTERVALO_MINUTOS_DEFAULT =
  30;

const DURACION_MINUTOS_DEFAULT =
  60;


module.exports = {
  ESTADOS_CITA,
  ESTADOS_CITA_VALIDOS,

  HORA_INICIO_DEFAULT,
  HORA_FIN_DEFAULT,

  INTERVALO_MINUTOS_DEFAULT,
  DURACION_MINUTOS_DEFAULT,
};