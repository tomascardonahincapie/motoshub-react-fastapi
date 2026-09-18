-- =========================================================
-- MotosHub - Tabla detalle_facturas
--
-- Hasta ahora la factura leia las lineas de la venta. Funcionaba,
-- pero dejaba el documento a merced de los cambios: si se corregia
-- una linea de la venta, la factura ya emitida imprimia otra cosa.
--
-- La factura ya guardaba copia de los datos del cliente y de los
-- totales; faltaba que guardara tambien las lineas. Con esto, una
-- factura emitida deja de depender por completo de la venta.
--
-- Ejecutar con:
--   mysql -u root -p bd_jhm_tech_solutions < database/detalle_facturas.sql
-- =========================================================

USE bd_jhm_tech_solutions;

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

-- Las facturas que ya existian se rellenan con el detalle de su venta,
-- que es exactamente lo que imprimieron en su momento.
INSERT INTO detalle_facturas
  (factura_id, tipo_item, nombre_item, cantidad, precio_unitario, descuento, subtotal)
SELECT f.id_factura, d.tipo_item, d.nombre_item, d.cantidad,
       d.precio_unitario, d.descuento, d.subtotal
  FROM facturas f
  JOIN detalle_ventas d ON d.venta_id = f.venta_id
 WHERE NOT EXISTS (
       SELECT 1 FROM detalle_facturas df WHERE df.factura_id = f.id_factura
 );

SELECT COUNT(*) AS facturas,
       (SELECT COUNT(*) FROM detalle_facturas) AS lineas_facturadas
  FROM facturas;
