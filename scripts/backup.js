'use strict';

/**
 * Copia de seguridad de los datos, en caliente y sin parar nada.
 *
 *   node scripts/backup.js [carpeta] [dias_a_conservar]
 *
 * Sirve igual contra el archivo local o contra la base en la nube: baja todo
 * a un JSON con fecha y va borrando las copias viejas.
 *
 * En el hosting no hace falta: Turso guarda su propio historial y el
 * administrador puede bajar el respaldo desde /api/respaldo.
 */

const fs = require('node:fs');
const path = require('node:path');
const { all, iniciar } = require('../server/db');
const { ROOT, DB_URL } = require('../server/config');

const TABLAS = ['sectores', 'motivos', 'canales', 'localidades', 'usuarios',
  'consultas', 'seguimientos', 'encuestas'];

const destino = process.argv[2] || path.join(ROOT, 'respaldos');
const conservar = Number(process.argv[3] || 30);

(async () => {
  await iniciar();
  fs.mkdirSync(destino, { recursive: true });

  const datos = { generado: new Date().toISOString(), origen: DB_URL, tablas: {} };
  for (const t of TABLAS) datos.tablas[t] = await all(`SELECT * FROM ${t}`);

  const archivo = path.join(destino, `coop-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 1));
  const tam = (fs.statSync(archivo).size / 1024 / 1024).toFixed(2);
  console.log(`Respaldo: ${archivo} (${tam} MB, ${datos.tablas.consultas.length} consultas)`);

  // Rotacion: se borran las copias mas viejas que el plazo pedido.
  const limite = Date.now() - conservar * 86400000;
  let borradas = 0;
  for (const nombre of fs.readdirSync(destino)) {
    if (!/^coop-\d{4}-\d{2}-\d{2}\.json$/.test(nombre)) continue;
    const completo = path.join(destino, nombre);
    if (fs.statSync(completo).mtimeMs < limite) { fs.rmSync(completo); borradas++; }
  }
  if (borradas) console.log(`Se borraron ${borradas} copias de más de ${conservar} días.`);
})().catch((e) => { console.error(e); process.exit(1); });
