'use strict';

const { all, get } = require('../db');
const { json, sumarDias, csv, granularidad, inicioPeriodo, siguientePeriodo } = require('../util');
const { filtroConsultas, filtroEncuestas } = require('../filtros');
const { requiere } = require('../auth');

const redondear = (n, d = 1) => (n === null || n === undefined ? null : Number(Number(n).toFixed(d)));

function diasEntre(desde, hasta) {
  const a = new Date(`${desde}T12:00:00Z`), b = new Date(`${hasta}T12:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/**
 * Arma la serie con el paso que corresponda (día, semana o mes) y sin huecos:
 * los períodos sin consultas valen cero, para que la línea no mienta.
 */
function serieCompleta(desde, hasta, filas, gran) {
  const acum = new Map();
  for (const f of filas) {
    const k = inicioPeriodo(f.fecha, gran);
    acum.set(k, (acum.get(k) || 0) + f.total);
  }
  const salida = [];
  const fin = inicioPeriodo(hasta, gran);
  for (let d = inicioPeriodo(desde, gran); d <= fin; d = siguientePeriodo(d, gran)) {
    salida.push({ fecha: d, total: acum.get(d) || 0 });
  }
  return salida;
}

/** Estadistica general del periodo, con el mismo filtro que usa el listado. */
const general = requiere('admin', async ({ res, query }) => {
  const f = filtroConsultas(query);
  const W = f.sql, P = f.params;
  const dias = diasEntre(f.desde, f.hasta);

  const resumen = await get(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN c.estado = 'resuelta'  THEN 1 ELSE 0 END) AS resueltas,
           SUM(CASE WHEN c.estado = 'derivada'  THEN 1 ELSE 0 END) AS derivadas,
           SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
           SUM(CASE WHEN c.estado = 'reclamo'   THEN 1 ELSE 0 END) AS reclamos,
           SUM(c.primer_contacto) AS primer_contacto,
           SUM(CASE WHEN c.duracion_seg > 0 THEN 1 ELSE 0 END) AS con_duracion,
           SUM(c.duracion_seg) AS duracion_total,
           COUNT(DISTINCT c.socio_nro) AS socios
      FROM consultas c WHERE ${W}`, P);

  const total = resumen.total || 0;

  // Periodo inmediatamente anterior de igual longitud, para la variacion.
  const anterior = await (async () => {
    const hastaPrev = sumarDias(f.desde, -1);
    const desdePrev = sumarDias(hastaPrev, -(dias - 1));
    const q2 = { ...query, desde: desdePrev, hasta: hastaPrev };
    const f2 = filtroConsultas(q2);
    const previo = await get(`SELECT COUNT(*) AS n FROM consultas c WHERE ${f2.sql}`, f2.params);
    return { desde: desdePrev, hasta: hastaPrev, total: previo.n };
  })();

  const porSector = await all(`
    SELECT s.id, s.nombre,
           COUNT(*) AS total,
           SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
           SUM(CASE WHEN c.estado = 'derivada'  THEN 1 ELSE 0 END) AS derivadas,
           SUM(CASE WHEN c.estado = 'reclamo'   THEN 1 ELSE 0 END) AS reclamos,
           SUM(c.primer_contacto) AS primer_contacto,
           SUM(c.duracion_seg) AS duracion_total,
           SUM(CASE WHEN c.duracion_seg > 0 THEN 1 ELSE 0 END) AS con_duracion
      FROM consultas c JOIN sectores s ON s.id = c.sector_id
     WHERE ${W} GROUP BY s.id ORDER BY total DESC`, P);

  const porMotivo = await all(`
    SELECT m.id, m.nombre, s.nombre AS sector, COUNT(*) AS total
      FROM consultas c JOIN motivos m ON m.id = c.motivo_id
      LEFT JOIN sectores s ON s.id = m.sector_id
     WHERE ${W} GROUP BY m.id ORDER BY total DESC LIMIT 15`, P);

  const porCanal = await all(`
    SELECT ca.id, ca.nombre, COUNT(*) AS total
      FROM consultas c JOIN canales ca ON ca.id = c.canal_id
     WHERE ${W} GROUP BY ca.id ORDER BY total DESC`, P);

  const porEstado = await all(`
    SELECT c.estado AS nombre, COUNT(*) AS total
      FROM consultas c WHERE ${W} GROUP BY c.estado ORDER BY total DESC`, P);

  const porPuesto = await all(`
    SELECT c.puesto AS nombre, COUNT(*) AS total
      FROM consultas c WHERE ${W} GROUP BY c.puesto ORDER BY total DESC`, P);

  const porOperador = await all(`
    SELECT u.id, u.nombre, u.puesto, COUNT(*) AS total,
           SUM(c.primer_contacto) AS primer_contacto,
           SUM(c.duracion_seg) AS duracion_total,
           SUM(CASE WHEN c.duracion_seg > 0 THEN 1 ELSE 0 END) AS con_duracion
      FROM consultas c JOIN usuarios u ON u.id = c.operador_id
     WHERE ${W} GROUP BY u.id ORDER BY total DESC`, P);

  const porLocalidad = await all(`
    SELECT l.id, l.nombre, COUNT(*) AS total
      FROM consultas c JOIN localidades l ON l.id = c.localidad_id
     WHERE ${W} GROUP BY l.id ORDER BY total DESC LIMIT 12`, P);

  const gran = granularidad(dias);
  const serie = serieCompleta(f.desde, f.hasta, await all(`
    SELECT c.fecha, COUNT(*) AS total
      FROM consultas c WHERE ${W} GROUP BY c.fecha ORDER BY c.fecha`, P), gran);

  const heat = await all(`
    SELECT c.dow, c.hora, COUNT(*) AS total
      FROM consultas c WHERE ${W} GROUP BY c.dow, c.hora`, P);

  // Evolucion de los 6 sectores con mas consultas (se dibuja en pequenos multiplos).
  const topSectores = porSector.slice(0, 6).map((s) => s.id);
  let serieSector = [];
  if (topSectores.length) {
    const marcas = topSectores.map(() => '?').join(',');
    const crudo = await all(`
      SELECT c.sector_id, c.fecha, COUNT(*) AS total
        FROM consultas c
       WHERE ${W} AND c.sector_id IN (${marcas})
       GROUP BY c.sector_id, c.fecha ORDER BY c.fecha`, [...P, ...topSectores]);
    // Cada sector con el mismo paso y los mismos períodos que la serie general.
    for (const sid of topSectores) {
      for (const punto of serieCompleta(f.desde, f.hasta, crudo.filter((x) => x.sector_id === sid), gran)) {
        serieSector.push({ sector_id: sid, ...punto });
      }
    }
  }

  const fe = filtroEncuestas(query);
  const resumenEncuestas = await get(`
    SELECT COUNT(*) AS respondidas, AVG(e.satisfaccion) AS satisfaccion
      FROM encuestas e WHERE ${fe.sql}`, fe.params);

  json(res, {
    periodo: { desde: f.desde, hasta: f.hasta, dias, granularidad: gran },
    resumen: {
      total,
      promedio_dia: redondear(total / dias, 1),
      resueltas: resumen.resueltas || 0,
      derivadas: resumen.derivadas || 0,
      pendientes: resumen.pendientes || 0,
      reclamos: resumen.reclamos || 0,
      pct_primer_contacto: total ? redondear((resumen.primer_contacto / total) * 100, 1) : null,
      pct_pendientes: total ? redondear(((resumen.pendientes || 0) / total) * 100, 1) : null,
      duracion_prom_min: resumen.con_duracion ? redondear(resumen.duracion_total / resumen.con_duracion / 60, 1) : null,
      socios_distintos: resumen.socios || 0,
      anterior: anterior.total,
      variacion_pct: anterior.total ? redondear(((total - anterior.total) / anterior.total) * 100, 1) : null,
      periodo_anterior: { desde: anterior.desde, hasta: anterior.hasta },
      satisfaccion: redondear(resumenEncuestas.satisfaccion, 2),
      encuestas_respondidas: resumenEncuestas.respondidas || 0,
    },
    por_sector: porSector.map((s) => ({
      ...s,
      pct: total ? redondear((s.total / total) * 100, 1) : 0,
      pct_primer_contacto: s.total ? redondear((s.primer_contacto / s.total) * 100, 1) : null,
      duracion_prom_min: s.con_duracion ? redondear(s.duracion_total / s.con_duracion / 60, 1) : null,
    })),
    por_motivo: porMotivo,
    por_canal: porCanal,
    por_estado: porEstado,
    por_puesto: porPuesto,
    por_operador: porOperador.map((o) => ({
      ...o,
      pct_primer_contacto: o.total ? redondear((o.primer_contacto / o.total) * 100, 1) : null,
      duracion_prom_min: o.con_duracion ? redondear(o.duracion_total / o.con_duracion / 60, 1) : null,
    })),
    por_localidad: porLocalidad,
    serie,
    serie_sector: serieSector,
    heatmap: heat,
  });
});

/** Detalle de la encuesta de satisfaccion. */
const encuestas = requiere('admin', async ({ res, query }) => {
  const f = filtroEncuestas(query);
  const rango = f.params;
  const base = f.sql;

  const resumen = await get(`
    SELECT COUNT(*) AS respondidas,
           AVG(e.satisfaccion) AS satisfaccion, AVG(e.resolucion) AS resolucion,
           AVG(e.atencion) AS atencion, AVG(e.espera) AS espera,
           AVG(e.recomendaria) AS recomendaria,
           SUM(CASE WHEN e.recomendaria >= 9 THEN 1 ELSE 0 END) AS promotores,
           SUM(CASE WHEN e.recomendaria <= 6 THEN 1 ELSE 0 END) AS detractores,
           SUM(CASE WHEN e.recomendaria IS NOT NULL THEN 1 ELSE 0 END) AS con_nps,
           SUM(CASE WHEN e.satisfaccion >= 4 THEN 1 ELSE 0 END) AS conformes
      FROM encuestas e WHERE ${base}`, rango);

  const enviadas = (await get(
    `SELECT COUNT(*) AS n FROM encuestas e WHERE e.creada BETWEEN ? AND ?${f.extraSql}`,
    [`${f.desde}T00:00:00`, `${f.hasta}T23:59:59`, ...f.extraParams])).n;

  const distribucion = await all(`
    SELECT e.satisfaccion AS valor, COUNT(*) AS total
      FROM encuestas e WHERE ${base} AND e.satisfaccion IS NOT NULL
     GROUP BY e.satisfaccion ORDER BY e.satisfaccion`, rango);

  const porSector = await all(`
    SELECT s.id, s.nombre, COUNT(*) AS respuestas,
           AVG(e.satisfaccion) AS satisfaccion, AVG(e.resolucion) AS resolucion,
           AVG(e.atencion) AS atencion, AVG(e.espera) AS espera
      FROM encuestas e JOIN sectores s ON s.id = e.sector_id
     WHERE ${base} GROUP BY s.id ORDER BY respuestas DESC`, rango);

  const porCanal = await all(`
    SELECT ca.nombre, COUNT(*) AS respuestas, AVG(e.satisfaccion) AS satisfaccion
      FROM encuestas e JOIN canales ca ON ca.id = e.canal_id
     WHERE ${base} GROUP BY ca.id ORDER BY respuestas DESC`, rango);

  const serie = await all(`
    SELECT e.fecha, COUNT(*) AS respuestas, AVG(e.satisfaccion) AS satisfaccion
      FROM encuestas e WHERE ${base} GROUP BY e.fecha ORDER BY e.fecha`, rango);

  const comentarios = await all(`
    SELECT e.respondida, e.satisfaccion, e.comentario, s.nombre AS sector
      FROM encuestas e LEFT JOIN sectores s ON s.id = e.sector_id
     WHERE ${base} AND e.comentario <> ''
     ORDER BY e.respondida DESC LIMIT 30`, rango);

  const n = resumen.respondidas || 0;
  json(res, {
    periodo: { desde: f.desde, hasta: f.hasta },
    resumen: {
      enviadas,
      respondidas: n,
      tasa_respuesta: enviadas ? redondear((n / enviadas) * 100, 1) : null,
      satisfaccion: redondear(resumen.satisfaccion, 2),
      resolucion: redondear(resumen.resolucion, 2),
      atencion: redondear(resumen.atencion, 2),
      espera: redondear(resumen.espera, 2),
      csat: n ? redondear((resumen.conformes / n) * 100, 1) : null,
      nps: resumen.con_nps ? Math.round(((resumen.promotores - resumen.detractores) / resumen.con_nps) * 100) : null,
    },
    distribucion,
    por_sector: porSector.map((s) => ({
      ...s,
      satisfaccion: redondear(s.satisfaccion, 2),
      resolucion: redondear(s.resolucion, 2),
      atencion: redondear(s.atencion, 2),
      espera: redondear(s.espera, 2),
    })),
    por_canal: porCanal.map((c) => ({ ...c, satisfaccion: redondear(c.satisfaccion, 2) })),
    serie: serie.map((s) => ({ ...s, satisfaccion: redondear(s.satisfaccion, 2) })),
    comentarios,
  });
});

/** Resumen listo para imprimir/pegar en el informe mensual (CSV por sector). */
const exportarResumen = requiere('admin', async ({ res, query }) => {
  const f = filtroConsultas(query);
  const filas = await all(`
    SELECT s.nombre AS sector, m.nombre AS motivo, COUNT(*) AS total,
           SUM(CASE WHEN c.estado = 'resuelta'  THEN 1 ELSE 0 END) AS resueltas,
           SUM(CASE WHEN c.estado = 'derivada'  THEN 1 ELSE 0 END) AS derivadas,
           SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
           SUM(CASE WHEN c.estado = 'reclamo'   THEN 1 ELSE 0 END) AS reclamos
      FROM consultas c
      LEFT JOIN sectores s ON s.id = c.sector_id
      LEFT JOIN motivos  m ON m.id = c.motivo_id
     WHERE ${f.sql}
     GROUP BY s.id, m.id
     ORDER BY s.nombre, total DESC`, f.params);
  csv(res, `resumen_sectores_${f.desde}_a_${f.hasta}.csv`, [
    ['Sector', 'Motivo', 'Total', 'Resueltas', 'Derivadas', 'Pendientes', 'Reclamos'],
    ...filas.map((r) => [r.sector || 'Sin sector', r.motivo || 'Sin motivo', r.total, r.resueltas, r.derivadas, r.pendientes, r.reclamos]),
  ]);
});

module.exports = { general, encuestas, exportarResumen };
