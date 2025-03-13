require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises; // Para verificar existencia de directorios
const multer = require("multer");
const pool = require("./src/config/db");
const { createServer } = require("http");
const { initializeSocket } = require("./src/config/socket");

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const BACKEND_URL = process.env.BACKEND_URL || "https://menudigital-backend-production.up.railway.app";
const SOCKET_URL = process.env.SOCKET_URL || "wss://menudigital-backend-production.up.railway.app";

// Inicializar WebSocket
initializeSocket(server);

// Configuración de CORS
const allowedOrigins =
  NODE_ENV === "production"
    ? [
        "https://menu-digital-bdhg.vercel.app",
        "https://menudigital-18byivk2a-julipp01s-projects.vercel.app",
        "https://tu-frontend-url.com",
      ]
    : ["http://localhost:5173", "https://menu-digital-bdhg.vercel.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.error(`[CORS] 🚫 Bloqueado: ${origin}`);
      return callback(new Error("Acceso no permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Configuración de Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error("[Multer] Error al crear directorio uploads:", err.message);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "model/gltf-binary"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPEG, PNG o modelos GLB"), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Verificar y configurar directorios estáticos
const staticDirs = ["uploads", "models", "thumbnails"];
staticDirs.forEach(async (dir) => {
  const dirPath = path.join(__dirname, dir);
  try {
    await fs.access(dirPath);
  } catch (err) {
    console.warn(`[Static] Directorio ${dir} no existe, creándolo...`);
    await fs.mkdir(dirPath, { recursive: true });
  }
  app.use(`/${dir}`, express.static(dirPath));
});

// Inicialización de la base de datos
const initializeDatabase = async () => {
  const maxRetries = 5;
  const retryDelay = 2000;
  for (let attempts = 1; attempts <= maxRetries; attempts++) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log(`✅ Conectado a MySQL en ${process.env.DB_HOST}:${process.env.DB_PORT}`);
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

// Ruta para subir logo
app.post("/api/restaurantes/:id/upload-logo", upload.single("logo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se proporcionó un archivo válido" });
  }
  const logoUrl = `/uploads/${req.file.filename}`;
  console.log("[POST Upload Logo] Logo subido:", { restaurantId: req.params.id, logoUrl });
  res.status(200).json({ message: "Logo subido con éxito", logoUrl });
});

// Ruta para subir archivos de menú
app.post("/api/menu/:restaurantId/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se proporcionó un archivo válido" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  console.log("[POST Upload File] Archivo subido:", { restaurantId: req.params.restaurantId, fileUrl });
  res.status(200).json({ message: "Archivo subido con éxito", fileUrl });
});

// Ruta raíz
app.get("/", (req, res) => {
  res.status(200).send(`API funcionando 🚀 - Entorno: ${NODE_ENV}`);
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error("❌ Error en el servidor:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  res.status(status).json({
    error: { message: err.message || "Error en el servidor", status },
  });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    await initializeDatabase();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en ${BACKEND_URL}`);
      console.log(`🚀 WebSocket disponible en ${SOCKET_URL}`);
      console.log(`✅ CORS habilitado para: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error.message);
    process.exit(1);
  }
};

startServer();


