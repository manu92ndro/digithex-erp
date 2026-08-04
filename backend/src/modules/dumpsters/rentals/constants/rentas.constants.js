const ESTADOS_RENTA = Object.freeze({
  PROGRAMADA: "programada",
  PENDIENTE: "pendiente",
  EN_USO: "en_uso",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado",
});

const ESTADOS_RENTA_CERRADA = Object.freeze([
  ESTADOS_RENTA.FINALIZADO,
  ESTADOS_RENTA.CANCELADO,
]);

const ESTADOS_PAGO = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  PARTIAL: "partial",
  PENDIENTE: "pendiente",
  PAGADO: "pagado",
  PARCIAL: "parcial",
  ANULADO: "anulado",
});

module.exports = {
  ESTADOS_RENTA,
  ESTADOS_RENTA_CERRADA,
  ESTADOS_PAGO,
};
