const PDFDocument = require("pdfkit");
const axios = require("axios");
const sharp = require("sharp");
const db = require("../config/db");

// ============================================================
// TRADUCCIONES
// ============================================================

const getReceiptLabels = (lang) => {
  const labels = {
    es: {
      address: "Dirección",
      phone: "Teléfono",
      phone1: "Teléfono 1",
      phone2: "Teléfono 2",
      email: "Email",
      scanQr: "ESCANEAR QR",

      receiptTitle: "COMPROBANTE DE RENTA",
      receipt: "Recibo",

      customerInfo: "INFORMACIÓN DEL CLIENTE",
      rentalDetails: "DETALLES DE LA RENTA",

      customer: "Cliente",
      delivery: "Dirección de entrega",

      dumpster: "Dumpster",
      size: "Tamaño",
      capacity: "Capacidad",
      truck: "Camión",

      start: "Inicio",
      return: "Devolución estimada",
      notes: "Observaciones",

      paymentSummary: "RESUMEN DE PAGOS",
      baseRental: "Renta base",
      extras: "Extras",
      tax: "Impuesto",
      total: "TOTAL",
      paid: "Pagado",
      balanceDue: "SALDO PENDIENTE",

      extraCharges: "CARGOS EXTRAS",
      noExtras: "Sin cargos extras",

      paymentMethod: "MÉTODO DE PAGO",
      method: "Método",
      status: "Estado",

      pendingStatus: "PENDIENTE",
      paidStatus: "PAGADO",

      terms: "TÉRMINOS Y CONDICIONES",
      rentalTerms: "TÉRMINOS DE RENTA",
      cancellationPolicy: "POLÍTICA DE CANCELACIÓN",
      damagePolicy: "POLÍTICA DE DAÑOS",
      prohibitedMaterials: "MATERIALES PROHIBIDOS",
      receiptInstructions: "INSTRUCCIONES DEL RECIBO",

      signatureCustomer: "Firma del cliente",
      signatureCompany: "Firma de la empresa",

      thankYou: "Gracias por confiar en nosotros",
      receiptFooter: "Información adicional del servicio",

      yard: "Yard",
      ton: "Ton",

      date: "Fecha",
      receiptNumber: "Recibo #",
    },

    en: {
      address: "Address",
      phone: "Phone",
      phone1: "Phone 1",
      phone2: "Phone 2",
      email: "Email",
      scanQr: "SCAN QR",

      receiptTitle: "RENTAL RECEIPT",
      receipt: "Receipt",

      customerInfo: "CUSTOMER INFORMATION",
      rentalDetails: "RENTAL DETAILS",

      customer: "Customer",
      delivery: "Delivery address",

      dumpster: "Dumpster",
      size: "Size",
      capacity: "Capacity",
      truck: "Truck",

      start: "Start",
      return: "Estimated return",
      notes: "Notes",

      paymentSummary: "PAYMENT SUMMARY",
      baseRental: "Base rental",
      extras: "Extras",
      tax: "Tax",
      total: "TOTAL",
      paid: "Paid",
      balanceDue: "BALANCE DUE",

      extraCharges: "EXTRA CHARGES",
      noExtras: "No extra charges",

      paymentMethod: "PAYMENT METHOD",
      method: "Method",
      status: "Status",

      pendingStatus: "PENDING",
      paidStatus: "PAID",

      terms: "TERMS AND CONDITIONS",
      rentalTerms: "RENTAL TERMS",
      cancellationPolicy: "CANCELLATION POLICY",
      damagePolicy: "DAMAGE POLICY",
      prohibitedMaterials: "PROHIBITED MATERIALS",
      receiptInstructions: "RECEIPT INSTRUCTIONS",

      signatureCustomer: "Customer signature",
      signatureCompany: "Company signature",

      thankYou: "Thank you for trusting us",
      receiptFooter: "Additional service information",

      yard: "Yard",
      ton: "Ton",

      date: "Date",
      receiptNumber: "Receipt #",
    },
  };

  return labels[lang] || labels.es;
};

// ============================================================
// FECHA + HORA
// ============================================================

const formatDateTime = (date, lang = "es") => {
  if (!date) return "-";

  const d = new Date(date);

  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  });
};

const formatDate = (date, lang = "es") => {
  if (!date) return "-";

  const d = new Date(date);

  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ============================================================
// MONEDA
// ============================================================

const money = (amount) => {
  if (amount === null || amount === undefined) {
    return "$0.00";
  }

  return `$${Number(amount).toFixed(2)}`;
};

// ============================================================
// TEXTO SEGURO
// ============================================================

const safeText = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "-";
  }

  return String(value);
};

// ============================================================
// ROW - REDUCIDO PARA AHORRAR ESPACIO
// ============================================================

const drawRow = (
  doc,
  label,
  value,
  x,
  y,
  labelWidth = 80,
  valueWidth = 100
) => {
  doc
    .fillColor("#4b5563")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(`${label}:`, x, y, {
      width: labelWidth,
    });

  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(7)
    .text(safeText(value), x + labelWidth, y, {
      width: valueWidth,
    });

  return y + 14; // Reducido de 16 a 14
};

// ============================================================
// BOX - REDUCIDO PARA AHORRAR ESPACIO
// ============================================================

const drawBox = (doc, x, y, width, height) => {
  doc
    .rect(x, y, width, height)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();
};

// ============================================================
// TITULO DE SECCIÓN - REDUCIDO
// ============================================================

const drawTitle = (
  doc,
  title,
  x,
  y,
  width,
  color
) => {
  doc
    .rect(x + 8, y - 8, width - 16, 16)
    .fill(color);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(title, x + 13, y - 3, {
      width: width - 26,
      align: "left",
    });
};

// ============================================================
// BADGE
// ============================================================

const drawBadge = (
  doc,
  text,
  x,
  y,
  color
) => {
  const width = Math.max(55, text.length * 5 + 18);

  doc
    .roundedRect(x, y - 4, width, 15, 7)
    .fill(color);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text(text, x + 8, y, {
      width: width - 16,
      align: "center",
    });

  return width;
};

// ============================================================
// FOOTER PROFESIONAL - MÁS COMPACTO
// ============================================================

const drawProfessionalFooter = (
  doc,
  config,
  primary,
  secondary,
  companyName,
  L,
  id_renta,
  pageNumber,
  totalPages
) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const footerHeight = 50; // Reducido de 58 a 50
  const y = pageHeight - footerHeight - 10; // Margen inferior

  // Línea superior
  doc
    .moveTo(24, y)
    .lineTo(pageWidth - 24, y)
    .strokeColor(primary)
    .lineWidth(1)
    .stroke();

  // Fondo muy suave
  doc
    .rect(24, y + 1, pageWidth - 48, footerHeight - 1)
    .fill("#f8fafc");

  // Línea decorativa secundaria
  doc
    .moveTo(24, y)
    .lineTo(130, y)
    .strokeColor(secondary)
    .lineWidth(1.5)
    .stroke();

  // ----------------------------------------------------------
  // IZQUIERDA: Receipt Footer
  // ----------------------------------------------------------

  const footerText = config.pie_recibo || "";

  doc
    .fillColor("#475569")
    .font("Helvetica-Bold")
    .fontSize(6)
    .text(L.receiptFooter, 34, y + 8, {
      width: 190,
    });

  if (footerText && String(footerText).trim()) {
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(6)
      .text(String(footerText), 34, y + 18, {
        width: 190,
        height: 20,
        ellipsis: true,
      });
  }

  // ----------------------------------------------------------
  // DERECHA: Gracias + empresa + número de recibo
  // ----------------------------------------------------------

  doc
    .fillColor(primary)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(L.thankYou, 350, y + 7, {
      width: 205,
      align: "right",
    });

  doc
    .fillColor("#334155")
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text(companyName, 350, y + 18, {
      width: 205,
      align: "right",
    });

  // Número de recibo, fecha y página
  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(5.5)
    .text(
      `${L.receiptNumber}${String(id_renta).padStart(4, "0")} • ${formatDateTime(new Date(), config.idioma_default)}`,
      350,
      y + 29,
      {
        width: 205,
        align: "right",
      }
    );
};

// ============================================================
// LOGO
// ============================================================

const loadImageBuffer = async (url) => {
  if (!url) return null;

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    return await sharp(Buffer.from(response.data))
      .png()
      .toBuffer();
  } catch (error) {
    console.error("Error cargando imagen:", error.message);
    return null;
  }
};

// ============================================================
// CONTENIDO LEGAL
// ============================================================

const drawLegalBlock = (
  doc,
  title,
  text,
  x,
  y,
  width,
  primary
) => {
  if (!text || !String(text).trim()) {
    return y;
  }

  doc
    .fillColor(primary)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(title, x, y, {
      width,
    });

  const titleHeight = doc.heightOfString(title, {
    width,
  });

  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(6.5)
    .text(String(text), x, y + titleHeight + 3, {
      width,
      align: "justify",
      lineGap: 2,
    });

  const textHeight = doc.heightOfString(String(text), {
    width,
    lineGap: 2,
  });

  return y + titleHeight + textHeight + 10;
};

// ============================================================
// FIRMA
// ============================================================

const drawSignatureBox = (
  doc,
  x,
  y,
  width,
  title,
  primary
) => {
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .strokeColor("#94a3b8")
    .lineWidth(0.7)
    .stroke();

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(6.5)
    .text(title, x, y + 5, {
      width,
      align: "center",
    });

  doc
    .fillColor(primary)
    .font("Helvetica-Bold")
    .fontSize(5.5)
    .text("________________________________", x, y - 13, {
      width,
      align: "center",
    });
};

// ============================================================
// VERIFICAR SI HAY CONTENIDO LEGAL
// ============================================================

const hasLegalContent = (config) => {
  const fields = [
    config.terminos_renta,
    config.politica_cancelacion,
    config.politica_danos,
    config.materiales_prohibidos,
    config.instrucciones_recibo,
  ];

  return fields.some(field => field && String(field).trim());
};

// ============================================================
// PÁGINA 1 - RECIBO (COMPACTA)
// ============================================================

const drawPage1 = async ({
  doc,
  config,
  renta,
  extras,
  pagos,
  logoBuffer,
  qrBuffer,
  L,
  primary,
  secondary,
  dark,
  companyName,
  id_renta,
}) => {
  // ----------------------------------------------------------
  // HEADER (REDUCIDO)
  // ----------------------------------------------------------

  doc
    .rect(0, 0, doc.page.width, 130) // Reducido de 145 a 130
    .fill("#ffffff");

  if (logoBuffer) {
    doc.image(logoBuffer, 28, 15, {
      fit: [130, 65], // Reducido
    });
  } else {
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(companyName, 28, 30, {
        width: 130,
      });
  }

  // Separador
  doc
    .moveTo(185, 15)
    .lineTo(185, 90)
    .strokeColor("#cbd5e1")
    .lineWidth(0.8)
    .stroke();

  // Información empresa
  let infoY = 22;

  if (config.direccion) {
    infoY = drawRow(
      doc,
      L.address,
      config.direccion,
      200,
      infoY,
      60,
      110
    );
  }

  if (config.telefono) {
    infoY = drawRow(
      doc,
      config.telefono_secundario
        ? L.phone1
        : L.phone,
      config.telefono,
      200,
      infoY,
      60,
      110
    );
  }

  if (config.telefono_secundario) {
    infoY = drawRow(
      doc,
      L.phone2,
      config.telefono_secundario,
      200,
      infoY,
      60,
      110
    );
  }

  if (config.email) {
    infoY = drawRow(
      doc,
      L.email,
      config.email,
      200,
      infoY,
      60,
      110
    );
  }

  // QR
  doc
    .moveTo(370, 15)
    .lineTo(370, 90)
    .strokeColor("#cbd5e1")
    .lineWidth(0.8)
    .stroke();

  if (qrBuffer) {
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(L.scanQr, 410, 18, {
        width: 80,
        align: "center",
      });

    doc.image(qrBuffer, 425, 32, {
      fit: [70, 70],
    });
  }

  // ----------------------------------------------------------
  // TITULO
  // ----------------------------------------------------------

  doc
    .moveTo(24, 102)
    .lineTo(225, 102)
    .strokeColor(secondary)
    .lineWidth(1.5)
    .stroke();

  doc
    .moveTo(330, 102)
    .lineTo(570, 102)
    .strokeColor(secondary)
    .lineWidth(1.5)
    .stroke();

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(L.receiptTitle, 225, 97, {
      width: 105,
      align: "center",
    });

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(6)
    .text(
      `${L.receipt} #${String(id_renta).padStart(4, "0")} • ${formatDateTime(
        new Date(),
        config.idioma_default
      )}`,
      200,
      114,
      {
        width: 170,
        align: "center",
      }
    );

  // ----------------------------------------------------------
  // CLIENTE + RENTA (REDUCIDO)
  // ----------------------------------------------------------

  let y = 138;

  drawBox(doc, 24, y, 210, 135); // Reducido
  drawBox(doc, 245, y, 325, 135); // Reducido

  drawTitle(
    doc,
    L.customerInfo,
    24,
    y,
    210,
    primary
  );

  drawTitle(
    doc,
    L.rentalDetails,
    245,
    y,
    325,
    primary
  );

  let customerY = y + 36;

  customerY = drawRow(
    doc,
    L.customer,
    renta.cliente,
    40,
    customerY,
    65,
    120
  );

  customerY = drawRow(
    doc,
    L.phone,
    renta.celular,
    40,
    customerY,
    65,
    120
  );

  customerY = drawRow(
    doc,
    L.email,
    renta.correo,
    40,
    customerY,
    65,
    120
  );

  drawRow(
    doc,
    L.delivery,
    renta.direccion_entrega ||
      renta.cliente_direccion,
    40,
    customerY,
    65,
    120
  );

  let rentalY = y + 36;

  rentalY = drawRow(
    doc,
    L.dumpster,
    renta.dumpster_codigo,
    265,
    rentalY,
    65,
    75
  );

  rentalY = drawRow(
    doc,
    L.size,
    `${renta.tamano_yardas} ${L.yard}`,
    265,
    rentalY,
    65,
    75
  );

  rentalY = drawRow(
    doc,
    L.capacity,
    `${Number(
      renta.capacidad_toneladas || 0
    ).toFixed(2)} ${L.ton}`,
    265,
    rentalY,
    65,
    75
  );

  rentalY = drawRow(
    doc,
    L.truck,
    renta.nombre_camion,
    265,
    rentalY,
    65,
    75
  );

  rentalY = drawRow(
    doc,
    L.start,
    formatDate(renta.fecha_inicio, config.idioma_default),
    395,
    y + 36,
    65,
    60
  );

  rentalY = drawRow(
    doc,
    L.return,
    formatDate(
      renta.fecha_estimada_devolucion,
      config.idioma_default
    ),
    395,
    rentalY,
    65,
    60
  );

  drawRow(
    doc,
    L.notes,
    renta.observaciones,
    395,
    rentalY,
    65,
    60
  );

  // ----------------------------------------------------------
  // PAGOS (REDUCIDO)
  // ----------------------------------------------------------

  y = 290; // Reducido de 330

  drawBox(doc, 24, y, 260, 145); // Reducido

  drawTitle(
    doc,
    L.paymentSummary,
    24,
    y,
    260,
    primary
  );

  const totalPagado = pagos.reduce(
    (sum, p) =>
      sum + Number(p.monto_abonado || 0),
    0
  );

  const saldoPendiente = Number(
    renta.saldo_pendiente || 0
  );

  const estadoPago =
    saldoPendiente > 0
      ? L.pendingStatus
      : L.paidStatus;

  const estadoPagoColor =
    saldoPendiente > 0
      ? "#dc2626"
      : "#16a34a";

  let payY = y + 34;

  const paymentRows = [
    [
      L.baseRental,
      money(renta.subtotal_base),
    ],
    [
      L.extras,
      money(renta.total_extras),
    ],
    [
      L.tax,
      money(renta.tax_amount),
    ],
  ];

  paymentRows.forEach(([label, value]) => {
    doc
      .fillColor("#334155")
      .font("Helvetica")
      .fontSize(7.5)
      .text(label, 42, payY)
      .text(value, 210, payY, {
        width: 50,
        align: "right",
      });

    payY += 17;
  });

  doc
    .moveTo(42, payY)
    .lineTo(265, payY)
    .strokeColor("#d1d5db")
    .stroke();

  payY += 10;

  doc
    .fillColor(primary)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(L.total, 42, payY)
    .fillColor(dark)
    .text(money(renta.total_final), 210, payY, {
      width: 50,
      align: "right",
    });

  payY += 19;

  doc
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(7.5)
    .text(L.paid, 42, payY)
    .text(money(totalPagado), 210, payY, {
      width: 50,
      align: "right",
    });

  payY += 19;

  doc
    .roundedRect(35, payY - 4, 240, 22, 5)
    .fill("#f0fdf4");

  doc
    .fillColor(
      saldoPendiente > 0
        ? "#dc2626"
        : "#15803d"
    )
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(L.balanceDue, 42, payY)
    .text(money(saldoPendiente), 210, payY, {
      width: 50,
      align: "right",
    });

  // ----------------------------------------------------------
  // EXTRAS (REDUCIDO)
  // ----------------------------------------------------------

  drawBox(doc, 296, y, 274, 68); // Reducido

  drawTitle(
    doc,
    L.extraCharges,
    296,
    y,
    274,
    primary
  );

  let extraY = y + 34;

  if (extras.length > 0) {
    extras.slice(0, 3).forEach((extra) => {
      doc
        .fillColor("#334155")
        .font("Helvetica")
        .fontSize(7)
        .text(
          extra.descripcion ||
            extra.tipo_extra ||
            "Extra",
          314,
          extraY,
          {
            width: 140,
          }
        )
        .text(
          money(extra.monto),
          505,
          extraY,
          {
            width: 40,
            align: "right",
          }
        );

      extraY += 15;
    });
  } else {
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        L.noExtras,
        314,
        extraY
      );
  }

  // ----------------------------------------------------------
  // MÉTODO DE PAGO (REDUCIDO)
  // ----------------------------------------------------------

  drawBox(
    doc,
    296,
    y + 78,
    274,
    67
  );

  drawTitle(
    doc,
    L.paymentMethod,
    296,
    y + 78,
    274,
    dark
  );

  const ultimoPago =
    pagos[pagos.length - 1];

  doc
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      L.method,
      314,
      y + 115
    )
    .text(
      ultimoPago?.tipo_pago || "-",
      380,
      y + 115
    );

  doc
    .text(
      L.status,
      314,
      y + 132
    );

  drawBadge(
    doc,
    estadoPago,
    380,
    y + 128,
    estadoPagoColor
  );
};

// ============================================================
// PÁGINA 2 - TÉRMINOS Y CONDICIONES
// ============================================================

const drawPage2 = ({
  doc,
  config,
  L,
  primary,
  secondary,
  dark,
  companyName,
  logoBuffer,
  id_renta,
}) => {
  // ----------------------------------------------------------
  // CABECERA DE LA PÁGINA
  // ----------------------------------------------------------

  if (logoBuffer) {
    doc.image(logoBuffer, 30, 25, {
      fit: [70, 35],
    });
  }

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(L.terms, 120, 32, {
      width: 400,
      align: "right",
    });

  doc
    .moveTo(30, 70)
    .lineTo(565, 70)
    .strokeColor(primary)
    .lineWidth(1.5)
    .stroke();

  let y = 90;

  // ----------------------------------------------------------
  // TÉRMINOS DE RENTA
  // ----------------------------------------------------------

  if (config.terminos_renta && String(config.terminos_renta).trim()) {
    y = drawLegalBlock(
      doc,
      L.rentalTerms,
      config.terminos_renta,
      40,
      y,
      515,
      primary
    );
    y += 3;
  }

  // ----------------------------------------------------------
  // POLÍTICA DE CANCELACIÓN
  // ----------------------------------------------------------

  if (config.politica_cancelacion && String(config.politica_cancelacion).trim()) {
    y = drawLegalBlock(
      doc,
      L.cancellationPolicy,
      config.politica_cancelacion,
      40,
      y,
      515,
      primary
    );
    y += 3;
  }

  // ----------------------------------------------------------
  // POLÍTICA DE DAÑOS
  // ----------------------------------------------------------

  if (config.politica_danos && String(config.politica_danos).trim()) {
    y = drawLegalBlock(
      doc,
      L.damagePolicy,
      config.politica_danos,
      40,
      y,
      515,
      primary
    );
    y += 3;
  }

  // ----------------------------------------------------------
  // MATERIALES PROHIBIDOS
  // ----------------------------------------------------------

  if (config.materiales_prohibidos && String(config.materiales_prohibidos).trim()) {
    y = drawLegalBlock(
      doc,
      L.prohibitedMaterials,
      config.materiales_prohibidos,
      40,
      y,
      515,
      primary
    );
    y += 3;
  }

  // ----------------------------------------------------------
  // INSTRUCCIONES DEL RECIBO
  // ----------------------------------------------------------

  if (config.instrucciones_recibo && String(config.instrucciones_recibo).trim()) {
    y = drawLegalBlock(
      doc,
      L.receiptInstructions,
      config.instrucciones_recibo,
      40,
      y,
      515,
      primary
    );
    y += 3;
  }

  // ----------------------------------------------------------
  // FIRMAS
  // ----------------------------------------------------------

  const hasSignatures = 
    Number(config.mostrar_firma_cliente) === 1 || 
    Number(config.mostrar_firma_empresa) === 1;

  if (hasSignatures) {
    const signatureY = Math.min(
      Math.max(y + 20, 550),
      670
    );

    if (Number(config.mostrar_firma_cliente) === 1) {
      drawSignatureBox(
        doc,
        50,
        signatureY,
        210,
        L.signatureCustomer,
        primary
      );
    }

    if (Number(config.mostrar_firma_empresa) === 1) {
      drawSignatureBox(
        doc,
        330,
        signatureY,
        210,
        L.signatureCompany,
        primary
      );
    }
  }
};

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

const generarReciboPDF = async (
  id_renta,
  id_empresa
) => {
  try {
    // ========================================================
    // 1. CONFIGURACIÓN EMPRESA
    // ========================================================

    const [configRows] = await db.query(
      `
      SELECT
        ec.*,
        e.nombre_empresa,
        e.email,
        e.telefono,
        e.telefono_secundario,
        e.website,
        e.direccion,
        e.logo AS logo_empresa
      FROM tb_empresas e
      LEFT JOIN tb_empresa_configuracion ec
        ON ec.id_empresa = e.id_empresa
      WHERE e.id_empresa = ?
      LIMIT 1
      `,
      [id_empresa]
    );

    const config = configRows[0];

    if (!config) {
      throw new Error(
        "No existe configuración para la empresa"
      );
    }

    const lang =
      config.idioma_default === "es"
        ? "es"
        : "en";

    const L = getReceiptLabels(lang);

    // ========================================================
    // 2. RENTA
    // ========================================================

    const [rentaRows] = await db.query(
      `
      SELECT
        r.*,

        c.nombres AS cliente,
        c.celular,
        c.correo,
        c.direccion AS cliente_direccion,

        d.codigo AS dumpster_codigo,
        d.tamano_yardas,
        d.capacidad_toneladas,

        ca.nombre_camion,

        f.subtotal_base,
        f.total_extras,
        f.tax_amount,
        f.total_final,
        f.saldo_pendiente

      FROM tb_rentas r

      INNER JOIN tb_clientes c
        ON c.id_cliente = r.id_cliente

      INNER JOIN dumpsters d
        ON d.id_dumpster = r.id_dumpster

      LEFT JOIN tb_camion ca
        ON ca.id_camion = r.id_camion

      LEFT JOIN tb_renta_finanzas f
        ON f.id_renta = r.id_renta

      WHERE r.id_renta = ?
        AND r.id_empresa = ?

      LIMIT 1
      `,
      [id_renta, id_empresa]
    );

    if (rentaRows.length === 0) {
      throw new Error(
        "Renta no encontrada"
      );
    }

    const renta = rentaRows[0];

    // ========================================================
    // 3. EXTRAS
    // ========================================================

    const [extras] = await db.query(
      `
      SELECT
        descripcion,
        tipo_extra,
        monto,
        estado_pago

      FROM tb_renta_extras

      WHERE id_renta = ?
        AND id_empresa = ?
        AND estado_pago <> 'anulado'

      ORDER BY id_extra ASC
      `,
      [id_renta, id_empresa]
    );

    // ========================================================
    // 4. PAGOS
    // ========================================================

    const [pagos] = await db.query(
      `
      SELECT
        monto_abonado,
        tax_pago,
        tipo_pago,
        fecha_pago,
        estado_pago

      FROM tb_renta_pagos

      WHERE id_renta = ?
        AND id_empresa = ?
        AND estado_pago <> 'anulado'

      ORDER BY fecha_pago ASC
      `,
      [id_renta, id_empresa]
    );

    // ========================================================
    // 5. IMÁGENES
    // ========================================================

    const logoBuffer =
      await loadImageBuffer(
        config.logo_empresa
      );

    let qrBuffer = null;

    if (
      Number(config.mostrar_qr) === 1 &&
      config.qr_imagen
    ) {
      qrBuffer =
        await loadImageBuffer(
          config.qr_imagen
        );
    }

    // ========================================================
    // 6. PDF
    // ========================================================

    const doc = new PDFDocument({
      size: "A4",

      margins: {
        top: 20, // Reducido
        bottom: 15, // Reducido
        left: 24,
        right: 24,
      },

      autoFirstPage: true,
      bufferPages: true,
    });

    const chunks = [];

    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    // ========================================================
    // 7. COLORES
    // ========================================================

    const primary =
      config.color_primario ||
      "#2563eb";

    const secondary =
      config.color_secundario ||
      "#16a34a";

    const dark =
      "#111827";

    const companyName =
      config.nombre_empresa ||
      "Company";

    // ========================================================
    // 8. CALCULAR PÁGINAS
    // ========================================================

    const hasContent = hasLegalContent(config);
    const hasSignatures = 
      Number(config.mostrar_firma_cliente) === 1 || 
      Number(config.mostrar_firma_empresa) === 1;

    const totalPages = (hasContent || hasSignatures) ? 2 : 1;

    // ========================================================
    // 9. PÁGINA 1 - RECIBO
    // ========================================================

    await drawPage1({
      doc,
      config,
      renta,
      extras,
      pagos,
      logoBuffer,
      qrBuffer,
      L,
      primary,
      secondary,
      dark,
      companyName,
      id_renta,
    });

    // Footer página 1
    drawProfessionalFooter(
      doc,
      config,
      primary,
      secondary,
      companyName,
      L,
      id_renta,
      1,
      totalPages
    );

    // ========================================================
    // 10. PÁGINA 2 - TÉRMINOS (SOLO SI HAY CONTENIDO)
    // ========================================================

    if (hasContent || hasSignatures) {
      doc.addPage();
      
      drawPage2({
        doc,
        config,
        L,
        primary,
        secondary,
        dark,
        companyName,
        logoBuffer,
        id_renta,
      });

      drawProfessionalFooter(
        doc,
        config,
        primary,
        secondary,
        companyName,
        L,
        id_renta,
        2,
        totalPages
      );
    }

    // ========================================================
    // 11. GENERAR BUFFER
    // ========================================================

    return await new Promise(
      (resolve, reject) => {
        doc.on("end", () => {
          resolve(
            Buffer.concat(chunks)
          );
        });

        doc.on("error", reject);

        doc.end();
      }
    );
  } catch (error) {
    console.error(
      "Error generando recibo PDF:",
      error
    );

    throw error;
  }
};

module.exports = {
  generarReciboPDF,
};