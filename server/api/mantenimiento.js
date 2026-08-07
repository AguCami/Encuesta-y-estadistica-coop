'use strict';

const { all, get, run, cliente } = require('../db');
const { json, error } = require('../util');
const { requiere } = require('../auth');
const { filas, TOTAL, DESDE, HASTA } = require('../datos/historico');

/** Para el monitoreo del hosting: responde sin sesión y toca la base. */
async function salud({ res }) {
  const n = await get('SELECT COUNT(*) AS n FROM consultas');
  json(res, { ok: true, consultas: n.n, hora: new Date().toISOString() });
}

// Las sesiones no se respaldan: son descartables y guardan cookies vivas.
const TABLAS = ['sectores', 'motivos', 'canales', 'localidades', 'usuarios',
  'consultas', 'seguimientos', 'encuestas'];

/**
 * Descarga una copia completa de los datos en JSON. Con la base en la nube no
 * hay archivo que copiar: el respaldo es esto, que el administrador baja
 * cuando quiere y guarda donde corresponda.
 */
const respaldo = requiere('admin', async ({ res }) => {
  const datos = { generado: new Date().toISOString(), tablas: {} };
  for (const t of TABLAS) datos.tablas[t] = await all(`SELECT * FROM ${t}`);

  const cuerpo = Buffer.from(JSON.stringify(datos, null, 1), 'utf8');
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': `attachment; filename="coop-${new Date().toISOString().slice(0, 10)}.json"`,
    'content-length': cuerpo.length,
  });
  res.end(cuerpo);
});

/**
 * Borra las consultas cargadas para arrancar de cero. Pide un código además
 * de la sesión de administrador: es irreversible y no puede pasar de casualidad.
 *
 * No toca a los usuarios, los sectores, los motivos, las notas ni los cortes:
 * solo lo que alimenta la estadística.
 */
const CODIGO = process.env.CODIGO_REINICIO || '11235813';

const reiniciar = requiere('admin', async ({ res, body }) => {
  if (String(body.codigo || '') !== CODIGO) return error(res, 403, 'El código no es correcto');
  const antes = await get('SELECT COUNT(*) AS n FROM consultas');
  await run('DELETE FROM seguimientos');
  await run('DELETE FROM encuestas');
  await run('DELETE FROM consultas');
  await run("DELETE FROM meta WHERE clave = 'historico'");
  json(res, { ok: true, borradas: antes.n });
});

/**
 * Carga de una vez la semana que venía anotada a mano en las planillas, antes
 * de que la aplicación estuviera en uso. No se puede hacer desde Atención
 * rápida porque ahí la fecha y la hora las pone el servidor, que es lo
 * correcto: si no, se podría falsear cuándo se atendió.
 *
 * Se puede correr una sola vez. Queda anotado en `meta`, y además se mira que
 * no haya nada cargado en esos días, por si entraron por otro lado.
 */
const cargarHistorico = requiere('admin', async ({ res, body }) => {
  if (String(body.codigo || '') !== CODIGO) return error(res, 403, 'El código no es correcto');

  const ya = await get("SELECT valor FROM meta WHERE clave = 'historico'");
  if (ya) return error(res, 409, `El histórico ya se cargó (${ya.valor}). No se carga dos veces.`);

  const chocan = await get(
    'SELECT COUNT(*) AS n FROM consultas WHERE fecha BETWEEN ? AND ?', [DESDE, HASTA]);
  if (chocan.n) {
    return error(res, 409, `Ya hay ${chocan.n} consultas cargadas entre el ${DESDE} y el ${HASTA}. `
      + 'Para volver a cargar el histórico hay que reiniciar las estadísticas primero.');
  }

  // Los nombres se resuelven a números acá: el archivo de datos no sabe de ids
  // y así no depende de en qué orden se sembraron los catálogos.
  const canales = new Map((await all('SELECT id, nombre FROM canales')).map((c) => [c.nombre, c.id]));
  const sectores = new Map((await all('SELECT id, nombre FROM sectores')).map((s) => [s.nombre, s.id]));
  const motivos = new Map((await all('SELECT id, sector_id, nombre FROM motivos'))
    .map((m) => [`${m.sector_id}|${m.nombre}`, m.id]));

  const valores = [];
  const faltan = new Set();
  for (const f of filas()) {
    const sectorId = sectores.get(f.sector);
    const canalId = canales.get(f.canal);
    const motivoId = motivos.get(`${sectorId}|${f.motivo}`);
    if (!sectorId || !canalId || !motivoId) { faltan.add(`${f.sector} / ${f.motivo}`); continue; }
    valores.push([f.ts, f.fecha, f.hora, f.dow, f.puesto, canalId, sectorId, motivoId,
      'pendiente', 'normal', 0, 0]);
  }
  if (faltan.size) {
    return error(res, 409, 'Faltan sectores o motivos en el catálogo: '
      + `${[...faltan].join(', ')}. Se cargarían mal, así que no se cargó nada.`);
  }

  await insertarConsultas(valores);
  await run("INSERT INTO meta (clave, valor) VALUES ('historico', ?) "
    + 'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', [`${DESDE} al ${HASTA}`]);

  json(res, { ok: true, cargadas: valores.length, desde: DESDE, hasta: HASTA });
});

const COLUMNAS = ['ts', 'fecha', 'hora', 'dow', 'puesto', 'canal_id', 'sector_id', 'motivo_id',
  'estado', 'prioridad', 'primer_contacto', 'duracion_seg'];

// SQLite no acepta más de 999 valores atados por sentencia, así que las filas
// van de a tandas. Todas en un solo viaje y en una sola transacción: contra la
// base en la nube, mil idas y vueltas no entrarían en el tiempo que hay.
const POR_TANDA = Math.floor(900 / COLUMNAS.length);

async function insertarConsultas(valores) {
  const encabezado = `INSERT INTO consultas (${COLUMNAS.join(', ')}) VALUES `;
  const hueco = `(${COLUMNAS.map(() => '?').join(',')})`;
  const tandas = [];
  for (let i = 0; i < valores.length; i += POR_TANDA) {
    const tanda = valores.slice(i, i + POR_TANDA);
    tandas.push({
      sql: encabezado + tanda.map(() => hueco).join(','),
      args: tanda.flat(),
    });
  }
  await cliente.batch(tandas, 'write');
}

module.exports = { salud, respaldo, reiniciar, cargarHistorico };
