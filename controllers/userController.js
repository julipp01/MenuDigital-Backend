const pool = require("../config/db");
const bcrypt = require("bcryptjs"); // Asegúrate de instalar bcryptjs: `npm install bcryptjs`

console.log("✅ [userController] Controlador de usuario cargado.");

// ✅ Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    console.log("📥 [getAllUsers] Solicitando lista de usuarios...");
    const [users] = await pool.query(
      `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`
    );

    console.log("✅ [getAllUsers] Usuarios obtenidos:", users.length);
    res.status(200).json(users.length ? users : []);
  } catch (error) {
    console.error("❌ [getAllUsers] Error:", error);
    res.status(500).json({ error: "Error en el servidor al obtener usuarios." });
  }
};

// ✅ Obtener información del usuario autenticado
const getUserInfo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Usuario no autenticado." });

    console.log(`📥 [getUserInfo] Solicitando información del usuario ID: ${userId}`);
    const [user] = await pool.query(
      `
      SELECT 
        u.id, u.name, u.email, u.role, u.gender, u.created_at AS userCreatedAt,
        s.start_date AS planStart, s.end_date AS planEnd, s.status AS subscriptionStatus,
        sp.name AS plan, sp.description AS planDescription, sp.price AS planPrice,
        r.id AS restaurantId,  -- Campo añadido
        r.name AS restaurantName, 
        r.created_at AS restaurantCreatedAt
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      LEFT JOIN restaurants r ON u.id = r.owner_id
      WHERE u.id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (user.length) {
      const userData = user[0];
      console.log(`✅ [getUserInfo] Usuario encontrado:`, userData);
      res.status(200).json({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        gender: userData.gender || "other",
        createdAt: userData.userCreatedAt,
        plan: userData.plan || "Sin plan",
        planStart: userData.planStart || null,
        planEnd: userData.planEnd || null,
        subscriptionStatus: userData.subscriptionStatus || "N/A",
        planDescription: userData.planDescription || null,
        planPrice: userData.planPrice || null,
        restaurantId: userData.restaurantId || null,  // Campo añadido
        restaurantName: userData.restaurantName || "Sin restaurante",
        restaurantCreatedAt: userData.restaurantCreatedAt || null,
      });
    } else {
      console.warn(`⚠️ [getUserInfo] Usuario no encontrado: ID ${userId}`);
      res.status(404).json({ error: "Usuario no encontrado." });
    }
  } catch (error) {
    console.error("❌ [getUserInfo] Error:", error);
    res.status(500).json({ error: "Error en el servidor al obtener usuario." });
  }
};

// ✅ Crear usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    console.log("📥 [createUser] Datos recibidos:", req.body);

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const [existingUser] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existingUser.length) {
      console.warn("⚠️ [createUser] El correo ya está registrado.");
      return res.status(409).json({ error: "El correo ya está registrado." });
    }

    // Encriptar la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, [
      name,
      email,
      hashedPassword,  // Contraseña encriptada
      role,
    ]);

    console.log("✅ [createUser] Usuario creado correctamente.");
    res.status(201).json({ message: "Usuario creado exitosamente." });
  } catch (error) {
    console.error("❌ [createUser] Error:", error);
    res.status(500).json({ error: "Error en el servidor al crear usuario." });
  }
};

// ✅ Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    console.log(`📥 [updateUser] Datos recibidos para actualizar ID ${id}:`, req.body);

    if (!id || !name || !email || !role) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const [result] = await pool.query(
      `UPDATE users SET name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?`,
      [name, email, role, id]
    );

    if (result.affectedRows) {
      console.log(`✅ [updateUser] Usuario ID ${id} actualizado correctamente.`);
      res.status(200).json({ message: "Usuario actualizado correctamente." });
    } else {
      console.warn(`⚠️ [updateUser] No se encontró un usuario con ID: ${id}`);
      res.status(404).json({ error: "Usuario no encontrado." });
    }
  } catch (error) {
    console.error("❌ [updateUser] Error:", error);
    res.status(500).json({ error: "Error en el servidor al actualizar usuario." });
  }
};

// ✅ Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 [deleteUser] Intentando eliminar usuario ID: ${id}`);

    const [result] = await pool.query(`DELETE FROM users WHERE id = ?`, [id]);

    if (result.affectedRows) {
      console.log(`✅ [deleteUser] Usuario ID ${id} eliminado.`);
      res.status(200).json({ message: "Usuario eliminado correctamente." });
    } else {
      console.warn(`⚠️ [deleteUser] Usuario ID ${id} no encontrado.`);
      res.status(404).json({ error: "Usuario no encontrado." });
    }
  } catch (error) {
    console.error("❌ [deleteUser] Error:", error);
    res.status(500).json({ error: "Error en el servidor al eliminar usuario." });
  }
};

module.exports = {
  getAllUsers,
  getUserInfo,
  createUser,
  updateUser,
  deleteUser,
};



