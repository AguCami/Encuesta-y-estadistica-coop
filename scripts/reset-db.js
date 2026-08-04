'use strict';

/** Borra la base de datos y la vuelve a crear vacia (con los catalogos base). */

const fs = require('node:fs');
const { DB_FILE } = require('../server/config');

for (const archivo of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`, `${DB_FILE}-journal`]) {
  if (fs.existsSync(archivo)) fs.rmSync(archivo);
}
require('../server/db'); // recrea el esquema y los catalogos iniciales
console.log(`Base reiniciada: ${DB_FILE}`);
