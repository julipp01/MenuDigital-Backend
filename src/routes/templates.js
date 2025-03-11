// backend/src/routes/templates.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    console.log("No se proporcionó token en la solicitud a /templates.");
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET || "secret_key");
    console.log("Token decodificado en /templates:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error al verificar token en /templates:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

router.get("/", async (req, res) => {
  try {
    const [templates] = await pool.query("SELECT * FROM menu_templates");
    const parsedTemplates = templates.map(template => {
      let defaultColors, fields;
      try {
        defaultColors = template.default_colors ? JSON.parse(template.default_colors) : { primary: "#FF9800", secondary: "#4CAF50" };
      } catch (e) {
        console.error(`Error parsing default_colors for template ${template.id}:`, e.message, "Valor original:", template.default_colors);
        defaultColors = { primary: "#FF9800", secondary: "#4CAF50" };
      }
      try {
        fields = template.fields ? JSON.parse(template.fields) : { "Platos Principales": [], "Postres": [], "Bebidas": [] };
      } catch (e) {
        console.error(`Error parsing fields for template ${template.id}:`, e.message, "Valor original:", template.fields);
        fields = { "Platos Principales": [], "Postres": [], "Bebidas": [] };
      }
      return {
        id: template.id,
        type: template.type,
        name: template.name,
        fields: fields,
        default_colors: defaultColors,
      };
    });
    console.log("Plantillas enviadas al frontend:", parsedTemplates);
    res.json(parsedTemplates);
  } catch (error) {
    console.error("Error al obtener plantillas:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

router.post("/restaurants/:restaurantId/template", authMiddleware, async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId);
  const { templateId } = req.body;
  console.log("Solicitud recibida para asignar plantilla:", { restaurantId, templateId });
  if (!templateId || isNaN(restaurantId)) {
    console.log("Datos faltantes o inválidos:", { templateId, restaurantId });
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }
  try {
    const [result] = await pool.query(
      "UPDATE restaurants SET template_id = ? WHERE id = ?",
      [templateId, restaurantId]
    );
    if (result.affectedRows === 0) {
      console.log("No se encontró restaurante con id:", restaurantId);
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }
    console.log("Plantilla asignada con éxito a restaurantId:", restaurantId);
    res.json({ message: "Plantilla asignada con éxito" });
  } catch (error) {
    console.error("Error al asignar plantilla:", error);
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

module.exports = router;