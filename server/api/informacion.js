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
const listarNotas = requiere('info', async ({ res }) => {
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

const listarCortes = requiere('info', async ({ res }) => {
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

// ------------------------------------------------------------ puntajes ---
// Del juego escondido. Se guarda el mejor puntaje de cada uno, nada más.

const listarPuntajes = requiere('info', async ({ res }) => {
  json(res, await all(`
    SELECT nombre, MAX(puntos) AS puntos, MAX(nivel) AS nivel
      FROM puntajes GROUP BY usuario_id, nombre
     ORDER BY puntos DESC LIMIT 10`));
});

const guardarPuntaje = requiere('info', async ({ res, body, usuario }) => {
  const puntos = Math.max(0, Math.min(enteroONull(body.puntos) ?? 0, 9999999));
  const nivel = Math.max(1, Math.min(enteroONull(body.nivel) ?? 1, 99));
  await run('INSERT INTO puntajes (ts, usuario_id, nombre, puntos, nivel) VALUES (?,?,?,?,?)',
    [partesFecha().ts, usuario.id, usuario.nombre, puntos, nivel]);
  json(res, { ok: true }, 201);
});

// -------------------------------------------------------------- precios ---
// Solo los renglones que se editaron desde Administración. La lista completa
// viaja con la página; esto la pisa por encima, renglón por renglón.

/** Lo lee cualquiera que entre: es lo que se muestra en pantalla. */
const listarPrecios = async ({ res, usuario }) => {
  if (!usuario) return error(res, 401, 'Sesion no iniciada');
  const filas = await all('SELECT clave, valor, ts FROM precios');
  json(res, Object.fromEntries(filas.map((f) => [f.clave, f.valor])));
};

/** Devuelve además quién y cuándo, para la pantalla de edición. */
const detallePrecios = requiere('admin', async ({ res }) => {
  json(res, await all(`
    SELECT p.clave, p.valor, p.ts, u.nombre AS autor
      FROM precios p LEFT JOIN usuarios u ON u.id = p.usuario_id
     ORDER BY p.clave`));
});

/**
 * Guarda los renglones que cambiaron. Llega `{ cambios: { clave: valor } }`;
 * un valor vacío borra la edición y el renglón vuelve al precio de la lista.
 */
const guardarPrecios = requiere('admin', async ({ res, body, usuario }) => {
  const cambios = body && body.cambios;
  if (!cambios || typeof cambios !== 'object') return error(res, 400, 'No llegó ningún cambio');
  const entradas = Object.entries(cambios).slice(0, 500);

  let guardados = 0;
  let borrados = 0;
  for (const [claveCruda, valorCrudo] of entradas) {
    const clave = texto(claveCruda, 300);
    if (!clave) continue;
    const valor = texto(valorCrudo, 120);
    if (!valor) {
      const r = await run('DELETE FROM precios WHERE clave = ?', [clave]);
      borrados += r.cambios;
      continue;
    }
    await run(`INSERT INTO precios (clave, valor, ts, usuario_id) VALUES (?,?,?,?)
               ON CONFLICT(clave) DO UPDATE
                  SET valor = excluded.valor, ts = excluded.ts, usuario_id = excluded.usuario_id`,
    [clave, valor, partesFecha().ts, usuario.id]);
    guardados += 1;
  }
  json(res, { ok: true, guardados, borrados });
});

module.exports = {
  listarNotas, crearNota, borrarNota,
  listarCortes, crearCorte, borrarCorte,
  listarPuntajes, guardarPuntaje,
  listarPrecios, detallePrecios, guardarPrecios,
};
