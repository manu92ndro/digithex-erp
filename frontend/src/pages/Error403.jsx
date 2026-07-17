import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Error403() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
          <ShieldAlert size={42} />
        </div>

        <h1 className="text-5xl font-bold text-slate-800 mb-3">
          403
        </h1>

        <h2 className="text-xl font-bold text-slate-700 mb-2">
          {t("error_403_title")}
        </h2>

        <p className="text-slate-500 mb-6">
          {t("error_403_description")}
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition"
        >
          <ArrowLeft size={18} />
          {t("go_back")}
        </button>
      </div>
    </div>
  );
}