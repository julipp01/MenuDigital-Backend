const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ✅ Registro
router.post("/register", authController.register);

// ✅ Login
router.post("/login", authController.login);

// ✅ Obtener el plan del usuario
router.get("/:id/plan", authMiddleware, authController.getUserPlan);

module.exports = router;


