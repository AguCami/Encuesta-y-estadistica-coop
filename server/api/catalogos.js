'use strict';

const { all, get, run } = require('../db');
const { json, error, texto, enteroONull } = require('../util');
const { requiere } = require('../auth');

/** Todo lo que la interfaz necesita para dibujar los selectores. */
function catalogos({ res }) {
  json(res, {
    sectores: all('SELECT id, nombre, detalle, orden, puesto, activo FROM sectores ORDER BY orden, nombre'),
    motivos: all('SELECT id, sector_id, nombre, activo FROM motivos ORDER BY nombre'),
    canales: all('SELECT id, nombre, orden, activo FROM canales ORDER BY orden, nombre'),
    localidades: all('SELECT id, nombre, activo FROM localidades ORDER BY nombre'),
    operadores: all("SELECT id, usuario, nombre, rol, puesto, activo FROM usuarios ORDER BY nombre"),
    estados: [
      { id: 'resuelta', nombre: 'Solucionada' },
      { id: 'derivada', nombre: 'Derivada' },
      { id: 'pendiente', nombre: 'Pendiente' },
      { id: 'reclamo', nombre: 'Reclamo generado' },
    ],
    puestos: [
      { id: 'call_center', nombre: 'Call center' },
      { id: 'mesa_informes', nombre: 'Mesa de informes' },
      { id: 'otro', nombre: 'Otro' },
    ],
    prioridades: [
      { id: 'baja', nombre: 'Baja' },
      { id: 'normal', nombre: 'Normal' },
      { id: 'alta', nombre: 'Alta' },
    ],
  });
}

const TABLAS = {
  sectores: { campos: ['nombre', 'detalle', 'orden', 'puesto', 'activo'] },
  motivos: { campos: ['sector_id', 'nombre', 'activo'] },
  canales: { campos: ['nombre', 'orden', 'activo'] },
  localidades: { campos: ['nombre', 'activo'] },
};

function normalizar(tabla, body) {
  const d = {};
  if (body.nombre !== undefined) d.nombre = texto(body.nombre, 120);
  if (body.detalle !== undefined) d.detalle = texto(body.detalle, 300);
  if (body.orden !== undefined) d.orden = enteroONull(body.orden) ?? 100;
  if (body.activo !== undefined) d.activo = body.activo ? 1 : 0;
  if (tabla === 'motivos' && body.sector_id !== undefined) d.sector_id = enteroONull(body.sector_id);
  // El puesto decide en qué tablero de atención rápida aparece el grupo.
  if (tabla === 'sectores' && body.puesto !== undefined) {
    d.puesto = ['call_center', 'mesa_informes', 'ambos'].includes(body.puesto) ? body.puesto : 'ambos';
  }
  return d;
}

const crear = requiere('supervisor', ({ res, params, body }) => {
  const tabla = params.tabla;
  if (!TABLAS[tabla]) return error(res, 404, 'Catalogo inexistente');
  const d = normalizar(tabla, body);
  if (!d.nombre) return error(res, 400, 'El nombre es obligatorio');
  if (tabla === 'motivos' && !d.sector_id) return error(res, 400, 'El motivo necesita un sector');
  const campos = Object.keys(d);
  try {
    const r = run(`INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
      campos.map((c) => d[c]));
    json(res, get(`SELECT * FROM ${tabla} WHERE id = ?`, [Number(r.lastInsertRowid)]), 201);
  } catch (e) {
    error(res, 409, /UNIQUE/i.test(e.message) ? 'Ya existe un registro con ese nombre' : e.message);
  }
});

const editar = requiere('supervisor', ({ res, params, body }) => {
  const tabla = params.tabla;
  if (!TABLAS[tabla]) return error(res, 404, 'Catalogo inexistente');
  const id = enteroONull(params.id);
  if (!get(`SELECT id FROM ${tabla} WHERE id = ?`, [id])) return error(res, 404, 'No encontrado');
  const d = normalizar(tabla, body);
  const campos = Object.keys(d);
  if (!campos.length) return error(res, 400, 'Nada para actualizar');
  try {
    run(`UPDATE ${tabla} SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...campos.map((c) => d[c]), id]);
    json(res, get(`SELECT * FROM ${tabla} WHERE id = ?`, [id]));
  } catch (e) {
    error(res, 409, /UNIQUE/i.test(e.message) ? 'Ya existe un registro con ese nombre' : e.message);
  }
});

/**
 * No se borra: se desactiva. Las consultas historicas siguen apuntando al
 * registro, asi las estadisticas viejas no pierden el nombre del sector.
 */
const desactivar = requiere('supervisor', ({ res, params }) => {
  const tabla = params.tabla;
  if (!TABLAS[tabla]) return error(res, 404, 'Catalogo inexistente');
  const id = enteroONull(params.id);
  run(`UPDATE ${tabla} SET activo = 0 WHERE id = ?`, [id]);
  json(res, { ok: true });
});

module.exports = { catalogos, crear, editar, desactivar };
