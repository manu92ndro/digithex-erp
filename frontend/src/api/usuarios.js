import api from "./client";


// LISTAR
export const getUsuarios = async () => {
  const response = await api.get("/usuarios");
  return response.data;
};

// OBTENER
export const getUsuarioById = async (id) => {
  const response = await api.get(`/usuarios/${id}`);
  return response.data;
};

// CREAR
export const createUsuario = async (data) => {
  const response = await api.post("/usuarios", data);
  return response.data;
};

// ACTUALIZAR
export const updateUsuario = async (id, data) => {
  const response = await api.put(`/usuarios/${id}`, data);
  return response.data;
};

// ELIMINAR
export const deleteUsuario = async (id) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};