'use strict';

const crypto = require('node:crypto');
const { all, get, run } = require('../db');
const { json, error, texto, enRango, enteroONull, partesFecha, csv } = require('../util');
const { filtroEncuestas } = require('../filtros');
const { requiere } = require('../auth');
const { ORG } = require('../config');

// Limite simple por IP para el formulario publico (evita respuestas masivas).
const ultimoEnvio = new Map();
const VENTANA_MS = 20 * 1000;

function ipDe(req) {
  const ff = req.headers['x-forwarded-for'];
  return (ff ? String(ff).split(',')[0] : req.socket.remoteAddress || '').trim();
}

/** Datos que necesita el formulario publico (sin sesion). */
function publicoConfig({ res, query }) {
  const token = texto(query.t, 64);
  let encuesta = null;
  if (token) {
    const e = get(`SELECT e.id, e.respondida, s.nombre AS sector, u.nombre AS operador
                     FROM encuestas e
                     LEFT JOIN sectores s ON s.id = e.sector_id
                     LEFT JOIN usuarios u ON u.id = e.operador_id
                    WHERE e.token = ?`, [token]);
    if (!e) return error(res, 404, 'El enlace de la encuesta no es valido');
    encuesta = { sector: e.sector, operador: e.operador, ya_respondida: !!e.respondida };
  }
  json(res, {
    org: ORG,
    token: token || null,
    encuesta,
    sectores: all('SELECT id, nombre FROM sectores WHERE activo = 1 ORDER BY orden, nombre'),
    canales: all('SELECT id, nombre FROM canales WHERE activo = 1 ORDER BY orden, nombre'),
  });
}

/** Carga una respuesta: con token (ligada a una consulta) o anonima por QR. */
function publicoResponder({ res, req, body }) {
  const valores = {
    satisfaccion: enRango(body.satisfaccion, 1, 5),
    resolucion: enRango(body.resolucion, 1, 5),
    atencion: enRango(body.atencion, 1, 5),
    espera: enRango(body.espera, 1, 5),
    recomendaria: enRango(body.recomendaria, 0, 10),
    comentario: texto(body.comentario, 1000),
  };
  if (valores.satisfaccion === null) return error(res, 400, 'Indicá al menos la conformidad general');

  const p = partesFecha();
  const token = texto(body.token, 64);

  if (token) {
    const e = get('SELECT * FROM encuestas WHERE token = ?', [token]);
    if (!e) return error(res, 404, 'El enlace de la encuesta no es valido');
    if (e.respondida) return error(res, 409, 'Esta encuesta ya fue respondida. ¡Gracias!');
    run(`UPDATE encuestas SET respondida = ?, fecha = ?, satisfaccion = ?, resolucion = ?,
            atencion = ?, espera = ?, recomendaria = ?, comentario = ? WHERE id = ?`,
      [p.ts, p.fecha, valores.satisfaccion, valores.resolucion, valores.atencion,
        valores.espera, valores.recomendaria, valores.comentario, e.id]);
  } else {
    // El formulario abierto (QR) no tiene token de un solo uso: se limita por IP.
    const ip = ipDe(req);
    const ahora = Date.now();
    if (ultimoEnvio.get(ip) && ahora - ultimoEnvio.get(ip) < VENTANA_MS) {
      return error(res, 429, 'Esperá unos segundos antes de enviar otra respuesta');
    }
    ultimoEnvio.set(ip, ahora);
    if (ultimoEnvio.size > 5000) ultimoEnvio.clear();

    const sectorId = enteroONull(body.sector_id);
    if (!sectorId || !get('SELECT id FROM sectores WHERE id = ? AND activo = 1', [sectorId])) {
      return error(res, 400, 'Elegí el sector que te atendió');
    }
    run(`INSERT INTO encuestas (token, consulta_id, sector_id, canal_id, origen, creada, respondida,
            fecha, satisfaccion, resolucion, atencion, espera, recomendaria, comentario)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [crypto.randomBytes(9).toString('base64url'), null, sectorId, enteroONull(body.canal_id),
        'qr', p.ts, p.ts, p.fecha, valores.satisfaccion, valores.resolucion, valores.atencion,
        valores.espera, valores.recomendaria, valores.comentario]);
  }

  json(res, { ok: true, mensaje: '¡Gracias por responder!' }, 201);
}

/** Genera un enlace de encuesta para mandar por WhatsApp/mail. */
const crearLink = requiere('operador', ({ res, body, usuario }) => {
  const sectorId = enteroONull(body.sector_id);
  if (!sectorId) return error(res, 400, 'Elegí el sector');
  const token = crypto.randomBytes(9).toString('base64url');
  run(`INSERT INTO encuestas (token, consulta_id, sector_id, canal_id, operador_id, origen, creada)
       VALUES (?,?,?,?,?,?,?)`,
    [token, enteroONull(body.consulta_id), sectorId, enteroONull(body.canal_id), usuario.id,
      'link', partesFecha().ts]);
  json(res, { token, url: `/encuesta.html?t=${token}` }, 201);
});

/** Carga de la encuesta hecha por el operador al cerrar la atencion. */
const cargarPorOperador = requiere('operador', ({ res, body, usuario }) => {
  const consultaId = enteroONull(body.consulta_id);
  const consulta = consultaId ? get('SELECT * FROM consultas WHERE id = ?', [consultaId]) : null;
  if (consultaId && !consulta) return error(res, 404, 'Consulta no encontrada');
  const sectorId = consulta ? consulta.sector_id : enteroONull(body.sector_id);
  if (!sectorId) return error(res, 400, 'Elegí el sector');
  const satisfaccion = enRango(body.satisfaccion, 1, 5);
  if (satisfaccion === null) return error(res, 400, 'Indicá la conformidad general (1 a 5)');

  const p = partesFecha();
  if (consulta && get('SELECT id FROM encuestas WHERE consulta_id = ? AND respondida IS NOT NULL', [consultaId])) {
    return error(res, 409, 'Esa consulta ya tiene una encuesta cargada');
  }
  run(`INSERT INTO encuestas (token, consulta_id, sector_id, canal_id, operador_id, origen, creada,
          respondida, fecha, satisfaccion, resolucion, atencion, espera, recomendaria, comentario)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [crypto.randomBytes(9).toString('base64url'), consultaId, sectorId,
      consulta ? consulta.canal_id : enteroONull(body.canal_id), usuario.id, 'operador', p.ts,
      p.ts, p.fecha, satisfaccion, enRango(body.resolucion, 1, 5), enRango(body.atencion, 1, 5),
      enRango(body.espera, 1, 5), enRango(body.recomendaria, 0, 10), texto(body.comentario, 1000)]);
  json(res, { ok: true }, 201);
});

const listar = requiere('supervisor', ({ res, query }) => {
  const f = filtroEncuestas(query);
  json(res, all(`
    SELECT e.*, s.nombre AS sector, ca.nombre AS canal, u.nombre AS operador
      FROM encuestas e
      LEFT JOIN sectores s ON s.id = e.sector_id
      LEFT JOIN canales ca ON ca.id = e.canal_id
      LEFT JOIN usuarios u ON u.id = e.operador_id
     WHERE ${f.sql}
     ORDER BY e.respondida DESC LIMIT 500`, f.params));
});

const exportar = requiere('supervisor', ({ res, query }) => {
  const f = filtroEncuestas(query);
  const filas = all(`
    SELECT e.fecha, e.origen, s.nombre AS sector, ca.nombre AS canal, u.nombre AS operador,
           e.consulta_id, e.satisfaccion, e.resolucion, e.atencion, e.espera, e.recomendaria, e.comentario
      FROM encuestas e
      LEFT JOIN sectores s ON s.id = e.sector_id
      LEFT JOIN canales ca ON ca.id = e.canal_id
      LEFT JOIN usuarios u ON u.id = e.operador_id
     WHERE ${f.sql}
     ORDER BY e.fecha`, f.params);
  csv(res, `encuestas_${f.desde}_a_${f.hasta}.csv`, [
    ['Fecha', 'Origen', 'Sector', 'Canal', 'Operador', 'Consulta', 'Conformidad', 'Resolucion',
      'Atencion', 'Espera', 'Recomendaria', 'Comentario'],
    ...filas.map((e) => [e.fecha, e.origen, e.sector || '', e.canal || '', e.operador || '',
      e.consulta_id || '', e.satisfaccion, e.resolucion, e.atencion, e.espera, e.recomendaria,
      (e.comentario || '').replace(/\r?\n/g, ' ')]),
  ]);
});

module.exports = { publicoConfig, publicoResponder, crearLink, cargarPorOperador, listar, exportar };
