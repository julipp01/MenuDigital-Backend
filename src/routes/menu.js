const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const sanitizeHtml = require("sanitize-html");

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    console.log("[AUTH] No se proporcionó token en la solicitud.");
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("[AUTH] Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[AUTH] Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "delzhsy0h",
  api_key: process.env.CLOUDINARY_API_KEY || "596323794257486",
  api_secret: process.env.CLOUDINARY_API_SECRET || "w1Ti5eV3bW3COwAbXS1REaVm__k",
});

// Configuración de multer
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
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
  if (!data || data === "[object Object]") return defaultValue;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn("[JSON Parser] Error al parsear JSON, usando valor por defecto:", error.message);
    return defaultValue;
  }
};

// Middleware para verificar permisos del restaurante
const checkRestaurantPermission = async (req, res, next) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  try {
    const [restaurants] = await pool.query("SELECT owner_id FROM restaurants WHERE id = ?", [restaurantId]);
    if (!restaurants.length) {
      console.log("[Permission] Restaurante no encontrado:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    const restaurant = restaurants[0];
    if (restaurant.owner_id !== req.user.id) {
      console.log("[Permission] Usuario no autorizado:", {
        restaurantId,
        userId: req.user.id,
        ownerId: restaurant.owner_id,
      });
      return res.status(403).json({ error: "No autorizado para modificar este restaurante" });
    }
    next();
  } catch (error) {
    console.error("[Permission] Error al verificar permisos:", error.message);
    return res.status(500).json({ error: "Error en el servidor" });
  }
};

// Endpoint GET: Obtener menú y datos del restaurante (público)
router.get("/:restaurantId", async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  console.log("[GET Menu] Solicitando menú y datos del restaurante con ID:", restaurantId);
  try {
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

    const defaultColors = { primary: "#FF9800", secondary: "#4CAF50" };
    const defaultSections = { "Platos Principales": [], "Postres": [], "Bebidas": [] };
    restaurant.colors = parseJSONSafe(restaurant.colors, defaultColors);
    restaurant.sections = parseJSONSafe(restaurant.sections, defaultSections);
    console.log("[GET Menu] Datos parseados del restaurante:", restaurant);

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
        sections: restaurant.sections,
      },
      items,
    });
  } catch (error) {
    console.error("[GET Menu] Error al obtener menú:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint POST: Agregar ítem al menú (protegido)
router.post("/:restaurantId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { name, price, description, category, imageUrl } = req.body;

  if (!name || !price || !category) {
    console.log("[POST Menu] Faltan campos obligatorios");
    return res.status(400).json({ error: "Faltan campos obligatorios: nombre, precio o categoría" });
  }

  console.log("[POST Menu] Agregando ítem al menú:", { restaurantId, name, price, description, category, imageUrl });
  try {
    const query = `
      INSERT INTO menu_items (restaurant_id, name, price, description, category, image_url)
      VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.query(query, [restaurantId, name, price, description, category, imageUrl]);
    console.log("[POST Menu] Ítem agregado con ID:", result.insertId);
    res.status(201).json({ id: result.insertId, message: "Ítem agregado con éxito" });
  } catch (error) {
    console.error("[POST Menu] Error al agregar ítem:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint PUT: Actualizar ítem del menú (protegido)
router.put("/:restaurantId/:itemId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const { name, price, description, category, imageUrl } = req.body;

  if (!name || !price || !category) {
    console.log("[PUT Menu Item] Faltan campos obligatorios");
    return res.status(400).json({ error: "Faltan campos obligatorios: nombre, precio o categoría" });
  }

  console.log("[PUT Menu Item] Actualizando ítem:", { restaurantId, itemId, name, price, description, category, imageUrl });

  try {
    const [result] = await pool.query(
      "UPDATE menu_items SET name = ?, price = ?, description = ?, category = ?, image_url = ? WHERE id = ? AND restaurant_id = ?",
      [name, price, description, category, imageUrl, itemId, restaurantId]
    );

    console.log("[PUT Menu Item] Resultado de la actualización:", result);

    if (result.affectedRows === 0) {
      console.log("[PUT Menu Item] Ítem no encontrado:", { restaurantId, itemId });
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    console.log("[PUT Menu Item] Ítem actualizado con éxito:", { restaurantId, itemId });
    res.json({ message: "Ítem actualizado con éxito" });
  } catch (error) {
    console.error("[PUT Menu Item] Error:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint DELETE: Eliminar ítem del menú (protegido)
router.delete("/:restaurantId/:itemId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const itemId = parseInt(req.params.itemId, 10);

  console.log("[DELETE Menu Item] Intentando eliminar ítem:", { restaurantId, itemId });

  try {
    const [result] = await pool.query(
      "DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?",
      [itemId, restaurantId]
    );

    console.log("[DELETE Menu Item] Resultado de la eliminación:", result);

    if (result.affectedRows === 0) {
      console.log("[DELETE Menu Item] Ítem no encontrado:", { restaurantId, itemId });
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    console.log("[DELETE Menu Item] Ítem eliminado con éxito:", { restaurantId, itemId });
    res.json({ message: "Ítem eliminado con éxito" });
  } catch (error) {
    console.error("[DELETE Menu Item] Error:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Endpoint POST: Subir imagen (protegido)
router.post("/:restaurantId/upload", authMiddleware, checkRestaurantPermission, upload.single("file"), async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  const itemId = req.body.itemId ? parseInt(req.body.itemId, 10) : null;
  console.log("[POST Upload] Subiendo archivo para restaurante con ID:", restaurantId, "Item ID:", itemId);

  if (!req.file) {
    console.log("[POST Upload] No se proporcionó archivo válido");
    return res.status(400).json({ error: "No se proporcionó un archivo válido" });
  }

  console.log("[POST Upload] Archivo recibido:", {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    fieldname: req.file.fieldname,
  });

  try {
    console.log("[POST Upload] Configuración de Cloudinary:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "delzhsy0h",
      api_key: process.env.CLOUDINARY_API_KEY || "596323794257486",
      api_secret: process.env.CLOUDINARY_API_SECRET ? "[REDACTED]" : "Ausente",
    });

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: req.file.mimetype.includes("image") ? "image" : "raw",
          folder: `restaurantes/${restaurantId}/menu`,
          public_id: `${Date.now()}-${sanitizeHtml(path.parse(req.file.originalname).name.replace(/\s+/g, "-"))}`,
        },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });

    const fileUrl = result.secure_url;
    console.log("[POST Upload] Archivo subido a Cloudinary:", fileUrl);

    if (itemId) {
      console.log("[POST Upload] Intentando actualizar image_url para itemId:", itemId);
      const query = "UPDATE menu_items SET image_url = ? WHERE id = ? AND restaurant_id = ?";
      const [resultDb] = await pool.query(query, [fileUrl, itemId, restaurantId]);
      console.log("[POST Upload] Resultado de la actualización:", resultDb);

      if (resultDb.affectedRows === 0) {
        console.log("[POST Upload] Ítem no encontrado para restaurantId:", restaurantId, "itemId:", itemId);
        return res.status(404).json({ error: "Ítem no encontrado" });
      }
      console.log("[POST Upload] Imagen asociada al ítem con ID:", itemId);
    } else {
      console.log("[POST Upload] No se proporcionó itemId; la URL se devuelve sin asociar a un ítem");
    }

    res.json({ fileUrl });
  } catch (error) {
    console.error("[POST Upload] Error al subir archivo:", {
      message: error.message,
      code: error.http_code,
      stack: error.stack,
      details: error.details,
    });
    res.status(500).json({ error: "Error al subir el archivo", details: error.message });
  }
});

module.exports = router;