import api from "./client";

export const getAgendaFormData = async () => {
  const { data } = await api.get(
    "/agenda/form-data"
  );

  return data;
};


export const getAgendaCitas = async ({
  fecha_desde,
  fecha_hasta,
  asignado_a = null,
}) => {
  const { data } = await api.get(
    "/agenda",
    {
      params: {
        fecha_desde,
        fecha_hasta,
        asignado_a:
          asignado_a || undefined,
      },
    }
  );

  return data;
};


export const getAgendaCita = async (
  id_cita
) => {
  const { data } = await api.get(
    `/agenda/${id_cita}`
  );

  return data;
};


export const createAgendaCita = async (
  payload
) => {
  const { data } = await api.post(
    "/agenda",
    payload
  );

  return data;
};


export const reagendarAgendaCita = async (
  id_cita,
  payload
) => {
  const { data } = await api.patch(
    `/agenda/${id_cita}/reagendar`,
    payload
  );

  return data;
};


export const cancelarAgendaCita = async (
  id_cita
) => {
  const { data } = await api.patch(
    `/agenda/${id_cita}/cancelar`
  );

  return data;
};


export const completarAgendaCita = async (
  id_cita
) => {
  const { data } = await api.patch(
    `/agenda/${id_cita}/completar`
  );

  return data;
};

// ======================================================
// SEND APPOINTMENT EMAIL TO CLIENT
// ======================================================

export const enviarAgendaCitaEmail = async (
  id_cita,
  correo = null
) => {
  const { data } = await api.post(
    `/agenda/${id_cita}/email`,
    {
      correo:
        correo || undefined,
    }
  );

  return data;
};
