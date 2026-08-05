'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR: DATA_DIR,
  // En desarrollo, un archivo local. En producción, la base en la nube:
  //   DB_URL=libsql://...turso.io   DB_TOKEN=...
  DB_URL: process.env.DB_URL || `file:${path.join(DATA_DIR, 'coop.db')}`,
  DB_TOKEN: process.env.DB_TOKEN || '',
  EN_ARCHIVO: !process.env.DB_URL || process.env.DB_URL.startsWith('file:'),
  PORT: Number(process.env.PORT || 3000),
  HOST: process.env.HOST || '0.0.0.0',
  // Zona horaria usada para fecha/hora/dia de semana de cada consulta.
  TZ: process.env.TZ_APP || 'America/Argentina/Buenos_Aires',
  // Nombre visible de la cooperativa (aparece en el encabezado y en la encuesta).
  ORG: process.env.ORG_NOMBRE || 'Cooperativa',
  SESSION_COOKIE: 'coop_sid',
  SESSION_HORAS: Number(process.env.SESSION_HORAS || 12),
};
