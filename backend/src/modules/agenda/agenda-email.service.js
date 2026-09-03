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
// RESOLVE COMPANY LOGO URL
// ======================================================

const obtenerLogoPublico =
  (
    valor
  ) => {

    const logo =
      limpiarTexto(
        valor
      );

    if (!logo) {
      return "";
    }


    // Cloudinary / external absolute URL
    if (
      /^https?:\/\//i.test(
        logo
      )
    ) {
      return logo;
    }


    // If the database still stores a local filename,
    // configure one of these environment variables with
    // the public API base, for example:
    // API_PUBLIC_URL=https://api.domthex.com
    const basePublica =
      limpiarTexto(
        process.env
          .FILES_PUBLIC_URL ||
        process.env
          .API_PUBLIC_URL ||
        process.env
          .PUBLIC_API_URL
      )
        .replace(
          /\/+$/,
          ""
        );


    if (!basePublica) {
      return "";
    }


    if (
      logo.startsWith(
        "/uploads/"
      )
    ) {
      return (
        basePublica +
        logo
      );
    }


    return (
      `${basePublica}/uploads/logos/${logo}`
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


    const logoEmpresa =
      obtenerLogoPublico(
        cita.empresa_logo
      );


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
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f5f6f8;
            font-family:Arial,Helvetica,sans-serif;
            color:#1f2937;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:100%;
              background:#f5f6f8;
              padding:32px 12px;
            "
          >
            <tr>
              <td align="center">

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    width:100%;
                    max-width:620px;
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >

                  <!-- BRAND -->
                  <tr>
                    <td
                      align="center"
                      style="
                        padding:30px 28px 24px;
                        border-bottom:1px solid #e5e7eb;
                        background:#ffffff;
                      "
                    >
                      ${
                        logoEmpresa
                          ? `
                            <img
                              src="${escaparHtml(
                                logoEmpresa
                              )}"
                              alt="${escaparHtml(
                                empresa
                              )}"
                              width="160"
                              style="
                                display:block;
                                max-width:160px;
                                max-height:80px;
                                width:auto;
                                height:auto;
                                margin:0 auto 16px;
                                border:0;
                                outline:none;
                              "
                            />
                          `
                          : `
                            <div
                              style="
                                margin-bottom:8px;
                                font-size:22px;
                                line-height:1.3;
                                font-weight:700;
                                color:#111827;
                              "
                            >
                              ${escaparHtml(
                                empresa
                              )}
                            </div>
                          `
                      }

                      <div
                        style="
                          font-size:11px;
                          line-height:1.4;
                          font-weight:700;
                          letter-spacing:.12em;
                          text-transform:uppercase;
                          color:#6b7280;
                        "
                      >
                        Appointment Confirmation
                      </div>
                    </td>
                  </tr>


                  <!-- CONTENT -->
                  <tr>
                    <td
                      style="
                        padding:30px 30px 26px;
                        background:#ffffff;
                      "
                    >
                      <p
                        style="
                          margin:0 0 12px;
                          font-size:16px;
                          line-height:1.6;
                          color:#111827;
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
                          margin:0 0 28px;
                          font-size:15px;
                          line-height:1.7;
                          color:#4b5563;
                        "
                      >
                        This email confirms your scheduled appointment with
                        ${escaparHtml(
                          empresa
                        )}.
                      </p>


                      <!-- APPOINTMENT SUMMARY -->
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                          width:100%;
                          border:1px solid #e5e7eb;
                          border-radius:10px;
                          border-collapse:separate;
                          overflow:hidden;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding:18px 20px;
                              border-bottom:1px solid #e5e7eb;
                            "
                          >
                            <div
                              style="
                                margin-bottom:5px;
                                font-size:10px;
                                line-height:1.3;
                                font-weight:700;
                                letter-spacing:.08em;
                                text-transform:uppercase;
                                color:#6b7280;
                              "
                            >
                              Project
                            </div>

                            <div
                              style="
                                font-size:16px;
                                line-height:1.5;
                                font-weight:700;
                                color:#111827;
                              "
                            >
                              ${escaparHtml(
                                proyecto
                              )}
                            </div>
                          </td>
                        </tr>


                        <tr>
                          <td
                            style="
                              padding:18px 20px;
                              border-bottom:1px solid #e5e7eb;
                            "
                          >
                            <div
                              style="
                                margin-bottom:5px;
                                font-size:10px;
                                line-height:1.3;
                                font-weight:700;
                                letter-spacing:.08em;
                                text-transform:uppercase;
                                color:#6b7280;
                              "
                            >
                              Date & Time
                            </div>

                            <div
                              style="
                                font-size:17px;
                                line-height:1.5;
                                font-weight:700;
                                color:#111827;
                              "
                            >
                              ${escaparHtml(
                                fecha
                              )}
                              &nbsp; · &nbsp;
                              ${escaparHtml(
                                hora
                              )}
                            </div>
                          </td>
                        </tr>


                        <tr>
                          <td
                            style="
                              padding:18px 20px;
                              ${
                                responsable
                                  ? "border-bottom:1px solid #e5e7eb;"
                                  : ""
                              }
                            "
                          >
                            <div
                              style="
                                margin-bottom:5px;
                                font-size:10px;
                                line-height:1.3;
                                font-weight:700;
                                letter-spacing:.08em;
                                text-transform:uppercase;
                                color:#6b7280;
                              "
                            >
                              Address
                            </div>

                            <div
                              style="
                                font-size:15px;
                                line-height:1.5;
                                color:#374151;
                              "
                            >
                              ${escaparHtml(
                                direccion
                              )}
                            </div>
                          </td>
                        </tr>


                        ${
                          responsable
                            ? `
                              <tr>
                                <td
                                  style="
                                    padding:18px 20px;
                                  "
                                >
                                  <div
                                    style="
                                      margin-bottom:5px;
                                      font-size:10px;
                                      line-height:1.3;
                                      font-weight:700;
                                      letter-spacing:.08em;
                                      text-transform:uppercase;
                                      color:#6b7280;
                                    "
                                  >
                                    Representative
                                  </div>

                                  <div
                                    style="
                                      font-size:15px;
                                      line-height:1.5;
                                      color:#374151;
                                    "
                                  >
                                    ${escaparHtml(
                                      responsable
                                    )}
                                  </div>
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
                                margin-top:24px;
                              "
                            >
                              <div
                                style="
                                  margin-bottom:7px;
                                  font-size:10px;
                                  line-height:1.3;
                                  font-weight:700;
                                  letter-spacing:.08em;
                                  text-transform:uppercase;
                                  color:#6b7280;
                                "
                              >
                                Project Details
                              </div>

                              <div
                                style="
                                  padding:15px 16px;
                                  border:1px solid #e5e7eb;
                                  border-radius:8px;
                                  background:#fafafa;
                                  font-size:14px;
                                  line-height:1.65;
                                  color:#374151;
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


                      <!-- OFFICE NOTICE -->
                      <div
                        style="
                          margin-top:26px;
                          padding-top:22px;
                          border-top:1px solid #e5e7eb;
                        "
                      >
                        <div
                          style="
                            margin-bottom:8px;
                            font-size:11px;
                            line-height:1.4;
                            font-weight:700;
                            letter-spacing:.08em;
                            text-transform:uppercase;
                            color:#374151;
                          "
                        >
                          Important Information
                        </div>

                        <div
                          style="
                            font-size:14px;
                            line-height:1.7;
                            color:#4b5563;
                          "
                        >
                          For any change, cancellation, or rescheduling,
                          please contact our office directly.
                          Appointment changes should not be coordinated
                          with the field representative.
                        </div>

                        <div
                          style="
                            margin-top:12px;
                            font-size:15px;
                            line-height:1.5;
                            font-weight:700;
                            color:#111827;
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
                          margin:28px 0 0;
                          font-size:14px;
                          line-height:1.7;
                          color:#6b7280;
                        "
                      >
                        Thank you for choosing
                        <strong
                          style="
                            color:#374151;
                          "
                        >
                          ${escaparHtml(
                            empresa
                          )}
                        </strong>.
                      </p>
                    </td>
                  </tr>


                  <!-- FOOTER -->
                  <tr>
                    <td
                      align="center"
                      style="
                        padding:18px 24px;
                        border-top:1px solid #e5e7eb;
                        background:#fafafa;
                        font-size:11px;
                        line-height:1.6;
                        color:#9ca3af;
                      "
                    >
                      This is an appointment confirmation from
                      ${escaparHtml(
                        empresa
                      )}.
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
