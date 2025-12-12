-- init-database.sql - Inicialización de la base de datos
CREATE DATABASE IF NOT EXISTS ttops_node_db;
USE ttops_node_db;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  edad INT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_activo (activo)
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  categoria_id INT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_categoria (categoria_id),
  INDEX idx_activo (activo),
  INDEX idx_precio (precio)
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2) DEFAULT 0.00,
  estado ENUM('pendiente', 'procesando', 'enviado', 'completado', 'cancelado') DEFAULT 'pendiente',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha_pedido),
  INDEX idx_estado (estado)
);

-- Tabla de detalle de pedidos
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  INDEX idx_pedido (pedido_id),
  INDEX idx_producto (producto_id)
);

-- Datos de ejemplo
INSERT IGNORE INTO categorias (nombre, descripcion) VALUES
('Electrónica', 'Productos electrónicos y gadgets'),
('Ropa', 'Ropa y accesorios'),
('Hogar', 'Artículos para el hogar'),
('Deportes', 'Equipamiento deportivo');

INSERT IGNORE INTO usuarios (nombre, email, edad) VALUES
('María González', 'maria@example.com', 28),
('Carlos Rodríguez', 'carlos@example.com', 35),
('Ana Martínez', 'ana@example.com', 24);

INSERT IGNORE INTO productos (nombre, descripcion, precio, stock, categoria_id) VALUES
('Laptop Gaming', 'Laptop potente para gaming', 1299.99, 5, 1),
('Mouse Óptico', 'Mouse ergonómico inalámbrico', 29.99, 25, 1),
('Teclado Mecánico', 'Teclado RGB con switches cherry', 89.99, 12, 1),
('Camiseta Deportiva', 'Camiseta transpirable para running', 24.99, 50, 4),
('Zapatillas Running', 'Zapatillas ligeras para correr', 79.99, 20, 4),
('Sartén Antiadherente', 'Sartén de 24cm antiadherente', 34.99, 15, 3);