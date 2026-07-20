require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    console.log("✅ CONEXIÓN EXITOSA A MYSQL");
    await conn.end();

  } catch (err) {
    console.error("❌ ERROR MYSQL");
    console.error(err);
  }
})();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10
});

const dns = require('dns');

dns.lookup(process.env.DB_HOST, (err, address, family) => {
    console.log({
        host: process.env.DB_HOST,
        address,
        family
    });
});

module.exports = pool;
