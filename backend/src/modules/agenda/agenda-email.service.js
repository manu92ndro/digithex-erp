const nodemailer =
  require("nodemailer");


const repository =
  require(
    "./agenda.repository"
  );


// ======================================================
// HELPERS
// ======================================================

const limpiarTexto =
  (valor) =>
    String(
      valor ??
      ""
    ).trim();


const esEmailValido =
  (correo) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        limpiarTexto(
          correo
        )
      );


const normalizarBoolean =
  (valor) => {

    if (
      valor === true ||
      valor === 1 ||
      valor === "1"
    ) {
      return true;
    }

    return (
      String(
        valor ||
        ""
      )
        .toLowerCase() ===
      "true"
    );
  };


const escaparHtml =
  (valor) =>
    limpiarTexto(
      valor
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );


const convertirFecha =
  (valor) => {

    const fecha =
      new Date(
        valor
      );

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return null;
    }

    return fecha;
  };


const formatearFechaIngles =
  (valor) => {

    const fecha =
      convertirFecha(
        valor
      );

    if (!fecha) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ).format(
      fecha
    );
  };


const formatearHoraIngles =
  (valor) => {

    const fecha =
      convertirFecha(
        valor
      );

    if (!fecha) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    ).format(
      fecha
    );
  };


// ======================================================
// CREATE TRANSPORTER FROM COMPANY SETTINGS
// ======================================================

const crearTransporter =
  (
    configuracion
  ) => {

    const host =
      limpiarTexto(
        configuracion
          ?.smtp_host
      );

    const port =
      Number(
        configuracion
          ?.smtp_port
      );

    const user =
      limpiarTexto(
        configuracion
          ?.smtp_user
      );

    const pass =
      limpiarTexto(
        configuracion
          ?.smtp_password
      );


    if (
      !host ||
      !port ||
      !user ||
      !pass
    ) {
      const error =
        new Error(
          "SMTP is not completely configured for this company"
        );

      error.status = 400;
      error.code =
        "AGENDA_SMTP_NO_CONFIGURADO";

      throw error;
    }


    return nodemailer
      .createTransport({
        host,
        port,

        secure:
          normalizarBoolean(
            configuracion
              ?.smtp_secure
          ),

        auth: {
          user,
          pass,
        },
      });
  };


// ======================================================
// SEND APPOINTMENT CONFIRMATION TO CLIENT
// ======================================================

const enviarConfirmacionCliente =
  async (
    usuario,
    idCita,
    body = {}
  ) => {

    const id_empresa =
      Number(
        usuario
          ?.id_empresa
      );

    const id_cita =
      Number(
        idCita
      );


    if (
      !id_empresa ||
      !id_cita
    ) {
      const error =
        new Error(
          "Invalid company or appointment"
        );

      error.status = 400;
      throw error;
    }


    const cita =
      await repository
        .obtenerCitaPorId({
          id_empresa,
          id_cita,
        });


    if (!cita) {
      const error =
        new Error(
          "Appointment not found"
        );

      error.status = 404;
      error.code =
        "AGENDA_CITA_NO_ENCONTRADA";

      throw error;
    }


    const correoSolicitado =
      limpiarTexto(
        body.correo
      );


    const correoDestino =
      correoSolicitado ||
      limpiarTexto(
        cita.correo
      );


    if (
      !correoDestino ||
      !esEmailValido(
        correoDestino
      )
    ) {
      const error =
        new Error(
          "A valid client email address is required"
        );

      error.status = 400;
      error.code =
        "AGENDA_EMAIL_NO_VALIDO";

      throw error;
    }


    const configuracion =
      await repository
        .obtenerConfiguracionEmailEmpresa(
          id_empresa
        );


    if (!configuracion) {
      const error =
        new Error(
          "Email settings were not found for this company"
        );

      error.status = 400;
      error.code =
        "AGENDA_EMAIL_CONFIG_NO_ENCONTRADA";

      throw error;
    }


    const transporter =
      crearTransporter(
        configuracion
      );


    const empresa =
      limpiarTexto(
        cita.nombre_empresa
      ) ||
      limpiarTexto(
        configuracion
          .smtp_from_name
      ) ||
      "Our Company";


    const cliente =
      limpiarTexto(
        cita.contacto ||
        cita.nombres
      ) ||
      "Customer";


    const proyecto =
      limpiarTexto(
        cita.tipo_cita
      ) ||
      "Appointment";


    const direccion =
      limpiarTexto(
        cita.direccion
      ) ||
      "-";


    const responsable =
      limpiarTexto(
        cita.asignado_nombre
      );


    const descripcion =
      limpiarTexto(
        cita.descripcion
      );


    const fecha =
      formatearFechaIngles(
        cita.fecha_inicio
      );


    const hora =
      formatearHoraIngles(
        cita.fecha_inicio
      );


    const telefonos =
      [
        limpiarTexto(
          cita.telefono_empresa
        ),

        limpiarTexto(
          cita
            .telefono_secundario_empresa
        ),
      ]
        .filter(
          (
            telefono,
            index,
            lista
          ) =>
            telefono &&
            lista.indexOf(
              telefono
            ) === index
        );


    const telefonoOficina =
      telefonos.length
        ? telefonos.join(
            " / "
          )
        : "Please contact our office directly.";


    const asunto =
      `Appointment Confirmation - ${empresa}`;


    const textoPlano =
      [
        `Hello ${cliente},`,
        "",
        `This is a confirmation of your scheduled appointment with ${empresa}.`,
        "",
        `Project: ${proyecto}`,
        `Date: ${fecha}`,
        `Time: ${hora}`,
        `Address: ${direccion}`,
        responsable
          ? `Representative: ${responsable}`
          : "",
        "",
        descripcion
          ? `Project details: ${descripcion}`
          : "",
        "",
        "IMPORTANT:",
        "If you need to make any changes, cancel, or reschedule your appointment, please contact our office directly.",
        "Please do not coordinate appointment changes with the field representative.",
        telefonos.length
          ? `Office phone: ${telefonoOficina}`
          : telefonoOficina,
        "",
        `Thank you for choosing ${empresa}.`,
      ]
        .filter(Boolean)
        .join("\n");


    const html =
      `
      <!doctype html>
      <html>
        <body
          style="
            margin:0;
            padding:0;
            background:#f8fafc;
            font-family:Arial,Helvetica,sans-serif;
            color:#0f172a;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              background:#f8fafc;
              padding:24px 12px;
            "
          >
            <tr>
              <td align="center">

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  style="
                    max-width:620px;
                    background:#ffffff;
                    border:1px solid #e2e8f0;
                    border-radius:16px;
                    overflow:hidden;
                  "
                >

                  <tr>
                    <td
                      style="
                        background:#2563eb;
                        color:#ffffff;
                        padding:22px 28px;
                      "
                    >
                      <div
                        style="
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:.08em;
                          text-transform:uppercase;
                          opacity:.9;
                        "
                      >
                        Appointment Confirmation
                      </div>

                      <div
                        style="
                          margin-top:6px;
                          font-size:24px;
                          font-weight:700;
                        "
                      >
                        ${escaparHtml(
                          empresa
                        )}
                      </div>
                    </td>
                  </tr>


                  <tr>
                    <td
                      style="
                        padding:28px;
                      "
                    >
                      <p
                        style="
                          margin:0 0 18px;
                          font-size:16px;
                          line-height:1.6;
                        "
                      >
                        Hello
                        <strong>
                          ${escaparHtml(
                            cliente
                          )}
                        </strong>,
                      </p>

                      <p
                        style="
                          margin:0 0 22px;
                          font-size:15px;
                          line-height:1.7;
                          color:#475569;
                        "
                      >
                        This is a confirmation of your scheduled appointment with
                        ${escaparHtml(
                          empresa
                        )}.
                      </p>


                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        style="
                          border-collapse:separate;
                          border-spacing:0;
                          background:#f8fafc;
                          border-radius:12px;
                          overflow:hidden;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding:18px 20px 8px;
                              font-size:12px;
                              font-weight:700;
                              color:#64748b;
                              text-transform:uppercase;
                            "
                          >
                            Project
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:0 20px 16px;
                              font-size:17px;
                              font-weight:700;
                            "
                          >
                            ${escaparHtml(
                              proyecto
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:0 20px 8px;
                              font-size:12px;
                              font-weight:700;
                              color:#64748b;
                              text-transform:uppercase;
                            "
                          >
                            Date & Time
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:0 20px 16px;
                              font-size:18px;
                              font-weight:700;
                              color:#1d4ed8;
                            "
                          >
                            ${escaparHtml(
                              fecha
                            )}
                            &nbsp; • &nbsp;
                            ${escaparHtml(
                              hora
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:0 20px 8px;
                              font-size:12px;
                              font-weight:700;
                              color:#64748b;
                              text-transform:uppercase;
                            "
                          >
                            Address
                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:0 20px 18px;
                              font-size:15px;
                              color:#334155;
                            "
                          >
                            ${escaparHtml(
                              direccion
                            )}
                          </td>
                        </tr>

                        ${
                          responsable
                            ? `
                              <tr>
                                <td
                                  style="
                                    padding:0 20px 8px;
                                    font-size:12px;
                                    font-weight:700;
                                    color:#64748b;
                                    text-transform:uppercase;
                                  "
                                >
                                  Representative
                                </td>
                              </tr>

                              <tr>
                                <td
                                  style="
                                    padding:0 20px 18px;
                                    font-size:15px;
                                    color:#334155;
                                  "
                                >
                                  ${escaparHtml(
                                    responsable
                                  )}
                                </td>
                              </tr>
                            `
                            : ""
                        }
                      </table>


                      ${
                        descripcion
                          ? `
                            <div
                              style="
                                margin-top:20px;
                                padding:16px 18px;
                                border-left:4px solid #2563eb;
                                background:#eff6ff;
                                border-radius:8px;
                              "
                            >
                              <div
                                style="
                                  margin-bottom:6px;
                                  font-size:12px;
                                  font-weight:700;
                                  color:#1d4ed8;
                                  text-transform:uppercase;
                                "
                              >
                                Project details
                              </div>

                              <div
                                style="
                                  font-size:14px;
                                  line-height:1.6;
                                  color:#334155;
                                "
                              >
                                ${escaparHtml(
                                  descripcion
                                )}
                              </div>
                            </div>
                          `
                          : ""
                      }


                      <div
                        style="
                          margin-top:22px;
                          padding:16px 18px;
                          border:1px solid #fde68a;
                          background:#fffbeb;
                          border-radius:10px;
                        "
                      >
                        <div
                          style="
                            margin-bottom:6px;
                            font-size:13px;
                            font-weight:700;
                            color:#92400e;
                          "
                        >
                          Need to make a change?
                        </div>

                        <div
                          style="
                            font-size:14px;
                            line-height:1.6;
                            color:#78350f;
                          "
                        >
                          For any change, cancellation, or rescheduling,
                          please contact our office directly.
                          Please do not coordinate appointment changes
                          with the field representative.
                        </div>

                        <div
                          style="
                            margin-top:8px;
                            font-size:15px;
                            font-weight:700;
                            color:#92400e;
                          "
                        >
                          ${
                            telefonos.length
                              ? `Office: ${escaparHtml(
                                  telefonoOficina
                                )}`
                              : escaparHtml(
                                  telefonoOficina
                                )
                          }
                        </div>
                      </div>


                      <p
                        style="
                          margin:24px 0 0;
                          font-size:15px;
                          line-height:1.6;
                          color:#475569;
                        "
                      >
                        Thank you for choosing
                        <strong>
                          ${escaparHtml(
                            empresa
                          )}
                        </strong>.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `;


    const smtpUser =
      limpiarTexto(
        configuracion
          .smtp_user
      );


    const fromName =
      limpiarTexto(
        configuracion
          .smtp_from_name
      ) ||
      empresa;


    const replyTo =
      limpiarTexto(
        configuracion
          .smtp_reply_to
      ) ||
      smtpUser;


    const info =
      await transporter
        .sendMail({
          from:
            `"${fromName.replace(
              /"/g,
              ""
            )}" <${smtpUser}>`,

          to:
            correoDestino,

          replyTo,

          subject:
            asunto,

          text:
            textoPlano,

          html,
        });


    return {
      messageId:
        info.messageId,

      correo:
        correoDestino,
    };
  };


module.exports = {
  enviarConfirmacionCliente,
};
