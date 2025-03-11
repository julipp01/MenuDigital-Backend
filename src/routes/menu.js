// backend/src/routes/menu.js
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

// Configuración de multer para subir imágenes
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gltf|glb/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes JPEG, PNG o modelos GLTF/GLB"));
  },
});

// Función auxiliar para parsear JSON de forma segura
const parseJSONSafe = (data, defaultValue) => {
  if (!data || data === "[object Object]") return defaultValue; // Maneja NULL o formato inválido
  if (typeof data === "object") return data; // Si ya es un objeto, no necesita parseo
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn("Error al parsear JSON, usando valor por defecto:", error.message);
    return defaultValue;
  }
};

// Endpoint GET: Obtener menú y datos del restaurante (público)
router.get("/:restaurantId", async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  console.log("[GET Menu] Solicitando menú y datos del restaurante con ID:", restaurantId);
  try {
    // Obtener datos del restaurante
    const restaurantQuery = `
      SELECT name, logo_url, colors, sections
      FROM restaurants
      WHERE id = ?`;
    const [restaurants] = await pool.query(restaurantQuery, [restaurantId]);
    if (restaurants.length === 0) {
      console.log("[GET Menu] No se encontró restaurante con ID:", restaurantId);
      return res.status(200).json({ restaurant: {}, items: [] });
    }
    const restaurant = restaurants[0];
    console.log("[GET Menu] Datos crudos del restaurante:", restaurant);

    // Parsear colors y sections de forma segura
    const defaultColors = { primary: "#FF9800", secondary: "#4CAF50" };
    const defaultSections = { "Platos Principales": [], "Postres": [], "Bebidas": [] };
    restaurant.colors = parseJSONSafe(restaurant.colors, defaultColors);
    restaurant.sections = parseJSONSafe(restaurant.sections, defaultSections);
    console.log("[GET Menu] Datos parseados del restaurante:", restaurant);

    // Obtener ítems del menú
    const itemsQuery = `
      SELECT id, name, price, description, category, image_url
      FROM menu_items
      WHERE restaurant_id = ?`;
    const [items] = await pool.query(itemsQuery, [restaurantId]);
    console.log("[GET Menu] Ítems del menú:", items);

    res.status(200).json({
      restaurant: {
        name: restaurant.name,
        logo_url: restaurant.logo_url,
        colors: restaurant.colors,
        sections: restaurant.sections
      },
      items
    });
  } catch (error) {
    console.error("[GET Menu] Error al obtener menú:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint POST: Agregar ítem al menú (protegido)
router.post("/:restaurantId", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  const { name, price, description, category, imageUrl } = req.body;
  console.log("[POST Menu] Agregando ítem al menú:", { restaurantId, name, price, description, category, imageUrl });
  try {
    const query = `
      INSERT INTO menu_items (restaurant_id, name, price, description, category, image_url)
      VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.query(query, [restaurantId, name, price, description, category, imageUrl]);
    console.log("[POST Menu] Ítem agregado con ID:", result.insertId);
    res.status(201).json({ id: result.insertId, message: "Ítem agregado con éxito" });
  } catch (error) {
    console.error("[POST Menu] Error al agregar ítem:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint POST: Subir imagen (protegido)
router.post("/:restaurantId/upload", authMiddleware, upload.single("file"), async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  console.log("[POST Upload] Subiendo archivo para restaurante con ID:", restaurantId);
  if (!req.file) {
    console.log("[POST Upload] No se proporcionó archivo válido");
    return res.status(400).json({ error: "No se proporcionó un archivo válido" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  console.log("[POST Upload] URL del archivo generada:", fileUrl);
  res.json({ fileUrl });
});

module.exports = router;
