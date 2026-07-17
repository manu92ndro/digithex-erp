import axios from "axios";
import { API_URL } from "../config/config";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      "";
    const url = error?.config?.url || "";

    const isLoginRequest = url.includes("/auth/login");

    console.log("API ERROR:", {
      url,
      status,
      code,
      message,
    });

    const shouldLogout =
      !isLoginRequest &&
      status === 401 &&
      (
        code === "TOKEN_NO_ENVIADO" ||
        code === "TOKEN_EXPIRADO" ||
        code === "TOKEN_NO_VALIDO"
      );

    if (shouldLogout) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;