const mysql = require('mysql2/promise');
require('dotenv').config();

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




