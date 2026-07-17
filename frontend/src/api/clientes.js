import api from "./client";

export const getClientes = async () => {
  const { data } = await api.get("/clientes");
  return data;
};

export const getClienteById = async (id) => {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
};

export const createCliente = async (cliente) => {
  const { data } = await api.post("/clientes", cliente);
  return data;
};

export const updateCliente = async (id, cliente) => {
  const { data } = await api.put(`/clientes/${id}`, cliente);
  return data;
};

export const cambiarEstadoCliente = async (id, estado) => {
  const { data } = await api.patch(`/clientes/${id}/estado`, { estado });
  return data;
};