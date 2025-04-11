const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Acceso denegado, no hay token" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido o expirado" });

    // Verificar que el token contenga restaurantId
    if (!decoded.restaurantId) {
      return res.status(403).json({ error: "ID de restaurante no encontrado en el token" });
    }

    req.user = decoded;
    next();
  });
};








