'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { PORT, HOST, PUBLIC_DIR, ORG, TZ, DB_URL } = require('./config');
const { error } = require('./util');
const { manejarApi } = require('./app');
const { iniciar } = require('./db');

// -------------------------------------------------------------- estatico ---

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function servirEstatico(req, res, ruta) {
  const rel = ruta === '/' ? '/index.html' : ruta;
  const destino = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!destino.startsWith(PUBLIC_DIR)) return error(res, 403, 'Prohibido');
  try {
    const st = await fsp.stat(destino);
    if (st.isDirectory()) return error(res, 404, 'No encontrado');
    const tipo = TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'content-type': tipo,
      'content-length': st.size,
      'cache-control': tipo.startsWith('text/html') ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
    });
    fs.createReadStream(destino).pipe(res);
  } catch {
    error(res, 404, 'No encontrado');
  }
}

// -------------------------------------------------------------- servidor ---

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return error(res, 405, 'Metodo no permitido');
      return await servirEstatico(req, res, url.pathname);
    }
    await manejarApi(req, res, url);
  } catch (e) {
    console.error('[error]', req.method, url.pathname, e);
    if (!res.headersSent) error(res, 500, 'Error interno del servidor');
    else res.end();
  }
});

iniciar().then(() => {
  servidor.listen(PORT, HOST, () => {
    console.log(`\n  ${ORG} — Consultas y encuestas`);
    console.log(`  Servidor:  http://localhost:${PORT}`);
    console.log(`  Base:      ${DB_URL}`);
    console.log(`  Zona:      ${TZ}`);
    console.log('  Usuarios cargados con la clave inicial: cambiala desde Administracion\n');
  });
}).catch((e) => {
  console.error('No se pudo preparar la base:', e);
  process.exit(1);
});
