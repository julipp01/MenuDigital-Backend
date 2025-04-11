const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware para autenticación con logs detallados
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.warn("⚠️ [AUTH] No se proporcionó token en la solicitud.");
    return res.status(401).json({ error: "No se proporcionó token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("✅ [AUTH] Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ [AUTH] Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Función auxiliar para parsear JSON con valores por defecto
const parseJSON = (data, defaultValue, label, templateId) => {
  if (!data) return defaultValue;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`❌ [TEMPLATES] Error parsing ${label} en template ID ${templateId}:`, e.message);
      return defaultValue;
    }
  }
  return data;
};

// Función para transformar una plantilla
const transformTemplate = (template) => {
  const defaultColors = { primary: "#FF9800", secondary: "#4CAF50" };
  const defaultFields = { "Platos Principales": [], "Bebidas": [] };

  return {
    id: template.id,
    type: template.type,
    name: template.name,
    fields: parseJSON(template.fields, defaultFields, "fields", template.id),
    default_colors: parseJSON(template.default_colors, defaultColors, "default_colors", template.id),
    default_font: template.default_font || "Roboto",
    layout_type: template.layout_type || "list",
    background_image: template.background_image || null,
    currency: template.currency || "PEN",
    language: template.language || "es",
    is_active: !!template.is_active,
  };
};

// Obtener todas las plantillas
router.get("/", authMiddleware, async (req, res) => {
  const { showInactive = "false" } = req.query;
  const showAll = showInactive === "true";

  try {
    console.log("📩 [TEMPLATES] Solicitud recibida para obtener plantillas...");
    const query = showAll
      ? "SELECT * FROM menu_templates"
      : "SELECT * FROM menu_templates WHERE is_active = 1";
    const [templates] = await pool.query(query);

    if (!templates.length) {
      console.warn("⚠️ [TEMPLATES] No se encontraron plantillas disponibles.");
      return res.status(404).json({ error: "No hay plantillas disponibles" });
    }

    const parsedTemplates = templates.map(transformTemplate);
    console.log("✅ [TEMPLATES] Plantillas enviadas al frontend:", parsedTemplates.length);
    res.json(parsedTemplates);
  } catch (error) {
    console.error("❌ [TEMPLATES] Error al obtener plantillas:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// Obtener una plantilla específica
router.get("/:templateId", authMiddleware, async (req, res) => {
  const templateId = parseInt(req.params.templateId, 10);

  if (isNaN(templateId) || templateId <= 0) {
    console.warn("[TEMPLATES] ID de plantilla inválido:", req.params.templateId);
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    console.log("📩 [TEMPLATES] Solicitud recibida para plantilla ID:", templateId);
    const [templates] = await pool.query("SELECT * FROM menu_templates WHERE id = ?", [templateId]);

    if (!templates.length) {
      console.warn(`⚠️ [TEMPLATES] Plantilla con ID ${templateId} no encontrada.`);
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }

    const parsedTemplate = transformTemplate(templates[0]);
    console.log("✅ [TEMPLATES] Plantilla enviada al frontend:", parsedTemplate);
    res.json(parsedTemplate);
  } catch (error) {
    console.error("❌ [TEMPLATES] Error al obtener plantilla:", error.message);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

module.exports = router;
