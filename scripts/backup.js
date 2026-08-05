'use strict';

/**
 * Copia de seguridad de la base, en caliente (no hace falta parar el servidor).
 *
 *   node scripts/backup.js [carpeta] [dias_a_conservar]
 *
 * Pensado para correr una vez por dia desde cron:
 *   0 22 * * *  cd /opt/consultas && /usr/bin/node scripts/backup.js /var/respaldos 30
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DB_FILE, ROOT } = require('../server/config');

const destino = process.argv[2] || path.join(ROOT, 'respaldos');
const conservar = Number(process.argv[3] || 30);

fs.mkdirSync(destino, { recursive: true });

const fecha = new Date().toISOString().slice(0, 10);
const archivo = path.join(destino, `coop-${fecha}.db`);

// VACUUM INTO deja una copia consistente aunque haya operadores cargando.
const db = new DatabaseSync(DB_FILE, { readOnly: true });
if (fs.existsSync(archivo)) fs.rmSync(archivo);
db.exec(`VACUUM INTO '${archivo.replace(/'/g, "''")}'`);
db.close();

const tam = (fs.statSync(archivo).size / 1024 / 1024).toFixed(1);
console.log(`Respaldo: ${archivo} (${tam} MB)`);

// Rotacion: se borran las copias mas viejas que el plazo pedido.
const limite = Date.now() - conservar * 86400000;
let borradas = 0;
for (const nombre of fs.readdirSync(destino)) {
  if (!/^coop-\d{4}-\d{2}-\d{2}\.db$/.test(nombre)) continue;
  const completo = path.join(destino, nombre);
  if (fs.statSync(completo).mtimeMs < limite) { fs.rmSync(completo); borradas++; }
}
if (borradas) console.log(`Se borraron ${borradas} copias de más de ${conservar} días.`);
