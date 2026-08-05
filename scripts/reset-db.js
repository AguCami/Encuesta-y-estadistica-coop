'use strict';

/**
 * Vacía la base y la vuelve a crear con los catálogos iniciales.
 *   npm run reset
 * Funciona igual contra el archivo local o contra la base en la nube.
 */

const { ejecutar, seed, SCHEMA } = require('../server/db');
const { DB_URL } = require('../server/config');

const TABLAS = ['seguimientos', 'encuestas', 'consultas', 'sesiones',
  'motivos', 'sectores', 'canales', 'localidades', 'usuarios'];

(async () => {
  await ejecutar(TABLAS.map((t) => `DROP TABLE IF EXISTS ${t}`).join(';'));
  await ejecutar(SCHEMA);
  await seed();
  console.log(`Base reiniciada: ${DB_URL}`);
})().catch((e) => { console.error(e); process.exit(1); });
