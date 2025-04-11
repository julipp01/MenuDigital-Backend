const { Server } = require("ws");

const initializeSocket = (server) => {
  const wss = new Server({ server });

  wss.on("connection", (socket) => {
    console.log("✅ Cliente conectado al WebSocket");

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("📩 Mensaje recibido:", message);

        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
          console.log("📡 Pong enviado al cliente");
        } else if (message.type === "menu-updated") {
          wss.clients.forEach((client) => {
            if (client.readyState === socket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "menu-changed",
                  restaurantId: message.restaurantId,
                  item: message.item,
                })
              );
            }
          });
        }
      } catch (error) {
        console.error("❌ Error al procesar mensaje WebSocket:", error.message);
      }
    });

    socket.on("close", () => {
      console.log("🔹 Cliente desconectado del WebSocket");
    });

    socket.on("error", (error) => {
      console.error("❌ Error en WebSocket:", error.message);
    });
  });

  console.log("🚀 WebSocket inicializado");
};

module.exports = { initializeSocket };


