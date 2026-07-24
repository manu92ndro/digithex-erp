const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const db = require("../config/db");

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const clean = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getIdEmpresa = (req) => req.usuario.id_empresa;

const getReceiptLabels = (lang = "en") => {
  const labels = {
    en: {
      receiptTitle: "RENTAL RECEIPT & AGREEMENT",
      scan: "Scan",
      receipt: "Receipt",
      generated: "Generated on",
      dir: "Address:",
      tel: "Phone:",
      tel1: "Phone 1:",
      tel2: "Phone 2:",
      mail: "Email:",
      customerInfo: "CUSTOMER INFORMATION",
      rentalDetails: "RENTAL DETAILS",
      paymentSummary: "PAYMENT SUMMARY",
      extraCharges: "EXTRA CHARGES",
      paymentMethod: "PAYMENT METHOD",
      customer: "Customer:",
      phone: "Phone:",
      email: "Email:",
      delivery: "Delivery:",
      dumpster: "Dumpster:",
      size: "Size:",
      capacity: "Capacity:",
      truck: "Truck:",
      start: "Start:",
      return: "Return:",
      notes: "Notes:",
      baseRental: "Base rental",
      extras: "Extra charges",
      tax: "Tax",
      total: "TOTAL",
      paid: "Paid",
      balanceDue: "BALANCE DUE",
      method: "Method:",
      status: "Status:",
      paidStatus: "PAID",
      pendingStatus: "PENDING",
      noExtras: "No extra charges",
      serviceAreas: "SERVICE AREAS:",
      visitUs: "VISIT US:",
      thanks: "Thank you for choosing us!",
      termsTitle: "Rental Terms & Conditions",
      termsAndConditions: "Terms and Conditions",
      cancellationPolicy: "Cancellation Policy",
      damagePolicy: "Damage Policy",
      prohibitedMaterials: "Prohibited Materials",
      additionalInstructions: "Additional Instructions",
      signatureTitle: "Authorization & Signature",
      customerSignature: "Customer Signature",
      companySignature: "Authorized by",
      agreeText: "I have read and agree to all terms and conditions",
      date: "Date:",
    },
    es: {
      receiptTitle: "RECIBO & CONTRATO DE RENTA",
      scan: "Escanea",
      receipt: "Recibo",
      generated: "Documento generado el",
      dir: "Dirección:",
      tel: "Teléfono:",
      tel1: "Teléfono 1:",
      tel2: "Teléfono 2:",
      mail: "Correo:",
      customerInfo: "INFORMACIÓN DEL CLIENTE",
      rentalDetails: "DETALLES DE LA RENTA",
      paymentSummary: "RESUMEN DE PAGOS",
      extraCharges: "CARGOS EXTRAS",
      paymentMethod: "FORMA DE PAGO",
      customer: "Cliente:",
      phone: "Teléfono:",
      email: "Correo:",
      delivery: "Entrega:",
      dumpster: "Dumpster:",
      size: "Tamaño:",
      capacity: "Capacidad:",
      truck: "Camión:",
      start: "Inicio:",
      return: "Retiro:",
      notes: "Observaciones:",
      baseRental: "Renta base",
      extras: "Cargos extras",
      tax: "Impuestos",
      total: "TOTAL",
      paid: "Abonado",
      balanceDue: "SALDO PENDIENTE",
      method: "Método:",
      status: "Estado:",
      paidStatus: "PAGADO",
      pendingStatus: "PENDIENTE",
      noExtras: "Sin cargos extras",
      serviceAreas: "ÁREAS DE SERVICIO:",
      visitUs: "VISÍTANOS EN:",
      thanks: "¡Gracias por su preferencia!",
      termsTitle: "Términos y Condiciones de Renta",
      termsAndConditions: "Términos y Condiciones",
      cancellationPolicy: "Política de Cancelación",
      damagePolicy: "Política de Daños",
      prohibitedMaterials: "Materiales Prohibidos",
      additionalInstructions: "Instrucciones Adicionales",
      signatureTitle: "Autorización y Firma",
      customerSignature: "Firma del Cliente",
      companySignature: "Autorizado por",
      agreeText: "He leído y acepto todos los términos y condiciones",
      date: "Fecha:",
    },
  };

  return labels[lang] || labels.en;
};

const drawBox = (doc, x, y, w, h) => {
  doc
    .roundedRect(x, y, w, h, 8)
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .stroke();
};

const drawTitle = (doc, title, x, y, w, color) => {
  doc.roundedRect(x, y, w, 25, 7).fill(color);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, x + 14, y + 8);
};

const drawRow = (
  doc,
  label,
  value,
  x,
  y,
  labelWidth = 85,
  valueWidth = 140
) => {
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(label, x, y, { width: labelWidth });

  doc
    .fillColor("#111827")
    .font("Helvetica")
    .fontSize(8.5)
    .text(clean(value), x + labelWidth, y, { width: valueWidth });

  return y + 18;
};

const drawBadge = (doc, label, x, y, color) => {
  doc.roundedRect(x, y, 95, 18, 5).fill(color);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label, x + 4, y + 5, {
      width: 87,
      align: "center",
    });
};

const drawFooter = (doc, config, primary, dark, companyName, L) => {
  const footerY = 665;

  doc.rect(0, footerY, doc.page.width, 95).fill(primary);

  const footerText =
    config.pie_recibo ||
    "Essex County • Morris County • Union County • Passaic County";

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(L.serviceAreas, 60, footerY + 20);

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(footerText, 60, footerY + 36, {
      width: 240,
      lineGap: 2,
    });

  doc
    .moveTo(330, footerY + 18)
    .lineTo(330, footerY + 75)
    .strokeColor("#ffffff")
    .lineWidth(0.8)
    .stroke();

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(L.visitUs, 365, footerY + 20);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(config.website || companyName, 365, footerY + 36, {
      width: 180,
    });

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(L.thanks, 365, footerY + 56);

  doc.rect(0, 760, doc.page.width, 28).fill(dark);

  doc
    .fillColor("#d1d5db")
    .font("Helvetica")
    .fontSize(7.5)
    .text(`${L.generated} ${formatDate(new Date())}`, 24, 770, {
      width: 547,
      align: "center",
      lineBreak: false,
    });
};

const drawTermsPage = (doc, config, dark, companyName, L) => {
  const sections = [];

  if (config.terminos_renta) {
    sections.push({
      title: L.termsAndConditions,
      content: config.terminos_renta,
      main: true,
    });
  }

  if (config.politica_cancelacion) {
    sections.push({
      title: L.cancellationPolicy,
      content: config.politica_cancelacion,
    });
  }

  if (config.politica_danos) {
    sections.push({
      title: L.damagePolicy,
      content: config.politica_danos,
    });
  }

  if (config.materiales_prohibidos) {
    sections.push({
      title: L.prohibitedMaterials,
      content: config.materiales_prohibidos,
    });
  }

  if (config.instrucciones_recibo) {
    sections.push({
      title: L.additionalInstructions,
      content: config.instrucciones_recibo,
    });
  }

  if (sections.length === 0) return;

  doc.addPage({
    size: "A4",
    margins: {
      top: 30,
      bottom: 30,
      left: 30,
      right: 30,
    },
  });

  let y = 38;

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(L.termsTitle, 40, y);

  y += 28;

  doc
    .moveTo(40, y)
    .lineTo(555, y)
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .stroke();

  y += 22;

  const drawLongText = (content) => {
    const lines = String(content).split("\n");

    lines.forEach((line) => {
      if (y > 700) {
        doc.addPage({
          size: "A4",
          margins: {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30,
          },
        });
        y = 38;
      }

      if (!line.trim()) {
        y += 5;
        return;
      }

      const match = line.match(/^(\d+\.\s*)([^:]+:)(.*)$/);

      if (match) {
        doc
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(match[1] + match[2], 40, y, {
            width: 175,
            continued: true,
          })
          .font("Helvetica")
          .text(match[3], {
            width: 340,
            lineGap: 1.5,
          });

        y = doc.y + 4;
      } else {
        doc
          .fillColor("#111827")
          .font("Helvetica")
          .fontSize(8)
          .text(line, 40, y, {
            width: 515,
            lineGap: 1.5,
          });

        y = doc.y + 4;
      }
    });
  };

  sections.forEach((section, index) => {
    if (y > 680) {
      doc.addPage({
        size: "A4",
        margins: {
          top: 30,
          bottom: 30,
          left: 30,
          right: 30,
        },
      });
      y = 38;
    }

    if (!section.main) {
      y += index === 0 ? 0 : 12;

      doc
        .fillColor(dark)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(section.title, 40, y);

      y += 15;

      doc
        .moveTo(40, y)
        .lineTo(555, y)
        .strokeColor("#e5e7eb")
        .lineWidth(0.8)
        .stroke();

      y += 10;
    }

    drawLongText(section.content);
  });

  y += 32;

  if (y > 650) {
    doc.addPage({
      size: "A4",
      margins: {
        top: 30,
        bottom: 30,
        left: 30,
        right: 30,
      },
    });
    y = 70;
  }

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(L.signatureTitle, 40, y);

  y += 60;

  doc
    .moveTo(55, y)
    .lineTo(265, y)
    .strokeColor("#111827")
    .lineWidth(1)
    .stroke();

  doc
    .moveTo(330, y)
    .lineTo(540, y)
    .strokeColor("#111827")
    .lineWidth(1)
    .stroke();

  doc
    .fillColor("#374151")
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(L.customerSignature, 105, y + 10)
    .text(`${L.companySignature} ${companyName}`, 365, y + 10);

  doc
    .font("Helvetica")
    .fontSize(7.8)
    .text(L.agreeText, 75, y + 27)
    .text(`${L.date} ${formatDate(new Date())}`, 365, y + 27);
};

const generarReciboPDF = async (req, res) => {
  try {
    const { id_renta } = req.params;
    const id_empresa = getIdEmpresa(req);

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
    
    const logoFile = config.logo_empresa;
    const logoPath = logoFile
      ? path.join(process.cwd(),
          "uploads","logos",logoFile)
      : null;


    const qrPath = config.qr_imagen
      ? path.join(
          process.cwd(),
          "uploads", "qr", config.qr_imagen)
      : null;
    const fs = require("fs");

    console.log("QR BD:", config.qr_imagen);
    console.log("QR RUTA:", qrPath);
    console.log("QR EXISTE:", fs.existsSync(qrPath));  

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
      return res.status(404).json({
        ok: false,
        msg: "Renta no encontrada",
      });
    }

    const renta = rentaRows[0];

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

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 30,
        bottom: 30,
        left: 30,
        right: 30,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt_rental_${id_renta}.pdf`
    );

    doc.pipe(res);

    const primary = config.color_primario || "#2563eb";
    const secondary = config.color_secundario || "#16a34a";
    const dark = "#111827";

    const companyName =
      config.nombre_empresa || "Company";

    const totalPagado = pagos.reduce(
      (sum, p) => sum + Number(p.monto_abonado || 0),
      0
    );

    const saldoPendiente = Number(renta.saldo_pendiente || 0);
    const estadoPago = saldoPendiente > 0 ? L.pendingStatus : L.paidStatus;
    const estadoPagoColor = saldoPendiente > 0 ? "#dc2626" : "#16a34a";

    doc.rect(0, 0, doc.page.width, 150).fill("#ffffff");

    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const logoBuffer = await sharp(logoPath)
          .png()
          .toBuffer();

        doc.image(logoBuffer, 28, 18, {
          fit: [150, 82],
        });

      } catch (error) {
        console.error("Error procesando logo PDF:", error);

        doc
          .fillColor(dark)
          .font("Helvetica-Bold")
          .fontSize(18)
          .text(companyName, 28, 35, { width: 150 });
      }

    } else {
      doc
        .fillColor(dark)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(companyName, 28, 35, { width: 150 });
    }

    doc
      .moveTo(205, 18)
      .lineTo(205, 105)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();

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

    doc
      .moveTo(410, 18)
      .lineTo(410, 105)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();

    if (Number(config.mostrar_qr) === 1 && qrPath && fs.existsSync(qrPath)) {
      doc
        .fillColor(dark)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(L.scan, 465, 22, {
          width: 90,
          align: "center",
        });

      doc.image(qrPath, 482, 36, {
        fit: [55, 55],
      });
    }

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
        `${L.receipt} #${String(id_renta).padStart(4, "0")} | ${formatDate(new Date())}`,
        250,
        128,
        { width: 500, align: "center" }
      );

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

    drawFooter(doc, config, primary, dark, companyName, L);
    drawTermsPage(doc, config, dark, companyName, L);

    doc.end();
  } catch (error) {
    console.error("Error generando recibo PDF:", error);

    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        msg: "Error generando recibo PDF",
      });
    }
  }
};

module.exports = {
  generarReciboPDF,
};