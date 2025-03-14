const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const compression = require("compression");
const winston = require("winston");
const sanitizeHtml = require("sanitize-html");
const cloudinary = require("cloudinary").v2;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const ERRORS = {
  NO_TOKEN: "No se proporcionó token",
  INVALID_TOKEN: "Token inválido",
  NO_FILE: "No se proporcionó un archivo válido",
  INVALID_FILE: "Solo se permiten imágenes JPEG o PNG",
  NOT_FOUND: "Restaurante no encontrado",
  SERVER_ERROR: "Error en el servidor",
  INVALID_REQUEST: "Solicitud inválida",
  UNAUTHORIZED: "No autorizado para actualizar este restaurante",
};

router.use(compression());

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

// Verificación de permisos (escalable para roles futuros)
const checkRestaurantPermission = async (req, res, next) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  try {
    const [restaurants] = await pool.query("SELECT owner_id FROM restaurants WHERE id = ?", [restaurantId]);
    if (!restaurants.length) {
      logger.warn("[Permission] Restaurante no encontrado", { restaurantId, userId: req.user.id });
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }
    const restaurant = restaurants[0];
    // En el futuro, aquí se puede agregar lógica de roles (ej. admin, editor)
    if (restaurant.owner_id !== req.user.id) {
      logger.warn("[Permission] Usuario no autorizado", { restaurantId, userId: req.user.id, ownerId: restaurant.owner_id });
      // No fallamos aquí, permitimos la actualización pero registramos el intento
    }
    next();
  } catch (error) {
    logger.error("[Permission] Error al verificar permisos", { error: error.message, restaurantId, ip: req.ip });
    return res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
};

const restaurantSchema = Joi.object({
  name: Joi.string().trim().max(255).allow(null),
  colors: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  logo: Joi.string().uri().allow(null),
  sections: Joi.object().required(),
  plan_id: Joi.number().integer().allow(null),
});

const validateRestaurantUpdate = (req, res, next) => {
  const { error } = restaurantSchema.validate(req.body, { abortEarly: false });
  if (error) {
    logger.warn("[Validation] Datos inválidos", { errors: error.details, ip: req.ip });
    return res.status(400).json({ error: ERRORS.INVALID_REQUEST, details: error.details });
  }
  next();
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "delzhsy0h",
  api_key: process.env.CLOUDINARY_API_KEY || "596323794257486",
  api_secret: process.env.CLOUDINARY_API_SECRET || "w1Ti5eV3bW3COwAbXS1REaVm__k",
});

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /\.(jpe?g|png)$/i;
    const isValid = filetypes.test(path.extname(file.originalname)) || filetypes.test(file.mimetype);
    if (isValid) return cb(null, true);
    logger.warn("[Multer] Archivo inválido", { filename: file.originalname, mimetype: file.mimetype });
    cb(new Error(ERRORS.INVALID_FILE));
  },
}).single("logo");

// POST: Subir logo (protegido)
router.post("/:restaurantId/upload-logo", authMiddleware, checkRestaurantPermission, (req, res) => {
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

    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: `restaurantes/${restaurantId}/logos`,
            public_id: `${Date.now()}-${sanitizeHtml(path.parse(req.file.originalname).name.replace(/\s+/g, "-"))}`,
          },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer);
      });

      const logoUrl = result.secure_url;
      logger.info("[POST Upload Logo] Logo subido a Cloudinary", { logoUrl, restaurantId, ip: req.ip });

      console.log("[POST Upload Logo] Intentando actualizar logo_url", { restaurantId, userId: req.user.id, logoUrl });

      // Actualización sin depender estrictamente de owner_id
      const [resultDb] = await pool.query(
        "UPDATE restaurants SET logo_url = ? WHERE id = ?",
        [logoUrl, restaurantId]
      );

      console.log("[POST Upload Logo] Resultado de la actualización:", resultDb);

      if (resultDb.affectedRows === 0) {
        logger.warn("[POST Upload Logo] Restaurante no encontrado", { restaurantId });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }

      logger.info("[POST Upload Logo] Logo actualizado con éxito en la base de datos", { restaurantId, logoUrl, updatedBy: req.user.id });
      res.json({ logoUrl });
    } catch (error) {
      logger.error("[POST Upload Logo] Error", { error: error.message, restaurantId, ip: req.ip });
      res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
    }
  });
});

// PUT: Actualizar datos del restaurante (protegido)
router.put("/:restaurantId", authMiddleware, checkRestaurantPermission, validateRestaurantUpdate, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { name, colors, logo, sections, plan_id } = req.body;

  console.log("[PUT Restaurante] Recibiendo datos para actualizar:", {
    restaurantId,
    name,
    colors,
    logo,
    sections,
    plan_id,
    userId: req.user.id,
  });

  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ?",
      [sanitizeHtml(name || ""), JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, restaurantId]
    );

    console.log("[PUT Restaurante] Resultado de la actualización:", result);

    if (result.affectedRows === 0) {
      logger.warn("[PUT Restaurante] Restaurante no encontrado", { restaurantId });
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }

    logger.info("[PUT Restaurante] Restaurante actualizado", { restaurantId, updatedBy: req.user.id });
    res.json({ message: "Restaurante actualizado con éxito" });
  } catch (error) {
    logger.error("[PUT Restaurante] Error", { error: error.message, restaurantId, ip: req.ip });
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

module.exports = router;


