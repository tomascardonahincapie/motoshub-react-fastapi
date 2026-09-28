-- =========================================================
-- Pedidos enviados por WhatsApp
--
-- Agrega el estado 'solicitada' a la tabla de ventas. Es el pedido que el
-- cliente arma en el sitio y esta a punto de enviar por WhatsApp: queda
-- registrado en el panel para que el personal lo confirme como venta o lo
-- descarte, pero no descuenta inventario ni cuenta en los informes.
--
-- Va primero en el orden del ENUM porque es el estado inicial del ciclo:
-- solicitada -> pendiente / pagada -> anulada.
--
-- Ejecutar sobre una base que ya tenga el esquema del quinto avance:
--   mysql -u root -p bd_jhm_tech_solutions < database/pedidos_whatsapp.sql
-- o con el cargador del proyecto:
--   python scripts/cargar_esquema.py database/pedidos_whatsapp.sql
-- =========================================================

ALTER TABLE ventas
  MODIFY COLUMN estado ENUM('solicitada', 'pendiente', 'pagada', 'anulada')
  NOT NULL DEFAULT 'pendiente';
