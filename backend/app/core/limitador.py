"""Limite de peticiones para los endpoints publicos.

Los endpoints que no exigen sesion pueden llamarse tantas veces como quiera
quien sea. En la recuperacion de contrasena eso se traduce en llenar el buzon
de cualquier persona registrada, y en el chatbot en gastar el saldo de la API
Key. Este modulo pone un tope por clave (una direccion IP, un correo...).

Es un contador en memoria: se reinicia al reiniciar el servidor y no se
comparte entre varias instancias. Para un proyecto de este tamano sobra; en
una aplicacion con varias replicas esto viviria en Redis.
"""

import time
from collections import defaultdict

# clave -> instantes (time.monotonic) de las peticiones recientes
_peticiones: dict[str, list[float]] = defaultdict(list)

# Evita que el diccionario crezca sin fin con claves que ya no se usan.
LIMPIEZA_CADA = 500
_desde_la_ultima_limpieza = 0


def _limpiar(ahora: float, ventana: int) -> None:
    global _desde_la_ultima_limpieza
    _desde_la_ultima_limpieza += 1
    if _desde_la_ultima_limpieza < LIMPIEZA_CADA:
        return

    _desde_la_ultima_limpieza = 0
    for clave in list(_peticiones):
        vigentes = [t for t in _peticiones[clave] if ahora - t < ventana]
        if vigentes:
            _peticiones[clave] = vigentes
        else:
            del _peticiones[clave]


def permitir(clave: str, maximo: int, ventana_segundos: int) -> bool:
    """Registra un intento y dice si cabe dentro del limite.

    Devuelve False cuando la clave ya gasto sus `maximo` intentos en los
    ultimos `ventana_segundos`. En ese caso el intento NO se cuenta, para que
    insistir no alargue el castigo indefinidamente.
    """
    ahora = time.monotonic()
    _limpiar(ahora, ventana_segundos)

    recientes = [t for t in _peticiones[clave] if ahora - t < ventana_segundos]

    if len(recientes) >= maximo:
        _peticiones[clave] = recientes
        return False

    recientes.append(ahora)
    _peticiones[clave] = recientes
    return True


def reiniciar() -> None:
    """Vacia los contadores. Lo usan las pruebas automaticas."""
    _peticiones.clear()
