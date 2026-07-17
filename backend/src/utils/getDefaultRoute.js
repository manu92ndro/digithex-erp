export const getDefaultRoute = (user) => {
  const modulos = user?.modulos || [];

  if (modulos.length > 0) {
    return modulos[0].ruta;
  }

  return "/perfil";
};