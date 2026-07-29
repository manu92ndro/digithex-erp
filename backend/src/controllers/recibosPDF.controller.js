const { generarReciboPDF } = require("../services/reciboPDF.service");

const getIdEmpresa = (req) => req.usuario.id_empresa;

const verReciboPDF = async (req, res) => {
  try {
    const { id_renta } = req.params;
    const id_empresa = getIdEmpresa(req);

    const pdfBuffer = await generarReciboPDF(id_renta, id_empresa);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=Receipt-${String(id_renta).padStart(4, "0")}.pdf`
    );

    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error generando PDF:", error);

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