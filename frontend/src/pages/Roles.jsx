import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Pagination from "../components/Pagination";
import usePermission from "../hooks/usePermission";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

import {
  showSuccess,
  showError,
  showConfirm
} from "../utils/alerts";

import {
  ShieldCheck,
  Plus,
  Pencil,
  CircleCheck,
  CircleX,
  Save,
  X,
  KeyRound,
  Building2
} from "lucide-react";

import {
  getRoles,
  createRol,
  deleteRol,
  updateRol
} from "../api/roles";

import { getEmpresas } from "../api/empresas";

import {
  getPermisos,
  getPermisosByRol,
  updatePermisosRol
} from "../api/permisos";

export default function Roles() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const { user } = useAuth();

  const esSuperAdmin =
    user?.rol === "SUPER ADMIN" ||
    user?.rol === "Super Admin";

  const [roles, setRoles] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState(1);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [idRol, setIdRol] = useState(null);

  const [loading, setLoading] = useState(false);
  const [openRolModal, setOpenRolModal] = useState(false);

  const [openPermisosModal, setOpenPermisosModal] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [permisosRol, setPermisosRol] = useState([]);
  const [loadingPermisos, setLoadingPermisos] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const normalize = (res, key) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.[key])) return res[key];
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.[key])) return res.data[key];
    return [];
  };

  const cargarRoles = async () => {
    try {
      const res = await getRoles();
      setRoles(normalize(res, "roles"));
    } catch (error) {
      console.error("ERROR CARGANDO ROLES:", error);
      setRoles([]);
    }
  };

  const cargarEmpresas = async () => {
    if (!esSuperAdmin) return;

    try {
      const res = await getEmpresas();
      setEmpresas(normalize(res, "empresas"));
    } catch (error) {
      console.error("ERROR CARGANDO EMPRESAS:", error);
      setEmpresas([]);
    }
  };

  useEffect(() => {
    cargarRoles();
    cargarEmpresas();
  }, []);

  const limpiarForm = () => {
    setRol("");
    setEstado(1);
    setIdEmpresa("");
    setIdRol(null);
  };

  const abrirNuevoRol = () => {
    limpiarForm();
    setOpenRolModal(true);
  };

  const cerrarRolModal = () => {
    limpiarForm();
    setOpenRolModal(false);
  };

  const editarRol = (item) => {
    setRol(item.rol || "");
    setEstado(Number(item.estado) === 1 ? 1 : 0);
    setIdEmpresa(item.id_empresa || "");
    setIdRol(item.id_rol);
    setOpenRolModal(true);
  };

  const guardarRol = async (e) => {
    e.preventDefault();

    if (!rol.trim()) {
      showSuccess(t("role_name_required"));
      return;
    }

    try {
      setLoading(true);

      const data = {
        rol,
        estado,
        id_empresa: esSuperAdmin
          ? idEmpresa || null
          : user?.id_empresa
      };

      if (idRol) {
        await updateRol(idRol, data);
      } else {
        await createRol(data);
      }

      cerrarRolModal();
      await cargarRoles();
      setCurrentPage(1);
    } catch (error) {
      console.error("ERROR GUARDANDO ROL:", error);
      showError(error?.response?.data?.message || t("role_save_error"));
    } finally {
      setLoading(false);
    }
  };

  const eliminarRol = async (id) => {
    const confirmar = await showConfirm(t("confirm_deactivate_role"));

    if (!confirmar) return;

    try {
      await deleteRol(id);
      await cargarRoles();
      setCurrentPage(1);

      showSuccess(t("role_deactivated"));
    } catch (error) {
      console.error("ERROR ELIMINANDO ROL:", error);
      showError(error?.response?.data?.message || t("role_deactivate_error"));
    }
  };

  const abrirPermisos = async (item) => {
    try {
      setRolSeleccionado(item);
      setOpenPermisosModal(true);
      setLoadingPermisos(true);

      const resPermisos = await getPermisos();
      const resRol = await getPermisosByRol(item.id_rol);

      setPermisos(normalize(resPermisos, "permisos"));
      setPermisosRol((resRol.permisos || []).map(Number));
    } catch (error) {
      console.error("ERROR CARGANDO PERMISOS:", error);
      showError(t("permissions_load_error"));
    } finally {
      setLoadingPermisos(false);
    }
  };

  const cerrarPermisos = () => {
    setOpenPermisosModal(false);
    setRolSeleccionado(null);
    setPermisos([]);
    setPermisosRol([]);
  };

  const togglePermiso = (idPermiso) => {
    const id = Number(idPermiso);

    const permisoSeleccionado = permisos.find(
      (p) => Number(p.id_permiso) === id
    );

    if (!permisoSeleccionado) return;

    const [modulo, accion] = permisoSeleccionado.permiso.split(".");

    const permisoVer = permisos.find(
      (p) => p.permiso === `${modulo}.ver`
    );

    const yaMarcado = permisosRol.includes(id);

    if (yaMarcado) {
      let nuevos = permisosRol.filter((p) => p !== id);

      if (accion === "ver") {
        nuevos = nuevos.filter((permisoId) => {
          const permiso = permisos.find(
            (p) => Number(p.id_permiso) === permisoId
          );

          return !permiso?.permiso.startsWith(`${modulo}.`);
        });
      }

      setPermisosRol(nuevos);
      return;
    }

    let nuevos = [...permisosRol, id];

    if (accion !== "ver" && permisoVer) {
      const idVer = Number(permisoVer.id_permiso);

      if (!nuevos.includes(idVer)) {
        nuevos.push(idVer);
      }
    }

    setPermisosRol(nuevos);
  };

  const guardarPermisos = async () => {
    try {
      setLoadingPermisos(true);

      await updatePermisosRol(
        rolSeleccionado.id_rol,
        permisosRol
      );

      showSuccess(t("permissions_updated"));
      cerrarPermisos();
    } catch (error) {
      console.error("ERROR GUARDANDO PERMISOS:", error);
      showError(error?.response?.data?.message || t("permissions_update_error"));
    } finally {
      setLoadingPermisos(false);
    }
  };

  const permisosAgrupados = permisos.reduce((acc, permiso) => {
    const modulo = permiso.nombre_modulo;

    if (!acc[modulo]) {
      acc[modulo] = [];
    }

    acc[modulo].push(permiso);

    return acc;
  }, {});

  const totalItems = roles.length;

  const rolesPaginados = roles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShieldCheck size={24} className="text-indigo-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {t("roles_title")}
              </h1>
              <p className="text-slate-500">
                {t("roles_description")}
              </p>
            </div>
          </div>

          {hasPermission("roles.crear") && (
            <button
              onClick={abrirNuevoRol}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition"
            >
              <Plus size={18} />
              {t("new_role")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">{t("total_roles")}</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {roles.length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">{t("active")}</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {roles.filter((r) => Number(r.estado) === 1).length}
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-500">{t("inactive")}</p>
            <h3 className="text-2xl font-bold text-rose-500">
              {roles.filter((r) => Number(r.estado) !== 1).length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left">{t("id")}</th>
                  <th className="p-4 text-left">{t("company")}</th>
                  <th className="p-4 text-left">{t("role")}</th>
                  <th className="p-4 text-left">{t("status")}</th>
                  <th className="p-4 text-center">{t("actions")}</th>
                </tr>
              </thead>

              <tbody>
                {rolesPaginados.map((item) => (
                  <tr
                    key={item.id_rol}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="p-4 text-slate-500">
                      #{item.id_rol}
                    </td>

                    <td className="p-4 text-slate-600">
                      <div className="inline-flex items-center gap-2">
                        <Building2 size={15} className="text-slate-400" />
                        {item.nombre_empresa || t("global")}
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-slate-800">
                      {item.rol}
                    </td>

                    <td className="p-4">
                      {Number(item.estado) === 1 ? (
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
                        {hasPermission("roles.editar") && (
                          <button
                            onClick={() => editarRol(item)}
                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            <Pencil size={15} />
                            {t("edit")}
                          </button>
                        )}

                        {hasPermission("roles.editar") && (
                          <button
                            onClick={() => abrirPermisos(item)}
                            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            <KeyRound size={15} />
                            {t("permissions")}
                          </button>
                        )}

                        {hasPermission("roles.eliminar") && (
                          <button
                            onClick={() => eliminarRol(item.id_rol)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            {t("deactivate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {roles.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-slate-400"
                    >
                      {t("no_roles")}
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

        {openRolModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">

              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {idRol ? t("edit_role") : t("new_role")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("roles_description")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarRolModal}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardarRol} className="p-6 space-y-4">

                {esSuperAdmin && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      {t("company")}
                    </label>

                    <select
                      value={idEmpresa}
                      onChange={(e) => {
                        const value = e.target.value;
                        setIdEmpresa(value === "" ? "" : Number(value));
                      }}
                      className="mt-1 w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="">
                        {t("global")}
                      </option>

                      {empresas.map((empresa) => (
                        <option
                          key={empresa.id_empresa}
                          value={empresa.id_empresa}
                        >
                          {empresa.nombre_empresa}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("role_name")}
                  </label>

                  <input
                    type="text"
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    placeholder={t("role_name")}
                    className="mt-1 w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("status")}
                  </label>

                  <select
                    value={estado}
                    onChange={(e) => setEstado(Number(e.target.value))}
                    className="mt-1 w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value={1}>{t("active")}</option>
                    <option value={0}>{t("inactive")}</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarRolModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                  >
                    <Save size={18} />
                    {loading
                      ? t("saving")
                      : idRol
                        ? t("update")
                        : t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {openPermisosModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden">

              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {t("role_permissions")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {rolSeleccionado?.rol} · {rolSeleccionado?.nombre_empresa || t("global")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarPermisos}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {loadingPermisos ? (
                  <p className="text-slate-500">
                    {t("loading")}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(permisosAgrupados).map(([modulo, lista]) => (
                      <div
                        key={modulo}
                        className="border border-slate-100 rounded-2xl overflow-hidden"
                      >
                        <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                          {modulo}
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {lista.map((permiso) => (
                            <label
                              key={permiso.id_permiso}
                              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={permisosRol.includes(Number(permiso.id_permiso))}
                                onChange={() => togglePermiso(permiso.id_permiso)}
                                className="mt-1"
                              />

                              <div>
                                <p className="font-medium text-slate-700">
                                  {permiso.permiso}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {permiso.descripcion}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarPermisos}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  {t("cancel")}
                </button>

                <button
                  type="button"
                  onClick={guardarPermisos}
                  disabled={loadingPermisos}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                >
                  <Save size={18} />
                  {loadingPermisos ? t("saving") : t("save_permissions")}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}