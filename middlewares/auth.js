// middlewares/auth.js - Middleware de autenticación JWT
const jwt = require('jsonwebtoken');

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
  // Obtener el token del header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  // Si no hay token, retornar error 401
  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      mensaje: 'Debes proporcionar un token de autenticación en el header Authorization'
    });
  }

  // Verificar y decodificar el token
  jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_super_segura_cambiar_en_produccion', (err, user) => {
    if (err) {
      // Token inválido o expirado
      return res.status(403).json({ 
        error: 'Token inválido o expirado',
        mensaje: 'El token proporcionado no es válido. Por favor, inicia sesión nuevamente.'
      });
    }

    // Token válido: agregar información del usuario al request
    req.user = user; // Contiene { id, email } del payload del JWT
    next(); // Continuar con la siguiente función middleware/ruta
  });
};

module.exports = { authenticateToken };
