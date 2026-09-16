"""Chatbot de atencion al cliente, integrado con un servicio de IA.

Atiende tambien a visitantes sin cuenta, porque la mayoria de las preguntas
llegan antes de registrarse. Si el visitante ha iniciado sesion, la charla
queda asociada a su usuario y el asistente lo saluda por su nombre.

El endpoint de mensajes es publico, asi que lleva un limite por direccion IP:
sin el, cualquiera podria dejar seco el saldo de la API Key con un bucle.
"""

import time
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Path, Request

from app.crud import chat as crud_chat
from app.crud import productos as crud_productos
from app.crud import servicios as crud_servicios
from app.dependencias import Sesion, UsuarioOpcional, alcance_de_cliente
from app.errores import ConflictoDeNegocio, RecursoNoEncontrado, SinPermisos
from app.schemas.chat import (
    EstadoChatbot,
    MensajeEnviar,
    RespuestaChat,
    RespuestaConversacion,
)
from app.schemas.comunes import DetalleDeError
from app.servicios import ia as servicio_ia

router = APIRouter(
    prefix='/api/chatbot',
    tags=['Chatbot'],
    responses={404: {'model': DetalleDeError}},
)

# --- Limite de uso por IP ---------------------------------------------------
VENTANA_SEGUNDOS = 600
MAXIMO_POR_VENTANA = 25
_peticiones: dict[str, list[float]] = defaultdict(list)


def _comprobar_limite(peticion: Request) -> None:
    """Deja pasar como maximo 25 mensajes cada 10 minutos por direccion IP."""
    origen = peticion.client.host if peticion.client else 'desconocido'
    ahora = time.monotonic()

    recientes = [t for t in _peticiones[origen] if ahora - t < VENTANA_SEGUNDOS]
    if len(recientes) >= MAXIMO_POR_VENTANA:
        _peticiones[origen] = recientes
        raise ConflictoDeNegocio(
            'Has enviado muchos mensajes seguidos. Espera unos minutos o '
            'escríbenos por WhatsApp.',
        )

    recientes.append(ahora)
    _peticiones[origen] = recientes


@router.get(
    '/estado',
    response_model=EstadoChatbot,
    summary='Estado de la integración con IA',
    description=(
        'Indica si el chatbot está respondiendo con Inteligencia Artificial y '
        'con qué modelo. Nunca devuelve la API Key, solo si está configurada.'
    ),
)
def estado_del_chatbot():
    return {'ok': True, **servicio_ia.estado()}


@router.post(
    '/mensaje',
    response_model=RespuestaChat,
    summary='Conversar con el chatbot',
    description=(
        'Envía un mensaje y devuelve la respuesta del asistente. No requiere '
        'iniciar sesión: los visitantes también pueden preguntar. Si se envía '
        'el token, la conversación queda asociada al usuario.'
    ),
)
def enviar_mensaje(
    datos: MensajeEnviar,
    peticion: Request,
    sesion: Sesion,
    usuario: UsuarioOpcional,
):
    _comprobar_limite(peticion)

    # --- Conversacion: se crea en el primer mensaje -----------------------
    if datos.conversacion_id is None:
        conversacion = crud_chat.crear_conversacion(sesion, usuario, datos.mensaje)
    else:
        conversacion = crud_chat.obtener_conversacion(sesion, datos.conversacion_id)
        if conversacion is None:
            raise RecursoNoEncontrado('Conversación')
        # Nadie puede continuar la charla de otra persona.
        if conversacion.usuario_id is not None and (
            usuario is None or conversacion.usuario_id != usuario.id_usuario
        ):
            raise SinPermisos('Esta conversación pertenece a otro usuario')

    historial = crud_chat.historial_para_ia(conversacion)
    crud_chat.guardar_mensaje(sesion, conversacion, 'usuario', datos.mensaje)

    # El catalogo se lee en cada mensaje: el chatbot responde con los precios
    # y las existencias que hay en la base de datos en este momento.
    productos = crud_productos.listar(sesion)
    servicios = crud_servicios.listar(sesion)

    texto, origen, con_ia = servicio_ia.conversar(
        datos.mensaje,
        historial,
        productos,
        servicios,
        usuario.nombres if usuario else None,
    )
    crud_chat.guardar_mensaje(sesion, conversacion, 'asistente', texto, origen)

    return {
        'ok': True,
        'conversacion_id': conversacion.id_conversacion,
        'respuesta': texto,
        'origen': origen,
        'con_ia': con_ia,
        'sugerencias': servicio_ia.sugerencias_para(datos.mensaje),
    }


@router.get(
    '/conversaciones/{id_conversacion}',
    response_model=RespuestaConversacion,
    summary='Consultar una conversación',
    description='Accesible para su dueño y para Administrador o Empleado.',
)
def obtener_conversacion(
    id_conversacion: Annotated[int, Path(ge=1)],
    sesion: Sesion,
    usuario: UsuarioOpcional,
):
    conversacion = crud_chat.obtener_conversacion(sesion, id_conversacion)
    if conversacion is None:
        raise RecursoNoEncontrado('Conversación')

    # Las charlas anonimas no se pueden recuperar por la API: sus
    # identificadores son consecutivos y cualquiera podria ir probandolos.
    es_propia = usuario is not None and conversacion.usuario_id == usuario.id_usuario
    es_del_equipo = usuario is not None and alcance_de_cliente(usuario) is None

    if not (es_propia or es_del_equipo):
        raise SinPermisos('No tienes permiso para consultar esta conversación')

    return {
        'ok': True,
        'conversacion_id': conversacion.id_conversacion,
        'mensajes': conversacion.mensajes,
    }
