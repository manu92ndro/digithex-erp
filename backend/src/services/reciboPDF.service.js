const PDFDocument = require("pdfkit");
const axios = require("axios");
const sharp = require("sharp");
const db = require("../config/db"); // Ajusta la ruta según tu proyecto

// ============================================
// FUNCIONES AUXILIARES (NO TOCAR)
// ============================================

const getReceiptLabels = (lang) => {
  const labels = {
    es: {
      dir: "Dirección",
      tel: "Teléfono",
      tel1: "Teléfono 1",
      tel2: "Teléfono 2",
      mail: "Email",
      scan: "ESCANEAR QR",
      receiptTitle: "COMPROBANTE DE RENTA",
      receipt: "Recibo",
      customerInfo: "INFORMACIÓN DEL CLIENTE",
      rentalDetails: "DETALLES DE LA RENTA",
      customer: "Cliente",
      phone: "Teléfono",
      email: "Email",
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
      termsText:
        "El cliente acepta la responsabilidad por el equipo rentado. Cualquier daño o pérdida será cobrado al cliente. El equipo debe ser devuelto en las mismas condiciones en que fue recibido.",
    },
    en: {
      dir: "Address",
      tel: "Phone",
      tel1: "Phone 1",
      tel2: "Phone 2",
      mail: "Email",
      scan: "SCAN QR",
      receiptTitle: "RENTAL RECEIPT",
      receipt: "Receipt",
      customerInfo: "CUSTOMER INFORMATION",
      rentalDetails: "RENTAL DETAILS",
      customer: "Customer",
      phone: "Phone",
      email: "Email",
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
      termsText:
        "The customer accepts responsibility for the rented equipment. Any damage or loss will be charged to the customer. Equipment must be returned in the same condition as received.",
    },
  };

  return labels[lang] || labels.es;
};

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const money = (amount) => {
  if (amount === null || amount === undefined) return "$0.00";
  return `$${Number(amount).toFixed(2)}`;
};

const drawRow = (doc, label, value, x, y, labelWidth = 80, valueWidth = 100) => {
  if (!value) value = "-";
  doc
    .fillColor("#4b5563")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label + ":", x, y, { width: labelWidth });

  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(8)
    .text(String(value), x + labelWidth, y, {
      width: valueWidth,
    });

  return y + 17;
};

const drawBox = (doc, x, y, width, height) => {
  doc
    .rect(x, y, width, height)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();
};

const drawTitle = (doc, title, x, y, width, color) => {
  doc
    .rect(x + 10, y - 10, width - 20, 20)
    .fill(color)
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(title, x + 15, y - 5, {
      width: width - 30,
      align: "left",
    });
};

const drawBadge = (doc, text, x, y, color) => {
  const width = text.length * 6 + 20;
  doc
    .roundedRect(x, y - 4, width, 16, 8)
    .fill(color)
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(text, x + 10, y, {
      width: width - 20,
      align: "center",
    });
};

const drawFooter = (doc, config, primary, dark, companyName, L) => {
  const y = doc.page.height - 80;

  doc
    .moveTo(24, y)
    .lineTo(570, y)
    .strokeColor("#d1d5db")
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(7)
    .text(companyName, 24, y + 10, { width: 200 })
    .text(
      `${L.terms} • ${formatDate(new Date())}`,
      400,
      y + 10,
      { width: 170, align: "right" }
    );
};

const drawTermsPage = (doc, config, dark, companyName, L) => {
  doc.addPage();
  const y = 50;

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(L.terms, 24, y, { align: "center" });

  doc
    .moveTo(24, y + 20)
    .lineTo(570, y + 20)
    .strokeColor("#d1d5db")
    .stroke();

  doc
    .fillColor("#374151")
    .font("Helvetica")
    .fontSize(9)
    .text(L.termsText, 24, y + 40, {
      width: 540,
      align: "justify",
      lineGap: 5,
    });

  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(7)
    .text(companyName, 24, doc.page.height - 50, { width: 200 });
};

// ============================================
// FUNCIÓN PRINCIPAL DEL SERVICIO
// ============================================

const generarReciboPDF = async (id_renta, id_empresa) => {
  try {
    // 1. Obtener configuración de la empresa
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
      LIMIT 1;
      `,
      [id_empresa]
    );

    const config = configRows[0] || {};
    const lang = config.idioma_default || "en";
    const L = getReceiptLabels(lang);

    const logoPath = config.logo_empresa || null;
    const qrPath = config.qr_imagen || null;

    // 2. Obtener datos de la renta
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
      INNER JOIN tb_clientes c ON c.id_cliente = r.id_cliente
      INNER JOIN dumpsters d ON d.id_dumpster = r.id_dumpster
      LEFT JOIN tb_camion ca ON ca.id_camion = r.id_camion
      LEFT JOIN tb_renta_finanzas f ON f.id_renta = r.id_renta
      WHERE r.id_renta = ?
        AND r.id_empresa = ?
      LIMIT 1
      `,
      [id_renta, id_empresa]
    );

    if (rentaRows.length === 0) {
      throw new Error("Renta no encontrada");
    }

    const renta = rentaRows[0];

    // 3. Obtener extras
    const [extras] = await db.query(
      `
      SELECT descripcion, tipo_extra, monto, estado_pago
      FROM tb_renta_extras
      WHERE id_renta = ?
        AND id_empresa = ?
        AND estado_pago <> 'anulado'
      ORDER BY id_extra ASC
      `,
      [id_renta, id_empresa]
    );

    // 4. Obtener pagos
    const [pagos] = await db.query(
      `
      SELECT monto_abonado, tax_pago, tipo_pago, fecha_pago, estado_pago
      FROM tb_renta_pagos
      WHERE id_renta = ?
        AND id_empresa = ?
        AND estado_pago <> 'anulado'
      ORDER BY fecha_pago ASC
      `,
      [id_renta, id_empresa]
    );


    if (!config) {
        throw new Error("No existe configuración de la empresa");
    }
    // 5. Crear documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 30,
        bottom: 30,
        left: 30,
        right: 30,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // 6. Variables de estilo
    const primary = config.color_primario || "#2563eb";
    const secondary = config.color_secundario || "#16a34a";
    const dark = "#111827";
    const companyName = config.nombre_empresa || "Company";

    // 7. Cálculos
    const totalPagado = pagos.reduce(
      (sum, p) => sum + Number(p.monto_abonado || 0),
      0
    );
    const saldoPendiente = Number(renta.saldo_pendiente || 0);
    const estadoPago = saldoPendiente > 0 ? L.pendingStatus : L.paidStatus;
    const estadoPagoColor = saldoPendiente > 0 ? "#dc2626" : "#16a34a";

    // 8. HEADER - Logo
    doc.rect(0, 0, doc.page.width, 150).fill("#ffffff");

    if (logoPath) {
      try {
        const response = await axios.get(logoPath, {
          responseType: "arraybuffer",
        });
        const logoBuffer = await sharp(Buffer.from(response.data))
            .png()
            .toBuffer();
        doc.image(logoBuffer, 28, 18, {
          fit: [150, 82],
        });
      } catch (error) {
        console.error("Error cargando logo:", error);
        doc
          .fillColor(dark)
          .font("Helvetica-Bold")
          .fontSize(18)
          .text(companyName, 28, 35, {
            width: 150,
          });
      }
    }

    // 9. HEADER - Línea divisoria
    doc
      .moveTo(205, 18)
      .lineTo(205, 105)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();

    // 10. HEADER - Información de contacto
    let infoY = 30;

    if (config.direccion) {
      infoY = drawRow(doc, L.dir, config.direccion, 220, infoY, 65, 120);
    }

    if (config.telefono) {
      infoY = drawRow(
        doc,
        config.telefono_secundario ? L.tel1 : L.tel,
        config.telefono,
        220,
        infoY,
        65,
        120
      );
    }

    if (config.telefono_secundario) {
      infoY = drawRow(
        doc,
        L.tel2,
        config.telefono_secundario,
        220,
        infoY,
        65,
        120
      );
    }

    if (config.email) {
      drawRow(doc, L.mail, config.email, 220, infoY, 65, 120);
    }

    // 11. HEADER - QR
    doc
      .moveTo(410, 18)
      .lineTo(410, 105)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();

    if (Number(config.mostrar_qr) === 1 && qrPath) {
      try {
        const response = await axios.get(qrPath, {
          responseType: "arraybuffer",
        });
        const qrBuffer = await sharp(Buffer.from(response.data))
          .png()
          .toBuffer();

        doc
          .fillColor(dark)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(L.scan, 465, 22, {
            width: 90,
            align: "center",
          });

        doc.image(qrBuffer, 482, 36, {
          fit: [55, 55],
        });
      } catch (error) {
        console.error("Error cargando QR:", error);
      }
    }

    // 12. TÍTULO PRINCIPAL
    doc
      .moveTo(24, 116)
      .lineTo(250, 116)
      .strokeColor(secondary)
      .lineWidth(2)
      .stroke();

    doc
      .moveTo(350, 116)
      .lineTo(570, 116)
      .strokeColor(secondary)
      .lineWidth(2)
      .stroke();

    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(L.receiptTitle, 250, 110, {
        width: 120,
        align: "center",
      });

    doc
      .fillColor("#6b7280")
      .font("Helvetica")
      .fontSize(8)
      .text(
        `${L.receipt} #${String(id_renta).padStart(4, "0")} | ${formatDate(
          new Date()
        )}`,
        250,
        128,
        { width: 500, align: "center" }
      );

    // 13. SECCIÓN CLIENTE Y DETALLES
    let y = 160;

    drawBox(doc, 24, y, 230, 155);
    drawBox(doc, 265, y, 305, 155);

    drawTitle(doc, L.customerInfo, 24, y, 230, primary);
    drawTitle(doc, L.rentalDetails, 265, y, 305, primary);

    let customerY = y + 48;
    customerY = drawRow(doc, L.customer, renta.cliente, 48, customerY, 80, 100);
    customerY = drawRow(doc, L.phone, renta.celular, 48, customerY, 80, 100);
    customerY = drawRow(doc, L.email, renta.correo, 48, customerY, 80, 100);

    drawRow(
      doc,
      L.delivery,
      renta.direccion_entrega || renta.cliente_direccion,
      48,
      customerY,
      80,
      100
    );

    let rentalLeftY = y + 48;

    rentalLeftY = drawRow(
      doc,
      L.dumpster,
      renta.dumpster_codigo,
      290,
      rentalLeftY,
      75,
      82
    );

    rentalLeftY = drawRow(
      doc,
      L.size,
      `${renta.tamano_yardas} Yard`,
      290,
      rentalLeftY,
      75,
      82
    );

    rentalLeftY = drawRow(
      doc,
      L.capacity,
      `${Number(renta.capacidad_toneladas || 0).toFixed(2)} Ton`,
      290,
      rentalLeftY,
      75,
      82
    );

    drawRow(doc, L.truck, renta.nombre_camion, 290, rentalLeftY, 75, 82);

    let rentalRightY = y + 48;

    rentalRightY = drawRow(
      doc,
      L.start,
      formatDate(renta.fecha_inicio),
      438,
      rentalRightY,
      78,
      62
    );

    rentalRightY = drawRow(
      doc,
      L.return,
      formatDate(renta.fecha_estimada_devolucion),
      438,
      rentalRightY,
      78,
      62
    );

    rentalRightY = drawRow(
      doc,
      L.notes,
      renta.observaciones,
      438,
      rentalRightY,
      78,
      62
    );

    drawBadge(doc, estadoPago, 430, rentalRightY + 2, estadoPagoColor);

    // 14. SECCIÓN RESUMEN DE PAGOS
    y = 335;

    drawBox(doc, 24, y, 275, 170);
    drawTitle(doc, L.paymentSummary, 24, y, 275, primary);

    let payY = y + 42;

    const paymentRows = [
      [L.baseRental, money(renta.subtotal_base)],
      [L.extras, money(renta.total_extras)],
      [L.tax, money(renta.tax_amount)],
    ];

    paymentRows.forEach(([label, value]) => {
      doc
        .fillColor("#111827")
        .font("Helvetica")
        .fontSize(9)
        .text(label, 45, payY)
        .text(value, 230, payY, { width: 50, align: "right" });

      payY += 20;
    });

    doc.moveTo(45, payY).lineTo(280, payY).strokeColor("#d1d5db").stroke();
    payY += 13;

    doc
      .fillColor(primary)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(L.total, 45, payY)
      .fillColor(dark)
      .text(money(renta.total_final), 230, payY, {
        width: 50,
        align: "right",
      });

    payY += 24;

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(9)
      .text(L.paid, 45, payY)
      .text(money(totalPagado), 230, payY, {
        width: 50,
        align: "right",
      });

    payY += 23;

    doc.roundedRect(38, payY - 6, 250, 25, 5).fill("#dcfce7");

    doc
      .fillColor("#15803d")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(L.balanceDue, 45, payY)
      .text(money(renta.saldo_pendiente), 230, payY, {
        width: 50,
        align: "right",
      });

    // 15. SECCIÓN CARGOS EXTRAS
    drawBox(doc, 312, y, 258, 75);
    drawTitle(doc, L.extraCharges, 312, y, 258, primary);

    let extraY = y + 42;

    if (extras.length > 0) {
      extras.slice(0, 2).forEach((extra) => {
        doc
          .fillColor("#111827")
          .font("Helvetica")
          .fontSize(9)
          .text(extra.descripcion || extra.tipo_extra || "Extra", 332, extraY, {
            width: 140,
          })
          .text(money(extra.monto), 505, extraY, {
            width: 45,
            align: "right",
          });

        extraY += 18;
      });
    } else {
      doc
        .fillColor("#6b7280")
        .font("Helvetica")
        .fontSize(9)
        .text(L.noExtras, 332, extraY);
    }

    // 16. SECCIÓN MÉTODO DE PAGO
    drawBox(doc, 312, y + 95, 258, 75);
    drawTitle(doc, L.paymentMethod, 312, y + 95, 258, dark);

    const ultimoPago = pagos[pagos.length - 1];

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(9)
      .text(L.method, 332, y + 137)
      .text(ultimoPago?.tipo_pago || "-", 400, y + 137)
      .text(L.status, 332, y + 157);

    drawBadge(doc, estadoPago, 430, y + 151, estadoPagoColor);

    // 17. FOOTER
    drawFooter(doc, config, primary, dark, companyName, L);
    
    // 18. TÉRMINOS Y CONDICIONES (página adicional)
    drawTermsPage(doc, config, dark, companyName, L);

    // 19. RETORNAR EL BUFFER
    return await new Promise((resolve, reject) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", reject);
      doc.end();
    });
  } catch (error) {
    console.error("Error generando recibo PDF:", error);
    throw error; // Lanzar el error para que lo maneje el controller
  }
};

module.exports = {
  generarReciboPDF,
};