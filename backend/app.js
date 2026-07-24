const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://app.domthex.com",
    ],
    credentials: true,
  })
);

// Middlewares
app.use(express.json());

// Archivos estáticos
const uploadsPath = path.join(__dirname, "src/uploads");
app.use("/uploads", express.static(uploadsPath));

// Ruta principal
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API DigiThex ERP funcionando",
  });
});

// Ruta de prueba
app.get("/prueba", (req, res) => {
  res.send("Backend correcto");
});

// Rutas API
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/usuarios", require("./src/routes/usuarios.routes"));
app.use("/api/roles", require("./src/routes/roles.routes"));
app.use("/api/empresas", require("./src/routes/empresas.routes"));
app.use("/api/logs", require("./src/routes/logs.routes"));
app.use("/api/permisos", require("./src/routes/permisos.routes"));

app.use("/api/clientes", require("./src/routes/clientes.routes"));
app.use("/api/dumpsters", require("./src/routes/dumpsters.routes"));
app.use("/api/camiones", require("./src/routes/camiones.routes"));
app.use("/api/rentas", require("./src/routes/rentas.routes"));

app.use("/api/company-settings", require("./src/routes/companySettings.routes"));
app.use("/api/recibos", require("./src/routes/recibos.routes"));
app.use("/api/recibos-pdf", require("./src/routes/recibosPDF.routes"));
app.use("/api/impuestos", require("./src/routes/impuestos.routes"));

module.exports = app;