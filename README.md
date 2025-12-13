### Ejercicio: Extiende la API agregando: 
- ✅ sistema de autenticación JWT completo, 
- ✅ subida de imágenes para productos con multer, 
- ✅ sistema de reseñas y calificaciones, 
- ✅ notificaciones por email para nuevos pedidos, y 
- un sistema de caché con Redis para las consultas más frecuentes.

## ✅ Sistema de Autenticación JWT Implementado

La API ahora incluye un sistema completo de autenticación JWT que protege todas las rutas excepto el endpoint de login.

### Instalación

# Instalar dependencias
npm install express mysql2 dotenv axios jsonwebtoken bcrypt multer nodemailer

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
- `POST /pedidos` - Crear pedido
- `GET /pedidos` - Listar pedidos del usuario
- `GET /pedidos/:id` - Obtener pedido específico
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

## 🛒 Sistema de Pedidos y Notificaciones por Email

La API ahora incluye un sistema completo de pedidos con notificaciones automáticas por email.

### Configuración de Email

Para configurar el envío de emails, agrega las siguientes variables a tu archivo `.env`:

```bash
# Configuración SMTP (opcional - si no se configura, se usa Ethereal Email para pruebas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
SMTP_FROM=noreply@tienda.com
```

**Nota:** Si no configuras SMTP, la aplicación usará Ethereal Email (servicio de prueba) que mostrará URLs de vista previa en la consola.

### 1. Crear Pedido (POST - Protegido)

**Endpoint:** `POST /pedidos`  
**Autenticación:** Requerida (Bearer Token)

```bash
POST /pedidos
Authorization: Bearer TU_TOKEN
Content-Type: application/json

{
  "items": [
    {
      "producto_id": 1,
      "cantidad": 2
    },
    {
      "producto_id": 3,
      "cantidad": 1
    }
  ]
}
```

**Parámetros:**
- `items` (requerido): Array de objetos con:
  - `producto_id` (requerido): ID del producto
  - `cantidad` (requerido): Cantidad a pedir

**Validaciones:**
- El producto debe existir y estar activo
- Debe haber stock suficiente para cada producto
- La cantidad debe ser un número positivo

**Respuesta exitosa:**
```json
{
  "mensaje": "Pedido creado exitosamente",
  "pedido": {
    "id": 1,
    "usuario_id": 1,
    "fecha_pedido": "2024-01-15T10:30:00.000Z",
    "total": 2679.97,
    "estado": "pendiente",
    "usuario_nombre": "María González",
    "usuario_email": "maria@example.com",
    "items": [
      {
        "id": 1,
        "producto_id": 1,
        "producto_nombre": "Laptop Gaming",
        "cantidad": 2,
        "precio_unitario": 1299.99,
        "imagen": "http://localhost:3000/uploads/laptop.jpg"
      },
      {
        "id": 2,
        "producto_id": 3,
        "producto_nombre": "Teclado Mecánico",
        "cantidad": 1,
        "precio_unitario": 89.99,
        "imagen": null
      }
    ]
  }
}
```

**Características:**
- Se crea el pedido y sus detalles en una transacción (todo o nada)
- Se actualiza automáticamente el stock de los productos
- Se envía un email de confirmación al usuario
- El email incluye todos los detalles del pedido en formato HTML

### 2. Listar Pedidos del Usuario (GET - Protegido)

**Endpoint:** `GET /pedidos`  
**Autenticación:** Requerida (Bearer Token)

**Parámetros de consulta:**
- `pagina` (opcional): Número de página (default: 1)
- `limite` (opcional): Resultados por página (default: 10)
- `estado` (opcional): Filtrar por estado (`pendiente`, `procesando`, `enviado`, `completado`, `cancelado`)

```bash
GET /pedidos?pagina=1&limite=10&estado=pendiente
Authorization: Bearer TU_TOKEN
```

**Respuesta exitosa:**
```json
{
  "pedidos": [
    {
      "id": 1,
      "fecha_pedido": "2024-01-15T10:30:00.000Z",
      "total": 2679.97,
      "estado": "pendiente",
      "total_items": 3
    }
  ],
  "pagina": 1,
  "limite": 10
}
```

### 3. Obtener Pedido Específico (GET - Protegido)

**Endpoint:** `GET /pedidos/:id`  
**Autenticación:** Requerida (Bearer Token)

```bash
GET /pedidos/1
Authorization: Bearer TU_TOKEN
```

**Respuesta exitosa:**
```json
{
  "pedido": {
    "id": 1,
    "usuario_id": 1,
    "fecha_pedido": "2024-01-15T10:30:00.000Z",
    "total": 2679.97,
    "estado": "pendiente",
    "usuario_nombre": "María González",
    "usuario_email": "maria@example.com",
    "items": [
      {
        "id": 1,
        "producto_id": 1,
        "producto_nombre": "Laptop Gaming",
        "cantidad": 2,
        "precio_unitario": 1299.99,
        "imagen": "http://localhost:3000/uploads/laptop.jpg"
      }
    ]
  }
}
```

### 4. Email de Confirmación

Cuando se crea un pedido, se envía automáticamente un email al usuario con:

- **Asunto:** "Confirmación de Pedido #[número]"
- **Contenido:**
  - Saludo personalizado
  - Número de pedido
  - Fecha del pedido
  - Estado del pedido
  - Tabla detallada de productos (nombre, cantidad, precio unitario, subtotal)
  - Total del pedido
  - Formato HTML con diseño profesional

**Ejemplo de email:**
```
¡Pedido Confirmado!

Hola María González,

Tu pedido ha sido recibido exitosamente.

Detalles del Pedido:
- Número de Pedido: #1
- Fecha: 15/01/2024, 10:30:00
- Estado: pendiente

Productos:
- Laptop Gaming x2 - $1299.99 c/u = $2599.98
- Teclado Mecánico x1 - $89.99 c/u = $89.99

Total: $2689.97
```

### 5. Ejemplo de Uso con cURL

```bash
# 1. Login para obtener token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@example.com","password":"maria123"}'

# 2. Crear un pedido (usar el token recibido)
curl -X POST http://localhost:3000/pedidos \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "producto_id": 1,
        "cantidad": 2
      },
      {
        "producto_id": 3,
        "cantidad": 1
      }
    ]
  }'

# 3. Listar pedidos del usuario
curl -X GET "http://localhost:3000/pedidos?pagina=1&limite=10" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# 4. Obtener un pedido específico
curl -X GET http://localhost:3000/pedidos/1 \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 6. Ejemplo con JavaScript

```javascript
// Crear pedido (requiere autenticación)
const crearPedido = async (token, items) => {
  const response = await fetch('http://localhost:3000/pedidos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });
  
  return await response.json();
};

// Listar pedidos (requiere autenticación)
const listarPedidos = async (token, pagina = 1, limite = 10) => {
  const response = await fetch(
    `http://localhost:3000/pedidos?pagina=${pagina}&limite=${limite}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// Uso
const token = 'TU_TOKEN_AQUI';
const pedido = await crearPedido(token, [
  { producto_id: 1, cantidad: 2 },
  { producto_id: 3, cantidad: 1 }
]);
console.log('Pedido creado:', pedido);

const pedidos = await listarPedidos(token);
console.log('Mis pedidos:', pedidos);
```

### 7. Manejo de Errores

**Stock insuficiente:**
```json
{
  "error": "Error en el pedido",
  "mensaje": "Stock insuficiente para el producto \"Laptop Gaming\". Stock disponible: 1, solicitado: 2"
}
```

**Producto no encontrado:**
```json
{
  "error": "Error en el pedido",
  "mensaje": "Producto con ID 999 no encontrado o inactivo"
}
```

### 8. Notas Importantes

- **Transacciones:** Los pedidos se crean usando transacciones de base de datos, garantizando que si algo falla, todo se revierte
- **Stock:** El stock se actualiza automáticamente al crear el pedido
- **Email asíncrono:** El envío de email no bloquea la respuesta. Si falla el email, el pedido igual se crea exitosamente
- **Seguridad:** Solo puedes ver tus propios pedidos (filtrado por usuario autenticado)
- **Estados:** Los pedidos pueden tener los siguientes estados: `pendiente`, `procesando`, `enviado`, `completado`, `cancelado`
