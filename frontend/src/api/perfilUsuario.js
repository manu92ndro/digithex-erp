import api from "./client";

export const getMiPerfil = async () => {
  const response = await api.get("/usuarios/perfil/mi-perfil");
  return response.data;
};

export const updateMiPerfil = async (data) => {
  const response = await api.put("/usuarios/perfil/mi-perfil", data);
  return response.data;
};

export const cambiarPassword = async (data) => {
  const response = await api.put(
    "/usuarios/perfil/cambiar-password",
    data
  );

  return response.data;
};
export const updateFotoMiPerfil = async (file) => {
  const formData = new FormData();

  formData.append("foto", file);

  const response = await api.put(
    "/usuarios/perfil/foto",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
};
