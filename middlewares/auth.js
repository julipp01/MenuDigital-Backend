// C:\Users\julio\Desktop\menudigital\backend\middlewares\auth.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }
  try {
    const decoded = jwt.verify(token, "tu_secreto_jwt"); // Cambia "tu_secreto_jwt" por tu clave secreta
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
};

const checkRestaurantPermission = (req, res, next) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  // Ajusta esta lógica según tu modelo (ej. req.user.restaurantId)
  if (req.user.id !== restaurantId) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  next();
};

module.exports = { authMiddleware, checkRestaurantPermission };