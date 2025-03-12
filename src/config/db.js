const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Asegurar el puerto correcto
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar la conexión
pool.getConnection()
  .then(conn => {
    console.log('✅ Conectado a MySQL en Railway');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err);
  });

module.exports = pool;


