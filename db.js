// db.js - Configuración de conexión MySQL
const mysql = require('mysql2');

// Configuración de conexión
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // Cambiar según tu configuración
  database: 'ttops_node_db',
  port: 3306
});

// Conectar
connection.connect((error) => {
  if (error) {
    console.error('Error conectando a MySQL:', error);
    return;
  }
  console.log('✅ Conectado a MySQL');
});

// Ejecutar consulta simple
connection.query('SELECT 1 + 1 AS resultado', (error, results) => {
  if (error) {
    console.error('Error en consulta:', error);
    return;
  }
  console.log('Resultado:', results[0].resultado); // 2
});

// Cerrar conexión
connection.end((error) => {
  if (error) {
    console.error('Error cerrando conexión:', error);
    return;
  }
  console.log('✅ Conexión cerrada');
});