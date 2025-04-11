const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const winston = require("winston");
require("dotenv").config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Middleware para verificar si el token está expirado (opcional para rutas públicas)
const checkTokenExpiration = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decodedToken = jwt.decode(token);
      if (decodedToken.exp * 1000 < Date.now()) {
        logger.warn("[Auth] Token expirado", { ip: req.ip });
        return res.status(401).json({ error: "Token expirado" });
      }
    } catch (err) {
      logger.error("[Auth] Error al decodificar el token", { error: err.message });
      return res.status(400).json({ error: "Token inválido" });
    }
  }
  next();
};

// Middleware de autenticación (para rutas privadas)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.warn("[Auth] No se proporcionó token", { ip: req.ip });
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    logger.info("[Auth] Token decodificado", { userId: req.user.id });
    next();
  } catch (err) {
    logger.error("[Auth] Token inválido", { error: err.message, ip: req.ip });
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Middleware para validar y verificar permisos del restaurante (para rutas privadas)
const checkRestaurantPermission = async (req, res, next) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId) || restaurantId <= 0) {
    logger.warn("[Permission] ID inválido", { restaurantId: req.params.restaurantId });
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const [rows] = await pool.query("SELECT owner_id FROM restaurants WHERE id = ?", [restaurantId]);
    if (!rows.length) {
      logger.warn("[Permission] Restaurante no encontrado", { restaurantId });
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    if (rows[0].owner_id !== req.user.id) {
      logger.warn("[Permission] Acceso no autorizado", { restaurantId, userId: req.user.id });
      return res.status(403).json({ error: "No autorizado" });
    }
    req.restaurantId = restaurantId;
    next();
  } catch (error) {
    logger.error("[Permission] Error al verificar permisos", { restaurantId, error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
};

// Función auxiliar para parsear JSON de forma segura
const safeParseJSON = (data, defaultValue, fieldName) => {
  if (!data) return defaultValue;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      logger.error(`[Parse] Error al parsear ${fieldName}`, { error: e.message });
      return defaultValue;
    }
  }
  return data;
};

// Rutas públicas

// GET /restaurantes/:restaurantId/public - Obtener datos públicos del restaurante
router.get("/:restaurantId/public", async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId) || restaurantId <= 0) {
    logger.warn("[Public GET Restaurant] ID inválido", { restaurantId: req.params.restaurantId });
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, name, logo_url, colors, sections, name_font, font_family FROM restaurants WHERE id = ? AND estado = 'activo'",
      [restaurantId]
    );
    const restaurant = rows[0];
    if (!restaurant) {
      logger.warn("[Public GET Restaurant] Restaurante no encontrado o no activo", { restaurantId });
      return res.status(404).json({ error: "Restaurante no encontrado o no activo" });
    }
    restaurant.colors = safeParseJSON(restaurant.colors, null, "colors");
    restaurant.sections = safeParseJSON(restaurant.sections, null, "sections");
    logger.info("[Public GET Restaurant] Restaurante cargado", { restaurantId });
    res.json(restaurant);
  } catch (error) {
    logger.error("[Public GET Restaurant] Error:", { restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// GET /restaurantes/:restaurantId/public/items - Obtener ítems públicos del restaurante
router.get("/:restaurantId/public/items", async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (isNaN(restaurantId) || restaurantId <= 0) {
    logger.warn("[Public GET Items] ID inválido", { restaurantId: req.params.restaurantId });
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, name, price, description, category, image_url FROM menu_items WHERE restaurant_id = ?",
      [restaurantId]
    );
    logger.info("[Public GET Items] Ítems cargados", { restaurantId, count: rows.length });
    res.json(rows || []);
  } catch (error) {
    logger.error("[Public GET Items] Error:", { restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// Rutas privadas existentes (sin cambios)

// GET /restaurantes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, template_id, colors, logo_url, sections, name_font, font_family, plan_id, estado FROM restaurants WHERE owner_id = ?",
      [req.user.id]
    );
    logger.info("[GET Restaurants] Restaurantes cargados", { userId: req.user.id, count: rows.length });
    res.json(
      rows.map((row) => ({
        ...row,
        colors: safeParseJSON(row.colors, null, "colors"),
        sections: safeParseJSON(row.sections, null, "sections"),
      }))
    );
  } catch (error) {
    logger.error("[GET Restaurants] Error:", { userId: req.user.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// GET /restaurantes/:restaurantId
router.get("/:restaurantId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, template_id, colors, logo_url, sections, name_font, font_family, plan_id, estado FROM restaurants WHERE id = ?",
      [req.restaurantId]
    );
    const restaurant = rows[0];
    if (!restaurant) {
      logger.warn("[GET Restaurant] Restaurante no encontrado", { restaurantId: req.restaurantId });
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    restaurant.colors = safeParseJSON(restaurant.colors, null, "colors");
    restaurant.sections = safeParseJSON(restaurant.sections, null, "sections");
    logger.info("[GET Restaurant] Restaurante cargado", { restaurantId: req.restaurantId });
    res.json(restaurant);
  } catch (error) {
    logger.error("[GET Restaurant] Error:", { restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// PUT /restaurantes/:restaurantId
router.put("/:restaurantId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const { name, logo_url, colors, fontFamily, nameFont, templateId, sections } = req.body;

  try {
    const updateData = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (colors) updateData.colors = typeof colors === "object" ? JSON.stringify(colors) : colors;
    if (fontFamily) updateData.font_family = fontFamily;
    if (nameFont) updateData.name_font = nameFont;
    if (templateId !== undefined) updateData.template_id = templateId;
    if (sections !== undefined) updateData.sections = typeof sections === "object" ? JSON.stringify(sections) : sections;

    const fields = Object.keys(updateData).map((key) => `${key} = ?`).join(", ");
    const values = Object.values(updateData);
    values.push(req.restaurantId);

    logger.info("[PUT Restaurant] Actualizando restaurante", { restaurantId: req.restaurantId, updateData });

    const [result] = await pool.query(`UPDATE restaurants SET ${fields} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      logger.warn("[PUT Restaurant] Restaurante no encontrado", { restaurantId: req.restaurantId });
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }

    const [updatedRows] = await pool.query(
      "SELECT id, name, template_id, colors, logo_url, sections, name_font, font_family, plan_id, estado FROM restaurants WHERE id = ?",
      [req.restaurantId]
    );
    const updatedRestaurant = updatedRows[0];
    updatedRestaurant.colors = safeParseJSON(updatedRestaurant.colors, null, "colors");
    updatedRestaurant.sections = safeParseJSON(updatedRestaurant.sections, null, "sections");

    logger.info("[PUT Restaurant] Restaurante actualizado", { restaurantId: req.restaurantId });
    res.json({
      success: true,
      message: "Restaurante actualizado correctamente",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    logger.error("[PUT Restaurant] Error:", { restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// PUT /restaurantes/:restaurantId/estado
router.put("/:restaurantId/estado", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const { estado } = req.body;
  if (!estado || !["activo", "suspendido"].includes(estado)) {
    logger.warn("[PUT Estado] Estado inválido", { estado, restaurantId: req.restaurantId });
    return res.status(400).json({ error: "Estado es obligatorio y debe ser 'activo' o 'suspendido'" });
  }

  try {
    const [result] = await pool.query("UPDATE restaurants SET estado = ?, updated_at = NOW() WHERE id = ?", [estado, req.restaurantId]);
    if (result.affectedRows === 0) {
      logger.warn("[PUT Estado] Restaurante no encontrado", { restaurantId: req.restaurantId });
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    logger.info("[PUT Estado] Estado actualizado", { restaurantId: req.restaurantId, estado });
    res.json({ success: true, message: "Estado actualizado" });
  } catch (error) {
    logger.error("[PUT Estado] Error:", { restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// PUT /restaurantes/:restaurantId/template
router.put("/:restaurantId/template", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const { templateId } = req.body;

  if (!templateId || isNaN(templateId)) {
    logger.warn("[PUT Template] templateId inválido o no proporcionado", { templateId, restaurantId: req.restaurantId });
    return res.status(400).json({ error: "templateId es obligatorio y debe ser un número válido" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [templateRows] = await connection.query(
        "SELECT id, name, fields, default_colors, default_font FROM menu_templates WHERE id = ? AND is_active = 1",
        [templateId]
      );
      if (!templateRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Plantilla no encontrada o no activa" });
      }
      const template = templateRows[0];
      const templateFields = safeParseJSON(template.fields, []);

      const [defaultItems] = await connection.query(
        "SELECT id, name, description, price, category, image_url FROM default_menu_items WHERE category IN (?)",
        [templateFields]
      );

      const [currentRestaurantRows] = await connection.query(
        "SELECT sections FROM restaurants WHERE id = ?",
        [req.restaurantId]
      );
      const currentRestaurant = currentRestaurantRows[0];
      const currentSections = safeParseJSON(currentRestaurant.sections, []);

      const [currentItemsRows] = await connection.query(
        "SELECT id, name, price, description, category, image_url FROM menu_items WHERE restaurant_id = ?",
        [req.restaurantId]
      );
      const currentItems = currentItemsRows;

      const newSections = templateFields.map(section => {
        const existingItems = currentItems.filter(item => item.category === section);
        const predefinedItems = defaultItems
          .filter(item => item.category === section)
          .map(item => ({
            name: item.name,
            price: item.price,
            description: item.description,
            category: item.category,
            image_url: item.image_url
          }));
        const items = existingItems.length > 0 ? existingItems : predefinedItems;
        return { section, items };
      });

      const unassignedItems = currentItems.filter(item => !templateFields.includes(item.category));
      if (unassignedItems.length) {
        newSections.push({ section: "Otros", items: unassignedItems });
      }

      const updateQuery = `
        UPDATE restaurants 
        SET template_id = ?, sections = ?, colors = ?, font_family = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const updateParams = [
        templateId,
        JSON.stringify(newSections),
        JSON.stringify(safeParseJSON(template.default_colors, { primary: "#FF9800", secondary: "#4CAF50" })),
        template.default_font || "Roboto",
        req.restaurantId
      ];

      const [result] = await connection.query(updateQuery, updateParams);
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "No se pudo actualizar el restaurante" });
      }

      // Obtener el restaurante actualizado
      const [updatedRows] = await connection.query(
        "SELECT id, name, template_id, colors, logo_url, sections, name_font, font_family, plan_id, estado FROM restaurants WHERE id = ?",
        [req.restaurantId]
      );
      const updatedRestaurant = updatedRows[0];
      updatedRestaurant.sections = safeParseJSON(updatedRestaurant.sections, []);
      updatedRestaurant.colors = safeParseJSON(updatedRestaurant.colors, []);

      const [updatedItems] = await connection.query(
        "SELECT id, name, price, description, category, image_url FROM menu_items WHERE restaurant_id = ?",
        [req.restaurantId]
      );

      await connection.commit();
      logger.info("[PUT Template] Plantilla aplicada correctamente", { restaurantId: req.restaurantId, templateId });

      res.json({
        success: true,
        message: "Plantilla aplicada correctamente",
        restaurant: updatedRestaurant,
        items: updatedItems,
        templateName: template.name // Agregar el nombre de la plantilla en la respuesta
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("[PUT Template] Error:", { restaurantId: req.restaurantId, templateId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// GET /restaurantes/:restaurantId/items
router.get("/:restaurantId/items", authMiddleware, checkRestaurantPermission, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, price, description, category, image_url FROM menu_items WHERE restaurant_id = ?",
      [req.restaurantId]
    );
    logger.info("[GET Items] Ítems cargados", { restaurantId: req.restaurantId, count: rows.length });
    res.json(rows || []);
  } catch (error) {
    logger.error("[GET Items] Error detallado:", { restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor al cargar ítems", details: error.message });
  }
});

// POST /restaurantes/:restaurantId/items
router.post("/:restaurantId/items", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const { name, price, description, category, image_url } = req.body;
  if (!name || !price || !category) {
    logger.warn("[POST Item] Datos incompletos", { restaurantId: req.restaurantId, body: req.body });
    return res.status(400).json({ error: "Nombre, precio y categoría son obligatorios" });
  }

  try {
    const query = "INSERT INTO menu_items (restaurant_id, name, price, description, category, image_url) VALUES (?, ?, ?, ?, ?, ?)";
    const params = [req.restaurantId, name, price, description || null, category, image_url || null];
    const [result] = await pool.query(query, params);

    const [newItemRows] = await pool.query(
      "SELECT id, name, price, description, category, image_url FROM menu_items WHERE id = ?",
      [result.insertId]
    );
    const newItem = newItemRows[0];

    logger.info("[POST Item] Ítem creado", { itemId: result.insertId, restaurantId: req.restaurantId });
    res.status(201).json(newItem);
  } catch (error) {
    logger.error("[POST Item] Error:", { restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// PUT /restaurantes/:restaurantId/items/:itemId
router.put("/:restaurantId/items/:itemId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const { name, price, description, category, image_url } = req.body;

  // Validación adicional
  if (isNaN(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "ID de ítem inválido" });
  }

  if (!name || !price || !category) {
    return res.status(400).json({ error: "Nombre, precio y categoría son obligatorios" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE menu_items SET name = ?, price = ?, description = ?, category = ?, image_url = ? WHERE id = ? AND restaurant_id = ?",
      [name, price, description || null, category, image_url || null, itemId, req.restaurantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ítem no encontrado o no pertenece a este restaurante" });
    }

    // Devolver el ítem actualizado
    const [updatedItem] = await pool.query(
      "SELECT id, name, price, description, category, image_url FROM menu_items WHERE id = ?",
      [itemId]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    logger.error("[PUT Item] Error:", { itemId, restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// DELETE /restaurantes/:restaurantId/items/:itemId
router.delete("/:restaurantId/items/:itemId", authMiddleware, checkRestaurantPermission, async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(itemId)) {
    logger.warn("[DELETE Item] ID de ítem inválido", { itemId: req.params.itemId, restaurantId: req.restaurantId });
    return res.status(400).json({ error: "ID de ítem inválido" });
  }

  try {
    const [result] = await pool.query("DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?", [itemId, req.restaurantId]);
    if (result.affectedRows === 0) {
      logger.warn("[DELETE Item] Ítem no encontrado", { itemId, restaurantId: req.restaurantId });
      return res.status(404).json({ error: "Ítem no encontrado" });
    }
    logger.info("[DELETE Item] Ítem eliminado", { itemId, restaurantId: req.restaurantId });
    res.json({ success: true, message: "Ítem eliminado" });
  } catch (error) {
    logger.error("[DELETE Item] Error:", { itemId, restaurantId: req.restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// GET /restaurantes/menu_templates
router.get("/menu_templates", authMiddleware, async (req, res) => {
  try {
    const [templateRows] = await pool.query(
      "SELECT id, type, name, fields, default_colors, default_font, layout_type, background_image, theme_id, currency, language, price_display, is_active FROM menu_templates WHERE is_active = 1"
    );

    if (!templateRows.length) {
      logger.info("[GET Templates] No hay plantillas disponibles", { userId: req.user.id });
      return res.status(404).json({ message: "No hay plantillas disponibles" });
    }

    const [defaultItems] = await pool.query(
      "SELECT id, name, description, price, category, image_url FROM default_menu_items"
    );

    const itemsByCategory = defaultItems.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: parseFloat(item.price),
        category: item.category,
        image_url: item.image_url || null,
      });
      return acc;
    }, {});

    const templates = templateRows.map((row) => {
      const rawFields = safeParseJSON(row.fields, [], "fields");
      const templateSections = Array.isArray(rawFields)
        ? rawFields.map((category) => ({
            section: category,
            items: itemsByCategory[category] || [],
          }))
        : [];

      return {
        id: row.id,
        type: row.type,
        name: row.name,
        fields: templateSections,
        default_colors: safeParseJSON(row.default_colors, { primary: "#FF9800", secondary: "#4CAF50" }, "default_colors"),
        default_font: row.default_font || "Roboto",
        layout_type: row.layout_type || "list",
        background_image: row.background_image || null,
        theme_id: row.theme_id || null,
        currency: row.currency || "PEN",
        language: row.language || "es",
        price_display: row.price_display || "with_decimals",
        is_active: row.is_active,
      };
    });

    logger.info("[GET Templates] Plantillas cargadas con éxito", { userId: req.user.id, count: templates.length });
    res.json(templates);
  } catch (error) {
    logger.error("[GET Templates] Error:", { userId: req.user.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// GET /restaurantes/:restaurantId/menu_templates
router.get("/:restaurantId/menu_templates", authMiddleware, async (req, res) => {
  const { restaurantId } = req.params;

  if (!restaurantId || isNaN(restaurantId)) {
    logger.warn("[GET Templates] ID de restaurante inválido", { restaurantId, userId: req.user.id });
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const [templateRows] = await pool.query(
      "SELECT id, type, name, fields, default_colors, default_font, layout_type, background_image, theme_id, currency, language, price_display, is_active FROM menu_templates WHERE is_active = 1"
    );

    if (!templateRows.length) {
      logger.info("[GET Templates] No hay plantillas disponibles", { userId: req.user.id, restaurantId });
      return res.status(404).json({ message: "No hay plantillas disponibles" });
    }

    const [defaultItems] = await pool.query(
      "SELECT id, name, description, price, category, image_url FROM default_menu_items"
    );

    const templates = templateRows.map(template => ({
      ...template,
      fields: safeParseJSON(template.fields, []),
      default_colors: safeParseJSON(template.default_colors, { primary: "#FF9800", secondary: "#4CAF50" }),
      default_items: defaultItems.filter(item => template.fields.includes(item.category))
    }));

    logger.info("[GET Templates] Plantillas obtenidas correctamente", { userId: req.user.id, restaurantId });
    res.json(templates);
  } catch (error) {
    logger.error("[GET Templates] Error:", { userId: req.user.id, restaurantId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

module.exports = router;