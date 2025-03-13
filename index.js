require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pool = require("./src/config/db");
const { createServer } = require("http");
const { initializeSocket } = require("./src/config/socket");
const cloudinary = require("cloudinary").v2;

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const BACKEND_URL = process.env.BACKEND_URL || "https://menudigital-backend-production.up.railway.app";
const SOCKET_URL = process.env.SOCKET_URL || "wss://menudigital-backend-production.up.railway.app";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Configuración de Multer (almacenamiento temporal en memoria)
const upload = multer({
  storage: multer.memoryStorage(), // Guardar en memoria antes de subir a Cloudinary
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "model/gltf-binary"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes JPEG, PNG o modelos GLB"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Ruta para subir logo y guardarlo en Cloudinary
app.post("/api/restaurantes/:id/upload-logo", upload.single("logo"), async (req, res) => {
  if (!req.file) {
    console.error("[POST Upload Logo] No se proporcionó un archivo válido");
    return res.status(400).json({ message: "No se proporcionó un archivo válido" });
  }

  try {
    const result = await cloudinary.uploader.upload_stream(
      { folder: "menudigital/logos", resource_type: "auto" },
      (error, result) => {
        if (error) throw error;
        const logoUrl = result.secure_url;
        console.log("[POST Upload Logo] Logo subido a Cloudinary:", { restaurantId: req.params.id, logoUrl });

        pool.query(
          "UPDATE restaurants SET logo_url = ? WHERE id = ?",
          [logoUrl, req.params.id],
          (err, result) => {
            if (err) throw err;
            if (result.affectedRows === 0) {
              console.error("[POST Upload Logo] Restaurante no encontrado:", req.params.id);
              return res.status(404).json({ message: "Restaurante no encontrado" });
            }
            console.log("[POST Upload Logo] Logo guardado en la base de datos:", { restaurantId: req.params.id, logoUrl });
            res.status(200).json({ message: "Logo subido con éxito", logoUrl });
          }
        );
      }
    ).end(req.file.buffer);
  } catch (error) {
    console.error("[POST Upload Logo] Error al subir logo a Cloudinary:", error.message);
    res.status(500).json({ message: "Error al guardar logo", details: error.message });
  }
});

// Ruta para subir archivos de menú a Cloudinary
app.post("/api/menu/:restaurantId/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    console.error("[POST Upload File] No se proporcionó un archivo válido");
    return res.status(400).json({ message: "No se proporcionó un archivo válido" });
  }

  try {
    const result = await cloudinary.uploader.upload_stream(
      { folder: "menudigital/menu", resource_type: "auto" },
      (error, result) => {
        if (error) throw error;
        const fileUrl = result.secure_url;
        console.log("[POST Upload File] Archivo subido a Cloudinary:", { restaurantId: req.params.restaurantId, fileUrl });
        res.status(200).json({ message: "Archivo subido con éxito", fileUrl });
      }
    ).end(req.file.buffer);
  } catch (error) {
    console.error("[POST Upload File] Error al subir archivo a Cloudinary:", error.message);
    res.status(500).json({ message: "Error al guardar archivo", details: error.message });
  }
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


