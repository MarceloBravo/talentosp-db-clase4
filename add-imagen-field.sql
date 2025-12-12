-- Script para agregar campo imagen a la tabla productos
-- Ejecutar este script en la base de datos antes de usar la subida de imágenes

USE ttops_node_db;

-- Agregar columna imagen a la tabla productos
ALTER TABLE productos 
ADD COLUMN imagen VARCHAR(255) NULL AFTER descripcion;

-- Nota: El campo imagen almacenará la ruta relativa del archivo
-- Ejemplo: "uploads/producto-1234567890-987654321.jpg"
