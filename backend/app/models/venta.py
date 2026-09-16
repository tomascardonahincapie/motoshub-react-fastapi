"""Modelos ORM de las ventas y su detalle.

Una venta agrupa los productos y servicios que un cliente adquirio en una
misma operacion. El detalle guarda una linea por cada elemento comercializado.

El detalle conserva una copia del nombre y del precio del articulo en el
momento de la venta: si mas adelante el producto cambia de precio o se elimina
del catalogo, el historico y las facturas ya emitidas siguen siendo correctos.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

EstadoVentaSQL = Enum('pendiente', 'pagada', 'anulada', name='estado_venta_enum')
MetodoPagoSQL = Enum('efectivo', 'tarjeta', 'transferencia', 'credito', name='metodo_pago_enum')
TipoItemSQL = Enum('producto', 'servicio', name='tipo_item_enum')

ESTADOS_VENTA = ('pendiente', 'pagada', 'anulada')
METODOS_PAGO = ('efectivo', 'tarjeta', 'transferencia', 'credito')


class Venta(Base):
    __tablename__ = 'ventas'

    id_venta: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Consecutivo legible que se muestra al cliente: V-2026-000001
    numero_venta: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)

    cliente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='RESTRICT'), nullable=False, index=True,
    )
    # Queda vacio cuando el propio cliente compra desde el sitio web.
    usuario_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='SET NULL'), nullable=True,
    )

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    impuestos: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    estado: Mapped[str] = mapped_column(
        EstadoVentaSQL, nullable=False, default='pendiente', server_default='pendiente', index=True,
    )
    metodo_pago: Mapped[str] = mapped_column(
        MetodoPagoSQL, nullable=False, default='efectivo', server_default='efectivo',
    )
    observaciones: Mapped[str | None] = mapped_column(String(255), nullable=True)

    fecha_venta: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True,
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    detalles: Mapped[list['DetalleVenta']] = relationship(
        back_populates='venta',
        cascade='all, delete-orphan',
        lazy='selectin',
        order_by='DetalleVenta.id_detalle',
    )
    cliente: Mapped['Usuario'] = relationship(foreign_keys=[cliente_id], lazy='joined')  # noqa: F821
    vendedor: Mapped['Usuario | None'] = relationship(foreign_keys=[usuario_id], lazy='joined')  # noqa: F821
    factura: Mapped['Factura | None'] = relationship(  # noqa: F821
        back_populates='venta', uselist=False, lazy='selectin',
    )

    @property
    def cantidad_items(self) -> int:
        return sum(detalle.cantidad for detalle in self.detalles)

    @property
    def cliente_nombre(self) -> str:
        if not self.cliente:
            return ''
        return f'{self.cliente.nombres} {self.cliente.apellidos}'.strip()

    @property
    def vendedor_nombre(self) -> str | None:
        if not self.vendedor:
            return None
        return f'{self.vendedor.nombres} {self.vendedor.apellidos}'.strip()

    @property
    def numero_factura(self) -> str | None:
        return self.factura.numero_factura if self.factura else None

    @property
    def id_factura(self) -> int | None:
        return self.factura.id_factura if self.factura else None


class DetalleVenta(Base):
    __tablename__ = 'detalle_ventas'

    id_detalle: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('ventas.id_venta', ondelete='CASCADE'), nullable=False, index=True,
    )

    tipo_item: Mapped[str] = mapped_column(TipoItemSQL, nullable=False)
    # Solo uno de los dos se usa, segun el tipo. Si el articulo se borra del
    # catalogo la referencia queda en NULL pero la linea conserva su nombre.
    producto_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey('productos.id_producto', ondelete='SET NULL'), nullable=True,
    )
    servicio_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey('servicios.id_servicio', ondelete='SET NULL'), nullable=True,
    )

    nombre_item: Mapped[str] = mapped_column(String(100), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    venta: Mapped[Venta] = relationship(back_populates='detalles')
