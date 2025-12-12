// db-promise.js - Conexión con promesas
const mysql = require('mysql2/promise');
require('dotenv').config();

async function conectarMySQL() {
  try {
    // Crear conexión con promesas
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ttops_node_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Conectado a MySQL con promesas');

    // Ejecutar consulta
    const [rows] = await connection.execute('SELECT NOW() AS fecha_actual');
    console.log('Fecha actual:', rows[0].fecha_actual);

    // Cerrar conexión
    await connection.end();
    console.log('✅ Conexión cerrada');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

conectarMySQL();