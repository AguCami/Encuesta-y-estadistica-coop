'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DB_FILE, DATA_DIR } = require('./config');
const { hashPassword } = require('./auth-hash');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sectores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL UNIQUE,
  detalle   TEXT NOT NULL DEFAULT '',
  orden     INTEGER NOT NULL DEFAULT 100,
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
  estado        TEXT NOT NULL DEFAULT 'resuelta', -- resuelta | derivada | pendiente | reclamo
  prioridad     TEXT NOT NULL DEFAULT 'normal',   -- baja | normal | alta
  primer_contacto INTEGER NOT NULL DEFAULT 1,     -- resuelta en el primer contacto
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
  origen        TEXT NOT NULL DEFAULT 'operador', -- operador | link | qr
  creada        TEXT NOT NULL,
  respondida    TEXT,
  fecha         TEXT,                             -- fecha de respuesta
  satisfaccion  INTEGER,   -- 1..5  conformidad general
  resolucion    INTEGER,   -- 1..5  se resolvio lo que necesitaba
  atencion      INTEGER,   -- 1..5  trato / claridad
  espera        INTEGER,   -- 1..5  tiempo de espera
  recomendaria  INTEGER,   -- 0..10 (NPS)
  comentario    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_enc_fecha  ON encuestas(fecha);
CREATE INDEX IF NOT EXISTS ix_enc_sector ON encuestas(sector_id);
`;

db.exec(SCHEMA);

// Migraciones livianas: agregan columnas a bases ya creadas sin perder datos.
const columnas = (tabla) => db.prepare(`PRAGMA table_info(${tabla})`).all().map((c) => c.name);
if (!columnas('sectores').includes('puesto')) {
  // call_center | mesa_informes | ambos — define en qué tablero aparece el grupo
  db.exec("ALTER TABLE sectores ADD COLUMN puesto TEXT NOT NULL DEFAULT 'ambos'");
}

// ---------------------------------------------------------------- helpers ---

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

// ------------------------------------------------------------------ seed ---

const SECTORES = [
  // call center
  ['Cortes por falta de pago', 'Plazos, información y reconexiones', 10, 'call_center'],
  ['Ventas', 'Altas de servicios y gestiones comerciales', 20, 'call_center'],
  ['Reclamos', 'Fallas y reclamos de servicio', 30, 'call_center'],
  ['TIC', 'Internet, IPTV y servicios de conectividad', 40, 'call_center'],
  ['Pagos', 'Acreditación e información de pagos', 50, 'call_center'],
  // mesa de informes: las areas del totem de turnos, agrupadas como en el salon
  ['Mesa Sector 1', 'Reclamos, trámites, notas y proveedores', 60, 'mesa_informes'],
  ['Mesa Sector 2', 'RRHH, internet, obras y bienestar', 70, 'mesa_informes'],
  ['Consultas de mostrador', 'Lo que se resuelve en el momento, sin turno', 80, 'mesa_informes'],
];

const MOTIVOS = {
  'Cortes por falta de pago': ['Plazo', 'Información', 'Reconexiones'],
  'Ventas': ['Servicios sociales', 'TIC', 'Movilcoop', 'Luz', 'Agua', 'Cambios de titularidad',
    'Traslados de servicios', 'Solicitar lectura', 'Baja de servicio'],
  'Reclamos': ['Mucho consumo (luz)', 'Mucho consumo (agua)', 'Pérdida de agua', 'Poda',
    'Sin luz', 'Sin agua', 'Error de facturación', 'Estado del reclamo'],
  'TIC': ['Reclamos', 'Consultas', 'Lentitud', 'Micro cortes', 'Problemas IPTV', 'Sensa'],
  'Pagos': ['Roela no impactado', 'Información'],
  'Mesa Sector 1': ['Reclamos', 'Trámites y ventas', 'Entrega de notas', 'Proveedores'],
  'Mesa Sector 2': ['Recursos humanos', 'Reclamos internet / IPTV', 'Oficina técnica',
    'Red Bienestar Cooperativo'],
  'Consultas de mostrador': ['Estados de cuenta', 'Información general', 'Boletas',
    'Actualización de datos', 'Reconexiones', 'Apros', 'Prórroga'],
};

const CANALES = [['Telefonico', 10], ['Presencial', 20], ['WhatsApp', 30], ['Email', 40], ['Web / Redes', 50]];

function seed() {
  const yaHay = get('SELECT COUNT(*) AS n FROM sectores').n;
  if (!yaHay) {
    for (const [nombre, detalle, orden, puesto] of SECTORES) {
      run('INSERT INTO sectores (nombre, detalle, orden, puesto) VALUES (?, ?, ?, ?)',
        [nombre, detalle, orden, puesto]);
    }
    for (const [nombreSector, motivos] of Object.entries(MOTIVOS)) {
      const s = get('SELECT id FROM sectores WHERE nombre = ?', [nombreSector]);
      for (const m of motivos) {
        run('INSERT INTO motivos (sector_id, nombre) VALUES (?, ?)', [s.id, m]);
      }
    }
  }

  if (!get('SELECT COUNT(*) AS n FROM canales').n) {
    for (const [nombre, orden] of CANALES) {
      run('INSERT INTO canales (nombre, orden) VALUES (?, ?)', [nombre, orden]);
    }
  }

  if (!get('SELECT COUNT(*) AS n FROM usuarios').n) {
    const creado = new Date().toISOString();
    run('INSERT INTO usuarios (usuario, nombre, hash, rol, puesto, creado) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin', 'Administrador', hashPassword('admin'), 'admin', 'otro', creado]);
  }
}

seed();

module.exports = { db, all, get, run, seed };
