const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Asegúrate de que apunta correctamente a la BD

// Obtener todas las suscripciones (Administración)
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, s.status, p.name AS plan_name
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.id
        `);
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo las suscripciones:", error);
        res.status(500).json({ error: "Error al obtener las suscripciones" });
    }
});

module.exports = router;

