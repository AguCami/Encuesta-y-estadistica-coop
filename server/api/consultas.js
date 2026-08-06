'use strict';

const crypto = require('node:crypto');
const { all, get, run } = require('../db');
const { json, error, texto, enteroONull, partesFecha, csv } = require('../util');
const { filtroConsultas } = require('../filtros');
const { requiere, esSupervisor } = require('../auth');

const SELECT_BASE = `
  SELECT c.*,
         s.nombre  AS sector,
         m.nombre  AS motivo,
         ca.nombre AS canal,
         l.nombre  AS localidad,
         u.nombre  AS operador
    FROM consultas c
    LEFT JOIN sectores    s  ON s.id  = c.sector_id
    LEFT JOIN motivos     m  ON m.id  = c.motivo_id
    LEFT JOIN canales     ca ON ca.id = c.canal_id
    LEFT JOIN localidades l  ON l.id  = c.localidad_id
    LEFT JOIN usuarios    u  ON u.id  = c.operador_id`;

const ESTADOS = new Set(['resuelta', 'derivada', 'pendiente', 'reclamo']);
const PRIORIDADES = new Set(['baja', 'normal', 'alta']);
const PUESTOS = new Set(['call_center', 'mesa_informes', 'otro']);

const listar = requiere('admin', async ({ res, query }) => {
  const f = filtroConsultas(query);
  const limite = Math.min(Math.max(enteroONull(query.limite) ?? 100, 1), 500);
  const offset = Math.max(enteroONull(query.offset) ?? 0, 0);
  const total = (await get(`SELECT COUNT(*) AS n FROM consultas c WHERE ${f.sql}`, f.params)).n;
  const filas = await all(`${SELECT_BASE} WHERE ${f.sql} ORDER BY c.ts DESC LIMIT ? OFFSET ?`,
    [...f.params, limite, offset]);
  json(res, { total, limite, offset, filas });
});

const ver = requiere('admin', async ({ res, params }) => {
  const id = enteroONull(params.id);
  const fila = await get(`${SELECT_BASE} WHERE c.id = ?`, [id]);
  if (!fila) return error(res, 404, 'Consulta no encontrada');
  fila.seguimientos = await all(
    `SELECT g.*, u.nombre AS usuario FROM seguimientos g
       LEFT JOIN usuarios u ON u.id = g.usuario_id
      WHERE g.consulta_id = ? ORDER BY g.ts`, [id]);
  fila.encuesta = await get('SELECT * FROM encuestas WHERE consulta_id = ?', [id]) || null;
  json(res, fila);
});

const crear = requiere('operador', async ({ res, body, usuario }) => {
  const sectorId = enteroONull(body.sector_id);
  if (!sectorId || !await get('SELECT id FROM sectores WHERE id = ?', [sectorId])) {
    return error(res, 400, 'Elegi un sector');
  }
  const canalId = enteroONull(body.canal_id);
  if (!canalId || !await get('SELECT id FROM canales WHERE id = ?', [canalId])) {
    return error(res, 400, 'Elegi un canal de contacto');
  }
  const motivoId = enteroONull(body.motivo_id);
  if (motivoId) {
    const m = await get('SELECT sector_id FROM motivos WHERE id = ?', [motivoId]);
    if (!m) return error(res, 400, 'Motivo inexistente');
    if (m.sector_id !== sectorId) return error(res, 400, 'El motivo no pertenece al sector elegido');
  }

  const p = partesFecha();
  const estado = ESTADOS.has(body.estado) ? body.estado : 'resuelta';
  // El puesto no lo elige el navegador: lo manda el del usuario. Solo quien
  // no tiene uno fijo ('otro', como el administrador) puede elegir.
  const puesto = usuario.puesto === 'call_center' || usuario.puesto === 'mesa_informes'
    ? usuario.puesto
    : (PUESTOS.has(body.puesto) ? body.puesto : 'call_center');
  const prioridad = PRIORIDADES.has(body.prioridad) ? body.prioridad : 'normal';
  const duracion = Math.max(0, Math.min(enteroONull(body.duracion_seg) ?? 0, 24 * 3600));

  const r = await run(
    `INSERT INTO consultas
       (ts, fecha, hora, dow, operador_id, puesto, canal_id, sector_id, motivo_id, localidad_id,
        socio_nro, socio_nombre, contacto, estado, prioridad, primer_contacto, duracion_seg,
        reclamo_nro, observaciones, cerrada_ts, cerrada_por)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [p.ts, p.fecha, p.hora, p.dow, usuario.id, puesto, canalId, sectorId, motivoId,
      enteroONull(body.localidad_id), texto(body.socio_nro, 30), texto(body.socio_nombre, 120),
      texto(body.contacto, 120), estado, prioridad, body.primer_contacto === false ? 0 : 1, duracion,
      texto(body.reclamo_nro, 40), texto(body.observaciones, 2000),
      estado === 'resuelta' ? p.ts : null, estado === 'resuelta' ? usuario.id : null]);

  const id = Number(r.lastInsertRowid);

  // Encuesta de satisfaccion opcional: se genera el token y se devuelve el link
  // para pasarselo al socio (WhatsApp / email / QR en el mostrador).
  let encuesta = null;
  if (body.generar_encuesta) {
    const token = crypto.randomBytes(9).toString('base64url');
    await run(`INSERT INTO encuestas (token, consulta_id, sector_id, canal_id, operador_id, origen, creada)
         VALUES (?,?,?,?,?,?,?)`, [token, id, sectorId, canalId, usuario.id, 'operador', p.ts]);
    encuesta = { token, url: `/encuesta.html?t=${token}` };
  }

  json(res, { ...await get(`${SELECT_BASE} WHERE c.id = ?`, [id]), encuesta }, 201);
});

const editar = requiere('operador', async ({ res, params, body, usuario }) => {
  const id = enteroONull(params.id);
  const actual = await get('SELECT * FROM consultas WHERE id = ?', [id]);
  if (!actual) return error(res, 404, 'Consulta no encontrada');
  if (actual.operador_id !== usuario.id && !esSupervisor(usuario)) {
    return error(res, 403, 'Solo el operador que la cargo o un supervisor pueden modificarla');
  }

  const d = {};
  const num = (k) => { if (body[k] !== undefined) d[k] = enteroONull(body[k]); };
  num('sector_id'); num('motivo_id'); num('canal_id'); num('localidad_id');
  if (body.socio_nro !== undefined) d.socio_nro = texto(body.socio_nro, 30);
  if (body.socio_nombre !== undefined) d.socio_nombre = texto(body.socio_nombre, 120);
  if (body.contacto !== undefined) d.contacto = texto(body.contacto, 120);
  if (body.reclamo_nro !== undefined) d.reclamo_nro = texto(body.reclamo_nro, 40);
  if (body.observaciones !== undefined) d.observaciones = texto(body.observaciones, 2000);
  if (body.prioridad !== undefined && PRIORIDADES.has(body.prioridad)) d.prioridad = body.prioridad;
  if (body.duracion_seg !== undefined) d.duracion_seg = Math.max(0, Math.min(enteroONull(body.duracion_seg) ?? 0, 24 * 3600));
  if (body.primer_contacto !== undefined) d.primer_contacto = body.primer_contacto ? 1 : 0;
  if (body.estado !== undefined && ESTADOS.has(body.estado)) {
    d.estado = body.estado;
    const p = partesFecha();
    d.cerrada_ts = body.estado === 'resuelta' ? p.ts : null;
    d.cerrada_por = body.estado === 'resuelta' ? usuario.id : null;
  }

  const campos = Object.keys(d);
  if (!campos.length) return error(res, 400, 'Nada para actualizar');
  await run(`UPDATE consultas SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...campos.map((c) => d[c]), id]);

  if (d.estado && d.estado !== actual.estado) {
    await run('INSERT INTO seguimientos (consulta_id, ts, usuario_id, estado, nota) VALUES (?,?,?,?,?)',
      [id, partesFecha().ts, usuario.id, d.estado, `Cambio de estado: ${actual.estado} -> ${d.estado}`]);
  }
  json(res, await get(`${SELECT_BASE} WHERE c.id = ?`, [id]));
});

const agregarSeguimiento = requiere('admin', async ({ res, params, body, usuario }) => {
  const id = enteroONull(params.id);
  if (!await get('SELECT id FROM consultas WHERE id = ?', [id])) return error(res, 404, 'Consulta no encontrada');
  const nota = texto(body.nota, 1000);
  if (!nota) return error(res, 400, 'Escribi la nota del seguimiento');
  const p = partesFecha();
  const estado = ESTADOS.has(body.estado) ? body.estado : '';
  await run('INSERT INTO seguimientos (consulta_id, ts, usuario_id, estado, nota) VALUES (?,?,?,?,?)',
    [id, p.ts, usuario.id, estado, nota]);
  if (estado) {
    await run('UPDATE consultas SET estado = ?, cerrada_ts = ?, cerrada_por = ? WHERE id = ?',
      [estado, estado === 'resuelta' ? p.ts : null, estado === 'resuelta' ? usuario.id : null, id]);
  }
  json(res, await all(`SELECT g.*, u.nombre AS usuario FROM seguimientos g
                   LEFT JOIN usuarios u ON u.id = g.usuario_id
                  WHERE g.consulta_id = ? ORDER BY g.ts`, [id]), 201);
});

/** Ventana para que el operador deshaga un registro recien cargado. */
const MINUTOS_DESHACER = 10;

const borrar = requiere('operador', async ({ res, params, usuario }) => {
  const id = enteroONull(params.id);
  const c = await get('SELECT id, ts, operador_id FROM consultas WHERE id = ?', [id]);
  if (!c) return error(res, 404, 'Consulta no encontrada');

  if (!esSupervisor(usuario)) {
    // El que la cargo puede deshacerla, pero solo si fue recien: sirve para
    // corregir un clic equivocado, no para borrar historia.
    const minutos = (Date.parse(partesFecha().ts) - Date.parse(c.ts)) / 60000;
    if (c.operador_id !== usuario.id) return error(res, 403, 'Solo un supervisor puede eliminar consultas de otro operador');
    if (minutos > MINUTOS_DESHACER) {
      return error(res, 403, `Pasaron más de ${MINUTOS_DESHACER} minutos: pedile a un supervisor que la elimine`);
    }
  }
  await run('DELETE FROM consultas WHERE id = ?', [id]);
  json(res, { ok: true });
});

const exportar = requiere('admin', async ({ res, query }) => {
  const f = filtroConsultas(query);
  const filas = await all(`${SELECT_BASE} WHERE ${f.sql} ORDER BY c.ts`, f.params);
  const cabecera = ['ID', 'Fecha', 'Hora', 'Puesto', 'Operador', 'Canal', 'Sector', 'Motivo',
    'Localidad', 'Socio N', 'Socio', 'Contacto', 'Estado', 'Prioridad', 'Primer contacto',
    'Duracion (min)', 'Reclamo N', 'Observaciones'];
  const datos = filas.map((c) => [
    c.id, c.fecha, c.ts.slice(11, 16), c.puesto, c.operador || '', c.canal || '', c.sector || '',
    c.motivo || '', c.localidad || '', c.socio_nro, c.socio_nombre, c.contacto, c.estado, c.prioridad,
    c.primer_contacto ? 'Si' : 'No', (c.duracion_seg / 60).toFixed(1).replace('.', ','),
    c.reclamo_nro, c.observaciones.replace(/\r?\n/g, ' '),
  ]);
  csv(res, `consultas_${f.desde}_a_${f.hasta}.csv`, [cabecera, ...datos]);
});

module.exports = { listar, ver, crear, editar, agregarSeguimiento, borrar, exportar };
