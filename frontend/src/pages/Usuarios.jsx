import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";
import Pagination from "../components/Pagination";
import usePermission from "../hooks/usePermission";
import { useAuth } from "../context/AuthContext";

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
  Plus,
  Star,
  Trash2,
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
  const { user } = useAuth();

  const esSuperAdmin =
    String(user?.rol || "")
      .trim()
      .toUpperCase() === "SUPER ADMIN";

  const crearAsignacionInicial = () => ({
    id_empresa:
      esSuperAdmin
        ? ""
        : Number(user?.id_empresa) || "",
    id_rol: "",
    es_principal: 1,
    estado: 1,
  });

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
    nombres: "",
    email: "",
    celular: "",
    password_user: "",
    estado: 1,
    empresas: [crearAsignacionInicial()],
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
      nombres: "",
      email: "",
      celular: "",
      password_user: "",
      estado: 1,
      empresas: [crearAsignacionInicial()],
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

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "estado"
          ? Number(value)
          : value,
    }));
  };

  // ======================================================
  // ASIGNACIONES EMPRESA / ROL
  // ======================================================

  const agregarEmpresa = () => {
    if (!esSuperAdmin) return;

    setForm((prev) => ({
      ...prev,
      empresas: [
        ...prev.empresas,
        {
          id_empresa: "",
          id_rol: "",
          es_principal: 0,
          estado: 1,
        },
      ],
    }));
  };

  const eliminarEmpresa = (index) => {
    setForm((prev) => {
      if (prev.empresas.length <= 1) {
        return prev;
      }

      const nuevas = prev.empresas.filter(
        (_, i) => i !== index
      );

      const existePrincipal = nuevas.some(
        (item) =>
          Number(item.es_principal) === 1
      );

      if (!existePrincipal && nuevas.length > 0) {
        nuevas[0] = {
          ...nuevas[0],
          es_principal: 1,
        };
      }

      return {
        ...prev,
        empresas: nuevas,
      };
    });
  };

  const quitarAccesoEmpresa = async (asignacion, index) => {
    // En "Nuevo usuario" la asignación todavía no existe en BD.
    // Simplemente se elimina de la lista del formulario.
    if (!idUsuario) {
      eliminarEmpresa(index);
      return;
    }

    // La gestión multiempresa queda reservada al SUPER ADMIN.
    // Un administrador normal crea/edita usuarios solo dentro
    // de su empresa activa.
    if (!esSuperAdmin) {
      showError(
        t("users_remove_access_superadmin_only")
      );
      return;
    }

    // Un usuario que ya existe debe conservar al menos
    // una empresa activa. Para bloquear la cuenta completa
    // se usa el Estado del usuario.
    if (form.empresas.length <= 1) {
      showError(
        t("users_cannot_remove_only_company")
      );
      return;
    }

    const confirmado = await showConfirm(
      t("users_remove_access_confirm", {
        company:
          empresas.find(
            (empresa) =>
              Number(empresa.id_empresa) ===
              Number(asignacion.id_empresa)
          )?.nombre_empresa || "",
      })
    );

    if (!confirmado) return;

    // Al guardar, el backend sincroniza empresas[] y deja
    // inactiva la asignación que ya no venga en el payload.
    eliminarEmpresa(index);
  };

  const actualizarEmpresaUsuario = (
    index,
    campo,
    valor
  ) => {
    setForm((prev) => ({
      ...prev,
      empresas: prev.empresas.map(
        (item, i) => {
          if (i !== index) {
            return item;
          }

          if (campo === "id_empresa") {
            return {
              ...item,
              id_empresa:
                valor === ""
                  ? ""
                  : Number(valor),
              id_rol: "",
            };
          }

          if (
            campo === "id_rol" ||
            campo === "estado"
          ) {
            return {
              ...item,
              [campo]:
                valor === ""
                  ? ""
                  : Number(valor),
            };
          }

          return {
            ...item,
            [campo]: valor,
          };
        }
      ),
    }));
  };

  const marcarEmpresaPrincipal = (index) => {
    setForm((prev) => ({
      ...prev,
      empresas: prev.empresas.map(
        (item, i) => ({
          ...item,
          es_principal:
            i === index ? 1 : 0,
        })
      ),
    }));
  };

  const editarUsuario = (u) => {
    setIdUsuario(u.id_usuario);

    let empresasUsuario =
      Array.isArray(u.empresas)
        ? u.empresas.map((empresa) => ({
            id_empresa:
              Number(empresa.id_empresa),
            id_rol:
              Number(empresa.id_rol),
            es_principal:
              Number(empresa.es_principal) === 1
                ? 1
                : 0,
            estado:
              Number(empresa.estado) === 1
                ? 1
                : 0,
          }))
        : [];

    // Compatibilidad temporal con respuestas antiguas.
    if (
      empresasUsuario.length === 0 &&
      u.id_empresa &&
      u.id_rol
    ) {
      empresasUsuario = [
        {
          id_empresa: Number(u.id_empresa),
          id_rol: Number(u.id_rol),
          es_principal: 1,
          estado: 1,
        },
      ];
    }

    if (empresasUsuario.length === 0) {
      empresasUsuario = [
        crearAsignacionInicial(),
      ];
    }

    setForm({
      nombres: u.nombres || "",
      email: u.email || "",
      celular: u.celular || "",
      password_user: "",
      estado:
        Number(u.estado) === 1 ? 1 : 0,
      empresas: empresasUsuario,
    });

    setOpenModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (
        !Array.isArray(form.empresas) ||
        form.empresas.length === 0
      ) {
        showError(
          t("users_company_required")
        );
        return;
      }

      const incompleta = form.empresas.some(
        (item) =>
          !item.id_empresa ||
          !item.id_rol
      );

      if (incompleta) {
        showError(
          t("users_company_role_required")
        );
        return;
      }

      const idsEmpresas = form.empresas.map(
        (item) =>
          Number(item.id_empresa)
      );

      if (
        new Set(idsEmpresas).size !==
        idsEmpresas.length
      ) {
        showError(
          t("users_company_duplicate")
        );
        return;
      }

      const totalPrincipales =
        form.empresas.filter(
          (item) =>
            Number(item.es_principal) === 1
        ).length;

      if (totalPrincipales !== 1) {
        showError(
          t("users_main_company_required")
        );
        return;
      }

      const payload = {
        nombres: form.nombres.trim(),
        email: form.email
          .trim()
          .toLowerCase(),
        celular:
          form.celular?.trim() || "",
        password_user:
          form.password_user,
        estado: Number(form.estado),
        empresas: form.empresas.map(
          (item) => ({
            id_empresa:
              Number(item.id_empresa),
            id_rol:
              Number(item.id_rol),
            es_principal:
              Number(item.es_principal) === 1
                ? 1
                : 0,
            estado:
              Number(item.estado) === 1
                ? 1
                : 0,
          })
        ),
      };

      if (idUsuario) {
        await updateUsuario(
          idUsuario,
          payload
        );
      } else {
        await createUsuario(payload);
      }

      showSuccess(
        idUsuario
          ? t("user_updated_success")
          : t("user_created_success")
      );

      await cargarUsuarios();
      setCurrentPage(1);
      cerrarModal();

    } catch (error) {
      console.error(
        "ERROR AL GUARDAR:",
        error
      );

      showError(
        error?.response?.data?.message ||
        t("user_save_error")
      );
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const empresasTexto =
      Array.isArray(u.empresas)
        ? u.empresas
            .map(
              (item) =>
                `${item.nombre_empresa || ""} ${item.rol || ""}`
            )
            .join(" ")
        : "";

    const texto = `
      ${u.nombres || ""}
      ${u.email || ""}
      ${u.nombre_empresa || ""}
      ${u.rol || ""}
      ${u.celular || ""}
      ${empresasTexto}
    `.toLowerCase();

    return texto.includes(
      busqueda.toLowerCase()
    );
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
                      <div className="flex items-start gap-2 text-slate-700">
                        <Building2
                          size={16}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <div className="min-w-0">
                          <p className="max-w-44 truncate font-medium">
                            {u.nombre_empresa ||
                              t("no_company")}
                          </p>

                          {Number(u.total_empresas) > 1 && (
                            <p className="mt-0.5 text-[11px] text-blue-600">
                              + {Number(u.total_empresas) - 1}{" "}
                              {t("users_more_companies")}
                            </p>
                          )}
                        </div>
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
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">

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
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto"
              >

                {/* ================================================= */}
                {/* NOMBRE */}
                {/* ================================================= */}

                <div>

                  <label className="text-sm font-medium text-slate-600">
                    {t("name")}
                  </label>


                  <div className="relative mt-1">

                    <UserRound
                      size={17}
                      className="
                        absolute
                        left-3
                        top-3
                        text-slate-400
                      "
                    />

                    <input
                      name="nombres"
                      value={form.nombres}
                      onChange={handleChange}
                      placeholder={t("full_name")}
                      className="
                        w-full
                        pl-10
                        border
                        border-slate-200
                        p-2.5
                        rounded-xl
                        outline-none
                        focus:ring-2
                        focus:ring-blue-100
                        focus:border-blue-500
                      "
                      required
                    />

                  </div>

                </div>


                {/* ================================================= */}
                {/* EMAIL */}
                {/* ================================================= */}

                <div>

                  <label className="text-sm font-medium text-slate-600">
                    {t("email")}
                  </label>


                  <div className="relative mt-1">

                    <Mail
                      size={17}
                      className="
                        absolute
                        left-3
                        top-3
                        text-slate-400
                      "
                    />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@email.com"
                      className="
                        w-full
                        pl-10
                        border
                        border-slate-200
                        p-2.5
                        rounded-xl
                        outline-none
                        focus:ring-2
                        focus:ring-blue-100
                        focus:border-blue-500
                      "
                      required
                    />

                  </div>

                </div>


                {/* ================================================= */}
                {/* CELULAR */}
                {/* ================================================= */}

                <div>

                  <label className="text-sm font-medium text-slate-600">
                    {t("cellphone")}
                  </label>


                  <div className="relative mt-1">

                    <Phone
                      size={17}
                      className="
                        absolute
                        left-3
                        top-3
                        text-slate-400
                      "
                    />

                    <input
                      name="celular"
                      value={form.celular}
                      onChange={handleChange}
                      placeholder={t("cellphone")}
                      className="
                        w-full
                        pl-10
                        border
                        border-slate-200
                        p-2.5
                        rounded-xl
                        outline-none
                        focus:ring-2
                        focus:ring-blue-100
                        focus:border-blue-500
                      "
                    />

                  </div>

                </div>


                {/* ================================================= */}
                {/* PASSWORD */}
                {/* ================================================= */}

                <div>

                  <label className="text-sm font-medium text-slate-600">

                    {t("password")}

                    {idUsuario && ` (${t("optional")})`}

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
                    className="
                      mt-1
                      w-full
                      border
                      border-slate-200
                      p-2.5
                      rounded-xl
                      outline-none
                      focus:ring-2
                      focus:ring-blue-100
                      focus:border-blue-500
                    "
                    required={!idUsuario}
                  />

                </div>


                {/* ================================================= */}
                {/* ESTADO */}
                {/* ================================================= */}

                <div>

                  <label className="text-sm font-medium text-slate-600">
                    {t("status")}
                  </label>


                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="
                      mt-1
                      w-full
                      border
                      border-slate-200
                      p-2.5
                      rounded-xl
                      outline-none
                      focus:ring-2
                      focus:ring-blue-100
                      focus:border-blue-500
                    "
                  >

                    <option value={1}>
                      {t("active")}
                    </option>

                    <option value={0}>
                      {t("inactive")}
                    </option>

                  </select>

                </div>


                {/* ================================================= */}
                {/* ACCESO A EMPRESAS */}
                {/* ================================================= */}

                <div className="md:col-span-2 mt-2">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {t("users_company_access")}
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {t(
                          "users_company_access_description"
                        )}
                      </p>
                    </div>

                    {esSuperAdmin && (
                      <button
                        type="button"
                        onClick={agregarEmpresa}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        <Plus size={15} />
                        {t("users_add_company")}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {form.empresas.map(
                      (asignacion, index) => {
                        // ==================================================
                        // ROLES DE LA EMPRESA SELECCIONADA
                        // ==================================================

                        const rolesEmpresa = roles.filter(
                          (rol) => {
                            const pertenece =
                              Number(rol.id_empresa) ===
                              Number(asignacion.id_empresa);

                            const activo =
                              Number(rol.estado) === 1;

                            const actual =
                              Number(rol.id_rol) ===
                              Number(asignacion.id_rol);

                            return (
                              pertenece &&
                              (activo || actual)
                            );
                          }
                        );

                        // ==================================================
                        // EMPRESA SELECCIONADA
                        // ==================================================

                        const empresaSeleccionada =
                          empresas.find(
                            (empresa) =>
                              Number(empresa.id_empresa) ===
                              Number(asignacion.id_empresa)
                          );

                        // Solo el SUPER ADMIN administra altas/bajas
                        // de asignaciones multiempresa.
                        const puedeQuitarAcceso =
                          esSuperAdmin &&
                          Boolean(idUsuario) &&
                          form.empresas.length > 1;

                        return (
                          <div
                            key={`${asignacion.id_empresa || "new"}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            {/* CABECERA DE LA ASIGNACIÓN */}
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                                  <Building2
                                    size={16}
                                    className="text-blue-600"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-700">
                                    {empresaSeleccionada?.nombre_empresa ||
                                      t(
                                        "users_company_assignment",
                                        {
                                          number: index + 1,
                                        }
                                      )}
                                  </p>

                                  {Number(
                                    asignacion.es_principal
                                  ) === 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
                                      <Star
                                        size={11}
                                        fill="currentColor"
                                      />
                                      {t(
                                        "users_main_company"
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* NUEVO: si todavía no se guardó, se elimina del form */}
                              {esSuperAdmin &&
                                !idUsuario &&
                                form.empresas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      eliminarEmpresa(index)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                    title={t(
                                      "users_remove_company"
                                    )}
                                  >
                                    <Trash2 size={14} />
                                    {t(
                                      "users_remove_company"
                                    )}
                                  </button>
                                )}

                              {/* EDITAR: quitar acceso existente */}
                              {puedeQuitarAcceso && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    quitarAccesoEmpresa(
                                      asignacion,
                                      index
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                                  title={t(
                                    "users_remove_access"
                                  )}
                                >
                                  <Trash2 size={14} />
                                  {t(
                                    "users_remove_access"
                                  )}
                                </button>
                              )}
                            </div>

                            {/* EMPRESA + ROL */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium text-slate-600">
                                  {t("company")}
                                </label>

                                <select
                                  value={asignacion.id_empresa}
                                  disabled={!esSuperAdmin}
                                  onChange={(e) =>
                                    actualizarEmpresaUsuario(
                                      index,
                                      "id_empresa",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                  required
                                >
                                  <option value="">
                                    {t("select_company")}
                                  </option>

                                  {empresas.map(
                                    (empresa) => {
                                      const yaUsada =
                                        form.empresas.some(
                                          (item, i) =>
                                            i !== index &&
                                            Number(
                                              item.id_empresa
                                            ) ===
                                              Number(
                                                empresa.id_empresa
                                              )
                                        );

                                      return (
                                        <option
                                          key={
                                            empresa.id_empresa
                                          }
                                          value={
                                            empresa.id_empresa
                                          }
                                          disabled={yaUsada}
                                        >
                                          {empresa.nombre_empresa ||
                                            empresa.nombre}
                                        </option>
                                      );
                                    }
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-slate-600">
                                  {t("role")}
                                </label>

                                <select
                                  value={asignacion.id_rol}
                                  disabled={
                                    !asignacion.id_empresa
                                  }
                                  onChange={(e) =>
                                    actualizarEmpresaUsuario(
                                      index,
                                      "id_rol",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  required
                                >
                                  <option value="">
                                    {!asignacion.id_empresa
                                      ? t(
                                          "select_company_first"
                                        )
                                      : t(
                                          "select_role"
                                        )}
                                  </option>

                                  {rolesEmpresa.map(
                                    (rol) => (
                                      <option
                                        key={rol.id_rol}
                                        value={rol.id_rol}
                                      >
                                        {rol.rol ||
                                          rol.nombre}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* EMPRESA PRINCIPAL: SOLO SUPER ADMIN */}
                            {esSuperAdmin && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    marcarEmpresaPrincipal(
                                      index
                                    )
                                  }
                                  className={`
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-lg
                                    px-3
                                    py-2
                                    text-xs
                                    font-medium
                                    transition
                                    ${
                                      Number(
                                        asignacion.es_principal
                                      ) === 1
                                        ? "bg-amber-100 text-amber-700"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                    }
                                  `}
                                >
                                  <Star
                                    size={14}
                                    fill={
                                      Number(
                                        asignacion.es_principal
                                      ) === 1
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />

                                  {Number(
                                    asignacion.es_principal
                                  ) === 1
                                    ? t(
                                        "users_main_company"
                                      )
                                    : t(
                                        "users_set_main_company"
                                      )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>

                  {/* SOLO SUPER ADMIN PUEDE AGREGAR OTRA EMPRESA */}
                  {esSuperAdmin && (
                    <button
                      type="button"
                      onClick={agregarEmpresa}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
                    >
                      <Plus size={17} />
                      {t(
                        "users_add_another_company"
                      )}
                    </button>
                  )}

                </div>


                {/* ================================================= */}
                {/* BOTONES */}
                {/* ================================================= */}

                <div
                  className="
                    md:col-span-2
                    flex
                    flex-col
                    sm:flex-row
                    justify-end
                    gap-3
                    pt-4
                    border-t
                    border-slate-100
                  "
                >

                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="
                      px-5
                      py-2.5
                      rounded-xl
                      border
                      border-slate-200
                      text-slate-600
                      hover:bg-slate-50
                      transition
                    "
                  >
                    {t("cancel")}
                  </button>


                  {hasPermission(
                    idUsuario
                      ? "usuarios.editar"
                      : "usuarios.crear"
                  ) && (

                    <button
                      type="submit"
                      disabled={loading}
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2
                        bg-blue-600
                        hover:bg-blue-700
                        disabled:opacity-60
                        text-white
                        px-5
                        py-2.5
                        rounded-xl
                        transition
                      "
                    >

                      <Save size={18} />

                      {loading
                        ? t("saving")
                        : idUsuario
                          ? t("update")
                          : t("save")
                      }

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
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-slate-400">
                      {t("users_company_access")}
                    </p>

                    <div className="space-y-2">
                      {Array.isArray(
                        usuarioSeleccionado.empresas
                      ) &&
                      usuarioSeleccionado.empresas.length >
                        0 ? (
                        usuarioSeleccionado.empresas.map(
                          (empresa) => (
                            <div
                              key={
                                empresa.id_usuario_empresa ||
                                `${empresa.id_empresa}-${empresa.id_rol}`
                              }
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-700">
                                  {empresa.nombre_empresa}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {empresa.rol ||
                                    t("no_role")}
                                </p>
                              </div>

                              {Number(
                                empresa.es_principal
                              ) === 1 && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
                                  <Star
                                    size={11}
                                    fill="currentColor"
                                  />
                                  {t(
                                    "users_main_company"
                                  )}
                                </span>
                              )}
                            </div>
                          )
                        )
                      ) : (
                        <p className="font-medium text-slate-700">
                          {usuarioSeleccionado.nombre_empresa ||
                            t("no_company")}
                          {usuarioSeleccionado.rol
                            ? ` · ${usuarioSeleccionado.rol}`
                            : ""}
                        </p>
                      )}
                    </div>
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