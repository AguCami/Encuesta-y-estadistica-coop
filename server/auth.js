'use strict';

const crypto = require('node:crypto');
const { get, run } = require('./db');
const { verifyPassword } = require('./auth-hash');
const { SESSION_COOKIE, SESSION_HORAS } = require('./config');
const { json, error } = require('./util');

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const parte of raw.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return out;
}

function crearSesion(res, usuarioId) {
  const id = crypto.randomBytes(24).toString('hex');
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + SESSION_HORAS * 3600 * 1000);
  run('INSERT INTO sesiones (id, usuario_id, creada, expira) VALUES (?, ?, ?, ?)',
    [id, usuarioId, ahora.toISOString(), expira.toISOString()]);
  run("DELETE FROM sesiones WHERE expira < ?", [ahora.toISOString()]);
  res.setHeader('set-cookie',
    `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HORAS * 3600}`);
  return id;
}

function cerrarSesion(req, res) {
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (sid) run('DELETE FROM sesiones WHERE id = ?', [sid]);
  res.setHeader('set-cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Usuario de la request o null. */
function usuarioActual(req) {
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (!sid) return null;
  const fila = get(`SELECT u.id, u.usuario, u.nombre, u.rol, u.puesto, u.activo, s.expira
                      FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
                     WHERE s.id = ?`, [sid]);
  if (!fila) return null;
  if (new Date(fila.expira) < new Date() || !fila.activo) {
    run('DELETE FROM sesiones WHERE id = ?', [sid]);
    return null;
  }
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, puesto: fila.puesto };
}

const esSupervisor = (u) => u && (u.rol === 'supervisor' || u.rol === 'admin');
const esAdmin = (u) => u && u.rol === 'admin';

/** Envuelve un handler exigiendo sesion (y opcionalmente un rol). */
function requiere(nivel, handler) {
  return async (ctx) => {
    const u = ctx.usuario;
    if (!u) return error(ctx.res, 401, 'Sesion no iniciada');
    if (nivel === 'supervisor' && !esSupervisor(u)) return error(ctx.res, 403, 'Requiere permisos de supervisor');
    if (nivel === 'admin' && !esAdmin(u)) return error(ctx.res, 403, 'Requiere permisos de administrador');
    return handler(ctx);
  };
}

async function login(ctx) {
  const { usuario, clave } = ctx.body || {};
  const fila = get('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1', [String(usuario || '').trim()]);
  if (!fila || !verifyPassword(clave || '', fila.hash)) {
    return error(ctx.res, 401, 'Usuario o clave incorrectos');
  }
  crearSesion(ctx.res, fila.id);
  json(ctx.res, { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, puesto: fila.puesto });
}

module.exports = { usuarioActual, login, cerrarSesion, requiere, esSupervisor, esAdmin };
