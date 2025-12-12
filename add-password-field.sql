-- Script para agregar campo password a la tabla usuarios
-- Ejecutar este script en la base de datos antes de usar la autenticación

USE ttops_node_db;

-- Agregar columna password a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN password VARCHAR(255) NULL AFTER email;

-- Crear índice para búsquedas por email (ya existe, pero lo dejamos por si acaso)
-- CREATE INDEX idx_email ON usuarios(email);

-- Nota: Los usuarios existentes tendrán password NULL
-- Para asignar contraseñas a usuarios existentes, puedes ejecutar:
-- UPDATE usuarios SET password = '$2b$10$ejemplo_hash_aqui' WHERE email = 'usuario@example.com';
-- (Usa bcrypt.hash() en Node.js para generar el hash correcto)
