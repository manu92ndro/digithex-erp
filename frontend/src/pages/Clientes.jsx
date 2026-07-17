import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  Save,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  getClientes,
  createCliente,
  updateCliente,
  cambiarEstadoCliente,
} from "../api/clientes";
import { showSuccess, showError } from "../utils/alerts";
import usePermission from "../hooks/usePermission";

const CLIENTS_PER_PAGE = 8;

const initialForm = {
  nombres: "",
  celular: "",
  correo: "",
  direccion: "",
};

function Clientes() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const canCreateClient = hasPermission("clientes.crear");
  const canEditClient = hasPermission("clientes.editar");
  const canDeleteClient = hasPermission("clientes.eliminar");

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [form, setForm] = useState(initialForm);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data.clientes || []);
    } catch (error) {
      showError(error.response?.data?.msg || t("error_loading_clients"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const text = busqueda.toLowerCase().trim();

    if (!text) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombres?.toLowerCase().includes(text) ||
        cliente.celular?.toLowerCase().includes(text) ||
        cliente.correo?.toLowerCase().includes(text) ||
        cliente.direccion?.toLowerCase().includes(text)
      );
    });
  }, [clientes, busqueda]);

  const totalPaginas = Math.ceil(clientesFiltrados.length / CLIENTS_PER_PAGE);

  const clientesPaginados = clientesFiltrados.slice(
    (paginaActual - 1) * CLIENTS_PER_PAGE,
    paginaActual * CLIENTS_PER_PAGE
  );

  const abrirModalNuevo = () => {
    if (!canCreateClient) {
      showError(t("no_permission_create_client"));
      return;
    }

    setEditando(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const abrirModalEditar = (cliente) => {
    if (!canEditClient) {
      showError(t("no_permission_edit_client"));
      return;
    }

    setEditando(cliente);
    setForm({
      nombres: cliente.nombres || "",
      celular: cliente.celular || "",
      correo: cliente.correo || "",
      direccion: cliente.direccion || "",
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
    if (!form.nombres.trim()) return t("client_name_required");
    if (!form.celular.trim()) return t("client_phone_required");
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editando && !canEditClient) {
      showError(t("no_permission_edit_client"));
      return;
    }

    if (!editando && !canCreateClient) {
      showError(t("no_permission_create_client"));
      return;
    }

    const error = validarFormulario();

    if (error) {
      showError(error);
      return;
    }

    try {
      setSaving(true);

      if (editando) {
        await updateCliente(editando.id_cliente, form);
        showSuccess(t("client_updated"));
      } else {
        await createCliente(form);
        showSuccess(t("client_created"));
      }

      cerrarModal();
      await cargarClientes();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_saving_client"));
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (cliente) => {
    if (!canDeleteClient) {
      showError(t("no_permission_change_client_status"));
      return;
    }

    const nuevoEstado = cliente.estado === 1 ? 0 : 1;
    const actionText = nuevoEstado === 1 ? t("activate") : t("deactivate");

    const confirmar = window.confirm(
      t("confirm_change_client_status", { action: actionText })
    );

    if (!confirmar) return;

    try {
      setChangingStatusId(cliente.id_cliente);

      await cambiarEstadoCliente(cliente.id_cliente, nuevoEstado);

      showSuccess(
        nuevoEstado === 1
          ? t("client_activated")
          : t("client_deactivated")
      );

      await cargarClientes();
    } catch (error) {
      showError(error.response?.data?.msg || t("error_changing_client_status"));
    } finally {
      setChangingStatusId(null);
    }
  };

  const showActions = canEditClient || canDeleteClient;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={26} className="text-blue-600" />
              {t("clients_title")}
            </h1>
            <p className="text-slate-500">
              {t("clients_description")}
            </p>
          </div>

          {canCreateClient && (
            <button
              type="button"
              onClick={abrirModalNuevo}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              {t("new_client")}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users size={20} className="text-slate-600" />
                {t("clients_list")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("clients_search_manage")}
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
                placeholder={t("clients_search_placeholder")}
                className="w-full border rounded-lg pl-10 pr-3 py-2"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-50 border rounded-lg p-4 text-slate-600">
              {t("loading")}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">{t("client")}</th>
                      <th className="text-left p-3">{t("client_phone")}</th>
                      <th className="text-left p-3">{t("client_email")}</th>
                      <th className="text-left p-3">{t("status")}</th>
                      {showActions && (
                        <th className="text-right p-3">{t("actions")}</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {clientesPaginados.map((cliente) => (
                      <tr key={cliente.id_cliente} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {cliente.nombres}
                          </div>

                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {cliente.direccion || t("no_address")}
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={14} className="text-slate-400" />
                            {cliente.celular}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            <Mail size={14} className="text-slate-400" />
                            {cliente.correo || "-"}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              cliente.estado === 1
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {cliente.estado === 1 ? (
                              <Power size={12} />
                            ) : (
                              <PowerOff size={12} />
                            )}
                            {cliente.estado === 1 ? t("active") : t("inactive")}
                          </span>
                        </td>

                        {showActions && (
                          <td className="p-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              {canEditClient && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditar(cliente)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  <Pencil size={14} />
                                  {t("edit")}
                                </button>
                              )}

                              {canDeleteClient && (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(cliente)}
                                  disabled={changingStatusId === cliente.id_cliente}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                                >
                                  {cliente.estado === 1 ? (
                                    <PowerOff size={14} />
                                  ) : (
                                    <Power size={14} />
                                  )}

                                  {changingStatusId === cliente.id_cliente
                                    ? t("saving")
                                    : cliente.estado === 1
                                    ? t("deactivate")
                                    : t("activate")}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {clientesPaginados.length === 0 && (
                      <tr>
                        <td
                          colSpan={showActions ? 5 : 4}
                          className="p-4 text-center text-slate-500"
                        >
                          {t("no_clients")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                <p className="text-sm text-slate-500">
                  {t("clients_showing", {
                    count: clientesPaginados.length,
                    total: clientesFiltrados.length
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

                  <span className="text-sm text-slate-600">
                    {t("page")} {paginaActual} {t("of")} {totalPaginas || 1}
                  </span>

                  <button
                    type="button"
                    disabled={paginaActual === totalPaginas || totalPaginas === 0}
                    onClick={() =>
                      setPaginaActual((p) => Math.min(p + 1, totalPaginas))
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
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {editando ? (
                    <>
                      <Pencil size={20} className="text-amber-600" />
                      {t("edit_client")}
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} className="text-blue-600" />
                      {t("new_client")}
                    </>
                  )}
                </h2>

                <button
                  type="button"
                  onClick={cerrarModal}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("client_name")} *</label>
                  <input
                    type="text"
                    name="nombres"
                    value={form.nombres}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("full_name")}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">{t("client_phone")} *</label>
                  <input
                    type="text"
                    name="celular"
                    value={form.celular}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("phone_number")}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">{t("client_email")}</label>
                  <input
                    type="email"
                    name="correo"
                    value={form.correo}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("email_address")}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    {t("client_address")}
                  </label>
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder={t("client_address_placeholder")}
                    rows="3"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300"
                  >
                    <X size={16} />
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save size={16} />
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

export default Clientes;