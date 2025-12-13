// utils/cache.js - Sistema de caché con Redis
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  // Conectar a Redis
  async connect() {
    try {
      const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
      const REDIS_PORT = process.env.REDIS_PORT || 6379;
      const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

      this.client = redis.createClient({
        socket: {
          host: REDIS_HOST,
          port: parseInt(REDIS_PORT)
        },
        password: REDIS_PASSWORD || undefined
      });

      // Manejar errores de conexión
      this.client.on('error', (err) => {
        console.error('❌ Error de Redis:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Conectando a Redis...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis conectado exitosamente');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Conexión a Redis cerrada');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.warn('⚠️  Redis no disponible. La aplicación funcionará sin caché.');
      console.warn('   Para habilitar caché, instala Redis y configúralo en .env');
      this.isConnected = false;
      return false;
    }
  }

  // Cerrar conexión
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Obtener valor del caché
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo del caché:', error);
      return null;
    }
  }

  // Guardar valor en caché
  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const stringValue = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, stringValue);
      return true;
    } catch (error) {
      console.error('Error guardando en caché:', error);
      return false;
    }
  }

  // Eliminar clave del caché
  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error eliminando del caché:', error);
      return false;
    }
  }

  // Eliminar múltiples claves que coincidan con un patrón
  async delPattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️  Eliminadas ${keys.length} claves del caché con patrón: ${pattern}`);
      }
      return true;
    } catch (error) {
      console.error('Error eliminando patrón del caché:', error);
      return false;
    }
  }

  // Verificar si una clave existe
  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Error verificando existencia en caché:', error);
      return false;
    }
  }

  // Obtener tiempo de vida restante de una clave
  async ttl(key) {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Error obteniendo TTL:', error);
      return -1;
    }
  }
}

// Crear instancia singleton
const cacheService = new CacheService();

// Conectar automáticamente al iniciar
cacheService.connect().catch(err => {
  console.warn('No se pudo conectar a Redis:', err.message);
});

// Cerrar conexión al terminar la aplicación
process.on('SIGINT', async () => {
  await cacheService.disconnect();
});

process.on('SIGTERM', async () => {
  await cacheService.disconnect();
});

module.exports = cacheService;
