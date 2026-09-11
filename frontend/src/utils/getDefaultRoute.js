// ======================================================
// RUTA INICIAL DEL USUARIO
// ======================================================
//
// Prioridad:
// 1. ruta_inicio calculada por backend
// 2. primer módulo permitido
// 3. /perfil
// ======================================================

export const getDefaultRoute = (user) => {
  const modulos = Array.isArray(user?.modulos)
    ? user.modulos.filter((modulo) => modulo?.ruta)
    : [];

  const rutaInicio = String(
    user?.ruta_inicio || ""
  ).trim();

  if (rutaInicio) {
    const rutaPermitida =
      modulos.length === 0 ||
      modulos.some(
        (modulo) =>
          String(modulo.ruta || "").trim() === rutaInicio
      );

    if (rutaPermitida) {
      return rutaInicio;
    }
  }

  if (modulos[0]?.ruta) {
    return modulos[0].ruta;
  }

  return "/perfil";
};
