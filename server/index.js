'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { PORT, HOST, PUBLIC_DIR, ORG, TZ, DB_FILE } = require('./config');
const { json, error, leerJson } = require('./util');
const { usuarioActual, login, cerrarSesion, requiere } = require('./auth');

const consultas = require('./api/consultas');
const catalogos = require('./api/catalogos');
const estadisticas = require('./api/estadisticas');
const encuestas = require('./api/encuestas');
const usuarios = require('./api/usuarios');
const tablero = require('./api/tablero');
const mantenimiento = require('./api/mantenimiento');

// ---------------------------------------------------------------- rutas ---
// El orden importa: las rutas literales van antes que las que capturan :id.

const RUTAS = [
  ['POST', '/api/login', login, { publico: true }],
  ['POST', '/api/logout', ({ req, res }) => { cerrarSesion(req, res); json(res, { ok: true }); }, { publico: true }],
  ['GET', '/api/yo', ({ res, usuario }) => json(res, usuario || null), { publico: true }],
  ['GET', '/api/config', ({ res }) => json(res, { org: ORG, tz: TZ }), { publico: true }],
  ['GET', '/api/salud', mantenimiento.salud, { publico: true }],
  ['GET', '/api/respaldo', mantenimiento.respaldo],

  ['GET', '/api/publico/encuesta', encuestas.publicoConfig, { publico: true }],
  ['POST', '/api/publico/encuesta', encuestas.publicoResponder, { publico: true }],

  ['GET', '/api/catalogos', requiere('operador', catalogos.catalogos)],
  ['GET', '/api/tablero', tablero.tablero],
  ['POST', '/api/catalogos/:tabla', catalogos.crear],
  ['PUT', '/api/catalogos/:tabla/:id', catalogos.editar],
  ['DELETE', '/api/catalogos/:tabla/:id', catalogos.desactivar],

  ['GET', '/api/consultas/export', consultas.exportar],
  ['GET', '/api/consultas', consultas.listar],
  ['POST', '/api/consultas', consultas.crear],
  ['GET', '/api/consultas/:id', consultas.ver],
  ['PUT', '/api/consultas/:id', consultas.editar],
  ['DELETE', '/api/consultas/:id', consultas.borrar],
  ['POST', '/api/consultas/:id/seguimientos', consultas.agregarSeguimiento],

  ['GET', '/api/estadisticas/encuestas', estadisticas.encuestas],
  ['GET', '/api/estadisticas/export', estadisticas.exportarResumen],
  ['GET', '/api/estadisticas', estadisticas.general],

  ['GET', '/api/encuestas/export', encuestas.exportar],
  ['GET', '/api/encuestas', encuestas.listar],
  ['POST', '/api/encuestas', encuestas.cargarPorOperador],
  ['POST', '/api/encuestas/link', encuestas.crearLink],

  ['GET', '/api/usuarios', usuarios.listar],
  ['POST', '/api/usuarios', usuarios.crear],
  ['PUT', '/api/usuarios/:id', usuarios.editar],
  ['POST', '/api/mi-clave', usuarios.cambiarClave],
];

function emparejar(metodo, ruta) {
  const partes = ruta.split('/').filter(Boolean);
  for (const [m, patron, handler, opts] of RUTAS) {
    if (m !== metodo) continue;
    const pp = patron.split('/').filter(Boolean);
    if (pp.length !== partes.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(partes[i]);
      else if (pp[i] !== partes[i]) { ok = false; break; }
    }
    if (ok) return { handler, params, opts: opts || {} };
  }
  return null;
}

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
  let rel = ruta === '/' ? '/index.html' : ruta;
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
  const ruta = url.pathname;

  try {
    if (!ruta.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return error(res, 405, 'Metodo no permitido');
      return await servirEstatico(req, res, ruta);
    }

    const match = emparejar(req.method, ruta);
    if (!match) return error(res, 404, 'Recurso inexistente');

    const usuario = usuarioActual(req);
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try { body = await leerJson(req); }
      catch (e) { return error(res, 400, e.message); }
    }

    const query = Object.fromEntries(url.searchParams.entries());
    const ctx = { req, res, usuario, body, query, params: match.params };

    if (!match.opts.publico && !usuario) return error(res, 401, 'Sesion no iniciada');
    await match.handler(ctx);
  } catch (e) {
    console.error('[error]', req.method, ruta, e);
    if (!res.headersSent) error(res, 500, 'Error interno del servidor');
    else res.end();
  }
});

servidor.listen(PORT, HOST, () => {
  console.log(`\n  ${ORG} — Consultas y encuestas`);
  console.log(`  Servidor:  http://localhost:${PORT}`);
  console.log(`  Base:      ${DB_FILE}`);
  console.log(`  Zona:      ${TZ}`);
  console.log('  Usuarios cargados con la clave inicial: cambiala desde Administracion\n');
});
