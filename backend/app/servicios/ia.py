"""Integracion del chatbot con un servicio de Inteligencia Artificial.

Admite dos proveedores:

* ``anthropic``: API de Claude (``/v1/messages``).
* ``openai``: API de OpenAI y cualquier otra compatible con
  ``/chat/completions`` (Groq, OpenRouter, DeepSeek, Together...), cambiando
  ``IA_URL_BASE``.

La clave de acceso se lee siempre de la variable de entorno ``IA_API_KEY``:
no aparece en el codigo, no se registra en el log y no se devuelve por la API.

Si no hay clave configurada, o si el proveedor falla, el chatbot responde con
un motor de reglas que consulta la misma base de datos. Asi el sitio nunca se
queda sin atencion: cambia la calidad de la redaccion, no el servicio.
"""

import logging
import re
import unicodedata

import httpx

from app.core.configuracion import configuracion

logger = logging.getLogger('motoshub.ia')

URL_ANTHROPIC = 'https://api.anthropic.com/v1/messages'
URL_OPENAI = 'https://api.openai.com/v1'
VERSION_ANTHROPIC = '2023-06-01'

# Cuantos mensajes anteriores se le reenvian al modelo como memoria de la
# charla. Suficiente para mantener el hilo sin disparar el costo por peticion.
MEMORIA = 12

ORIGEN_REGLAS = 'reglas'


class ErrorDeIA(Exception):
    """El proveedor no respondio o devolvio algo que no se pudo interpretar."""


def _sin_tildes(texto: str) -> str:
    """Normaliza el texto para comparar palabras clave sin depender de tildes."""
    descompuesto = unicodedata.normalize('NFD', texto.lower())
    return ''.join(c for c in descompuesto if unicodedata.category(c) != 'Mn')


def _pesos(valor) -> str:
    return f'$ {int(valor):,}'.replace(',', '.')


# ---------------------------------------------------------------------------
# Contexto: lo que el chatbot sabe del negocio
# ---------------------------------------------------------------------------
INSTRUCCIONES = """Eres el asistente virtual de {negocio}, una tienda y taller de motos en {ciudad}.

Tu trabajo es atender a los clientes del sitio web: resolver preguntas frecuentes,
orientar sobre los productos y servicios del catálogo, explicar cómo comprar y
recibir o encauzar peticiones, quejas y reclamos (PQR).

Reglas que debes respetar siempre:
- Responde en español, con trato cercano y de usted, en un máximo de 120 palabras.
- Usa ÚNICAMENTE la información del catálogo que aparece más abajo. Si te preguntan
  por algo que no está, dilo con claridad y ofrece lo más parecido que sí exista.
- Nunca inventes precios, plazos de entrega, garantías ni disponibilidad.
- Los precios están en pesos colombianos.
- Si el cliente quiere comprar, explícale que puede añadir el artículo al carrito
  desde el catálogo y confirmar la compra, o escribir por WhatsApp.
- Si el cliente expresa una queja, un reclamo o una petición formal, reconoce el
  problema, discúlpate si corresponde e indícale que puede radicar su PQR desde su
  panel de cliente, en la sección PQR, donde recibirá un número de radicado.
- No pidas datos personales, contraseñas ni información de pago.
- Si no sabes algo, dilo y sugiere escribir por WhatsApp o usar el formulario de contacto.

Datos de contacto: {telefono} · {email} · {direccion}
Horario: {horario}

{catalogo}"""

HORARIO = 'lunes a viernes de 8:00 a 18:00 y sábados de 9:00 a 14:00'


def describir_catalogo(productos: list, servicios: list) -> str:
    """Vuelca el catalogo real en texto para entregarselo al modelo.

    Es lo que evita que el chatbot se invente motos: solo puede hablar de lo
    que aparece en esta lista, que sale de la base de datos en cada consulta.
    """
    lineas = ['CATÁLOGO ACTUAL (tomado de la base de datos en este momento)', '', 'PRODUCTOS:']

    if productos:
        for p in productos:
            existencias = (
                f'{p.stock} disponibles' if p.stock > 0 else 'agotado por ahora'
            )
            categoria = f' [{p.categoria}]' if p.categoria else ''
            lineas.append(f'- {p.nombre}{categoria}: {_pesos(p.precio)} ({existencias})')
    else:
        lineas.append('- (sin productos publicados)')

    lineas += ['', 'SERVICIOS DEL TALLER:']
    if servicios:
        for s in servicios:
            duracion = f', dura unos {s.duracion_minutos} minutos' if s.duracion_minutos else ''
            lineas.append(f'- {s.nombre}: {_pesos(s.precio)}{duracion}')
    else:
        lineas.append('- (sin servicios publicados)')

    return '\n'.join(lineas)


def construir_instrucciones(productos: list, servicios: list) -> str:
    return INSTRUCCIONES.format(
        negocio=configuracion.negocio_nombre,
        ciudad=configuracion.negocio_ciudad,
        telefono=configuracion.negocio_telefono,
        email=configuracion.negocio_email,
        direccion=configuracion.negocio_direccion,
        horario=HORARIO,
        catalogo=describir_catalogo(productos, servicios),
    )


# ---------------------------------------------------------------------------
# Llamada al proveedor de IA
# ---------------------------------------------------------------------------
def _llamar_anthropic(instrucciones: str, mensajes: list[dict]) -> str:
    respuesta = httpx.post(
        URL_ANTHROPIC,
        headers={
            'x-api-key': configuracion.ia_api_key,
            'anthropic-version': VERSION_ANTHROPIC,
            'content-type': 'application/json',
        },
        json={
            'model': configuracion.modelo_ia,
            'max_tokens': configuracion.ia_max_tokens,
            'temperature': configuracion.ia_temperatura,
            'system': instrucciones,
            'messages': mensajes,
        },
        timeout=configuracion.ia_tiempo_espera,
    )
    respuesta.raise_for_status()
    bloques = respuesta.json().get('content', [])
    texto = ''.join(b.get('text', '') for b in bloques if b.get('type') == 'text').strip()

    if not texto:
        raise ErrorDeIA('El modelo respondió sin texto')
    return texto


def _llamar_openai(instrucciones: str, mensajes: list[dict]) -> str:
    base = (configuracion.ia_url_base or URL_OPENAI).rstrip('/')
    respuesta = httpx.post(
        f'{base}/chat/completions',
        headers={
            'Authorization': f'Bearer {configuracion.ia_api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': configuracion.modelo_ia,
            'max_tokens': configuracion.ia_max_tokens,
            'temperature': configuracion.ia_temperatura,
            'messages': [{'role': 'system', 'content': instrucciones}, *mensajes],
        },
        timeout=configuracion.ia_tiempo_espera,
    )
    respuesta.raise_for_status()
    opciones = respuesta.json().get('choices', [])

    if not opciones:
        raise ErrorDeIA('El modelo respondió sin opciones')
    return (opciones[0].get('message', {}).get('content') or '').strip()


def responder_con_ia(instrucciones: str, mensajes: list[dict]) -> tuple[str, str]:
    """Pregunta al proveedor configurado. Devuelve (respuesta, modelo usado)."""
    recortados = mensajes[-MEMORIA:]

    if configuracion.ia_proveedor == 'anthropic':
        return _llamar_anthropic(instrucciones, recortados), configuracion.modelo_ia
    return _llamar_openai(instrucciones, recortados), configuracion.modelo_ia


# ---------------------------------------------------------------------------
# Motor de reglas: la red de seguridad cuando no hay IA disponible
# ---------------------------------------------------------------------------
INTENCIONES = (
    ('saludo', ('hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal')),
    ('pqr', ('queja', 'reclamo', 'pqr', 'peticion', 'inconforme', 'garantia',
             'devolucion', 'devolver', 'reclamar', 'mal estado', 'defectuoso')),
    ('compra', ('comprar', 'compra', 'pedido', 'carrito', 'pagar', 'pago',
                'adquirir', 'separar', 'financiacion', 'credito', 'cuotas')),
    ('factura', ('factura', 'facturar', 'recibo', 'comprobante')),
    ('servicios', ('servicio', 'taller', 'mantenimiento', 'revision', 'reparacion',
                   'cambio de aceite', 'sincronizacion', 'frenos', 'llantas')),
    ('no_disponible', ('casco', 'cascos', 'guante', 'guantes', 'chaqueta', 'maleta',
                       'accesorio', 'accesorios', 'repuesto', 'repuestos', 'aceite',
                       'bateria', 'pastillas de freno', 'cadena')),
    ('productos', ('moto', 'motos', 'motocicleta', 'producto', 'catalogo', 'precio',
                   'precios', 'cuanto cuesta', 'vale', 'disponible', 'naked',
                   'deportiva', 'deportivas', 'scrambler', 'clasica', 'retro',
                   'adventure', 'trocha', 'aventura', 'todoterreno', 'urbana',
                   'ciudad', 'economica', 'barata', 'primera moto', 'carenada')),
    ('contacto', ('horario', 'abren', 'cierran', 'direccion', 'ubicacion', 'donde quedan',
                  'telefono', 'contacto', 'whatsapp', 'correo')),
    ('despedida', ('gracias', 'muchas gracias', 'chao', 'adios', 'hasta luego')),
)


def detectar_intencion(mensaje: str) -> str:
    plano = _sin_tildes(mensaje)
    for nombre, palabras in INTENCIONES:
        if any(palabra in plano for palabra in palabras):
            return nombre
    return 'otro'


def _extraer_presupuesto(mensaje: str) -> int | None:
    """Entiende "menos de 20 millones" o "hasta 500000" para filtrar el catalogo."""
    plano = _sin_tildes(mensaje).replace('.', '').replace(',', '')

    millones = re.search(r'(\d+(?:\.\d+)?)\s*millon', plano)
    if millones:
        return int(float(millones.group(1)) * 1_000_000)

    cifra = re.search(r'\b(\d{5,12})\b', plano)
    return int(cifra.group(1)) if cifra else None


# Tipos de moto y las palabras con las que el cliente los nombra. Se busca
# tanto en la categoria como en el nombre del modelo.
FAMILIAS = (
    ('deportiva', ('deportiva', 'deportivas', 'pista', 'carenada', 'ninja', 'gixxer')),
    ('adventure', ('adventure', 'trocha', 'todoterreno', 'aventura', 'doble proposito')),
    ('clasica', ('clasica', 'clasicas', 'retro', 'vintage', 'scrambler', 'cafe racer')),
    ('urbana', ('urbana', 'urbanas', 'ciudad', 'economica', 'barata', 'primera moto')),
    ('naked', ('naked', 'sin carenado')),
)


def _filtrar_por_familia(mensaje: str, productos: list) -> list:
    """Se queda con los productos de la familia por la que preguntan.

    Sin esto, a la pregunta "que motos tienen" el chatbot contestaria con los
    primeros seis articulos del catalogo, que suelen ser accesorios. La familia
    se busca tanto en la categoria como en el nombre del producto.
    """
    plano = _sin_tildes(mensaje)

    for familia, palabras in FAMILIAS:
        if not any(palabra in plano for palabra in palabras):
            continue

        coincidencias = [
            p for p in productos
            if familia in _sin_tildes(f'{p.categoria or ""} {p.nombre}')
        ]
        if coincidencias:
            return coincidencias

    return productos


def responder_con_reglas(mensaje: str, productos: list, servicios: list, nombre: str | None) -> str:
    """Respuesta redactada a partir de la base de datos, sin llamar a ninguna IA."""
    intencion = detectar_intencion(mensaje)
    saludo = f'Hola {nombre}' if nombre else 'Hola'
    disponibles = [p for p in productos if p.stock > 0]

    if intencion == 'saludo':
        return (
            f'{saludo}, bienvenido a {configuracion.negocio_nombre}. Puedo contarte sobre '
            f'nuestras motos y accesorios ({len(productos)} en catálogo), los '
            f'{len(servicios)} servicios del taller, cómo comprar o cómo radicar una PQR. '
            '¿Qué necesitas?'
        )

    if intencion == 'pqr':
        return (
            'Lamento el inconveniente. Puedes radicar tu PQR desde tu panel de cliente, '
            'en la sección "PQR": eliges si es petición, queja, reclamo o sugerencia, '
            'describes lo ocurrido y el sistema te entrega un número de radicado para '
            'hacerle seguimiento. Nuestro equipo la revisa y te responde por ese mismo canal.'
        )

    if intencion == 'compra':
        return (
            'Comprar es sencillo: entra al catálogo, pulsa "Comprar" en el artículo que te '
            'interese y se añade al carrito. Desde el carrito confirmas la compra, eliges la '
            'forma de pago y el sistema registra la venta y emite tu factura, que puedes '
            f'descargar en PDF desde tu panel. Si prefieres, escríbenos al {configuracion.negocio_telefono}.'
        )

    if intencion == 'factura':
        return (
            'Cada compra genera su factura automáticamente. La encuentras en tu panel de '
            'cliente, en la sección "Mis facturas", y puedes descargarla en PDF con el '
            'detalle de los artículos, el IVA y el total.'
        )

    if intencion == 'no_disponible':
        return (
            'No vendemos accesorios ni repuestos sueltos: en MotosHub encuentras '
            'motocicletas y los servicios del taller. Si necesitas un repuesto '
            'instalado, lo incluimos dentro del servicio correspondiente. '
            '¿Quieres que te cuente qué motos tenemos o qué hace el taller?'
        )

    if intencion == 'servicios' and servicios:
        lista = '\n'.join(
            f'• {s.nombre}: {_pesos(s.precio)}' for s in servicios[:6]
        )
        return f'Estos son los servicios del taller:\n{lista}\n\n¿Te agendo alguno?'

    if intencion == 'productos' and productos:
        presupuesto = _extraer_presupuesto(mensaje)
        candidatos = _filtrar_por_familia(mensaje, disponibles or productos)

        if presupuesto:
            dentro = [p for p in candidatos if int(p.precio) <= presupuesto]
            if not dentro:
                economico = min(candidatos, key=lambda p: p.precio)
                return (
                    f'Por debajo de {_pesos(presupuesto)} no tengo nada en catálogo. '
                    f'Lo más económico es {economico.nombre}, a {_pesos(economico.precio)}.'
                )
            candidatos = sorted(dentro, key=lambda p: p.precio, reverse=True)
        else:
            # Sin presupuesto se muestra primero lo de mayor valor: es lo que
            # el cliente suele estar buscando cuando pregunta por una familia.
            candidatos = sorted(candidatos, key=lambda p: p.precio, reverse=True)

        lista = '\n'.join(
            f'• {p.nombre}: {_pesos(p.precio)}' for p in candidatos[:6]
        )
        encabezado = (
            f'Esto es lo que tenemos hasta {_pesos(presupuesto)}:'
            if presupuesto else 'Esto es parte de nuestro catálogo:'
        )
        return f'{encabezado}\n{lista}\n\n¿Quieres el detalle de alguno?'

    if intencion == 'contacto':
        return (
            f'Atendemos de {HORARIO}. Estamos en {configuracion.negocio_direccion}, '
            f'{configuracion.negocio_ciudad}. Teléfono {configuracion.negocio_telefono} '
            f'y correo {configuracion.negocio_email}.'
        )

    if intencion == 'despedida':
        return 'Con gusto. Aquí estaré si necesitas algo más. ¡Buen camino!'

    return (
        'Puedo ayudarte con el catálogo de motos y accesorios, los servicios del taller, '
        'el proceso de compra, tus facturas o la radicación de una PQR. '
        '¿Sobre cuál de esos temas quieres que te cuente?'
    )


# ---------------------------------------------------------------------------
# Orquestacion
# ---------------------------------------------------------------------------
SUGERENCIAS = {
    'productos': ['¿Qué motos tienen disponibles?', '¿Cuál es la más económica?',
                  '¿Tienen alguna adventure?'],
    'servicios': ['¿Cuánto cuesta un cambio de aceite?', '¿Cómo agendo una revisión?'],
    'compra': ['¿Qué formas de pago aceptan?', '¿Cómo descargo mi factura?'],
    'pqr': ['Quiero radicar una queja', '¿Cómo consulto mi radicado?'],
    'contacto': ['¿Cuál es el horario?', '¿Dónde quedan ubicados?'],
}

SUGERENCIAS_INICIALES = [
    '¿Qué motos tienen disponibles?',
    '¿Qué servicios ofrece el taller?',
    '¿Cómo compro desde la página?',
    'Quiero radicar una PQR',
]


def sugerencias_para(mensaje: str) -> list[str]:
    """Botones de continuacion que el Frontend pinta bajo la respuesta."""
    return SUGERENCIAS.get(detectar_intencion(mensaje), SUGERENCIAS_INICIALES)[:3]


def conversar(
    mensaje: str,
    historial: list[dict],
    productos: list,
    servicios: list,
    nombre: str | None = None,
) -> tuple[str, str, bool]:
    """Genera la respuesta del chatbot.

    Devuelve (texto, origen, uso_ia). `origen` queda guardado junto al mensaje
    en la base de datos: sirve como evidencia de que la respuesta vino del
    modelo de IA y no del motor de reglas.
    """
    if not configuracion.ia_configurada:
        return responder_con_reglas(mensaje, productos, servicios, nombre), ORIGEN_REGLAS, False

    instrucciones = construir_instrucciones(productos, servicios)
    if nombre:
        instrucciones += f'\n\nEl cliente con el que hablas se llama {nombre}.'

    try:
        texto, modelo = responder_con_ia(instrucciones, [*historial, {'role': 'user', 'content': mensaje}])
        return texto, modelo, True

    except httpx.HTTPStatusError as error:
        # Se registra el codigo, nunca la clave ni el cuerpo completo.
        logger.error(
            'El proveedor de IA (%s) respondió %s. Se responde con el motor de reglas.',
            configuracion.ia_proveedor, error.response.status_code,
        )
    except (httpx.HTTPError, ErrorDeIA, KeyError, ValueError) as error:
        logger.error('No se pudo usar el servicio de IA: %s', error)

    return responder_con_reglas(mensaje, productos, servicios, nombre), ORIGEN_REGLAS, False


def estado() -> dict:
    """Diagnostico del chatbot, sin exponer la clave de acceso."""
    activa = configuracion.ia_configurada

    if activa:
        mensaje = (
            f'El chatbot está respondiendo con {configuracion.modelo_ia} '
            f'a través de {configuracion.ia_proveedor}.'
        )
    elif configuracion.ia_proveedor == 'ninguno':
        mensaje = (
            'No hay proveedor de IA configurado. El chatbot responde con el motor de '
            'reglas, que consulta la misma base de datos. Define IA_PROVEEDOR e '
            'IA_API_KEY en el archivo .env para activar la IA.'
        )
    else:
        mensaje = (
            f'El proveedor {configuracion.ia_proveedor} está seleccionado pero falta '
            'IA_API_KEY en el archivo .env.'
        )

    return {
        'ia_activa': activa,
        'proveedor': configuracion.ia_proveedor,
        'modelo': configuracion.modelo_ia if activa else ORIGEN_REGLAS,
        'api_key_configurada': bool(configuracion.ia_api_key),
        'mensaje': mensaje,
    }
