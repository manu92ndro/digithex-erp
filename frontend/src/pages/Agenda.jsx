import DashboardLayout from "../layouts/DashboardLayout";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTranslation } from "react-i18next";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  Clock3,
  CalendarRange,
  Lock,
} from "lucide-react";

import Swal from "sweetalert2";

import AgendaDayView from "../components/agenda/AgendaDayView";
import AgendaModal from "../components/agenda/AgendaModal";
import AgendaDetalleModal from "../components/agenda/AgendaDetalleModal";



import {
  createAgendaCita,
  getAgendaCitas,
  getAgendaFormData,
  reagendarAgendaCita,
} from "../api/agenda";


// ======================================================
// FECHA LOCAL YYYY-MM-DD
// ======================================================

const fechaLocalISO = (fecha) => {
  const year = fecha.getFullYear();

  const month = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// ======================================================
// SUMAR DÍAS
// ======================================================

const sumarDias = (
  fecha,
  dias
) => {
  const nueva = new Date(fecha);

  nueva.setDate(
    nueva.getDate() + dias
  );

  return nueva;
};


// ======================================================
// PRIMER DÍA DEL MES
// ======================================================

const primerDiaMes = (
  fecha
) => {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    1
  );
};


// ======================================================
// PRIMER DÍA DEL MES SIGUIENTE
// ======================================================

const primerDiaMesSiguiente = (
  fecha
) => {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    1
  );
};


// ======================================================
// CAMBIAR MES
// ======================================================

const cambiarMes = (
  fecha,
  cantidad
) => {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth() + cantidad,
    1
  );
};


// ======================================================
// MISMO DÍA
// ======================================================

const esMismoDia = (
  fechaA,
  fechaB
) => {
  return (
    fechaA.getFullYear() ===
      fechaB.getFullYear() &&
    fechaA.getMonth() ===
      fechaB.getMonth() &&
    fechaA.getDate() ===
      fechaB.getDate()
  );
};


// ======================================================
// FECHA PASADA
// ======================================================

const esFechaPasada = (
  fecha
) => {
  const comparar = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );

  const ahora = new Date();

  const hoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );

  return comparar < hoy;
};


// ======================================================
// CALENDARIO MENSUAL
// ======================================================

const generarDiasCalendario = (
  fechaMes
) => {
  const primero =
    primerDiaMes(
      fechaMes
    );

  // lunes = 0
  // domingo = 6

  const diaSemana =
    (primero.getDay() + 6) % 7;

  const inicio =
    sumarDias(
      primero,
      -diaSemana
    );

  return Array.from(
    {
      length: 42,
    },
    (_, index) =>
      sumarDias(
        inicio,
        index
      )
  );
};


// ======================================================
// NORMALIZAR FECHA CITA
// ======================================================

const obtenerFechaCita = (
  fecha
) => {
  if (!fecha) {
    return null;
  }

  const date =
    new Date(fecha);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};


// ======================================================
// AGRUPAR CITAS
// ======================================================

const agruparCitasPorDia = (
  citas
) => {
  const resultado = {};

  citas.forEach(
    (cita) => {
      const fecha =
        obtenerFechaCita(
          cita.fecha_inicio
        );

      if (!fecha) {
        return;
      }

      const key =
        fechaLocalISO(
          fecha
        );

      if (!resultado[key]) {
        resultado[key] = [];
      }

      resultado[key].push(
        cita
      );
    }
  );

  return resultado;
};


// ======================================================
// COMPONENTE
// ======================================================

export default function Agenda() {
  const {
    t,
    i18n,
  } = useTranslation();


  // ====================================================
  // IDIOMA / LOCALE
  // ====================================================

  const locale =
    i18n.language
      ?.toLowerCase()
      ?.startsWith("en")
      ? "en-US"
      : "es-EC";


  // ====================================================
  // MES ACTUAL
  // ====================================================

  const [
    mesActual,
    setMesActual,
  ] = useState(
    new Date()
  );


  // ====================================================
  // FECHA SELECCIONADA
  // ====================================================

  const [
    fechaSeleccionada,
    setFechaSeleccionada,
  ] = useState(
    new Date()
  );


  // ====================================================
  // CITAS DEL MES
  // ====================================================

  const [
    citasMes,
    setCitasMes,
  ] = useState([]);


  // ====================================================
  // FORM DATA
  // ====================================================

  const [
    formData,
    setFormData,
  ] = useState({
    medios_contacto: [],
    tipos_cita: [],
    usuarios: [],

    configuracion: {
      hora_inicio: "08:00",
      hora_fin: "17:00",
      intervalo_minutos: 30,
    },
  });


  // ====================================================
  // LOADING
  // ====================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  // ====================================================
  // MODAL
  // ====================================================

  const [
    modalAbierto,
    setModalAbierto,
  ] = useState(false);


  // ====================================================
  // HORA
  // ====================================================

  const [
    horaSeleccionada,
    setHoraSeleccionada,
  ] = useState(
    "08:00"
  );


  // ====================================================
  // GUARDANDO
  // ====================================================

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  // ====================================================
  const [
    citaSeleccionada,
    setCitaSeleccionada,
  ] = useState(null);

  const [
    detalleAbierto,
    setDetalleAbierto,
  ] = useState(false);


  // ====================================================
  // HOY
  // ====================================================



  const hoy =
    useMemo(
      () => new Date(),
      []
    );


  // ====================================================
  // FECHA ISO
  // ====================================================

  const fechaISO =
    useMemo(
      () =>
        fechaLocalISO(
          fechaSeleccionada
        ),
      [
        fechaSeleccionada,
      ]
    );


  // ====================================================
  // FECHA PASADA
  // ====================================================

  const fechaSeleccionadaPasada =
    useMemo(
      () =>
        esFechaPasada(
          fechaSeleccionada
        ),
      [
        fechaSeleccionada,
      ]
    );


  // ====================================================
  // DÍAS DEL CALENDARIO
  // ====================================================

  const diasCalendario =
    useMemo(
      () =>
        generarDiasCalendario(
          mesActual
        ),
      [
        mesActual,
      ]
    );


  // ====================================================
  // CITAS AGRUPADAS
  // ====================================================

  const citasPorDia =
    useMemo(
      () =>
        agruparCitasPorDia(
          citasMes
        ),
      [
        citasMes,
      ]
    );


  // ====================================================
  // CITAS DÍA SELECCIONADO
  // ====================================================

  const citasDia =
    useMemo(
      () =>
        citasPorDia[
          fechaISO
        ] || [],
      [
        citasPorDia,
        fechaISO,
      ]
    );


  // ====================================================
  // FORM DATA
  // ====================================================

  const cargarFormData =
    useCallback(
      async () => {
        const response =
          await getAgendaFormData();

        setFormData({
          medios_contacto:
            response
              ?.medios_contacto ||
            [],

          tipos_cita:
            response
              ?.tipos_cita ||
            [],

          usuarios:
            response
              ?.usuarios ||
            [],

          configuracion: {
            hora_inicio:
              response
                ?.configuracion
                ?.hora_inicio ||
              "08:00",

            hora_fin:
              response
                ?.configuracion
                ?.hora_fin ||
              "17:00",

            intervalo_minutos:
              Number(
                response
                  ?.configuracion
                  ?.intervalo_minutos
              ) || 30,
          },
        });
      },
      []
    );


  // ====================================================
  // CARGAR CITAS
  // ====================================================

  const cargarCitas =
    useCallback(
      async () => {
        const desde =
          primerDiaMes(
            mesActual
          );

        const hasta =
          primerDiaMesSiguiente(
            mesActual
          );

        const response =
          await getAgendaCitas({
            fecha_desde:
              fechaLocalISO(
                desde
              ),

            fecha_hasta:
              fechaLocalISO(
                hasta
              ),
          });

        setCitasMes(
          response?.citas ||
          []
        );
      },
      [
        mesActual,
      ]
    );


  // ====================================================
  // CARGA INICIAL
  // ====================================================

  useEffect(() => {
    let activo = true;

    const cargar =
      async () => {
        try {
          setLoading(
            true
          );

          await Promise.all([
            cargarFormData(),
            cargarCitas(),
          ]);

        } catch (error) {
          console.error(
            "ERROR CARGANDO AGENDA:",
            error
          );

          if (activo) {
            Swal.fire({
              icon: "error",

              title:
                t(
                  "agenda.title",
                  "Agenda"
                ),

              text:
                error.response
                  ?.data
                  ?.message ||
                t(
                  "agenda.load_error",
                  "No se pudo cargar la agenda."
                ),
            });
          }

        } finally {
          if (activo) {
            setLoading(
              false
            );
          }
        }
      };

    cargar();

    return () => {
      activo = false;
    };

  }, [
    cargarFormData,
    cargarCitas,
    t,
  ]);


  // ====================================================
  // MES ANTERIOR
  // ====================================================

  const irMesAnterior =
    () => {
      const nuevoMes =
        cambiarMes(
          mesActual,
          -1
        );

      setMesActual(
        nuevoMes
      );

      setFechaSeleccionada(
        nuevoMes
      );
    };


  // ====================================================
  // MES SIGUIENTE
  // ====================================================

  const irMesSiguiente =
    () => {
      const nuevoMes =
        cambiarMes(
          mesActual,
          1
        );

      setMesActual(
        nuevoMes
      );

      setFechaSeleccionada(
        nuevoMes
      );
    };


  // ====================================================
  // HOY
  // ====================================================

  const irHoy =
    () => {
      const ahora =
        new Date();

      setMesActual(
        ahora
      );

      setFechaSeleccionada(
        ahora
      );
    };


  // ====================================================
  // SELECCIONAR DÍA
  // ====================================================

  const seleccionarDia =
    (
      fecha
    ) => {
      setFechaSeleccionada(
        fecha
      );

      if (
        fecha.getMonth() !==
          mesActual.getMonth() ||
        fecha.getFullYear() !==
          mesActual.getFullYear()
      ) {
        setMesActual(
          new Date(
            fecha.getFullYear(),
            fecha.getMonth(),
            1
          )
        );
      }
    };


  // ====================================================
  // ABRIR NUEVA CITA
  // ====================================================

  const abrirNuevaCita =
    (
      hora =
        formData
          ?.configuracion
          ?.hora_inicio ||
        "08:00"
    ) => {
      if (
        esFechaPasada(
          fechaSeleccionada
        )
      ) {
        return;
      }

      setHoraSeleccionada(
        hora
      );

      setModalAbierto(
        true
      );
    };


  // ====================================================
  // DOBLE CLIC DÍA
  // ====================================================

  const abrirCitaDesdeDia =
    (
      fecha
    ) => {
      if (
        esFechaPasada(
          fecha
        )
      ) {
        return;
      }

      seleccionarDia(
        fecha
      );

      setHoraSeleccionada(
        formData
          ?.configuracion
          ?.hora_inicio ||
        "08:00"
      );

      setModalAbierto(
        true
      );
    };


  // ====================================================
  // GUARDAR CITA
  // ====================================================

  const guardarCita =
    async (
      payload
    ) => {
      try {
        setGuardando(
          true
        );

        await createAgendaCita(
          payload
        );

        setModalAbierto(
          false
        );

        await cargarCitas();

        await Swal.fire({
          icon: "success",

          title:
            t(
              "agenda.saved_title",
              "Cita agendada"
            ),

          text:
            t(
              "agenda.saved_message",
              "La cita fue registrada correctamente."
            ),

          timer: 1800,

          showConfirmButton:
            false,
        });

      } catch (error) {
        console.error(
          "ERROR CREANDO CITA:",
          error
        );

        Swal.fire({
          icon: "error",

          title:
            t(
              "agenda.save_error_title",
              "No se pudo guardar"
            ),

          text:
            error.response
              ?.data
              ?.message ||
            t(
              "agenda.save_error",
              "Ocurrió un error al registrar la cita."
            ),
        });

      } finally {
        setGuardando(
          false
        );
      }
    };




  // ====================================================
  // REAGENDAR CITA
  // ====================================================

  const reagendarCita =
    async (
      cita
    ) => {

      if (
        !cita?.id_cita
      ) {
        return;
      }

      const fechaActual =
        obtenerFechaCita(
          cita.fecha_inicio
        );

      if (!fechaActual) {
        return;
      }

      const fechaInicial =
        fechaLocalISO(
          fechaActual
        );

      const horaInicial =
        `${String(
          fechaActual.getHours()
        ).padStart(
          2,
          "0"
        )}:${String(
          fechaActual.getMinutes()
        ).padStart(
          2,
          "0"
        )}`;

      const resultado =
        await Swal.fire({
          title:
            t(
              "agenda.reschedule",
              "Reagendar"
            ),

          html: `
            <div style="text-align:left;">
              <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">
                ${t(
                  "agenda.new.date",
                  "Fecha"
                )}
              </label>

              <input
                id="agenda-reagendar-fecha"
                type="date"
                value="${fechaInicial}"
                min="${fechaLocalISO(
                  new Date()
                )}"
                class="swal2-input"
                style="width:100%;margin:0 0 14px 0;"
              />

              <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">
                ${t(
                  "agenda.new.time",
                  "Hora"
                )}
              </label>

              <input
                id="agenda-reagendar-hora"
                type="time"
                value="${horaInicial}"
                min="${
                  formData
                    ?.configuracion
                    ?.hora_inicio ||
                  "08:00"
                }"
                max="${
                  formData
                    ?.configuracion
                    ?.hora_fin ||
                  "17:00"
                }"
                step="${
                  (
                    Number(
                      formData
                        ?.configuracion
                        ?.intervalo_minutos
                    ) || 30
                  ) * 60
                }"
                class="swal2-input"
                style="width:100%;margin:0;"
              />
            </div>
          `,

          showCancelButton:
            true,

          confirmButtonText:
            t(
              "agenda.reschedule",
              "Reagendar"
            ),

          cancelButtonText:
            t(
              "agenda.new.cancel",
              "Cancelar"
            ),

          confirmButtonColor:
            "#2563eb",

          focusConfirm:
            false,

          preConfirm:
            () => {
              const fecha =
                document
                  .getElementById(
                    "agenda-reagendar-fecha"
                  )
                  ?.value;

              const hora =
                document
                  .getElementById(
                    "agenda-reagendar-hora"
                  )
                  ?.value;

              if (
                !fecha ||
                !hora
              ) {

                Swal
                  .showValidationMessage(
                    t(
                      "agenda.reschedule_required",
                      "Selecciona una fecha y una hora."
                    )
                  );

                return false;
              }

              const nuevaFecha =
                new Date(
                  `${fecha}T${hora}:00`
                );

              if (
                Number.isNaN(
                  nuevaFecha.getTime()
                ) ||
                nuevaFecha.getTime() <
                  Date.now()
              ) {

                Swal
                  .showValidationMessage(
                    t(
                      "agenda.reschedule_past",
                      "La nueva fecha y hora no pueden estar en el pasado."
                    )
                  );

                return false;
              }

              return {
                fecha,
                hora,
              };
            },
        });

      if (
        !resultado.isConfirmed ||
        !resultado.value
      ) {
        return;
      }

      try {

        Swal.fire({
          title:
            t(
              "agenda.rescheduling",
              "Reagendando..."
            ),

          allowOutsideClick:
            false,

          allowEscapeKey:
            false,

          didOpen:
            () => {
              Swal
                .showLoading();
            },
        });

        const response =
          await reagendarAgendaCita(
            cita.id_cita,
            resultado.value
          );

        const nuevaCita =
          response?.cita;

        const nuevaFecha =
          obtenerFechaCita(
            nuevaCita
              ?.fecha_inicio ||
            `${resultado.value.fecha}T${resultado.value.hora}:00`
          );

        setDetalleAbierto(
          false
        );

        setCitaSeleccionada(
          null
        );

        if (nuevaFecha) {

          setFechaSeleccionada(
            nuevaFecha
          );

          setMesActual(
            new Date(
              nuevaFecha.getFullYear(),
              nuevaFecha.getMonth(),
              1
            )
          );
        }

        await cargarCitas();

        await Swal.fire({
          icon:
            "success",

          title:
            t(
              "agenda.rescheduled_title",
              "Cita reagendada"
            ),

          text:
            response?.message ||
            t(
              "agenda.rescheduled_message",
              "La cita fue reagendada correctamente."
            ),

          timer:
            1800,

          showConfirmButton:
            false,
        });


      } catch (error) {

        console.error(
          "ERROR REAGENDANDO CITA:",
          error
        );

        await Swal.fire({
          icon:
            "error",

          title:
            t(
              "agenda.reschedule_error_title",
              "No se pudo reagendar"
            ),

          text:
            error.response
              ?.data
              ?.message ||
            t(
              "agenda.reschedule_error",
              "Ocurrió un error al reagendar la cita."
            ),
        });
      }
    };


  // ====================================================
  // TÍTULO MES
  // ====================================================

  const tituloMes =
    new Intl.DateTimeFormat(
      locale,
      {
        month: "long",
        year: "numeric",
      }
    ).format(
      mesActual
    );


  // ====================================================
  // TÍTULO DÍA
  // ====================================================

  const tituloDia =
    new Intl.DateTimeFormat(
      locale,
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(
      fechaSeleccionada
    );


  // ====================================================
  // DÍAS SEMANA
  // ====================================================

  const diasSemana = [
    t(
      "agenda.days.mon",
      "Lun"
    ),

    t(
      "agenda.days.tue",
      "Mar"
    ),

    t(
      "agenda.days.wed",
      "Mié"
    ),

    t(
      "agenda.days.thu",
      "Jue"
    ),

    t(
      "agenda.days.fri",
      "Vie"
    ),

    t(
      "agenda.days.sat",
      "Sáb"
    ),

    t(
      "agenda.days.sun",
      "Dom"
    ),
  ];

  const estilosDiasSemana = [
    {
      header: "bg-blue-50 text-blue-800 border-blue-100",
      cell: "hover:bg-blue-50/70",
    },
    {
      header: "bg-indigo-50 text-indigo-800 border-indigo-100",
      cell: "hover:bg-indigo-50/70",
    },
    {
      header: "bg-violet-50 text-violet-800 border-violet-100",
      cell: "hover:bg-violet-50/70",
    },
    {
      header: "bg-cyan-50 text-cyan-800 border-cyan-100",
      cell: "hover:bg-cyan-50/70",
    },
    {
      header: "bg-emerald-50 text-emerald-800 border-emerald-100",
      cell: "hover:bg-emerald-50/70",
    },
    {
      header: "bg-amber-50 text-amber-800 border-amber-100",
      cell: "hover:bg-amber-50/70",
    },
    {
      header: "bg-rose-50 text-rose-800 border-rose-100",
      cell: "hover:bg-rose-50/70",
    },
  ];

  // ====================================================
  // RETURN
  // ====================================================

  return (
    <DashboardLayout>

      <div
        className="
          min-h-full
          bg-slate-100
          p-3
          md:p-4
        "
      >

        <div
          className="
            mx-auto
            max-w-7xl
          "
        >

          {/* ========================================= */}
          {/* HEADER */}
          {/* ========================================= */}

          <div
            className="
              mb-4
              flex
              flex-col
              gap-3
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  text-white
                  shadow-sm
                "
              >
                <CalendarDays
                  size={20}
                />
              </div>


              <div>
                <h1
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  {t(
                    "agenda.title",
                    "Agenda"
                  )}
                </h1>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  {t(
                    "agenda.subtitle",
                    "Organiza citas, reuniones y visitas."
                  )}
                </p>
              </div>

            </div>


            {!fechaSeleccionadaPasada && (
              <button
                type="button"

                onClick={() =>
                  abrirNuevaCita()
                }

                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                "
              >
                <Plus
                  size={17}
                />

                {t(
                  "agenda.new_appointment",
                  "Nueva cita"
                )}
              </button>
            )}

          </div>


          {/* ========================================= */}
          {/* CALENDARIO */}
          {/* ========================================= */}

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >

            {/* HEADER MES */}

            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-slate-100
                p-3
                md:flex-row
                md:items-center
                md:justify-between
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-slate-700
                  "
                >
                  <CalendarRange
                    size={18}
                  />
                </div>


                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.15em]
                      text-blue-600
                    "
                  >
                    {t(
                      "agenda.calendar",
                      "Calendario"
                    )}
                  </p>

                  <h2
                    className="
                      text-lg
                      font-bold
                      capitalize
                      text-slate-900
                    "
                  >
                    {tituloMes}
                  </h2>
                </div>

              </div>


              <div
                className="
                  flex
                  items-center
                  gap-1.5
                "
              >

                <button
                  type="button"

                  onClick={
                    irMesAnterior
                  }

                  className="
                    rounded-lg
                    border
                    border-slate-200
                    p-2
                    text-slate-600
                    transition
                    hover:bg-slate-50
                  "
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>


                <button
                  type="button"

                  onClick={
                    irHoy
                  }

                  className="
                    rounded-lg
                    border
                    border-slate-200
                    px-3
                    py-2
                    text-xs
                    font-medium
                    text-slate-700
                    transition
                    hover:bg-slate-50
                  "
                >
                  {t(
                    "agenda.today",
                    "Hoy"
                  )}
                </button>


                <button
                  type="button"

                  onClick={
                    irMesSiguiente
                  }

                  className="
                    rounded-lg
                    border
                    border-slate-200
                    p-2
                    text-slate-600
                    transition
                    hover:bg-slate-50
                  "
                >
                  <ChevronRight
                    size={17}
                  />
                </button>


                <button
                  type="button"

                  onClick={
                    cargarCitas
                  }

                  className="
                    rounded-lg
                    border
                    border-slate-200
                    p-2
                    text-slate-600
                    transition
                    hover:bg-slate-50
                  "
                >
                  <RefreshCcw
                    size={16}
                  />
                </button>

              </div>

            </div>


            {/* DÍAS SEMANA */}

            <div
              className="
                grid
                grid-cols-7
                border-b
                border-slate-200
              "
            >
              {diasSemana.map((dia, index) => (
                <div
                  key={`${dia}-${index}`}
                  className={`
                    border-r
                    py-2.5
                    text-center
                    text-[11px]
                    font-extrabold
                    uppercase
                    tracking-wide
                    last:border-r-0
                    ${estilosDiasSemana[index].header}
                  `}
                >
                  {dia}
                </div>
              ))}
            </div>


            {/* DÍAS */}

            {loading ? (
              <div
                className="
                  flex
                  min-h-[300px]
                  items-center
                  justify-center
                  text-sm
                  text-slate-500
                "
              >
                {t(
                  "agenda.loading",
                  "Cargando agenda..."
                )}
              </div>

            ) : (
              <div
                className="
                  grid
                  grid-cols-7
                "
              >

                {diasCalendario.map((fecha) => {
                  const key =
                    fechaLocalISO(fecha);

                  const citasDiaCalendario =
                    citasPorDia[key] || [];

                  const perteneceMes =
                    fecha.getMonth() ===
                      mesActual.getMonth() &&
                    fecha.getFullYear() ===
                      mesActual.getFullYear();

                  const seleccionado =
                    esMismoDia(
                      fecha,
                      fechaSeleccionada
                    );

                  const esHoy =
                    esMismoDia(
                      fecha,
                      hoy
                    );

                  const fechaPasada =
                    esFechaPasada(fecha);


                  // ==========================================
                  // COLOR SEGÚN DÍA DE LA SEMANA
                  // ==========================================

                  const indiceDiaSemana =
                    (fecha.getDay() + 6) % 7;

                  const estiloDia =
                    estilosDiasSemana[indiceDiaSemana];


                  // ==========================================
                  // ORDENAR CITAS DEL DÍA
                  // ==========================================

                  const citasOrdenadasCalendario =
                    [...citasDiaCalendario].sort(
                      (a, b) => {
                        const fechaA =
                          new Date(
                            String(
                              a.fecha_inicio || ""
                            ).replace(
                              " ",
                              "T"
                            )
                          );

                        const fechaB =
                          new Date(
                            String(
                              b.fecha_inicio || ""
                            ).replace(
                              " ",
                              "T"
                            )
                          );

                        return (
                          fechaA.getTime() -
                          fechaB.getTime()
                        );
                      }
                    );


                  // ==========================================
                  // CITA VISIBLE EN EL CALENDARIO
                  // ==========================================

                  let citaVisible =
                    null;

                  if (
                    citasOrdenadasCalendario.length >
                    0
                  ) {

                    if (fechaPasada) {

                      citaVisible =
                        citasOrdenadasCalendario[
                          citasOrdenadasCalendario.length -
                            1
                        ];

                    } else if (esHoy) {

                      const ahoraCalendario =
                        new Date();

                      const proximaCita =
                        citasOrdenadasCalendario.find(
                          (cita) => {

                            const fechaCita =
                              new Date(
                                String(
                                  cita.fecha_inicio ||
                                  ""
                                ).replace(
                                  " ",
                                  "T"
                                )
                              );

                            return (
                              !Number.isNaN(
                                fechaCita.getTime()
                              ) &&
                              fechaCita.getTime() >=
                                ahoraCalendario.getTime()
                            );
                          }
                        );

                      citaVisible =
                        proximaCita ||
                        citasOrdenadasCalendario[
                          citasOrdenadasCalendario.length -
                            1
                        ];

                    } else {

                      citaVisible =
                        citasOrdenadasCalendario[0];

                    }
                  }


                  // ==========================================
                  // HORA DE LA CITA VISIBLE
                  // ==========================================

                  let horaCitaVisible =
                    "";

                  if (citaVisible) {

                    const fechaInicioVisible =
                      new Date(
                        String(
                          citaVisible.fecha_inicio ||
                          ""
                        ).replace(
                          " ",
                          "T"
                        )
                      );

                    if (
                      !Number.isNaN(
                        fechaInicioVisible.getTime()
                      )
                    ) {

                      horaCitaVisible =
                        fechaInicioVisible
                          .toLocaleTimeString(
                            locale,
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          );
                    }
                  }


                  return (
                    <button
                      type="button"
                      key={key}

                      onClick={() =>
                        seleccionarDia(fecha)
                      }

                      onDoubleClick={() =>
                        abrirCitaDesdeDia(fecha)
                      }

                      title={
                        fechaPasada
                          ? t(
                              "agenda.past_date",
                              "Fecha pasada"
                            )
                          : t(
                              "agenda.double_click",
                              "Doble clic para crear una cita"
                            )
                      }

                      className={`
                        group
                        relative
                        min-h-[58px]
                        border-b
                        border-r
                        border-slate-200/80
                        p-1.5
                        text-center
                        transition

                        ${
                          seleccionado
                            ? "bg-sky-50 ring-2 ring-inset ring-blue-500"
                            : !perteneceMes
                              ? "bg-slate-50"
                              : fechaPasada
                                ? "bg-slate-50"
                                : citasDiaCalendario.length > 0
                                  ? "bg-violet-50/40 hover:bg-violet-50/70"
                                  : `bg-white ${estiloDia.cell}`
                        }

                        ${
                          fechaPasada
                            ? "cursor-default"
                            : "cursor-pointer"
                        }
                      `}
                    >

                      <div
                        className="
                          flex
                          items-center
                          justify-center
                        "
                      >
                        <span
                          className={`
                            flex
                            h-7
                            min-w-7
                            items-center
                            justify-center
                            rounded-full
                            px-1
                            text-xs
                            font-bold
                            transition

                            ${
                              esHoy
                                ? "bg-emerald-500 text-white shadow-sm"
                                : seleccionado
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : !perteneceMes
                                    ? "text-slate-300"
                                    : fechaPasada
                                      ? "text-slate-400"
                                      : "text-slate-700"
                            }
                          `}
                        >
                          {fecha.getDate()}
                        </span>


                        {citasDiaCalendario.length > 0 && (
                          <span
                            className="
                              ml-1
                              inline-flex
                              h-4
                              min-w-4
                              items-center
                              justify-center
                              rounded-full
                              bg-violet-100
                              px-1
                              text-[9px]
                              font-bold
                              text-violet-700
                            "
                          >
                            {citasDiaCalendario.length}
                          </span>
                        )}
                      </div>


                      <div
                        className="
                          mt-1
                          min-h-[18px]
                        "
                      >
                        {citaVisible && (
                          <div
                            className={`
                              truncate
                              rounded-md
                              border
                              px-1.5
                              py-0.5
                              text-center
                              text-[9px]

                              ${
                                fechaPasada
                                  ? "border-slate-200 bg-slate-100 text-slate-500"
                                  : "border-violet-200 bg-violet-50 text-violet-700"
                              }
                            `}
                          >
                            <span
                              className="
                                font-extrabold
                              "
                            >
                              {horaCitaVisible}
                            </span>

                            {" · "}

                            <span
                              className="
                                font-medium
                              "
                            >
                              {citaVisible.contacto ||
                                citaVisible.nombres ||
                                ""}
                            </span>
                          </div>
                        )}
                      </div>

                    </button>
                  );
                })}

              </div>
            )}

          </div>


          {/* ========================================= */}
          {/* HORARIO DEL DÍA */}
          {/* ========================================= */}

          <div
            className="
              mt-4
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >

            {/* HEADER HORARIO */}

            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-slate-100
                p-4
                md:flex-row
                md:items-center
                md:justify-between
              "
            >

              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Clock3
                    size={16}
                    className="
                      text-blue-600
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.15em]
                      text-blue-600
                    "
                  >
                    {t(
                      "agenda.day_schedule",
                      "Horario del día"
                    )}
                  </p>
                </div>


                <h3
                  className="
                    mt-1
                    text-base
                    font-bold
                    capitalize
                    text-slate-900
                  "
                >
                  {tituloDia}
                </h3>


                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  {citasDia.length === 0
                    ? t(
                        "agenda.no_appointments",
                        "No hay citas programadas."
                      )
                    : citasDia.length === 1
                      ? t(
                          "agenda.one_appointment",
                          "1 cita programada."
                        )
                      : t(
                          "agenda.appointments_count",
                          {
                            count:
                              citasDia.length,

                            defaultValue:
                              `${citasDia.length} citas programadas.`,
                          }
                        )}
                </p>

              </div>


              {!fechaSeleccionadaPasada ? (
                <button
                  type="button"

                  onClick={() =>
                    abrirNuevaCita()
                  }

                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-blue-200
                    bg-blue-50
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-blue-700
                    transition
                    hover:bg-blue-100
                  "
                >
                  <Plus
                    size={15}
                  />

                  {t(
                    "agenda.schedule_this_day",
                    "Agendar este día"
                  )}
                </button>

              ) : (
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-100
                    px-4
                    py-2
                    text-xs
                    font-medium
                    text-slate-500
                  "
                >
                  <Lock
                    size={14}
                  />

                  {t(
                    "agenda.past_date",
                    "Fecha pasada"
                  )}
                </div>
              )}

            </div>


            {/* HORARIO CON SCROLL */}

            <div
              className="
                p-3
              "
            >

              <div
                className="
                  max-h-[390px]
                  overflow-y-auto
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                "
              >

                <AgendaDayView
                  citas={
                    citasDia
                  }

                  fechaSeleccionada={
                    fechaISO
                  }

                  locale={
                    locale
                  }

                  horaInicio={
                    formData
                      ?.configuracion
                      ?.hora_inicio ||
                    "08:00"
                  }

                  horaFin={
                    formData
                      ?.configuracion
                      ?.hora_fin ||
                    "17:00"
                  }

                  intervalo={
                    Number(
                      formData
                        ?.configuracion
                        ?.intervalo_minutos
                    ) || 30
                  }

                  onSeleccionarHora={
                    abrirNuevaCita
                  }

                  onSeleccionarCita={
                    (cita) => {
                      setCitaSeleccionada(
                        cita
                      );

                      setDetalleAbierto(
                        true
                      );
                    }
                  }
                />

              </div>

            </div>

          </div>

        </div>


        {/* =========================================== */}
        {/* MODAL */}
        {/* =========================================== */}

        <AgendaModal
          abierto={
            modalAbierto
          }

          fechaSeleccionada={
            fechaISO
          }

          horaSeleccionada={
            horaSeleccionada
          }

          formData={
            formData
          }

          guardando={
            guardando
          }

          locale={
            locale
          }

          onCerrar={() =>
            setModalAbierto(
              false
            )
          }

          onGuardar={
            guardarCita
          }
        />
        <AgendaDetalleModal
          abierto={
            detalleAbierto
          }

          cita={
            citaSeleccionada
          }

          locale={
            locale
          }

          onCerrar={() => {
            setDetalleAbierto(
              false
            );

            setCitaSeleccionada(
              null
            );
          }}

          onReagendar={
            reagendarCita
          }

          onCancelar={
            (cita) => {
              console.log(
                "CANCELAR:",
                cita
              );
            }
          }

          onCompletar={
            (cita) => {
              console.log(
                "COMPLETAR:",
                cita
              );
            }
          }
        />

      </div>

    </DashboardLayout>
  );
}