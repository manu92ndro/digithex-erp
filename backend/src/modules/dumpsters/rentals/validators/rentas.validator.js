const { RentaError, validarId, numero } = require("../utils/rentas.utils");

const validarCrearRenta = (datos = {}) => {
  const requeridos = [
    "id_cliente",
    "id_dumpster",
    "id_camion",
    "id_material",
    "id_ubicacion",
    "fecha_inicio",
    "dias_renta",
    "fecha_estimada_devolucion",
    "precio_base",
    "estado_pago",
  ];

  const faltantes = requeridos.filter(
    (campo) => datos[campo] === undefined || datos[campo] === null || datos[campo] === ""
  );

  if (faltantes.length > 0) {
    throw new RentaError(
      `Faltan datos obligatorios: ${faltantes.join(", ")}`,
      400,
      "DATOS_OBLIGATORIOS"
    );
  }

  const ids = {
    idCliente: validarId(datos.id_cliente, "ID del cliente"),
    idDumpster: validarId(datos.id_dumpster, "ID del dumpster"),
    idCamion: validarId(datos.id_camion, "ID del camión"),
    idMaterial: validarId(datos.id_material, "ID del material"),
    idUbicacion: validarId(datos.id_ubicacion, "ID de la ubicación"),
  };

  const diasRenta = Number(datos.dias_renta);
  if (!Number.isInteger(diasRenta) || diasRenta <= 0) {
    throw new RentaError("Los días de renta son inválidos", 400, "DIAS_INVALIDOS");
  }

  const precioBase = numero(datos.precio_base, NaN);
  if (!Number.isFinite(precioBase) || precioBase <= 0) {
    throw new RentaError("El precio base es inválido", 400, "PRECIO_INVALIDO");
  }

  return { ...ids, diasRenta, precioBase };
};

const validarExtra = (datos = {}) => {
  const tipoExtra = String(datos.tipo_extra || "").trim();
  const monto = numero(datos.monto, 0);

  if (!tipoExtra) {
    throw new RentaError("Selecciona el tipo de extra", 400, "TIPO_EXTRA_REQUERIDO");
  }
  if (monto <= 0) {
    throw new RentaError("Ingresa un monto válido", 400, "MONTO_INVALIDO");
  }

  return {
    tipoExtra,
    descripcion: String(datos.descripcion || "").trim() || null,
    monto,
  };
};

const validarPago = (datos = {}) => {
  const montoPago = numero(datos.monto_abonado, 0);
  const tipoPago = String(datos.tipo_pago || "").trim();
  const taxPago = datos.aplicar_tax_pago ? numero(datos.tax_pago, 0) : 0;

  if (montoPago <= 0 || !tipoPago) {
    throw new RentaError(
      "Monto y método de pago son obligatorios",
      400,
      "PAGO_INVALIDO"
    );
  }
  if (taxPago < 0) {
    throw new RentaError("El tax no puede ser negativo", 400, "TAX_INVALIDO");
  }

  return {
    montoPago,
    tipoPago,
    taxPago,
    observaciones: String(datos.observaciones || "").trim() || null,
    conceptos: Array.isArray(datos.conceptos) ? datos.conceptos : [],
  };
};

module.exports = {
  validarCrearRenta,
  validarExtra,
  validarPago,
};
