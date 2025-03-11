require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./src/config/db");
const { createServer } = require("http");
const { initializeSocket } = require("./src/config/socket");

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Inicializar WebSocket
initializeSocket(server);

// Configuración de CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:5173", "http://192.168.18.22:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "1d" }));
app.use("/models", express.static(path.join(__dirname, "models"), { maxAge: "1d" }));
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails"), { maxAge: "1d" }));

// Inicialización de la base de datos
const initializeDatabase = async () => {
  const maxRetries = 5;
  const retryDelay = 2000;
  for (let attempts = 1; attempts <= maxRetries; attempts++) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log("✅ Conectado a MySQL");
      return;
    } catch (err) {
      console.error(`❌ Intento ${attempts}/${maxRetries} - Error de conexión a MySQL:`, err.message);
      if (attempts === maxRetries) {
        console.error("❌ No se pudo conectar a MySQL después de varios intentos.");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

// Rutas API
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/restaurantes", require("./src/routes/restaurantes"));
app.use("/api/menu", require("./src/routes/menu"));
app.use("/api/dashboard", require("./src/routes/dashboard"));
app.use("/api/mesas", require("./src/routes/mesas"));
app.use("/api/templates", require("./src/routes/templates"));

// Ruta raíz
app.get("/", (req, res) => {
  res.status(200).send("API funcionando 🚀");
});

// Manejo de errores
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error("Error en el servidor:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  res.status(status).json({
    error: {
      message: err.message || "Error en el servidor",
      status,
    },
  });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, "192.168.18.22", () => {
      console.log(`🚀 Servidor corriendo en http://192.168.18.22:${PORT}`);
      console.log(`CORS habilitado para: ${allowedOrigins.join(", ")}`);
    });
  } catch (err) {
    console.error("❌ Error al iniciar el servidor:", err.message);
    process.exit(1);
  }
};

startServer();

