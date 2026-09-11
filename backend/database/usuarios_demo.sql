-- =========================================================
-- Usuarios de demostracion (Empleado y Cliente)
--
-- Usa este archivo si YA tienes la base de datos creada del avance
-- anterior y solo quieres agregar los usuarios de prueba, sin volver a
-- ejecutar schema.sql (que recarga el catalogo de productos y servicios).
--
--   empleado@jhmtech.com / Empleado123  -> rol Empleado
--   cliente@jhmtech.com  / Cliente123   -> rol Cliente
--
-- Las contrasenas se guardan como hash bcrypt (12 rondas).
--
-- Ejecutar con:
--   mysql -u root -p < database/usuarios_demo.sql
-- =========================================================

USE bd_jhm_tech_solutions;

INSERT INTO usuarios (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id, estado)
VALUES
  ('Laura', 'Gomez', 'CC', '1000000001', 'Taller Central', '3001112233',
   'empleado@jhmtech.com',
   '$2b$12$.0MfygGJ0NQcRLvsZOiipeFRYbFFlLeVPhFfFffnHwrLV.FJ7ARD.',
   2, 'activo'),
  ('Carlos', 'Perez', 'CC', '1000000002', 'Carrera 45 #12-30', '3004445566',
   'cliente@jhmtech.com',
   '$2b$12$DzFd48dTLqTEQIR7b.Zdou812Bg4OVkDU4BKcyyisIrhOp7twhbJu',
   3, 'activo')
ON DUPLICATE KEY UPDATE email = VALUES(email);

SELECT u.id_usuario, u.nombres, u.email, r.nombre_rol, u.estado
FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id;
