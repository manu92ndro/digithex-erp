import {
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
  BriefcaseBusiness,
} from "lucide-react";

import {
  useTranslation,
} from "react-i18next";


// ======================================================
// FORMATEAR FECHA
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
// FORMATEAR HORA
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
// LIMPIAR TELÉFONO
// ======================================================

const limpiarTelefono = (
  telefono
) => {
  return String(
    telefono || ""
  ).replace(
    /\D/g,
    ""
  );
};


// ======================================================
// COMPONENTE
// ======================================================

export default function AgendaDetalleModal({
  abierto = false,
  cita,
  locale = "es-EC",

  onCerrar,
  onReagendar,
  onCancelar,
  onCompletar,
}) {
  const {
    t,
    i18n,
  } = useTranslation();


  if (
    !abierto ||
    !cita
  ) {
    return null;
  }


  const idiomaIngles =
    i18n.language
      ?.toLowerCase()
      ?.startsWith(
        "en"
      );


  // ====================================================
  // WHATSAPP RESPONSABLE
  // ====================================================

  const enviarWhatsApp =
    () => {
      const telefono =
        limpiarTelefono(
          cita.asignado_celular ||
          cita.responsable_celular
        );

      if (!telefono) {
        return;
      }

      const mensaje =
        idiomaIngles
          ? [
              `Hello ${cita.asignado_nombre || ""},`,
              "",
              "You have an appointment scheduled:",
              "",
              `Client: ${cita.contacto || "-"}`,
              `Job: ${cita.tipo_cita || "-"}`,
              `Date: ${formatearFecha(cita.fecha_inicio, locale)}`,
              `Time: ${formatearHora(cita.fecha_inicio, locale)}`,
              `Address: ${cita.direccion || "-"}`,
              "",
              cita.descripcion
                ? `Description: ${cita.descripcion}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")

          : [
              `Hola ${cita.asignado_nombre || ""},`,
              "",
              "Tienes una cita programada:",
              "",
              `Cliente: ${cita.contacto || "-"}`,
              `Trabajo: ${cita.tipo_cita || "-"}`,
              `Fecha: ${formatearFecha(cita.fecha_inicio, locale)}`,
              `Hora: ${formatearHora(cita.fecha_inicio, locale)}`,
              `Dirección: ${cita.direccion || "-"}`,
              "",
              cita.descripcion
                ? `Descripción: ${cita.descripcion}`
                : "",
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
  // EMAIL RESPONSABLE
  // ====================================================

  const enviarEmail =
    () => {
      const correo =
        cita.asignado_correo ||
        cita.responsable_correo;

      if (!correo) {
        return;
      }

      const asunto =
        idiomaIngles
          ? "Scheduled appointment"
          : "Cita programada";

      const mensaje =
        idiomaIngles
          ? [
              `Hello ${cita.asignado_nombre || ""},`,
              "",
              "You have an appointment scheduled.",
              "",
              `Client: ${cita.contacto || "-"}`,
              `Job: ${cita.tipo_cita || "-"}`,
              `Date: ${formatearFecha(cita.fecha_inicio, locale)}`,
              `Time: ${formatearHora(cita.fecha_inicio, locale)}`,
              `Address: ${cita.direccion || "-"}`,
              "",
              cita.descripcion
                ? `Description: ${cita.descripcion}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")

          : [
              `Hola ${cita.asignado_nombre || ""},`,
              "",
              "Tienes una cita programada.",
              "",
              `Cliente: ${cita.contacto || "-"}`,
              `Trabajo: ${cita.tipo_cita || "-"}`,
              `Fecha: ${formatearFecha(cita.fecha_inicio, locale)}`,
              `Hora: ${formatearHora(cita.fecha_inicio, locale)}`,
              `Dirección: ${cita.direccion || "-"}`,
              "",
              cita.descripcion
                ? `Descripción: ${cita.descripcion}`
                : "",
            ]
              .filter(Boolean)
              .join("\n");

      window.location.href =
        `mailto:${correo}` +
        `?subject=${encodeURIComponent(
          asunto
        )}` +
        `&body=${encodeURIComponent(
          mensaje
        )}`;
    };


  const estado =
    String(
      cita.estado ||
      ""
    ).toLowerCase();

  const bloqueada =
    estado ===
      "cancelada" ||
    estado ===
      "cancelado" ||
    estado ===
      "completada" ||
    estado ===
      "completado";


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
          w-full
          max-w-xl
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            border-b
            border-slate-100
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

          {/* CLIENTE / TRABAJO */}

          <div>
            <p
              className="
                text-xl
                font-bold
                text-slate-900
              "
            >
              {
                cita.contacto ||
                "-"
              }
            </p>

            <div
              className="
                mt-1
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-blue-600
              "
            >
              <BriefcaseBusiness
                size={15}
              />

              {
                cita.tipo_cita ||
                "-"
              }
            </div>
          </div>


          {/* INFO */}

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
                    font-semibold
                    text-slate-800
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


            {cita.direccion && (
              <div
                className="
                  flex
                  gap-2
                  sm:col-span-2
                "
              >
                <MapPin
                  size={17}
                  className="
                    mt-0.5
                    shrink-0
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
                      "agenda.new.address"
                    )}
                  </p>

                  <p
                    className="
                      text-sm
                      text-slate-700
                    "
                  >
                    {
                      cita.direccion
                    }
                  </p>
                </div>
              </div>
            )}

          </div>


          {/* RESPONSABLE */}

          <div>
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
          </div>


          {/* DESCRIPCIÓN */}

          {cita.descripcion && (
            <div>
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
                  text-sm
                  leading-6
                  text-slate-700
                "
              >
                {
                  cita.descripcion
                }
              </p>
            </div>
          )}


          {/* CONTACTAR */}

          <div
            className="
              flex
              flex-wrap
              gap-2
              border-t
              border-slate-100
              pt-4
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

              WhatsApp
            </button>


            <button
              type="button"

              disabled={
                !(
                  cita.asignado_correo ||
                  cita.responsable_correo
                )
              }

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
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <Mail
                size={15}
              />

              {t(
                "agenda.send_email"
              )}
            </button>

          </div>

        </div>


        {/* FOOTER */}

        {!bloqueada && (
          <div
            className="
              flex
              flex-wrap
              justify-end
              gap-2
              border-t
              border-slate-100
              bg-slate-50/70
              px-5
              py-4
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