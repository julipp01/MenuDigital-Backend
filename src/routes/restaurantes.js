const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const Joi = require("joi"); // Para validación de datos
const compression = require("compression"); // Para compresión de respuestas
const winston = require("winston"); // Para logging avanzado
const sanitizeHtml = require("sanitize-html"); // Para sanitizar entradas

// Configuración de logging con winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Constantes para mensajes de error
const ERRORS = {
  NO_TOKEN: "No se proporcionó token",
  INVALID_TOKEN: "Token inválido",
  NO_FILE: "No se proporcionó un archivo válido",
  INVALID_FILE: "Solo se permiten imágenes JPEG o PNG",
  NOT_FOUND: "Restaurante no encontrado",
  SERVER_ERROR: "Error en el servidor",
  INVALID_REQUEST: "Solicitud inválida",
};

// Middleware de compresión
router.use(compression());

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.warn("[Auth] No se proporcionó token", { ip: req.ip });
    return res.status(401).json({ error: ERRORS.NO_TOKEN });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    logger.info("[Auth] Token decodificado", { userId: decoded.id, ip: req.ip });
    req.user = decoded;
    next();
  } catch (err) {
    logger.error("[Auth] Error al verificar token", { error: err.message, ip: req.ip });
    return res.status(401).json({ error: ERRORS.INVALID_TOKEN });
  }
};

// Configuración de multer para subir logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    logger.info("[Multer] Guardando en", { path: uploadPath });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${sanitizeHtml(file.originalname.replace(/\s+/g, "-"))}`;
    logger.info("[Multer] Archivo renombrado como", { filename });
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /\.(jpe?g|png)$/i;
    const isValid = filetypes.test(path.extname(file.originalname)) || filetypes.test(file.mimetype);
    if (isValid) return cb(null, true);
    logger.warn("[Multer] Archivo inválido", { filename: file.originalname, mimetype: file.mimetype });
    cb(new Error(ERRORS.INVALID_FILE));
  },
}).single("logo");

// Esquema de validación para PUT /:restaurantId
const restaurantSchema = Joi.object({
  name: Joi.string().trim().max(255).allow(null),
  colors: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  logo: Joi.string().uri().allow(null),
  sections: Joi.object().required(),
  plan_id: Joi.number().integer().allow(null),
});

// Middleware de validación para PUT
const validateRestaurantUpdate = (req, res, next) => {
  const { error } = restaurantSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn("[Validation] Datos inválidos", { errors: error.details, ip: req.ip });
    return res.status(400).json({ error: ERRORS.INVALID_REQUEST, details: error.details });
  }
  next();
};

// ✅ GET: Obtener datos de un restaurante (protegido)
router.get("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId)) {
    logger.warn("[GET Restaurante] ID inválido", { restaurantId: req.params.restaurantId, ip: req.ip });
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }
  logger.info("[GET Restaurante] Solicitando datos para", { restaurantId, userId: req.user.id });
  try {
    const [restaurants] = await pool.query(
      `SELECT r.*, p.name AS plan_name, p.items_limit, p.images_limit, p.start_date, p.end_date 
       FROM restaurants r 
       LEFT JOIN subscription_plans p ON r.plan_id = p.id 
       WHERE r.id = ? AND r.owner_id = ?`,
      [restaurantId, req.user.id]
    );

    if (!restaurants.length) {
      logger.warn("[GET Restaurante] Restaurante no encontrado o no autorizado", { restaurantId, userId: req.user.id });
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }

    logger.info("[GET Restaurante] Datos enviados", { restaurantId, data: restaurants[0] });
    res.json(restaurants); // Devuelve array como en el frontend se espera
  } catch (error) {
    logger.error("[GET Restaurante] Error", { error: error.message, restaurantId, ip: req.ip });
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

// ✅ POST: Subir logo (protegido)
router.post("/:restaurantId/upload-logo", authMiddleware, (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId)) {
    logger.warn("[POST Upload Logo] ID inválido", { restaurantId: req.params.restaurantId, ip: req.ip });
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      logger.warn("[POST Upload Logo] Error de multer", { error: err.message, restaurantId, ip: req.ip });
      return res.status(400).json({ error: err.message });
    } else if (err) {
      logger.warn("[POST Upload Logo] Error general de multer", { error: err.message, restaurantId, ip: req.ip });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      logger.warn("[POST Upload Logo] No se proporcionó archivo", { restaurantId, ip: req.ip });
      return res.status(400).json({ error: ERRORS.NO_FILE });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    logger.info("[POST Upload Logo] Logo subido", { logoUrl, restaurantId, ip: req.ip });
    try {
      const [result] = await pool.query(
        "UPDATE restaurants SET logo_url = ? WHERE id = ? AND owner_id = ?",
        [logoUrl, restaurantId, req.user.id]
      );

      if (result.affectedRows === 0) {
        logger.warn("[POST Upload Logo] Restaurante no encontrado o no autorizado", { restaurantId, userId: req.user.id });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }

      logger.info("[POST Upload Logo] Logo actualizado con éxito", { restaurantId, logoUrl });
      res.json({ logoUrl });
    } catch (error) {
      logger.error("[POST Upload Logo] Error", { error: error.message, restaurantId, ip: req.ip });
      res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
    }
  });
});

// ✅ PUT: Actualizar datos del restaurante (protegido)
router.put("/:restaurantId", authMiddleware, validateRestaurantUpdate, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { name, colors, logo, sections, plan_id } = req.body;

  if (isNaN(restaurantId)) {
    logger.warn("[PUT Restaurante] ID inválido", { restaurantId: req.params.restaurantId, ip: req.ip });
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }

  logger.info("[PUT Restaurante] Actualizando", { restaurantId, name, colors, logo, sections, plan_id, userId: req.user.id });
  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ? AND owner_id = ?",
      [sanitizeHtml(name || ""), JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, restaurantId, req.user.id]
    );

    if (result.affectedRows === 0) {
      logger.warn("[PUT Restaurante] Restaurante no encontrado o no autorizado", { restaurantId, userId: req.user.id });
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }

    logger.info("[PUT Restaurante] Restaurante actualizado", { restaurantId });
    res.json({ message: "Restaurante actualizado con éxito" });
  } catch (error) {
    logger.error("[PUT Restaurante] Error", { error: error.message, restaurantId, ip: req.ip });
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

// Configuración de archivos estáticos (necesario para servir archivos de /uploads)
router.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

module.exports = router;


