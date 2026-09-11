-- =========================================================
-- Base de datos: bd_jhm_tech_solutions
-- Proyecto: MotosHub - Cuarto Avance (React + Vite + FastAPI)
-- Ficha 3406211 | Instructor: Jhan Hader Munoz
--
-- Estructura: roles, permisos, roles_permisos, usuarios,
--             productos y servicios.
--
-- Ejecutar con:
--   mysql -u root -p < database/schema.sql
-- o importando este archivo desde phpMyAdmin / MySQL Workbench.
-- ==========================================================

CREATE DATABASE IF NOT EXISTS bd_jhm_tech_solutions
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bd_jhm_tech_solutions;

-- =========================================================
-- Tabla: roles
-- =========================================================
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO roles (id_rol, nombre_rol) VALUES
  (1, 'Administrador'),
  (2, 'Empleado'),
  (3, 'Cliente')
ON DUPLICATE KEY UPDATE nombre_rol = VALUES(nombre_rol);

-- =========================================================
-- Tabla: permisos
-- =========================================================
CREATE TABLE IF NOT EXISTS permisos (
  id_permiso INT AUTO_INCREMENT PRIMARY KEY,
  nombre_permiso VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(150) NULL
) ENGINE=InnoDB;

INSERT INTO permisos (id_permiso, nombre_permiso, descripcion) VALUES
  (1, 'usuarios.gestionar', 'Crear, editar, cambiar estado y eliminar usuarios'),
  (2, 'productos.gestionar', 'Crear, editar y eliminar productos'),
  (3, 'servicios.gestionar', 'Crear, editar y eliminar servicios'),
  (4, 'panel.admin', 'Acceso al panel de administrador'),
  (5, 'panel.empleado', 'Acceso al panel de empleado'),
  (6, 'panel.cliente', 'Acceso al panel de cliente')
ON DUPLICATE KEY UPDATE nombre_permiso = VALUES(nombre_permiso);

-- =========================================================
-- Tabla: roles_permisos (relación N a N)
-- =========================================================
CREATE TABLE IF NOT EXISTS roles_permisos (
  id_rol INT NOT NULL,
  id_permiso INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE CASCADE,
  FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4),
  (2, 2), (2, 3), (2, 5),
  (3, 6);

-- =========================================================
-- Tabla: usuarios
-- =========================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  rol_id INT NOT NULL DEFAULT 3,
  nombres VARCHAR(50) NOT NULL,
  apellidos VARCHAR(50) NOT NULL,
  tipo_documento ENUM('CC', 'TI', 'CE', 'PA') NOT NULL,
  numero_documento VARCHAR(15) NOT NULL UNIQUE,
  direccion VARCHAR(100) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  foto VARCHAR(255) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  ultimo_acceso DATETIME NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

-- =========================================================
-- Tabla: productos
-- =========================================================
CREATE TABLE IF NOT EXISTS productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  imagen VARCHAR(255) NULL,
  categoria VARCHAR(50) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- Tabla: servicios
-- =========================================================
CREATE TABLE IF NOT EXISTS servicios (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_minutos INT NULL,
  imagen VARCHAR(255) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- Usuario administrador inicial
-- Correo: admin@jhmtech.com | Contraseña: Admin1234
-- El hash bcrypt es compatible con la libreria bcrypt de Python que usa FastAPI.
-- =========================================================
INSERT INTO usuarios (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id, estado)
VALUES (
  'Admin', 'JHM Tech', 'CC', '1000000000', 'Oficina Principal', '3000000000',
  'admin@jhmtech.com',
  '$2b$10$lqh.xTB.nGFttVkb2QJMgee4MJz7MtsRLr0ixy7y5af33Ze4l5rPC',
  1, 'activo'
) ON DUPLICATE KEY UPDATE email = VALUES(email);

-- =========================================================
-- Catálogo inicial: borra lo que haya y carga productos y
-- servicios de ejemplo más completos y realistas
-- =========================================================
DELETE FROM productos;
ALTER TABLE productos AUTO_INCREMENT = 1;

INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria) VALUES
  ('Kawasaki Ninja 400', 'Deportiva bicilíndrica de 399cc, ideal para pista y ciudad. Chasis liviano, frenos ABS y consumo eficiente.', 25500000, 4, '/img/productos/kawasaki-ninja400.webp', 'Motos'),
  ('Yamaha MT-07', 'Naked de 689cc con motor CP2 de gran torque a bajas revoluciones. Perfecta para uso diario y ruta.', 32900000, 3, '/img/productos/yamaha-mt07.webp', 'Motos'),
  ('Honda CB500F', 'Naked de 471cc, suave y confiable, pensada para quienes inician en motos de media cilindrada.', 28900000, 5, '/img/productos/honda-cb500f.webp', 'Motos'),
  ('Suzuki V-Strom 250', 'Adventure liviana de 250cc, suspensión de largo recorrido, ideal para ciudad y trocha ligera.', 21500000, 6, '/img/productos/suzuki-vstrom250.webp', 'Motos'),
  ('Ducati Monster 937', 'Naked italiana de alta gama, 937cc, electrónica avanzada (control de tracción, tres modos de manejo).', 62900000, 2, '/img/productos/ducati-monster937.webp', 'Motos'),
  ('BMW G 310 R', 'Naked de 313cc fabricada en colaboración con TVS, frenos ABS de serie y bajo mantenimiento.', 24800000, 4, '/img/productos/bmw-g310r.webp', 'Motos'),
  ('Casco Integral MT Thunder', 'Casco certificado DOT con visor antirrayado y sistema de ventilación, disponible en varias tallas.', 480000, 20, '/img/productos/casco-integral.jpg', 'Cascos'),
  ('Casco Modular LS2 Valiant', 'Casco convertible integral/abierto, doble homologación, visor solar interno.', 650000, 12, '/img/productos/casco-modular.jpg', 'Cascos'),
  ('Chaqueta Adventure Impermeable', 'Chaqueta con protecciones removibles en hombros y codos, forro térmico desmontable.', 380000, 15, '/img/productos/chaqueta-adventure.jpg', 'Accesorios'),
  ('Guantes de Cuero Racing', 'Guantes reforzados con protección en nudillos y palma antideslizante.', 120000, 30, '/img/productos/guantes-racing.jpg', 'Accesorios'),
  ('Maleta Lateral Rígida 30L', 'Par de maletas laterales resistentes al agua, con sistema de anclaje rápido.', 890000, 8, '/img/productos/maleta-lateral.jpg', 'Accesorios'),
  ('Aceite Motul 5100 10W40', 'Aceite semisintético para motor 4T, presentación de 1 litro.', 65000, 60, '/img/productos/aceite-motor.jpg', 'Lubricantes'),
  ('Kit de Pastillas de Freno', 'Pastillas delanteras y traseras de alto rendimiento, compuesto orgánico.', 95000, 25, '/img/productos/pastillas-freno.jpg', 'Repuestos'),
  ('Cadena de Transmisión O-Ring', 'Cadena reforzada 520, 120 eslabones, sellado O-ring para mayor duración.', 180000, 15, '/img/productos/cadena-transmision.jpg', 'Repuestos'),
  ('Batería de Gel 12V', 'Batería libre de mantenimiento, compatible con motos de 150cc a 650cc.', 220000, 18, '/img/productos/bateria-gel.jpg', 'Repuestos');

DELETE FROM servicios;
ALTER TABLE servicios AUTO_INCREMENT = 1;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, imagen) VALUES
  ('Cambio de Aceite y Filtro', 'Cambio de aceite de motor más filtro, incluye revisión de niveles.', 70000, 30, '/img/servicios/cambio-aceite.jpg'),
  ('Mantenimiento Preventivo 5.000 km', 'Revisión general: frenos, cadena, luces, presión de llantas y torque de pernos.', 150000, 90, '/img/servicios/mantenimiento.jpg'),
  ('Alineación y Balanceo', 'Ajuste de dirección y balanceo de ruedas para mayor estabilidad.', 60000, 40, '/img/servicios/alineacion-balanceo.jpg'),
  ('Cambio de Pastillas de Freno', 'Reemplazo de pastillas delanteras o traseras, incluye mano de obra.', 50000, 45, '/img/servicios/pastillas-servicio.jpg'),
  ('Revisión Técnico-Mecánica', 'Preparación e inspección previa a la revisión obligatoria.', 90000, 60, '/img/servicios/revision-tecnica.jpg'),
  ('Diagnóstico Electrónico', 'Escaneo de fallas con equipo especializado para motos inyectadas.', 80000, 40, '/img/servicios/diagnostico.jpg'),
  ('Cambio de Llantas', 'Montaje y balanceo de llanta delantera o trasera (no incluye la llanta).', 45000, 40, '/img/servicios/cambio-llantas.jpg'),
  ('Lavado y Encerado General', 'Lavado completo de la moto con encerado protector de pintura.', 40000, 45, '/img/servicios/lavado-encerado.jpg')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- =========================================================
-- Usuarios de demostracion para evidenciar el control de roles
--   empleado@jhmtech.com / Empleado123  -> rol Empleado
--   cliente@jhmtech.com  / Cliente123   -> rol Cliente
-- Las contrasenas estan almacenadas como hash bcrypt (12 rounds).
-- =========================================================
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
