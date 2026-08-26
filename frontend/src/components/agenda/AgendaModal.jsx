import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  useTranslation,
} from "react-i18next";


// ======================================================
// FECHA VISUAL
// ======================================================

const formatearFechaVisual = (
  fechaISO,
  locale
) => {
  if (!fechaISO) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = fechaISO
    .split("-")
    .map(Number);

  const fecha = new Date(
    year,
    month - 1,
    day
  );

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
// HORA 12H
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
  ] = hora24
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
// HORARIOS
// 08:00 AM - 05:00 PM
// intervalos de 30 minutos
// ======================================================

const generarHorarios = () => {
  const horarios = [];

  const inicioMinutos =
    8 * 60;

  const finMinutos =
    17 * 60;

  for (
    let minutos = inicioMinutos;
    minutos <= finMinutos;
    minutos += 30
  ) {
    const hora =
      Math.floor(
        minutos / 60
      );

    const minuto =
      minutos % 60;

    horarios.push(
      `${String(hora).padStart(
        2,
        "0"
      )}:${String(minuto).padStart(
        2,
        "0"
      )}`
    );
  }

  return horarios;
};


// ======================================================
// NORMALIZAR TEXTO
// ======================================================

const normalizarTexto = (
  texto = ""
) =>
  String(texto)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();


// ======================================================
// CLAVE TRADUCCIÓN TIPO DE TRABAJO
// ======================================================

const obtenerClaveTrabajo = (
  nombre
) => {
  const valor =
    normalizarTexto(
      nombre
    );

  const mapa = {
    asphalt:
      "asphalt",

    "block work":
      "block_work",

    "bluestone patios":
      "bluestone_patios",

    "brick pavers":
      "brick_pavers",

    concrete:
      "concrete",

    driveways:
      "driveways",

    landscaping:
      "landscaping",

    landscape:
      "landscaping",

    other:
      "other",

    others:
      "other",

    patios:
      "patios",

    paving:
      "paving",

    sidewalk:
      "sidewalk",

    sidewalks:
      "sidewalk",

    steps:
      "steps",

    walkway:
      "walkways",

    walkways:
      "walkways",
  };

  return (
    mapa[valor] ||
    null
  );
};


// ======================================================
// CLAVE TRADUCCIÓN MEDIO CONTACTO
// ======================================================

const obtenerClaveMedio = (
  nombre
) => {
  const valor =
    normalizarTexto(
      nombre
    );

  const mapa = {
    "llamada telefonica":
      "phone_call",

    "phone call":
      "phone_call",

    whatsapp:
      "whatsapp",

    google:
      "google",

    facebook:
      "facebook",

    instagram:
      "instagram",

    "pagina web":
      "website",

    website:
      "website",

    "correo electronico":
      "email",

    email:
      "email",

    referido:
      "referral",

    referral:
      "referral",

    "cliente anterior":
      "previous_customer",

    "previous customer":
      "previous_customer",

    otro:
      "other",

    other:
      "other",
  };

  return (
    mapa[valor] ||
    null
  );
};


// ======================================================
// CLAVE TRADUCCIÓN ROLES
// ======================================================

const obtenerClaveRol = (
  nombre
) => {
  const valor =
    normalizarTexto(
      nombre
    );

  const mapa = {
    "super admin":
      "super_admin",

    administrador:
      "administrator",

    administrator:
      "administrator",

    secretary:
      "secretary",

    secretaria:
      "secretary",

    contractor:
      "contractor",

    contratista:
      "contractor",

    manager:
      "manager",

    gerente:
      "manager",

    driver:
      "driver",

    chofer:
      "driver",

    contador:
      "accountant",

    contadora:
      "accountant",

    accountant:
      "accountant",
  };

  return (
    mapa[valor] ||
    null
  );
};


// ======================================================
// COMPONENTE
// ======================================================

export default function AgendaModal({
  abierto = false,

  fechaSeleccionada,

  horaSeleccionada = "08:00",

  formData,

  guardando = false,

  locale = "es-EC",

  onCerrar,

  onGuardar,
}) {
  const {
    t,
  } = useTranslation();


  // ====================================================
  // FORM
  // ====================================================

  const [
    form,
    setForm,
  ] = useState({
    contacto: "",
    celular: "",
    correo: "",
    direccion: "",

    id_medio: "",
    id_tipo_cita: "",

    id_rol_responsable: "",
    id_usuario_asignado: "",

    descripcion: "",

    fecha: "",
    hora: "",
  });


  // ====================================================
  // HORARIOS DISPONIBLES
  // ====================================================

  const horariosDisponibles =
    useMemo(
      () =>
        generarHorarios(),
      []
    );


  // ====================================================
  // CARGAR DATOS INICIALES
  // ====================================================

  useEffect(() => {
    if (!abierto) {
      return;
    }

    setForm({
      contacto: "",
      celular: "",
      correo: "",
      direccion: "",

      id_medio: "",
      id_tipo_cita: "",

      id_rol_responsable: "",
      id_usuario_asignado: "",

      descripcion: "",

      fecha:
        fechaSeleccionada ||
        "",

      hora:
        horaSeleccionada ||
        "08:00",
    });

  }, [
    abierto,
    fechaSeleccionada,
    horaSeleccionada,
  ]);


  // ====================================================
  // ROLES DISPONIBLES
  // ====================================================

  const rolesDisponibles =
    useMemo(
      () => {
        const mapa =
          new Map();

        (
          formData
            ?.usuarios ||
          []
        ).forEach(
          (
            usuario
          ) => {
            if (
              !usuario.id_rol
            ) {
              return;
            }

            const idRol =
              Number(
                usuario.id_rol
              );

            if (
              !mapa.has(
                idRol
              )
            ) {
              mapa.set(
                idRol,
                {
                  id_rol:
                    idRol,

                  rol:
                    usuario.rol ||
                    "",
                }
              );
            }
          }
        );

        return Array.from(
          mapa.values()
        ).sort(
          (
            a,
            b
          ) =>
            String(
              a.rol
            ).localeCompare(
              String(
                b.rol
              )
            )
        );
      },
      [
        formData?.usuarios,
      ]
    );


  // ====================================================
  // USUARIOS SEGÚN ROL
  // ====================================================

  const usuariosFiltrados =
    useMemo(
      () => {
        if (
          !form.id_rol_responsable
        ) {
          return [];
        }

        return (
          formData
            ?.usuarios ||
          []
        ).filter(
          (
            usuario
          ) =>
            Number(
              usuario.id_rol
            ) ===
            Number(
              form.id_rol_responsable
            )
        );
      },
      [
        form.id_rol_responsable,
        formData?.usuarios,
      ]
    );


  // ====================================================
  // AUTO ASIGNAR SI SOLO HAY UNO
  // ====================================================

  useEffect(() => {
    if (
      usuariosFiltrados.length === 1
    ) {
      setForm(
        (
          anterior
        ) => ({
          ...anterior,

          id_usuario_asignado:
            String(
              usuariosFiltrados[0]
                .id_usuario
            ),
        })
      );

      return;
    }

    setForm(
      (
        anterior
      ) => ({
        ...anterior,

        id_usuario_asignado:
          "",
      })
    );

  }, [
    form.id_rol_responsable,
    usuariosFiltrados,
  ]);


  // ====================================================
  // HANDLE CHANGE
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
          anterior
        ) => ({
          ...anterior,
          [name]:
            value,
        })
      );
    };


  // ====================================================
  // CAMBIO ROL
  // ====================================================

  const handleCambioRol =
    (
      event
    ) => {
      const value =
        event.target.value;

      setForm(
        (
          anterior
        ) => ({
          ...anterior,

          id_rol_responsable:
            value,

          id_usuario_asignado:
            "",
        })
      );
    };


  // ====================================================
  // GUARDAR
  // ====================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !form.contacto.trim() ||
        !form.celular.trim() ||
        !form.id_tipo_cita ||
        !form.fecha ||
        !form.hora
      ) {
        return;
      }

      const payload = {
        contacto:
          form.contacto.trim(),

        celular:
          form.celular.trim(),

        correo:
          form.correo.trim() ||
          null,

        direccion:
          form.direccion.trim() ||
          null,

        id_medio:
          form.id_medio
            ? Number(
                form.id_medio
              )
            : null,

        id_tipo_cita:
          Number(
            form.id_tipo_cita
          ),

        id_usuario_asignado:
          form.id_usuario_asignado
            ? Number(
                form.id_usuario_asignado
              )
            : null,

        descripcion:
          form.descripcion.trim() ||
          null,

        fecha:
          form.fecha,

        hora:
          form.hora,
      };

      await onGuardar?.(
        payload
      );
    };


  // ====================================================
  // NO ABIERTO
  // ====================================================

  if (!abierto) {
    return null;
  }


  // ====================================================
  // RETURN
  // ====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
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
          max-w-3xl
          overflow-y-auto
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* =========================================== */}
        {/* HEADER */}
        {/* =========================================== */}

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
            <h2
              className="
                text-lg
                font-bold
                text-slate-900
              "
            >
              {t(
                "agenda.new.title"
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
                "agenda.new.subtitle"
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
              size={18}
            />
          </button>
        </div>


        {/* =========================================== */}
        {/* FORM */}
        {/* =========================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="
            space-y-4
            p-5
          "
        >

          {/* ========================================= */}
          {/* CLIENTE */}
          {/* ========================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:grid-cols-3
            "
          >

            {/* NOMBRE */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.name"
                )} *
              </label>

              <div
                className="
                  relative
                "
              >
                <UserRound
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  name="contacto"
                  value={
                    form.contacto
                  }
                  onChange={
                    handleChange
                  }
                  placeholder={
                    t(
                      "agenda.new.full_name"
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    pl-10
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


            {/* CELULAR */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.phone"
                )} *
              </label>

              <div
                className="
                  relative
                "
              >
                <Phone
                  size={17}
                  className="
                    pointer-events-none
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
                  placeholder={
                    t(
                      "agenda.new.phone_placeholder"
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    pl-10
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


            {/* CORREO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.email"
                )}
              </label>

              <div
                className="
                  relative
                "
              >
                <Mail
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="email"
                  name="correo"
                  value={
                    form.correo
                  }
                  onChange={
                    handleChange
                  }
                  placeholder={
                    t(
                      "agenda.new.email_placeholder"
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    pl-10
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


          {/* ========================================= */}
          {/* DIRECCIÓN + MEDIO */}
          {/* ========================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:grid-cols-[2fr_1fr]
            "
          >

            {/* DIRECCIÓN */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.address"
                )}
              </label>

              <div
                className="
                  relative
                "
              >
                <MapPin
                  size={17}
                  className="
                    pointer-events-none
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
                      "agenda.new.address_placeholder"
                    )
                  }
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    pl-10
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


            {/* MEDIO CONTACTO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.new.contact_method"
                )}
              </label>

              <div
                className="
                  relative
                "
              >
                <select
                  name="id_medio"
                  value={
                    form.id_medio
                  }
                  onChange={
                    handleChange
                  }
                  className="
                    h-11
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    pr-10
                    text-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="">
                    {t(
                      "agenda.new.select"
                    )}
                  </option>

                  {(
                    formData
                      ?.medios_contacto ||
                    []
                  ).map(
                    (
                      medio
                    ) => {
                      const clave =
                        obtenerClaveMedio(
                          medio.nombre
                        );

                      return (
                        <option
                          key={
                            medio.id_medio
                          }
                          value={
                            medio.id_medio
                          }
                        >
                          {clave
                            ? t(
                                `agenda.contact_methods.${clave}`,
                                {
                                  defaultValue:
                                    medio.nombre,
                                }
                              )
                            : medio.nombre}
                        </option>
                      );
                    }
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

          </div>


          {/* ========================================= */}
          {/* TRABAJO + ROL + RESPONSABLE */}
          {/* ========================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:grid-cols-3
            "
          >

            {/* TIPO TRABAJO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.job_type"
                )} *
              </label>

              <div
                className="
                  relative
                "
              >
                <BriefcaseBusiness
                  size={16}
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
                  name="id_tipo_cita"
                  value={
                    form.id_tipo_cita
                  }
                  onChange={
                    handleChange
                  }
                  className="
                    h-11
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    pl-10
                    pr-10
                    text-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="">
                    {t(
                      "agenda.new.select"
                    )}
                  </option>

                  {(
                    formData
                      ?.tipos_cita ||
                    []
                  ).map(
                    (
                      tipo
                    ) => {
                      const clave =
                        obtenerClaveTrabajo(
                          tipo.nombre
                        );

                      return (
                        <option
                          key={
                            tipo.id_tipo_cita
                          }
                          value={
                            tipo.id_tipo_cita
                          }
                        >
                          {clave
                            ? t(
                                `agenda.job_types.${clave}`,
                                {
                                  defaultValue:
                                    tipo.nombre,
                                }
                              )
                            : tipo.nombre}
                        </option>
                      );
                    }
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>


            {/* ROL */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.responsible_role"
                )}
              </label>

              <div
                className="
                  relative
                "
              >
                <Users
                  size={16}
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
                  name="id_rol_responsable"
                  value={
                    form.id_rol_responsable
                  }
                  onChange={
                    handleCambioRol
                  }
                  className="
                    h-11
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    pl-10
                    pr-10
                    text-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="">
                    {t(
                      "agenda.select_role"
                    )}
                  </option>

                  {rolesDisponibles.map(
                    (
                      rol
                    ) => {
                      const clave =
                        obtenerClaveRol(
                          rol.rol
                        );

                      return (
                        <option
                          key={
                            rol.id_rol
                          }
                          value={
                            rol.id_rol
                          }
                        >
                          {clave
                            ? t(
                                `agenda.roles.${clave}`,
                                {
                                  defaultValue:
                                    rol.rol,
                                }
                              )
                            : rol.rol}
                        </option>
                      );
                    }
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>


            {/* RESPONSABLE */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-medium
                  text-slate-700
                "
              >
                {t(
                  "agenda.responsible"
                )}
              </label>

              <div
                className="
                  relative
                "
              >
                <select
                  name="id_usuario_asignado"
                  value={
                    form.id_usuario_asignado
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    !form.id_rol_responsable ||
                    usuariosFiltrados.length === 0
                  }
                  className="
                    h-11
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    pr-10
                    text-sm
                    outline-none
                    transition
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                    disabled:text-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="">
                    {t(
                      "agenda.select_responsible"
                    )}
                  </option>

                  {usuariosFiltrados.map(
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
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

          </div>


          {/* ========================================= */}
          {/* DESCRIPCIÓN */}
          {/* ========================================= */}

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-medium
                text-slate-700
              "
            >
              {t(
                "agenda.job_description"
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
              rows={3}
              placeholder={
                t(
                  "agenda.new.description_placeholder"
                )
              }
              className="
                w-full
                resize-none
                rounded-xl
                border
                border-slate-200
                px-3
                py-3
                text-sm
                outline-none
                transition
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-100
              "
            />
          </div>


          {/* ========================================= */}
          {/* FECHA + HORA */}
          {/* ========================================= */}

          <div
            className="
              rounded-2xl
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
                  "agenda.new.date_time"
                )}
              </span>
            </div>

            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >

              {/* FECHA */}

              <div>
                <span
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
                    "agenda.new.date"
                  )}
                </span>

                <div
                  className="
                    flex
                    h-11
                    items-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    text-sm
                    font-semibold
                    text-slate-800
                  "
                >
                  {
                    formatearFechaVisual(
                      form.fecha,
                      locale
                    )
                  }
                </div>
              </div>


              {/* HORA */}

              <div>
                <span
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
                    "agenda.new.time"
                  )}
                </span>

                <div
                  className="
                    relative
                  "
                >
                  <Clock3
                    size={16}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      z-10
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <select
                    name="hora"
                    value={
                      form.hora
                    }
                    onChange={
                      handleChange
                    }
                    className="
                      h-11
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      pl-10
                      pr-10
                      text-sm
                      font-semibold
                      text-slate-800
                      outline-none
                      transition
                      focus:border-blue-500
                      focus:ring-4
                      focus:ring-blue-100
                    "
                  >
                    {horariosDisponibles.map(
                      (
                        hora
                      ) => (
                        <option
                          key={
                            hora
                          }
                          value={
                            hora
                          }
                        >
                          {
                            formatoHora12(
                              hora
                            )
                          }
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={17}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>
              </div>

            </div>
          </div>


          {/* ========================================= */}
          {/* FOOTER */}
          {/* ========================================= */}

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
              className="
                rounded-xl
                border
                border-slate-200
                px-5
                py-2.5
                text-sm
                font-medium
                text-slate-700
                transition
                hover:bg-slate-50
              "
            >
              {t(
                "agenda.new.cancel"
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
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {guardando
                ? t(
                    "agenda.new.saving"
                  )
                : t(
                    "agenda.new.save"
                  )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}