// routes/modules.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
};

// GET /modules-config/:rango
router.get("/:rango", authenticateToken, async (req, res) => {
  const { rango } = req.params;
  const userId = req.query.user_id;

  if (!userId) return res.status(400).json({ error: "user_id es requerido" });

  try {
    let baseModules = [];
    if (rango === "admin") {
      [baseModules] = await db.query("SELECT * FROM modules_config WHERE enabled = 1 ORDER BY orden ASC");
    } else {
      [baseModules] = await db.query(
        "SELECT * FROM modules_config WHERE rango = ? AND enabled = 1 ORDER BY orden ASC",
        [rango]
      );
    }

    const [userModules] = await db.query(
      `SELECT mc.* FROM user_modules um
       JOIN modules_config mc ON um.module_id = mc.id
       WHERE um.user_id = ? AND um.enabled = 1`,
      [userId]
    );

    let allModules = [...baseModules];
    userModules.forEach((userModule) => {
      if (!allModules.some((mod) => mod.id === userModule.id)) {
        allModules.push(userModule);
      }
    });

    if (rango === "free") allModules = allModules.slice(0, 5);
    allModules.sort((a, b) => a.orden - b.orden);

    res.json(allModules);
  } catch (error) {
    console.error("Error al obtener los módulos:", error);
    res.status(500).json({ error: "Error al obtener los módulos" });
  }
});

// POST /modules-config
router.post("/", authenticateToken, async (req, res) => {
  const { rango, module_name, path, icon, orden, enabled } = req.body;

  if (!rango || !module_name || !path || !icon) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO modules_config (rango, module_name, path, icon, orden, enabled) VALUES (?, ?, ?, ?, ?, ?)",
      [rango, module_name, path, icon, orden || 99, enabled ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, message: "Módulo creado correctamente" });
  } catch (error) {
    console.error("Error al crear el módulo:", error);
    res.status(500).json({ error: "Error al crear el módulo" });
  }
});

// POST /modules-config/update
router.post("/update", authenticateToken, async (req, res) => {
  const { id, module_name, path, icon, orden, enabled } = req.body;

  if (!id || !module_name || !path || !icon) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    await db.query(
      "UPDATE modules_config SET module_name = ?, path = ?, icon = ?, orden = ?, enabled = ?, updated_at = NOW() WHERE id = ?",
      [module_name, path, icon, orden || 99, enabled ? 1 : 0, id]
    );
    res.status(200).json({ message: "Módulo actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el módulo:", error);
    res.status(500).json({ error: "Error al actualizar el módulo" });
  }
});

// DELETE /modules-config/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM modules_config WHERE id = ?", [id]);
    res.status(200).json({ message: "Módulo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el módulo:", error);
    res.status(500).json({ error: "Error al eliminar el módulo" });
  }
});

// POST /modules-config/assign-to-user
router.post("/assign-to-user", authenticateToken, async (req, res) => {
  const { user_id, module_id, enabled } = req.body;

  if (!user_id || !module_id) {
    return res.status(400).json({ error: "Faltan campos requeridos: user_id y module_id" });
  }

  try {
    await db.query(
      "INSERT INTO user_modules (user_id, module_id, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = ?",
      [user_id, module_id, enabled ? 1 : 0, enabled ? 1 : 0]
    );
    res.status(200).json({ message: "Módulo asignado correctamente" });
  } catch (error) {
    console.error("Error al asignar el módulo:", error);
    res.status(500).json({ error: "Error al asignar el módulo" });
  }
});

module.exports = router;