import {
  AtSign,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  useTranslation,
} from "react-i18next";

import Swal from "sweetalert2";

import {
  enviarAgendaCitaEmail,
} from "../../api/agenda";


// ======================================================
// FORMAT DATE
// ======================================================

const formatearFecha = (
  valor,
  locale
) => {
  if (!valor) {
    return "-";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(fecha);
};


// ======================================================
// FORMAT TIME
// ======================================================

const formatearHora = (
  valor,
  locale
) => {
  if (!valor) {
    return "-";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(fecha);
};


// ======================================================
// FORMAT DATE FOR OUTGOING WHATSAPP
// Always English because the operational message is sent
// to the field assignee in English.
// ======================================================

const formatearFechaWhatsApp = (
  valor
) => {
  if (!valor) {
    return "-";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  )
    .format(fecha)
    .toUpperCase();
};


// ======================================================
// FORMAT TIME FOR OUTGOING WHATSAPP
// ======================================================

const formatearHoraWhatsApp = (
  valor
) => {
  if (!valor) {
    return "-";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(fecha);
};


// ======================================================
// CLEAN PHONE
// ======================================================

const normalizarTelefonoWhatsApp = (
  telefono
) => {
  const original =
    String(
      telefono || ""
    ).trim();

  if (!original) {
    return "";
  }

  let digitos =
    original.replace(
      /\D/g,
      ""
    );

  // International prefix written as 00...
  if (
    digitos.startsWith(
      "00"
    )
  ) {
    digitos =
      digitos.slice(2);
  }

  // Ecuador mobile saved locally:
  // 09XXXXXXXX -> 5939XXXXXXXX
  if (
    /^09\d{8}$/.test(
      digitos
    )
  ) {
    return (
      "593" +
      digitos.slice(1)
    );
  }

  // USA / Canada local 10-digit number:
  // 9735551234 -> 19735551234
  if (
    /^\d{10}$/.test(
      digitos
    )
  ) {
    return (
      "1" +
      digitos
    );
  }

  // Already international, e.g.
  // 5939XXXXXXXX or 1XXXXXXXXXX
  if (
    digitos.length >= 8 &&
    digitos.length <= 15
  ) {
    return digitos;
  }

  return "";
};


// ======================================================
// COMPONENT
// ======================================================

export default function AgendaDetalleModal({
  abierto = false,
  cita,
  locale = "en-US",

  onCerrar,
  onReagendar,
  onCancelar,
  onCompletar,
}) {
  const {
    t,
  } = useTranslation();


  if (
    !abierto ||
    !cita
  ) {
    return null;
  }


  // ====================================================
  // APPOINTMENT STATUS
  // ====================================================

  const estado =
    String(
      cita.estado ||
      ""
    ).toLowerCase();


  const bloqueada =
    estado === "cancelada" ||
    estado === "cancelado" ||
    estado === "completada" ||
    estado === "completado";


  // ====================================================
  // CLIENT DATA
  // ====================================================

  const nombreCliente =
    cita.contacto ||
    cita.nombres ||
    "-";


  const celularCliente =
    String(
      cita.celular ||
      ""
    ).trim();


  const correoCliente =
    String(
      cita.correo ||
      ""
    ).trim();


  const direccionCliente =
    String(
      cita.direccion ||
      ""
    ).trim();


  // ====================================================
  // WHATSAPP TO ASSIGNEE
  // ====================================================

  const enviarWhatsApp =
    () => {

      const telefono =
        normalizarTelefonoWhatsApp(
          cita.asignado_celular ||
          cita.responsable_celular
        );


      if (!telefono) {
        Swal.fire({
          icon: "warning",
          title:
            t(
              "agenda.whatsapp_no_phone_title"
            ),
          text:
            t(
              "agenda.whatsapp_no_phone_message"
            ),
          confirmButtonText:
            t(
              "agenda.ok"
            ),
        });

        return;
      }


      const fecha =
        formatearFechaWhatsApp(
          cita.fecha_inicio
        );


      const hora =
        formatearHoraWhatsApp(
          cita.fecha_inicio
        );


      const mensaje =
        [
          "📅 *NEW APPOINTMENT*",
          "",
          `🗓️ *${fecha}*`,
          `⏰ *TIME: ${hora}*`,
          `📍 Address: ${direccionCliente || "-"}`,
          "",
          `👤 Client: ${nombreCliente}`,
          `🏗️ Project: ${cita.tipo_cita || "-"}`,
          celularCliente
            ? `📞 Client phone: ${celularCliente}`
            : "",
          "",
          "📝 *Project details:*",
          cita.descripcion ||
            "No additional details.",
        ]
          .filter(Boolean)
          .join("\n");


      window.open(
        `https://wa.me/${telefono}?text=${encodeURIComponent(
          mensaje
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    };


  // ====================================================
  // EMAIL CLIENT USING BACKEND SMTP
  // ====================================================

  const enviarEmail =
    async () => {

      const resultado =
        await Swal.fire({
          title:
            t(
              "agenda.email_prompt_title"
            ),

          text:
            t(
              "agenda.email_prompt_message"
            ),

          input:
            "email",

          inputValue:
            correoCliente,

          inputPlaceholder:
            t(
              "agenda.email_placeholder"
            ),

          showCancelButton:
            true,

          confirmButtonText:
            t(
              "agenda.email_send"
            ),

          cancelButtonText:
            t(
              "agenda.new.cancel"
            ),

          reverseButtons:
            true,

          inputValidator:
            (valor) => {
              const email =
                String(
                  valor ||
                  ""
                ).trim();

              if (!email) {
                return t(
                  "agenda.email_required"
                );
              }

              const valido =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  .test(
                    email
                  );

              if (!valido) {
                return t(
                  "agenda.email_invalid"
                );
              }

              return undefined;
            },
        });


      if (
        !resultado.isConfirmed
      ) {
        return;
      }


      const correo =
        String(
          resultado.value ||
          ""
        ).trim();


      try {

        Swal.fire({
          title:
            t(
              "agenda.email_sending"
            ),
          allowOutsideClick:
            false,
          allowEscapeKey:
            false,
          didOpen:
            () => {
              Swal.showLoading();
            },
        });


        const response =
          await enviarAgendaCitaEmail(
            cita.id_cita,
            correo
          );


        await Swal.fire({
          icon: "success",

          title:
            t(
              "agenda.email_sent_title"
            ),

          text:
            response?.message ||
            t(
              "agenda.email_sent_message"
            ),

          confirmButtonText:
            t(
              "agenda.ok"
            ),
        });

      } catch (error) {

        await Swal.fire({
          icon: "error",

          title:
            t(
              "agenda.email_error_title"
            ),

          text:
            error?.response?.data?.message ||
            error?.response?.data?.msg ||
            error?.message ||
            t(
              "agenda.email_error_message"
            ),

          confirmButtonText:
            t(
              "agenda.ok"
            ),
        });
      }
    };


  return (
    <div
      className="
        fixed
        inset-0
        z-[110]
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-3
        backdrop-blur-[2px]
      "
    >

      <div
        className="
          max-h-[94vh]
          w-full
          max-w-2xl
          overflow-y-auto
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* HEADER */}

        <div
          className="
            sticky
            top-0
            z-10
            flex
            items-start
            justify-between
            border-b
            border-slate-100
            bg-white
            px-5
            py-4
          "
        >
          <div>
            <div
              className="
                mb-1
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  rounded-full
                  bg-blue-50
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-blue-700
                "
              >
                {
                  cita.estado
                }
              </span>
            </div>

            <h2
              className="
                text-lg
                font-bold
                text-slate-900
              "
            >
              {t(
                "agenda.appointment_details"
              )}
            </h2>
          </div>


          <button
            type="button"
            onClick={
              onCerrar
            }
            className="
              rounded-lg
              p-2
              text-slate-400
              hover:bg-slate-100
              hover:text-slate-700
            "
            aria-label={
              t(
                "agenda.close"
              )
            }
          >
            <X
              size={18}
            />
          </button>
        </div>


        {/* BODY */}

        <div
          className="
            space-y-5
            p-5
          "
        >

          {/* CLIENT INFORMATION */}

          <section>
            <p
              className="
                mb-2
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              {t(
                "agenda.client_information"
              )}
            </p>


            <div
              className="
                grid
                gap-3
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                sm:grid-cols-2
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-blue-50
                    text-blue-600
                  "
                >
                  <UserRound
                    size={17}
                  />
                </div>

                <div
                  className="
                    min-w-0
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.client"
                    )}
                  </p>

                  <p
                    className="
                      break-words
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    {
                      nombreCliente
                    }
                  </p>
                </div>
              </div>


              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <Phone
                    size={16}
                  />
                </div>

                <div
                  className="
                    min-w-0
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.new.phone"
                    )}
                  </p>

                  {
                    celularCliente
                      ? (
                          <a
                            href={
                              `tel:${celularCliente}`
                            }
                            className="
                              break-words
                              text-sm
                              font-semibold
                              text-slate-800
                              hover:text-blue-600
                            "
                          >
                            {
                              celularCliente
                            }
                          </a>
                        )
                      : (
                          <p
                            className="
                              text-sm
                              text-slate-400
                            "
                          >
                            -
                          </p>
                        )
                  }
                </div>
              </div>


              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-indigo-50
                    text-indigo-600
                  "
                >
                  <AtSign
                    size={16}
                  />
                </div>

                <div
                  className="
                    min-w-0
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.new.email"
                    )}
                  </p>

                  {
                    correoCliente
                      ? (
                          <a
                            href={
                              `mailto:${correoCliente}`
                            }
                            className="
                              break-all
                              text-sm
                              font-semibold
                              text-slate-800
                              hover:text-blue-600
                            "
                          >
                            {
                              correoCliente
                            }
                          </a>
                        )
                      : (
                          <p
                            className="
                              text-sm
                              text-slate-400
                            "
                          >
                            -
                          </p>
                        )
                  }
                </div>
              </div>


              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-amber-50
                    text-amber-600
                  "
                >
                  <MapPin
                    size={16}
                  />
                </div>

                <div
                  className="
                    min-w-0
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.new.address"
                    )}
                  </p>

                  <p
                    className="
                      break-words
                      text-sm
                      text-slate-700
                    "
                  >
                    {
                      direccionCliente ||
                      "-"
                    }
                  </p>
                </div>
              </div>

            </div>
          </section>


          {/* APPOINTMENT INFORMATION */}

          <section>
            <p
              className="
                mb-2
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              {t(
                "agenda.appointment_information"
              )}
            </p>


            <div
              className="
                grid
                gap-3
                rounded-2xl
                bg-slate-50
                p-4
                sm:grid-cols-2
              "
            >

              <div
                className="
                  flex
                  gap-2
                "
              >
                <BriefcaseBusiness
                  size={17}
                  className="
                    mt-0.5
                    text-blue-600
                  "
                />

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.job_type"
                    )}
                  </p>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-blue-700
                    "
                  >
                    {
                      cita.tipo_cita ||
                      "-"
                    }
                  </p>
                </div>
              </div>


              <div
                className="
                  flex
                  gap-2
                "
              >
                <CalendarDays
                  size={17}
                  className="
                    mt-0.5
                    text-blue-600
                  "
                />

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.new.date"
                    )}
                  </p>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {
                      formatearFecha(
                        cita.fecha_inicio,
                        locale
                      )
                    }
                  </p>
                </div>
              </div>


              <div
                className="
                  flex
                  gap-2
                "
              >
                <Clock3
                  size={17}
                  className="
                    mt-0.5
                    text-blue-600
                  "
                />

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.new.time"
                    )}
                  </p>

                  <p
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    {
                      formatearHora(
                        cita.fecha_inicio,
                        locale
                      )
                    }
                  </p>
                </div>
              </div>

            </div>
          </section>


          


          {/* JOB DESCRIPTION */}

          {cita.descripcion && (
            <section>
              <p
                className="
                  mb-1
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-400
                "
              >
                {t(
                  "agenda.job_description"
                )}
              </p>

              <p
                className="
                  whitespace-pre-line
                  rounded-xl
                  bg-slate-50
                  p-3
                  text-sm
                  leading-6
                  text-slate-700
                "
              >
                {
                  cita.descripcion
                }
              </p>
            </section>
          )}


          {/* COMMUNICATION */}

          <section
            className="
              border-t
              border-slate-100
              pt-4
            "
          >
            <p
              className="
                mb-2
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              {t(
                "agenda.communication"
              )}
            </p>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              <button
                type="button"

                disabled={
                  !(
                    cita.asignado_celular ||
                    cita.responsable_celular
                  )
                }

                onClick={
                  enviarWhatsApp
                }

                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-green-200
                  bg-green-50
                  px-3.5
                  py-2
                  text-xs
                  font-semibold
                  text-green-700
                  hover:bg-green-100
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <MessageCircle
                  size={15}
                />

                {t(
                  "agenda.whatsapp_assignee"
                )}
              </button>


              <button
                type="button"

                onClick={
                  enviarEmail
                }

                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-3.5
                  py-2
                  text-xs
                  font-semibold
                  text-blue-700
                  hover:bg-blue-100
                "
              >
                <Mail
                  size={15}
                />

                {t(
                  "agenda.email_client"
                )}
              </button>

            </div>
          </section>

          {/* RESPONSIBLE PERSON */}

          <section>
            <p
              className="
                mb-2
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              {t(
                "agenda.responsible"
              )}
            </p>

            <div
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-slate-200
                p-3
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-50
                  text-blue-600
                "
              >
                <UserRound
                  size={17}
                />
              </div>

              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-800
                  "
                >
                  {
                    cita.asignado_nombre ||
                    t(
                      "agenda.not_assigned"
                    )
                  }
                </p>

                {cita.asignado_rol && (
                  <p
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    {
                      cita.asignado_rol
                    }
                  </p>
                )}
              </div>
            </div>
          </section>

        </div>


        {/* FOOTER */}

        {!bloqueada && (
          <div
            className="
              sticky
              bottom-0
              flex
              flex-wrap
              justify-end
              gap-2
              border-t
              border-slate-100
              bg-slate-50/95
              px-5
              py-4
              backdrop-blur
            "
          >

            <button
              type="button"

              onClick={() =>
                onCancelar?.(
                  cita
                )
              }

              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-red-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-semibold
                text-red-600
                hover:bg-red-50
              "
            >
              <Trash2
                size={15}
              />

              {t(
                "agenda.cancel_appointment"
              )}
            </button>


            <button
              type="button"

              onClick={() =>
                onReagendar?.(
                  cita
                )
              }

              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-700
                hover:bg-slate-100
              "
            >
              <RotateCcw
                size={15}
              />

              {t(
                "agenda.reschedule"
              )}
            </button>


            <button
              type="button"

              onClick={() =>
                onCompletar?.(
                  cita
                )
              }

              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-blue-600
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                hover:bg-blue-700
              "
            >
              <CheckCircle2
                size={15}
              />

              {t(
                "agenda.complete"
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
