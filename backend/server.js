require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Rutas
app.use("/api/company-settings", require("./src/routes/companySettings.routes"));
app.use("/api/recibos", require("./src/routes/recibos.routes"));
app.use("/api/recibos-pdf", require("./src/routes/recibosPDF.routes"));
app.use("/api/impuestos", require("./src/routes/impuestos.routes"));

// Iniciar servidor
app.listen(PORT);