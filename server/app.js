'use strict';

/**
 * El corazón de la aplicación: la tabla de rutas y el despacho de cada
 * pedido. No sabe si lo está llamando un servidor propio (server/index.js)
 * o una función en la nube (netlify/functions/api.js); recibe siempre un
 * `req`/`res` al estilo de node:http.
 */

const { ORG, ORG_CORTO, TZ } = require('./config');
const { json, error, leerJson } = require('./util');
const { usuarioActual, login, cerrarSesion, requiere } = require('./auth');
const { iniciar } = require('./db');

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
  ['POST', '/api/logout', async ({ req, res }) => { await cerrarSesion(req, res); json(res, { ok: true }); }, { publico: true }],
  ['GET', '/api/yo', ({ res, usuario }) => json(res, usuario || null), { publico: true }],
  ['GET', '/api/config', ({ res }) => json(res, { org: ORG, org_corto: ORG_CORTO, tz: TZ }), { publico: true }],
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

/** Resuelve un pedido a /api/... Devuelve false si la ruta no existe. */
async function manejarApi(req, res, url) {
  const match = emparejar(req.method, url.pathname);
  if (!match) return error(res, 404, 'Recurso inexistente');

  await iniciar();

  const usuario = await usuarioActual(req);
  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try { body = await leerJson(req); }
    catch (e) { return error(res, 400, e.message); }
  }

  const query = Object.fromEntries(url.searchParams.entries());
  const ctx = { req, res, usuario, body, query, params: match.params };

  if (!match.opts.publico && !usuario) return error(res, 401, 'Sesion no iniciada');
  return match.handler(ctx);
}

module.exports = { RUTAS, emparejar, manejarApi };
