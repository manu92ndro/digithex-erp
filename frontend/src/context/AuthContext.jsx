import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";

import {
  loginUser,
  getMe,
  logoutUser,
} from "../api/auth";

import useAutoLogout from "../hooks/useAutoLogout";

const AuthContext = createContext(null);

const AUTO_REFRESH =
  import.meta.env.VITE_AUTO_REFRESH_SESSION === "true";

const REFRESH_TIME =
  Number(import.meta.env.VITE_REFRESH_SESSION_TIME) || 30000;

const leerUsuarioGuardado = () => {
  try {
    const valor = localStorage.getItem("usuario");

    if (
      !valor ||
      valor === "undefined" ||
      valor === "null" ||
      valor === "[object Object]"
    ) {
      localStorage.removeItem("usuario");
      return null;
    }

    const usuario = JSON.parse(valor);

    if (
      !usuario ||
      typeof usuario !== "object" ||
      Array.isArray(usuario)
    ) {
      localStorage.removeItem("usuario");
      return null;
    }

    return usuario;
  } catch (error) {
    console.error(
      "ERROR LEYENDO USUARIO GUARDADO:",
      error
    );

    localStorage.removeItem("usuario");
    return null;
  }
};

const guardarUsuario = (usuario) => {
  if (
    !usuario ||
    typeof usuario !== "object" ||
    Array.isArray(usuario)
  ) {
    localStorage.removeItem("usuario");
    return;
  }

  localStorage.setItem(
    "usuario",
    JSON.stringify(usuario)
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    leerUsuarioGuardado
  );

  const [loading, setLoading] = useState(true);

  const limpiarSesion = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        limpiarSesion();
        return null;
      }

      const res = await getMe();
      const usuario = res.usuario;

      if (!usuario) {
        limpiarSesion();
        return null;
      }

      guardarUsuario(usuario);
      setUser(usuario);

      return usuario;
    } catch (error) {
      console.error(
        "ERROR REFRESCANDO USUARIO:",
        error
      );

      limpiarSesion();
      return null;
    }
  }, [limpiarSesion]);

  useEffect(() => {
    let activo = true;

    const inicializarSesion = async () => {
      try {
        const token = localStorage.getItem("token");
        const usuarioGuardado = leerUsuarioGuardado();

        if (!token) {
          limpiarSesion();
          return;
        }

        if (usuarioGuardado && activo) {
          setUser(usuarioGuardado);
        }

        await refreshUser();
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    };

    inicializarSesion();

    return () => {
      activo = false;
    };
  }, [refreshUser, limpiarSesion]);

  useEffect(() => {
    if (!user || !AUTO_REFRESH) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      refreshUser();
    }, REFRESH_TIME);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, refreshUser]);

  const login = useCallback(
    async (credentials) => {
      try {
        const response = await loginUser(credentials);

        const usuario = response.usuario;
        const token = response.token;

        if (!usuario || !token) {
          limpiarSesion();

          return {
            ok: false,
            message:
              "La respuesta del inicio de sesión no es válida",
          };
        }

        localStorage.setItem("token", token);
        guardarUsuario(usuario);
        setUser(usuario);

        return {
          ok: true,
          usuario,
        };
      } catch (error) {
        console.error(
          "ERROR INICIANDO SESIÓN:",
          error
        );

        limpiarSesion();

        return {
          ok: false,
          message:
            error.response?.data?.message ||
            error.response?.data?.msg ||
            "Correo o contraseña incorrectos",
        };
      }
    },
    [limpiarSesion]
  );

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        await logoutUser();
      }
    } catch (error) {
      console.error(
        "ERROR CERRANDO SESIÓN:",
        error
      );
    } finally {
      limpiarSesion();
    }
  }, [limpiarSesion]);

  useAutoLogout(
    logout,
    Boolean(user)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};