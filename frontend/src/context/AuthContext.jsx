import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";

import { loginUser, getMe, logoutUser } from "../api/auth";
import useAutoLogout from "../hooks/useAutoLogout";

const AuthContext = createContext();

const AUTO_REFRESH =
  import.meta.env.VITE_AUTO_REFRESH_SESSION === "true";

const REFRESH_TIME =
  Number(import.meta.env.VITE_REFRESH_SESSION_TIME) || 30000;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const limpiarSesion = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) return null;

      const res = await getMe();

      setUser(res.usuario);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));

      return res.usuario;
    } catch (error) {
      console.error("ERROR REFRESCANDO USUARIO:", error);
      limpiarSesion();
      return null;
    }
  }, [limpiarSesion]);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      setUser(JSON.parse(usuarioGuardado));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!AUTO_REFRESH) return;

    const interval = setInterval(() => {
      refreshUser();
    }, REFRESH_TIME);

    return () => clearInterval(interval);
  }, [user, refreshUser]);

  const login = async (credentials) => {
    try {
      const response = await loginUser(credentials);

      const usuario = response.usuario;
      const token = response.token;

      localStorage.setItem("token", token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      setUser(usuario);

      return {
        ok: true,
        usuario,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error.response?.data?.message ||
          "Correo o contraseña incorrectos",
      };
    }
  };

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        await logoutUser();
      }
    } catch (error) {
      console.error("ERROR CERRANDO SESIÓN:", error);
    } finally {
      limpiarSesion();
    }
  }, [limpiarSesion]);

  useAutoLogout(logout, !!user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};