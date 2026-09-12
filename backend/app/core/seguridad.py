"""Hashing de contrasenas y generacion/verificacion de JSON Web Tokens.

Las contrasenas jamas se guardan en texto plano: se almacena unicamente el
hash bcrypt. Los tokens JWT se firman con la clave secreta definida en .env.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.configuracion import configuracion

# bcrypt solo considera los primeros 72 bytes de la contrasena.
LIMITE_BCRYPT = 72
RONDAS = 12


def generar_hash(password: str) -> str:
    """Convierte una contrasena en un hash bcrypt seguro."""
    semilla = bcrypt.gensalt(rounds=RONDAS)
    return bcrypt.hashpw(password.encode('utf-8')[:LIMITE_BCRYPT], semilla).decode('utf-8')


def verificar_password(password: str, hash_guardado: str) -> bool:
    """Compara la contrasena recibida contra el hash almacenado."""
    try:
        return bcrypt.checkpw(
            password.encode('utf-8')[:LIMITE_BCRYPT],
            hash_guardado.encode('utf-8'),
        )
    except (ValueError, TypeError):
        # Hash con formato invalido o vacio: la verificacion simplemente falla.
        return False


def crear_token(datos: dict) -> str:
    """Firma un JWT con los datos del usuario y una fecha de expiracion."""
    contenido = datos.copy()
    expira = datetime.now(timezone.utc) + timedelta(minutes=configuracion.jwt_expira_minutos)
    contenido.update({'exp': expira, 'iat': datetime.now(timezone.utc)})
    return jwt.encode(contenido, configuracion.jwt_secret, algorithm=configuracion.jwt_algoritmo)


def decodificar_token(token: str) -> dict | None:
    """Verifica firma y expiracion. Devuelve el contenido o None si no es valido."""
    try:
        return jwt.decode(token, configuracion.jwt_secret, algorithms=[configuracion.jwt_algoritmo])
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Recuperacion de contrasena
# ---------------------------------------------------------------------------
def generar_token_recuperacion() -> str:
    """Genera un token aleatorio y dificil de adivinar (256 bits)."""
    return secrets.token_urlsafe(32)


def hash_de_token(token: str) -> str:
    """Huella SHA-256 del token: es lo unico que se guarda en la base de datos.

    Basta un hash rapido porque el token ya es aleatorio y largo; no hace falta
    bcrypt, que esta pensado para contrasenas escogidas por personas.
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def comparar_tokens(a: str, b: str) -> bool:
    """Comparacion en tiempo constante, para no filtrar informacion."""
    return secrets.compare_digest(a, b)
