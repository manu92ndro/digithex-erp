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

const fechaLocalISO = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const primerDiaMes = (fecha) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), 1);

const primerDiaMesSiguiente = (fecha) =>
  new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);

const cambiarMes = (fecha, cantidad) =>
  new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1);

const sumarDias = (fecha, dias) => {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
};

const generarDiasCalendario = (mes) => {
  const primero = primerDiaMes(mes);
  const indiceLunes = (primero.getDay() + 6) % 7;
  const inicio = sumarDias(primero, -indiceLunes);
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
};

const diaDesdeFechaISO = (valor) => {
  const partes = String(valor || "").split("-").map(Number);
  return partes.length === 3 ? partes[2] : null;
};


// ======================================================
// COMPONENTES PEQUEÑOS
// ======================================================

function ModalBase({ title, onClose, children, max = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[92vh] w-full ${max} overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="mb-1 block text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}


// ======================================================
// PÁGINA
// ======================================================

export default function Gastos() {
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.toLowerCase()?.startsWith("en")
    ? "en-US"
    : "es-EC";

  const [tab, setTab] = useState("gastos");
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [formData, setFormData] = useState({
    categorias: [],
    metodos_pago: [],
    intervalos_meses: [1, 3, 6, 9, 12],
  });
  const [resumen, setResumen] = useState({});
  const [gastos, setGastos] = useState([]);
  const [programados, setProgramados] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [buscar, setBuscar] = useState("");
  const [modal, setModal] = useState({ tipo: null, data: null });
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const rangoMes = useMemo(() => ({
    fecha_desde: fechaLocalISO(primerDiaMes(mesActual)),
    fecha_hasta: fechaLocalISO(primerDiaMesSiguiente(mesActual)),
  }), [mesActual]);

  const tituloMes = useMemo(() =>
    new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(mesActual), [locale, mesActual]);

  const diasCalendario = useMemo(() => generarDiasCalendario(mesActual), [mesActual]);

  const eventosPorDia = useMemo(() => {
    const salida = {};
    eventos.forEach((evento) => {
      if (!evento.fecha) return;
      if (!salida[evento.fecha]) salida[evento.fecha] = [];
      salida[evento.fecha].push(evento);
    });
    return salida;
  }, [eventos]);

  const cargarTodo = useCallback(async () => {
    try {
      setLoading(true);

      const [
        fd,
        rs,
        cs,
        gs,
        ps,
        cal,
      ] = await Promise.all([
        getGastosFormData(),
        getGastosResumen(rangoMes),
        getGastosCategorias(),
        getGastos({
          ...rangoMes,
          estado: filtroEstado || undefined,
          id_categoria: filtroCategoria || undefined,
          buscar: buscar.trim() || undefined,
        }),
        getGastosProgramados(),
        getGastosCalendario(rangoMes),
      ]);

      setFormData({
        categorias: cs?.categorias || fd?.categorias || [],
        metodos_pago: fd?.metodos_pago || [],
        intervalos_meses: fd?.intervalos_meses || [1, 3, 6, 9, 12],
      });
      setResumen(rs?.resumen || {});
      setGastos(gs?.gastos || []);
      setProgramados(ps?.programados || []);
      setEventos(cal?.eventos || []);

    } catch (error) {
      console.error("ERROR GASTOS:", error);
      await Swal.fire({
        icon: "error",
        title: t("expenses.title"),
        text: error?.response?.data?.message || t("expenses.errors.load"),
      });
    } finally {
      setLoading(false);
    }
  }, [rangoMes, filtroEstado, filtroCategoria, buscar, t]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const moneda = (valor) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).format(Number(valor || 0));

  const fechaBonita = (valor) => {
    if (!valor) return "-";
    const [y, m, d] = String(valor).split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(y, m - 1, d, 12));
  };

  const textoEstado = (estado) => t(`expenses.status.${estado}`, estado);

  const claseEstado = (estado) => {
    switch (estado) {
      case "pagado": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "vencido": return "bg-rose-50 text-rose-700 border-rose-200";
      case "hoy": return "bg-amber-50 text-amber-700 border-amber-200";
      case "anulado":
      case "inactivo": return "bg-slate-100 text-slate-500 border-slate-200";
      default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const actualizarModal = (campo, valor) => {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [campo]: valor,
      },
    }));
  };

  // ====================================================
  // CATEGORÍAS
  // ====================================================

  const abrirCategoria = (categoria = null) => {
    setModal({
      tipo: "categoria",
      data: categoria || {
        nombre_categoria: "",
        descripcion: "",
      },
    });
  };

  const guardarCategoria = async (event) => {
    event.preventDefault();
    try {
      const data = modal.data;
      const payload = {
        nombre_categoria: data.nombre_categoria?.trim(),
        descripcion: data.descripcion?.trim(),
      };

      if (data.id_categoria) {
        await updateGastoCategoria(data.id_categoria, payload);
      } else {
        await createGastoCategoria(payload);
      }

      setModal({ tipo: null, data: null });
      await cargarTodo();
      await Swal.fire({
        icon: "success",
        title: t("expenses.messages.category_saved"),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.save"),
      });
    }
  };

  const toggleCategoria = async (categoria) => {
    try {
      await updateGastoCategoriaEstado(
        categoria.id_categoria,
        Number(categoria.estado) === 1 ? 0 : 1
      );
      await cargarTodo();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.save"),
      });
    }
  };

  // ====================================================
  // NUEVO GASTO / RECURRENTE
  // ====================================================

  const abrirGasto = (gasto = null, tipoInicial = "unico") => {
    setModal({
      tipo: "gasto",
      data: gasto
        ? {
            ...gasto,
            tipo_registro: "unico",
          }
        : {
            tipo_registro: tipoInicial,
            id_categoria: "",
            concepto: "",
            descripcion: "",
            referencia: "",
            monto: "",
            fecha_vencimiento: fechaLocalISO(new Date()),
            intervalo_meses: 1,
            observaciones: "",
          },
    });
  };

  const guardarGasto = async (event) => {
    event.preventDefault();
    const data = modal.data;

    try {
      if (data.id_gasto) {
        await updateGasto(data.id_gasto, {
          id_categoria: Number(data.id_categoria),
          concepto: data.concepto?.trim(),
          descripcion: data.descripcion?.trim(),
          referencia: data.referencia?.trim(),
          monto: Number(data.monto),
          fecha_vencimiento: data.fecha_vencimiento,
          observaciones: data.observaciones?.trim(),
        });
      } else if (data.tipo_registro === "recurrente") {
        const diaPago = diaDesdeFechaISO(data.fecha_vencimiento);
        await createGastoProgramado({
          id_categoria: Number(data.id_categoria),
          nombre: data.concepto?.trim(),
          descripcion: data.descripcion?.trim(),
          monto_estimado: Number(data.monto),
          frecuencia: "mensual",
          intervalo_meses: Number(data.intervalo_meses || 1),
          dia_pago: diaPago,
          fecha_inicio: data.fecha_vencimiento,
          fecha_proximo_pago: data.fecha_vencimiento,
        });
      } else {
        await createGasto({
          id_categoria: Number(data.id_categoria),
          concepto: data.concepto?.trim(),
          descripcion: data.descripcion?.trim(),
          referencia: data.referencia?.trim(),
          monto: Number(data.monto),
          fecha_vencimiento: data.fecha_vencimiento,
          estado: "pendiente",
          observaciones: data.observaciones?.trim(),
        });
      }

      setModal({ tipo: null, data: null });
      await cargarTodo();
      await Swal.fire({
        icon: "success",
        title: data.tipo_registro === "recurrente"
          ? t("expenses.messages.scheduled_saved")
          : t("expenses.messages.saved"),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.save"),
      });
    }
  };

  // ====================================================
  // PAGO
  // ====================================================

  const pedirPago = async (montoDefault) => {
    const { value } = await Swal.fire({
      title: t("expenses.actions.pay"),
      html: `
        <input id="montoPago" class="swal2-input" type="number" min="0.01" step="0.01" value="${Number(montoDefault || 0)}" />
        <input id="fechaPago" class="swal2-input" type="date" value="${fechaLocalISO(new Date())}" />
        <select id="metodoPago" class="swal2-select" style="display:block;width:80%;margin:1em auto;">
          <option value="">${t("expenses.common.select")}</option>
          ${(formData.metodos_pago || []).map((m) =>
            `<option value="${m}">${t(`expenses.payment_methods.${m}`)}</option>`
          ).join("")}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: t("expenses.actions.pay"),
      cancelButtonText: t("expenses.common.cancel"),
      preConfirm: () => {
        const monto = Number(document.getElementById("montoPago")?.value);
        const fecha_pago = document.getElementById("fechaPago")?.value;
        const metodo_pago = document.getElementById("metodoPago")?.value;
        if (!monto || !fecha_pago || !metodo_pago) {
          Swal.showValidationMessage(t("expenses.errors.payment"));
          return false;
        }
        return { monto, fecha_pago, metodo_pago };
      },
    });
    return value || null;
  };

  const registrarPago = async (gasto) => {
    const payload = await pedirPago(gasto.monto);
    if (!payload) return;
    try {
      await pagarGasto(gasto.id_gasto, payload);
      setDiaSeleccionado(null);
      await cargarTodo();
      await Swal.fire({
        icon: "success",
        title: t("expenses.messages.payment_saved"),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.payment"),
      });
    }
  };

  const pagarProgramado = async (programado) => {
    const payload = await pedirPago(programado.monto_estimado);
    if (!payload) return;
    try {
      await pagarGastoProgramado(programado.id_programado, payload);
      setDiaSeleccionado(null);
      await cargarTodo();
      await Swal.fire({
        icon: "success",
        title: t("expenses.messages.payment_saved"),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.payment"),
      });
    }
  };

  const confirmarAnular = async (gasto) => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: t("expenses.actions.void"),
      text: t("expenses.confirm.void_expense"),
      showCancelButton: true,
      confirmButtonText: t("expenses.actions.void"),
      cancelButtonText: t("expenses.common.cancel"),
    });
    if (!confirmacion.isConfirmed) return;
    await anularGasto(gasto.id_gasto);
    await cargarTodo();
  };

  // ====================================================
  // PROGRAMADOS
  // ====================================================

  const abrirProgramado = (item) => {
    setModal({
      tipo: "programado",
      data: {
        ...item,
        intervalo_meses: Number(item.intervalo_meses || 1),
      },
    });
  };

  const guardarProgramado = async (event) => {
    event.preventDefault();
    const d = modal.data;
    try {
      await updateGastoProgramado(d.id_programado, {
        id_categoria: Number(d.id_categoria),
        nombre: d.nombre?.trim(),
        descripcion: d.descripcion?.trim(),
        monto_estimado: Number(d.monto_estimado),
        frecuencia: "mensual",
        intervalo_meses: Number(d.intervalo_meses || 1),
        dia_pago: diaDesdeFechaISO(d.fecha_proximo_pago),
        fecha_inicio: d.fecha_inicio,
        fecha_proximo_pago: d.fecha_proximo_pago,
      });
      setModal({ tipo: null, data: null });
      await cargarTodo();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        text: error?.response?.data?.message || t("expenses.errors.save"),
      });
    }
  };

  const toggleProgramado = async (item) => {
    await updateGastoProgramadoEstado(
      item.id_programado,
      Number(item.activo) === 1 ? 0 : 1
    );
    await cargarTodo();
  };

  const tabs = [
    { id: "gastos", icon: WalletCards, label: t("expenses.tabs.expenses") },
    { id: "programados", icon: Repeat2, label: t("expenses.tabs.scheduled") },
    { id: "calendario", icon: CalendarDays, label: t("expenses.tabs.calendar") },
    { id: "categorias", icon: Tags, label: t("expenses.tabs.categories") },
  ];

  const categoriasActivas = (formData.categorias || []).filter((c) => Number(c.estado) === 1);

  const eventosDiaSeleccionado = diaSeleccionado
    ? (eventosPorDia[diaSeleccionado] || [])
    : [];

  return (
    <DashboardLayout>
      <div className="min-h-full bg-slate-100 p-3 md:p-4">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <CircleDollarSign size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t("expenses.title")}</h1>
                <p className="text-xs text-slate-500">{t("expenses.subtitle")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={cargarTodo} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                <RefreshCcw size={16} /> {t("expenses.actions.refresh")}
              </button>
              <button type="button" onClick={() => abrirGasto()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus size={17} /> {t("expenses.actions.new_expense")}
              </button>
            </div>
          </div>

          {/* RESUMEN */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [t("expenses.summary.paid"), resumen.total_pagado, CheckCircle2, "bg-emerald-50 text-emerald-600"],
              [t("expenses.summary.pending"), resumen.total_pendiente, Clock3, "bg-blue-50 text-blue-600"],
              [t("expenses.summary.overdue"), resumen.total_vencido, TriangleAlert, "bg-rose-50 text-rose-600"],
              [t("expenses.summary.scheduled"), resumen.estimado_programado_periodo, Repeat2, "bg-violet-50 text-violet-600"],
            ].map(([label, value, Icon, css]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{moneda(value)}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${css}`}>
                    <Icon size={19} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </div>

          {/* GASTOS */}
          {tab === "gastos" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 gap-2 border-b border-slate-100 p-4 md:grid-cols-3">
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder={t("expenses.filters.search")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{t("expenses.filters.all_status")}</option>
                  {["pendiente", "pagado", "vencido", "anulado"].map((estado) => <option key={estado} value={estado}>{textoEstado(estado)}</option>)}
                </select>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">{t("expenses.filters.all_categories")}</option>
                  {(formData.categorias || []).map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-slate-500">{t("expenses.common.loading")}</div>
              ) : gastos.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">{t("expenses.empty.expenses")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["concept", "category", "amount", "due_date", "status", "actions"].map((col) => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{t(`expenses.table.${col}`)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastos.map((gasto) => {
                        const estado = gasto.estado_visual || gasto.estado;
                        return (
                          <tr key={gasto.id_gasto} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-semibold text-slate-900">{gasto.concepto}</td>
                            <td className="px-4 py-3 text-slate-600">{gasto.nombre_categoria}</td>
                            <td className="px-4 py-3 font-semibold">{moneda(gasto.monto)}</td>
                            <td className="px-4 py-3">{fechaBonita(gasto.fecha_vencimiento)}</td>
                            <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${claseEstado(estado)}`}>{textoEstado(estado)}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {gasto.estado === "pendiente" && <>
                                  <button type="button" onClick={() => registrarPago(gasto)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700" title={t("expenses.actions.pay")}><CreditCard size={14} /></button>
                                  <button type="button" onClick={() => abrirGasto(gasto)} className="rounded-lg bg-blue-50 p-2 text-blue-700" title={t("expenses.actions.edit")}><Pencil size={14} /></button>
                                </>}
                                {gasto.estado !== "anulado" && <button type="button" onClick={() => confirmarAnular(gasto)} className="rounded-lg bg-rose-50 p-2 text-rose-700" title={t("expenses.actions.void")}><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PROGRAMADOS */}
          {tab === "programados" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">{t("expenses.tabs.scheduled")}</h2>
                <button type="button" onClick={() => abrirGasto(null, "recurrente")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
                  <Plus size={16} /> {t("expenses.actions.new_scheduled")}
                </button>
              </div>

              {programados.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">{t("expenses.empty.scheduled")}</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {programados.map((item) => (
                    <div key={item.id_programado} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{item.nombre}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.nombre_categoria}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${claseEstado(item.estado_visual)}`}>{textoEstado(item.estado_visual)}</span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">{t("expenses.fields.estimated_amount")}</span><strong>{moneda(item.monto_estimado)}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">{t("expenses.fields.next_payment")}</span><strong>{fechaBonita(item.fecha_proximo_pago)}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">{t("expenses.fields.repeat_every")}</span><strong>{t(`expenses.repeat.${Number(item.intervalo_meses || 1)}`)}</strong></div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        {Number(item.activo) === 1 && <button type="button" onClick={() => pagarProgramado(item)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700" title={t("expenses.actions.pay")}><CreditCard size={14} /></button>}
                        <button type="button" onClick={() => abrirProgramado(item)} className="rounded-lg bg-blue-50 p-2 text-blue-700" title={t("expenses.actions.edit")}><Pencil size={14} /></button>
                        <button type="button" onClick={() => toggleProgramado(item)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{Number(item.activo) === 1 ? t("expenses.actions.disable") : t("expenses.actions.enable")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALENDARIO COMPACTO */}
          {tab === "calendario" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="text-lg font-bold capitalize text-slate-900">{tituloMes}</h2>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setMesActual(cambiarMes(mesActual, -1))} className="rounded-lg border border-slate-200 p-2"><ChevronLeft size={16} /></button>
                  <button type="button" onClick={() => setMesActual(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">{t("expenses.common.today")}</button>
                  <button type="button" onClick={() => setMesActual(cambiarMes(mesActual, 1))} className="rounded-lg border border-slate-200 p-2"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((dia) => <div key={dia} className="py-2 text-center text-[11px] font-extrabold uppercase text-slate-500">{t(`expenses.days.${dia}`)}</div>)}
              </div>

              <div className="grid grid-cols-7">
                {diasCalendario.map((fecha) => {
                  const key = fechaLocalISO(fecha);
                  const pertenece = fecha.getMonth() === mesActual.getMonth();
                  const items = eventosPorDia[key] || [];
                  const total = items.reduce((acc, item) => acc + Number(item.monto || 0), 0);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={items.length === 0}
                      onClick={() => items.length > 0 && setDiaSeleccionado(key)}
                      className={`min-h-[72px] border-b border-r border-slate-100 p-2 text-left transition ${pertenece ? "bg-white" : "bg-slate-50 text-slate-300"} ${items.length ? "cursor-pointer hover:bg-blue-50/50" : "cursor-default"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{fecha.getDate()}</span>
                        {items.length > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{items.length}</span>}
                      </div>
                      {items.length > 0 && (
                        <div className="mt-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${items.some((i) => i.estado_visual === "vencido") ? "bg-rose-500" : items.some((i) => i.estado_visual === "hoy") ? "bg-amber-500" : "bg-blue-500"}`} />
                          <p className="mt-1 truncate text-[10px] font-semibold text-slate-600">{moneda(total)}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATEGORÍAS */}
          {tab === "categorias" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">{t("expenses.tabs.categories")}</h2>
                <button type="button" onClick={() => abrirCategoria()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> {t("expenses.actions.new_category")}</button>
              </div>
              {(formData.categorias || []).length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">{t("expenses.empty.categories")}</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(formData.categorias || []).map((cat) => (
                    <div key={cat.id_categoria} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between gap-3">
                        <div><p className="font-bold text-slate-900">{cat.nombre_categoria}</p><p className="mt-1 text-xs text-slate-500">{cat.descripcion || t("expenses.common.no_description")}</p></div>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${Number(cat.estado) === 1 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{Number(cat.estado) === 1 ? t("expenses.common.active") : t("expenses.common.inactive")}</span>
                      </div>
                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <button type="button" onClick={() => abrirCategoria(cat)} className="rounded-lg bg-blue-50 p-2 text-blue-700"><Pencil size={14} /></button>
                        <button type="button" onClick={() => toggleCategoria(cat)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold">{Number(cat.estado) === 1 ? t("expenses.actions.disable") : t("expenses.actions.enable")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO/EDITAR GASTO */}
      {modal.tipo === "gasto" && (
        <ModalBase title={modal.data?.id_gasto ? t("expenses.actions.edit") : t("expenses.actions.new_expense")} onClose={() => setModal({ tipo: null, data: null })}>
          <form onSubmit={guardarGasto} className="space-y-4 p-5">
            {!modal.data?.id_gasto && (
              <div>
                <Label>{t("expenses.fields.record_type")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["unico", "recurrente"].map((tipo) => (
                    <button key={tipo} type="button" onClick={() => actualizarModal("tipo_registro", tipo)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${modal.data.tipo_registro === tipo ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                      {tipo === "unico" ? t("expenses.fields.one_time") : t("expenses.fields.recurring")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><Label>{t("expenses.fields.category")}</Label><select required value={modal.data.id_categoria || ""} onChange={(e) => actualizarModal("id_categoria", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">{t("expenses.common.select")}</option>{categoriasActivas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}</select></div>
              <div><Label>{t("expenses.fields.amount")}</Label><input required type="number" min="0.01" step="0.01" value={modal.data.monto || ""} onChange={(e) => actualizarModal("monto", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            </div>

            <div><Label>{t("expenses.fields.concept")}</Label><input required value={modal.data.concepto || ""} onChange={(e) => actualizarModal("concepto", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><Label>{t("expenses.fields.reference")}</Label><input value={modal.data.referencia || ""} onChange={(e) => actualizarModal("referencia", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
              <div><Label>{t("expenses.fields.due_date")}</Label><input required type="date" value={modal.data.fecha_vencimiento || ""} onChange={(e) => actualizarModal("fecha_vencimiento", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            </div>

            {!modal.data?.id_gasto && modal.data.tipo_registro === "recurrente" && (
              <div>
                <Label>{t("expenses.fields.repeat_every")}</Label>
                <select value={modal.data.intervalo_meses || 1} onChange={(e) => actualizarModal("intervalo_meses", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  {(formData.intervalos_meses || [1,3,6,9,12]).map((n) => <option key={n} value={n}>{t(`expenses.repeat.${n}`)}</option>)}
                </select>
              </div>
            )}

            <div><Label>{t("expenses.fields.description")}</Label><textarea rows={3} value={modal.data.descripcion || ""} onChange={(e) => actualizarModal("descripcion", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal({ tipo: null, data: null })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">{t("expenses.common.cancel")}</button>
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">{t("expenses.common.save")}</button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* MODAL EDITAR PROGRAMADO */}
      {modal.tipo === "programado" && (
        <ModalBase title={t("expenses.actions.edit")} onClose={() => setModal({ tipo: null, data: null })}>
          <form onSubmit={guardarProgramado} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><Label>{t("expenses.fields.category")}</Label><select required value={modal.data.id_categoria || ""} onChange={(e) => actualizarModal("id_categoria", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{categoriasActivas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}</select></div>
              <div><Label>{t("expenses.fields.estimated_amount")}</Label><input required type="number" min="0.01" step="0.01" value={modal.data.monto_estimado || ""} onChange={(e) => actualizarModal("monto_estimado", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            </div>
            <div><Label>{t("expenses.fields.name")}</Label><input required value={modal.data.nombre || ""} onChange={(e) => actualizarModal("nombre", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            <div><Label>{t("expenses.fields.repeat_every")}</Label><select value={modal.data.intervalo_meses || 1} onChange={(e) => actualizarModal("intervalo_meses", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{[1,3,6,9,12].map((n) => <option key={n} value={n}>{t(`expenses.repeat.${n}`)}</option>)}</select></div>
            <div><Label>{t("expenses.fields.next_payment")}</Label><input required type="date" value={modal.data.fecha_proximo_pago || ""} onChange={(e) => actualizarModal("fecha_proximo_pago", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            <div><Label>{t("expenses.fields.description")}</Label><textarea rows={3} value={modal.data.descripcion || ""} onChange={(e) => actualizarModal("descripcion", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ tipo: null, data: null })} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">{t("expenses.common.cancel")}</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">{t("expenses.common.save")}</button></div>
          </form>
        </ModalBase>
      )}

      {/* MODAL CATEGORÍA */}
      {modal.tipo === "categoria" && (
        <ModalBase title={t("expenses.actions.new_category")} onClose={() => setModal({ tipo: null, data: null })} max="max-w-lg">
          <form onSubmit={guardarCategoria} className="space-y-4 p-5">
            <div><Label>{t("expenses.fields.category_name")}</Label><input required value={modal.data.nombre_categoria || ""} onChange={(e) => actualizarModal("nombre_categoria", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            <div><Label>{t("expenses.fields.description")}</Label><textarea rows={3} value={modal.data.descripcion || ""} onChange={(e) => actualizarModal("descripcion", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ tipo: null, data: null })} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">{t("expenses.common.cancel")}</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">{t("expenses.common.save")}</button></div>
          </form>
        </ModalBase>
      )}

      {/* MODAL DÍA DEL CALENDARIO */}
      {diaSeleccionado && (
        <ModalBase title={t("expenses.calendar.day_title", { date: fechaBonita(diaSeleccionado) })} onClose={() => setDiaSeleccionado(null)} max="max-w-xl">
          <div className="space-y-3 p-5">
            {eventosDiaSeleccionado.length === 0 ? (
              <p className="text-sm text-slate-500">{t("expenses.calendar.no_payments")}</p>
            ) : eventosDiaSeleccionado.map((evento, index) => {
              const programado = evento.tipo === "programado"
                ? programados.find((p) => Number(p.id_programado) === Number(evento.id))
                : null;
              const gasto = evento.tipo === "gasto"
                ? gastos.find((g) => Number(g.id_gasto) === Number(evento.id))
                : null;
              return (
                <div key={`${evento.tipo}-${evento.id}-${index}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold text-slate-900">{evento.nombre}</p><p className="mt-1 text-xs text-slate-500">{evento.nombre_categoria}</p></div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${claseEstado(evento.estado_visual)}`}>{textoEstado(evento.estado_visual)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between"><strong className="text-lg">{moneda(evento.monto)}</strong><span className="text-xs text-slate-500">{evento.tipo === "programado" ? t("expenses.fields.recurring") : t("expenses.fields.one_time")}</span></div>
                  {programado && Number(programado.activo) === 1 && <button type="button" onClick={() => pagarProgramado(programado)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CreditCard size={14} /> {t("expenses.actions.pay")}</button>}
                  {gasto && gasto.estado === "pendiente" && <button type="button" onClick={() => registrarPago(gasto)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CreditCard size={14} /> {t("expenses.actions.pay")}</button>}
                </div>
              );
            })}
          </div>
        </ModalBase>
      )}
    </DashboardLayout>
  );
}
