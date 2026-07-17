import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";
import Pagination from "../components/Pagination";
import usePermission from "../hooks/usePermission";

import {
  showSuccess,
  showError,
  showConfirm
} from "../utils/alerts";

import {
  Users,
  UserPlus,
  Search,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  Pencil,
  CircleCheck,
  CircleX,
  X,
  Save,
  UserRound,
  Eye,
  UserX,
} from "lucide-react";

import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario
} from "../api/usuarios";

import { getRoles } from "../api/roles";
import { getEmpresas } from "../api/empresas";

export default function Usuarios() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [idUsuario, setIdUsuario] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  const [openViewModal, setOpenViewModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    id_empresa: "",
    id_rol: "",
    nombres: "",
    email: "",
    celular: "",
    password_user: "",
    estado: 1
  });

  const normalize = (res, key) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.[key])) return res[key];
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.[key])) return res.data[key];
    return [];
  };

  const cargarUsuarios = async () => {
    if (!hasPermission("usuarios.ver")) return;

    try {
      const res = await getUsuarios();
      setUsuarios(normalize(res, "usuarios"));
    } catch (error) {
      if (error?.response?.status === 403) return;

      console.error("ERROR CARGANDO USUARIOS:", error);
      setUsuarios([]);
    }
  };

  const cargarRoles = async () => {
    if (!hasPermission("roles.ver")) return;

    try {
      const res = await getRoles();
      setRoles(normalize(res, "roles"));
    } catch (error) {
      if (error?.response?.status === 403) return;

      console.error("ERROR CARGANDO ROLES:", error);
      setRoles([]);
    }
  };

  const cargarEmpresas = async () => {
    if (!hasPermission("empresas.ver")) return;

    try {
      const res = await getEmpresas();
      setEmpresas(normalize(res, "empresas"));
    } catch (error) {
      if (error?.response?.status === 403) return;

      console.error("ERROR CARGANDO EMPRESAS:", error);
      setEmpresas([]);
    }
  };

  const verUsuario = (u) => {
    setUsuarioSeleccionado(u);
    setOpenViewModal(true);
  };

  const cerrarViewModal = () => {
    setUsuarioSeleccionado(null);
    setOpenViewModal(false);
  };

  useEffect(() => {
  if (hasPermission("usuarios.ver")) {
    cargarUsuarios();
  }

  if (hasPermission("roles.ver")) {
    cargarRoles();
  }

  if (hasPermission("empresas.ver")) {
    cargarEmpresas();
  }
}, []);

  const limpiarForm = () => {
    setIdUsuario(null);
    setForm({
      id_empresa: "",
      id_rol: "",
      nombres: "",
      email: "",
      celular: "",
      password_user: "",
      estado: 1
    });
  };

  const nuevoUsuario = () => {
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
      [name]: ["id_empresa", "id_rol", "estado"].includes(name)
        ? value === "" ? "" : Number(value)
        : value
    });
  };

  const editarUsuario = (u) => {
    setIdUsuario(u.id_usuario);

    setForm({
      id_empresa: Number(u.id_empresa),
      id_rol: Number(u.id_rol),
      nombres: u.nombres || "",
      email: u.email || "",
      celular: u.celular || "",
      password_user: "",
      estado: Number(u.estado) === 1 ? 1 : 0
    });

    setOpenModal(true);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (idUsuario) {
        await updateUsuario(idUsuario, form);
      } else {
        await createUsuario(form);
      }

      await cargarUsuarios();
      setCurrentPage(1);
      cerrarModal();

    } catch (error) {
      console.error("ERROR AL GUARDAR:", error);

      showError(
        error?.response?.data?.message ||
        t("user_save_error")
      );
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = `
      ${u.nombres || ""}
      ${u.email || ""}
      ${u.nombre_empresa || ""}
      ${u.rol || ""}
      ${u.celular || ""}
    `.toLowerCase();

    return texto.includes(busqueda.toLowerCase());
  });
  const totalItems = usuariosFiltrados.length;

  const usuariosPaginados = usuariosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {t("users_title")}
              </h1>
              <p className="text-slate-500">
                {t("users_description")}
              </p>
            </div>
          </div>

          {hasPermission("usuarios.crear") && (
            <button
              onClick={nuevoUsuario}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow transition"
            >
              <UserPlus size={18} />
              {t("new_user")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("total_users")}
            </p>
            <h3 className="text-2xl font-bold text-slate-800">
              {usuarios.length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("active")}
            </p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {usuarios.filter((u) => Number(u.estado) === 1).length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">
              {t("inactive")}
            </p>
            <h3 className="text-2xl font-bold text-rose-500">
              {usuarios.filter((u) => Number(u.estado) !== 1).length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="font-semibold text-slate-700">
              {t("users")}
            </h2>

            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("search_user")}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left">{t("id")}</th>
                  <th className="p-4 text-left">{t("company")}</th>
                  <th className="p-4 text-left">{t("name")}</th>
                  <th className="p-4 text-left">{t("email")}</th>
                  <th className="p-4 text-left">{t("role")}</th>
                  <th className="p-4 text-left">{t("status")}</th>
                  <th className="p-4 text-center">{t("actions")}</th>
                </tr>
              </thead>

              <tbody>
                {usuariosPaginados.map((u) => (
                  <tr
                    key={u.id_usuario}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="p-4 text-slate-500">
                      #{u.id_usuario}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2 size={16} className="text-slate-400" />
                        {u.nombre_empresa || (
                          <span className="text-slate-400">
                            {t("no_company")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {u.nombres?.charAt(0)?.toUpperCase() || "U"}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {u.nombres}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={12} />
                            {u.celular || t("no_phone")}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="text-slate-400" />
                        {u.email}
                      </div>
                    </td>

                    <td className="p-4">
                      {u.rol ? (
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium">
                          <ShieldCheck size={14} />
                          {u.rol}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {t("no_role")}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {Number(u.estado) === 1 ? (
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
                      <div className="flex justify-center gap-2 flex-wrap">
                        {hasPermission("usuarios.ver") && (
                          <button
                            onClick={() => verUsuario(u)}
                            className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            <Eye size={15} />
                            {t("view")}
                          </button>
                        )}

                        {hasPermission("usuarios.editar") && (
                          <button
                            onClick={() => editarUsuario(u)}
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

                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-400"
                    >
                      {t("no_users")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {openModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">

              <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {idUsuario ? t("edit_user") : t("new_user")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("user_info")}
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
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6"
              >
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("company")}
                  </label>
                  <select
                    name="id_empresa"
                    value={form.id_empresa}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({
                        ...form,
                        id_empresa: value === "" ? "" : Number(value)
                      });
                    }}
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required
                  >
                    <option value="">
                      {t("select_company")}
                    </option>
                    {empresas.map((e) => (
                      <option key={e.id_empresa} value={e.id_empresa}>
                        {e.nombre_empresa || e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("role")}
                  </label>
                  <select
                    name="id_rol"
                    value={form.id_rol}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({
                        ...form,
                        id_rol: value === "" ? "" : Number(value)
                      });
                    }}
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required
                  >
                    <option value="">
                      {t("select_role")}
                    </option>
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.rol || r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("name")}
                  </label>

                  <div className="relative mt-1">
                    <UserRound
                      size={17}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      name="nombres"
                      value={form.nombres}
                      onChange={handleChange}
                      placeholder={t("full_name")}
                      className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("email")}
                  </label>

                  <div className="relative mt-1">
                    <Mail
                      size={17}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@email.com"
                      className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("cellphone")}
                  </label>

                  <div className="relative mt-1">
                    <Phone
                      size={17}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      name="celular"
                      value={form.celular}
                      onChange={handleChange}
                      placeholder={t("cellphone")}
                      className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("password")} {idUsuario && `(${t("optional")})`}
                  </label>
                  <input
                    type="password"
                    name="password_user"
                    value={form.password_user}
                    onChange={handleChange}
                    placeholder={
                      idUsuario
                        ? t("leave_empty_password")
                        : t("password")
                    }
                    className="mt-1 w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required={!idUsuario}
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
                    <option value={1}>{t("active")}</option>
                    <option value={0}>{t("inactive")}</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  {hasPermission(idUsuario ? "usuarios.editar" : "usuarios.crear") && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                    >
                      <Save size={18} />
                      {loading
                        ? t("saving")
                        : idUsuario
                          ? t("update")
                          : t("save")}
                    </button>
                  )}  
                    
                </div>
              </form>

            </div>
          </div>
        )}

        {openViewModal && usuarioSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {t("user_details")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {usuarioSeleccionado.nombres}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarViewModal}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                    {usuarioSeleccionado.nombres?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800">
                      {usuarioSeleccionado.nombres}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {usuarioSeleccionado.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">{t("company")}</p>
                    <p className="font-medium text-slate-700">
                      {usuarioSeleccionado.nombre_empresa || t("no_company")}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">{t("role")}</p>
                    <p className="font-medium text-slate-700">
                      {usuarioSeleccionado.rol || t("no_role")}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">{t("cellphone")}</p>
                    <p className="font-medium text-slate-700">
                      {usuarioSeleccionado.celular || t("no_phone")}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">{t("status")}</p>
                    <p
                      className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${
                        Number(usuarioSeleccionado.estado) === 1
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {Number(usuarioSeleccionado.estado) === 1
                        ? t("active")
                        : t("inactive")}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">{t("id")}</p>
                    <p className="font-medium text-slate-700">
                      #{usuarioSeleccionado.id_usuario}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">{t("date")}</p>
                    <p className="font-medium text-slate-700">
                      {usuarioSeleccionado.fyh_creacion || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarViewModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}




      </div>
    </DashboardLayout>
  );
}