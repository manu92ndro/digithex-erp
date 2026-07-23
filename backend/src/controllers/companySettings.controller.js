const db = require("../config/db");
const { probarConexionCorreoEmpresa } = require("../services/email.service");

const getIdEmpresa = (req) => req.usuario.id_empresa;

const obtenerConfiguracionEmpresa = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const consulta = `
      SELECT
        ec.*,

        e.nombre_empresa,
        e.email,
        e.telefono,
        e.telefono_secundario,
        e.website,
        e.direccion,
        e.logo

      FROM tb_empresas e

      LEFT JOIN tb_empresa_configuracion ec
        ON ec.id_empresa = e.id_empresa

      WHERE e.id_empresa = ?

      LIMIT 1
    `;

    let [rows] = await db.query(consulta, [id_empresa]);

    // Si aún no existe la configuración, la crea
    if (!rows[0] || !rows[0].id_configuracion) {
      await db.query(
        `
        INSERT INTO tb_empresa_configuracion (id_empresa)
        VALUES (?)
        `,
        [id_empresa]
      );

      [rows] = await db.query(consulta, [id_empresa]);
    }

    return res.json({
      ok: true,
      configuracion: rows[0],
    });

  } catch (error) {
    console.error("Error obteniendo configuración:", error);

    return res.status(500).json({
      ok: false,
      msg: "Error obteniendo configuración de empresa",
    });
  }
};

const actualizarConfiguracionEmpresa = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    const {
      color_primario,
      color_secundario,

      tax_rate,
      tax_nombre,

      terminos_renta,
      politica_cancelacion,
      politica_danos,
      materiales_prohibidos,
      instrucciones_recibo,
      pie_recibo,

      mostrar_qr,
      qr_imagen,
      mostrar_firma_cliente,
      mostrar_firma_empresa,

      email_notificaciones,
      mensaje_email_recibo,

      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      smtp_from_name,
      smtp_reply_to,

      sesion_minutos_inactividad,
      idioma_default,
    } = req.body;

    await db.query(
      `
      INSERT INTO tb_empresa_configuracion (
        id_empresa,

        color_primario,
        color_secundario,

        tax_rate,
        tax_nombre,

        terminos_renta,
        politica_cancelacion,
        politica_danos,
        materiales_prohibidos,
        instrucciones_recibo,
        pie_recibo,

        mostrar_qr,
        qr_imagen,
        mostrar_firma_cliente,
        mostrar_firma_empresa,

        email_notificaciones,
        mensaje_email_recibo,

        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_password,
        smtp_from_name,
        smtp_reply_to,

        sesion_minutos_inactividad,
        idioma_default,

        fyh_actualizacion
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
      )
      ON DUPLICATE KEY UPDATE

        color_primario = VALUES(color_primario),
        color_secundario = VALUES(color_secundario),

        tax_rate = VALUES(tax_rate),
        tax_nombre = VALUES(tax_nombre),

        terminos_renta = VALUES(terminos_renta),
        politica_cancelacion = VALUES(politica_cancelacion),
        politica_danos = VALUES(politica_danos),
        materiales_prohibidos = VALUES(materiales_prohibidos),
        instrucciones_recibo = VALUES(instrucciones_recibo),
        pie_recibo = VALUES(pie_recibo),

        mostrar_qr = VALUES(mostrar_qr),
        qr_imagen = VALUES(qr_imagen),
        mostrar_firma_cliente = VALUES(mostrar_firma_cliente),
        mostrar_firma_empresa = VALUES(mostrar_firma_empresa),

        email_notificaciones = VALUES(email_notificaciones),
        mensaje_email_recibo = VALUES(mensaje_email_recibo),

        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_secure = VALUES(smtp_secure),
        smtp_user = VALUES(smtp_user),
        smtp_password = VALUES(smtp_password),
        smtp_from_name = VALUES(smtp_from_name),
        smtp_reply_to = VALUES(smtp_reply_to),

        sesion_minutos_inactividad = VALUES(sesion_minutos_inactividad),
        idioma_default = VALUES(idioma_default),

        fyh_actualizacion = NOW()
      `,
      [
        id_empresa,

        color_primario || "#2563eb",
        color_secundario || "#0f172a",

        Number(tax_rate || 0),
        tax_nombre || "Tax",

        terminos_renta || null,
        politica_cancelacion || null,
        politica_danos || null,
        materiales_prohibidos || null,
        instrucciones_recibo || null,
        pie_recibo || null,

        mostrar_qr ? 1 : 0,
        qr_imagen || null,
        mostrar_firma_cliente ? 1 : 0,
        mostrar_firma_empresa ? 1 : 0,

        email_notificaciones || null,
        mensaje_email_recibo || null,

        smtp_host || null,
        Number(smtp_port || 465),
        smtp_secure ? 1 : 0,
        smtp_user || null,
        smtp_password || null,
        smtp_from_name || null,
        smtp_reply_to || null,

        Number(sesion_minutos_inactividad || 30),
        idioma_default || "en",
      ]
    );

    res.json({
      ok: true,
      msg: "Company settings updated successfully",
    });
  } catch (error) {
    console.error("Error actualizando configuración:", error);

    res.status(500).json({
      ok: false,
      msg: "Error actualizando configuración de empresa",
      error: error.message,
    });
  }
};

const probarCorreoEmpresa = async (req, res) => {
  try {
    const id_empresa = getIdEmpresa(req);

    await probarConexionCorreoEmpresa(id_empresa);

    res.json({
      ok: true,
      msg: "Email connection successful",
    });
  } catch (error) {
    console.error("Error probando correo:", error);

    res.status(500).json({
      ok: false,
      msg: "Email connection failed",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerConfiguracionEmpresa,
  actualizarConfiguracionEmpresa,
  probarCorreoEmpresa,
};