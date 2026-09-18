"""Modelos ORM de las facturas de venta y de su detalle.

Cada factura nace de una venta registrada y guarda una copia de los datos del
cliente tal como estaban al emitirla. Una factura es un documento: no cambia
porque el cliente actualice despues su direccion o su telefono.

Por eso la factura tiene su propio detalle en lugar de leer el de la venta:
si manana se corrige una linea de la venta, la factura ya emitida debe seguir
diciendo exactamente lo que se cobro.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

EstadoFacturaSQL = Enum('emitida', 'pagada', 'anulada', name='estado_factura_enum')

ESTADOS_FACTURA = ('emitida', 'pagada', 'anulada')


class Factura(Base):
    __tablename__ = 'facturas'

    id_factura: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Consecutivo legible de la factura: FV-2026-000001
    numero_factura: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)

    venta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('ventas.id_venta', ondelete='CASCADE'), nullable=False, unique=True,
    )
    cliente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='RESTRICT'), nullable=False, index=True,
    )

    # Copia de los datos del cliente en el momento de la emision.
    cliente_nombre: Mapped[str] = mapped_column(String(101), nullable=False)
    cliente_documento: Mapped[str] = mapped_column(String(15), nullable=False)
    cliente_email: Mapped[str] = mapped_column(String(100), nullable=False)
    cliente_telefono: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cliente_direccion: Mapped[str | None] = mapped_column(String(100), nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    impuestos: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    porcentaje_iva: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)

    estado: Mapped[str] = mapped_column(
        EstadoFacturaSQL, nullable=False, default='emitida', server_default='emitida', index=True,
    )
    observaciones: Mapped[str | None] = mapped_column(String(255), nullable=True)

    fecha_emision: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True,
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    venta: Mapped['Venta'] = relationship(back_populates='factura', lazy='joined')  # noqa: F821
    detalles: Mapped[list['DetalleFactura']] = relationship(
        back_populates='factura',
        cascade='all, delete-orphan',
        lazy='selectin',
        order_by='DetalleFactura.id_detalle_factura',
    )


class DetalleFactura(Base):
    """Una linea de la factura, congelada en el momento de emitirla."""

    __tablename__ = 'detalle_facturas'

    id_detalle_factura: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('facturas.id_factura', ondelete='CASCADE'),
        nullable=False, index=True,
    )

    tipo_item: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre_item: Mapped[str] = mapped_column(String(100), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    factura: Mapped[Factura] = relationship(back_populates='detalles')
