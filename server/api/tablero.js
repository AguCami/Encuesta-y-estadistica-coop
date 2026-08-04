'use strict';

const { all, get } = require('../db');
const { json, hoy, sumarDias } = require('../util');
const { requiere } = require('../auth');

/**
 * Todo lo que necesita la pantalla de atencion rapida en una sola llamada:
 * los botones (sector + motivo), los mas usados por este operador y el
 * contador del dia, para que el tablero se dibuje sin esperar nada mas.
 */
const tablero = requiere('operador', ({ res, usuario }) => {
  const dia = hoy();
  const desde30 = sumarDias(dia, -29);

  const sectores = all(`
    SELECT id, nombre, detalle FROM sectores WHERE activo = 1 ORDER BY orden, nombre`);
  const motivos = all(`
    SELECT id, sector_id, nombre FROM motivos WHERE activo = 1 ORDER BY nombre`);

  // Los mas usados por este operador: van arriba, con atajo de teclado.
  const frecuentes = all(`
    SELECT c.motivo_id, COUNT(*) AS total
      FROM consultas c
     WHERE c.operador_id = ? AND c.motivo_id IS NOT NULL AND c.fecha BETWEEN ? AND ?
     GROUP BY c.motivo_id ORDER BY total DESC LIMIT 9`, [usuario.id, desde30, dia]);

  // Si el operador es nuevo, se usan los mas consultados de toda la cooperativa.
  const respaldo = frecuentes.length ? [] : all(`
    SELECT c.motivo_id, COUNT(*) AS total
      FROM consultas c
     WHERE c.motivo_id IS NOT NULL AND c.fecha BETWEEN ? AND ?
     GROUP BY c.motivo_id ORDER BY total DESC LIMIT 9`, [desde30, dia]);

  const hoyPorMotivo = all(`
    SELECT c.motivo_id, COUNT(*) AS total
      FROM consultas c
     WHERE c.operador_id = ? AND c.fecha = ? AND c.motivo_id IS NOT NULL
     GROUP BY c.motivo_id`, [usuario.id, dia]);

  json(res, {
    fecha: dia,
    canales: all('SELECT id, nombre FROM canales WHERE activo = 1 ORDER BY orden, nombre'),
    sectores,
    motivos,
    frecuentes: (frecuentes.length ? frecuentes : respaldo).map((f) => f.motivo_id),
    hoy_por_motivo: Object.fromEntries(hoyPorMotivo.map((f) => [f.motivo_id, f.total])),
    hoy: {
      mias: get('SELECT COUNT(*) AS n FROM consultas WHERE operador_id = ? AND fecha = ?',
        [usuario.id, dia]).n,
      total: get('SELECT COUNT(*) AS n FROM consultas WHERE fecha = ?', [dia]).n,
      pendientes: get("SELECT COUNT(*) AS n FROM consultas WHERE fecha = ? AND estado = 'pendiente'",
        [dia]).n,
    },
  });
});

module.exports = { tablero };
