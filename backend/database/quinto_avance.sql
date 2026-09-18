-- =========================================================
-- MotosHub - Quinto Avance
-- Nuevas tablas: ventas, detalle_ventas, facturas, detalle_facturas,
--                pqr, conversaciones y mensajes.
--
-- Este script es ADITIVO: crea lo que falta y no borra ni
-- modifica nada de los avances anteriores. Se puede ejecutar
-- varias veces sin riesgo.
--
-- Ejecutar con:
--   mysql -u root -p bd_jhm_tech_solutions < database/quinto_avance.sql
-- o importandolo desde phpMyAdmin.
-- =========================================================

USE bd_jhm_tech_solutions;

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

SELECT 'Quinto avance: tablas y permisos creados correctamente.' AS resultado;
