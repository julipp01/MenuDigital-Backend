const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

// Constantes para mensajes de error
const ERRORS = {
  NO_TOKEN: "No se proporcionó token",
  INVALID_TOKEN: "Token inválido",
  NO_FILE: "No se proporcionó un archivo válido",
  INVALID_FILE: "Solo se permiten imágenes JPEG o PNG",
  NOT_FOUND: "Restaurante no encontrado",
  SERVER_ERROR: "Error en el servidor",
};

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("[Auth] No se proporcionó token");
    return res.status(401).json({ error: ERRORS.NO_TOKEN });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("[Auth] Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[Auth] Error al verificar token:", err.message);
    return res.status(401).json({ error: ERRORS.INVALID_TOKEN });
  }
};

// Configuración de multer para subir logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    console.log("[Multer] Guardando en:", uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    console.log("[Multer] Archivo renombrado como:", filename);
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
    cb(new Error(ERRORS.INVALID_FILE));
  },
}).single("logo");

// ✅ GET: Obtener datos de un restaurante (protegido)
router.get("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId)) {
    console.log("[GET Restaurante] ID inválido:", req.params.restaurantId);
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }
  console.log("[GET Restaurante] Solicitando datos para:", restaurantId);
  try {
    const [restaurants] = await pool.query(
      `SELECT r.*, p.name AS plan_name, p.items_limit, p.images_limit, p.start_date, p.end_date 
       FROM restaurants r 
       LEFT JOIN subscription_plans p ON r.plan_id = p.id 
       WHERE r.id = ? AND r.owner_id = ?`,
      [restaurantId, req.user.id]
    );

    if (!restaurants.length) {
      console.log("[GET Restaurante] Restaurante no encontrado o no autorizado:", restaurantId);
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }

    console.log("[GET Restaurante] Datos enviados:", restaurants[0]);
    res.json(restaurants); // Devuelve array como en el frontend se espera
  } catch (error) {
    console.error("[GET Restaurante] Error:", error.message);
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

// ✅ POST: Subir logo (protegido)
router.post("/:restaurantId/upload-logo", authMiddleware, (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId)) {
    console.log("[POST Upload Logo] ID inválido:", req.params.restaurantId);
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }

  upload(req, res, async (err) => {
    if (err) {
      console.log("[POST Upload Logo] Error de multer:", err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      console.log("[POST Upload Logo] No se proporcionó archivo");
      return res.status(400).json({ error: ERRORS.NO_FILE });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    console.log("[POST Upload Logo] Logo subido:", logoUrl);
    try {
      const [result] = await pool.query(
        "UPDATE restaurants SET logo_url = ? WHERE id = ? AND owner_id = ?",
        [logoUrl, restaurantId, req.user.id]
      );

      if (result.affectedRows === 0) {
        console.log("[POST Upload Logo] Restaurante no encontrado o no autorizado:", restaurantId);
        return res.status(404).json({ error: ERRORS.NOT_FOUND });
      }

      console.log("[POST Upload Logo] Logo actualizado con éxito:", restaurantId);
      res.json({ logoUrl });
    } catch (error) {
      console.error("[POST Upload Logo] Error:", error.message);
      res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
    }
  });
});

// ✅ PUT: Actualizar datos del restaurante (protegido)
router.put("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { name, colors, logo, sections, plan_id } = req.body;

  if (isNaN(restaurantId)) {
    console.log("[PUT Restaurante] ID inválido:", req.params.restaurantId);
    return res.status(400).json({ error: "ID de restaurante inválido" });
  }

  console.log("[PUT Restaurante] Actualizando:", { restaurantId, name, colors, logo, sections, plan_id });
  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ? AND owner_id = ?",
      [name || null, JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, restaurantId, req.user.id]
    );

    if (result.affectedRows === 0) {
      console.log("[PUT Restaurante] Restaurante no encontrado o no autorizado:", restaurantId);
      return res.status(404).json({ error: ERRORS.NOT_FOUND });
    }

    console.log("[PUT Restaurante] Restaurante actualizado:", restaurantId);
    res.json({ message: "Restaurante actualizado con éxito" });
  } catch (error) {
    console.error("[PUT Restaurante] Error:", error.message);
    res.status(500).json({ error: ERRORS.SERVER_ERROR, details: error.message });
  }
});

module.exports = router;


