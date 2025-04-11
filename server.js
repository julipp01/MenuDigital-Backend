require("dotenv").config();
const { createServer } = require("http");
const app = require("./app");
const { initializeSocket } = require("./config/socket");

const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || "https://menudigital-backend-production.up.railway.app";
const SOCKET_URL = process.env.SOCKET_URL || "wss://menudigital-backend-production.up.railway.app";

const server = createServer(app);

// Inicializar WebSocket
initializeSocket(server);

// Iniciar el servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en ${BACKEND_URL}`);
  console.log(`🚀 WebSocket disponible en ${SOCKET_URL}`);
});
