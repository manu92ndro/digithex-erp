import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layouts/DashboardLayout";
import Pagination from "../components/Pagination";
import {
  ClipboardList,
  Search,
  FilterX,
  FileDown,
  SlidersHorizontal
} from "lucide-react";
import { getLogs, exportLogsExcel } from "../api/logs";

export default function Logs() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtros, setFiltros] = useState({
    usuario: "",
    empresa: "",
    modulo: "",
    accion: "",
    fecha_desde: "",
    fecha_hasta: ""
  });

  const itemsPerPage = 10;

  const cargarLogs = async (filtrosActuales = filtros) => {
    try {
      const res = await getLogs(filtrosActuales);
      setLogs(res.logs || []);
    } catch (error) {
      console.error("ERROR CARGANDO LOGS:", error);
      setLogs([]);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;

    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  const buscarConFiltros = async () => {
    setCurrentPage(1);
    await cargarLogs(filtros);
  };

  const limpiarFiltros = async () => {
    const filtrosLimpios = {
      usuario: "",
      empresa: "",
      modulo: "",
      accion: "",
      fecha_desde: "",
      fecha_hasta: ""
    };

    setFiltros(filtrosLimpios);
    setBusqueda("");
    setCurrentPage(1);
    await cargarLogs(filtrosLimpios);
  };

  const descargarExcel = async () => {
    try {
      const blob = await exportLogsExcel(filtros);

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "auditoria_digitalthex.xlsx");

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ERROR EXPORTANDO LOGS:", error);
    }
  };

  const logsFiltrados = logs.filter((log) => {
    const texto = `
      ${log.usuario || ""}
      ${log.nombre_empresa || ""}
      ${log.modulo || ""}
      ${log.accion || ""}
      ${log.descripcion || ""}
      ${log.ip || ""}
    `.toLowerCase();

    return texto.includes(busqueda.toLowerCase());
  });

  const logsPaginados = logsFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ClipboardList size={24} className="text-indigo-600" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {t("audit")}
            </h1>
            <p className="text-slate-500">
              {t("audit_description")}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <h2 className="font-semibold text-slate-700">
              {t("system_logs")}
            </h2>

            <div className="flex flex-col lg:flex-row gap-2 w-full xl:w-auto">
              <div className="relative w-full lg:w-96">
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-slate-400"
                />

                <input
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("search_logs")}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
              >
                <SlidersHorizontal size={18} />
                {t("advanced_search")}
              </button>

              <button
                type="button"
                onClick={descargarExcel}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition whitespace-nowrap"
              >
                <FileDown size={18} />
                {t("export_excel")}
              </button>
            </div>
          </div>

          {mostrarFiltros && (
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <input
                  name="usuario"
                  value={filtros.usuario}
                  onChange={handleFiltroChange}
                  placeholder={t("user")}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />

                <input
                  name="empresa"
                  value={filtros.empresa}
                  onChange={handleFiltroChange}
                  placeholder={t("company")}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />

                <input
                  name="modulo"
                  value={filtros.modulo}
                  onChange={handleFiltroChange}
                  placeholder={t("module")}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />

                <input
                  name="accion"
                  value={filtros.accion}
                  onChange={handleFiltroChange}
                  placeholder={t("action")}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />

                <input
                  type="date"
                  name="fecha_desde"
                  value={filtros.fecha_desde}
                  onChange={handleFiltroChange}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />

                <input
                  type="date"
                  name="fecha_hasta"
                  value={filtros.fecha_hasta}
                  onChange={handleFiltroChange}
                  className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition"
                >
                  <FilterX size={18} />
                  {t("clear_filters")}
                </button>

                <button
                  type="button"
                  onClick={buscarConFiltros}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  <Search size={18} />
                  {t("search")}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left">{t("date")}</th>
                  <th className="p-4 text-left">{t("user")}</th>
                  <th className="p-4 text-left">{t("company")}</th>
                  <th className="p-4 text-left">{t("module")}</th>
                  <th className="p-4 text-left">{t("action")}</th>
                  <th className="p-4 text-left">{t("description")}</th>
                  <th className="p-4 text-left">IP</th>
                </tr>
              </thead>

              <tbody>
                {logsPaginados.map((log) => (
                  <tr
                    key={log.id_log}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {log.fyh_creacion}
                    </td>

                    <td className="p-4 font-medium text-slate-800">
                      {log.usuario || "-"}
                    </td>

                    <td className="p-4 text-slate-600">
                      {log.nombre_empresa || "-"}
                    </td>

                    <td className="p-4 text-slate-600">
                      {log.modulo}
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                        {log.accion}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600">
                      {log.descripcion || "-"}
                    </td>

                    <td className="p-4 text-slate-500">
                      {log.ip || "-"}
                    </td>
                  </tr>
                ))}

                {logsFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-400"
                    >
                      {t("no_logs")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={logsFiltrados.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}