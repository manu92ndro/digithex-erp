import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";
import usePermission from "../hooks/usePermission";

import {
  showSuccess,
  showError,
  showConfirm
} from "../utils/alerts";

import {
  Building2,
  Search,
  Mail,
  Phone,
  MapPin,
  Plus,
  Pencil,
  CircleCheck,
  CircleX,
  X,
  Save
} from "lucide-react";

import {
  getEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa
} from "../api/empresas";

export default function Empresas() {
  const { t } = useTranslation();

  const { hasPermission } = usePermission();
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState({
    nombre_empresa: "",
    email: "",
    telefono: "",
    direccion: "",
    estado: 1
  });

  const normalize = (res, key) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.[key])) return res[key];
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.[key])) return res.data[key];
    return [];
  };

  const cargarEmpresas = async () => {
    try {
      const res = await getEmpresas();
      setEmpresas(normalize(res, "empresas"));
    } catch (error) {
      console.error("ERROR CARGANDO EMPRESAS:", error);
      setEmpresas([]);
    }
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const limpiarForm = () => {
    setForm({
      nombre_empresa: "",
      email: "",
      telefono: "",
      direccion: "",
      estado: 1
    });
    setIdEmpresa(null);
  };

  const nuevaEmpresa = () => {
    limpiarForm();
    setOpenModal(true);
  };

  const cerrarModal = () => {
    limpiarForm();
    setOpenModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "estado" ? Number(value) : value
    });
  };

  const guardarEmpresa = async (e) => {
    e.preventDefault();

    if (!form.nombre_empresa.trim()) {
      showError(t("company_name_required"));
      return;
    }

    try {
      setLoading(true);

      if (idEmpresa) {
        await updateEmpresa(idEmpresa, form);
      } else {
        await createEmpresa(form);
      }

      await cargarEmpresas();
      cerrarModal();

    } catch (error) {
      console.error("ERROR GUARDANDO EMPRESA:", error);
      showSuccess(
        error?.response?.data?.message ||
        t("company_save_error")
      );
    } finally {
      setLoading(false);
    }
  };

  const editarEmpresa = (empresa) => {
    setForm({
      nombre_empresa: empresa.nombre_empresa || "",
      email: empresa.email || "",
      telefono: empresa.telefono || "",
      direccion: empresa.direccion || "",
      estado: Number(empresa.estado) === 1 ? 1 : 0
    });

    setIdEmpresa(empresa.id_empresa);
    setOpenModal(true);
  };

  const eliminarEmpresa = async (id) => {
    if (!confirm(t("confirm_deactivate_company"))) return;

    try {
      await deleteEmpresa(id);
      await cargarEmpresas();
    } catch (error) {
      console.error("ERROR ELIMINANDO EMPRESA:", error);
      showError(
        error?.response?.data?.message ||
        t("company_deactivate_error")
      );
    }
  };

  const empresasFiltradas = empresas.filter((empresa) => {
    const texto = `
      ${empresa.nombre_empresa || ""}
      ${empresa.email || ""}
      ${empresa.telefono || ""}
      ${empresa.direccion || ""}
    `.toLowerCase();

    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 size={24} className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {t("companies_title")}
              </h1>

              <p className="text-slate-500">
                {t("companies_description")}
              </p>
            </div>
          </div>

          {hasPermission("empresas.crear") && (
            <button
              onClick={nuevaEmpresa}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus size={18} />
              {t("new_company")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("total_companies")}
            </p>
            <h3 className="text-2xl font-bold text-slate-800">
              {empresas.length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("active")}
            </p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {empresas.filter((e) => Number(e.estado) === 1).length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("inactive")}
            </p>
            <h3 className="text-2xl font-bold text-rose-500">
              {empresas.filter((e) => Number(e.estado) !== 1).length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="font-semibold text-slate-700">
              {t("companies")}
            </h2>

            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t("search_company")}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left">
                    {t("id")}
                  </th>
                  <th className="p-4 text-left">
                    {t("company")}
                  </th>
                  <th className="p-4 text-left">
                    {t("email")}
                  </th>
                  <th className="p-4 text-left">
                    {t("phone")}
                  </th>
                  <th className="p-4 text-left">
                    {t("status")}
                  </th>
                  <th className="p-4 text-center">
                    {t("actions")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.map((empresa) => (
                  <tr
                    key={empresa.id_empresa}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="p-4 text-slate-500">
                      #{empresa.id_empresa}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 size={20} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {empresa.nombre_empresa}
                          </p>

                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin size={12} />
                            {empresa.direccion || t("no_address")}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="text-slate-400" />
                        {empresa.email || t("no_email")}
                      </div>
                    </td>

                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-slate-400" />
                        {empresa.telefono || t("no_phone")}
                      </div>
                    </td>

                    <td className="p-4">
                      {Number(empresa.estado) === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <CircleCheck size={14} />
                          {t("active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                          <CircleX size={14} />
                          {t("inactive")}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {hasPermission("empresas.editar") && (
                          <button
                            onClick={() => editarEmpresa(empresa)}
                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            <Pencil size={15} />
                            {t("edit")}
                          </button>
                        )}

                        
                      </div>
                    </td>
                  </tr>
                ))}

                {empresasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 text-center text-slate-400"
                    >
                      {t("no_companies")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {openModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">

              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {idEmpresa ? t("edit_company") : t("new_company")}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {t("company_info")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarModal}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={guardarEmpresa}
                className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("company_name")}
                  </label>
                  <input
                    type="text"
                    name="nombre_empresa"
                    value={form.nombre_empresa}
                    onChange={handleChange}
                    placeholder="Ej: DigiThex"
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("email")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="empresa@email.com"
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("phone")}
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="0999999999"
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("status")}
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value={1}>
                      {t("active")}
                    </option>
                    <option value={0}>
                      {t("inactive")}
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">
                    {t("address")}
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder={t("address")}
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  {hasPermission(idEmpresa ? "empresas.editar" : "empresas.crear") && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                    >
                      <Save size={18} />
                      {loading
                        ? t("saving")
                        : idEmpresa
                          ? t("update")
                          : t("save")}
                    </button>
                  )}
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}