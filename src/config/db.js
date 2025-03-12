require('dotenv').config();
const mysql = require('mysql2/promise');

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL no está definido en .env");
  process.exit(1);
}

const pool = mysql.createPool(process.env.DATABASE_URL);

pool.getConnection()
  .then(conn => {
    console.log('✅ Conectado a MySQL en Railway');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err);
  });

module.exports = pool;




