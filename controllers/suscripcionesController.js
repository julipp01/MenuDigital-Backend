const pool = require("../config/db"); // Asegúrate de que la conexión a la BD esté configurada

// Obtener todas las suscripciones activas, canceladas y en prueba
const getSuscripciones = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM subscriptions");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener suscripciones:", error);
    res.status(500).json({ error: "Error al obtener suscripciones" });
  }
};

// Obtener reporte de facturación
const getReporteFacturacion = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sp.name AS plan, COUNT(s.id) AS total_suscripciones, SUM(sp.price) AS ingresos
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'activa'
      GROUP BY sp.name
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener el reporte de facturación:", error);
    res.status(500).json({ error: "Error al obtener el reporte de facturación" });
  }
};

// Obtener alertas de vencimiento de suscripciones
const getAlertasVencimiento = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.name AS usuario, sp.name AS plan, s.end_date AS vencimiento
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.end_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener alertas de vencimiento:", error);
    res.status(500).json({ error: "Error al obtener alertas de vencimiento" });
  }
};

module.exports = {
  getSuscripciones,
  getReporteFacturacion,
  getAlertasVencimiento,
};
