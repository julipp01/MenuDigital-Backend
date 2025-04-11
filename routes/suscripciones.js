const express = require("express");
const router = express.Router();
const { getSuscripciones, getReporteFacturacion, getAlertasVencimiento } = require("../controllers/suscripcionesController");

// Obtener todas las suscripciones (activas, canceladas, en prueba)
router.get("/", getSuscripciones);

// Obtener reporte de facturación
router.get("/reportes", getReporteFacturacion);

// Obtener alertas de vencimiento de suscripciones
router.get("/alertas", getAlertasVencimiento);

module.exports = router;
