import { useEffect, useState } from "react";
import {
  Building2,
  Palette,
  Percent,
  FileText,
  ReceiptText,
  Bell,
  ShieldCheck,
  Save,
  Plus,
  Pencil,
  Ban,
  X,
  Mail,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import usePermission from "../hooks/usePermission";
import { showSuccess, showError } from "../utils/alerts";

import {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyQR,
  testCompanyEmail,
} from "../api/companySettings";

import {
  getImpuestos,
  createImpuesto,
  updateImpuesto,
  disableImpuesto,
} from "../api/impuestos";

const tabs = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "taxes", label: "Taxes", icon: Percent },
  { key: "agreement", label: "Rental Agreement", icon: FileText },
  { key: "receipt", label: "Receipt", icon: ReceiptText },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "security", label: "Security", icon: ShieldCheck },
];

const initialForm = {
  nombre_comercial: "",
  telefono: "",
  telefono_secundario: "",
  correo: "",
  website: "",
  direccion: "",
  color_primario: "#2563eb",
  color_secundario: "#0f172a",
  terminos_renta: "",
  politica_cancelacion: "",
  politica_danos: "",
  materiales_prohibidos: "",
  instrucciones_recibo: "",
  pie_recibo: "",
  mostrar_qr: false,
  qr_imagen: "",
  mostrar_firma_cliente: true,
  mostrar_firma_empresa: true,
  email_notificaciones: "",
  mensaje_email_recibo: "",
  sesion_minutos_inactividad: "30",
  idioma_default: "en",

  smtp_host: "",
  smtp_port: "465",
  smtp_secure: true,
  smtp_user: "",
  smtp_password: "",
  smtp_from_name: "",
  smtp_reply_to: "",

};

const initialTaxForm = {
  id_tax: null,
  nombre: "",
  tax_rate: "",
  activo: true,
};

export default function CompanySettings() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission("company_settings.editar");

  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);

  const [impuestos, setImpuestos] = useState([]);
  const [taxForm, setTaxForm] = useState(initialTaxForm);
  const [savingTax, setSavingTax] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const data = await getCompanySettings();
      const config = data.configuracion || {};

      setForm({
        ...initialForm,
        ...config,
        mostrar_qr: Number(config.mostrar_qr) === 1,
        mostrar_firma_cliente: Number(config.mostrar_firma_cliente) === 1,
        mostrar_firma_empresa: Number(config.mostrar_firma_empresa) === 1,
        sesion_minutos_inactividad: String(
          config.sesion_minutos_inactividad ?? "30"
        ),
        idioma_default: config.idioma_default || "en",
      });
    } catch (error) {
      showError(error.response?.data?.msg || "Error loading company settings");
    } finally {
      setLoading(false);
    }
  };

  const cargarImpuestos = async () => {
    try {
      const data = await getImpuestos();
      setImpuestos(data.impuestos || []);
    } catch (error) {
      showError(error.response?.data?.msg || "Error loading taxes");
    }
  };

  useEffect(() => {
    loadSettings();
    cargarImpuestos();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      showError("You do not have permission to edit company settings");
      return;
    }

    try {
      setSaving(true);

      await updateCompanySettings({
        ...form,
        sesion_minutos_inactividad: Number(
          form.sesion_minutos_inactividad || 30
        ),
      });

      showSuccess("Company settings saved successfully");
      await loadSettings();
    } catch (error) {
      showError(error.response?.data?.msg || "Error saving company settings");
    } finally {
      setSaving(false);
    }
  };
  const testEmailConnection = async () => {
    try {
      if (!canEdit) return;

      await updateCompanySettings({
        ...form,
        sesion_minutos_inactividad: Number(
          form.sesion_minutos_inactividad || 30
        ),
      });

      const data = await testCompanyEmail();

      showSuccess(data.msg || "Email connection successful");

      await loadSettings();
    } catch (error) {
      showError(
        error.response?.data?.error ||
          error.response?.data?.msg ||
          error.message ||
          "Email connection failed"
      );
    }
  };

  const handleUploadQR = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setSaving(true);

      const data = await uploadCompanyQR(file);

      setForm((prev) => ({
        ...prev,
        qr_imagen: data.qr_imagen,
        mostrar_qr: true,
      }));

      showSuccess("QR uploaded successfully");
    } catch (error) {
      showError(error.response?.data?.msg || "Error uploading QR");
    } finally {
      setSaving(false);
    }
  };

  const resetTaxForm = () => {
    setTaxForm(initialTaxForm);
  };

  const guardarImpuesto = async () => {
    if (!canEdit) {
      showError("You do not have permission to edit taxes");
      return;
    }

    if (!taxForm.nombre.trim()) {
      showError("Tax name is required");
      return;
    }

    if (taxForm.tax_rate === "" || Number.isNaN(Number(taxForm.tax_rate))) {
      showError("Tax rate is required");
      return;
    }

    try {
      setSavingTax(true);

      const payload = {
        nombre: taxForm.nombre.trim(),
        tax_rate: Number(taxForm.tax_rate || 0),
        activo: taxForm.activo,
      };

      if (taxForm.id_tax) {
        await updateImpuesto(taxForm.id_tax, payload);
        showSuccess("Tax updated successfully");
      } else {
        await createImpuesto(payload);
        showSuccess("Tax created successfully");
      }

      resetTaxForm();
      await cargarImpuestos();
    } catch (error) {
      showError(error.response?.data?.msg || "Error saving tax");
    } finally {
      setSavingTax(false);
    }
  };

  const editarImpuesto = (tax) => {
    setTaxForm({
      id_tax: tax.id_tax,
      nombre: tax.nombre || "",
      tax_rate: String(tax.tax_rate ?? ""),
      activo: Number(tax.activo) === 1,
    });
  };

  const desactivarTax = async (id_tax) => {
    if (!canEdit) return;

    try {
      setSavingTax(true);
      await disableImpuesto(id_tax);
      await cargarImpuestos();
      showSuccess("Tax disabled successfully");
    } catch (error) {
      showError(error.response?.data?.msg || "Error disabling tax");
    } finally {
      setSavingTax(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <div className="bg-white rounded-xl shadow p-5">
            Loading company settings...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Company Settings
            </h1>
            <p className="text-slate-500">
              Manage branding, taxes, receipts, terms and security settings.
            </p>
          </div>

          {!canEdit && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm">
              Read-only mode
            </div>
          )}
        </div>

        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl shadow overflow-hidden"
        >
          <div className="flex overflow-x-auto border-b bg-slate-50">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-r ${
                    activeTab === tab.key
                      ? "bg-white text-blue-700 border-t-2 border-t-blue-600"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === "company" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Company Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Commercial Name"
                    name="nombre_comercial"
                    value={form.nombre_comercial}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="Phone"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="Secondary Phone"
                    name="telefono_secundario"
                    value={form.telefono_secundario}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="Email"
                    name="correo"
                    value={form.correo}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="Website"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="https://www.company.com"
                  />

                  <Textarea
                    label="Address"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />
                </div>
              </section>
            )}

            {activeTab === "branding" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Branding
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Primary Color"
                    type="color"
                    name="color_primario"
                    value={form.color_primario}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="Secondary Color"
                    type="color"
                    name="color_secundario"
                    value={form.color_secundario}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-slate-500 mb-3">Preview</p>
                  <div
                    className="rounded-lg px-4 py-3 text-white font-semibold"
                    style={{ backgroundColor: form.color_primario }}
                  >
                    Primary Button / Receipt Header
                  </div>
                </div>
              </section>
            )}

            {activeTab === "taxes" && (
              <section className="space-y-5">
                <div>
                  <h2 className="font-semibold text-lg text-slate-800">
                    Taxes
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configure company taxes used by rentals. Example: 0.06625
                    equals 6.625%.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border rounded-2xl p-4">
                  <Input
                    label="Tax Name"
                    name="nombre"
                    value={taxForm.nombre}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        nombre: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    placeholder="IVA / Sales Tax"
                  />

                  <Input
                    label="Tax Rate"
                    name="tax_rate"
                    type="number"
                    step="0.00001"
                    value={taxForm.tax_rate}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        tax_rate: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    placeholder="0.06625"
                  />

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-slate-700 pb-3">
                      <input
                        type="checkbox"
                        checked={taxForm.activo}
                        onChange={(e) =>
                          setTaxForm((prev) => ({
                            ...prev,
                            activo: e.target.checked,
                          }))
                        }
                        disabled={!canEdit}
                      />
                      Active
                    </label>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={guardarImpuesto}
                      disabled={!canEdit || savingTax}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={16} />
                      {taxForm.id_tax ? "Update" : "Add"}
                    </button>

                    {taxForm.id_tax && (
                      <button
                        type="button"
                        onClick={resetTaxForm}
                        className="px-3 py-2 rounded-xl border hover:bg-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Rate</th>
                        <th className="text-left p-3">Percent</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {impuestos.map((tax) => (
                        <tr key={tax.id_tax} className="border-t">
                          <td className="p-3 font-medium">{tax.nombre}</td>
                          <td className="p-3">{tax.tax_rate}</td>
                          <td className="p-3">
                            {(Number(tax.tax_rate || 0) * 100).toFixed(3)}%
                          </td>
                          <td className="p-3">
                            {Number(tax.activo) === 1 ? (
                              <span className="text-green-600 font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => editarImpuesto(tax)}
                              disabled={!canEdit}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            {Number(tax.activo) === 1 && (
                              <button
                                type="button"
                                onClick={() => desactivarTax(tax.id_tax)}
                                disabled={!canEdit}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Ban size={14} />
                                Disable
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {impuestos.length === 0 && (
                        <tr>
                          <td
                            colSpan="5"
                            className="p-5 text-center text-slate-500"
                          >
                            No taxes registered
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "agreement" && (
              <section className="space-y-4">
                <h2 className="font-semibold text-lg text-slate-800">
                  Rental Agreement
                </h2>

                <Textarea
                  label="Terms and Conditions"
                  name="terminos_renta"
                  value={form.terminos_renta}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={8}
                  placeholder="Write the rental terms and conditions here..."
                />

                <Textarea
                  label="Cancellation Policy"
                  name="politica_cancelacion"
                  value={form.politica_cancelacion}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={5}
                  placeholder="Write cancellation policies here..."
                />

                <Textarea
                  label="Damage Policy"
                  name="politica_danos"
                  value={form.politica_danos}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={5}
                  placeholder="Customer is responsible for damages caused during the rental period..."
                />

                <Textarea
                  label="Prohibited Materials"
                  name="materiales_prohibidos"
                  value={form.materiales_prohibidos}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={5}
                  placeholder="Paint, oil, chemicals, tires, batteries, asbestos..."
                />

                <Textarea
                  label="Receipt Instructions"
                  name="instrucciones_recibo"
                  value={form.instrucciones_recibo}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={5}
                  placeholder="Special instructions printed on the receipt..."
                />
              </section>
            )}

            {activeTab === "receipt" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Receipt Settings
                </h2>

                <Textarea
                  label="Receipt Footer"
                  name="pie_recibo"
                  value={form.pie_recibo}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={4}
                  placeholder="Service areas, footer message, or receipt notes..."
                />

                <div className="space-y-3">
                  <Checkbox
                    label="Show QR Code"
                    name="mostrar_qr"
                    checked={form.mostrar_qr}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <div>
                    <label className="text-sm font-medium">
                      Upload QR Image
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleUploadQR}
                      disabled={!canEdit}
                      className="w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-slate-100"
                    />

                    {form.qr_imagen && (
                      <p className="text-xs text-slate-500 mt-1">
                        Current QR: {form.qr_imagen}
                      </p>
                    )}
                  </div>

                  <Checkbox
                    label="Show Customer Signature"
                    name="mostrar_firma_cliente"
                    checked={form.mostrar_firma_cliente}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Checkbox
                    label="Show Company Signature"
                    name="mostrar_firma_empresa"
                    checked={form.mostrar_firma_empresa}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />
                </div>
              </section>
            )}

            {activeTab === "notifications" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Notifications
                </h2>

                <Input
                  label="Notification Email"
                  name="email_notificaciones"
                  value={form.email_notificaciones}
                  onChange={handleChange}
                  disabled={!canEdit}
                />

                <Textarea
                  label="Receipt Email Message"
                  name="mensaje_email_recibo"
                  value={form.mensaje_email_recibo}
                  onChange={handleChange}
                  disabled={!canEdit}
                  rows={5}
                />
              </section>
            )}

            {activeTab === "email" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Email Settings
                </h2>

                <p className="text-sm text-slate-500">
                  Configure the SMTP account used to send receipts and notifications.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Host"
                    name="smtp_host"
                    value={form.smtp_host}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="smtp.gmail.com"
                  />

                  <Input
                    label="SMTP Port"
                    name="smtp_port"
                    type="number"
                    value={form.smtp_port}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="465"
                  />

                  <Checkbox
                    label="Use SSL / Secure Connection"
                    name="smtp_secure"
                    checked={form.smtp_secure}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <Input
                    label="SMTP User"
                    name="smtp_user"
                    value={form.smtp_user}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="info@company.com"
                  />

                  <Input
                    label="SMTP Password"
                    name="smtp_password"
                    type="password"
                    value={form.smtp_password}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="App password or SMTP password"
                  />

                  <Input
                    label="From Name"
                    name="smtp_from_name"
                    value={form.smtp_from_name}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="George Dumpster"
                  />

                  <Input
                    label="Reply To"
                    name="smtp_reply_to"
                    value={form.smtp_reply_to}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="info@company.com"
                  />
                </div>

                <button
                  type="button"
                  onClick={testEmailConnection}
                  disabled={!canEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Test Connection
                </button>
              </section>
            )}

            {activeTab === "security" && (
              <section className="space-y-4 max-w-3xl">
                <h2 className="font-semibold text-lg text-slate-800">
                  Security
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Inactivity Timeout Minutes"
                    type="number"
                    name="sesion_minutos_inactividad"
                    value={form.sesion_minutos_inactividad}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />

                  <div>
                    <label className="text-sm font-medium">
                      Default Language
                    </label>
                    <select
                      name="idioma_default"
                      value={form.idioma_default}
                      onChange={handleChange}
                      disabled={!canEdit}
                      className="w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-slate-100"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">
            <button
              type="submit"
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  disabled,
  type = "text",
  ...props
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-slate-100"
        {...props}
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  disabled,
  rows = 3,
  ...props
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className="w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-slate-100"
        {...props}
      />
    </div>
  );
}

function Checkbox({ label, name, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        name={name}
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="font-medium text-sm">{label}</span>
    </label>
  );
}