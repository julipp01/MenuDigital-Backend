const mysql = require("mysql2/promise");

// Cargar las variables de entorno
require("dotenv").config();

// Detectar si estamos en producción o en local
const isProduction = process.env.NODE_ENV === "production";

const pool = mysql.createPool({
  host: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST_LOCAL,
  user: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER_LOCAL,
  password: isProduction ? process.env.DB_PASS_PROD : process.env.DB_PASS_LOCAL,
  database: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME_LOCAL,
  port: isProduction ? process.env.DB_PORT_PROD : process.env.DB_PORT_LOCAL,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;






