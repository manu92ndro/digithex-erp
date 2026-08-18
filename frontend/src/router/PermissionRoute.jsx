import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PermissionRoute({
  permission,
  children,
}) {
  const {
    user,
    loading,
    cambiandoEmpresa,
  } = useAuth();

  const token =
    localStorage.getItem("token");

  // ======================================================
  // CARGANDO SESIÓN / CAMBIO DE EMPRESA
  // ======================================================

  if (
    loading ||
    cambiandoEmpresa
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">
          Cargando...
        </p>
      </div>
    );
  }

  // ======================================================
  // SIN SESIÓN
  // ======================================================

  if (!token || !user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // ======================================================
  // PERMISOS
  // ======================================================

  const permisos =
    Array.isArray(user.permisos)
      ? user.permisos
      : [];

  const hasPermission =
    permisos.includes(
      permission
    );

  

  // ======================================================
  // SIN PERMISO
  // ======================================================

  if (!hasPermission) {
    return (
      <Navigate
        to="/403"
        replace
      />
    );
  }

  return children;
}