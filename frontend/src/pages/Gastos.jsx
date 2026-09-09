import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Pencil,
  Plus,
  RefreshCcw,
  Repeat2,
  Tags,
  Trash2,
  TriangleAlert,
  WalletCards,
  X,
} from "lucide-react";

import Swal from "sweetalert2";

import DashboardLayout from "../layouts/DashboardLayout";

import {
  getGastosFormData,
  getGastosResumen,
  getGastosCalendario,
  getGastosCategorias,
  createGastoCategoria,
  updateGastoCategoria,
  updateGastoCategoriaEstado,
  getGastos,
  createGasto,
  updateGasto,
  pagarGasto,
  anularGasto,
  getGastosProgramados,
  createGastoProgramado,
  updateGastoProgramado,
  updateGastoProgramadoEstado,
  pagarGastoProgramado,
} from "../api/gastos";


// ======================================================
// FECHAS
// ======================================================

const fechaLocalISO = (
  fecha
) => {
  const year =
    fecha.getFullYear();

  const month =
    String(
      fecha.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      fecha.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


const primerDiaMes = (
  fecha
) =>
  new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    1
  );


const primerDiaMesSiguiente = (
  fecha
) =>
  new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    1
  );


const cambiarMes = (
  fecha,
  cantidad
) =>
  new Date(
    fecha.getFullYear(),
    fecha.getMonth() + cantidad,
    1
  );


const sumarDias = (
  fecha,
  dias
) => {
  const nueva =
    new Date(fecha);

  nueva.setDate(
    nueva.getDate() + dias
  );

  return nueva;
};


const generarDiasCalendario = (
  mes
) => {
  const primero =
    primerDiaMes(mes);

  const indiceLunes =
    (
      primero.getDay() + 6
    ) % 7;

  const inicio =
    sumarDias(
      primero,
      -indiceLunes
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
// COMPONENTE
// ======================================================

export default function Gastos() {

  const {
    t,
    i18n,
  } =
    useTranslation();


  const locale =
    i18n.language
      ?.toLowerCase()
      ?.startsWith("en")
      ? "en-US"
      : "es-EC";


  const [
    tab,
    setTab,
  ] =
    useState("gastos");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    mesActual,
    setMesActual,
  ] =
    useState(
      new Date()
    );


  const [
    formData,
    setFormData,
  ] =
    useState({
      categorias: [],
      metodos_pago: [],
      frecuencias: [],
      estados: [],
    });


  const [
    resumen,
    setResumen,
  ] =
    useState({});


  const [
    gastos,
    setGastos,
  ] =
    useState([]);


  const [
    programados,
    setProgramados,
  ] =
    useState([]);


  const [
    eventos,
    setEventos,
  ] =
    useState([]);


  const [
    filtroEstado,
    setFiltroEstado,
  ] =
    useState("");


  const [
    filtroCategoria,
    setFiltroCategoria,
  ] =
    useState("");


  const [
    buscar,
    setBuscar,
  ] =
    useState("");


  const [
    modal,
    setModal,
  ] =
    useState({
      tipo: null,
      data: null,
    });


  // ====================================================
  // RANGO
  // ====================================================

  const rangoMes =
    useMemo(
      () => ({
        fecha_desde:
          fechaLocalISO(
            primerDiaMes(
              mesActual
            )
          ),

        fecha_hasta:
          fechaLocalISO(
            primerDiaMesSiguiente(
              mesActual
            )
          ),
      }),
      [
        mesActual,
      ]
    );


  const tituloMes =
    useMemo(
      () =>
        new Intl
          .DateTimeFormat(
            locale,
            {
              month: "long",
              year: "numeric",
            }
          )
          .format(
            mesActual
          ),
      [
        locale,
        mesActual,
      ]
    );


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


  const eventosPorDia =
    useMemo(
      () => {
        const resultado = {};

        eventos.forEach(
          (evento) => {
            if (!evento.fecha) {
              return;
            }

            if (
              !resultado[
                evento.fecha
              ]
            ) {
              resultado[
                evento.fecha
              ] = [];
            }

            resultado[
              evento.fecha
            ].push(
              evento
            );
          }
        );

        return resultado;
      },
      [
        eventos,
      ]
    );


  // ====================================================
  // CARGA
  // ====================================================

  const cargarTodo =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const [
            dataForm,
            dataResumen,
            dataCategorias,
            dataGastos,
            dataProgramados,
            dataCalendario,
          ] =
            await Promise.all([
              getGastosFormData(),
              getGastosResumen(
                rangoMes
              ),
              getGastosCategorias(),
              getGastos({
                ...rangoMes,
                estado:
                  filtroEstado ||
                  undefined,
                id_categoria:
                  filtroCategoria ||
                  undefined,
                buscar:
                  buscar.trim() ||
                  undefined,
              }),
              getGastosProgramados(),
              getGastosCalendario(
                rangoMes
              ),
            ]);

          setFormData({
            categorias:
              dataCategorias
                ?.categorias ||
              dataForm
                ?.categorias ||
              [],

            metodos_pago:
              dataForm
                ?.metodos_pago ||
              [],

            frecuencias:
              dataForm
                ?.frecuencias ||
              [],

            estados:
              dataForm
                ?.estados ||
              [],
          });

          setResumen(
            dataResumen
              ?.resumen ||
            {}
          );

          setGastos(
            dataGastos
              ?.gastos ||
            []
          );

          setProgramados(
            dataProgramados
              ?.programados ||
            []
          );

          setEventos(
            dataCalendario
              ?.eventos ||
            []
          );

        } catch (error) {
          console.error(
            "ERROR CARGANDO GASTOS:",
            error
          );

          await Swal.fire({
            icon: "error",
            title:
              t(
                "expenses.title"
              ),
            text:
              error
                ?.response
                ?.data
                ?.message ||
              t(
                "expenses.errors.load"
              ),
          });

        } finally {
          setLoading(false);
        }
      },
      [
        rangoMes,
        filtroEstado,
        filtroCategoria,
        buscar,
        t,
      ]
    );


  useEffect(
    () => {
      cargarTodo();
    },
    [
      cargarTodo,
    ]
  );


  // ====================================================
  // HELPERS
  // ====================================================

  const moneda = (
    valor
  ) =>
    new Intl
      .NumberFormat(
        locale,
        {
          style: "currency",
          currency: "USD",
        }
      )
      .format(
        Number(
          valor || 0
        )
      );


  const fechaBonita = (
    valor
  ) => {
    if (!valor) {
      return "-";
    }

    const [
      year,
      month,
      day,
    ] =
      valor
        .split("-")
        .map(Number);

    return new Intl
      .DateTimeFormat(
        locale,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      )
      .format(
        new Date(
          year,
          month - 1,
          day,
          12
        )
      );
  };


  const textoEstado = (
    estado
  ) =>
    t(
      `expenses.status.${estado}`,
      estado
    );


  const claseEstado = (
    estado
  ) => {
    switch (estado) {
      case "pagado":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "vencido":
        return "bg-rose-50 text-rose-700 border-rose-200";

      case "anulado":
      case "inactivo":
        return "bg-slate-100 text-slate-500 border-slate-200";

      case "hoy":
        return "bg-amber-50 text-amber-700 border-amber-200";

      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };


  // ====================================================
  // CATEGORÍA
  // ====================================================

  const abrirCategoria = (
    categoria = null
  ) => {
    setModal({
      tipo: "categoria",
      data:
        categoria || {
          nombre_categoria: "",
          descripcion: "",
        },
    });
  };


  const guardarCategoria =
    async (
      event
    ) => {
      event.preventDefault();

      const data =
        modal.data;

      try {
        if (
          data.id_categoria
        ) {
          await updateGastoCategoria(
            data.id_categoria,
            {
              nombre_categoria:
                data.nombre_categoria,
              descripcion:
                data.descripcion,
            }
          );

        } else {
          await createGastoCategoria({
            nombre_categoria:
              data.nombre_categoria,
            descripcion:
              data.descripcion,
          });
        }

        setModal({
          tipo: null,
          data: null,
        });

        await cargarTodo();

        await Swal.fire({
          icon: "success",
          title:
            t(
              "expenses.messages.category_saved"
            ),
          timer: 1200,
          showConfirmButton:
            false,
        });

      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            t(
              "expenses.errors.save"
            ),
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.save"
            ),
        });
      }
    };


  const toggleCategoria =
    async (
      categoria
    ) => {
      try {
        await updateGastoCategoriaEstado(
          categoria.id_categoria,
          Number(
            categoria.estado
          ) === 1
            ? 0
            : 1
        );

        await cargarTodo();

      } catch (error) {
        await Swal.fire({
          icon: "error",
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.save"
            ),
        });
      }
    };


  // ====================================================
  // GASTO
  // ====================================================

  const abrirGasto = (
    gasto = null
  ) => {
    setModal({
      tipo: "gasto",
      data:
        gasto || {
          id_categoria: "",
          concepto: "",
          descripcion: "",
          referencia: "",
          monto: "",
          fecha_vencimiento:
            fechaLocalISO(
              new Date()
            ),
          estado: "pendiente",
          fecha_pago: "",
          metodo_pago: "",
          observaciones: "",
        },
    });
  };


  const guardarGasto =
    async (
      event
    ) => {
      event.preventDefault();

      const data =
        modal.data;

      const payload = {
        id_categoria:
          Number(
            data.id_categoria
          ),
        concepto:
          data.concepto,
        descripcion:
          data.descripcion,
        referencia:
          data.referencia,
        monto:
          Number(
            data.monto
          ),
        fecha_vencimiento:
          data.fecha_vencimiento,
        observaciones:
          data.observaciones,
      };

      if (
        !data.id_gasto
      ) {
        payload.estado =
          data.estado;

        if (
          data.estado ===
          "pagado"
        ) {
          payload.fecha_pago =
            data.fecha_pago;

          payload.metodo_pago =
            data.metodo_pago;
        }
      }

      try {
        if (
          data.id_gasto
        ) {
          await updateGasto(
            data.id_gasto,
            payload
          );

        } else {
          await createGasto(
            payload
          );
        }

        setModal({
          tipo: null,
          data: null,
        });

        await cargarTodo();

        await Swal.fire({
          icon: "success",
          title:
            t(
              "expenses.messages.saved"
            ),
          timer: 1200,
          showConfirmButton:
            false,
        });

      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            t(
              "expenses.errors.save"
            ),
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.save"
            ),
        });
      }
    };


  const registrarPago =
    async (
      gasto
    ) => {
      const {
        value: formValues,
      } =
        await Swal.fire({
          title:
            t(
              "expenses.actions.pay"
            ),
          html: `
            <input
              id="monto"
              class="swal2-input"
              type="number"
              min="0.01"
              step="0.01"
              value="${Number(
                gasto.monto || 0
              )}"
            />

            <input
              id="fecha"
              class="swal2-input"
              type="date"
              value="${fechaLocalISO(
                new Date()
              )}"
            />

            <select
              id="metodo"
              class="swal2-select"
              style="display:block;width:80%;margin:1em auto;"
            >
              <option value="">
                ${t(
                  "expenses.common.select"
                )}
              </option>

              ${
                (
                  formData
                    .metodos_pago ||
                  []
                )
                  .map(
                    (m) =>
                      `<option value="${m}">
                        ${t(
                          `expenses.payment_methods.${m}`
                        )}
                      </option>`
                  )
                  .join("")
              }
            </select>
          `,
          showCancelButton:
            true,
          confirmButtonText:
            t(
              "expenses.actions.pay"
            ),
          cancelButtonText:
            t(
              "expenses.common.cancel"
            ),
          preConfirm:
            () => ({
              monto:
                Number(
                  document
                    .getElementById(
                      "monto"
                    )
                    .value
                ),
              fecha_pago:
                document
                  .getElementById(
                    "fecha"
                  )
                  .value,
              metodo_pago:
                document
                  .getElementById(
                    "metodo"
                  )
                  .value,
            }),
        });

      if (!formValues) {
        return;
      }

      try {
        await pagarGasto(
          gasto.id_gasto,
          formValues
        );

        await cargarTodo();

        await Swal.fire({
          icon: "success",
          title:
            t(
              "expenses.messages.payment_saved"
            ),
          timer: 1200,
          showConfirmButton:
            false,
        });

      } catch (error) {
        await Swal.fire({
          icon: "error",
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.payment"
            ),
        });
      }
    };


  const confirmarAnular =
    async (
      gasto
    ) => {
      const result =
        await Swal.fire({
          icon: "warning",
          title:
            t(
              "expenses.actions.void"
            ),
          showCancelButton:
            true,
          confirmButtonText:
            t(
              "expenses.actions.void"
            ),
          cancelButtonText:
            t(
              "expenses.common.cancel"
            ),
        });

      if (!result.isConfirmed) {
        return;
      }

      await anularGasto(
        gasto.id_gasto
      );

      await cargarTodo();
    };


  // ====================================================
  // PROGRAMADO
  // ====================================================

  const abrirProgramado = (
    programado = null
  ) => {
    setModal({
      tipo: "programado",
      data:
        programado || {
          id_categoria: "",
          nombre: "",
          descripcion: "",
          monto_estimado: "",
          frecuencia: "mensual",
          dia_pago: "",
          fecha_inicio:
            fechaLocalISO(
              new Date()
            ),
          fecha_proximo_pago:
            fechaLocalISO(
              new Date()
            ),
        },
    });
  };


  const guardarProgramado =
    async (
      event
    ) => {
      event.preventDefault();

      const data =
        modal.data;

      const payload = {
        id_categoria:
          Number(
            data.id_categoria
          ),
        nombre:
          data.nombre,
        descripcion:
          data.descripcion,
        monto_estimado:
          data.monto_estimado ===
            ""
            ? null
            : Number(
                data.monto_estimado
              ),
        frecuencia:
          data.frecuencia,
        dia_pago:
          [
            "mensual",
            "anual",
          ].includes(
            data.frecuencia
          )
            ? Number(
                data.dia_pago
              )
            : null,
        fecha_inicio:
          data.fecha_inicio,
        fecha_proximo_pago:
          data.fecha_proximo_pago,
      };

      try {
        if (
          data.id_programado
        ) {
          await updateGastoProgramado(
            data.id_programado,
            payload
          );

        } else {
          await createGastoProgramado(
            payload
          );
        }

        setModal({
          tipo: null,
          data: null,
        });

        await cargarTodo();

        await Swal.fire({
          icon: "success",
          title:
            t(
              "expenses.messages.scheduled_saved"
            ),
          timer: 1200,
          showConfirmButton:
            false,
        });

      } catch (error) {
        await Swal.fire({
          icon: "error",
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.save"
            ),
        });
      }
    };


  const pagarProgramado =
    async (
      programado
    ) => {
      const {
        value: formValues,
      } =
        await Swal.fire({
          title:
            t(
              "expenses.actions.pay"
            ),
          html: `
            <input
              id="monto"
              class="swal2-input"
              type="number"
              min="0.01"
              step="0.01"
              value="${Number(
                programado.monto_estimado || 0
              )}"
            />

            <input
              id="fecha"
              class="swal2-input"
              type="date"
              value="${fechaLocalISO(
                new Date()
              )}"
            />

            <select
              id="metodo"
              class="swal2-select"
              style="display:block;width:80%;margin:1em auto;"
            >
              <option value="">
                ${t(
                  "expenses.common.select"
                )}
              </option>

              ${
                (
                  formData
                    .metodos_pago ||
                  []
                )
                  .map(
                    (m) =>
                      `<option value="${m}">
                        ${t(
                          `expenses.payment_methods.${m}`
                        )}
                      </option>`
                  )
                  .join("")
              }
            </select>
          `,
          showCancelButton:
            true,
          confirmButtonText:
            t(
              "expenses.actions.pay"
            ),
          cancelButtonText:
            t(
              "expenses.common.cancel"
            ),
          preConfirm:
            () => ({
              monto:
                Number(
                  document
                    .getElementById(
                      "monto"
                    )
                    .value
                ),
              fecha_pago:
                document
                  .getElementById(
                    "fecha"
                  )
                  .value,
              metodo_pago:
                document
                  .getElementById(
                    "metodo"
                  )
                  .value,
            }),
        });

      if (!formValues) {
        return;
      }

      try {
        await pagarGastoProgramado(
          programado.id_programado,
          formValues
        );

        await cargarTodo();

      } catch (error) {
        await Swal.fire({
          icon: "error",
          text:
            error
              ?.response
              ?.data
              ?.message ||
            t(
              "expenses.errors.payment"
            ),
        });
      }
    };


  const toggleProgramado =
    async (
      programado
    ) => {
      await updateGastoProgramadoEstado(
        programado.id_programado,
        Number(
          programado.activo
        ) === 1
          ? 0
          : 1
      );

      await cargarTodo();
    };


  // ====================================================
  // MODAL INPUT
  // ====================================================

  const actualizarModal = (
    campo,
    valor
  ) => {
    setModal(
      (prev) => ({
        ...prev,
        data: {
          ...prev.data,
          [campo]:
            valor,
        },
      })
    );
  };


  // ====================================================
  // UI
  // ====================================================

  const tabs = [
    {
      id: "gastos",
      icon: WalletCards,
      label:
        t(
          "expenses.tabs.expenses"
        ),
    },
    {
      id: "programados",
      icon: Repeat2,
      label:
        t(
          "expenses.tabs.scheduled"
        ),
    },
    {
      id: "calendario",
      icon: CalendarDays,
      label:
        t(
          "expenses.tabs.calendar"
        ),
    },
    {
      id: "categorias",
      icon: Tags,
      label:
        t(
          "expenses.tabs.categories"
        ),
    },
  ];


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

          {/* HEADER */}

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
                <CircleDollarSign
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
                  {
                    t(
                      "expenses.title"
                    )
                  }
                </h1>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  {
                    t(
                      "expenses.subtitle"
                    )
                  }
                </p>
              </div>
            </div>


            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              <button
                type="button"
                onClick={
                  cargarTodo
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                <RefreshCcw
                  size={16}
                />

                {
                  t(
                    "expenses.actions.refresh"
                  )
                }
              </button>

              <button
                type="button"
                onClick={() =>
                  abrirGasto()
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
                  shadow-sm
                  hover:bg-blue-700
                "
              >
                <Plus
                  size={17}
                />

                {
                  t(
                    "expenses.actions.new_expense"
                  )
                }
              </button>
            </div>
          </div>


          {/* RESUMEN */}

          <div
            className="
              mb-4
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            {
              [
                {
                  label:
                    t(
                      "expenses.summary.paid"
                    ),
                  value:
                    resumen.total_pagado,
                  icon:
                    CheckCircle2,
                  className:
                    "bg-emerald-50 text-emerald-600",
                },
                {
                  label:
                    t(
                      "expenses.summary.pending"
                    ),
                  value:
                    resumen.total_pendiente,
                  icon:
                    Clock3,
                  className:
                    "bg-blue-50 text-blue-600",
                },
                {
                  label:
                    t(
                      "expenses.summary.overdue"
                    ),
                  value:
                    resumen.total_vencido,
                  icon:
                    TriangleAlert,
                  className:
                    "bg-rose-50 text-rose-600",
                },
                {
                  label:
                    t(
                      "expenses.summary.scheduled"
                    ),
                  value:
                    resumen.estimado_programado_periodo,
                  icon:
                    Repeat2,
                  className:
                    "bg-violet-50 text-violet-600",
                },
              ].map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <div
                      key={
                        item.label
                      }
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                        shadow-sm
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs
                              font-semibold
                              text-slate-500
                            "
                          >
                            {
                              item.label
                            }
                          </p>

                          <p
                            className="
                              mt-1
                              text-2xl
                              font-bold
                              text-slate-900
                            "
                          >
                            {
                              moneda(
                                item.value
                              )
                            }
                          </p>
                        </div>

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            ${item.className}
                          `}
                        >
                          <Icon
                            size={19}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )
            }
          </div>


          {/* TABS */}

          <div
            className="
              mb-4
              flex
              flex-wrap
              gap-2
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-2
              shadow-sm
            "
          >
            {
              tabs.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        setTab(
                          item.id
                        )
                      }
                      className={`
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        px-4
                        py-2
                        text-sm
                        font-semibold

                        ${
                          tab === item.id
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }
                      `}
                    >
                      <Icon
                        size={16}
                      />

                      {
                        item.label
                      }
                    </button>
                  );
                }
              )
            }
          </div>


          {/* TAB GASTOS */}

          {
            tab ===
              "gastos" && (
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
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-2
                    border-b
                    border-slate-100
                    p-4
                    md:grid-cols-3
                  "
                >
                  <input
                    value={
                      buscar
                    }
                    onChange={
                      (e) =>
                        setBuscar(
                          e.target.value
                        )
                    }
                    placeholder={
                      t(
                        "expenses.actions.refresh"
                      )
                    }
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-2
                      text-sm
                    "
                  />

                  <select
                    value={
                      filtroEstado
                    }
                    onChange={
                      (e) =>
                        setFiltroEstado(
                          e.target.value
                        )
                    }
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-2
                      text-sm
                    "
                  >
                    <option value="">
                      {
                        t(
                          "expenses.fields.status"
                        )
                      }
                    </option>

                    {
                      [
                        "pendiente",
                        "pagado",
                        "vencido",
                        "anulado",
                      ].map(
                        (estado) => (
                          <option
                            key={
                              estado
                            }
                            value={
                              estado
                            }
                          >
                            {
                              textoEstado(
                                estado
                              )
                            }
                          </option>
                        )
                      )
                    }
                  </select>

                  <select
                    value={
                      filtroCategoria
                    }
                    onChange={
                      (e) =>
                        setFiltroCategoria(
                          e.target.value
                        )
                    }
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-2
                      text-sm
                    "
                  >
                    <option value="">
                      {
                        t(
                          "expenses.fields.category"
                        )
                      }
                    </option>

                    {
                      (
                        formData
                          .categorias ||
                        []
                      ).map(
                        (cat) => (
                          <option
                            key={
                              cat.id_categoria
                            }
                            value={
                              cat.id_categoria
                            }
                          >
                            {
                              cat.nombre_categoria
                            }
                          </option>
                        )
                      )
                    }
                  </select>
                </div>


                {
                  loading
                    ? (
                        <div
                          className="
                            p-10
                            text-center
                            text-sm
                            text-slate-500
                          "
                        >
                          {
                            t(
                              "expenses.common.loading"
                            )
                          }
                        </div>
                      )
                    : gastos.length === 0
                      ? (
                          <div
                            className="
                              p-10
                              text-center
                              text-sm
                              text-slate-500
                            "
                          >
                            {
                              t(
                                "expenses.empty.expenses"
                              )
                            }
                          </div>
                        )
                      : (
                          <div
                            className="
                              overflow-x-auto
                            "
                          >
                            <table
                              className="
                                min-w-full
                                text-sm
                              "
                            >
                              <thead
                                className="
                                  bg-slate-50
                                "
                              >
                                <tr>
                                  {
                                    [
                                      "Concept",
                                      "Category",
                                      "Amount",
                                      "Due",
                                      "Status",
                                      "Actions",
                                    ].map(
                                      (label) => (
                                        <th
                                          key={
                                            label
                                          }
                                          className="
                                            px-4
                                            py-3
                                            text-left
                                            text-xs
                                            font-bold
                                            uppercase
                                            text-slate-500
                                          "
                                        >
                                          {
                                            label
                                          }
                                        </th>
                                      )
                                    )
                                  }
                                </tr>
                              </thead>

                              <tbody
                                className="
                                  divide-y
                                  divide-slate-100
                                "
                              >
                                {
                                  gastos.map(
                                    (gasto) => {
                                      const estado =
                                        gasto.estado_visual ||
                                        gasto.estado;

                                      return (
                                        <tr
                                          key={
                                            gasto.id_gasto
                                          }
                                        >
                                          <td
                                            className="
                                              px-4
                                              py-3
                                              font-semibold
                                              text-slate-900
                                            "
                                          >
                                            {
                                              gasto.concepto
                                            }
                                          </td>

                                          <td
                                            className="
                                              px-4
                                              py-3
                                              text-slate-600
                                            "
                                          >
                                            {
                                              gasto.nombre_categoria
                                            }
                                          </td>

                                          <td
                                            className="
                                              px-4
                                              py-3
                                              font-semibold
                                            "
                                          >
                                            {
                                              moneda(
                                                gasto.monto
                                              )
                                            }
                                          </td>

                                          <td
                                            className="
                                              px-4
                                              py-3
                                            "
                                          >
                                            {
                                              fechaBonita(
                                                gasto.fecha_vencimiento
                                              )
                                            }
                                          </td>

                                          <td
                                            className="
                                              px-4
                                              py-3
                                            "
                                          >
                                            <span
                                              className={`
                                                rounded-full
                                                border
                                                px-2.5
                                                py-1
                                                text-xs
                                                font-bold
                                                ${claseEstado(
                                                  estado
                                                )}
                                              `}
                                            >
                                              {
                                                textoEstado(
                                                  estado
                                                )
                                              }
                                            </span>
                                          </td>

                                          <td
                                            className="
                                              px-4
                                              py-3
                                            "
                                          >
                                            <div
                                              className="
                                                flex
                                                gap-1
                                              "
                                            >
                                              {
                                                gasto.estado ===
                                                  "pendiente" && (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        registrarPago(
                                                          gasto
                                                        )
                                                      }
                                                      className="
                                                        rounded-lg
                                                        bg-emerald-50
                                                        p-2
                                                        text-emerald-700
                                                      "
                                                    >
                                                      <CreditCard
                                                        size={14}
                                                      />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        abrirGasto(
                                                          gasto
                                                        )
                                                      }
                                                      className="
                                                        rounded-lg
                                                        bg-blue-50
                                                        p-2
                                                        text-blue-700
                                                      "
                                                    >
                                                      <Pencil
                                                        size={14}
                                                      />
                                                    </button>
                                                  </>
                                                )
                                              }

                                              {
                                                gasto.estado !==
                                                  "anulado" && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      confirmarAnular(
                                                        gasto
                                                      )
                                                    }
                                                    className="
                                                      rounded-lg
                                                      bg-rose-50
                                                      p-2
                                                      text-rose-700
                                                    "
                                                  >
                                                    <Trash2
                                                      size={14}
                                                    />
                                                  </button>
                                                )
                                              }
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )
                                }
                              </tbody>
                            </table>
                          </div>
                        )
                }
              </div>
            )
          }


          {/* TAB PROGRAMADOS */}

          {
            tab ===
              "programados" && (
              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-4
                  shadow-sm
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                  "
                >
                  <h2
                    className="
                      font-bold
                      text-slate-900
                    "
                  >
                    {
                      t(
                        "expenses.tabs.scheduled"
                      )
                    }
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      abrirProgramado()
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
                    "
                  >
                    <Plus
                      size={16}
                    />

                    {
                      t(
                        "expenses.actions.new_scheduled"
                      )
                    }
                  </button>
                </div>


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3
                    md:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {
                    programados.map(
                      (item) => (
                        <div
                          key={
                            item.id_programado
                          }
                          className="
                            rounded-2xl
                            border
                            border-slate-200
                            p-4
                          "
                        >
                          <div
                            className="
                              flex
                              items-start
                              justify-between
                            "
                          >
                            <div>
                              <p
                                className="
                                  font-bold
                                  text-slate-900
                                "
                              >
                                {
                                  item.nombre
                                }
                              </p>

                              <p
                                className="
                                  text-xs
                                  text-slate-500
                                "
                              >
                                {
                                  item.nombre_categoria
                                }
                              </p>
                            </div>

                            <span
                              className={`
                                rounded-full
                                border
                                px-2.5
                                py-1
                                text-xs
                                font-bold
                                ${claseEstado(
                                  item.estado_visual
                                )}
                              `}
                            >
                              {
                                textoEstado(
                                  item.estado_visual
                                )
                              }
                            </span>
                          </div>

                          <div
                            className="
                              mt-4
                              space-y-1
                              text-sm
                            "
                          >
                            <p>
                              {
                                moneda(
                                  item.monto_estimado
                                )
                              }
                            </p>

                            <p
                              className="
                                text-slate-500
                              "
                            >
                              {
                                fechaBonita(
                                  item.fecha_proximo_pago
                                )
                              }
                            </p>

                            <p
                              className="
                                text-slate-500
                              "
                            >
                              {
                                t(
                                  `expenses.frequency.${item.frecuencia}`
                                )
                              }
                            </p>
                          </div>

                          <div
                            className="
                              mt-4
                              flex
                              gap-2
                              border-t
                              border-slate-100
                              pt-3
                            "
                          >
                            {
                              Number(
                                item.activo
                              ) === 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    pagarProgramado(
                                      item
                                    )
                                  }
                                  className="
                                    rounded-lg
                                    bg-emerald-50
                                    p-2
                                    text-emerald-700
                                  "
                                >
                                  <CreditCard
                                    size={14}
                                  />
                                </button>
                              )
                            }

                            <button
                              type="button"
                              onClick={() =>
                                abrirProgramado(
                                  item
                                )
                              }
                              className="
                                rounded-lg
                                bg-blue-50
                                p-2
                                text-blue-700
                              "
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleProgramado(
                                  item
                                )
                              }
                              className="
                                rounded-lg
                                bg-slate-100
                                px-2
                                py-1
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              {
                                Number(
                                  item.activo
                                ) === 1
                                  ? t(
                                      "expenses.actions.disable"
                                    )
                                  : t(
                                      "expenses.actions.enable"
                                    )
                              }
                            </button>
                          </div>
                        </div>
                      )
                    )
                  }
                </div>
              </div>
            )
          }


          {/* TAB CALENDARIO */}

          {
            tab ===
              "calendario" && (
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
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    p-4
                  "
                >
                  <h2
                    className="
                      text-lg
                      font-bold
                      capitalize
                    "
                  >
                    {
                      tituloMes
                    }
                  </h2>

                  <div
                    className="
                      flex
                      gap-1
                    "
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setMesActual(
                          cambiarMes(
                            mesActual,
                            -1
                          )
                        )
                      }
                      className="
                        rounded-lg
                        border
                        p-2
                      "
                    >
                      <ChevronLeft
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMesActual(
                          new Date()
                        )
                      }
                      className="
                        rounded-lg
                        border
                        px-3
                        py-2
                        text-xs
                      "
                    >
                      {
                        t(
                          "expenses.common.today"
                        )
                      }
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMesActual(
                          cambiarMes(
                            mesActual,
                            1
                          )
                        )
                      }
                      className="
                        rounded-lg
                        border
                        p-2
                      "
                    >
                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>


                <div
                  className="
                    grid
                    grid-cols-7
                    bg-slate-50
                  "
                >
                  {
                    [
                      "mon",
                      "tue",
                      "wed",
                      "thu",
                      "fri",
                      "sat",
                      "sun",
                    ].map(
                      (dia) => (
                        <div
                          key={
                            dia
                          }
                          className="
                            py-2
                            text-center
                            text-xs
                            font-bold
                            text-slate-500
                          "
                        >
                          {
                            t(
                              `expenses.days.${dia}`
                            )
                          }
                        </div>
                      )
                    )
                  }
                </div>


                <div
                  className="
                    grid
                    grid-cols-7
                  "
                >
                  {
                    diasCalendario.map(
                      (fecha) => {
                        const key =
                          fechaLocalISO(
                            fecha
                          );

                        const items =
                          eventosPorDia[
                            key
                          ] ||
                          [];

                        return (
                          <div
                            key={
                              key
                            }
                            className="
                              min-h-[100px]
                              border-r
                              border-t
                              border-slate-100
                              p-2
                            "
                          >
                            <div
                              className="
                                mb-1
                                text-xs
                                font-bold
                              "
                            >
                              {
                                fecha.getDate()
                              }
                            </div>

                            {
                              items
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <div
                                      key={
                                        `${item.tipo}-${item.id}-${index}`
                                      }
                                      className={`
                                        mb-1
                                        truncate
                                        rounded-md
                                        border
                                        px-1
                                        py-0.5
                                        text-[9px]
                                        font-semibold
                                        ${claseEstado(
                                          item.estado_visual
                                        )}
                                      `}
                                    >
                                      {
                                        item.nombre
                                      }
                                      {" · "}
                                      {
                                        moneda(
                                          item.monto
                                        )
                                      }
                                    </div>
                                  )
                                )
                            }
                          </div>
                        );
                      }
                    )
                  }
                </div>
              </div>
            )
          }


          {/* TAB CATEGORÍAS */}

          {
            tab ===
              "categorias" && (
              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-4
                  shadow-sm
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                  "
                >
                  <h2
                    className="
                      font-bold
                      text-slate-900
                    "
                  >
                    {
                      t(
                        "expenses.tabs.categories"
                      )
                    }
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      abrirCategoria()
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
                    "
                  >
                    <Plus
                      size={16}
                    />

                    {
                      t(
                        "expenses.actions.new_category"
                      )
                    }
                  </button>
                </div>


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3
                    md:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {
                    (
                      formData
                        .categorias ||
                      []
                    ).map(
                      (cat) => (
                        <div
                          key={
                            cat.id_categoria
                          }
                          className="
                            rounded-2xl
                            border
                            border-slate-200
                            p-4
                          "
                        >
                          <div
                            className="
                              flex
                              justify-between
                              gap-3
                            "
                          >
                            <div>
                              <p
                                className="
                                  font-bold
                                "
                              >
                                {
                                  cat.nombre_categoria
                                }
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-xs
                                  text-slate-500
                                "
                              >
                                {
                                  cat.descripcion ||
                                  t(
                                    "expenses.common.no_description"
                                  )
                                }
                              </p>
                            </div>

                            <span
                              className="
                                text-xs
                                font-bold
                              "
                            >
                              {
                                Number(
                                  cat.estado
                                ) === 1
                                  ? t(
                                      "expenses.common.active"
                                    )
                                  : t(
                                      "expenses.common.inactive"
                                    )
                              }
                            </span>
                          </div>

                          <div
                            className="
                              mt-4
                              flex
                              gap-2
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                abrirCategoria(
                                  cat
                                )
                              }
                              className="
                                rounded-lg
                                bg-blue-50
                                p-2
                                text-blue-700
                              "
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleCategoria(
                                  cat
                                )
                              }
                              className="
                                rounded-lg
                                bg-slate-100
                                px-2
                                py-1
                                text-xs
                                font-semibold
                              "
                            >
                              {
                                Number(
                                  cat.estado
                                ) === 1
                                  ? t(
                                      "expenses.actions.disable"
                                    )
                                  : t(
                                      "expenses.actions.enable"
                                    )
                              }
                            </button>
                          </div>
                        </div>
                      )
                    )
                  }
                </div>
              </div>
            )
          }

        </div>
      </div>


      {/* MODAL GENERAL */}

      {
        modal.tipo && (
          <div
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-black/40
              p-4
            "
          >
            <div
              className="
                max-h-[92vh]
                w-full
                max-w-2xl
                overflow-y-auto
                rounded-2xl
                bg-white
                shadow-2xl
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  p-4
                "
              >
                <h2
                  className="
                    text-lg
                    font-bold
                  "
                >
                  {
                    modal.tipo ===
                      "gasto"
                      ? t(
                          "expenses.actions.new_expense"
                        )
                      : modal.tipo ===
                          "programado"
                        ? t(
                            "expenses.actions.new_scheduled"
                          )
                        : t(
                            "expenses.actions.new_category"
                          )
                  }
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      tipo: null,
                      data: null,
                    })
                  }
                  className="
                    rounded-lg
                    p-2
                    hover:bg-slate-100
                  "
                >
                  <X
                    size={18}
                  />
                </button>
              </div>


              {
                modal.tipo ===
                  "categoria" && (
                  <form
                    onSubmit={
                      guardarCategoria
                    }
                    className="
                      space-y-4
                      p-5
                    "
                  >
                    <input
                      required
                      value={
                        modal.data
                          .nombre_categoria
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "nombre_categoria",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.category_name"
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <textarea
                      value={
                        modal.data
                          .descripcion
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "descripcion",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.description"
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <button
                      type="submit"
                      className="
                        rounded-xl
                        bg-blue-600
                        px-4
                        py-2.5
                        font-semibold
                        text-white
                      "
                    >
                      {
                        t(
                          "expenses.common.save"
                        )
                      }
                    </button>
                  </form>
                )
              }


              {
                modal.tipo ===
                  "gasto" && (
                  <form
                    onSubmit={
                      guardarGasto
                    }
                    className="
                      grid
                      grid-cols-1
                      gap-4
                      p-5
                      md:grid-cols-2
                    "
                  >
                    <select
                      required
                      value={
                        modal.data
                          .id_categoria
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "id_categoria",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    >
                      <option value="">
                        {
                          t(
                            "expenses.common.select"
                          )
                        }
                      </option>

                      {
                        (
                          formData
                            .categorias ||
                          []
                        )
                          .filter(
                            (c) =>
                              Number(
                                c.estado
                              ) === 1
                          )
                          .map(
                            (c) => (
                              <option
                                key={
                                  c.id_categoria
                                }
                                value={
                                  c.id_categoria
                                }
                              >
                                {
                                  c.nombre_categoria
                                }
                              </option>
                            )
                          )
                      }
                    </select>

                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={
                        modal.data
                          .monto
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "monto",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.amount"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <input
                      required
                      value={
                        modal.data
                          .concepto
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "concepto",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.concept"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        md:col-span-2
                      "
                    />

                    <input
                      value={
                        modal.data
                          .referencia
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "referencia",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.reference"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <input
                      required
                      type="date"
                      value={
                        modal.data
                          .fecha_vencimiento
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "fecha_vencimiento",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <textarea
                      value={
                        modal.data
                          .descripcion
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "descripcion",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.description"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        md:col-span-2
                      "
                    />

                    <button
                      type="submit"
                      className="
                        rounded-xl
                        bg-blue-600
                        px-4
                        py-2.5
                        font-semibold
                        text-white
                        md:col-span-2
                      "
                    >
                      {
                        t(
                          "expenses.common.save"
                        )
                      }
                    </button>
                  </form>
                )
              }


              {
                modal.tipo ===
                  "programado" && (
                  <form
                    onSubmit={
                      guardarProgramado
                    }
                    className="
                      grid
                      grid-cols-1
                      gap-4
                      p-5
                      md:grid-cols-2
                    "
                  >
                    <select
                      required
                      value={
                        modal.data
                          .id_categoria
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "id_categoria",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    >
                      <option value="">
                        {
                          t(
                            "expenses.common.select"
                          )
                        }
                      </option>

                      {
                        (
                          formData
                            .categorias ||
                          []
                        )
                          .filter(
                            (c) =>
                              Number(
                                c.estado
                              ) === 1
                          )
                          .map(
                            (c) => (
                              <option
                                key={
                                  c.id_categoria
                                }
                                value={
                                  c.id_categoria
                                }
                              >
                                {
                                  c.nombre_categoria
                                }
                              </option>
                            )
                          )
                      }
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={
                        modal.data
                          .monto_estimado
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "monto_estimado",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.estimated_amount"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <input
                      required
                      value={
                        modal.data
                          .nombre
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "nombre",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.name"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        md:col-span-2
                      "
                    />

                    <select
                      value={
                        modal.data
                          .frecuencia
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "frecuencia",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    >
                      {
                        [
                          "unico",
                          "semanal",
                          "mensual",
                          "anual",
                        ].map(
                          (f) => (
                            <option
                              key={
                                f
                              }
                              value={
                                f
                              }
                            >
                              {
                                t(
                                  `expenses.frequency.${f}`
                                )
                              }
                            </option>
                          )
                        )
                      }
                    </select>

                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={
                        modal.data
                          .dia_pago
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "dia_pago",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.payment_day"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <input
                      required
                      type="date"
                      value={
                        modal.data
                          .fecha_inicio
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "fecha_inicio",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <input
                      required
                      type="date"
                      value={
                        modal.data
                          .fecha_proximo_pago
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "fecha_proximo_pago",
                            e.target.value
                          )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                      "
                    />

                    <textarea
                      value={
                        modal.data
                          .descripcion
                      }
                      onChange={
                        (e) =>
                          actualizarModal(
                            "descripcion",
                            e.target.value
                          )
                      }
                      placeholder={
                        t(
                          "expenses.fields.description"
                        )
                      }
                      className="
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        md:col-span-2
                      "
                    />

                    <button
                      type="submit"
                      className="
                        rounded-xl
                        bg-blue-600
                        px-4
                        py-2.5
                        font-semibold
                        text-white
                        md:col-span-2
                      "
                    >
                      {
                        t(
                          "expenses.common.save"
                        )
                      }
                    </button>
                  </form>
                )
              }
            </div>
          </div>
        )
      }

    </DashboardLayout>
  );
}
