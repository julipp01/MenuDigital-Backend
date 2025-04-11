// backend/src/routes/dashboard.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No se proporcionó token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Error en authMiddleware:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// 🔹 Obtener estadísticas generales del dashboard
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    console.log("📩 Solicitud de estadísticas recibida");

    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      throw new Error("ID de restaurante no encontrado en el token");
    }

    // Consulta para contar ítems del menú
    const [menuRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM menu_items WHERE restaurant_id = ?",
      [restaurantId]
    );
    console.log("Resultado de menu_items:", menuRows);

    // Consulta para contar restaurantes (solo admin)
    let restaurantRows = [{ total: 1 }]; // Valor por defecto para no admins
    if (req.user.role === "admin") {
      [restaurantRows] = await pool.query("SELECT COUNT(*) AS total FROM restaurants");
    }
    console.log("Resultado de restaurants:", restaurantRows);

    // Validar resultados
    const totalPlatos = menuRows && menuRows[0] && typeof menuRows[0].total === "number" 
      ? menuRows[0].total 
      : 0;
    const totalRestaurantes = restaurantRows && restaurantRows[0] && typeof restaurantRows[0].total === "number" 
      ? restaurantRows[0].total 
      : 0;

    res.json({
      totalPlatos,
      totalRestaurantes,
    });
  } catch (error) {
    console.error("❌ Error en /dashboard/stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

module.exports = router;


