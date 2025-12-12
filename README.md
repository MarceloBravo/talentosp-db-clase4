### Ejercicio: Extiende la API agregando: 
- sistema de autenticación JWT completo, 
- subida de imágenes para productos con multer, 
- sistema de reseñas y calificaciones, 
- notificaciones por email para nuevos pedidos, y 
- un sistema de caché con Redis para las consultas más frecuentes.


# Instalar dependencias
npm install express mysql2 dotenv axios

# Configurar variables de entorno
echo "DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ttops_node_db
DB_PORT=3306
NODE_ENV=development
PORT=3000" > .env

# Inicializar base de datos
node init-db.js

# Ejecutar API
node app.js

# En otra terminal, probar la API
npm install axios  # Para las pruebas
node test-api.js