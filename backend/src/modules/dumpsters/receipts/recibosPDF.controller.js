const {
  generarReciboPDF,
} = require("./reciboPDF.service");

const getIdEmpresa = (req) => {
  return req.usuario.id_empresa;
};

const verReciboPDF = async (req, res) => {
  try {
    const id_renta = Number(req.params.id_renta);
    const id_empresa = Number(getIdEmpresa(req));

    // ===============================
    // Validaciones
    // ===============================

    if (!Number.isInteger(id_renta) || id_renta <= 0) {
      return res.status(400).json({
        ok: false,
        code: "ID_RENTA_INVALIDO",
        msg: "El ID de la renta no es válido",
      });
    }

    if (!Number.isInteger(id_empresa) || id_empresa <= 0) {
      return res.status(400).json({
        ok: false,
        code: "ID_EMPRESA_INVALIDO",
        msg: "No se pudo identificar la empresa",
      });
    }

    // ===============================
    // Idioma opcional
    // ===============================

    const idiomaSolicitado = String(
      req.query.lang || ""
    ).toLowerCase();

    const lang = ["es", "en"].includes(idiomaSolicitado)
      ? idiomaSolicitado
      : null;

    // ===============================
    // Generar PDF
    // ===============================

    const pdfBuffer = await generarReciboPDF(
      id_renta,
      id_empresa,
      lang
    );

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error(
        "El servicio no generó un PDF válido"
      );
    }

    // ===============================
    // Respuesta PDF
    // ===============================

    const numeroRecibo = String(id_renta).padStart(
      4,
      "0"
    );

    res.set({
      "Content-Type": "application/pdf",

      "Content-Disposition":
        `inline; filename="Receipt-${numeroRecibo}.pdf"`,

      "Content-Length": pdfBuffer.length,

      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",

      Pragma: "no-cache",

      Expires: "0",
    });

    return res.end(pdfBuffer);
  } catch (error) {
    console.error(
      "Error generando PDF:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      ok: false,
      code:
        error.code ||
        "ERROR_GENERAR_PDF",
      msg:
        error.status === 404
          ? error.message
          : "Error generando el PDF",
    });
  }
};

module.exports = {
  verReciboPDF,
};