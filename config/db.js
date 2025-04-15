const mysql = require("mysql2/promise");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = mysql.createPool({
  host: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST || "localhost",
  user: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER || "root",
  password: isProduction ? process.env.DB_PASS_PROD : process.env.DB_PASS || "",
  database: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME || "test",
  port: isProduction ? Number(process.env.DB_PORT_PROD) : Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Debugging info (no mostrar password en consola obviamente)
console.log(`[DB] Conectando a ${isProduction ? "PRODUCCIÓN" : "DESARROLLO"} → ${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "test"} como ${process.env.DB_USER || "root"}`);

module.exports = pool;






