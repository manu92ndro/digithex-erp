import Swal from "sweetalert2";

export const showSuccess = (message) => {
  return Swal.fire({
    icon: "success",
    title: message,
    timer: 1800,
    showConfirmButton: false
  });
};

export const showError = (message) => {
  return Swal.fire({
    icon: "error",
    title: message,
    confirmButtonText: "OK",
    allowOutsideClick: false,
    allowEscapeKey: true
  });
};

export const showConfirm = async (message) => {
  const result = await Swal.fire({
    icon: "warning",
    title: message,
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#64748b"
  });

  return result.isConfirmed;
};