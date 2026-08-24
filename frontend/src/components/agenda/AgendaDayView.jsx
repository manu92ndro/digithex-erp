import {
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";

import { useTranslation } from "react-i18next";


// ======================================================
// GENERAR HORAS
// ======================================================

const generarHoras = (
  horaInicio = "08:00",
  horaFin = "17:00",
  intervalo = 30
) => {
  const resultado = [];

  const [
    inicioH,
    inicioM,
  ] =
    horaInicio
      .split(":")
      .map(Number);

  const [
    finH,
    finM,
  ] =
    horaFin
      .split(":")
      .map(Number);

  let actual =
    inicioH * 60 +
    inicioM;

  const final =
    finH * 60 +
    finM;

  while (
    actual <= final
  ) {
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

  const [
    hora,
    minuto,
  ] =
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
  const fecha =
    new Date(valor);

  return (
    fecha.getHours() * 60 +
    fecha.getMinutes()
  );
};


// ======================================================
// HORA DE UNA FECHA
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


  const horas =
    generarHoras(
      horaInicio,
      horaFin,
      intervalo
    );


  const citasOrdenadas =
    [...citas].sort(
      (
        a,
        b
      ) =>
        new Date(
          a.fecha_inicio
        ) -
        new Date(
          b.fecha_inicio
        )
    );


  // ====================================================
  // CITA EN HORARIO
  // ====================================================

  const citaEnHora =
    (
      minutos
    ) => {
      return citasOrdenadas.find(
        (
          cita
        ) => {
          const inicio =
            minutosFecha(
              cita.fecha_inicio
            );

          const fin =
            minutosFecha(
              cita.fecha_fin
            );

          return (
            minutos >= inicio &&
            minutos < fin
          );
        }
      );
    };


  // ====================================================
  // HORARIO PASADO
  // ====================================================

  const slotEsPasado =
    (
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
        (
          hora
        ) => {

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
                min-h-[50px]
                grid-cols-[92px_1fr]
                border-b
                border-slate-100
                last:border-b-0
              "
            >

              {/* HORA */}

              <div
                className={`
                  flex
                  items-center
                  justify-end
                  border-r
                  border-slate-100
                  px-3
                  text-xs
                  font-semibold

                  ${
                    pasado
                      ? "bg-slate-50 text-slate-400"
                      : "bg-white text-slate-600"
                  }
                `}
              >
                {
                  formatoHora12(
                    hora.valor
                  )
                }
              </div>


              {/* CONTENIDO */}

              <div
                className="
                  relative
                  min-h-[50px]
                  p-1.5
                "
              >

                {/* DISPONIBLE */}

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
                      min-h-[38px]
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


                {/* NO DISPONIBLE */}

                {!cita &&
                  pasado && (

                  <div
                    className="
                      flex
                      h-full
                      min-h-[38px]
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


                {/* CITA */}

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
                      border-blue-200
                      bg-blue-50
                      px-3
                      py-2
                      text-left
                      transition
                      hover:border-blue-300
                      hover:bg-blue-100
                    "
                  >

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
                            font-semibold
                            text-slate-800
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
                              truncate
                              text-xs
                              text-blue-600
                            "
                          >
                            {
                              cita.tipo_cita
                            }
                          </p>
                        )}

                      </div>


                      <span
                        className="
                          shrink-0
                          rounded-full
                          bg-white
                          px-2
                          py-0.5
                          text-[9px]
                          font-semibold
                          uppercase
                          text-slate-500
                        "
                      >
                        {
                          cita.estado
                        }
                      </span>

                    </div>


                    <div
                      className="
                        mt-1.5
                        flex
                        flex-wrap
                        gap-x-4
                        gap-y-1
                        text-[11px]
                        text-slate-500
                      "
                    >

                      <span
                        className="
                          flex
                          items-center
                          gap-1
                        "
                      >
                        <Clock3
                          size={12}
                        />

                        {formatearHoraFecha(
                          cita.fecha_inicio,
                          locale
                        )}

                        {" - "}

                        {formatearHoraFecha(
                          cita.fecha_fin,
                          locale
                        )}
                      </span>


                      {cita.asignado_nombre && (
                        <span
                          className="
                            flex
                            items-center
                            gap-1
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


                      {cita.direccion && (
                        <span
                          className="
                            flex
                            min-w-0
                            items-center
                            gap-1
                          "
                        >
                          <MapPin
                            size={12}
                          />

                          <span
                            className="
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