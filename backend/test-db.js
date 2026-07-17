const pool = require('./src/config/db');

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conectado:', res.rows);
  } catch (error) {
    console.error('Error conexión:', error);
  }
})();