const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret";

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, restaurantId: user.restaurant_id }, JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

const registerUser = async (name, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'free')",
    [name, email.toLowerCase(), hashedPassword]
  );
  return result.insertId;
};

const loginUser = async (email, password) => {
  const [users] = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [email.toLowerCase()]);
  if (!users.length) throw new Error("Usuario no encontrado");

  const user = users[0];
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) throw new Error("Contraseña incorrecta");

  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurant_id },
  };
};

const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.query("SELECT id, email, name, role, restaurant_id FROM users WHERE id = ?", [decoded.id]);
    if (!users.length) throw new Error("Usuario no encontrado");
    return users[0];
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
};

const updatePlan = async (userId, planId) => {
  const [result] = await pool.query("UPDATE users SET plan_id = ? WHERE id = ?", [planId, userId]);
  if (result.affectedRows === 0) throw new Error("Usuario no encontrado");
  return { message: "Plan actualizado correctamente" };
};

module.exports = { registerUser, loginUser, verifyToken, updatePlan };
