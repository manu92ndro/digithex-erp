import api from "./client";

export const getImpuestos = async () => {
  const { data } = await api.get("/impuestos");
  return data;
};

export const createImpuesto = async (payload) => {
  const { data } = await api.post("/impuestos", payload);
  return data;
};

export const updateImpuesto = async (id_tax, payload) => {
  const { data } = await api.put(`/impuestos/${id_tax}`, payload);
  return data;
};

export const disableImpuesto = async (id_tax) => {
  const { data } = await api.delete(`/impuestos/${id_tax}`);
  return data;
};