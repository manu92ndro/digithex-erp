import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LocationPickerModal from "../components/LocationPickerModal";

import {
  CalendarDays,
  DollarSign,
  MapPin,
  Search,
  X,
  UserPlus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  PlusCircle,
  Check,
  CreditCard,
  History,
  Truck,
  Package,
  FileText,
  ClipboardList,
  RotateCcw,
  Ban,
  Send,
  Printer,
  Trash2,
  Save,
  AlertTriangle,
  ReceiptText,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import usePermission from "../hooks/usePermission";
import {
  getRentasFormData,
  getRentas,
  createRenta,
  getRentaDetalle,
  addExtraRenta,
  finalizarRenta,
  registrarPagoRenta,
  actualizarFechaRetiro,
  cancelarRenta,
  eliminarExtraRenta,
} from "../api/rentas";

import { createCliente } from "../api/clientes";
import { showSuccess, showError } from "../utils/alerts";
import { abrirReciboRenta, enviarReciboCorreo } from "../api/recibos";


const formatFecha = (fecha) => {
  if (!fecha) return "-";

  const soloFecha = String(fecha).split("T")[0];
  const date = new Date(`${soloFecha}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFechaBase = (fecha) => {
  if (!fecha) return null;

  let f;

  if (fecha instanceof Date) {
    f = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  } else {
    const soloFecha = String(fecha).split("T")[0];
    const [year, month, day] = soloFecha.split("-").map(Number);
    f = new Date(year, month - 1, day);
  }

  f.setHours(0, 0, 0, 0);
  return f;
};

const calcularFechaFin = (fechaInicio, dias) => {
  if (!fechaInicio || !dias) return "";

  const fecha = new Date(`${fechaInicio}T00:00:00`);
  fecha.setDate(fecha.getDate() + Number(dias));

  return fecha.toISOString().split("T")[0];
};

const getDiasDiferencia = (fechaA, fechaB) => {
  if (!fechaA || !fechaB) return 0;
  return Math.ceil((fechaA - fechaB) / (1000 * 60 * 60 * 24));
};

const getEstadoVisual = (renta) => {
  const hoy = getFechaBase(new Date());
  const inicio = getFechaBase(renta.fecha_inicio);
  const retiro = getFechaBase(renta.fecha_estimada_devolucion);

  const diasParaInicio = Math.ceil((inicio - hoy) / 86400000);
  const diasParaRetiro = Math.ceil((retiro - hoy) / 86400000);

  if (diasParaRetiro < 0) {
    return {
      label: "Retirar",
      subtitle: "Fecha de retiro vencida",
      border: "border-slate-300",
      header: "bg-slate-100",
      badge: "bg-slate-700 text-white",
      progress: "bg-slate-500",
      button: "bg-slate-700 hover:bg-slate-800",
      dateStart: "bg-slate-700",
      dateEnd: "bg-slate-700",
    };
  }

  if (diasParaRetiro === 0) {
    return {
      label: "Retirar hoy",
      subtitle: "Hoy debe retirarse",
      border: "border-red-300",
      header: "bg-red-50",
      badge: "bg-red-100 text-red-700",
      progress: "bg-red-500",
      button: "bg-red-600 hover:bg-red-700",
      dateStart: "bg-red-600",
      dateEnd: "bg-red-600",
    };
  }

  if (diasParaRetiro === 1) {
    return {
      label: "Próximo retiro",
      subtitle: "Retiro mañana",
      border: "border-orange-300",
      header: "bg-orange-50",
      badge: "bg-orange-100 text-orange-700",
      progress: "bg-orange-500",
      button: "bg-orange-500 hover:bg-orange-600",
      dateStart: "bg-orange-500",
      dateEnd: "bg-orange-500",
    };
  }

  if (diasParaInicio === 1) {
    return {
      label: "Entrega mañana",
      subtitle: "Preparar entrega",
      border: "border-yellow-300",
      header: "bg-yellow-50",
      badge: "bg-yellow-100 text-yellow-700",
      progress: "bg-yellow-500",
      button: "bg-yellow-500 hover:bg-yellow-600",
      dateStart: "bg-yellow-500",
      dateEnd: "bg-yellow-500",
    };
  }

  if (diasParaInicio === 0) {
    return {
      label: "En entrega",
      subtitle: "Entrega hoy",
      border: "border-indigo-300",
      header: "bg-indigo-50",
      badge: "bg-indigo-100 text-indigo-700",
      progress: "bg-indigo-500",
      button: "bg-indigo-600 hover:bg-indigo-700",
      dateStart: "bg-indigo-500",
      dateEnd: "bg-indigo-500",
    };
  }

  if (diasParaInicio < 0) {
    return {
      label: "En uso",
      subtitle: "Dumpster con cliente",
      border: "border-green-300",
      header: "bg-green-50",
      badge: "bg-green-100 text-green-700",
      progress: "bg-green-500",
      button: "bg-green-600 hover:bg-green-700",
      dateStart: "bg-green-600",
      dateEnd: "bg-red-600",
    };
  }

  return {
    label: "Programada",
    subtitle: "Pendiente de entrega",
    border: "border-sky-300",
    header: "bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    progress: "bg-sky-500",
    button: "bg-sky-600 hover:bg-sky-700",
    dateStart: "bg-sky-500",
    dateEnd: "bg-sky-500",
  };
};

const getProgresoRenta = (renta) => {
  const hoy = getFechaBase(new Date());
  const inicio = getFechaBase(renta.fecha_inicio);
  const retiro = getFechaBase(renta.fecha_estimada_devolucion);

  const total = retiro - inicio;
  const avance = hoy - inicio;

  if (!total || total <= 0) return 100;
  if (avance <= 0) return 5;
  if (avance >= total) return 100;

  return Math.round((avance / total) * 100);
};

const initialForm = {
  id_cliente: "",
  id_dumpster: "",
  tamano_yardas: "",
  id_camion: "",
  id_material: "",
  id_ubicacion: "",
  fecha_inicio: "",
  dias_renta: "",
  fecha_estimada_devolucion: "",
  direccion_entrega: "",
  latitud: "",
  longitud: "",
  observaciones: "",
  aplica_tax_base: false,
  estado_pago: "pending",
  monto_abonado: "",
  tipo_pago: "",
};

const initialCliente = {
  nombres: "",
  celular: "",
  correo: "",
  direccion: "",
};

const initialExtra = {
  tipo_extra: "",
  descripcion: "",
  monto: "",
  aplica_tax: false,
};

function Rentas() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();

  const canCreateRenta = hasPermission("rentas.crear");
  const canEditRenta = hasPermission("rentas.editar");
  const canCancelRenta = hasPermission("rentas.eliminar");
  const canFinishRenta = hasPermission("rentas.finalizar");
  const canCreateCliente = hasPermission("clientes.crear");

  const [tabActiva, setTabActiva] = useState("operacion");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [dumpsters, setDumpsters] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [impuesto, setImpuesto] = useState(null);
  const [rentas, setRentas] = useState([]);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [modalCliente, setModalCliente] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);

  const [nuevoCliente, setNuevoCliente] = useState(initialCliente);
  const [form, setForm] = useState(initialForm);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [rentaDetalle, setRentaDetalle] = useState(null);
  const [extrasDetalle, setExtrasDetalle] = useState([]);
  const [pagosDetalle, setPagosDetalle] = useState([]);
  const [extraForm, setExtraForm] = useState(initialExtra);
  const [tabDetalle, setTabDetalle] = useState("resumen");

  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const [pagoForm, setPagoForm] = useState({
    monto_abonado: "",
    tipo_pago: "cash",
    observaciones: "",
    aplicar_tax_pago: false,
  });

  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const itemsPorPaginaHistorial = 8;

  const [fechasRentaForm, setFechasRentaForm] = useState({
    fecha_inicio: "",
    fecha_estimada_devolucion: "",
  });

  const [filtroOperacion, setFiltroOperacion] = useState("todos");
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState([]);

  const [guardandoExtra, setGuardandoExtra] = useState(false);
  const [eliminandoExtraId, setEliminandoExtraId] = useState(null);
  const [modalMapa, setModalMapa] = useState(false);


  const normalizarTaxRate = (valor) => {
    const n = Number(valor || 0);
    return n > 1 ? n / 100 : n;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const [formData, rentasData] = await Promise.all([
        getRentasFormData(),
        getRentas(),
      ]);

      setClientes(formData.clientes || []);
      setDumpsters(formData.dumpsters || []);
      setCamiones(formData.camiones || []);
      setMateriales(formData.materiales || []);
      setUbicaciones(formData.ubicaciones || []);
      setImpuesto(formData.impuesto || null);
      setRentas(rentasData.rentas || []);
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_loading_data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (tabActiva === "nueva" && !canCreateRenta) {
      setTabActiva("operacion");
    }

    if (tabActiva === "pagos" && !canEditRenta) {
      setTabActiva("operacion");
    }
  }, [tabActiva, canCreateRenta, canEditRenta]);

  useEffect(() => {
    setPaginaHistorial(1);
  }, [busquedaHistorial]);

  const clienteSeleccionado = clientes.find(
    (c) => String(c.id_cliente) === String(form.id_cliente)
  );

  const dumpsterSeleccionado = dumpsters.find(
    (d) => String(d.id_dumpster) === String(form.id_dumpster)
  );

  const camionSeleccionado = camiones.find(
    (c) => String(c.id_camion) === String(form.id_camion)
  );

  const materialSeleccionado = materiales.find(
    (m) => String(m.id_material) === String(form.id_material)
  );

  const ubicacionSeleccionada = ubicaciones.find(
    (u) => String(u.id_ubicacion) === String(form.id_ubicacion)
  );

  const rentaBloqueada =
    rentaDetalle?.estado === "finalizado" ||
    rentaDetalle?.estado === "cancelado";

  const precioBase = Number(dumpsterSeleccionado?.precio_base || 0);
  const taxRate = normalizarTaxRate(impuesto?.tax_rate);
  const taxAmount = form.aplica_tax_base ? precioBase * taxRate : 0;
  const totalFinal = precioBase + taxAmount;

  const montoAbonado =
    form.estado_pago === "paid"
      ? totalFinal
      : form.estado_pago === "partial"
      ? Number(form.monto_abonado || 0)
      : 0;

  

  const saldoActualDetalle = Number(rentaDetalle?.saldo_pendiente || 0);
  const totalPagadoDetalle = Number(rentaDetalle?.total_pagado || 0);

  const taxRateDetalle = normalizarTaxRate(
    rentaDetalle?.tax_rate ?? impuesto?.tax_rate
  );

  const taxPorcentajeDetalle = taxRateDetalle * 100;

  const pagosVisibles = pagosDetalle.filter(
    (p) => Number(p.monto_abonado || 0) > 0
  );

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente.toLowerCase().trim();

    if (!texto) return clientes.slice(0, 8);

    return clientes
      .filter(
        (c) =>
          c.nombres?.toLowerCase().includes(texto) ||
          c.celular?.toLowerCase().includes(texto) ||
          c.correo?.toLowerCase().includes(texto)
      )
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  const dumpstersFiltrados = useMemo(() => {
    if (!form.tamano_yardas) return dumpsters;

    return dumpsters.filter(
      (d) => Number(d.tamano_yardas) === Number(form.tamano_yardas)
    );
  }, [dumpsters, form.tamano_yardas]);

  const rentasOperacion = useMemo(
    () =>
      rentas.filter(
        (r) => r.estado !== "finalizado" && r.estado !== "cancelado"
      ),
    [rentas]
  );

  const rentasOperacionFiltradas = useMemo(() => {
    if (filtroOperacion === "todos") return rentasOperacion;

    return rentasOperacion.filter((renta) => {
      const estado = getEstadoVisual(renta).label;

      if (filtroOperacion === "uso") return estado === "En uso";

      if (filtroOperacion === "retirar") {
        return estado === "Retirar" || estado === "Retirar hoy";
      }

      if (filtroOperacion === "entregar") {
        return (
          estado === "Programada" ||
          estado === "Entrega mañana" ||
          estado === "En entrega"
        );
      }

      if (filtroOperacion === "pagos") {
        return Number(renta.saldo_pendiente || 0) > 0;
      }

      return true;
    });
  }, [rentasOperacion, filtroOperacion]);

  const rentasPagosPendientes = useMemo(
    () =>
      rentas.filter(
        (r) =>
          r.estado !== "cancelado" &&
          r.estado !== "finalizado" &&
          Number(r.saldo_pendiente || 0) > 0
      ),
    [rentas]
  );

  const rentasHistorialBase = useMemo(
    () =>
      rentas.filter(
        (r) => r.estado === "finalizado" || r.estado === "cancelado"
      ),
    [rentas]
  );

  const rentasHistorialFiltradas = useMemo(() => {
    const texto = busquedaHistorial.toLowerCase().trim();

    if (!texto) return rentasHistorialBase;

    return rentasHistorialBase.filter((r) => {
      return (
        String(r.id_renta || "").includes(texto) ||
        r.cliente?.toLowerCase().includes(texto) ||
        r.dumpster_codigo?.toLowerCase().includes(texto) ||
        r.direccion_entrega?.toLowerCase().includes(texto) ||
        r.estado?.toLowerCase().includes(texto)
      );
    });
  }, [rentasHistorialBase, busquedaHistorial]);

  const totalPaginasHistorial = Math.ceil(
    rentasHistorialFiltradas.length / itemsPorPaginaHistorial
  );

  const rentasHistorial = useMemo(() => {
    const inicio = (paginaHistorial - 1) * itemsPorPaginaHistorial;
    return rentasHistorialFiltradas.slice(
      inicio,
      inicio + itemsPorPaginaHistorial
    );
  }, [rentasHistorialFiltradas, paginaHistorial]);

  const rentasPorTamano = useMemo(() => {
    return rentasOperacionFiltradas.reduce((acc, renta) => {
      const tamano = renta.tamano_yardas || "Sin tamaño";
      if (!acc[tamano]) acc[tamano] = [];
      acc[tamano].push(renta);
      return acc;
    }, {});
  }, [rentasOperacionFiltradas]);

  const totalRetiroHoy = rentasOperacion.filter((r) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const retiro = getFechaBase(r.fecha_estimada_devolucion);
    return retiro && retiro <= hoy;
  }).length;

  const totalEnUso = rentasOperacion.filter(
    (r) => getEstadoVisual(r).label === "En uso"
  ).length;
 


 


  const fechaOriginalInicio =
    rentaDetalle?.fecha_inicio?.split("T")[0] || "";

  const fechaOriginalRetiro =
    rentaDetalle?.fecha_estimada_devolucion?.split("T")[0] || "";

  const fechaCambioActiva =
    fechasRentaForm.fecha_inicio &&
    fechasRentaForm.fecha_estimada_devolucion &&
    (fechasRentaForm.fecha_inicio !== fechaOriginalInicio ||
      fechasRentaForm.fecha_estimada_devolucion !== fechaOriginalRetiro);

  const toggleGrupo = (tamano) => {
    setGruposAbiertos((prev) => ({
      ...prev,
      [tamano]: !prev[tamano],
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let nextForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "fecha_inicio" || name === "dias_renta") {
      const fechaInicio = name === "fecha_inicio" ? value : form.fecha_inicio;
      const dias = name === "dias_renta" ? value : form.dias_renta;
      nextForm.fecha_estimada_devolucion = calcularFechaFin(fechaInicio, dias);
    }

    if (name === "id_dumpster") {
      const d = dumpsters.find((x) => String(x.id_dumpster) === String(value));

      if (d) {
        nextForm.tamano_yardas = String(d.tamano_yardas);

        if (!form.dias_renta) {
          nextForm.dias_renta = String(d.max_dias || "");
          nextForm.fecha_estimada_devolucion = calcularFechaFin(
            form.fecha_inicio,
            d.max_dias
          );
        }
      }
    }

    if (name === "estado_pago") {
      if (value === "pending") {
        nextForm.tipo_pago = "";
        nextForm.monto_abonado = "";
      }

      if (value === "paid") {
        nextForm.monto_abonado = "";
        if (!nextForm.tipo_pago) nextForm.tipo_pago = "cash";
      }

      if (value === "partial") {
        if (!nextForm.tipo_pago) nextForm.tipo_pago = "cash";
      }
    }

    setForm(nextForm);
  };

  const seleccionarCliente = (cliente) => {
    setForm((prev) => ({ ...prev, id_cliente: cliente.id_cliente }));
    setBusquedaCliente(cliente.nombres);
  };

  const limpiarFormulario = () => {
    setForm(initialForm);
    setBusquedaCliente("");
  };

  const validarFormulario = () => {
    if (!form.id_cliente) return t("rentals.select_client_error");
    if (!form.id_dumpster) return t("rentals.select_available_dumpster_error");
    if (!form.id_camion) return t("rentals.select_truck_error");
    if (!form.id_material) return t("rentals.select_material_error");
    if (!form.id_ubicacion) return t("rentals.select_location_type_error");
    if (!form.fecha_inicio) return t("rentals.select_start_date_error");
    if (!form.dias_renta) return t("rentals.enter_rental_days_error");
    if (!form.direccion_entrega) return t("rentals.enter_delivery_address_error");

    if (form.estado_pago !== "pending" && !form.tipo_pago) {
      return t("rentals.select_payment_method_error");
    }

    if (form.estado_pago === "partial" && Number(form.monto_abonado || 0) <= 0) {
      return t("rentals.enter_amount_paid_error");
    }

    return null;
  };

  const abrirConfirmacion = (e) => {
    e.preventDefault();

    if (!canCreateRenta) {
      showError(t("rentals.no_permission_create"));
      return;
    }

    const error = validarFormulario();
    if (error) {
      showError(error);
      return;
    }

    setModalConfirmar(true);
  };

  const confirmarCrearRenta = async () => {
    try {
      setGuardando(true);

      const payload = {
        ...form,
        precio_base: precioBase,
        aplica_tax_base: Boolean(form.aplica_tax_base),
        estado_pago: form.estado_pago,
        monto_abonado: Number(totalCobroInicial.toFixed(2)),
        tipo_pago: form.tipo_pago || null,
      };

      await createRenta(payload);

      showSuccess(t("rentals.rental_created"));
      setModalConfirmar(false);
      limpiarFormulario();
      await cargarDatos();
      setTabActiva("operacion");
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_create_rental"));
    } finally {
      setGuardando(false);
    }
  };

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();

    if (!canCreateCliente) {
      showError(t("clients_no_permission_create"));
      return;
    }

    try {
      const data = await createCliente(nuevoCliente);
      showSuccess(t("client_created"));

      setModalCliente(false);
      setNuevoCliente(initialCliente);
      await cargarDatos();

      if (data.id_cliente) {
        setForm((prev) => ({
          ...prev,
          id_cliente: data.id_cliente,
        }));
        setBusquedaCliente(nuevoCliente.nombres);
      }
    } catch (error) {
      showError(error.response?.data?.msg || t("client_save_error"));
    }
  };

  const abrirDetalleRenta = async (id) => {
    try {
      const data = await getRentaDetalle(id);

      setTabDetalle("resumen");
      setRentaDetalle(data.renta);
      setExtrasDetalle(data.extras || []);
      setPagosDetalle(data.pagos || []);
      setConceptosSeleccionados([]);

      setFechasRentaForm({
        fecha_inicio: data.renta?.fecha_inicio?.split("T")[0] || "",
        fecha_estimada_devolucion:
          data.renta?.fecha_estimada_devolucion?.split("T")[0] || "",
      });

      setModalDetalle(true);
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_load_detail"));
    }
  };

  const guardarExtra = async (e) => {
    e.preventDefault();

    if (guardandoExtra) return;
    if (!rentaDetalle?.id_renta) return;

    if (!canEditRenta) {
      showError(t("rentals.no_permission_edit"));
      return;
    }

    if (rentaBloqueada) {
      showError(t("rentals.closed_no_extra"));
      return;
    }

    if (!extraForm.tipo_extra) {
      showError(t("rentals.select_charge_type"));
      return;
    }

    if (Number(extraForm.monto || 0) <= 0) {
      showError(t("rentals.charge_amount_greater_zero"));
      return;
    }

    try {
      setGuardandoExtra(true);

      await addExtraRenta(rentaDetalle.id_renta, {
        ...extraForm,
        aplica_tax: false,
      });

      showSuccess(t("rentals.extra_added"));

      setExtraForm(initialExtra);
      await abrirDetalleRenta(rentaDetalle.id_renta);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_add_extra"));
    } finally {
      setGuardandoExtra(false);
    }
  };

  const registrarPago = async (e) => {
    e.preventDefault();

    if (!canEditRenta) {
      showError(t("rentals.no_permission_register_payments"));
      return;
    }

    if (rentaBloqueada) {
      showError(t("rentals.closed_no_payments"));
      return;
    }

    if (conceptosSeleccionados.length === 0) {
      showError(t("rentals.select_concept_to_pay"));
      return;
    }

    if (!pagoForm.tipo_pago) {
      showError(t("rentals.select_payment_method_error"));
      return;
    }

    if (Number(totalSeleccionadoPago || 0) <= 0) {
      showError(t("rentals.selected_amount_greater_zero"));
      return;
    }

    if (Number(totalSeleccionadoPago || 0) > Number(saldoActualDetalle || 0)) {
      showError(
        `No puedes cobrar $${Number(totalSeleccionadoPago).toFixed(
          2
        )} porque el saldo pendiente es $${Number(saldoActualDetalle).toFixed(2)}`
      );
      return;
    }

    try {
      const montoBasePago = Number(totalSeleccionadoPago || 0);

      const taxPagoCalculado = pagoForm.aplicar_tax_pago
        ? Number((totalSeleccionadoPago * taxRateDetalle).toFixed(2))
        : 0;

      const totalCobrado = Number(
        (totalSeleccionadoPago + taxPagoCalculado).toFixed(2)
      );

      const conceptos = conceptosPago
        .filter((item) => conceptosSeleccionados.includes(item.id))
        .map((item) => ({
          tipo: item.tipo,
          id_extra: item.id_extra || null,
          numero_extra: item.numero_extra || null,
          descripcion: item.descripcion,
          total: Number(item.total || 0),
        }));

      const payload = {
        tipo_pago: pagoForm.tipo_pago,
        monto_abonado: totalCobrado,
        tax_pago: taxPagoCalculado,
        aplicar_tax_pago: pagoForm.aplicar_tax_pago,
        conceptos,
        observaciones:
          pagoForm.observaciones ||
          `Pago registrado por $${totalCobrado.toFixed(2)}`,
      };

      await registrarPagoRenta(rentaDetalle.id_renta, payload);

      showSuccess(t("rentals.payment_registered"));

      setPagoForm({
        monto_abonado: "",
        tipo_pago: "cash",
        observaciones: "",
        aplicar_tax_pago: false,
      });

      setConceptosSeleccionados([]);

      await abrirDetalleRenta(rentaDetalle.id_renta);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_register_payment"));
    }
  };

  const guardarFechasRenta = async (e) => {
    e.preventDefault();

    if (!canEditRenta) {
      showError(t("rentals.no_permission_reschedule"));
      return;
    }

    if (rentaBloqueada) {
      showError(t("rentals.closed_no_reschedule"));
      return;
    }

    if (!fechasRentaForm.fecha_inicio || !fechasRentaForm.fecha_estimada_devolucion) {
      showError(t("rentals.select_start_return_dates"));
      return;
    }

    if (fechasRentaForm.fecha_estimada_devolucion < fechasRentaForm.fecha_inicio) {
      showError(t("rentals.return_date_before_start"));
      return;
    }

    try {
      await actualizarFechaRetiro(rentaDetalle.id_renta, {
        fecha_inicio: fechasRentaForm.fecha_inicio,
        fecha_estimada_devolucion: fechasRentaForm.fecha_estimada_devolucion,
      });

      showSuccess(t("rentals.rental_dates_updated"));

      await abrirDetalleRenta(rentaDetalle.id_renta);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_update_dates"));
    }
  };

  const cancelarRentaActual = async () => {
    if (!canCancelRenta) {
      showError(t("rentals.no_permission_cancel"));
      return;
    }

    const motivo = window.prompt(t("rentals.cancellation_reason_prompt"));

    if (!motivo || !motivo.trim()) {
      showError(t("rentals.cancellation_reason_required"));
      return;
    }

    const confirmar = window.confirm(
      t("rentals.confirm_cancel_rental")
    );

    if (!confirmar) return;

    try {
      await cancelarRenta(rentaDetalle.id_renta, {
        motivo_cancelacion: motivo.trim(),
      });

      showSuccess(t("rentals.rental_cancelled"));
      setModalDetalle(false);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_cancel_rental"));
    }
  };

  const finalizarRentaActual = async () => {
    if (!canFinishRenta) {
      showError(t("rentals.no_permission_finish"));
      return;
    }

    if (!rentaDetalle?.id_renta) return;

    const confirmar = window.confirm(
      t("rentals.confirm_finish_rental")
    );

    if (!confirmar) return;

    try {
      await finalizarRenta(rentaDetalle.id_renta);
      showSuccess(t("rentals.rental_finished"));

      setModalDetalle(false);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_finish_rental"));
    }
  };

  const enviarChoferWhatsapp = () => {
    if (!rentaDetalle) return;

    const mapUrl =
      rentaDetalle.latitud && rentaDetalle.longitud
        ? `https://www.google.com/maps?q=${rentaDetalle.latitud},${rentaDetalle.longitud}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            rentaDetalle.direccion_entrega || ""
          )}`;

    const mensaje = `
  Renta Dumpster

  Dumpster: ${rentaDetalle.dumpster_codigo || "-"}
  Tamaño: ${rentaDetalle.tamano_yardas || "-"} Yard
  Cliente: ${rentaDetalle.cliente || "-"}
  Celular: ${rentaDetalle.celular || "-"}
  Dirección: ${rentaDetalle.direccion_entrega || "-"}
  Mapa: ${mapUrl}
  Ubicación: ${rentaDetalle.ubicacion || "-"}
  Camión: ${rentaDetalle.nombre_camion || "-"}
  Inicio: ${formatFecha(rentaDetalle.fecha_inicio)}
  Retiro: ${formatFecha(rentaDetalle.fecha_estimada_devolucion)}
  `;

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  };  

  const extrasPendientes =
    saldoActualDetalle <= 0
      ? []
      : extrasDetalle.filter((extra) => {
          const estado = String(extra.estado_pago || "").toLowerCase();
          return estado === "pendiente";
        });

  const totalPagadoReal = pagosVisibles.reduce(
    (sum, pago) => sum + Number(pago.monto_abonado || 0),
    0
  );     
  

  const totalExtrasPendientes = extrasPendientes.reduce(
    (sum, extra) => sum + Number(extra.monto || 0),
    0
  );

  const saldoRentaPendiente = Math.max(
    Number(saldoActualDetalle || 0) - totalExtrasPendientes,
    0
  );

  const conceptosPago =
    saldoActualDetalle <= 0
      ? []
      : [
          ...(saldoRentaPendiente > 0
            ? [
                {
                  id: `renta-${rentaDetalle?.id_renta}`,
                  tipo: "renta",
                  descripcion: "Saldo pendiente de renta",
                  detalle: "Pago parcial o saldo pendiente",
                  total: saldoRentaPendiente,
                },
              ]
            : []),
          ...extrasPendientes.map((extra, index) => ({
            id: `extra-${extra.id_extra}`,
            tipo: "extra",
            id_extra: extra.id_extra,
            estado_pago: extra.estado_pago,
            numero_extra: index + 1,
            descripcion: extra.descripcion || extra.tipo_extra || "Cargo extra",
            detalle: `Extra #${index + 1} pendiente`,
            total: Number(extra.monto || 0),
          })),
        ].filter((item) => Number(item.total || 0) > 0);

  const totalSeleccionadoPago = conceptosPago
    .filter((item) => conceptosSeleccionados.includes(item.id))
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const toggleConceptoPago = (id) => {
    setConceptosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

 
  const totalExtrasPagados = extrasDetalle
    .filter((extra) => String(extra.estado_pago || "").toLowerCase() === "pagado")
    .reduce(
      (sum, extra) => sum + Number(extra.monto || 0),
      0
    );

  const estadoVisualDetalle = rentaDetalle ? getEstadoVisual(rentaDetalle) : null;

  const fechaInicioDetalle = getFechaBase(
    rentaDetalle?.fecha_inicio || fechasRentaForm.fecha_inicio
  );

  const hoyDetalle = getFechaBase(new Date());

  const bloquearFechaInicio =
    Boolean(fechaInicioDetalle && hoyDetalle && fechaInicioDetalle <= hoyDetalle) ||
    [
      "En entrega",
      "En uso",
      "Retirar",
      "Retirar hoy",
      "Próximo retiro",
    ].includes(estadoVisualDetalle?.label);

  const mostrarPagoInicial = form.estado_pago !== "pending";

  const montoPagoInicial =
    form.estado_pago === "paid"
      ? precioBase
      : form.estado_pago === "partial"
      ? Number(form.monto_abonado || 0)
      : 0;

  const taxPagoInicial =
    mostrarPagoInicial && form.aplica_tax_base
      ? montoPagoInicial * taxRate
      : 0;

  const totalCobroInicial = montoPagoInicial + taxPagoInicial;

  const saldoPendiente = Math.max(
    precioBase - montoPagoInicial,
    0
  );  

  const totalTaxPagado = pagosVisibles.reduce(
    (sum, pago) => sum + Number(pago.tax_pago || 0),
    0
  );

  const taxPagoSeleccionado = pagoForm.aplicar_tax_pago
    ? Number((totalSeleccionadoPago * taxRateDetalle).toFixed(2))
    : 0;

  const totalCobroSeleccionado = Number(
    (totalSeleccionadoPago + taxPagoSeleccionado).toFixed(2)
  );

  const eliminarExtra = async (extra) => {
    if (!canEditRenta) {
      showError(t("rentals.no_permission_edit"));
      return;
    }

    if (rentaBloqueada) {
      showError(t("rentals.closed_no_modify_charges"));
      return;
    }

    if (String(extra.estado_pago || "").toLowerCase() !== "pendiente") {
      showError(t("rentals.only_pending_extras_cancel"));
      return;
    }

    const confirmar = window.confirm(
      t("rentals.confirm_cancel_extra")
    );

    if (!confirmar) return;

    try {
      setEliminandoExtraId(extra.id_extra);

      await eliminarExtraRenta(extra.id_extra);

      showSuccess(t("rentals.extra_cancelled"));

      await abrirDetalleRenta(rentaDetalle.id_renta);
      await cargarDatos();
    } catch (error) {
      showError(error.response?.data?.msg || t("rentals.error_cancel_extra"));
    } finally {
      setEliminandoExtraId(null);
    }
  };

  const verRecibo = async () => {
    try {
      if (!rentaDetalle?.id_renta) return;
      await abrirReciboRenta(rentaDetalle.id_renta);
    } catch (error) {
      showError(error.message || t("rentals.error_open_receipt"));
    }
  };

  const enviarReciboEmail = async (renta) => {
    try {
      const correo = window.prompt(
        "Correo para enviar el recibo:",
        renta.correo || ""
      );

      if (!correo) return;

      const data = await enviarReciboCorreo(
        renta.id_renta,
        correo
      );

      showSuccess(data.msg);
    } catch (error) {
      showError(
        error.response?.data?.msg ||
        error.message ||
        "Error enviando correo"
      );
    }
  };

 

  return (
    <DashboardLayout>
      <div className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck size={24} /> {t("rentals.title")}</h1>
            <p className="text-slate-500">
              {t("rentals.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["operacion", t("rentals.active_operation"), ClipboardList, true],
              ["nueva", t("rentals.new_rental"), PlusCircle, canCreateRenta],
              ["pagos", t("rentals.pending_payments"), CreditCard, canEditRenta],
              ["historial", t("history"), History, true],
            ]
              .filter(([, , , visible]) => visible)
              .map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTabActiva(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    tabActiva === key
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-5">
            {t("rentals.loading_information")}
          </div>
        ) : (
          <>
            {tabActiva === "nueva" && canCreateRenta && (
              <form
                onSubmit={abrirConfirmacion}
                className="grid grid-cols-1 xl:grid-cols-3 gap-4"
              >
                <div className="xl:col-span-2 space-y-4">
                  <section className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-slate-800">
                        {t("rentals.step_client")}
                      </h2>

                      {canCreateCliente && (
                        <button
                          type="button"
                          onClick={() => setModalCliente(true)}
                          className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                        >
                          <UserPlus size={16} />
                          {t("new_client")}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-3 top-3 text-slate-400"
                      />
                      <input
                        type="text"
                        value={busquedaCliente}
                        onChange={(e) => {
                          setBusquedaCliente(e.target.value);
                          setForm((prev) => ({ ...prev, id_cliente: "" }));
                        }}
                        placeholder={t("rentals.search_client_placeholder")}
                        className="w-full border rounded-lg pl-10 pr-3 py-2"
                      />

                      {busquedaCliente && !form.id_cliente && (
                        <div className="absolute z-20 bg-white border rounded-lg shadow w-full mt-1 max-h-64 overflow-auto">
                          {clientesFiltrados.map((cliente) => (
                            <button
                              type="button"
                              key={cliente.id_cliente}
                              onClick={() => seleccionarCliente(cliente)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b"
                            >
                              <div className="font-medium">
                                {cliente.nombres}
                              </div>
                              <div className="text-xs text-slate-500">
                                {cliente.celular} ·{" "}
                                {cliente.correo || t("no_email")}
                              </div>
                            </button>
                          ))}

                          {clientesFiltrados.length === 0 && (
                            <div className="p-3 text-sm text-slate-500">
                              {t("rentals.no_matches")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {clienteSeleccionado && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                        <strong>{clienteSeleccionado.nombres}</strong>
                        <div>{clienteSeleccionado.celular}</div>
                        <div>{clienteSeleccionado.correo || t("no_email")}</div>
                      </div>
                    )}
                  </section>

                  <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">
                      {t("rentals.step_dumpster")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">{t("dumpster_size")}</label>
                        <select
                          name="tamano_yardas"
                          value={form.tamano_yardas}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        >
                          <option value="">{t("all")}</option>
                          {[10, 15, 20, 25, 30, 40].map((tam) => (
                            <option key={tam} value={tam}>
                              {tam} {t("yard")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.available_dumpster_required")}
                        </label>
                        <select
                          name="id_dumpster"
                          value={form.id_dumpster}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        >
                          <option value="">{t("select")}</option>
                          {dumpstersFiltrados.map((d) => (
                            <option key={d.id_dumpster} value={d.id_dumpster}>
                              {d.codigo} · {d.tamano_yardas} {t("yard")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">{t("dumpster_capacity")}</label>
                        <input
                          value={
                            dumpsterSeleccionado
                              ? `${dumpsterSeleccionado.capacidad_toneladas} ${t("ton")}`
                              : ""
                          }
                          readOnly
                          className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                        />
                      </div>

                      
                    </div>
                  </section>

                  <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">
                      {t("rentals.step_rental_details")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.material_required")}
                        </label>
                        <select
                          name="id_material"
                          value={form.id_material}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        >
                          <option value="">{t("select")}</option>
                          {materiales.map((m) => (
                            <option key={m.id_material} value={m.id_material}>
                              {m.nombre_material}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.truck_required")}
                        </label>
                        <select
                          name="id_camion"
                          value={form.id_camion}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        >
                          <option value="">{t("select")}</option>
                          {camiones.map((c) => (
                            <option key={c.id_camion} value={c.id_camion}>
                              {c.nombre_camion}{" "}
                              {c.placa ? `· ${c.placa}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.location_type_required")}
                        </label>
                        <select
                          name="id_ubicacion"
                          value={form.id_ubicacion}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        >
                          <option value="">{t("select")}</option>
                          {ubicaciones.map((u) => (
                            <option
                              key={u.id_ubicacion}
                              value={u.id_ubicacion}
                            >
                              {u.ubicacion}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.start_date_required")}
                        </label>
                        <input
                          type="date"
                          name="fecha_inicio"
                          value={form.fecha_inicio}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        />
                                               
                      </div>

                      <div>
                        <label className="text-sm font-medium">{t("rentals.days_required")}</label>
                        <input
                          type="number"
                          name="dias_renta"
                          value={form.dias_renta}
                          onChange={handleChange}
                          min="1"
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("rentals.return_date")}
                        </label>
                        <input
                          value={formatFecha(form.fecha_estimada_devolucion)}
                          readOnly
                          className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <MapPin size={18} />
                      {t("rentals.delivery_location")}
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-medium">
                            {t("rentals.delivery_address_required")}
                          </label>

                          <button
                            type="button"
                            onClick={() => setModalMapa(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          >
                            <MapPin size={16} />
                            {t("select_on_map")}
                          </button>
                        </div>

                        <textarea
                          name="direccion_entrega"
                          value={form.direccion_entrega}
                          onChange={handleChange}
                          rows="3"
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          placeholder={t("rentals.delivery_address_placeholder")}
                          required
                        />

                        {(form.latitud && form.longitud) && (
                          <p className="text-xs text-green-600 mt-1">
                            {t("location_selected")}: {t("lat")} {Number(form.latitud).toFixed(6)}, {t("lng")}{" "}
                            {Number(form.longitud).toFixed(6)}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          {t("observations")}
                        </label>
                        <textarea
                          name="observaciones"
                          value={form.observaciones}
                          onChange={handleChange}
                          rows="2"
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          placeholder={t("rentals.notes_placeholder")}
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="bg-white rounded-xl shadow p-5 h-fit xl:sticky xl:top-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign size={18} />
                    {t("rentals.rental_summary")}
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3 border">
                      <div className="text-xs text-slate-500">{t("client")}</div>
                      <strong>{clienteSeleccionado?.nombres || "-"}</strong>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 border">
                      <div className="text-xs text-slate-500">{t("dumpster")}</div>
                      <strong>{dumpsterSeleccionado?.codigo || "-"}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span>{t("base_price")}</span>
                      <strong>${precioBase.toFixed(2)}</strong>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        {t("rentals.payment_status_required")}
                      </label>

                      <select
                        name="estado_pago"
                        value={form.estado_pago}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        required
                      >
                        <option value="pending">{t("pending")}</option>
                        <option value="partial">{t("partial_payment")}</option>
                        <option value="paid">{t("paid")}</option>
                      </select>
                    </div>

                    {form.estado_pago === "partial" && (
                      <div>
                        <label className="text-sm font-medium">
                          {t("amount_paid")}
                        </label>

                        <input
                          type="number"
                          name="monto_abonado"
                          value={form.monto_abonado}
                          onChange={handleChange}
                          min="0"
                          max={precioBase}
                          step="0.01"
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        />
                      </div>
                    )}

                    {form.estado_pago !== "pending" && (
                      <>
                        <div>
                          <label className="text-sm font-medium">
                            {t("rentals.payment_method_required")}
                          </label>

                          <select
                            name="tipo_pago"
                            value={form.tipo_pago}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            required
                          >
                            <option value="cash">{t("cash")}</option>
                            <option value="card">{t("card")}</option>
                            <option value="transfer">{t("transfer")}</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="aplica_tax_base"
                              checked={form.aplica_tax_base}
                              onChange={handleChange}
                            />

                            <span className="font-semibold">{t("apply_tax")}</span>
                          </div>

                          <strong>{(taxRate * 100).toFixed(3)}%</strong>
                        </label>

                        <div className="bg-slate-50 border rounded-lg p-3">

                          <div className="flex justify-between">
                            <span>{t("amount_to_charge")}</span>

                            <strong>
                              $
                              {(
                                form.estado_pago === "paid"
                                  ? precioBase
                                  : Number(form.monto_abonado || 0)
                              ).toFixed(2)}
                            </strong>
                          </div>

                          <div className="flex justify-between mt-1">
                            <span>{t("tax")}</span>

                            <strong>
                              $
                              {(
                                form.aplica_tax_base
                                  ? (
                                      (form.estado_pago === "paid"
                                        ? precioBase
                                        : Number(form.monto_abonado || 0)
                                      ) * taxRate
                                    )
                                  : 0
                              ).toFixed(2)}
                            </strong>
                          </div>

                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span>{t("total_to_charge")}</span>

                            <strong className="text-green-600">
                              $
                              {(
                                (
                                  form.estado_pago === "paid"
                                    ? precioBase
                                    : Number(form.monto_abonado || 0)
                                ) +
                                (
                                  form.aplica_tax_base
                                    ? (
                                        (form.estado_pago === "paid"
                                          ? precioBase
                                          : Number(form.monto_abonado || 0)
                                        ) * taxRate
                                      )
                                    : 0
                                )
                              ).toFixed(2)}
                            </strong>
                          </div>

                        </div>
                      </>
                    )}

                    <div className="flex justify-between border-t pt-3">
                      <span>{t("balance_due")}</span>

                      <strong
                        className={
                          saldoPendiente > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        ${saldoPendiente.toFixed(2)}
                      </strong>
                    </div>

                    <button
                      type="submit"
                      disabled={guardando || !canCreateRenta}
                      className="w-full mt-4 bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700 disabled:opacity-60"
                    >
                      <CalendarDays size={18} className="inline mr-2" />
                      {t("rentals.create_rental")}
                    </button>

                  </div>
                </aside>
              </form>
            )}

            {tabActiva === "operacion" && (
              <section className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setFiltroOperacion("todos")}
                    className={`bg-white rounded-xl shadow p-4 text-left border ${
                      filtroOperacion === "todos" ? "border-blue-500 ring-2 ring-blue-100" : ""
                    }`}
                  >
                    <p className="text-sm text-slate-500">{t("dumpsters")}</p>
                    <strong className="text-2xl">{dumpsters.length}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroOperacion("uso")}
                    className={`bg-white rounded-xl shadow p-4 text-left border ${
                      filtroOperacion === "uso" ? "border-blue-500 ring-2 ring-blue-100" : ""
                    }`}
                  >
                    <p className="text-sm text-slate-500">{t("rentals.in_use_rental")}</p>
                    <strong className="text-2xl text-green-600">{totalEnUso}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroOperacion("retirar")}
                    className={`bg-white rounded-xl shadow p-4 text-left border ${
                      filtroOperacion === "retirar" ? "border-blue-500 ring-2 ring-blue-100" : ""
                    }`}
                  >
                    <p className="text-sm text-slate-500">{t("rentals.to_pick_up")}</p>
                    <strong className="text-2xl text-red-600">{totalRetiroHoy}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroOperacion("pagos")}
                    className={`bg-white rounded-xl shadow p-4 text-left border ${
                      filtroOperacion === "pagos" ? "border-blue-500 ring-2 ring-blue-100" : ""
                    }`}
                  >
                    <p className="text-sm text-slate-500">{t("rentals.pending_payments")}</p>
                    <strong className="text-2xl text-orange-600">
                      {rentasPagosPendientes.length}
                    </strong>
                  </button>
                </div>

                {Object.keys(rentasPorTamano)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((tamano) => {
                    const abierto = gruposAbiertos[tamano] ?? true;
                    const items = rentasPorTamano[tamano];

                    return (
                      <div
                        key={tamano}
                        className="bg-white rounded-xl shadow overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGrupo(tamano)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 border-b"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                            <h3 className="font-semibold text-slate-800">
                              {t("rentals.dumpsters_of")} {tamano} {t("yardas")}
                            </h3>
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                              {items.length}
                            </span>
                          </div>

                          {abierto ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>

                        {abierto && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-3 p-3">
                            {items.map((renta) => {
                              const estadoVisual = getEstadoVisual(renta);
                              const saldo = Number(renta.saldo_pendiente || 0);
                              const progreso = getProgresoRenta(renta);

                              return (
                                <div
                                  key={renta.id_renta}
                                  className={`border ${estadoVisual.border} rounded-xl shadow-sm overflow-hidden bg-white hover:shadow-md transition`}
                                >
                                  <div
                                    className={`${estadoVisual.header} border-b px-3 py-2 flex justify-between items-center`}
                                  >
                                    <div>
                                      <strong className="text-sm truncate text-slate-800">
                                        {renta.dumpster_codigo}
                                      </strong>
                                      <p className="text-[10px] text-slate-500">
                                        {estadoVisual.subtitle}
                                      </p>
                                    </div>

                                    <span
                                      className={`text-[10px] px-2 py-1 rounded-full font-semibold ${estadoVisual.badge}`}
                                    >
                                      {estadoVisual.label}
                                    </span>
                                  </div>

                                  <div className="p-3 text-xs space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-slate-500">{t("dumpster_size")}</p>
                                        <span className="inline-block bg-slate-700 text-white px-2 py-1 rounded text-[10px]">
                                          {renta.tamano_yardas} {t("yard")}
                                        </span>
                                      </div>

                                      <div>
                                        <p className="text-slate-500">{t("payment")}</p>
                                        <span
                                          className={`inline-block px-2 py-1 rounded text-[10px] text-white ${
                                            saldo > 0
                                              ? "bg-red-600"
                                              : "bg-green-600"
                                          }`}
                                        >
                                          {saldo > 0 ? t("pending") : t("paid")}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-slate-500">{t("client")}</p>
                                      <p className="font-semibold truncate">
                                        {renta.cliente}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-500">
                                        {t("address")}
                                      </p>
                                      <p className="truncate">
                                        {renta.direccion_entrega || "-"}
                                      </p>
                                    </div>

                                    {estadoVisual.label === t("rentals.to_pick_up") || estadoVisual.label === "Retirar hoy" ? (
                                      <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-center">
                                        <p className="text-[10px] text-slate-500">{t("pickup_date")}</p>
                                        <strong className="text-xs text-slate-800">
                                          {formatFecha(renta.fecha_estimada_devolucion)}
                                        </strong>
                                      </div>
                                      ) : (
                                        <div className="grid grid-cols-3 items-center gap-1">
                                          <span
                                            className={`${estadoVisual.dateStart} text-white rounded px-2 py-1 text-[10px] text-center`}
                                          >
                                            {formatFecha(renta.fecha_inicio)}
                                          </span>

                                          <span className="text-center text-slate-500 text-[10px]">
                                            {renta.dias_renta} {t("days")}
                                          </span>

                                          <span
                                            className={`${estadoVisual.dateEnd} text-white rounded px-2 py-1 text-[10px] text-center`}
                                          >
                                            {formatFecha(renta.fecha_estimada_devolucion)}
                                          </span>
                                        </div>
                                      )}

                                    <div>
                                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>{t("progress")}</span>
                                        <span>{progreso}%</span>
                                      </div>

                                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${estadoVisual.progress}`}
                                          style={{ width: `${progreso}%` }}
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        abrirDetalleRenta(renta.id_renta)
                                      }
                                      className={`w-full text-white py-2 rounded-lg mt-2 text-xs font-semibold ${estadoVisual.button}`}
                                    >
                                      {t("view_detail")} #{renta.id_renta}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {rentasOperacion.length === 0 && (
                  <div className="bg-white rounded-xl shadow p-5 text-center text-slate-500">
                    {t("rentals.no_active_rentals")}
                  </div>
                )}
              </section>
            )}

            {tabActiva === "pagos" && (
              <section className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-slate-800 mb-4">
                  {t("rentals.pending_payments")}
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3">{t("rental")}</th>
                        <th className="text-left p-3">{t("client")}</th>
                        <th className="text-left p-3">{t("dumpster")}</th>
                        <th className="text-left p-3">{t("status")}</th>
                        <th className="text-right p-3">{t("balance_due")}</th>
                        <th className="text-right p-3">{t("actions")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rentasPagosPendientes.map((renta) => (
                        <tr key={renta.id_renta} className="border-b">
                          <td className="p-3 font-semibold">
                            #{renta.id_renta}
                          </td>
                          <td className="p-3">{renta.cliente}</td>
                          <td className="p-3">{renta.dumpster_codigo}</td>
                          <td className="p-3">{renta.estado}</td>
                          <td className="p-3 text-right font-bold text-red-600">
                            ${Number(renta.saldo_pendiente || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            {canEditRenta ? (
                              <button
                                type="button"
                                onClick={() => abrirDetalleRenta(renta.id_renta)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg"
                              >
                                <CreditCard size={16} />
                                {t("register_payment")}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">{t("read_only")}</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {rentasPagosPendientes.length === 0 && (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-4 text-center text-slate-500"
                          >
                            {t("no_pending_payments")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tabActiva === "historial" && (
              <section className="bg-white rounded-xl shadow p-5">
                
                <div className="bg-white rounded-xl shadow p-4 mb-4">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">{t("rentals.rental_history")}</h2>
                      <p className="text-sm text-slate-500">
                        {t("rentals.search_finished_cancelled")}
                      </p>
                    </div>

                    <div className="relative w-full md:w-80">
                      <Search
                        size={18}
                        className="absolute left-3 top-3 text-slate-400"
                      />
                      <input
                        type="text"
                        value={busquedaHistorial}
                        onChange={(e) => setBusquedaHistorial(e.target.value)}
                        placeholder={t("rentals.search_history_placeholder")}
                        className="w-full border rounded-lg pl-10 pr-3 py-2"
                      />
                    </div>
                  </div>
                </div>



                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3">{t("rental")}</th>
                        <th className="text-left p-3">{t("client")}</th>
                        <th className="text-left p-3">{t("dumpster")}</th>
                        <th className="text-left p-3">{t("start")}</th>
                        <th className="text-left p-3">{t("actual_return")}</th>
                        <th className="text-left p-3">{t("status")}</th>
                        <th className="text-right p-3">{t("actions")}</th>
                      </tr>
                    </thead>
                    
                    <tbody>
                      {rentasHistorial.map((renta) => (
                        <tr key={renta.id_renta} className="border-b">
                          <td className="p-3 font-semibold">
                            #{renta.id_renta}
                          </td>
                          <td className="p-3">{renta.cliente}</td>
                          <td className="p-3">{renta.dumpster_codigo}</td>
                          <td className="p-3">
                            {formatFecha(renta.fecha_inicio)}
                          </td>
                          <td className="p-3">
                            {formatFecha(
                              renta.fecha_real_devolucion ||
                                renta.fecha_estimada_devolucion
                            )}
                          </td>
                          <td className="p-3">{renta.estado}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => abrirDetalleRenta(renta.id_renta)}
                              className="px-3 py-2 bg-slate-700 text-white rounded-lg"
                            >
                              {t("view_detail")}
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirReciboRenta(renta.id_renta)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                            >
                              {t("reprint")}
                            </button>

                            <button
                              type="button"
                              onClick={() => enviarReciboEmail(renta)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <Send size={16} />
                              {t("send_email")}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {rentasHistorial.length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="p-4 text-center text-slate-500"
                          >
                            {t("rentals.no_history")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {totalPaginasHistorial > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                          type="button"
                          disabled={paginaHistorial === 1}
                          onClick={() => setPaginaHistorial((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-2 bg-white border rounded-lg disabled:opacity-50"
                        >
                          {t("previous")}
                        </button>

                        <span className="text-sm text-slate-600">
                          {t("page")} {paginaHistorial} {t("of")} {totalPaginasHistorial}
                        </span>

                        <button
                          type="button"
                          disabled={paginaHistorial === totalPaginasHistorial}
                          onClick={() =>
                            setPaginaHistorial((prev) =>
                              Math.min(prev + 1, totalPaginasHistorial)
                            )
                          }
                          className="px-3 py-2 bg-white border rounded-lg disabled:opacity-50"
                        >
                          {t("next")}
                        </button>
                      </div>
                    )}
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {modalCliente && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">{t("new_client")}</h2>
                <button onClick={() => setModalCliente(false)}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={guardarNuevoCliente} className="p-5 space-y-4">
                <input
                  type="text"
                  placeholder={t("full_name")}
                  value={nuevoCliente.nombres}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      nombres: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />

                <input
                  type="text"
                  placeholder={t("cellphone")}
                  value={nuevoCliente.celular}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      celular: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />

                <input
                  type="email"
                  placeholder={t("email")}
                  value={nuevoCliente.correo}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      correo: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />

                <textarea
                  placeholder={t("client_address")}
                  value={nuevoCliente.direccion}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      direccion: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  rows="3"
                />

                <div className="flex justify-end gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setModalCliente(false)}
                    className="px-4 py-2 bg-slate-200 rounded-lg"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                  >
                    {t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalConfirmar && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("rentals.confirm_rental")}</h2>
                  <p className="text-sm text-slate-500">
                    {t("rentals.review_before_save")}
                  </p>
                </div>

                <button onClick={() => setModalConfirmar(false)}>
                  <X size={22} />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("client")}</p>
                  <strong>{clienteSeleccionado?.nombres}</strong>
                  <p>{clienteSeleccionado?.celular}</p>
                </div>

                <div className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("dumpster")}</p>
                  <strong>{dumpsterSeleccionado?.codigo}</strong>
                  <p>{dumpsterSeleccionado?.tamano_yardas} {t("yard")}</p>
                </div>

                <div className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("truck")}</p>
                  <strong>{camionSeleccionado?.nombre_camion}</strong>
                </div>

                <div className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs text-slate-500">
                    {t("material")} / {t("location")}
                  </p>
                  <strong>{materialSeleccionado?.nombre_material}</strong>
                  <p>{ubicacionSeleccionada?.ubicacion}</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("dates")}</p>
                  <strong>{formatFecha(form.fecha_inicio)}</strong>
                  <p>{t("until")} {formatFecha(form.fecha_estimada_devolucion)}</p>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("total")}</p>
                  <strong className="text-green-700 text-xl">
                    ${Number((precioBase + taxPagoInicial).toFixed(2)).toFixed(2)}
                  </strong>
                  <p className="text-red-600">
                    {t("balance_due")}: ${saldoPendiente.toFixed(2)}
                  </p>
                </div>

                <div className="md:col-span-2 bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{t("rentals.delivery_address_required")}</p>
                  <strong>{form.direccion_entrega}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t p-4">
                <button
                  onClick={() => setModalConfirmar(false)}
                  className="px-4 py-2 bg-slate-200 rounded-lg"
                >
                  {t("review")}
                </button>

                <button
                  onClick={confirmarCrearRenta}
                  disabled={guardando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  <CheckCircle size={18} className="inline mr-2" />
                  {guardando ? t("saving") : t("rentals.confirm_rental")}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalDetalle && rentaDetalle && (() => {
          const rentaBloqueada =
            rentaDetalle?.estado === "finalizado" ||
            rentaDetalle?.estado === "cancelado";

          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col text-sm">
                
                {/* HEADER */}
                <div className="flex items-center justify-between border-b px-4 py-2 bg-white">
                  <div>
                    <h2 className="font-semibold text-slate-800">
                      🗃️ {t("rentals.rental_detail")} - {rentaDetalle.dumpster_codigo}
                    </h2>
                    <p className="text-xs text-slate-500">
                      #{rentaDetalle.id_renta} · {rentaDetalle.cliente} ·{" "}
                      {rentaDetalle.tamano_yardas} {t("yard")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalDetalle(false)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* BOTONES SUPERIORES */}
                <div className="flex overflow-x-auto border-b bg-slate-50">
                  {[
                    ["resumen", t("summary"), ClipboardList, true],
                    ["finanzas", t("rentals.finance_payment"), CreditCard, true],
                    ["extra", t("rentals.extra_charge"), PlusCircle, !rentaBloqueada && canEditRenta],
                    ["reagendar", t("rentals.reschedule"), RotateCcw, !rentaBloqueada && canEditRenta],
                    ["movimientos", t("movements"), History, true],
                  ]
                    .filter(([, , , visible]) => visible)
                    .map(([key, label, Icon]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTabDetalle(key)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-r whitespace-nowrap ${
                          tabDetalle === key
                            ? "bg-white text-blue-700 border-t-2 border-t-blue-600"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                </div>

                {/* AVISO SI ESTÁ CERRADA */}
                {rentaBloqueada && (
                  <div className="mx-3 mt-3 bg-slate-100 border border-slate-300 rounded-lg p-3 text-sm text-slate-700">
                    {t("rentals.closed_no_modify_charges")}
                  </div>
                )}

                {/* BODY */}
                <div className="p-3 overflow-y-auto flex-1 bg-slate-50">
                  {tabDetalle === "resumen" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <section className="border rounded-lg overflow-hidden bg-white">
                        <div className="bg-slate-100 px-3 py-2 border-b font-semibold">
                          {t("client_information")}
                        </div>

                        <div className="divide-y">
                          <div className="grid grid-cols-[120px_1fr] px-3 py-1.5">
                            <strong>{t("client")}:</strong>
                            <span>{rentaDetalle.cliente}</span>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] px-3 py-1.5">
                            <strong>{t("cellphone")}:</strong>
                            <span>{rentaDetalle.celular || "-"}</span>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] px-3 py-1.5">
                            <strong>{t("email")}:</strong>
                            <span className="break-all">{rentaDetalle.correo || "-"}</span>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] px-3 py-1.5">
                            <strong>{t("address")}:</strong>
                            <span>{rentaDetalle.direccion_entrega || "-"}</span>
                          </div>


                          <div className="grid grid-cols-[140px_1fr] px-3 py-2">
                          <strong>{t("total")}:</strong>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              ${Number(rentaDetalle.total_final || 0).toFixed(2)}
                            </span>

                            {Number(rentaDetalle.tax_amount || 0) > 0 && (
                                    <small className="ml-2 text-slate-500">
                                      {t("incl")}. ${Number(rentaDetalle.tax_amount || 0).toFixed(2)} {t("tax")}
                                    </small>
                                  )}
                          </div>
                        </div>

                          {Number(rentaDetalle.saldo_pendiente || 0) > 0 ? (
                            <>
                              {Number(rentaDetalle.total_pagado || rentaDetalle.monto_pagado || 0) > 0 && (
                                <div className="flex justify-between items-center">
                                  <span>{t("amount_paid")}</span>

                                  <div className="text-right">
                                    <span className="inline-flex rounded bg-green-500 px-3 py-1 text-sm font-bold text-white">
                                      ${Number(totalPagadoReal || 0).toFixed(2)}
                                    </span>

                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-[140px_1fr] px-3 py-2">
                                <strong>{t("balance_due")}:</strong>
                                <span className="inline-flex w-fit rounded bg-red-500 px-3 py-1 text-sm font-bold text-white">
                                  ${Number(rentaDetalle.saldo_pendiente || 0).toFixed(2)}
                                </span>
                              </div>

                              <div className="mx-3 my-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-semibold">
                                ⚠️ {t("client_has_balance")} $
                                {Number(rentaDetalle.saldo_pendiente || 0).toFixed(2)} {t("pending_payment")}.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-[140px_1fr] px-3 py-2">
                                <strong>{t("amount_paid")}:</strong>
                                <div>
                                  <span className="inline-flex rounded bg-green-500 px-3 py-1 text-sm font-bold text-white">
                                    ${Number(rentaDetalle.total_pagado || rentaDetalle.total_final || 0).toFixed(2)}
                                  </span>

                                  
                                </div>
                              </div>

                              <div className="mx-3 my-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 font-semibold">
                                ✅ {t("client_no_balance")}
                              </div>
                            </>
                          )}
                          
                          



                        </div>

                        {rentaDetalle.observaciones && (
                          <div className="m-3 bg-red-50 border border-red-100 rounded-lg p-2">
                            <strong className="text-red-700">{t("observations")}</strong>
                            <p className="text-red-600">{rentaDetalle.observaciones}</p>
                          </div>
                        )}
                      </section>

                      <section className="border rounded-lg overflow-hidden bg-white">
                        <div className="bg-slate-100 px-3 py-2 border-b font-semibold">
                          {t("rental_information")}
                        </div>

                        <div className="divide-y">
                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("rental")} {t("id")}:</strong>
                            <span>{rentaDetalle.id_renta}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("dumpster")}:</strong>
                            <span>{rentaDetalle.dumpster_codigo}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("dumpster_size")}:</strong>
                            <span>{rentaDetalle.tamano_yardas} {t("yard")}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("dumpster_capacity")}:</strong>
                            <span>{rentaDetalle.capacidad_toneladas} {t("ton")}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("start")}:</strong>
                            <span>{formatFecha(rentaDetalle.fecha_inicio)}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("return")}:</strong>
                            <span>{formatFecha(rentaDetalle.fecha_estimada_devolucion)}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("days")}:</strong>
                            <span>{rentaDetalle.dias_renta} {t("days")}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("truck")}:</strong>
                            <span>{rentaDetalle.nombre_camion || "-"}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("material")}:</strong>
                            <span>{rentaDetalle.nombre_material || "-"}</span>
                          </div>

                          <div className="grid grid-cols-[130px_1fr] px-3 py-1.5">
                            <strong>{t("location")}:</strong>
                            <span>{rentaDetalle.ubicacion || "-"}</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {tabDetalle === "finanzas" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <section className="border rounded-lg overflow-hidden bg-white">
                          <div className="bg-green-50 text-green-800 px-3 py-2 border-b font-semibold">
                            {t("finances")}
                          </div>

                          <div className="divide-y max-h-[320px] overflow-y-auto">
                            {conceptosPago.length === 0 ? (
                              <div className="p-4 text-sm text-green-700 bg-green-50 font-semibold">
                                ✅ {t("no_pending_charges")}
                              </div>
                            ) : (
                              conceptosPago.map((item) => (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50 ${
                                    conceptosSeleccionados.includes(item.id) ? "bg-blue-50" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={conceptosSeleccionados.includes(item.id)}
                                    onChange={() => toggleConceptoPago(item.id)}
                                    disabled={!canEditRenta || rentaBloqueada || saldoActualDetalle <= 0}
                                  />

                                  <div className="flex-1">
                                    <div className="font-semibold">
                                      {item.tipo === "renta" ? t("rental") : t("extra")}
                                    </div>

                                    <div className="text-sm text-slate-700">
                                      {item.descripcion}
                                    </div>

                                    <div className="text-xs text-slate-500">
                                      {item.detalle}
                                    </div>
                                  </div>

                                  <strong
                                    className={
                                      item.tipo === "extra"
                                        ? "text-blue-700"
                                        : saldoActualDetalle > 0
                                        ? "text-red-600"
                                        : "text-green-700"
                                    }
                                  >
                                  {item.tipo === "extra" && canEditRenta && !rentaBloqueada && (
                                    <button
                                      type="button"
                                      disabled={eliminandoExtraId === item.id_extra}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        eliminarExtra(item);
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-60"
                                    >
                                      {eliminandoExtraId === item.id_extra ? t("voiding") : t("void")}
                                    </button>
                                  )}  


                                    ${Number(item.total || 0).toFixed(2)}
                                  </strong>
                                </label>
                              ))
                            )}

                            <div
                              className={`flex justify-between px-3 py-3 text-lg ${
                                saldoActualDetalle > 0 ? "bg-red-50" : "bg-green-50"
                              }`}
                            >
                              <span className="font-bold">{t("pending_total")}</span>
                              <strong
                                className={
                                  saldoActualDetalle > 0 ? "text-red-600" : "text-green-700"
                                }
                              >
                                ${Number(saldoActualDetalle || 0).toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        </section>

                        <section className="border rounded-lg overflow-hidden bg-white">
                          <div className="bg-slate-50 px-3 py-2 border-b font-semibold">
                            {t("account_status")}
                          </div>

                          <div className="p-3 space-y-4">

                            <div className="flex justify-between items-center">
                              <span>{t("amount_paid")}</span>

                              <div className="text-right">
                                <span className="inline-flex rounded bg-green-500 px-3 py-1 text-sm font-bold text-white">
                                  ${Number(totalPagadoReal || 0).toFixed(2)}
                                </span>

                                {totalExtrasPagados > 0 && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    (+ ${totalExtrasPagados.toFixed(2)} {t("in_extras")})
                                  </div>
                                )}
                              </div>
                            </div>

                            

                            {saldoActualDetalle > 0 ? (
                              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                ⚠️ {t("balance_due")}: ${saldoActualDetalle.toFixed(2)}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
                                ✅ {t("account_clear")}
                              </div>
                            )}

                          </div>
                        </section>
                      </div>

                      <section className="border rounded-lg overflow-hidden bg-white h-fit">
                        <div className="bg-green-50 text-green-800 px-3 py-2 border-b font-semibold">
                          {t("register_payment")}
                        </div>

                        {canEditRenta && !rentaBloqueada && saldoActualDetalle > 0 ? (
                          <form onSubmit={registrarPago} className="p-3 space-y-3">

                            <div className="rounded-lg border bg-slate-50 p-3">
                              <div className="text-sm text-slate-500">
                                {t("selected_total")}
                              </div>

                              <div
                                className={`text-2xl font-bold ${
                                  totalSeleccionadoPago > saldoActualDetalle
                                    ? "text-red-600"
                                    : "text-green-700"
                                }`}
                              >
                                ${totalSeleccionadoPago.toFixed(2)}
                              </div>

                              <div className="text-xs text-slate-500 mt-1">
                                {t("current_balance")}: $
                                {Number(saldoActualDetalle || 0).toFixed(2)}
                              </div>

                              {totalSeleccionadoPago > saldoActualDetalle && (
                                <div className="mt-2 text-sm text-red-600 font-semibold">
                                  ⚠️ {t("selected_exceeds_balance")}
                                </div>
                              )}
                            </div>

                            <select
                              value={pagoForm.tipo_pago}
                              onChange={(e) =>
                                setPagoForm({
                                  ...pagoForm,
                                  tipo_pago: e.target.value,
                                })
                              }
                              className="w-full border rounded-lg px-3 py-2"
                              required
                            >
                              <option value="cash">{t("cash")}</option>
                              <option value="card">{t("card")}</option>
                              <option value="transfer">{t("transfer")}</option>
                            </select>

                            <label className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">

                              <div className="flex items-center gap-2">

                                <input
                                  type="checkbox"
                                  checked={pagoForm.aplicar_tax_pago}
                                  onChange={(e) =>
                                    setPagoForm({
                                      ...pagoForm,
                                      aplicar_tax_pago: e.target.checked,
                                    })
                                  }
                                />

                                <span className="font-semibold">
                                  {t("apply_tax")}
                                </span>

                              </div>

                              <strong>
                                {(taxRateDetalle * 100).toFixed(3)}%
                              </strong>

                            </label>

                            {pagoForm.aplicar_tax_pago && (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">

                                <div className="flex justify-between">
                                  <span>{t("selected_amount")}</span>
                                  <strong>
                                    ${totalSeleccionadoPago.toFixed(2)}
                                  </strong>
                                </div>

                                <div className="flex justify-between mt-1">
                                  <span>{t("tax")}</span>
                                  <strong>
                                    $
                                    {(
                                      totalSeleccionadoPago * taxRateDetalle
                                    ).toFixed(2)}
                                  </strong>
                                </div>

                                <div className="flex justify-between border-t pt-2 mt-2">

                                  <span>{t("total_to_charge")}</span>

                                  <strong className="text-green-700">
                                    $
                                    {(
                                      totalSeleccionadoPago +
                                      totalSeleccionadoPago * taxRateDetalle
                                    ).toFixed(2)}
                                  </strong>

                                </div>

                              </div>
                            )}

                            <input
                              type="text"
                              placeholder={t("observations")}
                              value={pagoForm.observaciones}
                              onChange={(e) =>
                                setPagoForm({
                                  ...pagoForm,
                                  observaciones: e.target.value,
                                })
                              }
                              className="w-full border rounded-lg px-3 py-2"
                            />

                            <button
                              type="submit"
                              disabled={
                                !canEditRenta ||
                                totalSeleccionadoPago <= 0 ||
                                totalSeleccionadoPago > saldoActualDetalle
                              }
                              className={`w-full rounded-lg py-2 font-medium ${
                                totalSeleccionadoPago > 0 &&
                                totalSeleccionadoPago <= saldoActualDetalle
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              {t("register_selected_payment")}
                            </button>

                          </form>
                        ) : (
                          <div className="p-3 bg-slate-50 text-slate-700 font-semibold">
                            {rentaBloqueada
                              ? t("rentals.closed_no_payments")
                              : t("no_balance_to_pay")}
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {canEditRenta && !rentaBloqueada && tabDetalle === "extra" && (
                    <section className="border rounded-lg overflow-hidden bg-white max-w-2xl">
                      <div className="bg-blue-50 text-blue-800 px-3 py-2 border-b font-semibold">
                        {t("rentals.extra_charge")}
                      </div>

                      <form onSubmit={guardarExtra} className="p-3 space-y-3">
                        <select
                          value={extraForm.tipo_extra}
                          onChange={(e) =>
                            setExtraForm({
                              ...extraForm,
                              tipo_extra: e.target.value,
                              aplica_tax: false,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2"
                          required
                        >
                          <option value="">{t("rentals.select_charge_type")}</option>
                          <option value="ton">{t("overweight")}</option>
                          <option value="yard">{t("extra_yards")}</option>
                          <option value="day">{t("extra_days")}</option>
                          <option value="manual">{t("manual_charge")}</option>
                          <option value="damage">{t("damage")}</option>
                          <option value="fuel">{t("fuel")}</option>
                          <option value="late_fee">{t("late_fee")}</option>
                          <option value="tax_adjustment">{t("tax_adjustment")}</option>
                          <option value="card_fee">{t("card_fee")}</option>
                        </select>

                        <input
                          type="text"
                          placeholder={t("charge_description")}
                          value={extraForm.descripcion}
                          onChange={(e) =>
                            setExtraForm({
                              ...extraForm,
                              descripcion: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2"
                        />

                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t("charge_amount")}
                          value={extraForm.monto}
                          onChange={(e) =>
                            setExtraForm({
                              ...extraForm,
                              monto: e.target.value,
                              aplica_tax: false,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2"
                          required
                        />

                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                          ℹ️ {t("extra_info")}
                        </div>

                        <div className="rounded-lg bg-slate-50 border p-3">
                          <div className="flex justify-between">
                            <span>{t("charge_value")}</span>
                            <strong>${Number(extraForm.monto || 0).toFixed(2)}</strong>
                          </div>

                          <div className="flex justify-between text-slate-500 text-sm mt-1">
                            <span>{t("initial_status")}</span>
                            <strong>{t("pending")}</strong>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={guardandoExtra || rentaBloqueada || !canEditRenta}
                          className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <PlusCircle size={18} className="inline mr-2" />
                          {guardandoExtra ? t("adding_charge") : t("add_extra_charge")}
                      </button>
                      </form>
                    </section>
                  )}

                  {canEditRenta && !rentaBloqueada && tabDetalle === "reagendar" && (
                    <section className="border rounded-lg overflow-hidden bg-white max-w-xl">
                      <div className="bg-yellow-50 text-yellow-800 px-3 py-2 border-b font-semibold">
                        {t("rentals.reschedule")}
                      </div>

                      <form onSubmit={guardarFechasRenta} className="p-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {t("start_date")}
                          </label>
                          <input
                            type="date"
                            value={fechasRentaForm.fecha_inicio}
                            disabled={bloquearFechaInicio}
                            onChange={(e) => {
                              if (bloquearFechaInicio) return;

                              setFechasRentaForm({
                                ...fechasRentaForm,
                                fecha_inicio: e.target.value,
                              });
                            }}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              bloquearFechaInicio
                                ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-70"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {t("return_date")}
                          </label>
                          <input
                            type="date"
                            value={fechasRentaForm.fecha_estimada_devolucion}
                            onChange={(e) =>
                              setFechasRentaForm({
                                ...fechasRentaForm,
                                fecha_estimada_devolucion: e.target.value,
                              })
                            }
                            min={fechasRentaForm.fecha_inicio}
                            className="w-full border rounded-lg px-3 py-2"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!fechaCambioActiva}
                          className={`w-full rounded-lg py-2 ${
                            fechaCambioActiva
                              ? "bg-yellow-500 text-white"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {t("save_new_dates")}
                        </button>
                      </form>
                    </section>
                  )}
                  {tabDetalle === "movimientos" && (
                    <section className="border rounded-lg overflow-hidden bg-white">
                      <div className="bg-blue-50 text-blue-800 px-3 py-2 border-b font-semibold">
                        {t("movements")}
                      </div>

                      {extrasDetalle.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500">
                          {t("no_extra_charges")}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {extrasDetalle.map((extra, index) => {
                            const extraPagado =
                              String(extra.estado_pago || "").toLowerCase() === "pagado";

                            const pagoRelacionado = extraPagado
                              ? pagosVisibles.find((pago) => {
                                  const obs = String(pago.observaciones || "").toLowerCase();
                                  const desc = String(extra.descripcion || "").toLowerCase();
                                  const montoPagoSinTax =
                                    Number(pago.monto_abonado || 0) - Number(pago.tax_pago || 0);

                                  return (
                                    obs.includes(desc) ||
                                    Math.abs(montoPagoSinTax - Number(extra.monto || 0)) < 0.01
                                  );
                                })
                              : null;

                            return (
                              <div key={extra.id_extra} className="p-4 border-b last:border-b-0">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 items-start">
                                  
                                  {/* IZQUIERDA: CARGO */}
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-bold text-slate-800">
                                          {t("extra")} #{index + 1}
                                        </div>

                                        <div className="text-sm font-semibold text-slate-700 mt-2">
                                          {extra.tipo_extra}
                                        </div>

                                        <div className="text-sm text-slate-500">
                                          {extra.descripcion || t("no_description")}
                                        </div>
                                      </div>

                                      <span className="font-bold text-blue-600">
                                        +${Number(extra.monto || 0).toFixed(2)}
                                      </span>
                                    </div>

                                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                                      <div>
                                        <strong>{t("generated")}:</strong>{" "}
                                        {formatFecha(extra.fecha_registro)}
                                      </div>

                                      
                                    </div>
                                  </div>

                                  {/* DERECHA: PAGO */}
                                  <div className="border-l pl-6">
                                    {extra.estado_pago === "pagado" ? (
                                      pagoRelacionado ? (
                                        <>
                                          <div className="font-semibold text-green-700">
                                            ✓ {t("payment_registered")}
                                          </div>

                                          <div className="mt-4 space-y-1 text-sm text-slate-600">
                                            <div>
                                              <strong>{t("date")}:</strong>{" "}
                                              {formatFecha(pagoRelacionado.fecha_pago)}
                                            </div>

                                            <div>
                                              <strong>{t("method")}:</strong>{" "}
                                              {pagoRelacionado.tipo_pago === "card"
                                                ? t("card")
                                                : pagoRelacionado.tipo_pago === "cash"
                                                ? t("cash")
                                                : t("transfer")}
                                            </div>

                                            <div>
                                              <strong>{t("charged")}:</strong>{" "}
                                              <span className="font-bold text-green-700">
                                                ${Number(pagoRelacionado.monto_abonado || 0).toFixed(2)}
                                              </span>
                                            </div>

                                            {Number(pagoRelacionado.tax_pago || 0) > 0 && (
                                              <div>
                                                <strong>{t("tax")}:</strong>{" "}
                                                <span className="text-blue-700 font-semibold">
                                                  ${Number(pagoRelacionado.tax_pago).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="h-full flex items-center text-sm text-amber-600 italic">
                                          {t("extra_paid_no_payment_found")}
                                        </div>
                                      )
                                    ) : (
                                      <>
                                        <div className="font-semibold text-red-600">
                                          {t("pending_payment")}
                                        </div>

                                        <div className="mt-4 space-y-1 text-sm text-slate-500">
                                          <div>
                                            <strong>{t("date")}:</strong> -
                                          </div>

                                          <div>
                                            <strong>{t("method")}:</strong> -
                                          </div>

                                          <div>
                                            <strong>{t("charged")}:</strong> $0.00
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}
                </div>

                {/* FOOTER */}
                <div className="border-t px-3 py-2 flex flex-wrap justify-end gap-2 bg-white">
                  <button
                    type="button"
                    onClick={() => setModalDetalle(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-lg"
                  >
                    <X size={16} />
                    {t("close")}
                  </button>

                  {!rentaBloqueada && (
                    <>
                      {canCancelRenta && (
                        <button
                          type="button"
                          onClick={cancelarRentaActual}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg"
                        >
                          <Ban size={16} />
                          {t("rentals.cancel_rental")}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={enviarChoferWhatsapp}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        <Send size={16} />
                        {t("rentals.send_to_driver")}
                      </button>

                      {canFinishRenta && (
                        <button
                          type="button"
                          onClick={finalizarRentaActual}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"
                        >
                          <CheckCircle size={16} />
                          {t("rentals.finish_rental")}
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={verRecibo}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900"
                  >
                    <ReceiptText size={16} />
                    {t("rentals.view_receipt")}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <LocationPickerModal
        open={modalMapa}
        onClose={() => setModalMapa(false)}
        initialAddress={form.direccion_entrega}
        initialLat={form.latitud}
        initialLng={form.longitud}
        onConfirm={({ direccion, latitud, longitud }) => {
          setForm((prev) => ({
            ...prev,
            direccion_entrega: direccion,
            latitud,
            longitud,
          }));
        }}
      />  

    </DashboardLayout>
  );
}

export default Rentas;

