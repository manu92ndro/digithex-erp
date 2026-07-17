import api from "./client";

export const getPermisos = async () => {
  const response = await api.get("/permisos");
  return response.data;
};

export const getPermisosByRol = async (idRol) => {
  const response = await api.get(`/permisos/rol/${idRol}`);
  return response.data;
};

export const updatePermisosRol = async (idRol, permisos) => {
  const response = await api.put(`/permisos/rol/${idRol}`, {
    permisos
  });

  return response.data;
};