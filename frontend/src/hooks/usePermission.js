import { useAuth } from "../context/AuthContext";

export default function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    return user?.permisos?.includes(permission) ?? false;
  };

  return {
    user,
    permisos: user?.permisos || [],
    hasPermission,
  };
}