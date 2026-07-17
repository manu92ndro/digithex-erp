import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Eye, EyeOff, LogIn } from "lucide-react";

import { getDefaultRoute } from "../utils/getDefaultRoute";
import { useAuth } from "../context/AuthContext";
import LanguageSelector from "../components/LanguageSelector";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    if (errorMsg) {
      setErrorMsg("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const result = await login(form);

    setLoading(false);

    if (result.ok) {
      setErrorMsg("");
      navigate(getDefaultRoute(result.usuario));
    } else {
      setErrorMsg(result.message || t("login_error"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 flex items-center justify-center relative overflow-hidden">

      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector />
      </div>

      <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-slate-300/40 rounded-full blur-3xl" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10">

        <div className="hidden lg:flex bg-slate-900 text-white p-10 flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={30} />
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              DigiThex ERP
            </h1>

            <p className="text-slate-300 mt-4 leading-relaxed">
              {t("login_side_text")}
            </p>
          </div>

          <div className="text-sm text-slate-400">
            SaaS Multiempresa • Dashboard • Roles • Usuarios
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={30} />
            </div>

            <h2 className="text-3xl font-bold text-slate-800">
              {t("login_title")}
            </h2>

            <p className="text-slate-500 mt-1">
              {t("login_subtitle")}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">
                {t("login_failed")}
              </p>

              <p className="mt-1">
                {errorMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("email")}
              </label>

              <input
                type="email"
                name="email"
                placeholder="correo@email.com"
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                {t("password")}
              </label>

              <div className="relative mt-1">
                <input
                  type={show ? "text" : "password"}
                  name="password"
                  placeholder={t("password_placeholder")}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full p-3 pr-14 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                  title={show ? t("hide") : t("show")}
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-3 rounded-xl transition font-medium"
            >
              <LogIn size={19} />
              {loading ? t("logging_in") : t("login_button")}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}