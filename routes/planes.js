const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Asegúrate de que la conexión a la BD está bien

// Obtener todos los planes
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM subscription_plans");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los planes:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

module.exports = router;

