const catalogosRepository = require(
  "../repositories/rentas-catalogos.repository"
);

const queryRepository = require(
  "../repositories/rentas-query.repository"
);

const {
  RentaError,
  obtenerIdEmpresa,
  validarId,
} = require("../utils/rentas.utils");

// ======================================================
// FORM DATA
// ======================================================

const obtenerFormData = async ({
  usuario,
  query,
  body,
}) => {
  const idEmpresa = obtenerIdEmpresa({
    usuario,
    query,
    body,
  });

  const [
    clientes,
    dumpsters,
    camiones,
    materiales,
    ubicaciones,
    impuesto,
  ] = await Promise.all([
    catalogosRepository.obtenerClientesActivos(
      idEmpresa
    ),

    catalogosRepository.obtenerDumpstersDisponibles(
      idEmpresa
    ),

    catalogosRepository.obtenerCamionesActivos(
      idEmpresa
    ),

    catalogosRepository.obtenerMateriales(),

    catalogosRepository.obtenerUbicaciones(),

    catalogosRepository.obtenerImpuestoActivo(
      idEmpresa
    ),
  ]);

  return {
    clientes,
    dumpsters,
    camiones,
    materiales,
    ubicaciones,
    impuesto,
  };
};

// ======================================================
// LISTAR RENTAS
// ======================================================

const listarRentas = async ({
  usuario,
  query = {},
}) => {
  const idEmpresa = obtenerIdEmpresa({
    usuario,
    query,
  });

  return queryRepository.listar(
    idEmpresa
  );
};

// ======================================================
// OBTENER DETALLE
// ======================================================

const obtenerDetalle = async ({
  idRenta,
  usuario,
  query = {},
}) => {
  const id = validarId(
    idRenta,
    "ID de la renta"
  );

  const idEmpresa = obtenerIdEmpresa({
    usuario,
    query,
  });

  const renta =
    await queryRepository.obtenerDetalle({
      idRenta: id,
      idEmpresa,
    });

  if (!renta) {
    throw new RentaError(
      "Renta no encontrada",
      404,
      "RENTA_NO_ENCONTRADA"
    );
  }

  const [
    pagos,
    extras,
    detallesPago,
  ] = await Promise.all([
    queryRepository.obtenerPagos({
      idRenta: id,
      idEmpresa,
    }),

    queryRepository.obtenerExtras({
      idRenta: id,
      idEmpresa,
    }),

    queryRepository.obtenerDetallesPago({
      idRenta: id,
      idEmpresa,
    }),
  ]);

  return {
    renta,
    pagos,
    extras,

    // Esta propiedad la usará Rentas.jsx
    detalles_pago: detallesPago,
  };
};

module.exports = {
  obtenerFormData,
  listarRentas,
  obtenerDetalle,
};