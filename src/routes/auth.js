// backend/src/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    console.log("[AUTH] No se proporcionó token en la solicitud.");
    return res.status(401).json({ error: "No se proporcionó token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[AUTH] Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[AUTH] Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// 🔹 Registro de usuario
router.post("/register", async (req, res) => {
  console.log(`[REGISTER] Solicitud recibida: ${JSON.stringify({ name: req.body.name, email: req.body.email })}`);
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      console.error("[REGISTER] Error: Faltan campos obligatorios.");
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const emailLower = email.toLowerCase();
    const [existing] = await pool.query("SELECT id FROM users WHERE LOWER(email) = ?", [emailLower]);
    if (existing.length > 0) {
      console.warn(`[REGISTER] Intento de registro con email existente: ${emailLower}`);
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = "free";

    // Iniciar transacción para crear restaurante, usuario e ítems predefinidos
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insertar un nuevo restaurante
      const [restaurantResult] = await connection.query(
        "INSERT INTO restaurants (name, template_id, colors) VALUES (?, ?, ?)",
        [name + "'s Restaurant", 2, '{"primary": "#F28C38", "secondary": "#1A1A1A"}'] // Pollería por defecto
      );
      const restaurantId = restaurantResult.insertId;
      console.log(`[REGISTER] Restaurante creado con ID: ${restaurantId}`);

      // Insertar el usuario con el restaurant_id
      const [userResult] = await connection.query(
        "INSERT INTO users (name, email, password, role, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        [name, emailLower, hashedPassword, role, restaurantId]
      );
      console.log(`[REGISTER] Usuario registrado: ${emailLower} (ID: ${userResult.insertId}, restaurant_id: ${restaurantId})`);

      // Ítems predefinidos de Pollería (template_id = 2)
      const predefinedItems = [
        { category: "Entradas", name: "Salchipapas Especial", price: 18, description: "Papas fritas con salchicha, queso y salsas", image_url: "" },
        { category: "Entradas", name: "Anticuchos de Corazón", price: 25, description: "Servidos con papas doradas y ají especial", image_url: "" },
        { category: "Entradas", name: "Choclo con Queso", price: 15, description: "Choclo tierno acompañado de queso serrano", image_url: "" },
        { category: "Platos Principales", name: "Pollo a la Brasa (1/4 con papas y ensalada)", price: 22, description: "", image_url: "" },
        { category: "Platos Principales", name: "Pollo a la Brasa (1/2 con papas y ensalada)", price: 40, description: "", image_url: "" },
        { category: "Platos Principales", name: "Pollo Entero + Papas + Ensalada + Gaseosa 1.5L", price: 78, description: "", image_url: "" },
        { category: "Acompañamientos", name: "Papas fritas adicionales", price: 10, description: "", image_url: "" },
        { category: "Acompañamientos", name: "Ensalada fresca", price: 8, description: "", image_url: "" },
        { category: "Acompañamientos", name: "Arroz chaufa de pollo", price: 18, description: "", image_url: "" },
        { category: "Postres", name: "Crema Volteada", price: 12, description: "", image_url: "" },
        { category: "Postres", name: "Pie de Limón", price: 14, description: "", image_url: "" },
        { category: "Bebidas", name: "Chicha Morada 1 vaso", price: 10, description: "", image_url: "" },
        { category: "Bebidas", name: "Gaseosa personal", price: 8, description: "", image_url: "" },
        { category: "Bebidas", name: "Cerveza 620ml", price: 18, description: "", image_url: "" },
      ];

      const values = predefinedItems.map(item => [
        restaurantId,
        item.name,
        item.price,
        item.description,
        item.category,
        item.image_url
      ]);

      await connection.query(
        "INSERT INTO menu_items (restaurant_id, name, price, description, category, image_url) VALUES ?",
        [values]
      );
      console.log(`[REGISTER] Ítems predefinidos insertados para restaurant_id: ${restaurantId}`);

      await connection.commit();

      const token = jwt.sign(
        { id: userResult.insertId, email: emailLower, name, role, restaurantId },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.status(201).json({ id: userResult.insertId, name, email: emailLower, role, restaurantId, token });
    } catch (error) {
      await connection.rollback();
      console.error("[REGISTER] Error en la transacción:", error);
      res.status(500).json({ error: "Error al registrar usuario y restaurante", details: error.message });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("[REGISTER] Error en el registro:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🔹 Login de usuario (sin cambios)
router.post("/login", async (req, res) => {
  console.log(`[LOGIN] Solicitud recibida: ${JSON.stringify({ email: req.body.email })}`);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.error("[LOGIN] Error: Faltan email o contraseña.");
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const emailLower = email.toLowerCase();
    const [rows] = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [emailLower]);
    console.log(`[LOGIN] Resultado de la consulta: ${rows.length} usuarios encontrados`);
    if (rows.length === 0) {
      console.warn(`[LOGIN] Usuario no encontrado: ${emailLower}`);
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] Comparación de contraseña: ${isMatch ? "Correcta" : "Incorrecta"}`);
    if (!isMatch) {
      console.warn(`[LOGIN] Contraseña incorrecta para: ${emailLower}`);
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, restaurantId: user.restaurant_id },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`[LOGIN] Usuario autenticado: ${emailLower} (restaurant_id: ${user.restaurant_id})`);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurant_id },
    });
  } catch (err) {
    console.error("[LOGIN] Error en login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🔹 Actualizar Plan del Usuario (sin cambios)
router.put("/update-plan", authMiddleware, async (req, res) => {
  // ... (sin cambios aquí)
});

module.exports = router;






