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
const NodeCache = require("node-cache");

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

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
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

const checkRestaurantPermission = async (req, res, next) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId)) {
    logger.warn("[Permission] ID inválido", { restaurantId: req.params.restaurantId, ip: req.ip });
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }

  try {
    const cacheKey = `restaurant_${restaurantId}`;
    let restaurant = cache.get(cacheKey);

    if (!restaurant) {
      const [rows] = await pool.query("SELECT owner_id FROM restaurants WHERE id = ?", [restaurantId]);
      if (!rows.length) {
        logger.warn("[Permission] Restaurante no encontrado", { restaurantId, userId: req.user.id });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }
      restaurant = rows[0];
      cache.set(cacheKey, restaurant);
    }

    if (restaurant.owner_id !== req.user.id) {
      logger.warn("[Permission] Usuario no autorizado", {
        restaurantId,
        userId: req.user.id,
        ownerId: restaurant.owner_id,
      });
      return res.status(403).json({ error: ERRORS.UNAUTHORIZED });
    }
    req.restaurant = restaurant;
    next();
  } catch (error) {
    logger.error("[Permission] Error al verificar permisos", { error: error.message, restaurantId, ip: req.ip });
    return res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
};

const restaurantSchema = Joi.object({
  name: Joi.string().trim().max(255).allow(null, ""),
  colors: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  logo: Joi.string().uri().allow(null, ""),
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

router.get("/:restaurantId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  try {
    const cacheKey = `restaurant_full_${restaurantId}`;
    let restaurantData = cache.get(cacheKey);

    if (!restaurantData) {
      const [rows] = await pool.query(
        "SELECT id, name, colors, logo_url, sections, plan_id, owner_id FROM restaurants WHERE id = ?",
        [restaurantId]
      );
      if (!rows.length) {
        logger.warn("[GET Restaurante] Restaurante no encontrado", { restaurantId, userId: req.user.id });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }
      restaurantData = rows[0];
      restaurantData.colors = typeof restaurantData.colors === "string" ? JSON.parse(restaurantData.colors) : restaurantData.colors;
      restaurantData.sections = typeof restaurantData.sections === "string" ? JSON.parse(restaurantData.sections) : restaurantData.sections;
      cache.set(cacheKey, restaurantData);
    }

    logger.info("[GET Restaurante] Datos devueltos", { restaurantId, userId: req.user.id });
    res.json([restaurantData]);
  } catch (error) {
    logger.error("[GET Restaurante] Error", { error: error.message, restaurantId, ip: req.ip });
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

router.post("/:restaurantId/upload-logo", authMiddleware, checkRestaurantPermission, (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      logger.warn("[POST Upload Logo] Error de multer", { error: err.message, restaurantId, ip: req.ip });
      return res.status(400).json({ error: err.message });
    } else if (err) {
      logger.warn("[POST Upload Logo] Error general", { error: err.message, restaurantId, ip: req.ip });
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
            overwrite: true,
          },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer);
      });

      const logoUrl = result.secure_url;
      logger.info("[POST Upload Logo] Logo subido a Cloudinary", { logoUrl, restaurantId, ip: req.ip });

      const [resultDb] = await pool.query(
        "UPDATE restaurants SET logo_url = ? WHERE id = ?",
        [logoUrl, restaurantId]
      );

      if (resultDb.affectedRows === 0) {
        logger.warn("[POST Upload Logo] Restaurante no encontrado en actualización", { restaurantId });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }

      cache.del([`restaurant_${restaurantId}`, `restaurant_full_${restaurantId}`]);
      logger.info("[POST Upload Logo] Logo actualizado", { restaurantId, logoUrl, userId: req.user.id });
      res.json({ logoUrl });
    } catch (error) {
      logger.error("[POST Upload Logo] Error", { error: error.message, restaurantId, ip: req.ip });
      res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
    }
  });
});

router.put(
  "/:restaurantId",
  authMiddleware,
  checkRestaurantPermission,
  validateRestaurantUpdate,
  async (req, res) => {
    const restaurantId = parseInt(req.params.restaurantId, 10);
    const { name, colors, logo, sections, plan_id } = req.body;

    try {
      // Obtener el logo_url actual para evitar sobrescribir con null o datos desactualizados
      const [currentData] = await pool.query("SELECT logo_url FROM restaurants WHERE id = ?", [restaurantId]);
      const currentLogoUrl = currentData[0]?.logo_url || null;

      const [result] = await pool.query(
        "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ?",
        [
          sanitizeHtml(name || ""),
          JSON.stringify(colors),
          logo || currentLogoUrl, // Usar logo enviado o mantener el actual
          JSON.stringify(sections),
          plan_id || null,
          restaurantId,
        ]
      );

      if (result.affectedRows === 0) {
        logger.warn("[PUT Restaurante] Restaurante no encontrado", { restaurantId, userId: req.user.id });
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }

      cache.del([`restaurant_${restaurantId}`, `restaurant_full_${restaurantId}`]);
      logger.info("[PUT Restaurante] Restaurante actualizado", { restaurantId, userId: req.user.id });
      res.json({ message: "Restaurante actualizado con éxito" });
    } catch (error) {
      logger.error("[PUT Restaurante] Error", { error: error.message, restaurantId, ip: req.ip });
      res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
    }
  }
);

router.post("/", authMiddleware, validateRestaurantUpdate, async (req, res) => {
  const { name, colors, logo, sections, plan_id } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO restaurants (name, colors, logo_url, sections, plan_id, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
      [sanitizeHtml(name || ""), JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, req.user.id]
    );

    const newRestaurantId = result.insertId;
    logger.info("[POST Restaurante] Restaurante creado", { restaurantId: newRestaurantId, userId: req.user.id });
    res.status(201).json({
      id: newRestaurantId,
      name,
      colors,
      logo_url: logo,
      sections,
      plan_id,
      owner_id: req.user.id,
    });
  } catch (error) {
    logger.error("[POST Restaurante] Error", { error: error.message, ip: req.ip });
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

module.exports = router;


