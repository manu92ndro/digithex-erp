// ======================================================
// RUTA INICIAL SEGURA
// ======================================================
//
// Prioridad:
// 1. Usuario dentro de la empresa
// 2. Rol
// 3. Empresa
// 4. Primer módulo permitido por el rol
// 5. Perfil
//
// IMPORTANTE:
// Una ruta configurada solo se usa si el módulo aparece
// dentro de user.modulos. De esta forma nunca enviamos al
// usuario a un módulo para el que no tiene permiso *.ver.
// ======================================================

const normalizarId = (valor) => {
  const id = Number(valor);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
};

const getDefaultRoute = (user = {}) => {
  const modulos = Array.isArray(user?.modulos)
    ? user.modulos.filter((modulo) => modulo?.ruta)
    : [];

  const prioridades = [
    normalizarId(user.id_modulo_inicio_usuario),
    normalizarId(user.id_modulo_inicio_rol),
    normalizarId(user.id_modulo_inicio_empresa),
  ].filter(Boolean);

  for (const idModulo of prioridades) {
    const moduloPermitido = modulos.find(
      (modulo) =>
        Number(modulo.id_modulo) === idModulo
    );

    if (moduloPermitido?.ruta) {
      return moduloPermitido.ruta;
    }
  }

  if (modulos[0]?.ruta) {
    return modulos[0].ruta;
  }

  return "/perfil";
};

module.exports = {
  getDefaultRoute,
};
