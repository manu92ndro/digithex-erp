import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";

import {
  showSuccess,
  showError,
  showConfirm
} from "../utils/alerts";

import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Save,
  ImagePlus,
  Upload
} from "lucide-react";

import {
  getMiEmpresa,
  updateMiEmpresa,
  updateLogoMiEmpresa
} from "../api/perfilEmpresa";

import usePermission from "../hooks/usePermission";

const FILES_URL = import.meta.env.VITE_FILES_URL || "http://localhost:3000";

export default function PerfilEmpresa() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [previewLogo, setPreviewLogo] = useState("");

  const [empresa, setEmpresa] = useState({
    nombre_empresa: "",
    email: "",
    telefono: "",
    direccion: "",
    logo: ""
  });

  const getLogoUrl = (logo) => {
    if (!logo) return "";
    return `${FILES_URL}/uploads/logos/${logo}`;
  };

  const cargarEmpresa = async () => {
    try {
      const res = await getMiEmpresa();
      setEmpresa(res.empresa);
      setPreviewLogo(getLogoUrl(res.empresa?.logo));
    } catch (error) {
      console.error("ERROR PERFIL EMPRESA:", error);
    }
  };

  useEffect(() => {
    cargarEmpresa();
  }, []);

  const handleChange = (e) => {
    setEmpresa({
      ...empresa,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setLogoFile(file);
    setPreviewLogo(URL.createObjectURL(file));
  };

  const guardarLogo = async () => {
    if (!logoFile) {
      showSuccess(t("select_logo"));
      return;
    }

    try {
      setLogoLoading(true);

      await updateLogoMiEmpresa(logoFile);

      showSuccess(t("logo_updated"));

      setLogoFile(null);
      await cargarEmpresa();
    } catch (error) {
      console.error("ERROR ACTUALIZANDO LOGO:", error);
      showError(t("logo_update_error"));
    } finally {
      setLogoLoading(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await updateMiEmpresa(empresa);

      showSuccess(t("company_profile_updated"));

      await cargarEmpresa();
    } catch (error) {
      console.error("ERROR ACTUALIZANDO EMPRESA:", error);
      showSuccess(t("company_profile_update_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {t("company_profile")}
          </h1>

          <p className="text-slate-500">
            {t("company_profile_description")}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <div className="bg-slate-900 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                  {previewLogo ? (
                    <img
                      src={previewLogo}
                      alt={empresa.nombre_empresa || t("company")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 size={42} className="text-white/80" />
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold">
                    {empresa.nombre_empresa || t("company")}
                  </h2>

                  <p className="text-slate-300">
                    {empresa.email || t("no_email")}
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    {empresa.telefono || t("no_phone")}
                  </p>
                </div>
              </div>

              {hasPermission("perfil_empresa.editar") && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 cursor-pointer transition">
                    <ImagePlus size={18} />
                    {t("select_logo")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={guardarLogo}
                    disabled={logoLoading || !logoFile}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                  >
                    <Upload size={18} />
                    {logoLoading ? t("saving") : t("upload_logo")}
                  </button>
                </div>
              )}

            </div>
          </div>

          <form
            onSubmit={guardar}
            className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800">
                {t("company_information")}
              </h3>
              <p className="text-sm text-slate-500">
                {t("logo_help")}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("company_name")}
              </label>

              <div className="relative mt-1">
                <Building2
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  name="nombre_empresa"
                  value={empresa.nombre_empresa || ""}
                  onChange={handleChange}
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
                  value={empresa.email || ""}
                  onChange={handleChange}
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("phone")}
              </label>

              <div className="relative mt-1">
                <Phone
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  name="telefono"
                  value={empresa.telefono || ""}
                  onChange={handleChange}
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("address")}
              </label>

              <div className="relative mt-1">
                <MapPin
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  name="direccion"
                  value={empresa.direccion || ""}
                  onChange={handleChange}
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-100">
              {hasPermission("perfil_empresa.editar") && (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                >
                  <Save size={18} />
                  {loading ? t("saving") : t("save_changes")}
                </button>
              )}
            </div>
          </form>

        </div>

      </div>
    </DashboardLayout>
  );
}