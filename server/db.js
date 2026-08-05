'use strict';

/**
 * Acceso a datos. La base es SQLite:
 *   - en desarrollo, un archivo local (`file:./data/coop.db`);
 *   - en producción, la misma base en la nube (Turso), con las mismas
 *     consultas — solo cambia la dirección.
 *
 * Todo el acceso es asincrónico porque en la nube la base está del otro
 * lado de la red.
 */

const fs = require('node:fs');
const { DB_URL, DB_TOKEN, DATA_DIR, EN_ARCHIVO } = require('./config');
const { hashPassword } = require('./auth-hash');

// Contra un archivo local hace falta el cliente completo; contra la base en la
// nube alcanza el cliente "web", que habla por HTTP y no arrastra binarios
// nativos (importante para que entre en una función sin servidor).
const { createClient } = EN_ARCHIVO
  ? require('@libsql/client')
  : require('@libsql/client/web');

if (EN_ARCHIVO) fs.mkdirSync(DATA_DIR, { recursive: true });

const cliente = createClient(DB_TOKEN ? { url: DB_URL, authToken: DB_TOKEN } : { url: DB_URL });

// ---------------------------------------------------------------- consultas ---

const normalizar = (fila) => (fila ? Object.fromEntries(
  Object.entries(fila).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])) : fila);

async function all(sql, params = []) {
  const r = await cliente.execute({ sql, args: params });
  return r.rows.map(normalizar);
}

async function get(sql, params = []) {
  const r = await cliente.execute({ sql, args: params });
  return normalizar(r.rows[0]);
}

async function run(sql, params = []) {
  const r = await cliente.execute({ sql, args: params });
  return {
    lastInsertRowid: r.lastInsertRowid === undefined ? null : Number(r.lastInsertRowid),
    cambios: r.rowsAffected,
  };
}

/** Varias sentencias de una (esquema, migraciones). */
async function ejecutar(sql) {
  const sentencias = sql.split(';').map((s) => s.trim()).filter(Boolean);
  await cliente.batch(sentencias, 'write');
}

// ------------------------------------------------------------------ esquema ---

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sectores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL UNIQUE,
  detalle   TEXT NOT NULL DEFAULT '',
  orden     INTEGER NOT NULL DEFAULT 100,
  puesto    TEXT NOT NULL DEFAULT 'ambos',   -- call_center | mesa_informes | ambos
  activo    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS motivos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER REFERENCES sectores(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  activo    INTEGER NOT NULL DEFAULT 1,
  UNIQUE (sector_id, nombre)
);

CREATE TABLE IF NOT EXISTS canales (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL UNIQUE,
  orden     INTEGER NOT NULL DEFAULT 100,
  activo    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS localidades (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL UNIQUE,
  activo    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usuarios (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario   TEXT NOT NULL UNIQUE,
  nombre    TEXT NOT NULL,
  hash      TEXT NOT NULL,
  rol       TEXT NOT NULL DEFAULT 'operador',   -- operador | supervisor | admin
  puesto    TEXT NOT NULL DEFAULT 'call_center',-- call_center | mesa_informes | otro
  activo    INTEGER NOT NULL DEFAULT 1,
  creado    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  id        TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creada    TEXT NOT NULL,
  expira    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consultas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,      -- 'YYYY-MM-DDTHH:MM:SS' hora local de la cooperativa
  fecha         TEXT NOT NULL,      -- 'YYYY-MM-DD'
  hora          INTEGER NOT NULL,   -- 0..23
  dow           INTEGER NOT NULL,   -- 0=domingo .. 6=sabado
  operador_id   INTEGER REFERENCES usuarios(id),
  puesto        TEXT NOT NULL DEFAULT 'call_center',
  canal_id      INTEGER REFERENCES canales(id),
  sector_id     INTEGER REFERENCES sectores(id),
  motivo_id     INTEGER REFERENCES motivos(id),
  localidad_id  INTEGER REFERENCES localidades(id),
  socio_nro     TEXT NOT NULL DEFAULT '',
  socio_nombre  TEXT NOT NULL DEFAULT '',
  contacto      TEXT NOT NULL DEFAULT '',
  estado        TEXT NOT NULL DEFAULT 'resuelta', -- resuelta | pendiente | derivada | reclamo
  prioridad     TEXT NOT NULL DEFAULT 'normal',
  primer_contacto INTEGER NOT NULL DEFAULT 1,
  duracion_seg  INTEGER NOT NULL DEFAULT 0,
  reclamo_nro   TEXT NOT NULL DEFAULT '',
  observaciones TEXT NOT NULL DEFAULT '',
  cerrada_ts    TEXT,
  cerrada_por   INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS ix_consultas_fecha   ON consultas(fecha);
CREATE INDEX IF NOT EXISTS ix_consultas_sector  ON consultas(sector_id, fecha);
CREATE INDEX IF NOT EXISTS ix_consultas_estado  ON consultas(estado);
CREATE INDEX IF NOT EXISTS ix_consultas_oper    ON consultas(operador_id, fecha);
CREATE INDEX IF NOT EXISTS ix_consultas_socio   ON consultas(socio_nro);

CREATE TABLE IF NOT EXISTS seguimientos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  ts          TEXT NOT NULL,
  usuario_id  INTEGER REFERENCES usuarios(id),
  estado      TEXT NOT NULL DEFAULT '',
  nota        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_seg_consulta ON seguimientos(consulta_id);

CREATE TABLE IF NOT EXISTS encuestas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT UNIQUE,
  consulta_id   INTEGER REFERENCES consultas(id) ON DELETE SET NULL,
  sector_id     INTEGER REFERENCES sectores(id),
  canal_id      INTEGER REFERENCES canales(id),
  operador_id   INTEGER REFERENCES usuarios(id),
  origen        TEXT NOT NULL DEFAULT 'operador',
  creada        TEXT NOT NULL,
  respondida    TEXT,
  fecha         TEXT,
  satisfaccion  INTEGER,
  resolucion    INTEGER,
  atencion      INTEGER,
  espera        INTEGER,
  recomendaria  INTEGER,
  comentario    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_enc_fecha  ON encuestas(fecha);
CREATE INDEX IF NOT EXISTS ix_enc_sector ON encuestas(sector_id)
`;

// -------------------------------------------------------------------- seed ---

const SECTORES = [
  // call center
  ['Cortes por falta de pago', 'Plazos, información y reconexiones', 10, 'call_center'],
  ['Ventas', 'Altas de servicios y gestiones comerciales', 20, 'call_center'],
  ['Reclamos', 'Fallas y reclamos de servicio', 30, 'call_center'],
  ['TIC', 'Internet, IPTV y servicios de conectividad', 40, 'call_center'],
  ['Pagos', 'Acreditación e información de pagos', 50, 'call_center'],
  // mesa de informes: todo en un solo grupo, como se atiende en el mostrador
  ['Mesa de informes', 'Atención presencial en el mostrador', 60, 'mesa_informes'],
];

const MOTIVOS = {
  'Cortes por falta de pago': ['Plazo', 'Información', 'Reconexiones'],
  'Ventas': ['Servicios sociales', 'TIC', 'Movilcoop', 'Luz', 'Agua', 'Cambios de titularidad',
    'Traslados de servicios', 'Solicitar lectura', 'Baja de servicio'],
  'Reclamos': ['Mucho consumo (luz)', 'Mucho consumo (agua)', 'Pérdida de agua', 'Poda',
    'Sin luz', 'Sin agua', 'Error de facturación', 'Estado del reclamo'],
  'TIC': ['Reclamos', 'Consultas', 'Lentitud', 'Micro cortes', 'Problemas IPTV', 'Sensa'],
  'Pagos': ['Roela no impactado', 'Información'],
  'Mesa de informes': ['Reclamos', 'Trámites y ventas', 'Entrega de notas', 'Proveedores',
    'Recursos humanos', 'Reclamos internet / IPTV', 'Oficina técnica', 'Red Bienestar Cooperativo',
    'Estados de cuenta', 'Información general', 'Boletas', 'Actualización de datos',
    'Reconexiones', 'Apros', 'Prórroga'],
};

const CANALES = [['Telefonico', 10], ['Presencial', 20], ['WhatsApp', 30], ['Email', 40], ['Web / Redes', 50]];

// Clave con la que entra cada uno la primera vez; se cambia desde "Mi clave".
const CLAVE_INICIAL = process.env.CLAVE_INICIAL || 'coop2026';

const USUARIOS = [
  ['acami', 'Cami, Agustín', 'admin', 'otro'],   // administra y puede atender en cualquier puesto
  ['alenarduzzi', 'Lenarduzzi, Andres Alejandro', 'operador', 'call_center'],
  ['crodriguez', 'Rodriguez, Cristian Adrian', 'operador', 'call_center'],
  ['emoyano', 'Moyano, Emilio Noel', 'operador', 'call_center'],
  ['proggero', 'Roggero, Pablo Gustavo', 'operador', 'mesa_informes'],
];

async function seed() {
  if (!(await get('SELECT COUNT(*) AS n FROM sectores')).n) {
    for (const [nombre, detalle, orden, puesto] of SECTORES) {
      await run('INSERT INTO sectores (nombre, detalle, orden, puesto) VALUES (?, ?, ?, ?)',
        [nombre, detalle, orden, puesto]);
    }
    for (const [nombreSector, motivos] of Object.entries(MOTIVOS)) {
      const s = await get('SELECT id FROM sectores WHERE nombre = ?', [nombreSector]);
      for (const m of motivos) {
        await run('INSERT INTO motivos (sector_id, nombre) VALUES (?, ?)', [s.id, m]);
      }
    }
  }

  if (!(await get('SELECT COUNT(*) AS n FROM canales')).n) {
    for (const [nombre, orden] of CANALES) {
      await run('INSERT INTO canales (nombre, orden) VALUES (?, ?)', [nombre, orden]);
    }
  }

  // El personal de la cooperativa. Se crea el que falte, sin tocar los que ya
  // existen: si alguien cambió su clave o fue desactivado, queda como está.
  for (const [usuario, nombre, rol, puesto] of USUARIOS) {
    if (await get('SELECT id FROM usuarios WHERE usuario = ?', [usuario])) continue;
    await run('INSERT INTO usuarios (usuario, nombre, hash, rol, puesto, creado) VALUES (?, ?, ?, ?, ?, ?)',
      [usuario, nombre, hashPassword(CLAVE_INICIAL), rol, puesto, new Date().toISOString()]);
  }
}

/**
 * Prepara la base una sola vez por proceso. En un entorno sin servidor cada
 * arranque en frío la vuelve a llamar, por eso tiene que ser barata y no
 * romper si ya está todo hecho.
 */
let preparacion;
function iniciar() {
  preparacion ||= (async () => {
    await ejecutar(SCHEMA);
    await seed();
  })();
  return preparacion;
}

module.exports = { cliente, all, get, run, ejecutar, iniciar, seed, SCHEMA };
