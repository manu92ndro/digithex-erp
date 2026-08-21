import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  MapPin,
  Mail,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import {
  useTranslation,
} from "react-i18next";


// ======================================================
// SUMAR MINUTOS
// ======================================================

const sumarMinutos = (
  hora,
  minutos
) => {
  const [
    h,
    m,
  ] =
    hora
      .split(":")
      .map(Number);

  const total =
    h * 60 +
    m +
    minutos;

  const nuevaHora =
    Math.floor(
      total / 60
    );

  const nuevosMinutos =
    total % 60;

  return `${String(
    nuevaHora
  ).padStart(
    2,
    "0"
  )}:${String(
    nuevosMinutos
  ).padStart(
    2,
    "0"
  )}`;
};


// ======================================================
// HORA AM / PM
// ======================================================

const formatoHora12 = (
  hora24
) => {
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
    hora % 12 ||
    12;

  return `${hora12}:${String(
    minuto
  ).padStart(
    2,
    "0"
  )} ${periodo}`;
};


// ======================================================
// HORARIOS
// ======================================================

const generarOpcionesHora = (
  inicio = "08:00",
  fin = "17:00",
  intervalo = 30
) => {
  const resultado = [];

  const [
    inicioH,
    inicioM,
  ] =
    inicio
      .split(":")
      .map(Number);

  const [
    finH,
    finM,
  ] =
    fin
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
    const hora =
      Math.floor(
        actual / 60
      );

    const minuto =
      actual % 60;

    const valor =
      `${String(
        hora
      ).padStart(
        2,
        "0"
      )}:${String(
        minuto
      ).padStart(
        2,
        "0"
      )}`;

    resultado.push({
      valor,

      label:
        formatoHora12(
          valor
        ),
    });

    actual += intervalo;
  }

  return resultado;
};


// ======================================================
// COMPONENTE
// ======================================================

export default function AgendaModal({
  abierto,

  fechaSeleccionada,

  horaSeleccionada,

  formData,

  onCerrar,

  onGuardar,

  guardando = false,
}) {
  const {
    t,
  } = useTranslation();


  const [
    form,
    setForm,
  ] = useState({
    nombres: "",
    celular: "",
    correo: "",

    direccion: "",

    id_medio_contacto: "",

    id_tipo_cita: "",

    asignado_a: "",

    hora_inicio: "08:00",

    duracion_minutos: 60,

    descripcion: "",

    observaciones: "",
  });


  const tiposCita =
    formData
      ?.tipos_cita ||
    [];


  const usuarios =
    formData
      ?.usuarios ||
    [];


  const medios =
    formData
      ?.medios_contacto ||
    [];


  const configuracion =
    formData
      ?.configuracion ||
    {};


  // ====================================================
  // OPCIONES HORARIO
  // ====================================================

  const opcionesHora =
    useMemo(
      () =>
        generarOpcionesHora(
          configuracion
            ?.hora_inicio ||
            "08:00",

          configuracion
            ?.hora_fin ||
            "17:00",

          Number(
            configuracion
              ?.intervalo_minutos
          ) ||
          30
        ),
      [
        configuracion,
      ]
    );


  // ====================================================
  // ABRIR MODAL
  // ====================================================

  useEffect(() => {
    if (!abierto) {
      return;
    }


    const hora =
      horaSeleccionada ||
      configuracion
        ?.hora_inicio ||
      "08:00";


    const unicoUsuario =
      usuarios.length === 1
        ? String(
            usuarios[0]
              .id_usuario
          )
        : "";


    setForm({
      nombres: "",
      celular: "",
      correo: "",

      direccion: "",

      id_medio_contacto:
        "",

      id_tipo_cita:
        "",

      asignado_a:
        unicoUsuario,

      hora_inicio:
        hora,

      duracion_minutos:
        60,

      descripcion: "",

      observaciones: "",
    });

  }, [
    abierto,
    horaSeleccionada,
    usuarios,
    configuracion,
  ]);


  // ====================================================
  // TIPO SELECCIONADO
  // ====================================================

  const tipoSeleccionado =
    useMemo(
      () =>
        tiposCita.find(
          (
            tipo
          ) =>
            Number(
              tipo.id_tipo_cita
            ) ===
            Number(
              form.id_tipo_cita
            )
        ),
      [
        tiposCita,
        form.id_tipo_cita,
      ]
    );


  // ====================================================
  // DURACIÓN AUTOMÁTICA
  // ====================================================

  useEffect(() => {
    if (
      tipoSeleccionado
        ?.duracion_minutos
    ) {
      setForm(
        (
          actual
        ) => ({
          ...actual,

          duracion_minutos:
            Number(
              tipoSeleccionado
                .duracion_minutos
            ),
        })
      );
    }

  }, [
    tipoSeleccionado,
  ]);


  if (!abierto) {
    return null;
  }


  // ====================================================
  // CHANGE
  // ====================================================

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setForm(
        (
          actual
        ) => ({
          ...actual,
          [name]:
            value,
        })
      );
    };


  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !fechaSeleccionada
      ) {
        return;
      }


      const horaFin =
        sumarMinutos(
          form.hora_inicio,

          Number(
            form.duracion_minutos ||
            60
          )
        );


      const payload = {
        nombres:
          form.nombres.trim(),

        celular:
          form.celular.trim(),

        correo:
          form.correo.trim() ||
          null,

        direccion:
          form.direccion.trim() ||
          null,

        id_medio_contacto:
          form.id_medio_contacto
            ? Number(
                form.id_medio_contacto
              )
            : null,

        id_tipo_cita:
          Number(
            form.id_tipo_cita
          ),

        asignado_a:
          form.asignado_a
            ? Number(
                form.asignado_a
              )
            : null,

        fecha_inicio:
          `${fechaSeleccionada} ${form.hora_inicio}:00`,

        fecha_fin:
          `${fechaSeleccionada} ${horaFin}:00`,

        titulo:
          tipoSeleccionado
            ?.nombre ||
          t(
            "agenda.appointment",
            "Cita"
          ),

        descripcion:
          form.descripcion.trim() ||
          null,

        observaciones:
          form.observaciones.trim() ||
          null,
      };


      await onGuardar?.(
        payload
      );
    };


  // ====================================================
  // RETURN
  // ====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-sm
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
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-4
          "
        >

          <div>
            <h2
              className="
                text-lg
                font-bold
                text-slate-900
              "
            >
              {t(
                "agenda.new.title",
                "Nueva cita"
              )}
            </h2>

            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {t(
                "agenda.new.subtitle",
                "Registra los datos y agenda la cita."
              )}
            </p>
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
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X
              size={19}
            />
          </button>

        </div>


        <form
          onSubmit={
            handleSubmit
          }

          className="
            space-y-4
            p-5
          "
        >

          {/* NOMBRE / TELÉFONO */}

          <div
            className="
              grid
              gap-3
              md:grid-cols-2
            "
          >

            <div>
              <label
                className="
                  mb-1
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.name",
                  "Nombre"
                )}
                {" *"}
              </label>

              <div
                className="
                  relative
                "
              >
                <UserRound
                  size={16}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  name="nombres"

                  value={
                    form.nombres
                  }

                  onChange={
                    handleChange
                  }

                  required

                  placeholder={
                    t(
                      "agenda.new.full_name",
                      "Nombre completo"
                    )
                  }

                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    py-2.5
                    pl-9
                    pr-3
                    text-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                />
              </div>
            </div>


            <div>
              <label
                className="
                  mb-1
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.phone",
                  "Celular"
                )}
                {" *"}
              </label>

              <div
                className="
                  relative
                "
              >
                <Phone
                  size={16}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  name="celular"

                  value={
                    form.celular
                  }

                  onChange={
                    handleChange
                  }

                  required

                  placeholder={
                    t(
                      "agenda.new.phone_placeholder",
                      "Teléfono"
                    )
                  }

                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    py-2.5
                    pl-9
                    pr-3
                    text-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                />
              </div>
            </div>

          </div>


          {/* CORREO */}

          <div>
            <label
              className="
                mb-1
                block
                text-xs
                font-medium
                text-slate-700
              "
            >
              {t(
                "agenda.new.email",
                "Correo"
              )}
            </label>

            <div
              className="
                relative
              "
            >
              <Mail
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                name="correo"

                type="email"

                value={
                  form.correo
                }

                onChange={
                  handleChange
                }

                placeholder="correo@ejemplo.com"

                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  py-2.5
                  pl-9
                  pr-3
                  text-sm
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              />
            </div>
          </div>


          {/* DIRECCIÓN */}

          <div>
            <label
              className="
                mb-1
                block
                text-xs
                font-medium
                text-slate-700
              "
            >
              {t(
                "agenda.new.address",
                "Dirección"
              )}
            </label>

            <div
              className="
                relative
              "
            >
              <MapPin
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                name="direccion"

                value={
                  form.direccion
                }

                onChange={
                  handleChange
                }

                placeholder={
                  t(
                    "agenda.new.address_placeholder",
                    "Dirección de la cita"
                  )
                }

                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  py-2.5
                  pl-9
                  pr-3
                  text-sm
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              />
            </div>
          </div>


          {/* MEDIO / TIPO */}

          <div
            className="
              grid
              gap-3
              md:grid-cols-2
            "
          >

            <div>
              <label
                className="
                  mb-1
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.contact_method",
                  "Medio de contacto"
                )}
              </label>

              <select
                name="id_medio_contacto"

                value={
                  form.id_medio_contacto
                }

                onChange={
                  handleChange
                }

                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              >
                <option value="">
                  {t(
                    "agenda.new.select",
                    "Seleccionar"
                  )}
                </option>

                {medios.map(
                  (
                    medio
                  ) => (
                    <option
                      key={
                        medio.id_medio_contacto ||
                        medio.id_medio
                      }

                      value={
                        medio.id_medio_contacto ||
                        medio.id_medio
                      }
                    >
                      {
                        medio.nombre
                      }
                    </option>
                  )
                )}

              </select>
            </div>


            <div>
              <label
                className="
                  mb-1
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.appointment_type",
                  "Tipo de cita"
                )}
                {" *"}
              </label>

              <select
                name="id_tipo_cita"

                value={
                  form.id_tipo_cita
                }

                onChange={
                  handleChange
                }

                required

                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              >
                <option value="">
                  {t(
                    "agenda.new.select",
                    "Seleccionar"
                  )}
                </option>

                {tiposCita.map(
                  (
                    tipo
                  ) => (
                    <option
                      key={
                        tipo.id_tipo_cita
                      }

                      value={
                        tipo.id_tipo_cita
                      }
                    >
                      {
                        tipo.nombre
                      }
                    </option>
                  )
                )}

              </select>
            </div>

          </div>


          {/* FECHA Y HORA */}

          <div
            className="
              rounded-xl
              bg-slate-50
              p-4
            "
          >

            <div
              className="
                mb-3
                flex
                items-center
                gap-2
              "
            >
              <CalendarDays
                size={17}
                className="
                  text-blue-600
                "
              />

              <span
                className="
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                {t(
                  "agenda.new.date_time",
                  "Fecha y hora"
                )}
              </span>
            </div>


            <div
              className="
                grid
                gap-3
                md:grid-cols-3
              "
            >

              {/* FECHA */}

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                  "
                >
                  {t(
                    "agenda.new.date",
                    "Fecha"
                  )}
                </label>

                <input
                  value={
                    fechaSeleccionada ||
                    ""
                  }

                  disabled

                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                  "
                />
              </div>


              {/* HORA */}

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                  "
                >
                  {t(
                    "agenda.new.time",
                    "Hora"
                  )}
                </label>

                <div
                  className="
                    relative
                  "
                >
                  <Clock3
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <select
                    name="hora_inicio"

                    value={
                      form.hora_inicio
                    }

                    onChange={
                      handleChange
                    }

                    className="
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      py-2.5
                      pl-9
                      pr-3
                      text-sm
                      font-medium
                      text-slate-700
                      outline-none
                      focus:border-blue-500
                      focus:ring-4
                      focus:ring-blue-100
                    "
                  >
                    {opcionesHora.map(
                      (
                        opcion
                      ) => (
                        <option
                          key={
                            opcion.valor
                          }

                          value={
                            opcion.valor
                          }
                        >
                          {
                            opcion.label
                          }
                        </option>
                      )
                    )}

                  </select>
                </div>
              </div>


              {/* DURACIÓN */}

              <div>
                <label
                  className="
                    mb-1
                    block
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                  "
                >
                  {t(
                    "agenda.new.duration",
                    "Duración"
                  )}
                </label>

                <select
                  name="duracion_minutos"

                  value={
                    form.duracion_minutos
                  }

                  onChange={
                    handleChange
                  }

                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="30">
                    30 min
                  </option>

                  <option value="60">
                    1 h
                  </option>

                  <option value="90">
                    1 h 30 min
                  </option>

                  <option value="120">
                    2 h
                  </option>
                </select>
              </div>

            </div>

          </div>


          {/* RESPONSABLE */}

          {usuarios.length > 0 && (
            <div>
              <label
                className="
                  mb-1
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.assign_to",
                  "Asignar a"
                )}
              </label>

              <select
                name="asignado_a"

                value={
                  form.asignado_a
                }

                onChange={
                  handleChange
                }

                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-100
                "
              >
                <option value="">
                  {t(
                    "agenda.new.select_responsible",
                    "Seleccionar responsable"
                  )}
                </option>

                {usuarios.map(
                  (
                    usuario
                  ) => (
                    <option
                      key={
                        usuario.id_usuario
                      }

                      value={
                        usuario.id_usuario
                      }
                    >
                      {
                        usuario.nombres
                      }

                      {usuario.rol
                        ? ` · ${usuario.rol}`
                        : ""}
                    </option>
                  )
                )}

              </select>
            </div>
          )}


          {/* DESCRIPCIÓN */}

          <div>
            <label
              className="
                mb-1
                block
                text-xs
                font-medium
                text-slate-700
              "
            >
              {t(
                "agenda.new.description",
                "Descripción"
              )}
            </label>

            <textarea
              name="descripcion"

              value={
                form.descripcion
              }

              onChange={
                handleChange
              }

              rows={2}

              placeholder={
                t(
                  "agenda.new.description_placeholder",
                  "Motivo de la cita..."
                )
              }

              className="
                w-full
                resize-none
                rounded-xl
                border
                border-slate-200
                px-3
                py-2.5
                text-sm
                outline-none
                transition
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>


          {/* FOOTER */}

          <div
            className="
              flex
              justify-end
              gap-2
              border-t
              border-slate-100
              pt-4
            "
          >

            <button
              type="button"

              onClick={
                onCerrar
              }

              disabled={
                guardando
              }

              className="
                rounded-xl
                border
                border-slate-200
                px-4
                py-2.5
                text-sm
                font-medium
                text-slate-600
                transition
                hover:bg-slate-50
              "
            >
              {t(
                "agenda.new.cancel",
                "Cancelar"
              )}
            </button>


            <button
              type="submit"

              disabled={
                guardando
              }

              className="
                rounded-xl
                bg-blue-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {guardando
                ? t(
                    "agenda.new.saving",
                    "Guardando..."
                  )
                : t(
                    "agenda.new.save",
                    "Guardar cita"
                  )}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}