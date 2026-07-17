import api from "./client";

export const getCamiones = async () => {
  const { data } = await api.get("/camiones");
  return data;
};

export const createCamion = async (payload) => {
  const { data } = await api.post("/camiones", payload);
  return data;
};

export const updateCamion = async (id, payload) => {
  const { data } = await api.put(`/camiones/${id}`, payload);
  return data;
};

export const cambiarEstadoCamion = async (id, estado) => {
  const { data } = await api.patch(`/camiones/${id}/estado`, { estado });
  return data;
};