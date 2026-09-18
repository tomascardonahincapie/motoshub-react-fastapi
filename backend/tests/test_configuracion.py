"""Pruebas de la configuracion que se lee del entorno.

Importan porque un error aqui no falla en una peticion: impide arrancar el
servidor, y en un despliegue eso se ve como un contenedor que se reinicia solo
sin explicar por que.
"""

from app.core.configuracion import Configuracion

RAILWAY = 'https://motoshub.up.railway.app'
VERCEL = 'https://motoshub.vercel.app'


def test_admite_un_solo_origen_sin_comillas():
    """Es como se escribe en el panel de Railway, y antes tumbaba el arranque."""
    ajustes = Configuracion(_env_file=None, origenes_permitidos=RAILWAY)

    assert ajustes.origenes_permitidos == [RAILWAY]


def test_admite_varios_origenes_separados_por_comas():
    ajustes = Configuracion(_env_file=None, origenes_permitidos=f'{RAILWAY},{VERCEL}')

    assert ajustes.origenes_permitidos == [RAILWAY, VERCEL]


def test_ignora_los_espacios_sobrantes():
    ajustes = Configuracion(_env_file=None, origenes_permitidos=f'  {RAILWAY} ,  {VERCEL}  ')

    assert ajustes.origenes_permitidos == [RAILWAY, VERCEL]


def test_sigue_admitiendo_el_formato_json():
    """El .env.example de los avances anteriores lo escribia asi."""
    ajustes = Configuracion(_env_file=None, origenes_permitidos=f'["{RAILWAY}"]')

    assert ajustes.origenes_permitidos == [RAILWAY]


def test_la_url_de_la_plataforma_recibe_el_driver_de_sqlalchemy():
    """Railway entrega mysql://..., que SQLAlchemy no sabe conectar por si solo."""
    ajustes = Configuracion(
        _env_file=None, database_url='mysql://root:clave@host.proxy.rlwy.net:33060/railway',
    )

    assert ajustes.url_base_datos.startswith('mysql+pymysql://')
    assert 'charset=utf8mb4' in ajustes.url_base_datos


def test_no_toca_una_url_que_ya_trae_driver():
    url = 'mysql+pymysql://u:p@h:3306/d?charset=utf8mb4'
    ajustes = Configuracion(_env_file=None, database_url=url)

    assert ajustes.url_base_datos == url
