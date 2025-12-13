### Ejercicio: Extiende la API agregando: 
- ✅ sistema de autenticación JWT completo, 
- ✅ subida de imágenes para productos con multer, 
- ✅ sistema de reseñas y calificaciones, 
- notificaciones por email para nuevos pedidos, y 
- un sistema de caché con Redis para las consultas más frecuentes.

## ✅ Sistema de Autenticación JWT Implementado

La API ahora incluye un sistema completo de autenticación JWT que protege todas las rutas excepto el endpoint de login.

### Instalación

# Instalar dependencias
npm install express mysql2 dotenv axios jsonwebtoken bcrypt multer

# Configurar variables de entorno
echo "DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ttops_node_db
DB_PORT=3306
NODE_ENV=development
PORT=3000
JWT_SECRET=tu_secret_key_super_segura_cambiar_en_produccion" > .env

# Inicializar base de datos
node init-db.js

# Ejecutar API
node app.js

# En otra terminal, probar la API
npm install axios  # Para las pruebas
node test-api.js

## 🔐 Uso de la Autenticación JWT

### 1. Login (Obtener Token)

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "maria@example.com",
  "password": "tu_contraseña"
}
```

**Respuesta exitosa:**
```json
{
  "mensaje": "Autenticación exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombre": "María González",
    "email": "maria@example.com"
  }
}
```

### 2. Usar Token en Peticiones Protegidas

Todas las rutas excepto `/auth/login` requieren autenticación. Incluye el token en el header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Endpoints Disponibles

**Públicos (sin autenticación):**
- `POST /auth/login` - Iniciar sesión
- `GET /reseñas` - Listar reseñas y calificaciones

**Protegidos (requieren token):**
- `GET /auth/me` - Obtener perfil del usuario autenticado
- `PUT /auth/change-password` - Cambiar contraseña
- `GET /usuarios` - Listar usuarios
- `GET /usuarios/:id` - Obtener usuario específico
- `POST /usuarios` - Crear usuario (requiere password)
- `PUT /usuarios/:id` - Actualizar usuario
- `DELETE /usuarios/:id` - Eliminar usuario
- `GET /productos` - Listar productos
- `POST /productos` - Crear producto
- `POST /reseñas` - Crear reseña y calificación
- `GET /estadisticas` - Obtener estadísticas


### 4. Acceso a Imágenes

Las imágenes subidas están disponibles públicamente en:
```
http://localhost:3000/uploads/nombre-archivo.jpg
```

### 5. Listar Productos con Imágenes

Al listar productos con `GET /productos`, cada producto incluirá su URL de imagen si tiene una:

```json
{
  "productos": [
    {
      "id": 1,
      "nombre": "Laptop Gaming",
      "precio": 1299.99,
      "stock": 5,
      "imagen": "http://localhost:3000/uploads/laptop-1234567890-987654321.jpg",
      "categoria": "Electrónica"
    }
  ]
}
```

**Nota:** La imagen es opcional. Si no se proporciona una imagen, el campo `imagen` será `null`.

## ⭐ Sistema de Reseñas y Calificaciones

La API ahora incluye un sistema completo de reseñas y calificaciones para productos.


### 1. Crear Reseña y Calificación (POST - Protegido)

**Endpoint:** `POST /reseñas`  
**Autenticación:** Requerida (Bearer Token)

```bash
POST /reseñas
Authorization: Bearer TU_TOKEN
Content-Type: application/json

{
  "producto_id": 1,
  "calificacion": 5,
  "comentario": "Excelente producto, muy recomendado"
}
```

**Parámetros:**
- `producto_id` (requerido): ID del producto a calificar
- `calificacion` (requerido): Número entre 1 y 5
- `comentario` (opcional): Texto de la reseña (máximo 1000 caracteres)

**Respuesta exitosa:**
```json
{
  "mensaje": "Reseña creada exitosamente",
  "resena": {
    "id": 1,
    "producto_id": 1,
    "usuario_id": 1,
    "calificacion": 5,
    "comentario": "Excelente producto, muy recomendado",
    "fecha_creacion": "2024-01-15T10:30:00.000Z",
    "usuario_nombre": "María González",
    "usuario_email": "maria@example.com",
    "producto_nombre": "Laptop Gaming"
  }
}
```

**Características:**
- Solo puedes calificar un producto una vez por usuario
- El usuario_id se obtiene automáticamente del token JWT
- Se valida que el producto exista y esté activo
- La calificación debe estar entre 1 y 5 estrellas

### 2. Listar Reseñas (GET - Público)

**Endpoint:** `GET /reseñas`  
**Autenticación:** No requerida

**Parámetros de consulta (query parameters):**
- `producto_id` (opcional): Filtrar reseñas por producto
- `usuario_id` (opcional): Filtrar reseñas por usuario
- `pagina` (opcional): Número de página (default: 1)
- `limite` (opcional): Resultados por página (default: 10)
- `orden` (opcional): Ordenamiento - `fecha_creacion`, `calificacion`, `id` (default: `fecha_creacion`)

**Ejemplos:**

```bash
# Listar todas las reseñas
GET /reseñas

# Listar reseñas de un producto específico
GET /reseñas?producto_id=1

# Listar reseñas con paginación
GET /reseñas?pagina=1&limite=5

# Listar reseñas ordenadas por calificación
GET /reseñas?orden=calificacion
```

**Respuesta exitosa:**
```json
{
  "resenas": [
    {
      "id": 1,
      "producto_id": 1,
      "usuario_id": 1,
      "calificacion": 5,
      "comentario": "Excelente producto, muy recomendado",
      "fecha_creacion": "2024-01-15T10:30:00.000Z",
      "usuario_nombre": "María González",
      "usuario_email": "maria@example.com",
      "producto_nombre": "Laptop Gaming",
      "producto_precio": 1299.99
    }
  ],
  "estadisticas": {
    "total_resenas": 15,
    "calificacion_promedio": "4.33",
    "distribucion": {
      "cinco_estrellas": 8,
      "cuatro_estrellas": 4,
      "tres_estrellas": 2,
      "dos_estrellas": 1,
      "una_estrella": 0
    }
  },
  "pagina": 1,
  "limite": 10,
  "total": 15
}
```

**Nota:** Las estadísticas solo se incluyen cuando se filtra por `producto_id`.
