// init-db.js - Script para inicializar la base de datos
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function inicializarBaseDatos() {
  let connection;

  try {
    console.log('🚀 Inicializando base de datos...');

    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true // Permitir múltiples statements
    });

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, 'init-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar SQL (usar query en lugar de execute para múltiples statements)
    await connection.query(sql);

    console.log('✅ Base de datos inicializada correctamente');

    // Verificar datos (USE debe usar query, no execute)
    await connection.query('USE ttops_node_db');
    const [usuarios] = await connection.execute('SELECT COUNT(*) AS total FROM usuarios');
    const [productos] = await connection.execute('SELECT COUNT(*) AS total FROM productos');
    const [categorias] = await connection.execute('SELECT COUNT(*) AS total FROM categorias');

    console.log(`📊 Datos insertados:`);
    console.log(`   - Usuarios: ${usuarios[0].total}`);
    console.log(`   - Productos: ${productos[0].total}`);
    console.log(`   - Categorías: ${categorias[0].total}`);

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar inicialización
inicializarBaseDatos();