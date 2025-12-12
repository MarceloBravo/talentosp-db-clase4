// app.js - API completa con base de datos
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./utils/database');
const { validarUsuario, validarProducto } = require('./utils/validation');
const { authenticateToken } = require('./middlewares/auth');

const app = express();
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// RUTAS DE AUTENTICACIÓN (públicas)

// POST /auth/login - Autenticación de usuario
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que se proporcionen email y password
    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const usuarios = await db.query(
      'SELECT id, nombre, email, password, activo FROM usuarios WHERE email = ?',
      [email]
    );

    // Verificar si el usuario existe
    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Email o contraseña incorrectos'
      });
    }

    const usuario = usuarios[0];

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        mensaje: 'Tu cuenta está desactivada. Contacta al administrador.'
      });
    }

    // Verificar si el usuario tiene contraseña (para usuarios creados antes de implementar auth)
    if (!usuario.password) {
      return res.status(401).json({
        error: 'Contraseña no configurada',
        mensaje: 'Debes configurar una contraseña. Contacta al administrador.'
      });
    }

    // Verificar la contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Email o contraseña incorrectos'
      });
    }

    // Generar token JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_super_segura_cambiar_en_produccion';
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email 
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Token válido por 24 horas
    );

    // Actualizar último login
    await db.execute(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
      [usuario.id]
    );

    // Retornar token y información del usuario (sin password)
    res.json({
      mensaje: 'Autenticación exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE USUARIOS

// GET /usuarios - Listar usuarios (NO protegida)
app.get('/usuarios', async (req, res) => {
  try {
    const { pagina = 1, limite = 10, activo } = req.query;

    let sql = 'SELECT id, nombre, email, activo, fecha_registro FROM usuarios WHERE 1=1';
    const params = [];

    if (activo !== undefined) {
      sql += ' AND activo = ?';
      params.push(activo === 'true');
    }

    // MySQL no permite placeholders en LIMIT/OFFSET, usar interpolación segura
    const limiteInt = Math.max(1, parseInt(limite) || 10);
    const offsetInt = Math.max(0, ((parseInt(pagina) || 1) - 1) * limiteInt);
    sql += ` ORDER BY fecha_registro DESC LIMIT ${limiteInt} OFFSET ${offsetInt}`;

    const usuarios = await db.query(sql, params);

    res.json({
      usuarios,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /auth/me - Obtener información del usuario autenticado (protegida)
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const usuarios = await db.query(
      'SELECT id, nombre, email, activo, fecha_registro, ultimo_login FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /auth/change-password - Cambiar contraseña del usuario autenticado (protegida)
app.put('/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario con contraseña
    const usuarios = await db.query(
      'SELECT id, password FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(currentPassword, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        mensaje: 'La contraseña actual no es correcta'
      });
    }

    // Hashear nueva contraseña
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await db.execute(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({
      mensaje: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /usuarios/:id - Obtener usuario específico (protegida)
app.get('/usuarios/:id', authenticateToken, async (req, res) => {
  try {

    const { id } = req.params;

    const usuarios = await db.query(
      'SELECT id, nombre, email, activo, fecha_registro FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /usuarios - Crear usuario (protegida)
app.post('/usuarios', authenticateToken, async (req, res) => {
  try {
    const errores = validarUsuario(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { nombre, email, edad, password } = req.body;

    // Validar que se proporcione una contraseña
    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: ['La contraseña es requerida y debe tener al menos 6 caracteres']
      });
    }

    // Hashear la contraseña antes de guardarla
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const resultado = await db.execute(
      'INSERT INTO usuarios (nombre, email, edad, password, activo, fecha_registro) VALUES (?, ?, ?, ?, true, NOW())',
      [nombre, email, edad || null, passwordHash]
    );

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: resultado.insertId,
        nombre,
        email,
        edad,
        activo: true
      }
    });

  } catch (error) {
    console.error('Error creando usuario:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /usuarios/:id - Actualizar usuario (protegida)
app.put('/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const errores = validarUsuario(req.body);

    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { nombre, email, edad } = req.body;

    const resultado = await db.execute(
      'UPDATE usuarios SET nombre = ?, email = ?, edad = ? WHERE id = ?',
      [nombre, email, edad || null, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: { id: parseInt(id), nombre, email, edad }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /usuarios/:id - Eliminar usuario (protegida)
app.delete('/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await db.execute(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE PRODUCTOS

// GET /productos - Listar productos con filtros (protegida)
app.get('/productos', authenticateToken, async (req, res) => {
  try {
    const { categoria, precio_min, precio_max, stock_min, pagina = 1, limite = 10 } = req.query;

    let sql = `
      SELECT p.id, p.nombre, p.precio, p.stock, p.activo,
             c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = true
    `;
    const params = [];

    if (categoria) {
      sql += ' AND c.nombre = ?';
      params.push(categoria);
    }

    if (precio_min) {
      sql += ' AND p.precio >= ?';
      params.push(parseFloat(precio_min));
    }

    if (precio_max) {
      sql += ' AND p.precio <= ?';
      params.push(parseFloat(precio_max));
    }

    if (stock_min) {
      sql += ' AND p.stock >= ?';
      params.push(parseInt(stock_min));
    }

    // MySQL no permite placeholders en LIMIT/OFFSET, usar interpolación segura
    const limiteInt = Math.max(1, parseInt(limite) || 10);
    const offsetInt = Math.max(0, ((parseInt(pagina) || 1) - 1) * limiteInt);
    sql += ` ORDER BY p.nombre LIMIT ${limiteInt} OFFSET ${offsetInt}`;

    const productos = await db.query(sql, params);

    res.json({
      productos,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /productos - Crear producto (NO protegida)
app.post('/productos', async (req, res) => {
  try {
    const errores = validarProducto(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { nombre, precio, descripcion, stock, categoria_id } = req.body;

    const resultado = await db.execute(
      'INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, true, NOW())',
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null]
    );

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto: {
        id: resultado.insertId,
        nombre,
        precio,
        stock: stock || 0,
        categoria_id
      }
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA DE ESTADÍSTICAS (protegida)
app.get('/estadisticas', authenticateToken, async (req, res) => {
  try {
    // Estadísticas usando transacción para consistencia
    const resultado = await db.transaction(async (connection) => {
      const [totalUsuarios] = await connection.execute('SELECT COUNT(*) AS total FROM usuarios');
      const [totalProductos] = await connection.execute('SELECT COUNT(*) AS total FROM productos WHERE activo = true');
      const [productosStock] = await connection.execute('SELECT SUM(stock) AS total_stock, AVG(precio) AS precio_promedio FROM productos WHERE activo = true');
      const [ventasMes] = await connection.execute(`
        SELECT COUNT(*) AS pedidos_mes, SUM(total) AS ingresos_mes
        FROM pedidos
        WHERE fecha_pedido >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      `);

      return {
        usuarios: {
          total: totalUsuarios[0].total
        },
        productos: {
          total: totalProductos[0].total,
          stock_total: productosStock[0].total_stock || 0,
          precio_promedio: productosStock[0].precio_promedio || 0
        },
        ventas: {
          pedidos_mes: ventasMes[0].pedidos_mes || 0,
          ingresos_mes: ventasMes[0].ingresos_mes || 0
        }
      };
    });

    res.json(resultado);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    metodo: req.method,
    ruta: req.url
  });
});

// Middleware de error global
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API REST con MySQL ejecutándose en http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Cerrando conexiones a base de datos...');
  await db.close();
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});