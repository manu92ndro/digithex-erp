const nodemailer = require("nodemailer");
const db = require("../shared/database/db");

const getEmailConfig = async (id_empresa) => {
  const [rows] = await db.query(
    `
    SELECT
      ec.smtp_host,
      ec.smtp_port,
      ec.smtp_secure,
      ec.smtp_user,
      ec.smtp_password,
      ec.smtp_from_name,
      ec.smtp_reply_to,
      e.nombre_empresa
    FROM tb_empresa_configuracion ec
    INNER JOIN tb_empresas e
      ON e.id_empresa = ec.id_empresa
    WHERE ec.id_empresa = ?
    LIMIT 1
    `,
    [id_empresa]
  );

  return rows[0] || null;
};

const crearTransporterEmpresa = async (id_empresa) => {
  const config = await getEmailConfig(id_empresa);
  

  if (
    !config ||
    !config.smtp_host ||
    !config.smtp_port ||
    !config.smtp_user ||
    !config.smtp_password
  ) {
    throw new Error("Email SMTP is not configured for this company");
  }

  return {
    transporter: nodemailer.createTransport({
      host: config.smtp_host,
      port: Number(config.smtp_port),
      secure: Number(config.smtp_secure) === 1,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
    }),
    config,
  };
};

const enviarCorreoEmpresa = async ({
  id_empresa,
  to,
  subject,
  html,
  attachments = [],
}) => {
  const { transporter, config } = await crearTransporterEmpresa(id_empresa);

  return transporter.sendMail({
    from: `"${config.smtp_from_name || config.nombre_empresa || "DigiThex"}" <${config.smtp_user}>`,
    replyTo: config.smtp_reply_to || config.smtp_user,
    to,
    subject,
    html,
    attachments,
  });
};

const probarConexionCorreoEmpresa = async (id_empresa) => {
  const { transporter } = await crearTransporterEmpresa(id_empresa);
  await transporter.verify();
  return true;
};

module.exports = {
  enviarCorreoEmpresa,
  probarConexionCorreoEmpresa,
};