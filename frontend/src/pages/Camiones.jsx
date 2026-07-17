import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Save,
  Search,
  Truck,
  X,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  getCamiones,
  createCamion,
  updateCamion,
  cambiarEstadoCamion,
} from "../api/camiones";
import { showSuccess, showError } from "../utils/alerts";
import usePermission from "../hooks/usePermission";

const RECORDS_PER_PAGE = 8;

const initialForm = {
  nombre_camion: "",
  placa: "",
  peso_min: "0",
  peso_max: "",
};

function Camiones() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const canCreateTruck = hasPermission("camiones.crear");
  const canEditTruck = hasPermission("camiones.editar");
  const canDeleteTruck = hasPermission("camiones.eliminar");

  const [camiones, setCamiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [form, setForm] = useState(initialForm);

  const cargarCamiones = async () => {
    try {
      setLoading(true);
      const data = await getCamiones();
      setCamiones(data.camiones || []);
    } catch (error) {
      showError(error.response?.data?.msg || t("error_loading_trucks"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCamiones();
  }, []);

  const camionesFiltrados = useMemo(() => {
    const text = busqueda.toLowerCase().trim();

    if (!text) return camiones;

    return camiones.filter((camion) => {
      return (
        camion.nombre_camion?.toLowerCase().includes(text) ||
        camion.placa?.toLowerCase().includes(text) ||
        String(camion.peso_min || "").includes(text) ||
        String(camion.peso_max || "").includes(text)
      );
    });
  }, [camiones, busqueda]);

  const totalActivos = camiones.filter((c) => Number(c.estado) === 1).length;
  const totalInactivos = camiones.filter((c) => Number(c.estado) === 0).length;

  const totalPaginas = Math.ceil(camionesFiltrados.length / RECORDS_PER_PAGE);

  const camionesPaginados = camionesFiltrados.slice(
    (paginaActual - 1) * RECORDS_PER_PAGE,
    paginaActual * RECORDS_PER_PAGE
  );

  const abrirModalNuevo = () => {
    if (!canCreateTruck) {
      showError(t("no_permission_create_truck"));
      return;
    }

    setEditando(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const abrirModalEditar = (camion) => {
    if (!canEditTruck) {
      showError(t("no_permission_edit_truck"));
      return;
    }

    setEditando(camion);
    setForm({
      nombre_camion: camion.nombre_camion || "",
      placa: camion.placa || "",
      peso_min: camion.peso_min || "0",
      peso_max: camion.peso_max || "",
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

  const handleBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPaginaActual(1);
  };

  const validarFormulario = () => {
    if (!form.nombre_camion.trim()) return t("truck_name_required");
    if (!form.peso_max || Number(form.peso_max) <= 0) {
      return t("truck_max_weight_required");
    }
    if (Number(form.peso_min || 0) < 0) {
      return t("truck_min_weight_negative");
    }
    if (Number(form.peso_min || 0) > Number(form.peso_max || 0)) {
      return t("truck_min_weight_exceeds_max");
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (editando && !canEditTruck) {
      showError(t("no_permission_edit_truck"));
      return;
    }

    if (!editando && !canCreateTruck) {
      showError(t("no_permission_create_truck"));
      return;
    }

    const error = validarFormulario();
    if (error) {
      showError(error);
      return;
    }

    const payload = {
      ...form,
      peso_min: Number(form.peso_min || 0),
      peso_max: Number(form.peso_max),
    };

    try {
      setSaving(true);

      if (editando) {
        await updateCamion(editando.id_camion, payload);
        showSuccess(t("truck_updated"));
      } else {
        await createCamion(payload);
        showSuccess(t("truck_created"));
      }

      cerrarModal();
      await cargarCamiones();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_saving_truck"));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (camion) => {
    if (!canDeleteTruck) {
      showError(t("no_permission_change_truck_status"));
      return;
    }

    const nuevoEstado = Number(camion.estado) === 1 ? 0 : 1;
    const action = nuevoEstado === 1 ? t("activate") : t("deactivate");

    const confirmed = window.confirm(
      t("confirm_change_truck_status", { action })
    );

    if (!confirmed) return;

    try {
      setChangingStatusId(camion.id_camion);
      await cambiarEstadoCamion(camion.id_camion, nuevoEstado);

      showSuccess(
        nuevoEstado === 1
          ? t("truck_activated")
          : t("truck_deactivated")
      );

      await cargarCamiones();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_changing_truck_status"));
    } finally {
      setChangingStatusId(null);
    }
  };

  const hasActions = canEditTruck || canDeleteTruck;

  return (
    <DashboardLayout>
      <div className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("trucks_title")}</h1>
            <p className="text-slate-500">
              {t("trucks_description")}
            </p>
          </div>

          {canCreateTruck && (
            <button
              type="button"
              onClick={abrirModalNuevo}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              {t("new_truck")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500">{t("total_trucks")}</p>
                <h2 className="text-2xl font-bold">{camiones.length}</h2>
              </div>
              <Truck className="text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-slate-500">{t("active_trucks")}</p>
            <h2 className="text-2xl font-bold text-green-600">{totalActivos}</h2>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-slate-500">{t("inactive_trucks")}</p>
            <h2 className="text-2xl font-bold text-red-600">{totalInactivos}</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">{t("trucks_list")}</h2>
              <p className="text-sm text-slate-500">
                {t("trucks_track_capacity")}
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={busqueda}
                onChange={handleBusqueda}
                placeholder={t("search_truck")}
                className="w-full border rounded-lg pl-10 pr-3 py-2"
              />
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
                      <th className="text-left p-3">{t("truck_name")}</th>
                      <th className="text-left p-3">{t("truck_plate")}</th>
                      <th className="text-left p-3">{t("min_weight")}</th>
                      <th className="text-left p-3">{t("max_weight")}</th>
                      <th className="text-left p-3">{t("status")}</th>
                      {hasActions && <th className="text-right p-3">{t("actions")}</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {camionesPaginados.map((camion) => (
                      <tr key={camion.id_camion} className="border-b">
                        <td className="p-3 font-semibold">{camion.nombre_camion}</td>
                        <td className="p-3">{camion.placa || "-"}</td>
                        <td className="p-3">
                          {Number(camion.peso_min || 0).toFixed(2)} {t("ton")}
                        </td>
                        <td className="p-3">
                          {Number(camion.peso_max || 0).toFixed(2)} {t("ton")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              Number(camion.estado) === 1
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {Number(camion.estado) === 1 ? t("active") : t("inactive")}
                          </span>
                        </td>

                        {hasActions && (
                          <td className="p-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              {canEditTruck && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditar(camion)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  <Pencil size={14} />
                                  {t("edit")}
                                </button>
                              )}

                              {canDeleteTruck && (
                                <button
                                  type="button"
                                  disabled={changingStatusId === camion.id_camion}
                                  onClick={() => cambiarEstado(camion)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                                >
                                  {Number(camion.estado) === 1 ? (
                                    <PowerOff size={14} />
                                  ) : (
                                    <Power size={14} />
                                  )}
                                  {changingStatusId === camion.id_camion
                                    ? t("saving")
                                    : Number(camion.estado) === 1
                                    ? t("deactivate")
                                    : t("activate")}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {camionesPaginados.length === 0 && (
                      <tr>
                        <td
                          colSpan={hasActions ? 6 : 5}
                          className="p-4 text-center text-slate-500"
                        >
                          {t("no_trucks")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                <p className="text-sm text-slate-500">
                  {t("trucks_showing", {
                    count: camionesPaginados.length,
                    total: camionesFiltrados.length
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editando ? t("edit_truck") : t("new_truck")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("truck_register_capacity")}
                  </p>
                </div>

                <button type="button" onClick={cerrarModal}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("truck_name")} *</label>
                  <input
                    type="text"
                    name="nombre_camion"
                    value={form.nombre_camion}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("truck_name_placeholder")}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">{t("truck_plate")}</label>
                  <input
                    type="text"
                    name="placa"
                    value={form.placa}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("truck_plate_placeholder")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t("min_weight")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="peso_min"
                      value={form.peso_min}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t("max_weight")} *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="peso_max"
                      value={form.peso_max}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
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
                    {saving ? t("saving") : editando ? t("update") : t("save_truck")}
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

export default Camiones;