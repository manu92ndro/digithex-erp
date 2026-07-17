const validarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para esta acción'
      });
    }

    next();
  };
};

module.exports = {
  validarRol
};