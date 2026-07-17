import api from "./client";

export const getRentasFormData = async () => {
  const { data } = await api.get("/rentas/form-data");
  return data;
};

export const getRentas = async () => {
  const { data } = await api.get("/rentas");
  return data;
};

export const createRenta = async (payload) => {
  const { data } = await api.post("/rentas", payload);
  return data;
};

export const getRentaDetalle = async (id) => {
  const { data } = await api.get(`/rentas/${id}`);
  return data;
};

export const addExtraRenta = async (id, payload) => {
  const { data } = await api.post(`/rentas/${id}/extras`, payload);
  return data;
};

export const finalizarRenta = async (id) => {
  const { data } = await api.patch(`/rentas/${id}/finalizar`);
  return data;
};

export const cancelarRenta = async (id, data = {}) => {
  const res = await api.patch(`/rentas/${id}/cancelar`, data);
  return res.data;
};

export const registrarPagoRenta = async (id, payload) => {
  const { data } = await api.post(`/rentas/${id}/pagos`, payload);
  return data;
};

export const actualizarFechaRetiro = async (id, payload) => {
  const { data } = await api.patch(`/rentas/${id}/fecha-retiro`, payload);
  return data;
};

export const eliminarExtraRenta = async (idExtra) => {
  const { data } = await api.patch(`/rentas/extras/${idExtra}/inactivar`);
  return data;
};

export const enviarReciboCorreo = async (id_renta, correo = null) => {
  const { data } = await api.post(`/recibos/${id_renta}/email`, {
    correo,
  });

  return data;
};