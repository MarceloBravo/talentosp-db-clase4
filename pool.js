// pool.js - Connection pool MySQL
const mysql = require('mysql2');
const dbConfig = require('./config/database');

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig.mysql);

// Obtener conexión del pool
pool.getConnection((error, connection) => {
  if (error) {
    console.error('Error obteniendo conexión:', error);
    return;
  }

  console.log('✅ Conexión obtenida del pool');

  // Usar la conexión
  connection.query('SELECT COUNT(*) AS total_usuarios FROM usuarios', (error, results) => {
    if (error) {
      console.error('Error en consulta:', error);
      return;
    }

    console.log('Total usuarios:', results[0].total_usuarios);

    // Liberar conexión de vuelta al pool
    connection.release();
    console.log('🔄 Conexión liberada al pool');
  });
});

// Con promesas
async function consultaConPool() {
  try {
    const connection = await pool.promise().getConnection();

    const [rows] = await connection.execute(
      'SELECT nombre, email FROM usuarios WHERE activo = ?',
      [true]
    );

    console.log('Usuarios activos:', rows.length);

    connection.release();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

consultaConPool();

// Cerrar pool (al final de la aplicación)
process.on('SIGINT', () => {
  console.log('Cerrando pool de conexiones...');
  pool.end((error) => {
    if (error) {
      console.error('Error cerrando pool:', error);
    } else {
      console.log('✅ Pool cerrado correctamente');
    }
    process.exit(0);
  });
});