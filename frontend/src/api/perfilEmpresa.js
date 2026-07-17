import api from "./client";

export const getMiEmpresa = async () => {
  const response = await api.get("/empresas/perfil/mi-empresa");
  return response.data;
};

export const updateMiEmpresa = async (data) => {
  const response = await api.put("/empresas/perfil/mi-empresa", data);
  return response.data;
};

export const updateLogoMiEmpresa = async (file) => {
  const formData = new FormData();

  formData.append("logo", file);

  const response = await api.put(
    "/empresas/perfil/logo",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
};