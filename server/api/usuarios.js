'use strict';

const { all, get, run } = require('../db');
const { json, error, texto, enteroONull, partesFecha } = require('../util');
const { hashPassword, verifyPassword } = require('../auth-hash');
const { requiere } = require('../auth');

const ROLES = new Set(['operador', 'supervisor', 'admin']);
const PUESTOS = new Set(['call_center', 'mesa_informes', 'otro']);

const listar = requiere('supervisor', async ({ res }) => {
  json(res, await all('SELECT id, usuario, nombre, rol, puesto, activo, creado FROM usuarios ORDER BY activo DESC, nombre'));
});

const crear = requiere('admin', async ({ res, body }) => {
  const usuario = texto(body.usuario, 40).toLowerCase().replace(/\s+/g, '');
  const nombre = texto(body.nombre, 120);
  const clave = String(body.clave || '');
  if (!usuario || !nombre) return error(res, 400, 'Usuario y nombre son obligatorios');
  if (clave.length < 4) return error(res, 400, 'La clave debe tener al menos 4 caracteres');
  if (await get('SELECT id FROM usuarios WHERE usuario = ?', [usuario])) return error(res, 409, 'Ese usuario ya existe');
  const r = await run('INSERT INTO usuarios (usuario, nombre, hash, rol, puesto, creado) VALUES (?,?,?,?,?,?)',
    [usuario, nombre, hashPassword(clave), ROLES.has(body.rol) ? body.rol : 'operador',
      PUESTOS.has(body.puesto) ? body.puesto : 'call_center', partesFecha().ts]);
  json(res, await get('SELECT id, usuario, nombre, rol, puesto, activo FROM usuarios WHERE id = ?',
    [Number(r.lastInsertRowid)]), 201);
});

const editar = requiere('admin', async ({ res, body, params, usuario }) => {
  const id = enteroONull(params.id);
  const fila = await get('SELECT * FROM usuarios WHERE id = ?', [id]);
  if (!fila) return error(res, 404, 'Usuario no encontrado');

  const d = {};
  if (body.nombre !== undefined) d.nombre = texto(body.nombre, 120);
  if (body.rol !== undefined && ROLES.has(body.rol)) d.rol = body.rol;
  if (body.puesto !== undefined && PUESTOS.has(body.puesto)) d.puesto = body.puesto;
  if (body.activo !== undefined) d.activo = body.activo ? 1 : 0;
  if (body.clave) {
    if (String(body.clave).length < 4) return error(res, 400, 'La clave debe tener al menos 4 caracteres');
    d.hash = hashPassword(String(body.clave));
  }
  // Un admin no puede quitarse a si mismo el acceso y dejar el sistema sin admins.
  if (id === usuario.id && (d.activo === 0 || (d.rol && d.rol !== 'admin'))) {
    return error(res, 400, 'No podés quitarte tus propios permisos de administrador');
  }
  const campos = Object.keys(d);
  if (!campos.length) return error(res, 400, 'Nada para actualizar');
  await run(`UPDATE usuarios SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...campos.map((c) => d[c]), id]);
  if (d.activo === 0 || d.hash) await run('DELETE FROM sesiones WHERE usuario_id = ?', [id]);
  json(res, await get('SELECT id, usuario, nombre, rol, puesto, activo FROM usuarios WHERE id = ?', [id]));
});

/** Cada usuario puede cambiar su propia clave. */
const cambiarClave = requiere('operador', async ({ res, body, usuario }) => {
  const fila = await get('SELECT * FROM usuarios WHERE id = ?', [usuario.id]);
  if (!verifyPassword(String(body.actual || ''), fila.hash)) return error(res, 401, 'La clave actual no coincide');
  const nueva = String(body.nueva || '');
  if (nueva.length < 4) return error(res, 400, 'La nueva clave debe tener al menos 4 caracteres');
  await run('UPDATE usuarios SET hash = ? WHERE id = ?', [hashPassword(nueva), usuario.id]);
  json(res, { ok: true });
});

module.exports = { listar, crear, editar, cambiarClave };
