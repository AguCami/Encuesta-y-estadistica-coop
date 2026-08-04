'use strict';

const { TZ } = require('./config');

// --------------------------------------------------------------- fechas ---

const fmtFecha = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

/** Devuelve { ts, fecha, hora, dow } en la zona horaria de la cooperativa. */
function partesFecha(date = new Date()) {
  // 'sv-SE' produce 'YYYY-MM-DD HH:MM:SS'
  const s = fmtFecha.format(date).replace(' ', 'T');
  const fecha = s.slice(0, 10);
  const hora = Number(s.slice(11, 13));
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return { ts: s, fecha, hora, dow };
}

function hoy() {
  return partesFecha().fecha;
}

function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Rango por defecto: ultimos 30 dias (incluyendo hoy). */
function rangoDesdeQuery(q) {
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(q.hasta || '') ? q.hasta : hoy();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(q.desde || '') ? q.desde : sumarDias(hasta, -29);
  return { desde, hasta };
}

// ----------------------------------------------------------- respuestas ---

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function error(res, status, mensaje) {
  json(res, { error: mensaje }, status);
}

async function leerJson(req, limite = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > limite) { reject(new Error('cuerpo demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('JSON invalido')); }
    });
    req.on('error', reject);
  });
}

// ------------------------------------------------------------------ csv ---

function csv(res, nombreArchivo, filas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // separador ';' + BOM: Excel en es-AR lo abre en columnas sin importar nada
  const texto = '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
  const body = Buffer.from(texto, 'utf8');
  res.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${nombreArchivo}"`,
    'content-length': body.length,
  });
  res.end(body);
}

// --------------------------------------------------------------- varios ---

const enteroONull = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const texto = (v, max = 500) => String(v ?? '').trim().slice(0, max);

const enRango = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

module.exports = {
  partesFecha, hoy, sumarDias, rangoDesdeQuery,
  json, error, leerJson, csv,
  enteroONull, texto, enRango,
};
