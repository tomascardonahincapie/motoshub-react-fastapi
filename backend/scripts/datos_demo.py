"""Genera ventas, facturas y PQR de demostracion.

Los Dashboards y los reportes del quinto avance no se pueden evidenciar con la
base vacia: un grafico sin datos no demuestra nada. Este script crea un
historial realista repartido en las ultimas semanas.

Lo hace pasando por el mismo codigo que usa la API (crud.ventas y
crud.facturas), asi que los totales, el IVA, los consecutivos y el movimiento
de inventario salen exactamente igual que si las ventas se hubieran registrado
a mano desde la aplicacion.

Uso:
    python scripts/datos_demo.py            # crea los datos
    python scripts/datos_demo.py --limpiar  # borra SOLO lo que creo este script

Solo toca las tablas del quinto avance. Los usuarios, los productos y los
servicios que ya tenias no se modifican, salvo el stock, que se repone al
terminar para que el catalogo siga mostrando disponibilidad.
"""

import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select, text  # noqa: E402

from app.core.base_datos import SesionLocal  # noqa: E402
from app.crud import facturas as crud_facturas  # noqa: E402
from app.crud import ventas as crud_ventas  # noqa: E402
from app.models import (  # noqa: E402
    Conversacion,
    DetalleVenta,
    Factura,
    Mensaje,
    Pqr,
    Producto,
    ROL_CLIENTE,
    Servicio,
    Usuario,
    Venta,
)

DIAS = 34
SEMILLA = 20260916  # misma semilla, mismos datos: el resultado es reproducible

METODOS = ['efectivo', 'efectivo', 'tarjeta', 'tarjeta', 'transferencia', 'credito']

PQR_DEMO = [
    ('reclamo', 'El casco llegó con un rayón en el lateral',
     'Compré un casco la semana pasada y al abrir la caja tenía un rayón en el lateral '
     'derecho. Quisiera saber si es posible cambiarlo por otro en buen estado.',
     'respondida',
     'Lamentamos el inconveniente. Ya dejamos separado un casco nuevo a tu nombre: puedes '
     'pasar por la tienda cuando quieras y lo cambiamos sin costo.'),
    ('peticion', 'Solicito cotización de mantenimiento completo',
     'Tengo una Kawasaki Ninja 400 del 2023 con 12.000 kilómetros y quisiera una cotización '
     'del mantenimiento completo, incluyendo cambio de aceite, filtros y revisión de frenos.',
     'en_proceso', None),
    ('queja', 'Esperé más de una hora para el cambio de aceite',
     'Llegué con cita a las 9 de la mañana para un cambio de aceite y me atendieron pasadas '
     'las 10. Entiendo que puede haber retrasos, pero nadie me avisó mientras esperaba.',
     'respondida',
     'Tienes toda la razón y te pedimos disculpas. Ese día tuvimos dos motos de urgencia y no '
     'gestionamos bien la comunicación. Ya ajustamos la agenda para que no vuelva a pasar.'),
    ('sugerencia', 'Sería útil poder agendar el taller desde la página',
     'Me parece que la página quedó muy completa, pero echo de menos poder elegir el día y la '
     'hora del taller directamente al agendar un servicio, sin tener que llamar.',
     'pendiente', None),
    ('peticion', 'Copia de la factura de mi última compra',
     'Necesito una copia de la factura de la compra que hice el mes pasado para el reembolso '
     'de mi empresa. ¿Me la pueden enviar al correo?',
     'cerrada',
     'Puedes descargarla tú mismo en cualquier momento desde tu panel, en la sección "Mis '
     'facturas", con el botón PDF. También te la enviamos por correo.'),
]


def limpiar(sesion) -> None:
    """Borra todo el modulo comercial. No toca usuarios ni catalogo."""
    for modelo in (Mensaje, Conversacion, Pqr, Factura, DetalleVenta, Venta):
        sesion.execute(delete(modelo))
    sesion.commit()
    print('Ventas, facturas, PQR y conversaciones eliminadas.')


def _armar_carrito(azar, productos, servicios) -> list[dict]:
    """Carrito verosimil: casi siempre accesorios, de vez en cuando una moto."""
    baratos = [p for p in productos if float(p.precio) < 1_000_000 and p.stock > 0]
    motos = [p for p in productos if float(p.precio) >= 10_000_000 and p.stock > 0]

    items = []

    # Una moto en una de cada seis ventas: son las que mueven la facturacion.
    if motos and azar.random() < 0.17:
        items.append({'tipo_item': 'producto', 'id_item': azar.choice(motos).id_producto,
                      'cantidad': 1, 'descuento': 0})

    for _ in range(azar.randint(1, 3)):
        if baratos and azar.random() < 0.72:
            articulo = azar.choice(baratos)
            items.append({'tipo_item': 'producto', 'id_item': articulo.id_producto,
                          'cantidad': azar.randint(1, 2), 'descuento': 0})
        elif servicios:
            items.append({'tipo_item': 'servicio', 'id_item': azar.choice(servicios).id_servicio,
                          'cantidad': 1, 'descuento': 0})

    return items or [{'tipo_item': 'servicio', 'id_item': servicios[0].id_servicio,
                      'cantidad': 1, 'descuento': 0}]


def _momento_del_dia(azar, dia: date) -> datetime:
    """Hora verosimil dentro del horario de atencion."""
    return datetime.combine(dia, datetime.min.time()).replace(
        hour=azar.randint(8, 17), minute=azar.choice([0, 15, 30, 45]),
    )


def _ventas_del_dia(azar, dia: date) -> int:
    """Los sabados se vende mas y los domingos no se abre."""
    if dia.weekday() == 6:
        return 0
    if dia.weekday() == 5:
        return azar.randint(2, 5)
    return azar.randint(0, 3)


def generar(sesion) -> None:
    azar = random.Random(SEMILLA)

    clientes = list(sesion.scalars(
        select(Usuario).where(Usuario.rol_id == ROL_CLIENTE, Usuario.estado == 'activo'),
    ))
    vendedores = list(sesion.scalars(
        select(Usuario).where(Usuario.rol_id.in_([1, 2]), Usuario.estado == 'activo'),
    ))
    productos = list(sesion.scalars(select(Producto).where(Producto.estado == 'activo')))
    servicios = list(sesion.scalars(select(Servicio).where(Servicio.estado == 'activo')))

    if not clientes or not productos or not servicios:
        raise SystemExit(
            'Faltan clientes, productos o servicios activos. Ejecuta primero '
            'database/schema.sql y database/usuarios_demo.sql.',
        )

    # El stock se repone al final: estas ventas son ficticias y no deben dejar
    # el catalogo agotado para la demostracion.
    stock_original = {p.id_producto: p.stock for p in productos}

    hoy = date.today()
    creadas = 0

    for atras in range(DIAS, -1, -1):
        dia = hoy - timedelta(days=atras)

        # Reposicion semanal: sin ella, los articulos con pocas unidades se
        # agotarian a mitad del historial y el resto de las ventas se caerian.
        if dia.weekday() == 0:
            for producto in productos:
                producto.stock = stock_original[producto.id_producto]
            sesion.commit()

        # El dia de hoy siempre lleva ventas: es el que sale por defecto en el
        # reporte diario y en la tarjeta "Ventas de hoy" del Dashboard.
        cuantas = _ventas_del_dia(azar, dia)
        if atras == 0:
            cuantas = max(cuantas, azar.randint(2, 4))

        for _ in range(cuantas):
            # Comprar desde el sitio no deja vendedor; vender en tienda, si.
            en_tienda = azar.random() < 0.55
            datos = {
                'items': _armar_carrito(azar, productos, servicios),
                'metodo_pago': azar.choice(METODOS),
                'observaciones': azar.choice(
                    [None, None, 'Entrega en tienda', 'Cliente frecuente', 'Incluye instalación'],
                ),
            }

            try:
                venta = crud_ventas.crear(
                    sesion, datos, azar.choice(clientes),
                    azar.choice(vendedores) if en_tienda and vendedores else None,
                )
            except Exception as error:  # noqa: BLE001 - sin stock: se salta y sigue
                sesion.rollback()
                print(f'  (venta omitida: {error})')
                continue

            # La fecha la pone la base de datos, asi que se reescribe para
            # repartir el historial en el tiempo.
            venta.fecha_venta = _momento_del_dia(azar, dia)
            sesion.commit()

            crud_facturas.emitir(sesion, venta)
            venta.factura.fecha_emision = venta.fecha_venta
            sesion.commit()

            # Una de cada veinte se anula: el reporte debe saber distinguirlas.
            if azar.random() < 0.05:
                crud_ventas.cambiar_estado(sesion, venta, 'anulada')

            creadas += 1

    for producto in productos:
        producto.stock = stock_original[producto.id_producto]
    sesion.commit()
    print(f'{creadas} ventas con su factura, repartidas en {DIAS + 1} días.')
    print('Inventario repuesto a los valores que tenía antes.')

    # --- PQR -------------------------------------------------------------
    for indice, (tipo, asunto, descripcion, estado, respuesta) in enumerate(PQR_DEMO):
        registro = crud_pqr_crear(sesion, clientes[indice % len(clientes)], tipo, asunto, descripcion)
        registro.estado = estado
        registro.fecha_registro = _momento_del_dia(azar, hoy - timedelta(days=indice * 3 + 1))

        if respuesta:
            registro.respuesta = respuesta
            registro.fecha_respuesta = registro.fecha_registro + timedelta(hours=azar.randint(3, 30))
            registro.atendido_por = vendedores[0].id_usuario if vendedores else None

        sesion.commit()

    print(f'{len(PQR_DEMO)} PQR radicadas en distintos estados.')


def crud_pqr_crear(sesion, cliente, tipo, asunto, descripcion):
    """Atajo al CRUD de PQR, con los mismos radicados que usa la API."""
    from app.crud import pqr as crud_pqr

    return crud_pqr.crear(
        sesion, {'tipo': tipo, 'asunto': asunto, 'descripcion': descripcion}, cliente,
    )


def main() -> None:
    sesion = SesionLocal()
    try:
        sesion.execute(text('SELECT 1'))
    except Exception as error:  # noqa: BLE001
        raise SystemExit(f'No se pudo conectar con la base de datos: {error}') from error

    try:
        if '--limpiar' in sys.argv:
            limpiar(sesion)
            return

        existentes = sesion.scalar(select(Venta.id_venta).limit(1))
        if existentes is not None and '--forzar' not in sys.argv:
            print('Ya hay ventas registradas. El script no las duplica.')
            print('Usa --forzar para añadir más, o --limpiar para empezar de cero.')
            return

        generar(sesion)
        print('\nListo. Abre el panel de administración para ver los Dashboards.')
    finally:
        sesion.close()


if __name__ == '__main__':
    main()
