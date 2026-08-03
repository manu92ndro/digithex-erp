const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const FILES_URL = process.env.FILES_URL || "http://localhost:3000";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getIdEmpresa = (req) => req.usuario.id_empresa;

const generarReciboRenta = async (req, res) => {
  try {
    const { id_renta } = req.params;
    const id_empresa = getIdEmpresa(req);

    const [configRows] = await db.query(
      `
      SELECT
          ec.*,
          e.nombre_empresa,
          e.logo AS logo_empresa
        FROM tb_empresas e
        LEFT JOIN tb_empresa_configuracion ec 
          ON ec.id_empresa = e.id_empresa
        WHERE e.id_empresa = ?
        LIMIT 1
      `,
      [id_empresa]
    );

    const config = configRows[0] || {};
      const logoFile = config.logo || config.logo_empresa;

      const logoPath = logoFile
        ? path.join(__dirname, "../uploads/logos", logoFile)
        : null;

      
    const [rentaRows] = await db.query(
      `
      SELECT 
        r.*,
        c.nombres AS cliente,
        c.celular,
        c.correo,
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
      SELECT tipo_extra, descripcion, monto, estado_pago
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
      margin: 45,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt_rental_${id_renta}.pdf`
    );

    doc.pipe(res);

    const primary = config.color_primario || "#2563eb";
    const secondary = config.color_secundario || "#0f172a";

    doc.rect(0, 0, doc.page.width, 70).fill(secondary);
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width - 120, 15, {
        fit: [70, 45],
        align: "center",
        valign: "center",
      });
    }


    doc
      .fillColor("#ffffff")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(
          config.nombre_comercial || config.nombre_empresa || "Company",
          45,
          22
        );

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(config.direccion || "", 45, 45);

    doc
      .fillColor("#111827")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Rental Receipt & Agreement", 45, 95);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text(`Receipt #${id_renta}`, 45, 120)
      .text(`Date: ${formatDate(new Date())}`, 45, 135);

    doc
      .fillColor(primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Company Information", 45, 170);

    doc
      .fillColor("#111827")
      .fontSize(10)
      .font("Helvetica")
      .text(`Phone: ${config.telefono || "-"}`, 45, 190);

    if (config.telefono_secundario) {
      doc.text(`Alt Phone: ${config.telefono_secundario}`, 45, 205);
    }

    doc
      .text(`Email: ${config.correo || "-"}`, 45, config.telefono_secundario ? 220 : 205)
      .text(`Address: ${config.direccion || "-"}`, 45, config.telefono_secundario ? 235 : 220);

    doc
      .fillColor(primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Customer Information", 320, 170);

    doc
      .fillColor("#111827")
      .fontSize(10)
      .font("Helvetica")
      .text(`Customer: ${renta.cliente || "-"}`, 320, 190)
      .text(`Phone: ${renta.celular || "-"}`, 320, 205)
      .text(`Email: ${renta.correo || "-"}`, 320, 220)
      .text(`Delivery: ${renta.direccion_entrega || "-"}`, 320, 235, {
        width: 220,
      });

    let y = 285;

    doc
      .fillColor(primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Rental Details", 45, y);

    y += 25;

    const detailRows = [
      ["Dumpster", renta.dumpster_codigo],
      ["Size", `${renta.tamano_yardas} Yard`],
      ["Capacity", `${Number(renta.capacidad_toneladas || 0).toFixed(2)} Ton`],
      ["Truck", renta.nombre_camion || "-"],
      ["Start Date", formatDate(renta.fecha_inicio)],
      ["Estimated Return", formatDate(renta.fecha_estimada_devolucion)],
      ["Status", renta.estado],
    ];

    detailRows.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .fillColor("#374151")
        .font("Helvetica-Bold")
        .text(`${label}:`, 45, y)
        .font("Helvetica")
        .fillColor("#111827")
        .text(String(value || "-"), 170, y);

      y += 18;
    });

    y += 15;

    doc
      .fillColor(primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Payment Summary", 45, y);

    y += 25;

    const totalPagado = pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_abonado || 0),
      0
    );

    const summaryRows = [
      ["Base Rental", money(renta.subtotal_base)],
      ["Extras", money(renta.total_extras)],
      ["Tax", money(renta.tax_amount)],
      ["Total", money(renta.total_final)],
      ["Paid", money(totalPagado)],
      ["Balance Due", money(renta.saldo_pendiente)],
    ];

    summaryRows.forEach(([label, value], index) => {
      const isTotal = label === "Total" || label === "Balance Due";

      if (isTotal) {
        doc.rect(45, y - 4, 500, 20).fill("#f1f5f9");
      }

      doc
        .fillColor(isTotal ? secondary : "#374151")
        .font(isTotal ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isTotal ? 11 : 10)
        .text(label, 55, y)
        .text(value, 430, y, { width: 100, align: "right" });

      y += index === 2 ? 24 : 18;
    });

    if (extras.length > 0) {
      y += 15;

      doc
        .fillColor(primary)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Extra Charges", 45, y);

      y += 22;

      extras.forEach((extra) => {
        doc
          .fillColor("#111827")
          .fontSize(9)
          .font("Helvetica")
          .text(extra.descripcion || extra.tipo_extra || "Extra charge", 55, y, {
            width: 350,
          })
          .text(money(extra.monto), 430, y, {
            width: 100,
            align: "right",
          });

        y += 16;
      });
    }

    if (pagos.length > 0) {
      y += 15;

      doc
        .fillColor(primary)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Payment History", 45, y);

      y += 22;

      pagos.forEach((pago) => {
        doc
          .fillColor("#111827")
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${formatDate(pago.fecha_pago)} · ${pago.tipo_pago || "-"}`,
            55,
            y,
            { width: 350 }
          )
          .text(money(pago.monto_abonado), 430, y, {
            width: 100,
            align: "right",
          });

        y += 16;
      });
    }

    if (y > 620) {
      doc.addPage();
      y = 45;
    } else {
      y += 25;
    }

    doc
      .fillColor(primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Terms and Conditions", 45, y);

    y += 20;

    const terms =
      config.terminos_renta ||
      "Customer agrees to use the dumpster according to company rental policies.";

    doc
      .fillColor("#374151")
      .fontSize(8)
      .font("Helvetica")
      .text(terms, 45, y, {
        width: 500,
        align: "justify",
        lineGap: 3,
      });

    y = doc.y + 35;

    if (config.mostrar_firma_cliente || config.mostrar_firma_empresa) {
      if (y > 700) {
        doc.addPage();
        y = 80;
      }

      doc
        .fillColor(primary)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Authorization & Signature", 45, y);

      y += 60;

      if (Number(config.mostrar_firma_cliente) === 1) {
        doc
          .moveTo(55, y)
          .lineTo(245, y)
          .strokeColor("#111827")
          .stroke();

        doc
          .fillColor("#374151")
          .fontSize(9)
          .text("Customer Signature", 85, y + 8);
      }

      if (Number(config.mostrar_firma_empresa) === 1) {
        doc
          .moveTo(320, y)
          .lineTo(510, y)
          .strokeColor("#111827")
          .stroke();

        doc
          .fillColor("#374151")
          .fontSize(9)
          .text("Company Authorized Signature", 340, y + 8);
      }
    }

    const footer =
      config.pie_recibo ||
      `Thank you for choosing ${config.nombre_comercial || "our company"}.`;

    doc
      .fontSize(8)
      .fillColor("#6b7280")
      .text(footer, 45, 790, {
        width: 500,
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("Error generando recibo:", error);

    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        msg: "Error generando recibo",
      });
    }
  }
};

module.exports = {
  generarReciboRenta,
};