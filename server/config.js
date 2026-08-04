'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR: process.env.DATA_DIR || path.join(ROOT, 'data'),
  DB_FILE: process.env.DB_FILE || path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'coop.db'),
  PORT: Number(process.env.PORT || 3000),
  HOST: process.env.HOST || '0.0.0.0',
  // Zona horaria usada para fecha/hora/dia de semana de cada consulta.
  TZ: process.env.TZ_APP || 'America/Argentina/Buenos_Aires',
  // Nombre visible de la cooperativa (aparece en el encabezado y en la encuesta).
  ORG: process.env.ORG_NOMBRE || 'Cooperativa',
  SESSION_COOKIE: 'coop_sid',
  SESSION_HORAS: Number(process.env.SESSION_HORAS || 12),
};
