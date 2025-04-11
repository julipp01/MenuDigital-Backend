const logger = {
  info: (msg, meta) => console.log("info:", msg, meta || ""),
  warn: (msg, meta) => console.warn("warn:", msg, meta || ""),
  error: (msg, meta) => console.error("error:", msg, meta || ""),
};
module.exports = logger;