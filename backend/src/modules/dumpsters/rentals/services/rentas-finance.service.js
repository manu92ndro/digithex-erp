const {
  RentaError,
  money,
} = require("../utils/rentas.utils");

// ======================================================
// NORMALIZAR TAX RATE
// Permite recibir 65 o 0.65.
// Ambos representan 65%.
// ======================================================

const normalizarTaxRate = (valor) => {
  const rate = Number(valor || 0);

  if (
    !Number.isFinite(rate) ||
    rate < 0
  ) {
    return 0;
  }

  return rate > 1
    ? rate / 100
    : rate;
};

// ======================================================
// VALIDAR MONTO
// ======================================================

const validarMonto = (
  valor,
  nombre = "El monto",
  {
    permitirCero = true,
  } = {}
) => {
  const monto = money(valor);

  if (!Number.isFinite(monto)) {
    throw new RentaError(
      `${nombre} no es válido`,
      400,
      "MONTO_INVALIDO"
    );
  }

  if (monto < 0) {
    throw new RentaError(
      `${nombre} no puede ser negativo`,
      400,
      "MONTO_NEGATIVO"
    );
  }

  if (
    !permitirCero &&
    monto <= 0
  ) {
    throw new RentaError(
      `${nombre} debe ser mayor que cero`,
      400,
      "MONTO_DEBE_SER_MAYOR_CERO"
    );
  }

  return monto;
};

// ======================================================
// CALCULAR TAX
// ======================================================

const calcularTax = ({
  montoBase,
  taxRate,
  aplicaTax = false,
}) => {
  const base = validarMonto(
    montoBase,
    "El monto base"
  );

  if (!aplicaTax || base <= 0) {
    return 0;
  }

  const rate =
    normalizarTaxRate(taxRate);

  return money(base * rate);
};

// ======================================================
// CALCULAR TOTAL COBRADO
// ======================================================

const calcularTotalCobrado = ({
  montoBase,
  taxMonto,
}) => {
  const base = validarMonto(
    montoBase,
    "El monto base"
  );

  const tax = validarMonto(
    taxMonto,
    "El impuesto"
  );

  return money(base + tax);
};

// ======================================================
// CALCULAR NUEVO SALDO
//
// El saldo representa base pendiente.
// El tax cobrado no reduce ni aumenta el saldo base.
// ======================================================


const financeRepository = require(
  "../repositories/rentas-finance.repository"
);

const calcularNuevoSaldo = ({
  saldoActual,
  montoBasePagado,
}) => {
  const saldo = validarMonto(
    saldoActual,
    "El saldo actual"
  );

  const pagoBase = validarMonto(
    montoBasePagado,
    "El pago base"
  );

  if (pagoBase > saldo + 0.01) {
    throw new RentaError(
      `El pago base ($${pagoBase.toFixed(
        2
      )}) no puede superar el saldo pendiente ($${saldo.toFixed(
        2
      )})`,
      400,
      "PAGO_MAYOR_SALDO"
    );
  }

  return money(
    Math.max(
      saldo - pagoBase,
      0
    )
  );
};

// ======================================================
// CALCULAR PAGO
//
// Devuelve:
// - monto base
// - tax
// - total cobrado
// - saldo restante
// - estado
// ======================================================

const calcularPago = ({
  saldoActual,
  montoBase,
  taxRate = 0,
  aplicaTax = false,
}) => {
  const base = validarMonto(
    montoBase,
    "El monto base del pago",
    {
      permitirCero: false,
    }
  );

  const taxMonto = calcularTax({
    montoBase: base,
    taxRate,
    aplicaTax,
  });

  const totalCobrado =
    calcularTotalCobrado({
      montoBase: base,
      taxMonto,
    });

  const nuevoSaldo =
    calcularNuevoSaldo({
      saldoActual,
      montoBasePagado: base,
    });

  return {
    montoBase: base,
    taxRate:
      normalizarTaxRate(taxRate),
    taxMonto,
    totalCobrado,
    nuevoSaldo,
    estadoPago:
      nuevoSaldo <= 0
        ? "pagado"
        : "parcial",
  };
};

// ======================================================
// SUMAR CONCEPTOS
// ======================================================

const sumarConceptos = (
  conceptos = []
) => {
  if (!Array.isArray(conceptos)) {
    throw new RentaError(
      "Los conceptos del pago no son válidos",
      400,
      "CONCEPTOS_INVALIDOS"
    );
  }

  return money(
    conceptos.reduce(
      (total, concepto) =>
        total +
        Number(
          concepto.montoBase ??
            concepto.monto_base ??
            concepto.total ??
            0
        ),
      0
    )
  );
};

// ======================================================
// DISTRIBUIR TAX ENTRE CONCEPTOS
//
// El último concepto absorbe la diferencia de redondeo.
// ======================================================

const distribuirTaxEntreConceptos = (
  conceptos,
  taxTotal
) => {
  if (
    !Array.isArray(conceptos) ||
    conceptos.length === 0
  ) {
    return [];
  }

  const impuesto = validarMonto(
    taxTotal,
    "El impuesto total"
  );

  const baseTotal =
    sumarConceptos(conceptos);

  if (baseTotal <= 0) {
    throw new RentaError(
      "La base total de los conceptos debe ser mayor que cero",
      400,
      "BASE_CONCEPTOS_INVALIDA"
    );
  }

  if (impuesto <= 0) {
    return conceptos.map(
      (concepto) => {
        const montoBase = money(
          concepto.montoBase ??
            concepto.monto_base ??
            concepto.total ??
            0
        );

        return {
          ...concepto,
          montoBase,
          taxMonto: 0,
          totalCobrado:
            montoBase,
        };
      }
    );
  }

  let taxDistribuido = 0;

  return conceptos.map(
    (concepto, index) => {
      const montoBase = money(
        concepto.montoBase ??
          concepto.monto_base ??
          concepto.total ??
          0
      );

      const esUltimo =
        index ===
        conceptos.length - 1;

      const taxMonto = esUltimo
        ? money(
            impuesto -
              taxDistribuido
          )
        : money(
            (montoBase /
              baseTotal) *
              impuesto
          );

      taxDistribuido = money(
        taxDistribuido +
          taxMonto
      );

      return {
        ...concepto,
        montoBase,
        taxMonto,
        totalCobrado:
          money(
            montoBase +
              taxMonto
          ),
      };
    }
  );
};

// ======================================================
// VALIDAR CONSISTENCIA DE UN PAGO
// ======================================================

const validarConsistenciaPago = ({
  detalles,
  montoPago,
  taxPago,
}) => {
  if (
    !Array.isArray(detalles) ||
    detalles.length === 0
  ) {
    throw new RentaError(
      "El pago debe contener al menos un detalle",
      400,
      "DETALLES_PAGO_REQUERIDOS"
    );
  }

  const totalBase = money(
    detalles.reduce(
      (total, detalle) =>
        total +
        Number(
          detalle.montoBase ??
            detalle.monto_base ??
            0
        ),
      0
    )
  );

  const totalTax = money(
    detalles.reduce(
      (total, detalle) =>
        total +
        Number(
          detalle.taxMonto ??
            detalle.tax_monto ??
            0
        ),
      0
    )
  );

  const totalDetalles = money(
    detalles.reduce(
      (total, detalle) =>
        total +
        Number(
          detalle.totalCobrado ??
            detalle.total_cobrado ??
            0
        ),
      0
    )
  );

  const pagoEsperado =
    validarMonto(
      montoPago,
      "El total del pago",
      {
        permitirCero: false,
      }
    );

  const taxEsperado =
    validarMonto(
      taxPago,
      "El tax del pago"
    );

  if (
    Math.abs(
      totalTax -
        taxEsperado
    ) > 0.01
  ) {
    throw new RentaError(
      `El tax de los detalles ($${totalTax.toFixed(
        2
      )}) no coincide con el tax del pago ($${taxEsperado.toFixed(
        2
      )})`,
      400,
      "TAX_DETALLES_NO_COINCIDE"
    );
  }

  if (
    Math.abs(
      totalDetalles -
        pagoEsperado
    ) > 0.01
  ) {
    throw new RentaError(
      `El total de los detalles ($${totalDetalles.toFixed(
        2
      )}) no coincide con el total cobrado ($${pagoEsperado.toFixed(
        2
      )})`,
      400,
      "TOTAL_DETALLES_NO_COINCIDE"
    );
  }

  return {
    totalBase,
    totalTax,
    totalCobrado:
      totalDetalles,
  };
};

// ======================================================
// CALCULAR RESUMEN FINANCIERO
// ======================================================

const calcularResumenFinanciero = ({
  subtotalBase,
  totalExtras = 0,
  taxAmount = 0,
  totalBasePagada = 0,
}) => {
  const subtotal = validarMonto(
    subtotalBase,
    "El subtotal base"
  );

  const extras = validarMonto(
    totalExtras,
    "El total de extras"
  );

  const tax = validarMonto(
    taxAmount,
    "El total de impuestos"
  );

  const basePagada = validarMonto(
    totalBasePagada,
    "La base pagada"
  );

  const totalBase = money(
    subtotal + extras
  );

  const totalFinal = money(
    totalBase + tax
  );

  const saldoPendiente = money(
    Math.max(
      totalBase -
        basePagada,
      0
    )
  );

  

  return {
    subtotalBase: subtotal,
    totalExtras: extras,
    taxAmount: tax,
    totalBase,
    totalFinal,
    totalBasePagada:
      basePagada,
    saldoPendiente,
  };
};

// ======================================================
// RECALCULAR FINANZAS DESDE MOVIMIENTOS REALES
// ======================================================

const recalcularFinanzasRenta = async (
  conn,
  {
    idRenta,
    idEmpresa,
  }
) => {
  const finanzas =
    await financeRepository.bloquearFinanzas(
      conn,
      {
        idRenta,
        idEmpresa,
      }
    );

  if (!finanzas) {
    throw new RentaError(
      "Finanzas de renta no encontradas",
      404,
      "FINANZAS_NO_ENCONTRADAS"
    );
  }

  const [
    totalExtras,
    totalBasePagada,
    totalTax,
  ] = await Promise.all([
    financeRepository.sumarExtrasActivos(
      conn,
      {
        idRenta,
        idEmpresa,
      }
    ),

    financeRepository.sumarBasePagada(
      conn,
      {
        idRenta,
        idEmpresa,
      }
    ),

    financeRepository.sumarTaxPagado(
      conn,
      {
        idRenta,
        idEmpresa,
      }
    ),
  ]);

  const subtotalBase = money(
    finanzas.subtotal_base
  );

  const extras = money(
    totalExtras
  );

  const basePagada = money(
    totalBasePagada
  );

  const taxAmount = money(
    totalTax
  );

  const totalBase = money(
    subtotalBase + extras
  );

  const totalFinal = money(
    totalBase + taxAmount
  );

  const saldoPendiente = money(
    Math.max(
      totalBase - basePagada,
      0
    )
  );

  const actualizadas =
    await financeRepository.actualizarFinanzas(
      conn,
      {
        idRenta,
        idEmpresa,
        totalExtras: extras,
        taxAmount,
        totalFinal,
        saldoPendiente,
      }
    );

  if (Number(actualizadas) !== 1) {
    throw new RentaError(
      "No se pudieron recalcular las finanzas de la renta",
      500,
      "FINANZAS_NO_RECALCULADAS"
    );
  }

  return {
    subtotalBase,
    totalExtras: extras,
    totalBase,
    totalBasePagada: basePagada,
    taxAmount,
    totalFinal,
    saldoPendiente,
  };
};

module.exports = {
  normalizarTaxRate,
  validarMonto,
  calcularTax,
  calcularTotalCobrado,
  calcularNuevoSaldo,
  calcularPago,
  sumarConceptos,
  distribuirTaxEntreConceptos,
  validarConsistenciaPago,
  calcularResumenFinanciero,
  recalcularFinanzasRenta,

};