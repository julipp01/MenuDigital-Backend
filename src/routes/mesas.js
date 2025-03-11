const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// 🔹 Obtener las mesas con QR
router.get("/", async (req, res) => {
  try {
    const [mesas] = await pool.query("SELECT id, numero_mesa, qr_url FROM mesas");
    res.json(mesas);
  } catch (error) {
    console.error("❌ Error en /mesas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;

