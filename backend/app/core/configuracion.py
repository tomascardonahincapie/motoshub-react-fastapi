"""Configuracion central del Backend.

Toda la informacion sensible (credenciales de la base de datos, clave secreta
del JWT, contrasena del correo y API Key del servicio de Inteligencia
Artificial) se lee desde variables de entorno o desde el archivo .env, nunca
se escribe directamente en el codigo fuente ni se sube al repositorio.
"""

import json
from decimal import Decimal
from typing import Annotated
from urllib.parse import quote_plus

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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
    # Es la forma en que Railway y la mayoria de plataformas entregan la base.
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

    # NoDecode evita que pydantic-settings intente leer la variable de entorno
    # como JSON antes de tiempo. Sin el, ORIGENES_PERMITIDOS separado por comas
    # -que es como se escribe comodamente en Railway- tumba el arranque con un
    # error de parseo, sin llegar siquiera al validador de abajo.
    origenes_permitidos: Annotated[list[str], NoDecode] = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

    # --- Servidor de correo (SMTP) ----------------------------------------
    # Si se dejan vacios, el enlace de recuperacion se escribe en la consola
    # en lugar de enviarse por correo.
    smtp_host: str = ''
    smtp_puerto: int = 587
    smtp_usuario: str = ''
    smtp_password: str = ''
    smtp_remitente: str = ''
    smtp_tls: bool = True   # STARTTLS, para el puerto 587
    smtp_ssl: bool = False  # SSL directo, para el puerto 465

    # --- Facturacion ------------------------------------------------------
    # IVA general en Colombia. Se deja configurable porque no todos los
    # articulos de un catalogo tienen por que tributar igual.
    iva_porcentaje: Decimal = Decimal('19')
    negocio_nombre: str = 'MotosHub'
    negocio_nit: str = '901.456.789-1'
    negocio_direccion: str = 'Cra. 45 #12-30'
    negocio_ciudad: str = 'Medellin, Colombia'
    negocio_telefono: str = '+57 300 000 0000'
    negocio_email: str = 'contacto@motoshub.com'

    # --- Inteligencia Artificial (chatbot) --------------------------------
    # Proveedor: 'anthropic', 'openai' o 'ninguno'.
    # 'openai' sirve tambien para cualquier servicio con API compatible
    # (Groq, OpenRouter, DeepSeek, Together...) cambiando IA_URL_BASE.
    ia_proveedor: str = 'ninguno'
    ia_api_key: str = ''
    ia_modelo: str = ''
    ia_url_base: str = ''
    ia_max_tokens: int = 600
    ia_temperatura: float = 0.4
    ia_tiempo_espera: int = 30

    @property
    def url_base_datos(self) -> str:
        """Cadena de conexion de SQLAlchemy hacia MySQL.

        Railway y otras plataformas entregan la base como
        `mysql://usuario:clave@host:puerto/base`, sin indicar el driver.
        SQLAlchemy necesita saber cual usar, asi que se le antepone pymysql en
        lugar de obligar a editar la variable a mano en el panel.
        """
        if self.database_url:
            url = self.database_url.strip()
            if url.startswith('mysql://'):
                url = url.replace('mysql://', 'mysql+pymysql://', 1)
            if url.startswith('mysql+pymysql://') and 'charset=' not in url:
                url += ('&' if '?' in url else '?') + 'charset=utf8mb4'
            return url

        clave = quote_plus(self.db_password)
        return (
            f'mysql+pymysql://{self.db_user}:{clave}'
            f'@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4'
        )

    @property
    def ia_configurada(self) -> bool:
        """Hay IA si se eligio un proveedor valido y hay clave de acceso."""
        return self.ia_proveedor in ('anthropic', 'openai') and bool(self.ia_api_key)

    @property
    def modelo_ia(self) -> str:
        """Modelo a usar; si no se indica, uno economico segun el proveedor."""
        if self.ia_modelo:
            return self.ia_modelo
        return 'claude-haiku-4-5-20251001' if self.ia_proveedor == 'anthropic' else 'gpt-4o-mini'

    @field_validator('smtp_password', 'ia_api_key')
    @classmethod
    def sin_espacios(cls, valor: str) -> str:
        """Google muestra la contrasena de aplicacion en grupos de cuatro.

        Al copiarla se arrastran los espacios y el servidor la rechaza, asi que
        se limpian aqui en lugar de exigir que se peguen a mano sin ellos. Con
        las API Key pasa lo mismo al copiarlas desde el panel del proveedor.
        """
        return valor.replace(' ', '').strip()

    @field_validator('ia_proveedor')
    @classmethod
    def proveedor_conocido(cls, valor: str) -> str:
        limpio = valor.strip().lower()
        return limpio if limpio in ('anthropic', 'openai') else 'ninguno'

    @field_validator('origenes_permitidos', mode='before')
    @classmethod
    def admitir_lista_separada_por_comas(cls, valor):
        """Acepta ORIGENES_PERMITIDOS como JSON o como lista separada por comas.

        En Railway y plataformas similares es mucho mas comodo escribir
        `https://mi-app.up.railway.app,https://otra.com` que el JSON.
        """
        if not isinstance(valor, str):
            return valor

        texto = valor.strip()
        if texto.startswith('['):
            return json.loads(texto)

        # Se admiten comas y saltos de linea como separadores, porque al pegar
        # varias URL en el panel de la plataforma suelen quedar en lineas.
        partes = texto.replace(chr(10), ',').split(',')
        return [parte.strip() for parte in partes if parte.strip()]


configuracion = Configuracion()
