// Servidor estático para el Frontend ya compilado (carpeta dist).
//
// Vite solo trae servidor en desarrollo. En producción hay que servir dist
// con dos condiciones: escuchar en el puerto que asigne la plataforma
// (variable PORT) y devolver index.html en cualquier ruta que no sea un
// archivo, porque React Router resuelve las rutas en el navegador y sin eso
// recargar /admin daría 404.
//
// Está escrito solo con módulos de Node para no añadir dependencias.
//
// Uso:  npm run build && npm start

import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const RAIZ = resolve(import.meta.dirname, 'dist');
const PUERTO = Number(process.env.PORT) || 4173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resuelve la ruta pedida dentro de dist, sin permitir salir de la carpeta. */
async function buscarArchivo(url) {
  const pedido = decodeURIComponent(new URL(url, 'http://local').pathname);
  const destino = resolve(RAIZ, `.${pedido}`);

  // Se comprueba sobre la ruta ya resuelta: cualquier ".." que apunte fuera de
  // dist queda descartado aqui, pase como pase por la URL.
  const dentro = destino === RAIZ || destino.startsWith(RAIZ + sep);

  if (dentro) {
    try {
      if ((await fs.stat(destino)).isFile()) return destino;
    } catch {
      // No existe: se responde con la aplicacion y decide React Router.
    }
  }

  return join(RAIZ, 'index.html');
}

const servidor = createServer(async (peticion, respuesta) => {
  const archivo = await buscarArchivo(peticion.url || '/');
  const tipo = TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream';

  // Los recursos de Vite llevan hash en el nombre, así que se pueden cachear
  // para siempre. index.html no: es el que apunta a la versión nueva.
  const cache = archivo.endsWith('index.html')
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';

  respuesta.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': cache });
  createReadStream(archivo).pipe(respuesta);
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Frontend servido en http://0.0.0.0:${PUERTO}`);
});
