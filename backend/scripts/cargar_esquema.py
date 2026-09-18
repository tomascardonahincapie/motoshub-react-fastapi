"""Carga un archivo .sql en la base de datos configurada.

Existe porque el cliente `mysql` de la linea de comandos no siempre sirve para
esto. El que trae XAMPP es MariaDB 10.4, que no entiende la opcion
`--ssl-mode` ni el metodo de autenticacion por defecto de MySQL 8, que es lo
que dan Aiven y compania. En vez de pelear con eso, aqui se usa el mismo
driver que usa la aplicacion, que si habla los dos idiomas.

Uso:
    python scripts/cargar_esquema.py                      # database/schema.sql
    python scripts/cargar_esquema.py database/otro.sql

La base y las credenciales salen de DATABASE_URL o de las variables DB_* del
archivo .env, igual que el resto del Backend.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pymysql  # noqa: E402
from pymysql.constants import CLIENT  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.core.configuracion import configuracion  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]


def conectar(url, con_base: bool):
    """Abre la conexion permitiendo varias sentencias en un mismo envio."""
    return pymysql.connect(
        host=url.host,
        port=url.port or 3306,
        user=url.username,
        password=url.password or '',
        database=url.database if con_base else None,
        charset='utf8mb4',
        client_flag=CLIENT.MULTI_STATEMENTS,
        autocommit=True,
    )


def main() -> int:
    relativa = sys.argv[1] if len(sys.argv) > 1 else 'database/schema.sql'
    archivo = Path(relativa)
    if not archivo.is_absolute():
        archivo = RAIZ / archivo

    if not archivo.exists():
        print(f'No encuentro el archivo: {archivo}')
        return 1

    url = make_url(configuracion.url_base_datos)
    print(f'Servidor : {url.host}:{url.port or 3306}')
    print(f'Base     : {url.database}')
    print(f'Archivo  : {archivo.name}')

    try:
        conexion = conectar(url, con_base=True)
    except pymysql.err.OperationalError as error:
        # 1049 = la base todavia no existe. No es un problema si el archivo
        # empieza creandola, que es el caso de schema.sql.
        if error.args[0] != 1049:
            raise
        print(f'La base "{url.database}" aun no existe; el archivo deberia crearla.')
        conexion = conectar(url, con_base=False)

    with conexion:
        with conexion.cursor() as cursor:
            cursor.execute(archivo.read_text(encoding='utf-8'))
            while cursor.nextset():
                pass

        with conexion.cursor() as cursor:
            cursor.execute('SELECT DATABASE()')
            base = cursor.fetchone()[0]
            cursor.execute('SHOW TABLES')
            tablas = [fila[0] for fila in cursor.fetchall()]

    print()
    print(f'Listo. La base "{base}" tiene {len(tablas)} tablas:')
    print('  ' + ', '.join(tablas))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
