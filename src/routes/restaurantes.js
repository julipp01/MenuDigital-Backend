const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    console.log("No se proporcionó token en la solicitud.");
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Configuración de multer para subir logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    console.log("Ruta de subida establecida:", uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.originalname}`;
    console.log("Archivo renombrado como:", filename);
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes JPEG o PNG"));
  },
});

// Endpoint GET: Obtener datos de un restaurante por ID
router.get("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  console.log("[GET Restaurante] Solicitando datos del restaurante con ID:", restaurantId);
  try {
    // Se realiza LEFT JOIN con subscription_plans para incluir información del plan (si existe)
    const query = `
      SELECT r.*, p.name AS plan_name, p.items_limit, p.images_limit, p.start_date, p.end_date 
      FROM restaurants r 
      LEFT JOIN subscription_plans p ON r.plan_id = p.id
      WHERE r.id = ?`;
    console.log("[GET Restaurante] Ejecutando query:", query, "con parámetro:", restaurantId);
    const [restaurants] = await pool.query(query, [restaurantId]);
    console.log("[GET Restaurante] Resultado de la query:", restaurants);
    if (restaurants.length === 0) {
      console.log("[GET Restaurante] No se encontró restaurante con ID:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    console.log("[GET Restaurante] Datos del restaurante enviados:", restaurants);
    res.json(restaurants);
  } catch (error) {
    console.error("[GET Restaurante] Error al obtener restaurante:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint POST: Subir logo
router.post("/:restaurantId/upload-logo", authMiddleware, upload.single("logo"), async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  console.log("[POST Upload Logo] Subiendo logo para restaurante con ID:", restaurantId);
  if (!req.file) {
    console.log("[POST Upload Logo] No se proporcionó archivo válido");
    return res.status(400).json({ error: "No se proporcionó un archivo válido" });
  }
  const logoUrl = `/uploads/${req.file.filename}`;
  console.log("[POST Upload Logo] Logo URL generada:", logoUrl);
  try {
    const [result] = await pool.query("UPDATE restaurants SET logo_url = ? WHERE id = ?", [logoUrl, restaurantId]);
    console.log("[POST Upload Logo] Resultado de UPDATE:", result);
    if (result.affectedRows === 0) {
      console.log("[POST Upload Logo] Restaurante no encontrado para ID:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    console.log("[POST Upload Logo] Logo subido exitosamente para restaurante:", restaurantId);
    res.json({ logoUrl });
  } catch (error) {
    console.error("[POST Upload Logo] Error al guardar logo:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint PUT: Actualizar datos del restaurante, incluyendo secciones y plan
router.put("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  // Se espera recibir: name, colors, logo, sections y plan_id
  const { name, colors, logo, sections, plan_id } = req.body;
  console.log("[PUT Restaurante] Datos recibidos para actualizar:", { restaurantId, name, colors, logo, sections, plan_id });
  try {
    const query = "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ?";
    console.log("[PUT Restaurante] Ejecutando query:", query);
    const [result] = await pool.query(query, [
      name,
      JSON.stringify(colors),
      logo,
      JSON.stringify(sections),
      plan_id,
      restaurantId
    ]);
    console.log("[PUT Restaurante] Resultado del UPDATE:", result);
    if (result.affectedRows === 0) {
      console.log("[PUT Restaurante] No se encontró restaurante con ID:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    console.log("[PUT Restaurante] Restaurante actualizado con éxito:", restaurantId);
    res.json({ message: "Restaurante actualizado con éxito" });
  } catch (error) {
    console.error("[PUT Restaurante] Error al actualizar restaurante:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

module.exports = router;

