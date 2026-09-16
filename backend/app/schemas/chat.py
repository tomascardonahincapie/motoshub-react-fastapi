"""Esquemas Pydantic del chatbot."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MensajeEnviar(BaseModel):
    """POST /api/chatbot/mensaje."""

    mensaje: str = Field(min_length=1, max_length=1000)
    # Se omite en el primer mensaje: el Backend crea la conversacion y
    # devuelve su identificador para los mensajes siguientes.
    conversacion_id: int | None = Field(default=None, ge=1)

    @field_validator('mensaje')
    @classmethod
    def limpiar(cls, valor: str) -> str:
        limpio = valor.strip()
        if not limpio:
            raise ValueError('El mensaje no puede estar vacío')
        return limpio

    model_config = ConfigDict(json_schema_extra={'examples': [
        {'mensaje': '¿Qué motos tienen disponibles por menos de 20 millones?'},
    ]})


class MensajeRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_mensaje: int
    rol: str
    contenido: str
    origen: str | None = None
    fecha_envio: datetime


class RespuestaChat(BaseModel):
    ok: bool = True
    conversacion_id: int
    respuesta: str
    origen: str = Field(description='Modelo de IA que respondio, o "reglas" si no hay API Key.')
    con_ia: bool = Field(description='Indica si la respuesta vino del servicio de IA.')
    # Atajos que el Frontend pinta como botones debajo de la respuesta.
    sugerencias: list[str] = []


class RespuestaConversacion(BaseModel):
    ok: bool = True
    conversacion_id: int
    mensajes: list[MensajeRespuesta]


class EstadoChatbot(BaseModel):
    """GET /api/chatbot/estado: sirve para evidenciar la integracion con IA."""

    ok: bool = True
    ia_activa: bool
    proveedor: str
    modelo: str
    # Nunca se devuelve la clave, solo si esta configurada.
    api_key_configurada: bool
    mensaje: str
