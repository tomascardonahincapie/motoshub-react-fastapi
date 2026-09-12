-- =========================================================
-- Tabla: tokens_recuperacion
--
-- Guarda las solicitudes de restablecimiento de contrasena.
-- No se almacena el token que recibe el usuario, sino su hash SHA-256:
-- si alguien accediera a la tabla no podria usarlos para cambiar claves.
--
-- Cada token:
--   - sirve una sola vez (columna `usado`)
--   - expira a los 30 minutos (configurable en .env)
--   - se anula si el usuario pide uno nuevo
--
-- Es seguro ejecutar este script varias veces.
--
-- Ejecutar con:
--   mysql -u root -p < database/recuperacion_password.sql
-- =========================================================

USE bd_jhm_tech_solutions;

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

-- Comprobacion
SELECT 'tokens_recuperacion' AS tabla, COUNT(*) AS solicitudes FROM tokens_recuperacion;
