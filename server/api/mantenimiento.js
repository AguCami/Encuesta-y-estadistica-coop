'use strict';

const { all, get } = require('../db');
const { json } = require('../util');
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

module.exports = { salud, respaldo };
