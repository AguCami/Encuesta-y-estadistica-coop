'use strict';

const { all, get, run } = require('../db');
const { json, error } = require('../util');
const { requiere } = require('../auth');

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
  json(res, { ok: true, borradas: antes.n });
});

module.exports = { salud, respaldo, reiniciar };
