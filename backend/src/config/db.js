require('dotenv').config();

console.log("DB CONFIG:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  passwordLength: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0
});

console.log("PASSWORD LENGTH:", process.env.DB_PASSWORD.length);
console.log("PASSWORD START:", process.env.DB_PASSWORD.substring(0,2));

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
