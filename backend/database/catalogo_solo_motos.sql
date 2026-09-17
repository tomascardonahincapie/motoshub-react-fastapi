-- =========================================================
-- MotosHub - El catalogo de productos pasa a ser solo motos
--
-- El negocio vende motocicletas; el taller es lo que esta en
-- la tabla `servicios`. Los accesorios y repuestos que habia
-- en `productos` (cascos, chaqueta, guantes, maleta, aceite,
-- pastillas, cadena y bateria) no corresponden y se retiran.
--
-- Las ventas ya registradas NO se pierden: detalle_ventas
-- guarda una copia del nombre y del precio de cada articulo,
-- y su clave foranea es ON DELETE SET NULL. El historico
-- sigue mostrando lo que se vendio; solo deja de apuntar a
-- una ficha de producto que ya no existe.
--
-- Ejecutar con:
--   mysql -u root -p bd_jhm_tech_solutions < database/catalogo_solo_motos.sql
-- =========================================================

USE bd_jhm_tech_solutions;

-- ---------------------------------------------------------
-- 1. Fuera lo que no es una moto
-- ---------------------------------------------------------
DELETE FROM productos WHERE categoria <> 'Motos';

-- ---------------------------------------------------------
-- 2. La ficha de la Ducati decia "Monster 937" pero la foto
--    es de una Monster 1200 S. Se ajusta el nombre al modelo
--    real, que es justo lo que se pedia: que la foto y el
--    nombre digan lo mismo.
-- ---------------------------------------------------------
UPDATE productos
   SET nombre = 'Ducati Monster 1200 S',
       descripcion = 'Naked italiana de 1198cc y 147 HP, con suspension Ohlins, frenos Brembo M50 y control electronico completo.',
       precio = 72900000
 WHERE nombre = 'Ducati Monster 937';

-- ---------------------------------------------------------
-- 3. Categorias por tipo de moto, para que el filtro del
--    catalogo sirva de algo. Antes todas decian "Motos".
-- ---------------------------------------------------------
UPDATE productos SET categoria = 'Deportivas' WHERE nombre = 'Kawasaki Ninja 400';
UPDATE productos SET categoria = 'Naked'      WHERE nombre IN
  ('Yamaha MT-07', 'Honda CB500F', 'Ducati Monster 1200 S', 'BMW G 310 R');
UPDATE productos SET categoria = 'Adventure'  WHERE nombre = 'Suzuki V-Strom 250';

-- ---------------------------------------------------------
-- 4. Seis modelos mas, para que el concesionario tenga una
--    gama completa: desde una urbana de 125cc hasta una
--    Ducati. Los precios son de referencia en pesos.
-- ---------------------------------------------------------
INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria, estado) VALUES
  ('Royal Enfield Classic 350',
   'Clasica de 349cc con motor monocilindrico J-Series, freno de disco y estetica retro britanica.',
   22900000, 3, '/img/productos/royal-enfield-classic350.webp', 'Clasicas', 'activo'),

  ('KTM 390 Duke',
   'Naked austriaca de 373cc y 44 HP, chasis de acero tubular, suspension WP y tablero TFT a color.',
   27500000, 4, '/img/productos/ktm-duke390.webp', 'Naked', 'activo'),

  ('Suzuki Gixxer SF 250',
   'Deportiva carenada de 249cc refrigerada por aceite, ligera y comoda para ciudad y carretera.',
   16900000, 5, '/img/productos/suzuki-gixxer250.webp', 'Deportivas', 'activo'),

  ('Honda CB 125F',
   'Urbana de 124cc, bajo consumo y mantenimiento sencillo. Ideal como primera moto.',
   8900000, 8, '/img/productos/honda-cb125f.webp', 'Urbanas', 'activo'),

  ('Kawasaki Z650',
   'Naked de 649cc bicilindrica, chasis trellis y 68 HP. Equilibrio entre potencia y manejo.',
   38500000, 3, '/img/productos/kawasaki-z650.webp', 'Naked', 'activo'),

  ('Ducati Scrambler Icon',
   'Scrambler de 803cc con estetica atemporal, manillar ancho y llantas de tacos ligeros.',
   54900000, 2, '/img/productos/ducati-scrambler.webp', 'Clasicas', 'activo')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- ---------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------
SELECT categoria, COUNT(*) AS motos, CONCAT('$ ', FORMAT(MIN(precio), 0), ' - $ ', FORMAT(MAX(precio), 0)) AS rango
  FROM productos GROUP BY categoria ORDER BY categoria;

SELECT COUNT(*) AS total_productos FROM productos;
SELECT COUNT(*) AS total_servicios FROM servicios;
