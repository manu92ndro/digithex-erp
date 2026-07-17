import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";

import {
  showSuccess,
  showError,
  showConfirm
} from "../utils/alerts";

import {
  UserRound,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Save,
  LockKeyhole,
  Eye,
  EyeOff,
  X,
  CircleCheck,
  ImagePlus,
  Upload
} from "lucide-react";

import {
  getMiPerfil,
  updateMiPerfil,
  cambiarPassword,
  updateFotoMiPerfil
} from "../api/perfilUsuario";

const FILES_URL = import.meta.env.VITE_FILES_URL || "http://localhost:3000";

export default function PerfilUsuario() {
  const { t } = useTranslation();

  const [fotoLoading, setFotoLoading] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [previewFoto, setPreviewFoto] = useState("");

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const getFotoUrl = (foto) => {
    if (!foto) return "";
    return `${FILES_URL}/uploads/usuarios/${foto}`;
  };

  const [perfil, setPerfil] = useState({
    nombres: "",
    email: "",
    celular: "",
    nombre_empresa: "",
    rol: "",
    foto: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    password_actual: "",
    password_nuevo: "",
    password_confirmar: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    actual: false,
    nuevo: false,
    confirmar: false
  });

  const cargarPerfil = async () => {
    try {
      const res = await getMiPerfil();
      setPerfil(res.usuario);
      setPreviewFoto(getFotoUrl(res.usuario?.foto));

    } catch (error) {
      console.error("ERROR PERFIL USUARIO:", error);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const handleChange = (e) => {
    setPerfil({
      ...perfil,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };

  const limpiarPasswordForm = () => {
    setPasswordForm({
      password_actual: "",
      password_nuevo: "",
      password_confirmar: ""
    });

    setShowPasswords({
      actual: false,
      nuevo: false,
      confirmar: false
    });
  };

  const cerrarPasswordModal = () => {
    limpiarPasswordForm();
    setOpenPasswordModal(false);
  };

  const getPasswordStrength = (password) => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        text: t("weak"),
        color: "bg-red-500",
        width: "w-1/4"
      };
    }

    if (score === 2) {
      return {
        text: t("medium"),
        color: "bg-yellow-500",
        width: "w-2/4"
      };
    }

    if (score === 3) {
      return {
        text: t("strong"),
        color: "bg-blue-500",
        width: "w-3/4"
      };
    }

    return {
      text: t("very_strong"),
      color: "bg-green-500",
      width: "w-full"
    };
  };

  const strength = getPasswordStrength(passwordForm.password_nuevo);

  const guardar = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await updateMiPerfil({
        nombres: perfil.nombres,
        celular: perfil.celular
      });

      showSuccess(t("user_profile_updated"));

      await cargarPerfil();
    } catch (error) {
      console.error("ERROR ACTUALIZANDO PERFIL:", error);
      showError(t("user_profile_update_error"));
    } finally {
      setLoading(false);
    }
  };

  const guardarPassword = async (e) => {
    e.preventDefault();

    if (passwordForm.password_nuevo !== passwordForm.password_confirmar) {
      showError(t("passwords_do_not_match"));
      return;
    }

    try {
      setPasswordLoading(true);

      await cambiarPassword(passwordForm);

      limpiarPasswordForm();
      setOpenPasswordModal(false);
      setSuccessMsg(t("password_updated"));

      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (error) {
      console.error("ERROR CAMBIANDO PASSWORD:", error);

      showError(
        error?.response?.data?.message ||
        t("password_update_error")
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFotoChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  setFotoFile(file);
  setPreviewFoto(URL.createObjectURL(file));
};

const guardarFoto = async () => {
  if (!fotoFile) {
    showSuccess(t("select_photo"));
    return;
  }

  try {
    setFotoLoading(true);

    await updateFotoMiPerfil(fotoFile);

    showSuccess(t("photo_updated"));

    setFotoFile(null);
    await cargarPerfil();

  } catch (error) {
    console.error("ERROR ACTUALIZANDO FOTO:", error);
    showError(
      error?.response?.data?.message ||
      t("photo_update_error")
    );
  } finally {
    setFotoLoading(false);
  }
};



  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserRound size={25} className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {t("user_profile")}
              </h1>

              <p className="text-slate-500">
                {t("user_profile_description")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpenPasswordModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition"
          >
            <LockKeyhole size={18} />
            {t("change_password")}
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl p-4 flex items-center gap-2">
            <CircleCheck size={20} />
            {successMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-800">
              {t("personal_information")}
            </h2>
          </div>

          <form
            onSubmit={guardar}
            className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 rounded-2xl p-5">
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold overflow-hidden">
                {previewFoto ? (
                  <img
                    src={previewFoto}
                    alt={perfil.nombres || t("user")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  perfil.nombres?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {perfil.nombres || t("user")}
                </h3>

                <p className="text-slate-500">
                  {perfil.email || t("no_email")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white cursor-pointer transition bg-white">
                    <ImagePlus size={16} />
                    {t("select_photo")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={guardarFoto}
                    disabled={fotoLoading || !fotoFile}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-4 py-2 rounded-xl transition"
                  >
                    <Upload size={16} />
                    {fotoLoading ? t("saving") : t("upload_photo")}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("full_name")}
              </label>

              <div className="relative mt-1">
                <UserRound
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  name="nombres"
                  value={perfil.nombres || ""}
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
                  value={perfil.email || ""}
                  disabled
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-slate-500"
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
                  value={perfil.celular || ""}
                  onChange={handleChange}
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("company")}
              </label>

              <div className="relative mt-1">
                <Building2
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  value={perfil.nombre_empresa || ""}
                  disabled
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("role")}
              </label>

              <div className="relative mt-1">
                <ShieldCheck
                  size={17}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  value={perfil.rol || ""}
                  disabled
                  className="w-full pl-10 border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
              >
                <Save size={18} />
                {loading ? t("saving") : t("save_changes")}
              </button>
            </div>
          </form>
        </div>

        {openPasswordModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <LockKeyhole size={22} className="text-slate-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">
                      {t("change_password")}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {t("change_password_description")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cerrarPasswordModal}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={guardarPassword}
                className="p-6 space-y-4"
              >
                {/* CONTRASEÑA ACTUAL */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("current_password")}
                  </label>

                  <div className="relative mt-1">
                    <input
                      type={showPasswords.actual ? "text" : "password"}
                      name="password_actual"
                      value={passwordForm.password_actual}
                      onChange={handlePasswordChange}
                      placeholder={t("current_password")}
                      className="w-full pr-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          actual: !showPasswords.actual
                        })
                      }
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.actual ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* NUEVA CONTRASEÑA */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("new_password")}
                  </label>

                  <div className="relative mt-1">
                    <input
                      type={showPasswords.nuevo ? "text" : "password"}
                      name="password_nuevo"
                      value={passwordForm.password_nuevo}
                      onChange={handlePasswordChange}
                      placeholder={t("new_password")}
                      className="w-full pr-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          nuevo: !showPasswords.nuevo
                        })
                      }
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.nuevo ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {passwordForm.password_nuevo && (
                    <div className="mt-2">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} ${strength.width}`} />
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {t("password_strength")}: {strength.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* CONFIRMAR CONTRASEÑA */}
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    {t("confirm_password")}
                  </label>

                  <div className="relative mt-1">
                    <input
                      type={showPasswords.confirmar ? "text" : "password"}
                      name="password_confirmar"
                      value={passwordForm.password_confirmar}
                      onChange={handlePasswordChange}
                      placeholder={t("confirm_password")}
                      className="w-full pr-10 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirmar: !showPasswords.confirmar
                        })
                      }
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {passwordForm.password_confirmar && (
                    <p
                      className={`text-xs mt-1 ${
                        passwordForm.password_nuevo === passwordForm.password_confirmar
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {passwordForm.password_nuevo === passwordForm.password_confirmar
                        ? t("passwords_match")
                        : t("passwords_do_not_match")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarPasswordModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition"
                  >
                    <LockKeyhole size={18} />
                    {passwordLoading ? t("saving") : t("change_password")}
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