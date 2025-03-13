const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  if (!server) {
    console.error("❌ Error: Servidor HTTP no encontrado.");
    return null;
  }

  // Configurar CORS dinámicamente con RegExp para producción
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [/https:\/\/menu-digital-bdhg\.vercel\.app/, /https:\/\/.*\.vercel\.app/]
    : ["http://localhost:5173", "http://192.168.18.26:5173"];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.some((regex) => regex.test(origin) || allowedOrigins.includes(origin))) {
          callback(null, true);
        } else {
          console.error(`[Socket.IO CORS] Bloqueado: ${origin}`);
          callback(new Error("No permitido por CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"], // Forzar WebSocket para evitar polling
  });

  const socketUrl = process.env.SOCKET_URL || "wss://menudigital-backend-production.up.railway.app";
  console.log(`✅ WebSockets habilitados en: ${socketUrl}`);

  io.on("connection", (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.warn(`❌ Cliente desconectado (${socket.id}): Razón: ${reason}`);
    });

    // Evento de prueba para verificar conexión
    socket.on("message", (data) => {
      console.log(`📩 Mensaje recibido de ${socket.id}:`, data);
      socket.emit("message", "✅ Respuesta del servidor WebSocket");
    });

    // Evento para notificar cambios en el menú (ejemplo)
    socket.on("menu-updated", (data) => {
      console.log(`📩 Menú actualizado recibido de ${socket.id}:`, data);
      io.emit("menu-changed", { message: "Menú actualizado", data }); // Emitir a todos los clientes
    });
  });

  // Manejo de errores y reconexión automática
  io.on("error", (error) => {
    console.error("❌ Error en WebSocket:", error);
    console.log("🔄 Intentando reconectar en 5 segundos...");
    setTimeout(() => initializeSocket(server), 5000);
  });

  // Manejo de cierre del servidor
  server.on("close", () => {
    if (io) {
      io.close();
      console.log("🔹 WebSocket cerrado al apagar el servidor");
    }
  });

  return io;
};

const getSocketInstance = () => {
  if (!io) throw new Error("❌ Socket.io no ha sido inicializado.");
  return io;
};

module.exports = { initializeSocket, getSocketInstance };


