-- =========================================================
-- Base de datos: bd_jhm_tech_solutions
-- Proyecto: MotosHub - Quinto Avance (React + Vite + FastAPI)
-- Ficha 3406211 | Instructor: Jhan Hader Munoz
--
-- Estructura: roles, permisos, roles_permisos, usuarios,
--             productos, servicios, tokens_recuperacion,
--             ventas, detalle_ventas, facturas, detalle_facturas, pqr,
--             conversaciones y mensajes.
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
-- Tabla: tokens_recuperacion
-- Solicitudes de restablecimiento de contrasena. Se guarda el hash
-- SHA-256 del token, nunca el token que recibe el usuario.
-- =========================================================
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id_token INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  fecha_expiracion DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_usuario (id_usuario),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
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
-- Catálogo inicial: borra lo que haya y carga las motos y
-- los servicios del taller.
--
-- En `productos` solo van motocicletas: el negocio vende motos,
-- y lo que se hace sobre ellas esta en la tabla `servicios`.
-- =========================================================
DELETE FROM productos;
ALTER TABLE productos AUTO_INCREMENT = 1;

INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria) VALUES
  ('Kawasaki Ninja 400', 'Deportiva bicilíndrica de 399cc, ideal para pista y ciudad. Chasis liviano, frenos ABS y consumo eficiente.', 25500000, 4, '/img/productos/kawasaki-ninja400.webp', 'Deportivas'),
  ('Suzuki Gixxer SF 250', 'Deportiva carenada de 249cc refrigerada por aceite, ligera y cómoda para ciudad y carretera.', 16900000, 5, '/img/productos/suzuki-gixxer250.webp', 'Deportivas'),
  ('Yamaha MT-07', 'Naked de 689cc con motor CP2 de gran torque a bajas revoluciones. Perfecta para uso diario y ruta.', 32900000, 3, '/img/productos/yamaha-mt07.webp', 'Naked'),
  ('Honda CB500F', 'Naked de 471cc, suave y confiable, pensada para quienes inician en motos de media cilindrada.', 28900000, 5, '/img/productos/honda-cb500f.webp', 'Naked'),
  ('Ducati Monster 1200 S', 'Naked italiana de 1198cc y 147 HP, con suspensión Öhlins, frenos Brembo M50 y control electrónico completo.', 72900000, 2, '/img/productos/ducati-monster937.webp', 'Naked'),
  ('BMW G 310 R', 'Naked de 313cc fabricada en colaboración con TVS, frenos ABS de serie y bajo mantenimiento.', 24800000, 4, '/img/productos/bmw-g310r.webp', 'Naked'),
  ('KTM 390 Duke', 'Naked austriaca de 373cc y 44 HP, chasis de acero tubular, suspensión WP y tablero TFT a color.', 27500000, 4, '/img/productos/ktm-duke390.webp', 'Naked'),
  ('Kawasaki Z650', 'Naked de 649cc bicilíndrica, chasis trellis y 68 HP. Equilibrio entre potencia y manejo.', 38500000, 3, '/img/productos/kawasaki-z650.webp', 'Naked'),
  ('Suzuki V-Strom 250', 'Adventure liviana de 250cc, suspensión de largo recorrido, ideal para ciudad y trocha ligera.', 21500000, 6, '/img/productos/suzuki-vstrom250.webp', 'Adventure'),
  ('Royal Enfield Classic 350', 'Clásica de 349cc con motor monocilíndrico J-Series, freno de disco y estética retro británica.', 22900000, 3, '/img/productos/royal-enfield-classic350.webp', 'Clasicas'),
  ('Ducati Scrambler Icon', 'Scrambler de 803cc con estética atemporal, manillar ancho y llantas de tacos ligeros.', 54900000, 2, '/img/productos/ducati-scrambler.webp', 'Clasicas'),
  ('Honda CB 125F', 'Urbana de 124cc, bajo consumo y mantenimiento sencillo. Ideal como primera moto.', 8900000, 8, '/img/productos/honda-cb125f.webp', 'Urbanas');

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

-- =========================================================
-- =========================================================
--  QUINTO AVANCE
--  Modulo comercial, PQR y chatbot con Inteligencia Artificial.
--
--  Si ya tienes la base del cuarto avance con datos, no
--  ejecutes este archivo completo: usa database/quinto_avance.sql,
--  que solo agrega lo nuevo y no borra el catalogo.
-- =========================================================
-- =========================================================

-- =========================================================
-- Tabla: ventas
-- Una fila por operacion comercial.
-- =========================================================
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  numero_venta VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  usuario_id INT NULL COMMENT 'Quien registro la venta; NULL si compro el propio cliente',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado ENUM('pendiente','pagada','anulada') NOT NULL DEFAULT 'pendiente',
  metodo_pago ENUM('efectivo','tarjeta','transferencia','credito') NOT NULL DEFAULT 'efectivo',
  observaciones VARCHAR(255) NULL,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ventas_cliente (cliente_id),
  INDEX idx_ventas_fecha (fecha_venta),
  INDEX idx_ventas_estado (estado),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id)
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: detalle_ventas
-- Una fila por articulo vendido. Guarda el nombre y el precio
-- del momento de la venta, para que el historico no cambie si
-- luego se edita o se borra el articulo del catalogo.
-- =========================================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  tipo_item ENUM('producto','servicio') NOT NULL,
  producto_id INT NULL,
  servicio_id INT NULL,
  nombre_item VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_detalle_venta (venta_id),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id)
    REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id_producto) ON DELETE SET NULL,
  CONSTRAINT fk_detalle_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id_servicio) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: facturas
-- Copia los datos del cliente al emitir: una factura es un
-- documento y no puede cambiar si el cliente edita su perfil.
-- =========================================================
CREATE TABLE IF NOT EXISTS facturas (
  id_factura INT AUTO_INCREMENT PRIMARY KEY,
  numero_factura VARCHAR(20) NOT NULL UNIQUE,
  venta_id INT NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  cliente_nombre VARCHAR(101) NOT NULL,
  cliente_documento VARCHAR(15) NOT NULL,
  cliente_email VARCHAR(100) NOT NULL,
  cliente_telefono VARCHAR(10) NULL,
  cliente_direccion VARCHAR(100) NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 0,
  estado ENUM('emitida','pagada','anulada') NOT NULL DEFAULT 'emitida',
  observaciones VARCHAR(255) NULL,
  fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_facturas_cliente (cliente_id),
  INDEX idx_facturas_fecha (fecha_emision),
  INDEX idx_facturas_estado (estado),
  CONSTRAINT fk_facturas_venta FOREIGN KEY (venta_id)
    REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_facturas_cliente FOREIGN KEY (cliente_id)
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: detalle_facturas
-- Copia de las lineas en el momento de emitir. Junto con los
-- datos del cliente y los totales que ya guarda la factura,
-- hace que el documento no dependa de la venta.
-- =========================================================
CREATE TABLE IF NOT EXISTS detalle_facturas (
  id_detalle_factura INT AUTO_INCREMENT PRIMARY KEY,
  factura_id INT NOT NULL,
  tipo_item VARCHAR(20) NOT NULL,
  nombre_item VARCHAR(100) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_detalle_factura (factura_id),
  CONSTRAINT fk_detalle_facturas_factura FOREIGN KEY (factura_id)
    REFERENCES facturas(id_factura) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: pqr
-- Peticiones, quejas, reclamos y sugerencias de los clientes.
-- =========================================================
CREATE TABLE IF NOT EXISTS pqr (
  id_pqr INT AUTO_INCREMENT PRIMARY KEY,
  radicado VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  tipo ENUM('peticion','queja','reclamo','sugerencia') NOT NULL,
  asunto VARCHAR(120) NOT NULL,
  descripcion TEXT NOT NULL,
  estado ENUM('pendiente','en_proceso','respondida','cerrada') NOT NULL DEFAULT 'pendiente',
  respuesta TEXT NULL,
  atendido_por INT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta DATETIME NULL,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pqr_cliente (cliente_id),
  INDEX idx_pqr_estado (estado),
  INDEX idx_pqr_tipo (tipo),
  INDEX idx_pqr_fecha (fecha_registro),
  CONSTRAINT fk_pqr_cliente FOREIGN KEY (cliente_id)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_pqr_agente FOREIGN KEY (atendido_por)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: conversaciones
-- Cada charla con el chatbot. usuario_id queda NULL cuando
-- pregunta un visitante que todavia no se ha registrado.
-- =========================================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id_conversacion INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  titulo VARCHAR(120) NOT NULL DEFAULT 'Conversacion',
  canal VARCHAR(30) NOT NULL DEFAULT 'web',
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conversaciones_usuario (usuario_id),
  CONSTRAINT fk_conversaciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: mensajes
-- Cada turno de la conversacion. La columna `origen` guarda el
-- modelo de IA que respondio, o 'reglas' si no habia API Key:
-- es la evidencia de que la respuesta vino de la IA.
-- =========================================================
CREATE TABLE IF NOT EXISTS mensajes (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  conversacion_id INT NOT NULL,
  rol ENUM('usuario','asistente','sistema') NOT NULL,
  contenido TEXT NOT NULL,
  origen VARCHAR(60) NULL,
  fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mensajes_conversacion (conversacion_id),
  CONSTRAINT fk_mensajes_conversacion FOREIGN KEY (conversacion_id)
    REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Permisos de los nuevos modulos
-- =========================================================
INSERT INTO permisos (id_permiso, nombre_permiso, descripcion) VALUES
  (7,  'ventas.registrar',  'Registrar ventas de productos y servicios'),
  (8,  'ventas.consultar',  'Consultar el historial de ventas'),
  (9,  'facturas.emitir',   'Emitir y anular facturas de venta'),
  (10, 'reportes.generar',  'Generar el reporte diario en PDF y Excel'),
  (11, 'pqr.gestionar',     'Responder y cerrar las PQR de los clientes'),
  (12, 'pqr.radicar',       'Radicar peticiones, quejas y reclamos'),
  (13, 'dashboard.ver',     'Consultar los indicadores y graficos del panel')
ON DUPLICATE KEY UPDATE
  nombre_permiso = VALUES(nombre_permiso),
  descripcion = VALUES(descripcion);

-- Administrador: todo. Empleado: la operacion comercial.
-- Cliente: comprar, radicar PQR y ver sus propias cifras.
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso) VALUES
  (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12), (1, 13),
  (2, 7), (2, 8), (2, 9), (2, 10), (2, 11), (2, 13),
  (3, 7), (3, 12), (3, 13);
