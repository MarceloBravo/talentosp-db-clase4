// utils/database.js
const mysql = require('mysql2');
const dbConfig = require('../config/database');

class Database {
  constructor() {
    this.pool = mysql.createPool(dbConfig.mysql);
    this.poolPromise = this.pool.promise();
  }

  // Método para ejecutar consultas SELECT
  async query(sql, params = []) {
    try {
      const [rows] = await this.poolPromise.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error en consulta:', error.message);
      throw error;
    }
  }

  // Método para ejecutar INSERT, UPDATE, DELETE
  async execute(sql, params = []) {
    try {
      const [result] = await this.poolPromise.execute(sql, params);
      return result;
    } catch (error) {
      console.error('Error ejecutando:', error.message);
      throw error;
    }
  }

  // Método para transacciones
  async transaction(callback) {
    const connection = await this.poolPromise.getConnection();

    try {
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();
      return result;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Cerrar pool
  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();