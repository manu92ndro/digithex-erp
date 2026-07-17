import api from "./client";

export const getDumpsters = async () => {
  const { data } = await api.get("/dumpsters");
  return data;
};

export const getDumpsterById = async (id) => {
  const { data } = await api.get(`/dumpsters/${id}`);
  return data;
};

export const createDumpster = async (payload) => {
  const { data } = await api.post("/dumpsters", payload);
  return data;
};

export const updateDumpster = async (id, payload) => {
  const { data } = await api.put(`/dumpsters/${id}`, payload);
  return data;
};

export const cambiarEstadoDumpster = async (id, estado) => {
  const { data } = await api.patch(`/dumpsters/${id}/estado`, { estado });
  return data;
};