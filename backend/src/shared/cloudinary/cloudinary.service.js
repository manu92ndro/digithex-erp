const cloudinary = require("./cloudinary.config");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const subirImagen = async ({
  rutaTemporal,
  carpeta,
  nombreArchivo,
  width,
  height = null,
  quality = 85,
}) => {
  // Archivo WebP temporal
  const rutaWebp = path.join(
    path.dirname(rutaTemporal),
    `${nombreArchivo}.webp`
  );

  // Optimizar imagen
  await sharp(rutaTemporal)
    .rotate()
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
    })
    .toFile(rutaWebp);

  // Subir a Cloudinary
  const resultado = await cloudinary.uploader.upload(rutaWebp, {
    folder: `digithex/${carpeta}`,
    public_id: nombreArchivo,
    overwrite: true,
    resource_type: "image",
  });

  // Eliminar archivos temporales
  if (fs.existsSync(rutaTemporal)) {
    fs.unlinkSync(rutaTemporal);
  }

  if (fs.existsSync(rutaWebp)) {
    fs.unlinkSync(rutaWebp);
  }

  return resultado;
};

// Eliminar imagen de Cloudinary
const eliminarImagen = async (publicId) => {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
};

module.exports = {
  subirImagen,
  eliminarImagen,
};