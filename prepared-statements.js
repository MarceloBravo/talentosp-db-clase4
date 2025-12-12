// prepared-statements.js
const db = require('./utils/database');

async function ejemplosPreparedStatements() {
  try {
    // 1. SELECT con parámetros
    const usuarios = await db.query(
      'SELECT id, nombre, email FROM usuarios WHERE activo = ? AND edad >= ?',
      [true, 18]
    );

    console.log('Usuarios activos mayores de edad:', usuarios.length);

    // 2. INSERT con parámetros
    const resultado = await db.execute(
      'INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)',
      ['Nuevo Producto', 99.99, 1]
    );

    console.log('Producto insertado con ID:', resultado.insertId);

    // 3. UPDATE con parámetros
    const updateResult = await db.execute(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
      [123]
    );

    console.log('Usuarios actualizados:', updateResult.affectedRows);

    // 4. DELETE con parámetros
    const deleteResult = await db.execute(
      'DELETE FROM productos WHERE id = ? AND stock = 0',
      [456]
    );

    console.log('Productos eliminados:', deleteResult.affectedRows);

    // 5. Búsqueda segura (previene SQL injection)
    const termino = 'laptop'; // Este valor podría venir de un usuario
    const productos = await db.query(
      'SELECT * FROM productos WHERE nombre LIKE ? OR descripcion LIKE ?',
      [`%${termino}%`, `%${termino}%`]
    );

    console.log(`Productos encontrados con "${termino}":`, productos.length);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

ejemplosPreparedStatements();