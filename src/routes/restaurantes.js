const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("[Auth] No se proporcionó token");
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("[Auth] Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[Auth] Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Configuración de multer para subir logos
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
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
    cb(new Error("Solo se permiten imágenes JPEG o PNG"));
  },
});

// GET: Obtener datos de un restaurante (protegido)
router.get("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  console.log("[GET Restaurante] Solicitando datos para:", restaurantId);
  try {
    const [restaurants] = await pool.query(
      `SELECT r.*, p.name AS plan_name, p.items_limit, p.images_limit, p.start_date, p.end_date 
       FROM restaurants r 
       LEFT JOIN subscription_plans p ON r.plan_id = p.id 
       WHERE r.id = ?`,
      [restaurantId]
    );

    if (!restaurants.length) {
      console.log("[GET Restaurante] Restaurante no encontrado:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }

    console.log("[GET Restaurante] Datos enviados:", restaurants[0]);
    res.json(restaurants); // Devuelve array como en el frontend se espera
  } catch (error) {
    console.error("[GET Restaurante] Error:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// POST: Subir logo (protegido)
router.post("/:restaurantId/upload-logo", authMiddleware, upload.single("logo"), async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (!req.file) {
    console.log("[POST Upload Logo] No se proporcionó archivo");
    return res.status(400).json({ error: "No se proporcionó un archivo válido" });
  }

  const logoUrl = `/uploads/${req.file.filename}`;
  console.log("[POST Upload Logo] Logo subido:", logoUrl);
  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET logo_url = ? WHERE id = ?",
      [logoUrl, restaurantId]
    );

    if (result.affectedRows === 0) {
      console.log("[POST Upload Logo] Restaurante no encontrado:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }

    console.log("[POST Upload Logo] Logo actualizado con éxito:", restaurantId);
    res.json({ logoUrl });
  } catch (error) {
    console.error("[POST Upload Logo] Error:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// PUT: Actualizar datos del restaurante (protegido)
router.put("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { name, colors, logo, sections, plan_id } = req.body;

  console.log("[PUT Restaurante] Actualizando:", { restaurantId, name, colors, logo, sections, plan_id });
  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ?",
      [name || null, JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, restaurantId]
    );

    if (result.affectedRows === 0) {
      console.log("[PUT Restaurante] Restaurante no encontrado:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }

    console.log("[PUT Restaurante] Restaurante actualizado:", restaurantId);
    res.json({ message: "Restaurante actualizado con éxito" });
  } catch (error) {
    console.error("[PUT Restaurante] Error:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

module.exports = router;

