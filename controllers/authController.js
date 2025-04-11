const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

// Función para registrar un usuario y asignarle automáticamente el plan free y un restaurante
exports.register = async (req, res) => {
  try {
    // Se reciben los datos básicos; el restaurant_id se creará automáticamente.
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const emailLower = email.toLowerCase();
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = ?",
      [emailLower]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = "free"; // Valor por defecto para usuarios nuevos

    // Insertar usuario en la tabla 'users' sin restaurant_id (se asignará luego)
    const [userResult] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, emailLower, hashedPassword, role]
    );
    const userId = userResult.insertId;

    // Consultar el usuario recién insertado
    const [userRows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado después del registro" });
    }
    const user = userRows[0];

    // Asignar automáticamente el plan free sin caducidad (simulado con 10 años de vigencia)
    // Se asume que el plan free tiene plan_id = 1 en la tabla subscription_plans
    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 YEAR), 'active')",
      [userId, 1]
    );

    // Crear automáticamente un restaurante para el usuario.
    // El nombre se genera en función del nombre del usuario; el plan del restaurante también se asigna (suponiendo plan_id = 1 para free).
    const restaurantName = `Restaurante de ${name}`;
    const [restaurantResult] = await pool.query(
      "INSERT INTO restaurants (name, owner_id, plan_id) VALUES (?, ?, ?)",
      [restaurantName, userId, 1]
    );
    const restaurantId = restaurantResult.insertId;

    // Actualizar el usuario con el restaurant_id recién creado
    await pool.query("UPDATE users SET restaurant_id = ? WHERE id = ?", [restaurantId, userId]);
    user.restaurant_id = restaurantId; // Actualizamos el objeto usuario

    // Generar token de autenticación incluyendo el restaurantId
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("✅ Registro exitoso:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id
    });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id
      }
    });
  } catch (err) {
    console.error("❌ Error en el registro:", err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Función para iniciar sesión
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const emailLower = email.toLowerCase();
    const [users] = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [emailLower]);

    if (users.length === 0) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // Generar token incluyendo restaurantId
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("✅ Login exitoso:", { id: user.id, name: user.name, role: user.role });
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id
      }
    });
  } catch (err) {
    console.error("❌ Error en el login:", err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Función para obtener el plan del usuario (basado en suscripciones)
exports.getUserPlan = async (req, res) => {
  try {
    // Nota: Esta función sigue usando req.params.id; si deseas usar el id del usuario autenticado, deberías cambiarlo a req.user.id
    const userId = req.params.id;

    const [result] = await pool.query(
      `SELECT sp.id AS plan_id, sp.name, sp.price, s.start_date, s.end_date, s.status
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id 
       WHERE s.user_id = ? AND s.status = 'active'`,
      [userId]
    );

    if (!result.length) {
      console.log(`⚠️ No hay suscripción activa para el usuario ${userId}`);
      // Retornamos 200 con plan null para que el frontend lo maneje
      return res.status(200).json({ plan: null });
    }

    console.log("✅ [API] Datos del plan enviados:", result[0]);
    res.status(200).json(result[0]);
  } catch (error) {
    console.error("❌ Error obteniendo plan:", error.message);
    res.status(500).json({ error: "Error en el servidor al obtener el plan" });
  }
};

module.exports = exports;

