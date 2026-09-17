-- =========================================================
-- Actualizacion del catalogo: imagenes locales
--
-- Que hace este script:
--   1. Agrega la columna `imagen` a la tabla `servicios`.
--   2. Apunta las imagenes de productos y servicios a los archivos
--      que estan en frontend/public/img/, en vez de URLs externas.
--
-- Por que: dos de las URLs de Unsplash que usaba el catalogo devolvian
-- 404 y otras cuatro estaban repetidas en varios productos. Con las
-- imagenes servidas por la propia aplicacion siempre cargan, incluso
-- sin conexion a internet.
--
-- Es seguro ejecutarlo varias veces.
--
-- Ejecutar con:
--   mysql -u root -p < database/actualizar_imagenes.sql
-- =========================================================

USE bd_jhm_tech_solutions;

-- ---------------------------------------------------------
-- 1. Columna `imagen` en servicios (solo si no existe todavia)
-- ---------------------------------------------------------
SET @existe := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = 'bd_jhm_tech_solutions'
    AND table_name = 'servicios'
    AND column_name = 'imagen'
);

SET @sql := IF(@existe = 0,
  'ALTER TABLE servicios ADD COLUMN imagen VARCHAR(255) NULL AFTER duracion_minutos',
  'SELECT "La columna imagen ya existe en servicios" AS aviso'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------
-- 2. Imagenes de productos
-- ---------------------------------------------------------
UPDATE productos SET imagen = '/img/productos/kawasaki-ninja400.webp'        WHERE nombre = 'Kawasaki Ninja 400';
UPDATE productos SET imagen = '/img/productos/yamaha-mt07.webp'              WHERE nombre = 'Yamaha MT-07';
UPDATE productos SET imagen = '/img/productos/honda-cb500f.webp'             WHERE nombre = 'Honda CB500F';
UPDATE productos SET imagen = '/img/productos/suzuki-vstrom250.webp'         WHERE nombre = 'Suzuki V-Strom 250';
UPDATE productos SET imagen = '/img/productos/ducati-monster937.webp'        WHERE nombre = 'Ducati Monster 1200 S';
UPDATE productos SET imagen = '/img/productos/bmw-g310r.webp'                WHERE nombre = 'BMW G 310 R';
UPDATE productos SET imagen = '/img/productos/royal-enfield-classic350.webp' WHERE nombre = 'Royal Enfield Classic 350';
UPDATE productos SET imagen = '/img/productos/ktm-duke390.webp'              WHERE nombre = 'KTM 390 Duke';
UPDATE productos SET imagen = '/img/productos/suzuki-gixxer250.webp'         WHERE nombre = 'Suzuki Gixxer SF 250';
UPDATE productos SET imagen = '/img/productos/honda-cb125f.webp'             WHERE nombre = 'Honda CB 125F';
UPDATE productos SET imagen = '/img/productos/kawasaki-z650.webp'            WHERE nombre = 'Kawasaki Z650';
UPDATE productos SET imagen = '/img/productos/ducati-scrambler.webp'         WHERE nombre = 'Ducati Scrambler Icon';

UPDATE servicios SET imagen = '/img/servicios/cambio-aceite.jpg'       WHERE nombre = 'Cambio de Aceite y Filtro';
UPDATE servicios SET imagen = '/img/servicios/mantenimiento.jpg'       WHERE nombre = 'Mantenimiento Preventivo 5.000 km';
UPDATE servicios SET imagen = '/img/servicios/alineacion-balanceo.jpg' WHERE nombre = 'Alineación y Balanceo';
UPDATE servicios SET imagen = '/img/servicios/pastillas-servicio.jpg'  WHERE nombre = 'Cambio de Pastillas de Freno';
UPDATE servicios SET imagen = '/img/servicios/revision-tecnica.jpg'    WHERE nombre = 'Revisión Técnico-Mecánica';
UPDATE servicios SET imagen = '/img/servicios/diagnostico.jpg'         WHERE nombre = 'Diagnóstico Electrónico';
UPDATE servicios SET imagen = '/img/servicios/cambio-llantas.jpg'      WHERE nombre = 'Cambio de Llantas';
UPDATE servicios SET imagen = '/img/servicios/lavado-encerado.jpg'     WHERE nombre = 'Lavado y Encerado General';

-- ---------------------------------------------------------
-- 4. Comprobacion
-- ---------------------------------------------------------
SELECT 'productos sin imagen' AS revision, COUNT(*) AS total FROM productos WHERE imagen IS NULL OR imagen = ''
UNION ALL
SELECT 'servicios sin imagen', COUNT(*) FROM servicios WHERE imagen IS NULL OR imagen = '';
