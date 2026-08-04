'use strict';

const { rangoDesdeQuery } = require('./util');

/**
 * Traduce los parametros de la query (?desde=&hasta=&sector_id=...) en un
 * WHERE con parametros posicionales, compartido por el listado y por todas
 * las estadisticas para que ambos muestren siempre lo mismo.
 */
function filtroConsultas(q) {
  const { desde, hasta } = rangoDesdeQuery(q);
  const where = ['c.fecha BETWEEN ? AND ?'];
  const params = [desde, hasta];

  const igual = (campo, valor) => {
    const n = Number.parseInt(valor, 10);
    if (Number.isFinite(n)) { where.push(`c.${campo} = ?`); params.push(n); }
  };
  igual('sector_id', q.sector_id);
  igual('motivo_id', q.motivo_id);
  igual('canal_id', q.canal_id);
  igual('operador_id', q.operador_id);
  igual('localidad_id', q.localidad_id);

  if (q.estado) { where.push('c.estado = ?'); params.push(String(q.estado)); }
  if (q.puesto) { where.push('c.puesto = ?'); params.push(String(q.puesto)); }
  if (q.prioridad) { where.push('c.prioridad = ?'); params.push(String(q.prioridad)); }

  const texto = String(q.q || '').trim();
  if (texto) {
    where.push('(c.socio_nro LIKE ? OR c.socio_nombre LIKE ? OR c.observaciones LIKE ? OR c.reclamo_nro LIKE ?)');
    const like = `%${texto}%`;
    params.push(like, like, like, like);
  }

  return { sql: where.join(' AND '), params, desde, hasta };
}

/** Mismo criterio, pero sobre la tabla de encuestas respondidas. */
function filtroEncuestas(q) {
  const { desde, hasta } = rangoDesdeQuery(q);
  // Condiciones que no dependen de la fecha: sirven tanto para las respuestas
  // como para contar las encuestas enviadas (que se fechan por su creacion).
  const extra = [];
  const extraParams = [];
  for (const campo of ['sector_id', 'canal_id', 'operador_id']) {
    const n = Number.parseInt(q[campo], 10);
    if (Number.isFinite(n)) { extra.push(`e.${campo} = ?`); extraParams.push(n); }
  }
  const sql = ['e.respondida IS NOT NULL', 'e.fecha BETWEEN ? AND ?', ...extra].join(' AND ');
  return {
    sql,
    params: [desde, hasta, ...extraParams],
    extraSql: extra.length ? ` AND ${extra.join(' AND ')}` : '',
    extraParams,
    desde,
    hasta,
  };
}

module.exports = { filtroConsultas, filtroEncuestas };
