import {
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";

import {
  useTranslation,
} from "react-i18next";


// ======================================================
// GENERAR HORAS
// ======================================================

const generarHoras = (
  horaInicio = "08:00",
  horaFin = "17:00",
  intervalo = 30
) => {
  const resultado = [];

  const [inicioH, inicioM] =
    horaInicio
      .split(":")
      .map(Number);

  const [finH, finM] =
    horaFin
      .split(":")
      .map(Number);

  let actual =
    inicioH * 60 +
    inicioM;

  const final =
    finH * 60 +
    finM;

  while (actual <= final) {
    const h =
      Math.floor(
        actual / 60
      );

    const m =
      actual % 60;

    resultado.push({
      minutos: actual,

      valor:
        `${String(h).padStart(
          2,
          "0"
        )}:${String(m).padStart(
          2,
          "0"
        )}`,
    });

    actual += intervalo;
  }

  return resultado;
};


// ======================================================
// HORA 12 HORAS
// ======================================================

const formatoHora12 = (
  hora24
) => {
  if (!hora24) {
    return "";
  }

  const [hora, minuto] =
    hora24
      .split(":")
      .map(Number);

  const periodo =
    hora >= 12
      ? "PM"
      : "AM";

  const hora12 =
    hora % 12 || 12;

  return `${hora12}:${String(
    minuto
  ).padStart(
    2,
    "0"
  )} ${periodo}`;
};


// ======================================================
// MINUTOS DE FECHA
// ======================================================

const minutosFecha = (
  valor
) => {
  if (!valor) {
    return 0;
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return 0;
  }

  return (
    fecha.getHours() * 60 +
    fecha.getMinutes()
  );
};


// ======================================================
// FORMATEAR HORA DE FECHA
// ======================================================

const formatearHoraFecha = (
  valor,
  locale = "es-EC"
) => {
  if (!valor) {
    return "";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "";
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
// COMPONENTE
// ======================================================

export default function AgendaDayView({
  citas = [],

  fechaSeleccionada,

  locale = "es-EC",

  horaInicio = "08:00",

  horaFin = "17:00",

  intervalo = 30,

  onSeleccionarHora,

  onSeleccionarCita,
}) {
  const {
    t,
  } = useTranslation();


  // ====================================================
  // HORAS
  // ====================================================

  const horas =
    generarHoras(
      horaInicio,
      horaFin,
      intervalo
    );


  // ====================================================
  // ORDENAR CITAS
  // ====================================================

  const citasOrdenadas =
    [...citas].sort(
      (a, b) =>
        new Date(
          a.fecha_inicio
        ) -
        new Date(
          b.fecha_inicio
        )
    );


  // ====================================================
  // BUSCAR CITA EN UNA HORA
  // ====================================================

  const citaEnHora = (
    minutos
  ) => {
    return citasOrdenadas.find(
      (cita) => {
        const inicio =
          minutosFecha(
            cita.fecha_inicio
          );

        const fin =
          cita.fecha_fin
            ? minutosFecha(
                cita.fecha_fin
              )
            : inicio + intervalo;

        return (
          minutos >= inicio &&
          minutos < fin
        );
      }
    );
  };


  // ====================================================
  // HORA PASADA
  // ====================================================

  const slotEsPasado = (
    hora
  ) => {
    if (
      !fechaSeleccionada
    ) {
      return false;
    }

    const [
      year,
      month,
      day,
    ] =
      fechaSeleccionada
        .split("-")
        .map(Number);

    const [
      hour,
      minute,
    ] =
      hora
        .split(":")
        .map(Number);

    const slot =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0
      );

    return (
      slot.getTime() <
      Date.now()
    );
  };


  // ====================================================
  // RETURN
  // ====================================================

  return (
    <div
      className="
        overflow-hidden
        bg-white
      "
    >
      {horas.map(
        (hora) => {

          const cita =
            citaEnHora(
              hora.minutos
            );

          const esInicioCita =
            cita &&
            minutosFecha(
              cita.fecha_inicio
            ) ===
              hora.minutos;

          const pasado =
            slotEsPasado(
              hora.valor
            );


          return (
            <div
              key={
                hora.valor
              }
              className="
                grid
                min-h-[52px]
                grid-cols-[92px_1fr]
                border-b
                border-slate-100
                last:border-b-0
              "
            >

              {/* ===================================== */}
              {/* HORA IZQUIERDA */}
              {/* ===================================== */}

              <div
                className={`
                  flex
                  items-center
                  justify-end
                  border-r
                  border-slate-100
                  px-3
                  text-xs

                  ${
                    cita &&
                    esInicioCita
                      ? `
                        bg-blue-50
                        font-extrabold
                        text-blue-700
                      `
                      : pasado
                        ? `
                          bg-slate-50
                          font-medium
                          text-slate-400
                        `
                        : `
                          bg-white
                          font-semibold
                          text-slate-600
                        `
                  }
                `}
              >
                {formatoHora12(
                  hora.valor
                )}
              </div>


              {/* ===================================== */}
              {/* CONTENIDO */}
              {/* ===================================== */}

              <div
                className="
                  relative
                  min-h-[52px]
                  p-1.5
                "
              >

                {/* =================================== */}
                {/* DISPONIBLE */}
                {/* =================================== */}

                {!cita &&
                  !pasado && (

                  <button
                    type="button"

                    onClick={() =>
                      onSeleccionarHora?.(
                        hora.valor
                      )
                    }

                    className="
                      flex
                      h-full
                      min-h-[39px]
                      w-full
                      items-center
                      rounded-lg
                      border
                      border-transparent
                      px-3
                      text-left
                      text-sm
                      font-medium
                      text-slate-700
                      transition

                      hover:border-blue-300
                      hover:bg-blue-50
                      hover:text-blue-700
                    "
                  >
                    {t(
                      "agenda.available",
                      "Disponible"
                    )}
                  </button>
                )}


                {/* =================================== */}
                {/* PASADO */}
                {/* =================================== */}

                {!cita &&
                  pasado && (

                  <div
                    className="
                      flex
                      h-full
                      min-h-[39px]
                      items-center
                      rounded-lg
                      bg-slate-50
                      px-3
                      text-sm
                      font-medium
                      text-slate-400
                    "
                  >
                    {t(
                      "agenda.unavailable",
                      "No disponible"
                    )}
                  </div>
                )}


                {/* =================================== */}
                {/* CITA */}
                {/* =================================== */}

                {cita &&
                  esInicioCita && (

                  <button
                    type="button"

                    onClick={() =>
                      onSeleccionarCita?.(
                        cita
                      )
                    }

                    className="
                      w-full
                      rounded-lg
                      border
                      border-blue-300
                      bg-blue-50
                      px-3
                      py-2
                      text-left
                      shadow-sm
                      transition

                      hover:border-blue-400
                      hover:bg-blue-100
                    "
                  >

                    {/* =============================== */}
                    {/* PARTE SUPERIOR */}
                    {/* =============================== */}

                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-2
                      "
                    >

                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            truncate
                            text-sm
                            font-bold
                            text-slate-900
                          "
                        >
                          {
                            cita.contacto ||
                            cita.nombres ||
                            cita.titulo ||
                            t(
                              "agenda.appointment",
                              "Cita"
                            )
                          }
                        </p>


                        {cita.tipo_cita && (
                          <p
                            className="
                              mt-0.5
                              truncate
                              text-xs
                              font-semibold
                              text-blue-600
                            "
                          >
                            {
                              cita.tipo_cita
                            }
                          </p>
                        )}
                      </div>


                      {/* ESTADO */}

                      <span
                        className="
                          shrink-0
                          rounded-full
                          bg-white
                          px-2
                          py-0.5
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-slate-500
                          shadow-sm
                        "
                      >
                        {
                          cita.estado
                        }
                      </span>

                    </div>


                    {/* =============================== */}
                    {/* INFORMACIÓN */}
                    {/* =============================== */}

                    <div
                      className="
                        mt-1.5
                        flex
                        flex-wrap
                        items-center
                        gap-x-4
                        gap-y-1
                        text-[11px]
                      "
                    >

                      {/* HORA */}

                      <span
                        className="
                          flex
                          items-center
                          gap-1
                          font-extrabold
                          text-blue-700
                        "
                      >
                        <Clock3
                          size={13}
                          className="
                            text-blue-600
                          "
                        />

                        {formatearHoraFecha(
                          cita.fecha_inicio,
                          locale
                        )}
                      </span>


                      {/* RESPONSABLE */}

                      {cita.asignado_nombre && (
                        <span
                          className="
                            flex
                            items-center
                            gap-1
                            font-medium
                            text-slate-600
                          "
                        >
                          <UserRound
                            size={12}
                          />

                          {
                            cita.asignado_nombre
                          }
                        </span>
                      )}


                      {/* DIRECCIÓN */}

                      {cita.direccion && (
                        <span
                          className="
                            flex
                            min-w-0
                            items-center
                            gap-1
                            text-slate-500
                          "
                        >
                          <MapPin
                            size={12}
                          />

                          <span
                            className="
                              max-w-[520px]
                              truncate
                            "
                          >
                            {
                              cita.direccion
                            }
                          </span>
                        </span>
                      )}

                    </div>

                  </button>
                )}

              </div>
            </div>
          );
        }
      )}
    </div>
  );
}