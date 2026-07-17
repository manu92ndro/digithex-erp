import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  getDumpsters,
  createDumpster,
  updateDumpster,
  cambiarEstadoDumpster,
} from "../api/dumpsters";
import { showSuccess, showError } from "../utils/alerts";
import usePermission from "../hooks/usePermission";

const RECORDS_PER_PAGE = 8;

const sizes = [10, 15, 20, 30, 40, 45];
const capacities = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7];
const maxDays = [7, 10, 14, 15, 21, 30];

const statuses = [
  { value: "disponible", label: "Available" },
  { value: "rentado", label: "Rented" },
  { value: "mantenimiento", label: "Maintenance" },
  { value: "inactivo", label: "Inactive" },
];

const statusLabels = statuses.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});

const statusStyles = {
  disponible: "bg-green-100 text-green-700",
  rentado: "bg-yellow-100 text-yellow-700",
  mantenimiento: "bg-blue-100 text-blue-700",
  inactivo: "bg-red-100 text-red-700",
};

const initialForm = {
  codigo: "",
  tamano_yardas: "",
  capacidad_toneladas: "",
  precio_base: "",
  max_dias: "",
  precio_extra_tonelada: "0",
  precio_extra_yarda: "0",
  precio_extra_dia: "0",
  estado: "disponible",
};

function Dumpsters() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const canCreateDumpster = hasPermission("dumpsters.crear");
  const canEditDumpster = hasPermission("dumpsters.editar");
  const canDeleteDumpster = hasPermission("dumpsters.eliminar");

  const [dumpsters, setDumpsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTamano, setFiltroTamano] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarResumen, setMostrarResumen] = useState(true);
  const [form, setForm] = useState(initialForm);

  const cargarDumpsters = async () => {
    try {
      setLoading(true);
      const data = await getDumpsters();
      setDumpsters(data.dumpsters || []);
    } catch (error) {
      showError(error.response?.data?.msg || t("error_loading_dumpsters"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDumpsters();
  }, []);

  const resumenPorTamano = useMemo(() => {
    return sizes.map((size) => {
      const items = dumpsters.filter(
        (d) => Number(d.tamano_yardas) === Number(size)
      );

      return {
        size,
        total: items.length,
        available: items.filter((d) => d.estado === "disponible").length,
        rented: items.filter((d) => d.estado === "rentado").length,
        maintenance: items.filter((d) => d.estado === "mantenimiento").length,
      };
    });
  }, [dumpsters]);

  const dumpstersFiltrados = useMemo(() => {
    const text = busqueda.toLowerCase().trim();

    return dumpsters.filter((dumpster) => {
      const matchesSearch =
        dumpster.codigo?.toLowerCase().includes(text) ||
        String(dumpster.tamano_yardas || "").includes(text) ||
        String(dumpster.capacidad_toneladas || "").includes(text);

      const matchesSize =
        filtroTamano === "todos" ||
        Number(dumpster.tamano_yardas) === Number(filtroTamano);

      const matchesStatus =
        filtroEstado === "todos" || dumpster.estado === filtroEstado;

      return matchesSearch && matchesSize && matchesStatus;
    });
  }, [dumpsters, busqueda, filtroTamano, filtroEstado]);

  const totalPaginas = Math.ceil(
    dumpstersFiltrados.length / RECORDS_PER_PAGE
  );

  const dumpstersPaginados = dumpstersFiltrados.slice(
    (paginaActual - 1) * RECORDS_PER_PAGE,
    paginaActual * RECORDS_PER_PAGE
  );

  const abrirModalNuevo = () => {
    if (!canCreateDumpster) {
      showError(t("no_permission_create_dumpster"));
      return;
    }

    setEditando(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const abrirModalEditar = (dumpster) => {
    if (!canEditDumpster) {
      showError(t("no_permission_edit_dumpster"));
      return;
    }

    setEditando(dumpster);
    setForm({
      codigo: dumpster.codigo || "",
      tamano_yardas: dumpster.tamano_yardas || "",
      capacidad_toneladas: dumpster.capacidad_toneladas || "",
      precio_base: dumpster.precio_base || "",
      max_dias: dumpster.max_dias || "",
      precio_extra_tonelada: dumpster.precio_extra_tonelada || "0",
      precio_extra_yarda: dumpster.precio_extra_yarda || "0",
      precio_extra_dia: dumpster.precio_extra_dia || "0",
      estado: dumpster.estado || "disponible",
    });
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setEditando(null);
    setForm(initialForm);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleFiltro = (setter, value) => {
    setter(value);
    setPaginaActual(1);
  };

  const validarFormulario = () => {
    if (!form.codigo.trim()) return t("dumpster_code_required");
    if (!form.tamano_yardas) return t("dumpster_size_required");
    if (!form.capacidad_toneladas) return t("dumpster_capacity_required");
    if (!form.precio_base || Number(form.precio_base) < 0) {
      return t("dumpster_price_required");
    }
    if (!form.max_dias || Number(form.max_dias) <= 0) {
      return t("dumpster_max_days_required");
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (editando && !canEditDumpster) {
      showError(t("no_permission_edit_dumpster"));
      return;
    }

    if (!editando && !canCreateDumpster) {
      showError(t("no_permission_create_dumpster"));
      return;
    }

    const error = validarFormulario();
    if (error) {
      showError(error);
      return;
    }

    const payload = {
      ...form,
      tamano_yardas: Number(form.tamano_yardas),
      capacidad_toneladas: Number(form.capacidad_toneladas),
      precio_base: Number(form.precio_base),
      max_dias: Number(form.max_dias),
      precio_extra_tonelada: Number(form.precio_extra_tonelada || 0),
      precio_extra_yarda: Number(form.precio_extra_yarda || 0),
      precio_extra_dia: Number(form.precio_extra_dia || 0),
    };

    try {
      setSaving(true);

      if (editando) {
        await updateDumpster(editando.id_dumpster, payload);
        showSuccess(t("dumpster_updated"));
      } else {
        await createDumpster(payload);
        showSuccess(t("dumpster_created"));
      }

      cerrarModal();
      await cargarDumpsters();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_saving_dumpster"));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (dumpster, nuevoEstado) => {
    if (!canDeleteDumpster) {
      showError(t("no_permission_change_status"));
      return;
    }

    if (dumpster.estado === nuevoEstado) return;

    const confirmed = window.confirm(
      t("confirm_change_status", {
        status: statusLabels[nuevoEstado] || nuevoEstado,
      })
    );

    if (!confirmed) return;

    try {
      setChangingStatusId(dumpster.id_dumpster);
      await cambiarEstadoDumpster(dumpster.id_dumpster, nuevoEstado);
      showSuccess(t("status_updated"));
      await cargarDumpsters();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_changing_status"));
    } finally {
      setChangingStatusId(null);
    }
  };

  const hasActions = canEditDumpster || canDeleteDumpster;

  return (
    <DashboardLayout>
      <div className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("dumpsters_title")}</h1>
            <p className="text-slate-500">
              {t("dumpsters_description")}
            </p>
          </div>

          {canCreateDumpster && (
            <button
              type="button"
              onClick={abrirModalNuevo}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              {t("new_dumpster")}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow mb-4">
          <button
            type="button"
            onClick={() => setMostrarResumen(!mostrarResumen)}
            className="w-full flex items-center justify-between px-4 py-3 border-b"
          >
            <div>
              <h2 className="font-semibold text-slate-800">{t("dumpsters_summary_by_size")}</h2>
              <p className="text-xs text-slate-500">
                {t("view_availability_by_yards")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-600">
              {mostrarResumen ? t("hide") : t("show")}
              {mostrarResumen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {mostrarResumen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 p-4">
              {resumenPorTamano.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() =>
                    handleFiltro(
                      setFiltroTamano,
                      filtroTamano === String(item.size) ? "todos" : String(item.size)
                    )
                  }
                  className={`text-left rounded-xl p-4 border hover:border-blue-500 transition ${
                    filtroTamano === String(item.size)
                      ? "border-blue-600 ring-2 ring-blue-100 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-slate-800">{item.size} {t("yard")}</div>
                    <Trash2 size={18} className="text-blue-600" />
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold leading-none">{item.total}</div>
                      <div className="text-xs text-slate-500 mt-1">{t("registered")}</div>
                    </div>

                    <div className="text-right text-xs space-y-1">
                      <div className="text-green-600">{t("available")}: {item.available}</div>
                      <div className="text-yellow-600">{t("rented")}: {item.rented}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">{t("dumpsters_list")}</h2>
              <p className="text-sm text-slate-500">
                {t("showing_availability_configuration")}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                  }}
                  placeholder={t("search_dumpster")}
                  className="border rounded-lg pl-10 pr-3 py-2 w-full md:w-72"
                />
              </div>

              <select
                value={filtroTamano}
                onChange={(e) => handleFiltro(setFiltroTamano, e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="todos">{t("all_sizes")}</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size} {t("yard")}
                  </option>
                ))}
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => handleFiltro(setFiltroEstado, e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="todos">{t("all_statuses")}</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p>{t("loading")}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">{t("dumpster_code")}</th>
                      <th className="text-left p-3">{t("dumpster_size")}</th>
                      <th className="text-left p-3">{t("dumpster_capacity")}</th>
                      <th className="text-left p-3">{t("base_price")}</th>
                      <th className="text-left p-3">{t("max_days")}</th>
                      <th className="text-left p-3">{t("status")}</th>
                      {hasActions && <th className="text-right p-3">{t("actions")}</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {dumpstersPaginados.map((dumpster) => (
                      <tr key={dumpster.id_dumpster} className="border-b">
                        <td className="p-3 font-semibold">{dumpster.codigo}</td>
                        <td className="p-3">{dumpster.tamano_yardas} {t("yard")}</td>
                        <td className="p-3">
                          {Number(dumpster.capacidad_toneladas || 0).toFixed(2)} {t("ton")}
                        </td>
                        <td className="p-3">
                          ${Number(dumpster.precio_base || 0).toFixed(2)}
                        </td>
                        <td className="p-3">{dumpster.max_dias} {t("days")}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              statusStyles[dumpster.estado] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {statusLabels[dumpster.estado] || dumpster.estado}
                          </span>
                        </td>

                        {hasActions && (
                          <td className="p-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                title={t("view")}
                                className="p-2 rounded bg-sky-100 text-sky-700"
                              >
                                <Eye size={16} />
                              </button>

                              {canEditDumpster && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditar(dumpster)}
                                  title={t("edit")}
                                  className="p-2 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}

                              {canDeleteDumpster && (
                                <select
                                  value={dumpster.estado}
                                  disabled={changingStatusId === dumpster.id_dumpster}
                                  onChange={(e) => cambiarEstado(dumpster, e.target.value)}
                                  className="border rounded px-2 text-xs disabled:opacity-60"
                                >
                                  {statuses.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {dumpstersPaginados.length === 0 && (
                      <tr>
                        <td
                          colSpan={hasActions ? 7 : 6}
                          className="p-4 text-center text-slate-500"
                        >
                          {t("no_dumpsters")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                <p className="text-sm text-slate-500">
                  {t("dumpsters_showing", {
                    count: dumpstersPaginados.length,
                    total: dumpstersFiltrados.length
                  })}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded border disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                    {t("previous")}
                  </button>

                  <span className="text-sm">
                    {t("page")} {paginaActual} {t("of")} {totalPaginas || 1}
                  </span>

                  <button
                    type="button"
                    disabled={paginaActual === totalPaginas || totalPaginas === 0}
                    onClick={() =>
                      setPaginaActual((p) => Math.min(p + 1, totalPaginas || 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1 rounded border disabled:opacity-50"
                  >
                    {t("next")}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editando ? t("edit_dumpster") : t("new_dumpster")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("dumpster_info")}
                  </p>
                </div>

                <button type="button" onClick={cerrarModal}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                  <PackageCheck size={18} className="inline mr-1" />
                  {t("dumpster_code_help")}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Filter size={18} />
                    {t("basic_information")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t("dumpster_size")} *</label>
                      <select
                        name="tamano_yardas"
                        value={form.tamano_yardas}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      >
                        <option value="">{t("select")}</option>
                        {sizes.map((size) => (
                          <option key={size} value={size}>
                            {size} {t("yard")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("dumpster_code")} *</label>
                      <input
                        name="codigo"
                        value={form.codigo}
                        onChange={handleChange}
                        placeholder="DMP-10-01"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("dumpster_capacity")} *</label>
                      <select
                        name="capacidad_toneladas"
                        value={form.capacidad_toneladas}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      >
                        <option value="">{t("select")}</option>
                        {capacities.map((capacity) => (
                          <option key={capacity} value={capacity}>
                            {capacity} {t("ton")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("max_days")} *</label>
                      <select
                        name="max_dias"
                        value={form.max_dias}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      >
                        <option value="">{t("select")}</option>
                        {maxDays.map((days) => (
                          <option key={days} value={days}>
                            {days} {t("days")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-3">
                    {t("pricing_information")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t("base_price")} *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="precio_base"
                        value={form.precio_base}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("extra_ton")}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="precio_extra_tonelada"
                        value={form.precio_extra_tonelada}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("extra_yard")}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="precio_extra_yarda"
                        value={form.precio_extra_yarda}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t("extra_day")}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="precio_extra_dia"
                        value={form.precio_extra_dia}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t("status")}</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="w-full md:w-72 border rounded-lg px-3 py-2 mt-1"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save size={17} />
                    {saving ? t("saving") : editando ? t("update") : t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Dumpsters;