const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Configuración servidor
// ===============================

app.set("trust proxy", 1);

// CORS
// ===============================

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [
      "http://localhost:5173",
      "https://app.domthex.com",
    ];

app.use(
  cors({
    origin: (origin, callback) => {

      // Permitir herramientas como Postman
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origen no permitido por CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);


// ===============================
// Middlewares
// ===============================

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);


// ===============================
// Archivos públicos
// ===============================

const uploadsPath = path.join(
  __dirname,
  "uploads"
);


// Crear carpeta si no existe
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, {
    recursive: true
  });
}


app.use(
  "/uploads",
  express.static(uploadsPath)
);


// ===============================
// Rutas generales
// ===============================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API DigiThex ERP funcionando",
    version: "1.0.0"
  });
});


app.get("/prueba", (req, res) => {
  res.send("Backend correcto");
});


// ===============================
// Rutas API
// ===============================

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/usuarios", require("./src/routes/usuarios.routes"));
app.use("/api/roles", require("./src/routes/roles.routes"));
app.use("/api/empresas", require("./src/routes/empresas.routes"));
app.use("/api/logs", require("./src/routes/logs.routes"));
app.use("/api/permisos", require("./src/routes/permisos.routes"));

// Módulo Rentas
app.use("/api/clientes", require("./src/routes/clientes.routes"));
app.use("/api/dumpsters", require("./src/routes/dumpsters.routes"));
app.use("/api/camiones", require("./src/routes/camiones.routes"));
app.use("/api/rentas", require("./src/routes/rentas.routes"));


// Configuración empresa
app.use("/api/company-settings", require("./src/routes/companySettings.routes"));

// Recibos
app.use( "/api/recibos", require("./src/routes/recibos.routes"));

app.use("/api/recibos-pdf", require("./src/routes/recibosPDF.routes"));


// Impuestos
app.use("/api/impuestos", require("./src/routes/impuestos.routes"));


// ===============================
// Ruta no encontrada
// ===============================

app.use((req, res) => {

  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });

});


// ===============================
// Manejo global de errores
// ===============================

app.use((err, req, res, next) => {

  console.error("ERROR GLOBAL:", err);

  res.status(err.status || 500).json({
    ok: false,
    message:
      err.message ||
      "Error interno del servidor"
  });

});


module.exports = app;