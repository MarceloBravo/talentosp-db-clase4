// app.js - API completa con base de datos
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const db = require('./utils/database');
const { validarUsuario, validarProducto, validarResena, validarPedido } = require('./utils/validation');
const { enviarEmailPedido } = require('./utils/email');
const { authenticateToken } = require('./middlewares/auth');
const { cacheMiddleware, invalidarCacheProductos, invalidarCacheResenas, invalidarCacheEstadisticas } = require('./middlewares/cache');
const upload = require('./config/upload');

const app = express();
app.use(express.json());

// Servir archivos estáticos desde el directorio uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// GET /productos - Listar productos con filtros (protegida, con caché)
app.get('/productos', authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { categoria, precio_min, precio_max, stock_min, pagina = 1, limite = 10 } = req.query;

    let sql = `
      SELECT p.id, p.nombre, p.precio, p.stock, p.activo, p.imagen,
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

    // Construir URLs completas para las imágenes
    const productosConImagen = productos.map(producto => {
      if (producto.imagen) {
        producto.imagen = `${req.protocol}://${req.get('host')}/${producto.imagen}`;
      }
      return producto;
    });

    res.json({
      productos: productosConImagen,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /productos - Crear producto con imagen (NO protegida)
app.post('/productos', upload.single('imagen'), async (req, res) => {
  try {
    // Validar datos del producto (excepto imagen que viene en req.file)
    const errores = validarProducto(req.body);
    if (errores.length > 0) {
      // Si hay un archivo subido pero hay errores de validación, eliminarlo
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { nombre, precio, descripcion, stock, categoria_id } = req.body;

    // Obtener la ruta de la imagen si se subió una
    let imagenPath = null;
    if (req.file) {
      // Guardar la ruta relativa para acceso desde la API
      imagenPath = `uploads/${req.file.filename}`;
    }

    const resultado = await db.execute(
      'INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, imagen, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, true, NOW())',
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null, imagenPath]
    );

    // Construir URL completa de la imagen si existe
    let imagenUrl = null;
    if (imagenPath) {
      imagenUrl = `${req.protocol}://${req.get('host')}/${imagenPath}`;
    }

    // Invalidar caché de productos y estadísticas
    await invalidarCacheProductos();
    await invalidarCacheEstadisticas();

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto: {
        id: resultado.insertId,
        nombre,
        precio,
        stock: stock || 0,
        categoria_id,
        imagen: imagenUrl
      }
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    
    // Si hay un error y se subió un archivo, eliminarlo
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error eliminando archivo:', unlinkError);
      }
    }

    // Manejar errores específicos de multer
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Archivo muy grande',
          mensaje: 'El tamaño máximo permitido es 5MB'
        });
      }
      return res.status(400).json({
        error: 'Error al subir archivo',
        mensaje: error.message
      });
    }

    // Manejar errores de validación de tipo de archivo
    if (error.message && error.message.includes('Tipo de archivo no permitido')) {
      return res.status(400).json({
        error: 'Tipo de archivo inválido',
        mensaje: error.message
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /productos/:id - Actualizar producto con imagen (NO protegida)
app.put('/productos/:id', upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const errores = validarProducto(req.body);

    if (errores.length > 0) {
      // Si hay un archivo subido pero hay errores de validación, eliminarlo
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    // Verificar que el producto existe
    const productosExistentes = await db.query(
      'SELECT id, imagen FROM productos WHERE id = ?',
      [id]
    );

    if (productosExistentes.length === 0) {
      // Si hay un archivo subido pero el producto no existe, eliminarlo
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const productoExistente = productosExistentes[0];
    const { nombre, precio, descripcion, stock, categoria_id } = req.body;

    let imagenPath = productoExistente.imagen; // Mantener la imagen actual por defecto

    // Si se subió una nueva imagen
    if (req.file) {
      // Eliminar la imagen anterior si existe
      if (productoExistente.imagen) {
        const fs = require('fs');
        const path = require('path');
        const imagenAnteriorPath = path.join(__dirname, productoExistente.imagen);
        try {
          if (fs.existsSync(imagenAnteriorPath)) {
            fs.unlinkSync(imagenAnteriorPath);
          }
        } catch (error) {
          console.error('Error eliminando imagen anterior:', error);
          // Continuar aunque falle la eliminación
        }
      }
      // Guardar la nueva ruta de imagen
      imagenPath = `uploads/${req.file.filename}`;
    }

    // Actualizar el producto
    const resultado = await db.execute(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria_id = ?, imagen = ?, fecha_actualizacion = NOW() WHERE id = ?',
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null, imagenPath, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Invalidar caché de productos y estadísticas
    await invalidarCacheProductos();
    await invalidarCacheEstadisticas();

    // Construir URL completa de la imagen si existe
    let imagenUrl = null;
    if (imagenPath) {
      imagenUrl = `${req.protocol}://${req.get('host')}/${imagenPath}`;
    }

    res.json({
      mensaje: 'Producto actualizado exitosamente',
      producto: {
        id: parseInt(id),
        nombre,
        precio,
        stock: stock || 0,
        categoria_id,
        imagen: imagenUrl
      }
    });

  } catch (error) {
    console.error('Error actualizando producto:', error);

    // Si hay un archivo subido pero hay un error, eliminarlo
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error eliminando archivo:', unlinkError);
      }
    }

    // Manejar errores específicos de multer
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Archivo muy grande',
          mensaje: 'El tamaño máximo permitido es 5MB'
        });
      }
      return res.status(400).json({
        error: 'Error al subir archivo',
        mensaje: error.message
      });
    }

    // Manejar errores de validación de tipo de archivo
    if (error.message && error.message.includes('Tipo de archivo no permitido')) {
      return res.status(400).json({
        error: 'Tipo de archivo inválido',
        mensaje: error.message
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE RESEÑAS Y CALIFICACIONES

// POST /reseñas - Crear reseña y calificación (protegida)
app.post('/reseñas', authenticateToken, async (req, res) => {
  try {
    const errores = validarResena(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { producto_id, calificacion, comentario } = req.body;
    const usuario_id = req.user.id; // Obtener el ID del usuario autenticado

    // Verificar que el producto existe
    const productos = await db.query(
      'SELECT id, nombre FROM productos WHERE id = ? AND activo = true',
      [producto_id]
    );

    if (productos.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        mensaje: 'El producto especificado no existe o está inactivo'
      });
    }

    // Verificar si el usuario ya calificó este producto
    const resenasExistentes = await db.query(
      'SELECT id FROM resenas WHERE usuario_id = ? AND producto_id = ?',
      [usuario_id, producto_id]
    );

    if (resenasExistentes.length > 0) {
      return res.status(409).json({
        error: 'Ya has calificado este producto',
        mensaje: 'Solo puedes calificar un producto una vez. Puedes actualizar tu reseña existente.'
      });
    }

    // Crear la reseña
    const resultado = await db.execute(
      'INSERT INTO resenas (producto_id, usuario_id, calificacion, comentario, fecha_creacion) VALUES (?, ?, ?, ?, NOW())',
      [producto_id, usuario_id, calificacion, comentario || null]
    );

    // Invalidar caché de reseñas
    await invalidarCacheResenas();

    // Obtener la reseña creada con información del usuario
    const resenas = await db.query(
      `SELECT r.id, r.producto_id, r.usuario_id, r.calificacion, r.comentario, r.fecha_creacion,
              u.nombre AS usuario_nombre, u.email AS usuario_email,
              p.nombre AS producto_nombre
       FROM resenas r
       INNER JOIN usuarios u ON r.usuario_id = u.id
       INNER JOIN productos p ON r.producto_id = p.id
       WHERE r.id = ?`,
      [resultado.insertId]
    );

    res.status(201).json({
      mensaje: 'Reseña creada exitosamente',
      resena: resenas[0]
    });

  } catch (error) {
    console.error('Error creando reseña:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Ya has calificado este producto',
        mensaje: 'Solo puedes calificar un producto una vez'
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /reseñas - Listar reseñas (pública, sin autenticación, con caché)
app.get('/reseñas', cacheMiddleware(180), async (req, res) => {
  try {
    const { producto_id, usuario_id, pagina = 1, limite = 10, orden = 'fecha_creacion' } = req.query;

    let sql = `
      SELECT r.id, r.producto_id, r.usuario_id, r.calificacion, r.comentario, r.fecha_creacion,
             u.nombre AS usuario_nombre, u.email AS usuario_email,
             p.nombre AS producto_nombre, p.precio AS producto_precio
      FROM resenas r
      INNER JOIN usuarios u ON r.usuario_id = u.id
      INNER JOIN productos p ON r.producto_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (producto_id) {
      sql += ' AND r.producto_id = ?';
      params.push(parseInt(producto_id));
    }

    if (usuario_id) {
      sql += ' AND r.usuario_id = ?';
      params.push(parseInt(usuario_id));
    }

    // Validar y aplicar ordenamiento
    const ordenValido = ['fecha_creacion', 'calificacion', 'id'].includes(orden) ? orden : 'fecha_creacion';
    const direccion = orden === 'calificacion' ? 'DESC' : 'DESC';
    sql += ` ORDER BY r.${ordenValido} ${direccion}`;

    // Aplicar paginación
    const limiteInt = Math.max(1, parseInt(limite) || 10);
    const offsetInt = Math.max(0, ((parseInt(pagina) || 1) - 1) * limiteInt);
    sql += ` LIMIT ${limiteInt} OFFSET ${offsetInt}`;

    const resenas = await db.query(sql, params);

    // Obtener estadísticas de calificaciones si se filtra por producto
    let estadisticas = null;
    if (producto_id) {
      const stats = await db.query(
        `SELECT 
          COUNT(*) AS total_resenas,
          AVG(calificacion) AS calificacion_promedio,
          SUM(CASE WHEN calificacion = 5 THEN 1 ELSE 0 END) AS cinco_estrellas,
          SUM(CASE WHEN calificacion = 4 THEN 1 ELSE 0 END) AS cuatro_estrellas,
          SUM(CASE WHEN calificacion = 3 THEN 1 ELSE 0 END) AS tres_estrellas,
          SUM(CASE WHEN calificacion = 2 THEN 1 ELSE 0 END) AS dos_estrellas,
          SUM(CASE WHEN calificacion = 1 THEN 1 ELSE 0 END) AS una_estrella
         FROM resenas
         WHERE producto_id = ?`,
        [producto_id]
      );
      
      if (stats.length > 0) {
        estadisticas = {
          total_resenas: stats[0].total_resenas,
          calificacion_promedio: parseFloat(stats[0].calificacion_promedio || 0).toFixed(2),
          distribucion: {
            cinco_estrellas: stats[0].cinco_estrellas,
            cuatro_estrellas: stats[0].cuatro_estrellas,
            tres_estrellas: stats[0].tres_estrellas,
            dos_estrellas: stats[0].dos_estrellas,
            una_estrella: stats[0].una_estrella
          }
        };
      }
    }

    res.json({
      resenas,
      estadisticas,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      total: resenas.length
    });

  } catch (error) {
    console.error('Error obteniendo reseñas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE PEDIDOS

// POST /pedidos - Crear pedido (protegida)
app.post('/pedidos', authenticateToken, async (req, res) => {
  try {
    const errores = validarPedido(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: errores
      });
    }

    const { items } = req.body;
    const usuario_id = req.user.id;

    // Obtener información del usuario
    const usuarios = await db.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    // Crear pedido usando transacción para garantizar consistencia
    const resultado = await db.transaction(async (connection) => {
      let totalPedido = 0;
      const detallesPedido = [];

      // Validar y obtener información de cada producto
      for (const item of items) {
        const productoId = parseInt(item.producto_id);
        const cantidad = parseInt(item.cantidad);

        // Obtener información del producto
        const [productos] = await connection.execute(
          'SELECT id, nombre, precio, stock FROM productos WHERE id = ? AND activo = true',
          [productoId]
        );

        if (productos.length === 0) {
          throw new Error(`Producto con ID ${productoId} no encontrado o inactivo`);
        }

        const producto = productos[0];

        // Verificar stock disponible
        if (producto.stock < cantidad) {
          throw new Error(`Stock insuficiente para el producto "${producto.nombre}". Stock disponible: ${producto.stock}, solicitado: ${cantidad}`);
        }

        // Calcular subtotal
        const subtotal = parseFloat(producto.precio) * cantidad;
        totalPedido += subtotal;

        // Guardar información para los detalles
        detallesPedido.push({
          producto_id: productoId,
          producto_nombre: producto.nombre,
          cantidad: cantidad,
          precio_unitario: parseFloat(producto.precio),
          subtotal: subtotal
        });
      }

      // Crear el pedido
      const [resultadoPedido] = await connection.execute(
        'INSERT INTO pedidos (usuario_id, total, estado, fecha_pedido) VALUES (?, ?, ?, NOW())',
        [usuario_id, totalPedido, 'pendiente']
      );

      const pedidoId = resultadoPedido.insertId;

      // Crear los detalles del pedido y actualizar stock
      for (const detalle of detallesPedido) {
        // Insertar detalle del pedido
        await connection.execute(
          'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
          [pedidoId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
        );

        // Actualizar stock del producto
        await connection.execute(
          'UPDATE productos SET stock = stock - ? WHERE id = ?',
          [detalle.cantidad, detalle.producto_id]
        );
      }

      // Obtener el pedido completo con detalles
      const [pedidos] = await connection.execute(
        `SELECT p.id, p.usuario_id, p.fecha_pedido, p.total, p.estado
         FROM pedidos p
         WHERE p.id = ?`,
        [pedidoId]
      );

      return {
        pedido: pedidos[0],
        detalles: detallesPedido
      };
    });

    // Invalidar caché de estadísticas (los pedidos afectan las estadísticas)
    await invalidarCacheEstadisticas();

    // Enviar email de confirmación (no bloquea la respuesta si falla)
    enviarEmailPedido(usuario, resultado.pedido, resultado.detalles)
      .then(emailResult => {
        if (emailResult.success) {
          console.log('✅ Email de confirmación enviado al usuario:', usuario.email);
        } else {
          console.warn('⚠️  No se pudo enviar el email, pero el pedido fue creado:', emailResult.error);
        }
      })
      .catch(error => {
        console.error('❌ Error al enviar email (pedido ya creado):', error);
      });

    // Obtener información completa del pedido para la respuesta
    const pedidos = await db.query(
      `SELECT p.id, p.usuario_id, p.fecha_pedido, p.total, p.estado,
              u.nombre AS usuario_nombre, u.email AS usuario_email
       FROM pedidos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ?`,
      [resultado.pedido.id]
    );

    const detallesCompletos = await db.query(
      `SELECT dp.id, dp.producto_id, dp.cantidad, dp.precio_unitario,
              p.nombre AS producto_nombre
       FROM detalle_pedidos dp
       INNER JOIN productos p ON dp.producto_id = p.id
       WHERE dp.pedido_id = ?`,
      [resultado.pedido.id]
    );

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente',
      pedido: {
        ...pedidos[0],
        items: detallesCompletos
      }
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    
    // Errores específicos
    if (error.message.includes('no encontrado') || error.message.includes('Stock insuficiente')) {
      return res.status(400).json({
        error: 'Error en el pedido',
        mensaje: error.message
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pedidos - Listar pedidos del usuario autenticado (protegida)
app.get('/pedidos', authenticateToken, async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { pagina = 1, limite = 10, estado } = req.query;

    let sql = `
      SELECT p.id, p.fecha_pedido, p.total, p.estado,
             COUNT(dp.id) AS total_items
      FROM pedidos p
      LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
      WHERE p.usuario_id = ?
    `;
    const params = [usuario_id];

    if (estado) {
      sql += ' AND p.estado = ?';
      params.push(estado);
    }

    sql += ' GROUP BY p.id ORDER BY p.fecha_pedido DESC';

    // Aplicar paginación
    const limiteInt = Math.max(1, parseInt(limite) || 10);
    const offsetInt = Math.max(0, ((parseInt(pagina) || 1) - 1) * limiteInt);
    sql += ` LIMIT ${limiteInt} OFFSET ${offsetInt}`;

    const pedidos = await db.query(sql, params);

    res.json({
      pedidos,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /pedidos/:id - Obtener pedido específico (protegida)
app.get('/pedidos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user.id;

    // Obtener información del pedido
    const pedidos = await db.query(
      `SELECT p.id, p.usuario_id, p.fecha_pedido, p.total, p.estado,
              u.nombre AS usuario_nombre, u.email AS usuario_email
       FROM pedidos p
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = ? AND p.usuario_id = ?`,
      [id, usuario_id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Obtener detalles del pedido
    const detalles = await db.query(
      `SELECT dp.id, dp.producto_id, dp.cantidad, dp.precio_unitario,
              p.nombre AS producto_nombre, p.imagen
       FROM detalle_pedidos dp
       INNER JOIN productos p ON dp.producto_id = p.id
       WHERE dp.pedido_id = ?`,
      [id]
    );

    // Construir URLs completas para las imágenes
    const detallesConImagen = detalles.map(detalle => {
      if (detalle.imagen) {
        detalle.imagen = `${req.protocol}://${req.get('host')}/${detalle.imagen}`;
      }
      return detalle;
    });

    res.json({
      pedido: {
        ...pedidos[0],
        items: detallesConImagen
      }
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA DE ESTADÍSTICAS (protegida, con caché)
app.get('/estadisticas', authenticateToken, cacheMiddleware(600), async (req, res) => {
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