import { useState } from "react";
import { Menu, LogOut, UserRound, ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FILES_URL = import.meta.env.VITE_FILES_URL || "http://localhost:3000";

export default function Navbar({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);

  const fotoUrl = user?.foto
    ? `${FILES_URL}/uploads/usuarios/${user.foto}`
    : "";

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    setOpenMenu(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 className="font-bold text-lg sm:text-xl text-slate-800" >
            DigiThex ERP
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 hidden sm:block" hidden>
            {t("admin_system")}
          </p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-3 rounded-2xl hover:bg-slate-100 px-3 py-2 transition"
        >
          <div className="hidden sm:block text-right">
            <p className="font-medium text-slate-800 leading-tight">
              {user?.nombres || t("user")}
            </p>

            <p className="text-xs text-slate-500">
              {user?.rol || t("no_role")}
            </p>
          </div>

          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={user?.nombres || t("user")}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserRound size={20} className="text-slate-600" />
            )}
          </div>

          <ChevronDown size={18} className="text-slate-500" />
        </button>

        {openMenu && (
          <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
            <div className="p-4 border-b border-slate-100">
              <p className="font-semibold text-slate-800">
                {user?.nombres || t("user")}
              </p>

              <p className="text-sm text-slate-500">{user?.email}</p>

              <p className="text-xs text-blue-600 font-medium mt-1">
                {user?.rol || t("no_role")}
              </p>
            </div>

            <button
              onClick={() => {
                navigate("/perfil");
                setOpenMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition"
            >
              <UserRound size={18} />
              {t("user_profile")}
            </button>

            <div className="border-t border-slate-100 py-2">
              <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
                <Languages size={15} />
                {t("language")}
              </div>

              <button
                onClick={() => changeLanguage("es")}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                🇪🇸 Español
              </button>

              <button
                onClick={() => changeLanguage("en")}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                🇺🇸 English
              </button>
            </div>

            <div className="border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={18} />
                {t("logout")}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}