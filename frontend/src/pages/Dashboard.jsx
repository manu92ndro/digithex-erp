import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTranslation } from "react-i18next";
import usePermission from "../hooks/usePermission";

import {
  Users,
  Building2,
  ShieldCheck,
  Activity,
  ClipboardList
} from "lucide-react";

import { getDashboard } from "../api/dashboard";

export default function Dashboard() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const [dashboard, setDashboard] = useState({
    total_usuarios: 0,
    total_empresas: 0,
    total_roles: 0,
    usuarios_activos: 0,
    total_logs: 0
  });

  const [loading, setLoading] = useState(false);

  const cargarDashboard = async () => {
    try {
      setLoading(true);

      const res = await getDashboard();

      setDashboard(res.dashboard || {
        total_usuarios: 0,
        total_empresas: 0,
        total_roles: 0,
        usuarios_activos: 0,
        total_logs: 0
      });
    } catch (error) {
      console.error("ERROR DASHBOARD:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const Card = ({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
    valueColor = "text-slate-800"
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h2 className={`text-3xl font-bold mt-2 ${valueColor}`}>
            {loading ? "..." : value}
          </h2>
        </div>

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon size={28} className={iconColor} />
        </div>
      </div>
    </div>
  );

  const tieneAlgunaTarjeta =
    hasPermission("usuarios.ver") ||
    hasPermission("empresas.ver") ||
    hasPermission("roles.ver") ||
    hasPermission("logs.ver");

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          {t("dashboard")}
        </h1>

        <p className="text-slate-500 mt-1">
          {t("overview")}
        </p>
      </div>

      {tieneAlgunaTarjeta ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          {hasPermission("usuarios.ver") && (
            <Card
              title={t("users")}
              value={dashboard.total_usuarios}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
          )}

          {hasPermission("empresas.ver") && (
            <Card
              title={t("companies")}
              value={dashboard.total_empresas}
              icon={Building2}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
            />
          )}

          {hasPermission("roles.ver") && (
            <Card
              title={t("roles")}
              value={dashboard.total_roles}
              icon={ShieldCheck}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          )}

          {hasPermission("usuarios.ver") && (
            <Card
              title={t("active_users")}
              value={dashboard.usuarios_activos}
              icon={Activity}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              valueColor="text-green-600"
            />
          )}

          {hasPermission("logs.ver") && (
            <Card
              title={t("audit")}
              value={dashboard.total_logs || 0}
              icon={ClipboardList}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          )}

        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-slate-500">
          {t("no_dashboard_permissions")}
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          {t("welcome_back")}
        </h2>

        <p className="text-slate-500">
          DigiThex ERP SaaS Multiempresa
        </p>
      </div>
    </DashboardLayout>
  );
}