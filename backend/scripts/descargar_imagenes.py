"""Descarga las imagenes del catalogo a frontend/public/img.

Las fotos ya vienen incluidas en el proyecto: este script solo hace falta si
hay que volver a generarlas. Las imagenes provienen de Unsplash (licencia de
uso libre) y las de motos son las que ya trae el proyecto en src/assets.

Uso:
    python scripts/descargar_imagenes.py
"""

import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / 'img'
PARAMS = '?w=900&h=650&fit=crop&crop=entropy&q=80&fm=jpg'

PRODUCTOS = {
    'casco-integral':     'photo-1622185135505-2d795003994a',
    'casco-modular':      'photo-1611457194403-d3aca4cf9d11',
    'chaqueta-adventure': 'photo-1591195853828-11db59a44f6b',
    'guantes-racing':     'photo-1620891549027-942fdc95d3f5',
    'maleta-lateral':     'photo-1575312363468-c8455fb38a76',
    'aceite-motor':       'photo-1590227763209-821c686b932f',
    'pastillas-freno':    'photo-1613214150384-14921ff659b2',
    'cadena-transmision': 'photo-1657873961503-89a65459de2b',
    'bateria-gel':        'photo-1592318348310-f31b61a931c8',
}

SERVICIOS = {
    'cambio-aceite':        'photo-1542238060-646c7ed65622',
    'mantenimiento':        'photo-1517524206127-48bbd363f3d7',
    'alineacion-balanceo':  'photo-1558980394-4c7c9299fe96',
    'pastillas-servicio':   'photo-1609682932589-5ef2bd85980d',
    'revision-tecnica':     'photo-1581858544302-c40e2254ff87',
    'diagnostico':          'photo-1598915850224-386a8a520c29',
    'cambio-llantas':       'photo-1620223200930-2e719f329f07',
    'lavado-encerado':      'photo-1600668018105-4225f62bbeb9',
}

# Motos del carrusel de la portada. Se descargan a mayor resolucion porque
# el carrusel las muestra a todo lo ancho: con fotos pequenas se ven borrosas.
# honda-cb500f y ktm-390duke no estan aqui porque ya venian en el proyecto
# en alta resolucion (src/assets/images).
MOTOS = {
    'yamaha-mt07':              'photo-1588925762549-c414056c4d3e',
    'harley-street750':         'photo-1515777315835-281b94c9589f',
    'ducati-panigale-v4':       'photo-1615172282427-9a57ef2d142e',
    'bmw-s1000rr':              'photo-1572746965401-cb4df8f9fa79',
    'kawasaki-ninja':           'photo-1597689609001-f4a3dc7195fe',
    'suzuki-hayabusa':          'photo-1621713939155-e35df91a3262',
    'triumph-bonneville':       'photo-1508431432310-7fec11a74c59',
    'royal-enfield-classic350': 'photo-1629571688673-55436b6c732a',
}
PARAMS_MOTOS = '?w=1600&h=900&fit=crop&crop=entropy&q=84&fm=jpg'


def descargar(carpeta: Path, nombre: str, foto: str, params: str = PARAMS) -> bool:
    carpeta.mkdir(parents=True, exist_ok=True)
    destino = carpeta / f'{nombre}.jpg'
    url = f'https://images.unsplash.com/{foto}{params}'
    resultado = subprocess.run(
        ['curl', '-sS', '-L', '--max-time', '45', '-w', '%{http_code}', '-o', str(destino), url],
        capture_output=True, text=True,
    )
    codigo = resultado.stdout.strip()[-3:]
    peso = destino.stat().st_size if destino.exists() else 0
    ok = codigo == '200' and peso > 15000
    print(f'{"OK " if ok else "FALLA"} {codigo} {peso/1024:7.0f} KB  {carpeta.name}/{nombre}.jpg')
    if not ok and destino.exists():
        destino.unlink()
    return ok


fallidas = []
for grupo, mapa, params in [('productos', PRODUCTOS, PARAMS),
                            ('servicios', SERVICIOS, PARAMS),
                            ('motos', MOTOS, PARAMS_MOTOS)]:
    print(f'--- {grupo} ---')
    for nombre, foto in mapa.items():
        if not descargar(BASE / grupo, nombre, foto, params):
            fallidas.append(f'{grupo}/{nombre}')

print()
print('Nota: las descargas quedan en .jpg. Las del carrusel se guardaron en el')
print('proyecto como .webp para que pesen menos; conviertelas con Pillow si')
print('vuelves a ejecutar este script.')

print(f'\nFallidas: {fallidas if fallidas else "ninguna"}')
