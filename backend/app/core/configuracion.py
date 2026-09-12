"""Configuracion central del Backend.

Toda la informacion sensible (credenciales de la base de datos, clave secreta
del JWT) se lee desde variables de entorno o desde el archivo .env, nunca se
escribe directamente en el codigo fuente.
"""

from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # --- Aplicacion -------------------------------------------------------
    nombre_app: str = 'API MotosHub'
    entorno: str = 'desarrollo'
    depuracion: bool = True

    # --- Base de datos ----------------------------------------------------
    db_host: str = 'localhost'
    db_port: int = 3306
    db_user: str = 'root'
    db_password: str = ''
    db_name: str = 'bd_jhm_tech_solutions'
    # Si se define DATABASE_URL tiene prioridad sobre los campos anteriores.
    database_url: str | None = None

    # --- Seguridad --------------------------------------------------------
    jwt_secret: str = 'cambia_este_valor_en_tu_archivo_env'
    jwt_algoritmo: str = 'HS256'
    jwt_expira_minutos: int = 480  # 8 horas, igual que el Backend anterior
    # Vigencia del enlace de recuperacion de contrasena
    recuperacion_expira_minutos: int = 30

    # --- CORS -------------------------------------------------------------
    # URL publica del Frontend: se usa para armar el enlace de recuperacion
    url_frontend: str = 'http://localhost:5173'

    origenes_permitidos: list[str] = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

    @property
    def url_base_datos(self) -> str:
        """Cadena de conexion de SQLAlchemy hacia MySQL."""
        if self.database_url:
            return self.database_url
        clave = quote_plus(self.db_password)
        return (
            f'mysql+pymysql://{self.db_user}:{clave}'
            f'@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4'
        )


configuracion = Configuracion()
