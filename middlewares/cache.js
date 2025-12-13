// middlewares/cache.js - Middleware de caché para endpoints
const cache = require('../utils/cache');

// Middleware de caché
const cacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Solo cachear métodos GET
    if (req.method !== 'GET') {
      return next();
    }

    // Generar clave de caché basada en la ruta y query parameters
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      // Intentar obtener del caché
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Si no está en caché, interceptar la respuesta
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Guardar en caché antes de enviar la respuesta
        cache.set(cacheKey, data, ttlSeconds).then(() => {
          console.log(`💾 Cache SET: ${cacheKey} (TTL: ${ttlSeconds}s)`);
        }).catch(err => {
          console.error('Error guardando en caché:', err);
        });

        // Enviar respuesta original
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Error en middleware de caché:', error);
      // Si hay error, continuar sin caché
      next();
    }
  };
};

// Función helper para invalidar caché por patrón
const invalidarCache = async (pattern) => {
  try {
    await cache.delPattern(pattern);
  } catch (error) {
    console.error('Error invalidando caché:', error);
  }
};

// Invalidar caché de productos
const invalidarCacheProductos = async () => {
  await invalidarCache('cache:/productos*');
};

// Invalidar caché de reseñas
const invalidarCacheResenas = async () => {
  await invalidarCache('cache:/reseñas*');
};

// Invalidar caché de estadísticas
const invalidarCacheEstadisticas = async () => {
  await invalidarCache('cache:/estadisticas*');
};

// Invalidar todo el caché
const invalidarTodoCache = async () => {
  await invalidarCache('cache:*');
};

module.exports = {
  cacheMiddleware,
  invalidarCache,
  invalidarCacheProductos,
  invalidarCacheResenas,
  invalidarCacheEstadisticas,
  invalidarTodoCache
};
