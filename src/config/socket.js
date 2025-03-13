const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  if (!server) {
    console.error("❌ Error: Servidor HTTP no encontrado.");
    return null;
  }

  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [/https:\/\/menu-digital-bdhg\.vercel\.app/, /https:\/\/.*\.vercel\.app/]
      : ["http://localhost:5173", "http://192.168.18.26:5173"];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.some((regex) => (regex instanceof RegExp ? regex.test(origin) : regex === origin))
        ) {
          callback(null, true);
        } else {
          console.error(`[Socket.IO CORS] Bloqueado: ${origin}`);
          callback(new Error("No permitido por CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
  });

  const socketUrl = process.env.SOCKET_URL || "wss://menudigital-backend-production.up.railway.app";
  console.log(`✅ WebSockets habilitados en: ${socketUrl}`);

  io.on("connection", (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.warn(`❌ Cliente desconectado (${socket.id}): Razón: ${reason}`);
    });

    socket.on("message", (data) => {
      console.log(`📩 Mensaje recibido de ${socket.id}:`, data);
      socket.send({ type: "message", data: "✅ Respuesta del servidor WebSocket" });
    });

    socket.on("menu-updated", (data) => {
      if (!data || !data.restaurantId) {
        console.warn(`[Socket.IO] Datos inválidos en menu-updated desde ${socket.id}:`, data);
        return;
      }
      console.log(`📩 Menú actualizado recibido de ${socket.id}:`, data);
      io.emit("menu-changed", { type: "menu-changed", message: "Menú actualizado", data });
    });

    socket.on("error", (error) => {
      console.error(`❌ Error en socket ${socket.id}:`, error);
    });
  });

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  io.on("error", (error) => {
    console.error("❌ Error en WebSocket:", error);
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log(`🔄 Intentando reconectar (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
      setTimeout(() => {
        reconnectAttempts++;
        initializeSocket(server);
      }, 5000);
    } else {
      console.error("❌ Máximo de intentos de reconexión alcanzado.");
    }
  });

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


