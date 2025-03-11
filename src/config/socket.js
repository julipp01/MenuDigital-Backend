const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://192.168.18.26:5173"], // Permitir ambos orígenes
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ Cliente conectado a WebSocket:", socket.id);

    socket.on("disconnect", (reason) => {
      console.warn("❌ Cliente desconectado:", socket.id, "Razón:", reason);
    });

    // Ejemplo de evento personalizado (ajusta según tus necesidades)
    socket.on("message", (data) => {
      console.log("Mensaje recibido:", data);
      socket.emit("message", "Respuesta del servidor");
    });
  });

  return io;
};

const getSocketInstance = () => {
  if (!io) throw new Error("Socket.io no ha sido inicializado.");
  return io;
};

module.exports = { initializeSocket, getSocketInstance };

