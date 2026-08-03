const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// ===============================
// Configuración del servidor
// ===============================

app.set("trust proxy", 1);

// ===============================
// CORS
// ===============================

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [
      "http://localhost:5173",
      "https://app.domthex.com",
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origin:
    // Postman, Thunder Client, servidor a servidor, etc.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Origen bloqueado por CORS: ${origin}`);

    return callback(
      new Error(`Origen no permitido por CORS: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// CORS debe colocarse antes de las rutas
app.use(cors(corsOptions));

// ===============================
// Middlewares
// ===============================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ===============================
// Archivos públicos
// ===============================

const uploadsPath = path.join(
  __dirname,
  "uploads"
);

// Crear carpeta uploads si no existe
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, {
    recursive: true,
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
    version: "1.0.0",
  });
});

app.get("/prueba", (req, res) => {
  res.json({
    ok: true,
    message: "Backend correcto",
  });
});

// ===============================
// Rutas API
// ===============================

// Autenticación
app.use(
  "/api/auth",
  require("./src/routes/auth.routes")
);

// Dashboard
app.use(
  "/api/dashboard",
  require("./src/routes/dashboard.routes")
);

// Usuarios
app.use(
  "/api/usuarios",
  require("./src/routes/usuarios.routes")
);

// Roles
app.use(
  "/api/roles",
  require("./src/routes/roles.routes")
);

// Empresas
app.use(
  "/api/empresas",
  require("./src/routes/empresas.routes")
);

// Logs
app.use(
  "/api/logs",
  require("./src/routes/logs.routes")
);

// Permisos
app.use(
  "/api/permisos",
  require("./src/routes/permisos.routes")
);

// ===============================
// Módulo de rentas
// ===============================

// Clientes
app.use(
  "/api/clientes",
  require("./src/routes/clientes.routes")
);

// Dumpsters
app.use(
  "/api/dumpsters",
  require("./src/routes/dumpsters.routes")
);

// Camiones
app.use(
  "/api/camiones",
  require("./src/modules/dumpsters/trucks/camiones.routes")
);

// Rentas
app.use(
  "/api/rentas",
  require("./src/routes/rentas.routes")
);

// Impuestos
app.use(
  "/api/impuestos",
  require("./src/routes/impuestos.routes")
);

// ===============================
// Configuración de empresa
// ===============================

app.use(
  "/api/company-settings",
  require("./src/routes/companySettings.routes")
);

// ===============================
// Recibos
// ===============================

app.use(
  "/api/recibos",
  require("./src/routes/recibos.routes")
);

app.use(
  "/api/recibos-pdf",
  require("./src/routes/recibosPDF.routes")
);

// ===============================
// Ruta no encontrada
// ===============================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ===============================
// Manejo global de errores
// ===============================

app.use((err, req, res, next) => {
  console.error("ERROR GLOBAL:", err);

  // Error generado por CORS
  if (
    err.message &&
    err.message.includes("Origen no permitido por CORS")
  ) {
    return res.status(403).json({
      ok: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    ok: false,
    message:
      err.message ||
      "Error interno del servidor",
  });
});

module.exports = app;