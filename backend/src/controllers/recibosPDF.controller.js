const {
  generarReciboPDF,
} = require("../services/reciboPDF.service");

const getIdEmpresa = (req) => {
  return req.usuario.id_empresa;
};

const verReciboPDF = async (req, res) => {
  try {
    const { id_renta } = req.params;

    const id_empresa = getIdEmpresa(req);

    // ============================================
    // IDIOMA
    // ============================================

    let lang = req.query.lang || null;

    if (lang !== "es" && lang !== "en") {
      lang = null;
    }

    // ============================================
    // GENERAR PDF
    // ============================================

    const pdfBuffer = await generarReciboPDF(
      id_renta,
      id_empresa,
      lang
    );

    // ============================================
    // RESPUESTA
    // ============================================

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="Receipt-${String(
        id_renta
      ).padStart(4, "0")}.pdf"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    res.send(pdfBuffer);

  } catch (error) {
    console.error(
      "Error generando PDF:",
      error
    );

    res.status(500).json({
      ok: false,
      msg: "Error generando el PDF",
      error: error.message,
    });
  }
};

module.exports = {
  verReciboPDF,
};