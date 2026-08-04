const db = require("../../../shared/database/db");

const {
  generarReciboPDF,
} = require("./reciboPDF.service");

const {
  enviarCorreoEmpresa,
} = require("../../../services/email.service");

const {
  registrarLog,
} = require("../../../helpers/logs");

const getIdEmpresa = (req) => Number(req.usuario.id_empresa);

const escaparHTML = (valor) =>
  String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const enviarReciboPorCorreo = async (req, res) => {
  try {
    const id_renta = Number(req.params.id_renta);
    const id_empresa = getIdEmpresa(req);

    if (!Number.isInteger(id_renta) || id_renta <= 0) {
      return res.status(400).json({
        ok: false,
        code: "ID_RENTA_INVALIDO",
        msg: "El ID de la renta no es válido",
      });
    }

    if (!Number.isInteger(id_empresa) || id_empresa <= 0) {
      return res.status(400).json({
        ok: false,
        code: "ID_EMPRESA_INVALIDO",
        msg: "No se pudo identificar la empresa",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id_renta,
        c.nombres AS cliente,
        c.correo AS correo_cliente,
        ec.mensaje_email_recibo,
        ec.idioma_default,
        e.nombre_empresa
      FROM tb_rentas r

      INNER JOIN tb_clientes c
        ON c.id_cliente = r.id_cliente
       AND c.id_empresa = r.id_empresa

      INNER JOIN tb_empresas e
        ON e.id_empresa = r.id_empresa

      LEFT JOIN tb_empresa_configuracion ec
        ON ec.id_empresa = r.id_empresa

      WHERE r.id_renta = ?
        AND r.id_empresa = ?

      LIMIT 1
      `,
      [id_renta, id_empresa]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        code: "RENTA_NO_ENCONTRADA",
        msg: "Renta no encontrada",
      });
    }

    const info = rows[0];

    const correoDestino = String(
      req.body?.correo || info.correo_cliente || ""
    ).trim();

    if (!correoDestino) {
      return res.status(400).json({
        ok: false,
        code: "CORREO_NO_DISPONIBLE",
        msg: "El cliente no tiene correo registrado",
      });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(correoDestino)) {
      return res.status(400).json({
        ok: false,
        code: "CORREO_INVALIDO",
        msg: "El correo proporcionado no es válido",
      });
    }

    const companyName =
      String(info.nombre_empresa || "Company").trim();

    const cliente =
      String(info.cliente || "Customer").trim();

    const idioma =
      info.idioma_default === "es" ? "es" : "en";

    const mensajePredeterminado =
      idioma === "es"
        ? "Adjunto encontrará el comprobante de su renta en formato PDF."
        : "Attached you will find your rental receipt in PDF format.";

    const mensaje =
      String(
        info.mensaje_email_recibo ||
        mensajePredeterminado
      ).trim();

    const numeroRecibo = String(id_renta).padStart(4, "0");

    const pdfBuffer = await generarReciboPDF(
      id_renta,
      id_empresa,
      idioma
    );

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error("No se pudo generar el archivo PDF");
    }

    const subject =
      idioma === "es"
        ? `${companyName} - Comprobante #${numeroRecibo}`
        : `${companyName} - Receipt #${numeroRecibo}`;

    const saludo =
      idioma === "es"
        ? `Hola ${escaparHTML(cliente)},`
        : `Hello ${escaparHTML(cliente)},`;

    const textoAdjunto =
      idioma === "es"
        ? "Su comprobante de renta se encuentra adjunto a este correo."
        : "Your rental receipt is attached to this email.";

    const agradecimiento =
      idioma === "es"
        ? "Gracias por confiar en"
        : "Thank you for choosing";

    await enviarCorreoEmpresa({
      id_empresa,
      to: correoDestino,
      subject,
      html: `
        <div
          style="
            max-width:620px;
            margin:0 auto;
            padding:28px;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:12px;
            font-family:Arial,Helvetica,sans-serif;
            color:#111827;
            line-height:1.6;
          "
        >
          <h2
            style="
              margin:0 0 22px;
              color:#111827;
              font-size:22px;
            "
          >
            ${escaparHTML(companyName)}
          </h2>

          <p>${saludo}</p>

          <p>${escaparHTML(mensaje)}</p>

          <p>${textoAdjunto}</p>

          <div
            style="
              margin:26px 0;
              padding:14px 18px;
              background:#f8fafc;
              border-left:4px solid #2563eb;
              border-radius:6px;
            "
          >
            <strong>
              ${
                idioma === "es"
                  ? `Comprobante #${numeroRecibo}`
                  : `Receipt #${numeroRecibo}`
              }
            </strong>
          </div>

          <p style="margin-bottom:0">
            ${agradecimiento}
            <strong>${escaparHTML(companyName)}</strong>.
          </p>
        </div>
      `,
      attachments: [
        {
          filename:
            idioma === "es"
              ? `Comprobante-${numeroRecibo}.pdf`
              : `Receipt-${numeroRecibo}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    await registrarLog({
      req,
      modulo: "Recibos",
      accion: "ENVIAR_EMAIL",
      descripcion:
        `Recibo #${numeroRecibo} enviado a ${correoDestino}`,
    });

    return res.json({
      ok: true,
      msg:
        idioma === "es"
          ? "Recibo enviado correctamente"
          : "Receipt sent successfully",
      correo: correoDestino,
    });
  } catch (error) {
    console.error(
      "Error enviando recibo por correo:",
      error
    );

    return res.status(error.status || 500).json({
      ok: false,
      code: error.code || "ERROR_ENVIAR_RECIBO",
      msg: "Error enviando recibo por correo",
    });
  }
};

module.exports = {
  enviarReciboPorCorreo,
};