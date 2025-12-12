### Ejercicio: Extiende la API agregando: 
- ✅ sistema de autenticación JWT completo, 
- ✅ subida de imágenes para productos con multer, 
- sistema de reseñas y calificaciones, 
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

# Agregar campo password a la tabla usuarios (ejecutar en MySQL)
mysql -u root -p ttops_node_db < add-password-field.sql

# Agregar campo imagen a la tabla productos (ejecutar en MySQL)
mysql -u root -p ttops_node_db < add-imagen-field.sql

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
- `GET /estadisticas` - Obtener estadísticas

### 4. Ejemplo de Uso con cURL

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@example.com","password":"tu_contraseña"}'

# 2. Usar el token recibido
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# 3. Listar usuarios
curl -X GET http://localhost:3000/usuarios \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 5. Crear Usuario con Contraseña

```bash
POST /usuarios
Authorization: Bearer TU_TOKEN
Content-Type: application/json

{
  "nombre": "Nuevo Usuario",
  "email": "nuevo@example.com",
  "edad": 25,
  "password": "contraseña123"
}
```

**Nota:** La contraseña se hashea automáticamente con bcrypt antes de guardarse en la base de datos.

## 📸 Subida de Imágenes para Productos

La API ahora permite subir imágenes al crear productos usando `multipart/form-data`.

### 1. Crear Producto con Imagen

```bash
POST /productos
Content-Type: multipart/form-data

{
  "nombre": "Laptop Gaming",
  "precio": 1299.99,
  "descripcion": "Laptop potente para gaming",
  "stock": 5,
  "categoria_id": 1,
  "imagen": [archivo de imagen]
}
```

**Características:**
- Formatos aceptados: JPEG, JPG, PNG, GIF, WEBP
- Tamaño máximo: 5MB
- Las imágenes se guardan en el directorio `uploads/`
- Se genera un nombre único para cada archivo
- La URL de la imagen se incluye en la respuesta

**Respuesta exitosa:**
```json
{
  "mensaje": "Producto creado exitosamente",
  "producto": {
    "id": 1,
    "nombre": "Laptop Gaming",
    "precio": 1299.99,
    "stock": 5,
    "categoria_id": 1,
    "imagen": "http://localhost:3000/uploads/laptop-1234567890-987654321.jpg"
  }
}
```

### 2. Ejemplo con cURL

```bash
curl -X POST http://localhost:3000/productos \
  -F "nombre=Laptop Gaming" \
  -F "precio=1299.99" \
  -F "descripcion=Laptop potente para gaming" \
  -F "stock=5" \
  -F "categoria_id=1" \
  -F "imagen=@/ruta/a/imagen.jpg"
```

### 3. Ejemplo con JavaScript (FormData)

```javascript
const formData = new FormData();
formData.append('nombre', 'Laptop Gaming');
formData.append('precio', '1299.99');
formData.append('descripcion', 'Laptop potente para gaming');
formData.append('stock', '5');
formData.append('categoria_id', '1');
formData.append('imagen', fileInput.files[0]); // fileInput es un input type="file"

fetch('http://localhost:3000/productos', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

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