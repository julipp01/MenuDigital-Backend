const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

console.log("✅ [userRoutes] Cargando rutas de usuario...");

// 🔹 Obtener todos los usuarios
router.get("/", authMiddleware, userController.getAllUsers);

// 🔹 Obtener información del usuario autenticado
router.get("/info", authMiddleware, userController.getUserInfo);

// 🔹 Crear un nuevo usuario
router.post("/", authMiddleware, userController.createUser);

// 🔹 Actualizar usuario
router.put("/:id", authMiddleware, userController.updateUser);

// 🔹 Eliminar usuario
router.delete("/:id", authMiddleware, userController.deleteUser);

module.exports = router;




