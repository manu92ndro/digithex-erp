import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  loginUser,
  getMe,
  logoutUser,
  cambiarEmpresaUser,
} from "../api/auth";

import useAutoLogout from "../hooks/useAutoLogout";


// ======================================================
// CONTEXT
// ======================================================

const AuthContext =
  createContext(null);


// ======================================================
// CONFIGURACIÓN
// ======================================================

const AUTO_REFRESH =
  import.meta.env
    .VITE_AUTO_REFRESH_SESSION ===
  "true";

const REFRESH_TIME =
  Number(
    import.meta.env
      .VITE_REFRESH_SESSION_TIME
  ) || 30000;


// ======================================================
// LEER USUARIO GUARDADO
// ======================================================

const leerUsuarioGuardado = () => {
  try {

    const valor =
      localStorage.getItem(
        "usuario"
      );


    if (
      !valor ||
      valor === "undefined" ||
      valor === "null" ||
      valor === "[object Object]"
    ) {

      localStorage.removeItem(
        "usuario"
      );

      return null;
    }


    const usuario =
      JSON.parse(valor);


    if (
      !usuario ||
      typeof usuario !==
        "object" ||
      Array.isArray(usuario)
    ) {

      localStorage.removeItem(
        "usuario"
      );

      return null;
    }


    return usuario;

  } catch (error) {

    console.error(
      "ERROR LEYENDO USUARIO GUARDADO:",
      error
    );


    localStorage.removeItem(
      "usuario"
    );


    return null;
  }
};


// ======================================================
// GUARDAR USUARIO
// ======================================================

const guardarUsuario = (
  usuario
) => {

  if (
    !usuario ||
    typeof usuario !==
      "object" ||
    Array.isArray(usuario)
  ) {

    localStorage.removeItem(
      "usuario"
    );

    return;
  }


  localStorage.setItem(
    "usuario",
    JSON.stringify(usuario)
  );
};


// ======================================================
// HOOK
// ======================================================

export const useAuth = () => {

  const context =
    useContext(
      AuthContext
    );


  if (!context) {

    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }


  return context;
};


// ======================================================
// PROVIDER
// ======================================================

export const AuthProvider = ({
  children,
}) => {

  // ====================================================
  // ESTADOS
  // ====================================================

  const [user, setUser] =
    useState(
      leerUsuarioGuardado
    );


  const [loading, setLoading] =
    useState(true);


  const [
    cambiandoEmpresa,
    setCambiandoEmpresa,
  ] =
    useState(false);


  // ====================================================
  // LIMPIAR SESIÓN
  // ====================================================

  const limpiarSesion =
    useCallback(() => {

      setUser(null);

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "usuario"
      );

    }, []);


  // ====================================================
  // ACTUALIZAR USUARIO EN MEMORIA + STORAGE
  // ====================================================

  const actualizarUsuario =
    useCallback(
      (usuario) => {

        if (!usuario) {

          limpiarSesion();

          return null;
        }


        guardarUsuario(
          usuario
        );


        setUser(
          usuario
        );


        return usuario;
      },
      [
        limpiarSesion,
      ]
    );


  // ====================================================
  // REFRESH USER
  // ====================================================

  const refreshUser =
    useCallback(
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );


          if (!token) {

            limpiarSesion();

            return null;
          }


          const res =
            await getMe();


          const usuario =
            res?.usuario;


          if (!usuario) {

            limpiarSesion();

            return null;
          }


          actualizarUsuario(
            usuario
          );


          return usuario;

        } catch (error) {

          console.error(
            "ERROR REFRESCANDO USUARIO:",
            error
          );


          limpiarSesion();


          return null;
        }
      },
      [
        limpiarSesion,
        actualizarUsuario,
      ]
    );


  // ====================================================
  // INICIALIZAR SESIÓN
  // ====================================================

  useEffect(() => {

    let activo = true;


    const inicializarSesion =
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );


          const usuarioGuardado =
            leerUsuarioGuardado();


          if (!token) {

            limpiarSesion();

            return;
          }


          /*
           * Mostramos inmediatamente
           * el usuario guardado.
           *
           * Luego /auth/me verifica
           * la sesión con el backend.
           */
          if (
            usuarioGuardado &&
            activo
          ) {

            setUser(
              usuarioGuardado
            );
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

  }, [
    refreshUser,
    limpiarSesion,
  ]);


  // ====================================================
  // AUTO REFRESH
  // ====================================================

  useEffect(() => {

    if (
      !user ||
      !AUTO_REFRESH
    ) {

      return undefined;
    }


    const interval =
      window.setInterval(
        () => {

          /*
           * No refrescamos mientras
           * se está cambiando empresa.
           */
          if (
            !cambiandoEmpresa
          ) {

            refreshUser();
          }

        },
        REFRESH_TIME
      );


    return () => {

      window.clearInterval(
        interval
      );
    };

  }, [
    user,
    refreshUser,
    cambiandoEmpresa,
  ]);


  // ====================================================
  // LOGIN
  // ====================================================

  const login =
    useCallback(
      async (
        credentials
      ) => {

        try {

          const response =
            await loginUser(
              credentials
            );


          const usuario =
            response?.usuario;


          const token =
            response?.token;


          if (
            !usuario ||
            !token
          ) {

            limpiarSesion();


            return {
              ok: false,

              message:
                "La respuesta del inicio de sesión no es válida",
            };
          }


          // =============================================
          // GUARDAR NUEVO TOKEN
          // =============================================

          localStorage.setItem(
            "token",
            token
          );


          actualizarUsuario(
            usuario
          );


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
              error.response
                ?.data
                ?.message ||
              error.response
                ?.data
                ?.msg ||
              "Correo o contraseña incorrectos",
          };
        }
      },
      [
        limpiarSesion,
        actualizarUsuario,
      ]
    );


  // ====================================================
  // CAMBIAR EMPRESA
  // ====================================================

  const cambiarEmpresa =
    useCallback(
      async (
        idEmpresa
      ) => {

        const id_empresa =
          Number(
            idEmpresa
          );


        // ===============================================
        // VALIDAR ID
        // ===============================================

        if (
          !Number.isInteger(
            id_empresa
          ) ||
          id_empresa <= 0
        ) {

          return {
            ok: false,

            message:
              "Empresa inválida",
          };
        }


        // ===============================================
        // YA ESTAMOS EN ESA EMPRESA
        // ===============================================

        if (
          Number(
            user?.id_empresa
          ) ===
          id_empresa
        ) {

          return {
            ok: true,

            usuario:
              user,

            sinCambios:
              true,
          };
        }


        // ===============================================
        // COMPROBAR QUE ESTÉ ENTRE SUS EMPRESAS
        // ===============================================

        const empresaPermitida =
          user?.empresas?.some(
            (empresa) =>
              Number(
                empresa.id_empresa
              ) ===
              id_empresa
          );


        if (
          !empresaPermitida
        ) {

          return {
            ok: false,

            message:
              "No tiene acceso a esta empresa",
          };
        }


        try {

          setCambiandoEmpresa(
            true
          );


          // =============================================
          // BACKEND VALIDA NUEVAMENTE LA ASIGNACIÓN
          // =============================================

          const response =
            await cambiarEmpresaUser(
              id_empresa
            );          

          const nuevoToken =
            response?.token;


          const nuevoUsuario =
            response?.usuario;


          if (
            !nuevoToken ||
            !nuevoUsuario
          ) {

            return {
              ok: false,

              message:
                "No se pudo actualizar la empresa activa",
            };
          }


          // =============================================
          // MUY IMPORTANTE:
          // reemplazar primero el JWT.
          // =============================================

          localStorage.setItem(
            "token",
            nuevoToken
          );


          // =============================================
          // ACTUALIZAR USUARIO
          // =============================================

          actualizarUsuario(
            nuevoUsuario
          );


          return {
            ok: true,

            usuario:
              nuevoUsuario,
          };

        } catch (error) {

          console.error(
            "ERROR CAMBIANDO EMPRESA:",
            error
          );


          /*
           * IMPORTANTE:
           *
           * No cerramos la sesión si falla
           * solamente el cambio de empresa.
           *
           * El usuario puede continuar
           * trabajando en la empresa actual.
           */

          return {
            ok: false,

            message:
              error.response
                ?.data
                ?.message ||
              error.response
                ?.data
                ?.msg ||
              "No se pudo cambiar de empresa",
          };

        } finally {

          setCambiandoEmpresa(
            false
          );
        }
      },
      [
        user,
        actualizarUsuario,
      ]
    );


  // ====================================================
  // LOGOUT
  // ====================================================

  const logout =
    useCallback(
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );


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
      },
      [
        limpiarSesion,
      ]
    );


  // ====================================================
  // AUTO LOGOUT
  // ====================================================

  useAutoLogout(
    logout,
    Boolean(user)
  );


  // ====================================================
  // DATOS MULTIEMPRESA CALCULADOS
  // ====================================================

  const empresas =
    useMemo(
      () =>
        Array.isArray(
          user?.empresas
        )
          ? user.empresas
          : [],
      [
        user?.empresas,
      ]
    );


  const empresaActiva =
    useMemo(
      () => {

        if (!user) {
          return null;
        }


        return (
          empresas.find(
            (empresa) =>
              Number(
                empresa.id_empresa
              ) ===
              Number(
                user.id_empresa
              )
          ) || {
            id_empresa:
              user.id_empresa,

            nombre_empresa:
              user.nombre_empresa,

            logo:
              user.logo_empresa,

            id_rol:
              user.id_rol,

            rol:
              user.rol,
          }
        );
      },
      [
        empresas,
        user,
      ]
    );


  const tieneVariasEmpresas =
    empresas.length > 1;


  // ====================================================
  // VALUE
  // ====================================================

  const value =
    useMemo(
      () => ({
        // USUARIO
        user,

        // SESIÓN
        loading,

        isAuthenticated:
          Boolean(user),

        // AUTH
        login,

        logout,

        refreshUser,

        // MULTIEMPRESA
        empresas,

        empresaActiva,

        tieneVariasEmpresas,

        cambiarEmpresa,

        cambiandoEmpresa,

        // AUTORIZACIÓN
        permisos:
          user?.permisos ||
          [],

        modulos:
          user?.modulos ||
          [],
      }),
      [
        user,
        loading,
        login,
        logout,
        refreshUser,
        empresas,
        empresaActiva,
        tieneVariasEmpresas,
        cambiarEmpresa,
        cambiandoEmpresa,
      ]
    );


  // ====================================================
  // PROVIDER
  // ====================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};