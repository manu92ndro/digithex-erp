const db = require("../config/db");
const { enviarCorreoEmpresa } = require("../services/email.service");

const getIdEmpresa = (req) => req.usuario.id_empresa;

const enviarReciboPorCorreo = async (req, res) => {
  try {
    const { id_renta } = req.params;
    const id_empresa = getIdEmpresa(req);

    const [rows] = await db.query(
      `
      SELECT
        r.id_renta,
        c.nombres AS cliente,
        c.correo AS correo_cliente,
        ec.nombre_comercial,
        ec.mensaje_email_recibo,
        e.nombre_empresa
      FROM tb_rentas r
      INNER JOIN tb_clientes c ON c.id_cliente = r.id_cliente
      INNER JOIN tb_empresas e ON e.id_empresa = r.id_empresa
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
        msg: "Renta no encontrada",
      });
    }

    const info = rows[0];

    const correoDestino = req.body?.correo || info.correo_cliente;

    if (!correoDestino) {
      return res.status(400).json({
        ok: false,
        msg: "El cliente no tiene correo registrado",
      });
    }

    const companyName =
      info.nombre_comercial || info.nombre_empresa || "Company";

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const reciboUrl = `${frontendUrl}/recibos/renta/${id_renta}`;

    const mensaje =
      info.mensaje_email_recibo ||
      "Attached/linked below you will find your rental receipt.";

    await enviarCorreoEmpresa({
      id_empresa,
      to: correoDestino,
      subject: `${companyName} - Receipt #${String(id_renta).padStart(4, "0")}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#111827; line-height:1.5;">
          <h2>${companyName}</h2>

          <p>Hello ${info.cliente || ""},</p>

          <p>${mensaje}</p>

          <p>
            <strong>Receipt:</strong>
            #${String(id_renta).padStart(4, "0")}
          </p>

          <p>
            <a href="${reciboUrl}"
              style="display:inline-block;background:#2563eb;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">
              View / Print Receipt
            </a>
          </p>

          <p>Thank you for choosing ${companyName}.</p>
        </div>
      `,
    });

    res.json({
      ok: true,
      msg: "Recibo enviado correctamente",
      correo: correoDestino,
    });
  } catch (error) {
    console.error("Error enviando recibo por correo:", error);

    res.status(500).json({
      ok: false,
      msg: "Error enviando recibo por correo",
      error: error.message,
    });
  }
};

module.exports = {
  enviarReciboPorCorreo,
};