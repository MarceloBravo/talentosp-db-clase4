// config/database.js
require('dotenv').config();

const dbConfig = {
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ttops_node_db',
    port: process.env.DB_PORT || 3306,
    // Configuración adicional para producción
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },

  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'ttops_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ttops_node_db',
    port: process.env.DB_PORT || 5432,
    max: 20, // Pool máximo
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
};

module.exports = dbConfig;