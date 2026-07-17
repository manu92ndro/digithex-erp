import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  ClipboardList,
  LayoutDashboard,
  Building,
  Building2,
  Users,
  ShieldCheck,
  UserRound,
  KeyRound,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Truck,
  CalendarDays,
  Trash2,
  Settings
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const FILES_URL = import.meta.env.VITE_FILES_URL || "http://localhost:3000";

const iconMap = {
  LayoutDashboard,
  Building,
  Building2,
  Users,
  ShieldCheck,
  UserRound,
  ClipboardList,
  KeyRound,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Truck,
  CalendarDays,
  Trash2,
  Settings
};

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const logoUrl = user?.logo_empresa
    ? `${FILES_URL}/uploads/logos/${user.logo_empresa}`
    : "";

  const modulos = user?.modulos || [];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 py-3 px-4 rounded-xl transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const getModuleLabel = (modulo) => {
    const key = `menu_${modulo.nombre_modulo
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")}`;

    return t(key, modulo.nombre_modulo);
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shadow">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={user?.nombre_empresa || t("company")}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 size={34} className="text-slate-300" />
            )}
          </div>

          <h2 className="font-bold text-base mt-3 truncate w-full">
            {user?.nombre_empresa || t("system")}
          </h2>
          
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {modulos.map((modulo) => {
          const Icon = iconMap[modulo.icono] || FileText;

          return (
            <NavLink
              key={modulo.id_modulo}
              to={modulo.ruta}
              onClick={onNavigate}
              className={linkClass}
            >
              <Icon size={19} />
              <span className="truncate">{getModuleLabel(modulo)}</span>
            </NavLink>
          );
        })}

        <NavLink to="/perfil" onClick={onNavigate} className={linkClass}>
          <UserRound size={19} />
          <span>{t("user_profile")}</span>
        </NavLink>
      </nav>
    </aside>
  );
}