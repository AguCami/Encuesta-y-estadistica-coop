'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { db, get } = require('../db');
const { DB_FILE } = require('../config');
const { json } = require('../util');
const { requiere } = require('../auth');

/** Para el monitoreo del hosting: responde sin sesión y toca la base. */
function salud({ res }) {
  const n = get('SELECT COUNT(*) AS n FROM consultas').n;
  json(res, { ok: true, consultas: n, hora: new Date().toISOString() });
}

/**
 * Descarga una copia de la base. En un hosting en la nube es la forma de
 * tener el respaldo fuera del servidor: lo baja el administrador cuando
 * quiere y lo guarda donde corresponda.
 */
const respaldo = requiere('admin', ({ res }) => {
  const destino = path.join(os.tmpdir(), `coop-${Date.now()}.db`);
  // VACUUM INTO deja una copia consistente aunque haya gente cargando.
  db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);

  const nombre = `coop-${new Date().toISOString().slice(0, 10)}.db`;
  const { size } = fs.statSync(destino);
  res.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-disposition': `attachment; filename="${nombre}"`,
    'content-length': size,
  });
  const flujo = fs.createReadStream(destino);
  flujo.pipe(res);
  flujo.on('close', () => fs.rm(destino, () => {}));
});

module.exports = { salud, respaldo };
