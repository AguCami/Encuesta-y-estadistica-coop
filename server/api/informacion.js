'use strict';

/**
 * Lo que el personal escribe en la pantalla de Información útil: las notas que
 * se dejan para el resto del turno y el cronograma de cortes.
 *
 * Los precios, los internos y los lugares de pago no están acá: son datos de
 * consulta que no cambian durante el día y viajan con la página
 * (public/js/datos-info.js), así se leen sin pedirle nada al servidor.
 */

const { all, get, run } = require('../db');
const { json, error, texto, enteroONull, partesFecha } = require('../util');
const { requiere, esSupervisor } = require('../auth');

const SECCIONES = new Set(['Luz comercial', 'TICs', 'Luz y agua familia']);
const fechaONull = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

// Una nota vieja ya no le sirve a nadie: se muestran las del último mes.
const listarNotas = requiere('operador', async ({ res }) => {
  json(res, await all(`
    SELECT n.*, u.nombre AS autor
      FROM notas n LEFT JOIN usuarios u ON u.id = n.usuario_id
     ORDER BY n.ts DESC LIMIT 200`));
});

const crearNota = requiere('operador', async ({ res, body, usuario }) => {
  const d = {
    nombre: texto(body.nombre, 80),
    apellido: texto(body.apellido, 80),
    socio_nro: texto(body.socio_nro, 30),
    telefono: texto(body.telefono, 40),
    texto: texto(body.texto, 2000),
  };
  if (!d.texto && !d.nombre && !d.apellido) {
    return error(res, 400, 'Escribí al menos el nombre o la nota');
  }
  const r = await run(`INSERT INTO notas (ts, usuario_id, nombre, apellido, socio_nro, telefono, texto)
                       VALUES (?,?,?,?,?,?,?)`,
    [partesFecha().ts, usuario.id, d.nombre, d.apellido, d.socio_nro, d.telefono, d.texto]);
  json(res, await get(`SELECT n.*, u.nombre AS autor FROM notas n
                         LEFT JOIN usuarios u ON u.id = n.usuario_id
                        WHERE n.id = ?`, [Number(r.lastInsertRowid)]), 201);
});

const borrarNota = requiere('operador', async ({ res, params, usuario }) => {
  const id = enteroONull(params.id);
  const n = await get('SELECT usuario_id FROM notas WHERE id = ?', [id]);
  if (!n) return error(res, 404, 'Nota no encontrada');
  if (n.usuario_id !== usuario.id && !esSupervisor(usuario)) {
    return error(res, 403, 'Solo quien la escribió o un supervisor pueden borrarla');
  }
  await run('DELETE FROM notas WHERE id = ?', [id]);
  json(res, { ok: true });
});

const listarCortes = requiere('operador', async ({ res }) => {
  json(res, await all(`
    SELECT c.*, u.nombre AS autor
      FROM cortes c LEFT JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY COALESCE(c.plazo, c.aviso, c.ts) DESC LIMIT 200`));
});

const crearCorte = requiere('operador', async ({ res, body, usuario }) => {
  const seccion = SECCIONES.has(body.seccion) ? body.seccion : '';
  if (!seccion) return error(res, 400, 'Elegí la sección');
  const r = await run(`INSERT INTO cortes (ts, usuario_id, seccion, aviso, plazo, corte, observaciones)
                       VALUES (?,?,?,?,?,?,?)`,
    [partesFecha().ts, usuario.id, seccion, fechaONull(body.aviso), fechaONull(body.plazo),
      fechaONull(body.corte), texto(body.observaciones, 1000)]);
  json(res, await get(`SELECT c.*, u.nombre AS autor FROM cortes c
                         LEFT JOIN usuarios u ON u.id = c.usuario_id
                        WHERE c.id = ?`, [Number(r.lastInsertRowid)]), 201);
});

const borrarCorte = requiere('operador', async ({ res, params, usuario }) => {
  const id = enteroONull(params.id);
  const c = await get('SELECT usuario_id FROM cortes WHERE id = ?', [id]);
  if (!c) return error(res, 404, 'Corte no encontrado');
  if (c.usuario_id !== usuario.id && !esSupervisor(usuario)) {
    return error(res, 403, 'Solo quien lo cargó o un supervisor pueden borrarlo');
  }
  await run('DELETE FROM cortes WHERE id = ?', [id]);
  json(res, { ok: true });
});

module.exports = { listarNotas, crearNota, borrarNota, listarCortes, crearCorte, borrarCorte };
