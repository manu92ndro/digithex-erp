import api from "./client";


// ======================================================
// LOGIN
// ======================================================

export const loginUser = async (
  credentials
) => {
  const { data } =
    await api.post(
      "/auth/login",
      credentials
    );

  return data;
};


// ======================================================
// ME
// ======================================================

export const getMe = async () => {
  const { data } =
    await api.get(
      "/auth/me"
    );

  return data;
};


// ======================================================
// CAMBIAR EMPRESA
// ======================================================

export const cambiarEmpresaUser = async (
  id_empresa
) => {
  const { data } =
    await api.post(
      "/auth/cambiar-empresa",
      {
        id_empresa:
          Number(id_empresa),
      }
    );

  return data;
};


// ======================================================
// LOGOUT
// ======================================================

export const logoutUser = async () => {
  const { data } =
    await api.post(
      "/auth/logout"
    );

  return data;
};