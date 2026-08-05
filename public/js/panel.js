/* Panel de estadisticas: todo el periodo filtrado, en una sola pantalla. */

import {
  get, getGuardado, exigirSesion, montarBarra, montarFiltros, leerFiltros, escribirFiltros, qs,
  escapar, num, dec, pct, fechaLarga, etiquetaEstado, etiquetaPuesto,
} from '/js/api.js';
import { barras, apiladas, lineas, multiplos, calor, paleta, DIAS } from '/js/charts.js';

const $ = (id) => document.getElementById(id);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
let filtros, ultimoPanel;

// Al cambiar claro/oscuro se repinta con los mismos datos, para que los colores
// de las leyendas y de las barras apiladas acompañen al tema.
window.addEventListener('tema-cambiado', () => { if (ultimoPanel) pintar(ultimoPanel); });

inicio().catch((e) => console.error(e));

const PUESTOS_PANEL = [
  ['call_center', 'Call center'], ['mesa_informes', 'Mesa de informes'], ['', 'Los dos juntos'],
];

async function inicio() {
  // Las dos en paralelo: en la nube cada una es una ida y vuelta.
  const [usuario, catalogos] = await Promise.all([exigirSesion(), getGuardado('/api/catalogos')]);
  montarBarra(usuario);
  filtros = leerFiltros();
  // Cada puesto se mira por separado; "los dos juntos" es una opción explícita.
  if (filtros.puesto === undefined) filtros.puesto = usuario.puesto === 'mesa_informes' ? 'mesa_informes' : 'call_center';
  montarPuestos();

  // Los sectores del otro puesto no aplican al período que se está mirando.
  const propios = {
    ...catalogos,
    sectores: catalogos.sectores.filter((s) => !filtros.puesto || !s.puesto
      || s.puesto === 'ambos' || s.puesto === filtros.puesto),
  };
  montarFiltros($('filtros'), propios, filtros, (nuevos) => escribirFiltros({ ...nuevos, puesto: filtros.puesto }),
    { campos: ['sector', 'canal', 'estado', 'operador'] });
  $('caja-puesto').classList.toggle('oculto', !!filtros.puesto);
  $('exp-detalle').href = `/api/consultas/export?${qs(filtros)}`;
  $('exp-resumen').href = `/api/estadisticas/export?${qs(filtros)}`;
  pintar(await get(`/api/estadisticas?${qs(filtros)}`));
}

function montarPuestos() {
  $('puesto-panel').innerHTML = PUESTOS_PANEL.map(([id, texto]) => `
    <button type="button" data-puesto="${id}"${(filtros.puesto || '') === id ? ' aria-pressed="true"' : ''}>
      ${texto}</button>`).join('');
  $('puesto-panel').querySelectorAll('[data-puesto]').forEach((b) => {
    // Cambiar de puesto limpia el sector: los grupos no se comparten.
    b.onclick = () => escribirFiltros({ ...filtros, puesto: b.dataset.puesto, sector_id: '' });
  });
}

function pintar(d) {
  ultimoPanel = d;
  const r = d.resumen;
  const variacion = r.variacion_pct === null ? ''
    : `<span class="${r.variacion_pct >= 0 ? 'sube' : 'baja'}">${r.variacion_pct >= 0 ? '▲' : '▼'} ${dec(Math.abs(r.variacion_pct))}%</span> vs. período anterior`;

  $('kpis').innerHTML = `
    <div class="kpi"><div class="etiqueta">Consultas</div>
      <div class="valor">${num(r.total)}</div>
      <div class="pie">${variacion || `${d.periodo.dias} días`}</div></div>
    <div class="kpi"><div class="etiqueta">Promedio por día</div>
      <div class="valor">${dec(r.promedio_dia)}</div>
      <div class="pie">${num(d.periodo.dias)} día${d.periodo.dias === 1 ? '' : 's'} del período</div></div>
    <div class="kpi"><div class="etiqueta">Solucionadas</div>
      <div class="valor">${pct(r.pct_primer_contacto)}</div>
      <div class="pie">${num(r.resueltas)} resueltas en el momento</div></div>
    <div class="kpi"><div class="etiqueta">Sin solucionar</div>
      <div class="valor">${num(r.pendientes)}</div>
      <div class="pie">${pct(r.pct_pendientes)} del total</div></div>
    <div class="kpi"><div class="etiqueta">Duración promedio</div>
      <div class="valor">${r.duracion_prom_min === null ? '—' : `${dec(r.duracion_prom_min)}′`}</div>
      <div class="pie">sobre las consultas con tiempo cargado</div></div>
    <div class="kpi"><div class="etiqueta">Conformidad</div>
      <div class="valor">${r.satisfaccion === null ? '—' : `${dec(r.satisfaccion, 2)}/5`}</div>
      <div class="pie">${num(r.encuestas_respondidas)} encuestas respondidas</div></div>`;

  // Según el largo del período, la serie viene por día, por semana o por mes.
  const gran = d.periodo.granularidad;
  const etiquetaX = (v, completo) => {
    if (gran === 'mes') {
      return completo ? `${MESES[Number(v.slice(5, 7)) - 1]} de ${v.slice(0, 4)}`
        : `${MESES[Number(v.slice(5, 7)) - 1]} ${v.slice(2, 4)}`;
    }
    if (gran === 'semana' && completo) return `semana del ${fechaLarga(v)}`;
    return completo ? fechaLarga(v) : `${v.slice(8)}/${v.slice(5, 7)}`;
  };

  $('titulo-evolucion').textContent =
    gran === 'mes' ? 'Evolución mensual' : gran === 'semana' ? 'Evolución semanal' : 'Evolución diaria';
  $('sub-evolucion').textContent = `${fechaLarga(d.periodo.desde)} — ${fechaLarga(d.periodo.hasta)}`;

  // --- evolucion (serie unica: sin leyenda, el titulo la nombra)
  lineas($('g-evolucion'), [{
    nombre: 'Consultas',
    puntos: d.serie.map((s) => ({ x: s.fecha, y: s.total })),
  }], { alto: 250, etiquetaX });

  // --- ranking por sector
  barras($('g-sector'), d.por_sector.map((s) => ({
    etiqueta: s.nombre, valor: s.total,
    detalle: `${pct(s.pct)} del total · ${pct(s.pct_primer_contacto)} al 1er contacto`,
  })));

  // --- composicion por resultado: la leyenda solo nombra lo que aparece
  const p = paleta();
  // El resto de las consultas va primero y lo solucionado cierra la barra en
  // verde: se lee de un vistazo cuánto se resolvió en el momento.
  const NOMBRE_PARTE = { pendiente: 'Otros', derivada: 'Derivada', reclamo: 'Reclamo generado', resuelta: 'Solucionadas' };
  const partesDe = (s) => [
    { estado: 'pendiente', valor: s.pendientes },
    { estado: 'derivada', valor: s.derivadas },
    { estado: 'reclamo', valor: s.reclamos },
    { estado: 'resuelta', valor: s.total - s.derivadas - s.pendientes - s.reclamos },
  ].map((x) => ({ ...x, nombre: NOMBRE_PARTE[x.estado], color: p.estado[x.estado] }));

  const usados = new Set();
  for (const s of d.por_sector) for (const x of partesDe(s)) if (x.valor) usados.add(x.estado);
  apiladas($('g-estado-sector'), d.por_sector.map((s) => ({ etiqueta: s.nombre, partes: partesDe(s) })),
    { leyenda: partesDe(d.por_sector[0] || { total: 0, derivadas: 0, pendientes: 0, reclamos: 0 })
      .filter((x) => usados.has(x.estado)) });

  // --- motivos, canal y puesto
  barras($('g-motivos'), d.por_motivo.map((m) => ({
    etiqueta: m.nombre, valor: m.total, detalle: m.sector || '',
  })), { maxEtiqueta: 30 });

  barras($('g-canal'), d.por_canal.map((c) => ({ etiqueta: c.nombre, valor: c.total })));
  barras($('g-puesto'), d.por_puesto.map((c) => ({ etiqueta: etiquetaPuesto(c.nombre), valor: c.total })));

  // --- demanda por dia y hora
  calor($('g-calor'), d.heatmap);
  const pico = d.heatmap.slice().sort((a, b) => b.total - a.total)[0];
  if (pico) {
    $('sub-calor').textContent = `pico: ${DIAS[[1, 2, 3, 4, 5, 6, 0].indexOf(pico.dow)]} ${String(pico.hora).padStart(2, '0')}:00 con ${num(pico.total)} consultas`;
  }

  // --- evolucion comparada por sector
  const porId = new Map(d.por_sector.map((s) => [s.id, s.nombre]));
  const fechas = d.serie.map((s) => s.fecha);
  const seriesSector = [...new Set(d.serie_sector.map((s) => s.sector_id))].map((id) => {
    const mapa = new Map(d.serie_sector.filter((s) => s.sector_id === id).map((s) => [s.fecha, s.total]));
    return { nombre: porId.get(id) || `Sector ${id}`, puntos: fechas.map((f) => ({ x: f, y: mapa.get(f) || 0 })) };
  });
  multiplos($('g-sector-tiempo'), seriesSector, { etiquetaX });

  // --- tablas (misma informacion que los graficos, en texto)
  $('t-sector').innerHTML = `
    <table>
      <thead><tr><th>Sector</th><th class="num">Consultas</th><th class="num">%</th>
        <th class="num">Solucionadas</th><th class="num">Sin solucionar</th><th class="num">Duración</th></tr></thead>
      <tbody>${d.por_sector.map((s) => `
        <tr><td>${escapar(s.nombre)}</td>
            <td class="num">${num(s.total)}</td>
            <td class="num">${pct(s.pct)}</td>
            <td class="num">${pct(s.pct_primer_contacto)}</td>
            <td class="num">${num(s.pendientes)}</td>
            <td class="num">${s.duracion_prom_min === null ? '—' : `${dec(s.duracion_prom_min)}′`}</td></tr>`).join('')
    || '<tr><td colspan="6" class="vacio">Sin datos</td></tr>'}
      </tbody>
    </table>`;

  $('t-operador').innerHTML = `
    <table>
      <thead><tr><th>Operador</th><th>Puesto</th><th class="num">Consultas</th>
        <th class="num">Solucionadas</th><th class="num">Duración</th></tr></thead>
      <tbody>${d.por_operador.map((o) => `
        <tr><td>${escapar(o.nombre)}</td>
            <td>${etiquetaPuesto(o.puesto)}</td>
            <td class="num">${num(o.total)}</td>
            <td class="num">${pct(o.pct_primer_contacto)}</td>
            <td class="num">${o.duracion_prom_min === null ? '—' : `${dec(o.duracion_prom_min)}′`}</td></tr>`).join('')
    || '<tr><td colspan="5" class="vacio">Sin datos</td></tr>'}
      </tbody>
    </table>`;

  if (d.por_localidad.length) {
    $('caja-localidad').classList.remove('oculto');
    barras($('g-localidad'), d.por_localidad.map((l) => ({ etiqueta: l.nombre, valor: l.total })));
  }
}
