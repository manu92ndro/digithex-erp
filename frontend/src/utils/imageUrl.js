const FILES_URL =
  import.meta.env.VITE_FILES_URL || "http://localhost:3000";

export const getImageUrl = (imagen, carpeta) => {
  if (!imagen) return "";

  // Imagen subida a Cloudinary
  if (imagen.startsWith("http")) {
    return imagen;
  }

  // Compatibilidad con imágenes antiguas locales
  return `${FILES_URL}/uploads/${carpeta}/${imagen}`;
};