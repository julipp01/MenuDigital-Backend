const pool = require("../config/db");

/**
 * Obtener todas las plantillas de menú desde la base de datos.
 */
exports.getTemplates = async (req, res) => {
  try {
    console.log("📩 [TEMPLATES] Solicitud recibida para obtener plantillas...");

    // 🔹 Consultar todas las plantillas desde `menu_templates`
    const [templates] = await pool.query("SELECT * FROM menu_templates");

    if (!templates.length) {
      console.warn("⚠️ [TEMPLATES] No se encontraron plantillas en la base de datos.");
      return res.status(404).json({ error: "No hay plantillas disponibles" });
    }

    // 🔹 Convertir `default_colors` y `fields` a objetos JSON correctamente
    const formattedTemplates = templates.map(template => {
      let parsedColors = {};
      let parsedFields = {};

      try {
        parsedColors = typeof template.default_colors === "string"
          ? JSON.parse(template.default_colors)
          : template.default_colors;
      } catch (error) {
        console.error(`❌ [TEMPLATES] Error al parsear default_colors en template ID ${template.id}:`, error.message);
      }

      try {
        parsedFields = typeof template.fields === "string"
          ? JSON.parse(template.fields)
          : template.fields;
      } catch (error) {
        console.error(`❌ [TEMPLATES] Error al parsear fields en template ID ${template.id}:`, error.message);
      }

      return {
        id: template.id,
        type: template.type,
        name: template.name,
        default_colors: parsedColors,
        fields: parsedFields,
      };
    });

    console.log("✅ [TEMPLATES] Plantillas enviadas al frontend:", formattedTemplates);
    res.json(formattedTemplates);
  } catch (error) {
    console.error("❌ [TEMPLATES] Error en el servidor al obtener plantillas:", error.message);
    res.status(500).json({ error: "Error en el servidor al obtener plantillas" });
  }
};

/**
 * Crear una nueva plantilla de menú.
 */
exports.createTemplate = async (req, res) => {
  try {
    console.log("📩 [TEMPLATES] Solicitud para crear una nueva plantilla:", req.body);

    const { type, name, default_colors, fields } = req.body;

    if (!type || !name || !default_colors || !fields) {
      console.warn("⚠️ [TEMPLATES] Falta información obligatoria.");
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // 🔹 Convertir `default_colors` y `fields` a JSON si es necesario
    const colorsJSON = typeof default_colors === "object" ? JSON.stringify(default_colors) : default_colors;
    const fieldsJSON = typeof fields === "object" ? JSON.stringify(fields) : fields;

    const [result] = await pool.query(
      "INSERT INTO menu_templates (type, name, default_colors, fields) VALUES (?, ?, ?, ?)",
      [type, name, colorsJSON, fieldsJSON]
    );

    console.log("✅ [TEMPLATES] Plantilla creada con éxito. ID:", result.insertId);
    res.status(201).json({ id: result.insertId, type, name, default_colors, fields });
  } catch (error) {
    console.error("❌ [TEMPLATES] Error al crear la plantilla:", error.message);
    res.status(500).json({ error: "Error en el servidor al crear plantilla" });
  }
};

/**
 * Actualizar una plantilla existente.
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📩 [TEMPLATES] Solicitud para actualizar plantilla ID ${id}:`, req.body);

    const { type, name, default_colors, fields } = req.body;
    if (!type || !name || !default_colors || !fields) {
      console.warn("⚠️ [TEMPLATES] Falta información para actualizar.");
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // 🔹 Convertir `default_colors` y `fields` a JSON si es necesario
    const colorsJSON = typeof default_colors === "object" ? JSON.stringify(default_colors) : default_colors;
    const fieldsJSON = typeof fields === "object" ? JSON.stringify(fields) : fields;

    const [result] = await pool.query(
      "UPDATE menu_templates SET type = ?, name = ?, default_colors = ?, fields = ? WHERE id = ?",
      [type, name, colorsJSON, fieldsJSON, id]
    );

    if (result.affectedRows === 0) {
      console.warn(`⚠️ [TEMPLATES] No se encontró la plantilla con ID ${id}.`);
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }

    console.log(`✅ [TEMPLATES] Plantilla ID ${id} actualizada con éxito.`);
    res.json({ id, type, name, default_colors, fields });
  } catch (error) {
    console.error("❌ [TEMPLATES] Error al actualizar la plantilla:", error.message);
    res.status(500).json({ error: "Error en el servidor al actualizar plantilla" });
  }
};

/**
 * Eliminar una plantilla de menú.
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📩 [TEMPLATES] Solicitud para eliminar plantilla ID ${id}`);

    const [result] = await pool.query("DELETE FROM menu_templates WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      console.warn(`⚠️ [TEMPLATES] No se encontró la plantilla con ID ${id}.`);
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }

    console.log(`✅ [TEMPLATES] Plantilla ID ${id} eliminada con éxito.`);
    res.json({ message: "Plantilla eliminada con éxito", id });
  } catch (error) {
    console.error("❌ [TEMPLATES] Error al eliminar la plantilla:", error.message);
    res.status(500).json({ error: "Error en el servidor al eliminar plantilla" });
  }
};
