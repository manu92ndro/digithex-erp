import api from "./client";

export const getEmpresas = async () => {
  const response = await api.get("/empresas");
  return response.data;
};

export const getEmpresaById = async (id) => {
  const response = await api.get(`/empresas/${id}`);
  return response.data;
};

export const createEmpresa = async (data) => {
  const response = await api.post("/empresas", data);
  return response.data;
};

export const updateEmpresa = async (id, data) => {
  const response = await api.put(`/empresas/${id}`, data);
  return response.data;
};

export const deleteEmpresa = async (id) => {
  const response = await api.delete(`/empresas/${id}`);
  return response.data;
};