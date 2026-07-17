import { SearchX, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Error404() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
          <SearchX size={42} />
        </div>

        <h1 className="text-5xl font-bold text-slate-800 mb-3">
          404
        </h1>

        <h2 className="text-xl font-bold text-slate-700 mb-2">
          {t("error_404_title")}
        </h2>

        <p className="text-slate-500 mb-6">
          {t("error_404_description")}
        </p>

        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition"
        >
          <Home size={18} />
          {t("go_home")}
        </button>
      </div>
    </div>
  );
}