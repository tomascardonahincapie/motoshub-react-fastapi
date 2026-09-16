"""Numeros consecutivos legibles para ventas, facturas y PQR.

Se busca el mayor numero emitido en el ano en curso y se suma uno, de modo que
la numeracion arranca de nuevo cada ano: V-2026-000001, V-2027-000001...

La columna tiene restriccion UNIQUE, asi que si dos peticiones simultaneas
piden el mismo numero la segunda falla en el INSERT. Por eso quien registra la
venta reintenta un par de veces en lugar de confiar en que el numero calculado
siga libre.
"""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

ANCHO = 6


def siguiente_numero(sesion: Session, columna: InstrumentedAttribute, prefijo: str) -> str:
    """Devuelve el siguiente consecutivo del ano, por ejemplo V-2026-000007."""
    ano = datetime.now().year
    raiz = f'{prefijo}-{ano}-'

    ultimo = sesion.scalar(
        select(func.max(columna)).where(columna.like(f'{raiz}%')),
    )

    if ultimo:
        try:
            consecutivo = int(str(ultimo).rsplit('-', 1)[1]) + 1
        except (IndexError, ValueError):
            # Un numero con formato raro no debe bloquear la venta.
            consecutivo = 1
    else:
        consecutivo = 1

    return f'{raiz}{consecutivo:0{ANCHO}d}'
