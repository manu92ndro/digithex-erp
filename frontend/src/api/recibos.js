import { API_URL } from "../config/config";

export const abrirReciboRenta = async (idRenta) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Token not found");
  }

  const response = await fetch(`${API_URL}/recibos-pdf/rentas/${idRenta}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Error opening receipt";

    try {
      const errorData = await response.json();
      message = errorData.msg || errorData.message || message;
    } catch {}

    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  window.open(url, "_blank");

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 10000);
};

// =============================================
// ENVIAR RECIBO POR EMAIL
// =============================================
export const enviarReciboCorreo = async (idRenta, correo = null) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Token not found");
  }

  const response = await fetch(
    `${API_URL}/recibos-pdf/rentas/${idRenta}/email`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correo,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Error sending receipt");
  }

  return data;
};