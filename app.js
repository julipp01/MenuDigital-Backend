const express = require("express");
const cors = require("cors");
const multer = require("multer");
const winston = require("winston");
const { createServer } = require("http");
const { initializeSocket } = require("./config/socket");
require("dotenv").config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.18.22:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      logger.info("Request origin:", { origin });
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        return callback(null, true);
      }
      logger.warn("CORS blocked for:", { origin });
      return callback(new Error("Acceso no permitido por CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "model/gltf-binary"];
    if (allowedTypes.includes(file.mimetype)) {
      logger.info("[Multer] File allowed", { mimetype: file.mimetype, originalname: file.originalname });
      cb(null, true);
    } else {
      logger.warn("[Multer] File type not allowed", { mimetype: file.mimetype });
      cb(new Error("Solo se permiten imágenes JPEG, PNG o modelos GLB"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.set("upload", upload);

const router = express.Router();

// Routes
router.use("/auth", require("./routes/authRoutes"));
router.use("/restaurantes", require("./routes/restaurantes"));
router.use("/dashboard", require("./routes/dashboard"));
router.use("/mesas", require("./routes/mesas"));
router.use("/templates", (req, res, next) => {
  logger.info("[Redirect] Redirigiendo /api/templates a /api/restaurantes/menu_templates", { ip: req.ip });
  res.redirect(307, `/api/restaurantes/menu_templates${req.url}`);
});
router.use("/users", require("./routes/userRoutes"));
router.use("/planes", require("./routes/planes"));
router.use("/suscripciones", require("./routes/suscripciones"));
router.use("/admin/subscription_plans", require("./routes/adminPlans"));
router.use("/admin/subscriptions", require("./routes/adminSubscriptions"));
router.use("/modules-config", require("./routes/modules"));

app.use("/api", router);

// Root route
app.get("/", (req, res) => {
  const response = {
    message: "API corriendo como cañom 🚀",
    environment: process.env.NODE_ENV,
    backendUrl: process.env.BACKEND_URL,
    timestamp: new Date().toISOString(),
  };
  logger.info("[GET /] Root route accessed", { ip: req.ip });
  res.status(200).json(response);
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorDetails = {
    message: err.message || "Error en el servidor",
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  };
  logger.error("[Error Middleware] Server error", errorDetails);
  res.status(status).json({
    error: { message: errorDetails.message, status },
  });
});

// Crear servidor HTTP y vincular WebSocket
const server = createServer(app);
initializeSocket(server);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`🚀 Servidor corriendo en ${process.env.BACKEND_URL || "http://localhost:" + PORT}`);
  console.log(`🚀 WebSocket disponible en ${process.env.SOCKET_URL || "ws://localhost:" + PORT}`);
});

module.exports = app;





