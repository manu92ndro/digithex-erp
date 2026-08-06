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
  Calculator,
  Landmark,
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
  cancelarRenta,
  registrarPagoRenta,
  actualizarFechaRetiro,
  anularExtraRenta,

  getCostosRenta,
  guardarCostoRenta,
  
} from "../api/rentas";

import { createCliente } from "../api/clientes";
import { showSuccess, showError } from "../utils/alerts";

import {
  abrirReciboRenta,
  enviarReciboCorreo,
} from "../api/recibos";


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

const initialCostoEntrega = {
  hora_inicio: "",
  hora_fin: "",
  observaciones: "",
};

const initialCostoRetiro = {
  hora_inicio: "",
  hora_fin: "",
  lugar_disposicion: "",
  numero_ticket: "",
  costo_disposicion: "",
  observaciones: "",
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

  const [modalCancelarRenta, setModalCancelarRenta] =
  useState(false);

  const [modalFinalizarRenta, setModalFinalizarRenta] =
    useState(false);

  const [motivoCancelacion, setMotivoCancelacion] =
    useState("");

  const [procesandoOperacion, setProcesandoOperacion] =
    useState(false);

  const [rentaDetalle, setRentaDetalle] = useState(null);
  const [extrasDetalle, setExtrasDetalle] = useState([]);
  const [pagosDetalle, setPagosDetalle] = useState([]);
// Historial real de conceptos pagados
  const [detallesPago, setDetallesPago] = useState([]);


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
  const [modalMapa, setModalMapa] = useState(false);

  const [
    modalAnularExtra,
    setModalAnularExtra,
  ] = useState(false);

  const [
    extraParaAnular,
    setExtraParaAnular,
  ] = useState(null);

  const [
    motivoAnulacionExtra,
    setMotivoAnulacionExtra,
  ] = useState("");

  const [
    anulandoExtra,
    setAnulandoExtra,
  ] = useState(false);

  const [
    costosRenta,
    setCostosRenta,
  ] = useState([]);

  const [
    resumenCostos,
    setResumenCostos,
  ] = useState(null);

  const [
    tarifaCostoHora,
    setTarifaCostoHora,
  ] = useState(0);

  const [
    costoEntregaForm,
    setCostoEntregaForm,
  ] = useState(initialCostoEntrega);

  const [
    costoRetiroForm,
    setCostoRetiroForm,
  ] = useState(initialCostoRetiro);

  const [
    cargandoCostos,
    setCargandoCostos,
  ] = useState(false);

  const [
    guardandoCosto,
    setGuardandoCosto,
  ] = useState(null);


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

  const movimientosPago = Object.values(
    detallesPago.reduce((grupos, detalle) => {
      const idPago = Number(detalle.id_pago);

      if (!grupos[idPago]) {
        grupos[idPago] = {
          id_pago: idPago,

          fecha_pago:
            detalle.fecha_pago ||
            detalle.fecha_creacion,

          tipo_pago:
            detalle.tipo_pago || null,

          estado_pago:
            detalle.estado_pago_general ||
            "pagado",

          observaciones:
            detalle.observaciones_pago ||
            null,

          detalles: [],
        };
      }

      grupos[idPago].detalles.push(detalle);

      return grupos;
    }, {})
  ).sort((a, b) => {
    const fechaA = new Date(
      a.fecha_pago || 0
    ).getTime();

    const fechaB = new Date(
      b.fecha_pago || 0
    ).getTime();

    // El primer pago realizado aparecerá como Pago #1
    return fechaA - fechaB;
  });

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

        precio_base: Number(
          precioBase.toFixed(2)
        ),

        aplica_tax_base: Boolean(
          form.aplica_tax_base
        ),

        estado_pago: form.estado_pago,

        // Solo se envía el abono base.
        // El backend calcula y agrega el impuesto.
        monto_abonado: Number(
          montoPagoInicial.toFixed(2)
        ),

        tipo_pago:
          form.estado_pago === "pending"
            ? null
            : form.tipo_pago || "cash",
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

  const cargarCostosRenta = async (
      idRenta
    ) => {
      const id = Number(idRenta);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return;
      }

      try {
        setCargandoCostos(true);

        const data =
          await getCostosRenta(id);

        const costos =
          data.costos || [];

        setCostosRenta(costos);

        setResumenCostos(
          data.resumen || null
        );

        const tarifa =
          Number(
            data.tarifa_hora ||
              costos[0]?.tarifa_hora ||
              0
          );

        setTarifaCostoHora(tarifa);

        const entrega = costos.find(
          (costo) =>
            costo.tipo_operacion ===
            "entrega"
        );

        const retiro = costos.find(
          (costo) =>
            costo.tipo_operacion ===
            "retiro"
        );

        setCostoEntregaForm({
          hora_inicio:
            formatFechaHoraInput(
              entrega?.hora_inicio
            ),

          hora_fin:
            formatFechaHoraInput(
              entrega?.hora_fin
            ),

          observaciones:
            entrega?.observaciones ||
            "",
        });

        setCostoRetiroForm({
          hora_inicio:
            formatFechaHoraInput(
              retiro?.hora_inicio
            ),

          hora_fin:
            formatFechaHoraInput(
              retiro?.hora_fin
            ),

          lugar_disposicion:
            retiro?.lugar_disposicion ||
            "",

          numero_ticket:
            retiro?.numero_ticket ||
            "",

          costo_disposicion:
            retiro
              ? String(
                  retiro.costo_disposicion ||
                    ""
                )
              : "",

          observaciones:
            retiro?.observaciones ||
            "",
        });
      } catch (error) {
        console.error(
          "Error cargando costos:",
          error
        );

        showError(
          error.response?.data?.msg ||
            "No se pudieron cargar los costos"
        );
      } finally {
        setCargandoCostos(false);
      }
    };

  const abrirDetalleRenta = async (
    id
  ) => {
    try {
      const data =
        await getRentaDetalle(id);

      setTabDetalle("resumen");

      setRentaDetalle(
        data.renta
      );

      setExtrasDetalle(
        data.extras || []
      );

      setPagosDetalle(
        data.pagos || []
      );

      setDetallesPago(
        data.detalles_pago || []
      );

      setConceptosSeleccionados([]);

      setFechasRentaForm({
        fecha_inicio:
          data.renta?.fecha_inicio
            ?.split("T")[0] || "",

        fecha_estimada_devolucion:
          data.renta
            ?.fecha_estimada_devolucion
            ?.split("T")[0] || "",
      });

      setModalDetalle(true);

      /*
      * Los costos se cargan después.
      * Si fallan, no impiden abrir la renta.
      */
      try {
        await cargarCostosRenta(id);
      } catch (error) {
        console.error(
          "No se pudieron cargar los costos:",
          error
        );
      }
    } catch (error) {
      console.error(
        "ERROR CARGANDO DETALLE:",
        error
      );

      showError(
        error.response?.data?.msg ||
          t(
            "rentals.error_load_detail"
          )
      );
    }
  };

  const guardarExtra = async (e) => {
    e.preventDefault();

    if (guardandoExtra) {
      return;
    }

    const idRenta = Number(
      rentaDetalle?.id_renta
    );

    if (
      !Number.isInteger(idRenta) ||
      idRenta <= 0
    ) {
      showError(
        "No se pudo identificar la renta"
      );
      return;
    }

    const tipoExtra = String(
      extraForm.tipo_extra || ""
    ).trim();

    const descripcion = String(
      extraForm.descripcion || ""
    ).trim();

    const monto = Number(
      extraForm.monto
    );

    if (!tipoExtra) {
      showError(
        "Seleccione el tipo de cargo"
      );
      return;
    }

    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      showError(
        "El monto del cargo debe ser mayor que cero"
      );
      return;
    }

    setGuardandoExtra(true);

    try {
      // ==========================================
      // 1. GUARDAR EL EXTRA
      // ==========================================

      const respuesta =
        await addExtraRenta(
          idRenta,
          {
            tipo_extra: tipoExtra,
            descripcion:
              descripcion || null,
            monto,
            aplica_tax: false,
          }
        );

      /*
      * Llegar aquí significa que el extra
      * se guardó correctamente.
      */

      showSuccess(
        respuesta?.msg ||
          "Cargo extra agregado correctamente"
      );

      // Limpiar formulario inmediatamente
      setExtraForm({
        tipo_extra: "",
        descripcion: "",
        monto: "",
        aplica_tax: false,
      });

      setConceptosSeleccionados([]);

      // ==========================================
      // 2. REFRESCAR SOLO EL DETALLE DE LA RENTA
      // ==========================================

      try {
        const detalleActualizado =
          await getRentaDetalle(
            idRenta
          );

        setRentaDetalle(
          detalleActualizado.renta
        );

        setExtrasDetalle(
          detalleActualizado.extras ||
            []
        );

        setPagosDetalle(
          detalleActualizado.pagos ||
            []
        );

        setDetallesPago(
          detalleActualizado
            .detalles_pago || []
        );
      } catch (refreshError) {
        console.error(
          "El extra fue creado, pero no se pudo actualizar el detalle:",
          refreshError
        );

        /*
        * No mostramos “Error al guardar”.
        * El registro ya existe.
        */
        showError(
          "El cargo fue agregado, pero no se pudo actualizar la vista. Cierre y vuelva a abrir la renta."
        );
      }
    } catch (error) {
      console.error(
        "Error agregando extra:",
        error
      );

      showError(
        error.response?.data?.msg ||
          error.response?.data?.message ||
          "No se pudo agregar el cargo extra"
      );
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

  

  const abrirModalCancelarRenta = () => {
    if (!canCancelRenta) {
      showError(t("rentals.no_permission_cancel"));
      return;
    }

    if (!rentaDetalle?.id_renta) {
      showError("No se pudo identificar la renta");
      return;
    }

    if (rentaBloqueada) {
      showError("Esta renta ya está cerrada");
      return;
    }

    setMotivoCancelacion("");
    setModalCancelarRenta(true);
  };

  const confirmarCancelacionRenta = async () => {
    const motivo = motivoCancelacion.trim();

    if (!motivo) {
      showError(
        t("rentals.cancellation_reason_required")
      );
      return;
    }

    if (motivo.length < 3) {
      showError(
        "El motivo debe tener al menos 3 caracteres"
      );
      return;
    }

    try {
      setProcesandoOperacion(true);

      const data = await cancelarRenta(
        rentaDetalle.id_renta,
        {
          motivo_cancelacion: motivo,
        }
      );

      showSuccess(
        data?.msg ||
          t("rentals.rental_cancelled")
      );

      setModalCancelarRenta(false);
      setModalDetalle(false);
      setMotivoCancelacion("");

      await cargarDatos();
    } catch (error) {
      console.error(
        "ERROR CANCELANDO RENTA:",
        error
      );

      showError(
        error.response?.data?.msg ||
          error.response?.data?.message ||
          error.message ||
          t("rentals.error_cancel_rental")
      );
    } finally {
      setProcesandoOperacion(false);
    }
  };

  const abrirModalFinalizarRenta = () => {
  if (!canFinishRenta) {
    showError(t("rentals.no_permission_finish"));
    return;
  }

  if (!rentaDetalle?.id_renta) {
    showError("No se pudo identificar la renta");
    return;
  }

  if (rentaBloqueada) {
    showError("Esta renta ya está cerrada");
    return;
  }

  setModalFinalizarRenta(true);
};

const confirmarFinalizacionRenta = async () => {
  try {
    setProcesandoOperacion(true);

    const data = await finalizarRenta(
      rentaDetalle.id_renta
    );

    showSuccess(
      data?.msg ||
        t("rentals.rental_finished")
    );

    setModalFinalizarRenta(false);
    setModalDetalle(false);

    await cargarDatos();
  } catch (error) {
    console.error(
      "ERROR FINALIZANDO RENTA:",
      error
    );

    showError(
      error.response?.data?.msg ||
        error.response?.data?.message ||
        error.message ||
        t("rentals.error_finish_rental")
    );
  } finally {
    setProcesandoOperacion(false);
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


  const refrescarDetalleRenta = async (
    idRenta
  ) => {
    const data = await getRentaDetalle(
      idRenta
    );

    setRentaDetalle(
      data.renta || null
    );

    setExtrasDetalle(
      data.extras || []
    );

    setPagosDetalle(
      data.pagos || []
    );

    setDetallesPago(
      data.detalles_pago || []
    );

    setConceptosSeleccionados([]);

    return data;
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

  // ======================================================
  // MOVIMIENTOS SIMPLES
  // Pagos de renta + extras pendientes/pagados
  // Ordenados del más reciente al más antiguo
  // ======================================================

  const idsExtrasConDetalle = new Set(
    detallesPago
      .filter(
        (detalle) =>
          String(
            detalle.tipo_concepto || ""
          ).toLowerCase() === "extra"
      )
      .map((detalle) =>
        Number(detalle.id_extra)
      )
  );

  const movimientosSimples = [
    // Pagos registrados con detalle
    ...detallesPago.map((detalle) => {
      const esExtra =
        String(
          detalle.tipo_concepto || ""
        ).toLowerCase() === "extra";

      return {
        id: `pago-${detalle.id_pago_detalle}`,

        id_pago:
          detalle.id_pago,

        id_extra:
          detalle.id_extra,

        tipo:
          esExtra ? "extra" : "renta",

        titulo:
          esExtra
            ? detalle.tipo_extra
              ? `Cargo extra · ${detalle.tipo_extra}`
              : "Cargo extra"
            : "Pago de renta",

        descripcion:
          detalle.descripcion ||
          (esExtra
            ? "Cargo adicional"
            : "Pago aplicado al saldo de la renta"),

        estado: "pagado",

        fecha:
          detalle.fecha_pago ||
          detalle.fecha_creacion,

        tipo_pago:
          detalle.tipo_pago || null,

        monto_base:
          Number(
            detalle.monto_base || 0
          ),

        tax_monto:
          Number(
            detalle.tax_monto || 0
          ),

        total_cobrado:
          Number(
            detalle.total_cobrado || 0
          ),
      };
    }),

    // Extras que todavía no tienen detalle de pago
    ...extrasDetalle
      .filter(
        (extra) =>
          !idsExtrasConDetalle.has(
            Number(extra.id_extra)
          )
      )
      .filter(
        (extra) =>
          String(
            extra.estado_pago || ""
          ).toLowerCase() !== "anulado"
      )
      .map((extra) => {
        const estadoExtra =
          String(
            extra.estado_pago || ""
          ).toLowerCase();

        return {
          id: `extra-${extra.id_extra}`,

          id_pago: null,

          id_extra:
            extra.id_extra,

          tipo: "extra",

          titulo:
            extra.tipo_extra
              ? `Cargo extra · ${extra.tipo_extra}`
              : "Cargo extra",

          descripcion:
            extra.descripcion ||
            "Cargo adicional",

          estado:
            estadoExtra === "pagado"
              ? "pagado"
              : "pendiente",

          fecha:
            extra.fecha_registro,

          tipo_pago: null,

          monto_base:
            Number(extra.monto || 0),

          tax_monto: 0,

          total_cobrado:
            estadoExtra === "pagado"
              ? Number(extra.monto || 0)
              : 0,
        };
      }),
  ].sort((a, b) => {
    const fechaA = new Date(
      a.fecha || 0
    ).getTime();

    const fechaB = new Date(
      b.fecha || 0
    ).getTime();

    // Más reciente primero
    if (fechaB !== fechaA) {
      return fechaB - fechaA;
    }

    return String(b.id).localeCompare(
      String(a.id)
    );
  });

  const abrirModalAnularExtra = (
    extra
  ) => {
    if (!extra?.id_extra) {
      showError(
        "No se pudo identificar el cargo extra"
      );
      return;
    }

    const estadoExtra = String(
      extra.estado_pago || ""
    ).toLowerCase();

    if (estadoExtra === "pagado") {
      showError(
        "No se puede anular un cargo extra pagado"
      );
      return;
    }

    if (estadoExtra === "anulado") {
      showError(
        "Este cargo extra ya está anulado"
      );
      return;
    }

    setExtraParaAnular(extra);
    setMotivoAnulacionExtra("");
    setModalAnularExtra(true);
  };

  const cerrarModalAnularExtra = () => {
    if (anulandoExtra) {
      return;
    }

    setModalAnularExtra(false);
    setExtraParaAnular(null);
    setMotivoAnulacionExtra("");
  };

  const confirmarAnulacionExtra =
    async () => {
      if (anulandoExtra) {
        return;
      }

      const idExtra = Number(
        extraParaAnular?.id_extra
      );

      const idRenta = Number(
        rentaDetalle?.id_renta
      );

      const motivo =
        motivoAnulacionExtra.trim();

      if (
        !Number.isInteger(idExtra) ||
        idExtra <= 0
      ) {
        showError(
          "No se pudo identificar el cargo extra"
        );
        return;
      }

      if (
        !Number.isInteger(idRenta) ||
        idRenta <= 0
      ) {
        showError(
          "No se pudo identificar la renta"
        );
        return;
      }

      if (motivo.length < 3) {
        showError(
          "Ingrese el motivo de la anulación"
        );
        return;
      }

      if (motivo.length > 500) {
        showError(
          "El motivo no puede superar los 500 caracteres"
        );
        return;
      }

      setAnulandoExtra(true);

      try {
        const respuesta =
          await anularExtraRenta(
            idExtra,
            motivo
          );

        /*
        * Primero cerramos el modal porque el backend
        * ya confirmó la operación.
        */
        setModalAnularExtra(false);
        setExtraParaAnular(null);
        setMotivoAnulacionExtra("");

        showSuccess(
          respuesta?.msg ||
            "Cargo extra anulado correctamente"
        );

        /*
        * Refrescar solamente el modal de la renta.
        */
        try {
          await refrescarDetalleRenta(
            idRenta
          );
        } catch (refreshError) {
          console.error(
            "El extra se anuló, pero no se pudo refrescar el detalle:",
            refreshError
          );

          showError(
            "El cargo fue anulado, pero no se pudo actualizar la vista. Cierre y vuelva a abrir la renta."
          );
        }

        /*
        * Actualizar también el listado general sin
        * confundir un fallo de refresco con un fallo
        * de anulación.
        */
        try {
          await cargarDatos();
        } catch (refreshError) {
          console.error(
            "Error actualizando el listado:",
            refreshError
          );
        }
      } catch (error) {
        console.error(
          "Error anulando cargo extra:",
          error
        );

        showError(
          error.response?.data?.msg ||
            error.response?.data?.message ||
            "No se pudo anular el cargo extra"
        );
      } finally {
        setAnulandoExtra(false);
      }
    };
  
  const formatFechaHoraInput = (
    valor
  ) => {
    if (!valor) {
      return "";
    }

    const fecha = new Date(valor);

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return "";
    }

    const year =
      fecha.getFullYear();

    const month = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      fecha.getDate()
    ).padStart(2, "0");

    const hours = String(
      fecha.getHours()
    ).padStart(2, "0");

    const minutes = String(
      fecha.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };  

  const calcularHorasFormulario = (
  inicio,
  fin
) => {
  if (!inicio || !fin) {
    return 0;
  }

  const fechaInicio =
    new Date(inicio);

  const fechaFin =
    new Date(fin);

  if (
    Number.isNaN(
      fechaInicio.getTime()
    ) ||
    Number.isNaN(
      fechaFin.getTime()
    )
  ) {
    return 0;
  }

  const diferencia =
    fechaFin.getTime() -
    fechaInicio.getTime();

  if (diferencia <= 0) {
    return 0;
  }

  return Number(
    (
      diferencia /
      (1000 * 60 * 60)
    ).toFixed(2)
  );
};

const horasEntregaVista =
  calcularHorasFormulario(
    costoEntregaForm.hora_inicio,
    costoEntregaForm.hora_fin
  );

const costoEntregaVista =
  Number(
    (
      horasEntregaVista *
      tarifaCostoHora
    ).toFixed(2)
  );

const horasRetiroVista =
  calcularHorasFormulario(
    costoRetiroForm.hora_inicio,
    costoRetiroForm.hora_fin
  );

const costoRetiroOperativoVista =
  Number(
    (
      horasRetiroVista *
      tarifaCostoHora
    ).toFixed(2)
  );

const costoDisposicionVista =
  Number(
    costoRetiroForm
      .costo_disposicion || 0
  );

const costoRetiroTotalVista =
  Number(
    (
      costoRetiroOperativoVista +
      costoDisposicionVista
    ).toFixed(2)
  ); 

  const guardarCostoEntrega =
  async (e) => {
    e.preventDefault();

    if (!canEditRenta) {
      showError(
        "No tiene permiso para registrar costos"
      );
      return;
    }

    if (
      !rentaDetalle?.id_renta
    ) {
      showError(
        "No se pudo identificar la renta"
      );
      return;
    }

    if (
      !costoEntregaForm.hora_inicio ||
      !costoEntregaForm.hora_fin
    ) {
      showError(
        "Ingrese la hora de inicio y finalización"
      );
      return;
    }

    if (horasEntregaVista <= 0) {
      showError(
        "La hora final debe ser posterior a la hora inicial"
      );
      return;
    }

    try {
      setGuardandoCosto(
        "entrega"
      );

      const respuesta =
        await guardarCostoRenta(
          rentaDetalle.id_renta,
          {
            tipo_operacion:
              "entrega",

            hora_inicio:
              costoEntregaForm
                .hora_inicio,

            hora_fin:
              costoEntregaForm
                .hora_fin,

            observaciones:
              costoEntregaForm
                .observaciones,
          }
        );

      showSuccess(
        respuesta?.msg ||
          "Costo de entrega guardado"
      );

      await cargarCostosRenta(
        rentaDetalle.id_renta
      );
    } catch (error) {
      showError(
        error.response?.data?.msg ||
          "No se pudo guardar el costo de entrega"
      );
    } finally {
      setGuardandoCosto(null);
    }
  };
const guardarCostoRetiro =
  async (e) => {
    e.preventDefault();

    if (!canEditRenta) {
      showError(
        "No tiene permiso para registrar costos"
      );
      return;
    }

    if (
      !rentaDetalle?.id_renta
    ) {
      showError(
        "No se pudo identificar la renta"
      );
      return;
    }

    if (
      !costoRetiroForm.hora_inicio ||
      !costoRetiroForm.hora_fin
    ) {
      showError(
        "Ingrese la hora de inicio y finalización"
      );
      return;
    }

    if (horasRetiroVista <= 0) {
      showError(
        "La hora final debe ser posterior a la hora inicial"
      );
      return;
    }

    if (
      Number(
        costoRetiroForm
          .costo_disposicion || 0
      ) < 0
    ) {
      showError(
        "El costo de disposición no puede ser negativo"
      );
      return;
    }

    try {
      setGuardandoCosto(
        "retiro"
      );

      const respuesta =
        await guardarCostoRenta(
          rentaDetalle.id_renta,
          {
            tipo_operacion:
              "retiro",

            hora_inicio:
              costoRetiroForm
                .hora_inicio,

            hora_fin:
              costoRetiroForm
                .hora_fin,

            lugar_disposicion:
              costoRetiroForm
                .lugar_disposicion,

            numero_ticket:
              costoRetiroForm
                .numero_ticket,

            costo_disposicion:
              Number(
                costoRetiroForm
                  .costo_disposicion ||
                  0
              ),

            observaciones:
              costoRetiroForm
                .observaciones,
          }
        );

      showSuccess(
        respuesta?.msg ||
          "Costo de retiro guardado"
      );

      await cargarCostosRenta(
        rentaDetalle.id_renta
      );
    } catch (error) {
      showError(
        error.response?.data?.msg ||
          "No se pudo guardar el costo de retiro"
      );
    } finally {
      setGuardandoCosto(null);
    }
  };

  const costoEntregaRegistrado =
  costosRenta.find(
    (item) =>
      String(
        item.tipo_operacion || ""
      ).toLowerCase() === "entrega"
  ) || null;

const costoRetiroRegistrado =
  costosRenta.find(
    (item) =>
      String(
        item.tipo_operacion || ""
      ).toLowerCase() === "retiro"
  ) || null;


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
                    ["costos", t("rentals.operation_costs_tab"),Calculator, true,
],
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
                              conceptosPago.map((item) => {
                                const esExtra =
                                  item.tipo === "extra";

                                const extraCompleto = esExtra
                                  ? extrasDetalle.find(
                                      (extra) =>
                                        Number(extra.id_extra) ===
                                        Number(item.id_extra)
                                    )
                                  : null;

                                const estadoExtra = String(
                                  extraCompleto?.estado_pago ||
                                    item.estado_pago ||
                                    ""
                                )
                                  .trim()
                                  .toLowerCase();

                                const puedeAnularExtra =
                                  esExtra &&
                                  estadoExtra === "pendiente" &&
                                  canEditRenta &&
                                  !rentaBloqueada;

                                return (
                                  <div
                                    key={item.id}
                                    className={`
                                      flex items-center gap-3
                                      border-b px-3 py-3
                                      transition-colors
                                      ${
                                        conceptosSeleccionados.includes(
                                          item.id
                                        )
                                          ? "bg-blue-50"
                                          : "bg-white hover:bg-slate-50"
                                      }
                                    `}
                                  >
                                    {/* CONCEPTO SELECCIONABLE */}
                                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={conceptosSeleccionados.includes(
                                          item.id
                                        )}
                                        onChange={() =>
                                          toggleConceptoPago(item.id)
                                        }
                                        disabled={
                                          !canEditRenta ||
                                          rentaBloqueada ||
                                          saldoActualDetalle <= 0
                                        }
                                        className="
                                          h-4 w-4 rounded
                                          border-slate-300
                                          text-blue-600
                                          focus:ring-blue-500
                                          disabled:cursor-not-allowed
                                        "
                                      />

                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-slate-800">
                                            {esExtra
                                              ? t("extra")
                                              : t("rental")}
                                          </span>

                                          {esExtra && (
                                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                              {extraCompleto?.tipo_extra ||
                                                "Cargo extra"}
                                            </span>
                                          )}
                                        </div>

                                        <p className="mt-0.5 truncate text-sm text-slate-700">
                                          {item.descripcion}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {item.detalle}
                                        </p>
                                      </div>
                                    </label>

                                    {/* MONTO Y ACCIONES */}
                                    <div className="flex shrink-0 items-center gap-3">
                                      <strong
                                        className={
                                          esExtra
                                            ? "text-blue-700"
                                            : saldoActualDetalle > 0
                                              ? "text-red-600"
                                              : "text-green-700"
                                        }
                                      >
                                        $
                                        {Number(
                                          item.total || 0
                                        ).toFixed(2)}
                                      </strong>

                                      {puedeAnularExtra && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();

                                            if (!extraCompleto) {
                                              showError(
                                                "No se pudo identificar el cargo extra"
                                              );
                                              return;
                                            }

                                            abrirModalAnularExtra(
                                              extraCompleto
                                            );
                                          }}
                                          className="
                                            inline-flex items-center
                                            gap-1.5 rounded-lg
                                            border border-red-200
                                            bg-red-50 px-3 py-1.5
                                            text-xs font-semibold
                                            text-red-700
                                            transition-colors
                                            hover:border-red-300
                                            hover:bg-red-100
                                          "
                                          title="Anular cargo extra"
                                        >
                                          <Ban size={14} />
                                          Anular
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
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

                  {tabDetalle === "costos" && (
                    <div className="space-y-4">
                      {cargandoCostos ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                          {t(
                            "rentals.operation_costs_loading"
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          {/* ==================================================
                              ENTREGA
                          ================================================== */}

                          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                                  <Truck size={18} />
                                </div>

                                <div>
                                  <h3 className="font-bold text-blue-900">
                                    {t(
                                      "rentals.delivery_operation_title"
                                    )}
                                  </h3>

                                  <p className="text-xs text-blue-700">
                                    {t(
                                      "rentals.delivery_operation_description"
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {costoEntregaRegistrado ? (
                              <div className="space-y-4 p-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <div className="flex items-start gap-3">
                                    <CheckCircle
                                      size={20}
                                      className="mt-0.5 shrink-0 text-emerald-600"
                                    />

                                    <div>
                                      <p className="font-bold text-emerald-800">
                                        {t(
                                          "rentals.delivery_registered_title"
                                        )}
                                      </p>

                                      <p className="mt-1 text-sm text-emerald-700">
                                        {t(
                                          "rentals.delivery_registered_message"
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="divide-y rounded-xl border border-slate-200">
                                  <div className="grid grid-cols-[130px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_start"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {new Date(
                                        costoEntregaRegistrado.hora_inicio
                                      ).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[130px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_end"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {new Date(
                                        costoEntregaRegistrado.hora_fin
                                      ).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[130px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_time"
                                      )}
                                      :
                                    </strong>

                                    <span className="font-semibold text-blue-700">
                                      {Number(
                                        costoEntregaRegistrado.horas_operacion ||
                                          0
                                      ).toFixed(2)}{" "}
                                      {t(
                                        "rentals.operation_hours"
                                      )}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[130px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_notes"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {costoEntregaRegistrado.observaciones ||
                                        "-"}
                                    </span>
                                  </div>
                                </div>

                                {costoEntregaRegistrado.registrado_por_nombre && (
                                  <p className="text-center text-xs text-slate-400">
                                    {t(
                                      "rentals.operation_registered_by"
                                    )}{" "}
                                    {
                                      costoEntregaRegistrado.registrado_por_nombre
                                    }
                                  </p>
                                )}
                              </div>
                            ) : (
                              <form
                                onSubmit={
                                  guardarCostoEntrega
                                }
                                className="space-y-4 p-4"
                              >
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.delivery_start"
                                      )}
                                    </label>

                                    <input
                                      type="datetime-local"
                                      value={
                                        costoEntregaForm.hora_inicio
                                      }
                                      onChange={(e) =>
                                        setCostoEntregaForm(
                                          (prev) => ({
                                            ...prev,
                                            hora_inicio:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "entrega"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.delivery_end"
                                      )}
                                    </label>

                                    <input
                                      type="datetime-local"
                                      value={
                                        costoEntregaForm.hora_fin
                                      }
                                      onChange={(e) =>
                                        setCostoEntregaForm(
                                          (prev) => ({
                                            ...prev,
                                            hora_fin:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "entrega"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                      required
                                    />
                                  </div>
                                </div>

                                {horasEntregaVista >
                                  0 && (
                                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                                    {t(
                                      "rentals.delivery_time_registered"
                                    )}
                                    :{" "}
                                    <strong>
                                      {horasEntregaVista.toFixed(
                                        2
                                      )}{" "}
                                      {t(
                                        "rentals.operation_hours"
                                      )}
                                    </strong>
                                  </div>
                                )}

                                <div>
                                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                                    {t(
                                      "rentals.operation_notes"
                                    )}
                                  </label>

                                  <textarea
                                    rows={3}
                                    maxLength={500}
                                    value={
                                      costoEntregaForm.observaciones
                                    }
                                    onChange={(e) =>
                                      setCostoEntregaForm(
                                        (prev) => ({
                                          ...prev,
                                          observaciones:
                                            e.target.value,
                                        })
                                      )
                                    }
                                    placeholder={t(
                                      "rentals.delivery_notes_placeholder"
                                    )}
                                    disabled={
                                      !canEditRenta ||
                                      rentaDetalle?.estado ===
                                        "cancelado" ||
                                      guardandoCosto ===
                                        "entrega"
                                    }
                                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                  />
                                </div>

                                {canEditRenta &&
                                  rentaDetalle?.estado !==
                                    "cancelado" && (
                                    <button
                                      type="submit"
                                      disabled={
                                        guardandoCosto ===
                                          "entrega" ||
                                        horasEntregaVista <= 0
                                      }
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Save size={17} />

                                      {guardandoCosto ===
                                      "entrega"
                                        ? t(
                                            "rentals.operation_saving"
                                          )
                                        : t(
                                            "rentals.delivery_register_button"
                                          )}
                                    </button>
                                  )}
                              </form>
                            )}
                          </section>

                          {/* ==================================================
                              RETIRO
                          ================================================== */}

                          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-orange-200 bg-orange-50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-orange-100 p-2 text-orange-700">
                                  <Landmark size={18} />
                                </div>

                                <div>
                                  <h3 className="font-bold text-orange-900">
                                    {t(
                                      "rentals.pickup_operation_title"
                                    )}
                                  </h3>

                                  <p className="text-xs text-orange-700">
                                    {t(
                                      "rentals.pickup_operation_description"
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {costoRetiroRegistrado ? (
                              <div className="space-y-4 p-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <div className="flex items-start gap-3">
                                    <CheckCircle
                                      size={20}
                                      className="mt-0.5 shrink-0 text-emerald-600"
                                    />

                                    <div>
                                      <p className="font-bold text-emerald-800">
                                        {t(
                                          "rentals.pickup_registered_title"
                                        )}
                                      </p>

                                      <p className="mt-1 text-sm text-emerald-700">
                                        {t(
                                          "rentals.pickup_registered_message"
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="divide-y rounded-xl border border-slate-200">
                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_start"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {new Date(
                                        costoRetiroRegistrado.hora_inicio
                                      ).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_end"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {new Date(
                                        costoRetiroRegistrado.hora_fin
                                      ).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_time"
                                      )}
                                      :
                                    </strong>

                                    <span className="font-semibold text-orange-700">
                                      {Number(
                                        costoRetiroRegistrado.horas_operacion ||
                                          0
                                      ).toFixed(2)}{" "}
                                      {t(
                                        "rentals.operation_hours"
                                      )}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_disposal"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {costoRetiroRegistrado.lugar_disposicion ||
                                        "-"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_ticket"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {costoRetiroRegistrado.numero_ticket ||
                                        "-"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_amount_paid"
                                      )}
                                      :
                                    </strong>

                                    <span className="font-semibold text-slate-800">
                                      $
                                      {Number(
                                        costoRetiroRegistrado.costo_disposicion ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[140px_1fr] px-3 py-2.5">
                                    <strong className="text-slate-600">
                                      {t(
                                        "rentals.operation_notes"
                                      )}
                                      :
                                    </strong>

                                    <span className="text-slate-800">
                                      {costoRetiroRegistrado.observaciones ||
                                        "-"}
                                    </span>
                                  </div>
                                </div>

                                {costoRetiroRegistrado.registrado_por_nombre && (
                                  <p className="text-center text-xs text-slate-400">
                                    {t(
                                      "rentals.operation_registered_by"
                                    )}{" "}
                                    {
                                      costoRetiroRegistrado.registrado_por_nombre
                                    }
                                  </p>
                                )}
                              </div>
                            ) : (
                              <form
                                onSubmit={
                                  guardarCostoRetiro
                                }
                                className="space-y-4 p-4"
                              >
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.pickup_start"
                                      )}
                                    </label>

                                    <input
                                      type="datetime-local"
                                      value={
                                        costoRetiroForm.hora_inicio
                                      }
                                      onChange={(e) =>
                                        setCostoRetiroForm(
                                          (prev) => ({
                                            ...prev,
                                            hora_inicio:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "retiro"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.pickup_end"
                                      )}
                                    </label>

                                    <input
                                      type="datetime-local"
                                      value={
                                        costoRetiroForm.hora_fin
                                      }
                                      onChange={(e) =>
                                        setCostoRetiroForm(
                                          (prev) => ({
                                            ...prev,
                                            hora_fin:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "retiro"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                      required
                                    />
                                  </div>
                                </div>

                                {horasRetiroVista >
                                  0 && (
                                  <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-700">
                                    {t(
                                      "rentals.pickup_time_registered"
                                    )}
                                    :{" "}
                                    <strong>
                                      {horasRetiroVista.toFixed(
                                        2
                                      )}{" "}
                                      {t(
                                        "rentals.operation_hours"
                                      )}
                                    </strong>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.disposal_location"
                                      )}
                                    </label>

                                    <input
                                      type="text"
                                      maxLength={150}
                                      value={
                                        costoRetiroForm.lugar_disposicion
                                      }
                                      onChange={(e) =>
                                        setCostoRetiroForm(
                                          (prev) => ({
                                            ...prev,
                                            lugar_disposicion:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      placeholder={t(
                                        "rentals.disposal_location_placeholder"
                                      )}
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "retiro"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                                      {t(
                                        "rentals.ticket_number"
                                      )}
                                    </label>

                                    <input
                                      type="text"
                                      maxLength={100}
                                      value={
                                        costoRetiroForm.numero_ticket
                                      }
                                      onChange={(e) =>
                                        setCostoRetiroForm(
                                          (prev) => ({
                                            ...prev,
                                            numero_ticket:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      placeholder={t(
                                        "rentals.ticket_number_placeholder"
                                      )}
                                      disabled={
                                        !canEditRenta ||
                                        rentaDetalle?.estado ===
                                          "cancelado" ||
                                        guardandoCosto ===
                                          "retiro"
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                                    {t(
                                      "rentals.disposal_amount"
                                    )}
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                      costoRetiroForm.costo_disposicion
                                    }
                                    onChange={(e) =>
                                      setCostoRetiroForm(
                                        (prev) => ({
                                          ...prev,
                                          costo_disposicion:
                                            e.target.value,
                                        })
                                      )
                                    }
                                    placeholder="0.00"
                                    disabled={
                                      !canEditRenta ||
                                      rentaDetalle?.estado ===
                                        "cancelado" ||
                                      guardandoCosto ===
                                        "retiro"
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                                    {t(
                                      "rentals.operation_notes"
                                    )}
                                  </label>

                                  <textarea
                                    rows={3}
                                    maxLength={500}
                                    value={
                                      costoRetiroForm.observaciones
                                    }
                                    onChange={(e) =>
                                      setCostoRetiroForm(
                                        (prev) => ({
                                          ...prev,
                                          observaciones:
                                            e.target.value,
                                        })
                                      )
                                    }
                                    placeholder={t(
                                      "rentals.pickup_notes_placeholder"
                                    )}
                                    disabled={
                                      !canEditRenta ||
                                      rentaDetalle?.estado ===
                                        "cancelado" ||
                                      guardandoCosto ===
                                        "retiro"
                                    }
                                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                  />
                                </div>

                                {canEditRenta &&
                                  rentaDetalle?.estado !==
                                    "cancelado" && (
                                    <button
                                      type="submit"
                                      disabled={
                                        guardandoCosto ===
                                          "retiro" ||
                                        horasRetiroVista <= 0
                                      }
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Save size={17} />

                                      {guardandoCosto ===
                                      "retiro"
                                        ? t(
                                            "rentals.operation_saving"
                                          )
                                        : t(
                                            "rentals.pickup_register_button"
                                          )}
                                    </button>
                                  )}
                              </form>
                            )}
                          </section>
                        </div>
                      )}
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
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {/* ENCABEZADO */}
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <History
                            size={18}
                            className="text-slate-500"
                          />

                          <h3 className="font-semibold text-slate-800">
                            Movimientos
                          </h3>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Pagos y cargos ordenados del más reciente al más antiguo.
                        </p>
                      </div>

                      {/* SIN MOVIMIENTOS */}
                      {movimientosSimples.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <History
                            size={32}
                            className="mx-auto mb-3 text-slate-300"
                          />

                          <p className="text-sm font-semibold text-slate-600">
                            No hay movimientos registrados
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Los pagos y cargos adicionales aparecerán aquí.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-slate-50/60 p-3">
                          {movimientosSimples.map((movimiento, index) => {
                            const numeroMovimiento =
                              movimientosSimples.length - index;

                            const esExtra =
                              movimiento.tipo === "extra";

                            const estaPagado =
                              movimiento.estado === "pagado";

                              const tipoPago =
                                String(
                                  movimiento.tipo_pago || ""
                                ).toLowerCase();

                              const nombreMetodo =
                                tipoPago === "cash"
                                  ? "Efectivo"
                                  : tipoPago === "card"
                                    ? "Tarjeta"
                                    : tipoPago ===
                                        "transfer"
                                      ? "Transferencia"
                                      : null;

                              return (
                                <article
                                  key={movimiento.id}
                                  className="
                                    rounded-xl border
                                    border-slate-200
                                    bg-white p-4
                                    shadow-sm
                                  "
                                >
                                  {/* FILA PRINCIPAL */}
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                      {/* ICONO */}
                                      <div
                                        className={`
                                          flex h-9 w-9 shrink-0
                                          items-center justify-center
                                          rounded-lg
                                          ${
                                            esExtra
                                              ? "bg-orange-100 text-orange-700"
                                              : "bg-blue-100 text-blue-700"
                                          }
                                        `}
                                      >
                                        {esExtra ? (
                                          <PlusCircle size={17} />
                                        ) : (
                                          <DollarSign size={17} />
                                        )}
                                      </div>

                                      {/* INFORMACIÓN */}
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                                            Pago #{numeroMovimiento}
                                          </span>

                                          <h4 className="font-semibold text-slate-800">
                                            {movimiento.titulo}
                                          </h4>

                                          <span
                                            className={`
                                              inline-flex rounded-full
                                              px-2.5 py-1
                                              text-xs font-semibold
                                              ${
                                                estaPagado
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }
                                            `}
                                          >
                                            {estaPagado
                                              ? "Pago realizado"
                                              : "Pago pendiente"}
                                          </span>
                                        </div>

                                        <p className="mt-1 text-sm text-slate-500">
                                          {movimiento.descripcion}
                                        </p>
                                      </div>
                                    </div>

                                    {/* MONTO PRINCIPAL */}
                                    <div className="shrink-0 text-right">
                                      <p className="text-xs text-slate-400">
                                        {estaPagado
                                          ? "Cobrado"
                                          : "Pendiente"}
                                      </p>

                                      <p
                                        className={`
                                          mt-1 text-lg font-bold
                                          ${
                                            estaPagado
                                              ? "text-emerald-700"
                                              : "text-amber-700"
                                          }
                                        `}
                                      >
                                        $
                                        {estaPagado
                                          ? Number(
                                              movimiento.total_cobrado ||
                                                movimiento.monto_base ||
                                                0
                                            ).toFixed(2)
                                          : Number(
                                              movimiento.monto_base ||
                                                0
                                            ).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* DETALLES PEQUEÑOS */}
                                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <span>
                                      <strong className="font-medium text-slate-600">
                                        Fecha:
                                      </strong>{" "}
                                      {formatFecha(
                                        movimiento.fecha
                                      )}
                                    </span>

                                    {estaPagado &&
                                      nombreMetodo && (
                                        <span>
                                          <strong className="font-medium text-slate-600">
                                            Método:
                                          </strong>{" "}
                                          {nombreMetodo}
                                        </span>
                                      )}

                                    {estaPagado &&
                                      Number(
                                        movimiento.tax_monto ||
                                          0
                                      ) > 0 && (
                                        <span>
                                          <strong className="font-medium text-slate-600">
                                            Base:
                                          </strong>{" "}
                                          $
                                          {Number(
                                            movimiento.monto_base ||
                                              0
                                          ).toFixed(2)}
                                        </span>
                                      )}

                                    {estaPagado &&
                                      Number(
                                        movimiento.tax_monto ||
                                          0
                                      ) > 0 && (
                                        <span className="text-blue-700">
                                          <strong className="font-medium">
                                            Tax:
                                          </strong>{" "}
                                          $
                                          {Number(
                                            movimiento.tax_monto ||
                                              0
                                          ).toFixed(2)}
                                        </span>
                                      )}
                                  </div>
                                </article>
                              );
                            }
                          )}
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
                          onClick={abrirModalCancelarRenta}
                          disabled={procesandoOperacion}
                          className="
                            inline-flex items-center gap-2
                            px-4 py-2
                            bg-red-100 text-red-700
                            rounded-lg
                            hover:bg-red-200
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                          "
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
                          onClick={abrirModalFinalizarRenta}
                          disabled={procesandoOperacion}
                          className="
                            inline-flex items-center gap-2
                            px-4 py-2
                            bg-green-600 text-white
                            rounded-lg
                            hover:bg-green-700
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                          "
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

                  <button
                    type="button"
                    onClick={() => enviarReciboEmail(rentaDetalle)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Send size={16} />
                    {t("send_email")}
                  </button>

                </div>
              </div>
            </div>
          );
        })()}
      </div>


      {modalCancelarRenta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Ban size={20} className="text-red-600" />
                  Cancelar renta
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Renta #{rentaDetalle?.id_renta || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (procesandoOperacion) return;
                  setModalCancelarRenta(false);
                  setMotivoCancelacion("");
                }}
                disabled={procesandoOperacion}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                  <div>
                    <p className="font-semibold text-red-800">
                      Esta acción cancelará la renta
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      El dumpster volverá a estar disponible y los pagos
                      asociados serán anulados.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="motivo_cancelacion"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Motivo de cancelación
                  <span className="text-red-600"> *</span>
                </label>

                <textarea
                  id="motivo_cancelacion"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  rows={4}
                  maxLength={500}
                  autoFocus
                  placeholder="Ejemplo: El cliente canceló el servicio..."
                  disabled={procesandoOperacion}
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
                />

                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Mínimo 3 caracteres
                  </span>
                  <span className="text-slate-400">
                    {motivoCancelacion.length}/500
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setModalCancelarRenta(false);
                  setMotivoCancelacion("");
                }}
                disabled={procesandoOperacion}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={confirmarCancelacionRenta}
                disabled={
                  procesandoOperacion ||
                  motivoCancelacion.trim().length < 3
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesandoOperacion ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Ban size={16} />
                    Confirmar cancelación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFinalizarRenta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <CheckCircle size={21} className="text-green-600" />
                Finalizar renta
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!procesandoOperacion) {
                    setModalFinalizarRenta(false);
                  }
                }}
                disabled={procesandoOperacion}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  ¿Confirmas que el servicio fue completado?
                </p>
                <p className="mt-2 text-sm text-green-700">
                  Se finalizará la renta #{rentaDetalle?.id_renta || "-"} y el
                  dumpster{" "}
                  <strong>{rentaDetalle?.dumpster_codigo || "-"}</strong>{" "}
                  volverá a estar disponible.
                </p>
              </div>

              {Number(rentaDetalle?.saldo_pendiente || 0) > 0 && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle
                      size={20}
                      className="shrink-0 text-orange-600"
                    />
                    <div>
                      <p className="font-semibold text-orange-800">
                        Existe saldo pendiente
                      </p>
                      <p className="mt-1 text-sm text-orange-700">
                        Saldo actual:{" "}
                        <strong>
                          $
                          {Number(
                            rentaDetalle?.saldo_pendiente || 0
                          ).toFixed(2)}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalFinalizarRenta(false)}
                disabled={procesandoOperacion}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={confirmarFinalizacionRenta}
                disabled={procesandoOperacion}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesandoOperacion ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Finalizar renta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAnularExtra &&
        extraParaAnular && (
          <div
            className="
              fixed inset-0 z-[80]
              flex items-center
              justify-center
              bg-slate-950/55
              p-4
              backdrop-blur-[2px]
            "
          >
            <div
              className="
                w-full max-w-md
                overflow-hidden
                rounded-2xl
                bg-white
                shadow-2xl
              "
            >
              {/* HEADER */}
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Anular cargo extra
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      El cargo permanecerá en el historial como anulado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      cerrarModalAnularExtra
                    }
                    disabled={anulandoExtra}
                    className="
                      rounded-lg p-2
                      text-slate-400
                      hover:bg-slate-100
                      hover:text-slate-700
                      disabled:opacity-40
                    "
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* CONTENIDO */}
              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-red-900">
                        {extraParaAnular.tipo_extra ||
                          "Cargo extra"}
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        {extraParaAnular.descripcion ||
                          "Sin descripción"}
                      </p>
                    </div>

                    <p className="shrink-0 text-lg font-bold text-red-800">
                      $
                      {Number(
                        extraParaAnular.monto ||
                          0
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="motivo-anulacion-extra"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Motivo de la anulación
                  </label>

                  <textarea
                    id="motivo-anulacion-extra"
                    rows={4}
                    maxLength={500}
                    autoFocus
                    value={
                      motivoAnulacionExtra
                    }
                    onChange={(e) =>
                      setMotivoAnulacionExtra(
                        e.target.value
                      )
                    }
                    placeholder="Ejemplo: cargo registrado por error"
                    className="
                      w-full resize-none
                      rounded-xl border
                      border-slate-300
                      px-3 py-2.5
                      text-sm text-slate-800
                      outline-none
                      transition
                      focus:border-red-400
                      focus:ring-2
                      focus:ring-red-100
                    "
                  />

                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Mínimo 3 caracteres
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        motivoAnulacionExtra.length
                      }
                      /500
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  El monto será retirado del total y del saldo pendiente de la renta.
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                <button
                  type="button"
                  onClick={
                    cerrarModalAnularExtra
                  }
                  disabled={anulandoExtra}
                  className="
                    rounded-lg border
                    border-slate-300
                    bg-white px-4 py-2
                    text-sm font-semibold
                    text-slate-700
                    hover:bg-slate-100
                    disabled:opacity-50
                  "
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={
                    confirmarAnulacionExtra
                  }
                  disabled={
                    anulandoExtra ||
                    motivoAnulacionExtra.trim()
                      .length < 3
                  }
                  className="
                    inline-flex items-center
                    gap-2 rounded-lg
                    bg-red-600 px-4 py-2
                    text-sm font-semibold
                    text-white
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <Ban size={16} />

                  {anulandoExtra
                    ? "Anulando..."
                    : "Confirmar anulación"}
                </button>
              </div>
            </div>
          </div>
        )}


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

