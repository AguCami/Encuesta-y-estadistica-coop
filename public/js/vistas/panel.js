/* Vista: Estadísticas de consultas */

export const TITULO = 'Estadísticas de consultas';

export const html = `
<main>
  <div class="fila" style="align-items:baseline">
    <h1>Estadísticas de consultas</h1>
    <span style="flex:1"></span>
    <a id="exp-detalle" class="boton chico" href="#">CSV detallado</a>
    <a id="exp-resumen" class="boton chico" href="#">CSV por sector</a>
    <button class="chico" onclick="print()">Imprimir</button>
  </div>

  <div class="tarjeta canal-barra" style="margin-top:.6rem">
    <label style="margin:0 .6rem 0 0;align-self:center">Estadísticas de</label>
    <div class="segmentado" id="puesto-panel"></div>
  </div>

  <div id="filtros" style="margin-top:.6rem"></div>

  <div class="kpis" id="kpis" style="margin:1rem 0"></div>

  <section class="tarjeta">
    <header><h2 id="titulo-evolucion">Evolución diaria</h2><p id="sub-evolucion"></p></header>
    <div id="g-evolucion"></div>
  </section>

  <div class="grilla g2" style="margin-top:1rem">
    <section class="tarjeta">
      <header><h2>Consultas por sector</h2><p>quién recibe la demanda</p></header>
      <div id="g-sector"></div>
    </section>
    <section class="tarjeta">
      <header><h2>Resultado por sector</h2><p>qué parte se resolvió en el momento</p></header>
      <div id="g-estado-sector"></div>
    </section>
  </div>

  <section class="tarjeta" style="margin-top:1rem">
    <header><h2>Motivos consultados</h2><p id="sub-motivos">qué se pregunta y qué parte se resolvió en el momento</p></header>
    <div id="g-motivos"></div>
  </section>

  <section class="tarjeta" style="margin-top:1rem" id="caja-puesto">
    <header><h2>Puesto de atención</h2><p>call center y mesa de informes</p></header>
    <div id="g-puesto"></div>
  </section>

  <section class="tarjeta" style="margin-top:1rem">
    <header class="fila" style="align-items:baseline;gap:.8rem">
      <div style="flex:1">
        <h2>Demanda por día y hora</h2><p id="sub-calor">para dimensionar el personal en cada franja</p>
      </div>
      <div class="segmentado" id="modo-calor"></div>
    </header>
    <div id="g-calor"></div>
  </section>

  <section class="tarjeta" style="margin-top:1rem">
    <header><h2>Evolución por sector</h2><p>los 6 sectores con más consultas, un gráfico por sector</p></header>
    <div id="g-sector-tiempo"></div>
  </section>

  <div class="grilla g2" style="margin-top:1rem">
    <section class="tarjeta">
      <header><h2>Detalle por sector</h2></header>
      <div class="tabla-scroll" id="t-sector"></div>
    </section>
    <section class="tarjeta">
      <header><h2>Actividad por operador</h2></header>
      <div class="tabla-scroll" id="t-operador"></div>
    </section>
  </div>

  <section class="tarjeta oculto" style="margin-top:1rem" id="caja-localidad">
    <header><h2>Consultas por localidad</h2></header>
    <div id="g-localidad"></div>
  </section>
</main>
`;

/* Panel de estadisticas: todo el periodo filtrado, en una sola pantalla. */

import {
  get, montarFiltros, leerFiltros, escribirFiltros, qs,
  escapar, num, dec, pct, fechaLarga, etiquetaEstado, etiquetaPuesto,
} from '/js/api.js';
import { barras, apiladas, lineas, multiplos, calor, paleta, DIAS } from '/js/charts.js';

const $ = (id) => document.getElementById(id);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
let filtros, ultimoPanel;

// Al cambiar claro/oscuro se repinta con los mismos datos, para que los colores
// de las leyendas y de las barras apiladas acompañen al tema.
window.addEventListener('tema-cambiado', () => {
  // Si la pantalla ya no está montada no hay nada que repintar.
  if (ultimoPanel && document.getElementById('kpis')) pintar(ultimoPanel);
});


// "todos" es una opción como cualquier otra y viaja en la dirección: si no
// estuviera, no habría forma de distinguir "los dos juntos" de "no dice nada",
// que arranca en el puesto de quien mira.
const TODOS = 'todos';
const PUESTOS_PANEL = [
  ['call_center', 'Call center'], ['mesa_informes', 'Mesa de informes'], [TODOS, 'Los dos juntos'],
];

/** Lo que va al servidor: "los dos juntos" es no filtrar por puesto. */
const paraPedir = (f) => { const { puesto, ...resto } = f; return puesto === TODOS ? resto : f; };

export async function iniciar(ctx) {
  // Las dos en paralelo: en la nube cada una es una ida y vuelta.
  const { usuario, catalogos } = ctx;
  filtros = leerFiltros();
  // Cada puesto se mira por separado; "los dos juntos" es una opción explícita.
  if (filtros.puesto === undefined) filtros.puesto = usuario.puesto === 'mesa_informes' ? 'mesa_informes' : 'call_center';
  montarPuestos();

  const juntos = filtros.puesto === TODOS;
  // Los sectores del otro puesto no aplican al período que se está mirando.
  const propios = {
    ...catalogos,
    sectores: catalogos.sectores.filter((s) => juntos || !s.puesto
      || s.puesto === 'ambos' || s.puesto === filtros.puesto),
  };
  montarFiltros($('filtros'), propios, filtros, (nuevos) => escribirFiltros({ ...nuevos, puesto: filtros.puesto }),
    { campos: ['sector', 'estado', 'operador'] });
  // El reparto entre puestos solo dice algo cuando se miran los dos juntos.
  $('caja-puesto').classList.toggle('oculto', !juntos);
  const pedido = qs(paraPedir(filtros));
  $('exp-detalle').href = `/api/consultas/export?${pedido}`;
  $('exp-resumen').href = `/api/estadisticas/export?${pedido}`;
  pintar(await get(`/api/estadisticas?${pedido}`));
}

// ------------------------------------------- demanda por dia y hora ---

/*
 * El mapa junta todos los lunes del periodo en una sola fila, todos los
 * martes en otra, y asi. Eso es lo que se quiere para dimensionar el
 * personal —"los lunes al mediodia hay cola"— pero mirando un mes entero el
 * numero suma cuatro o cinco lunes, y leido como si fuera una semana da
 * cuatro veces de mas.
 *
 * Por eso hay dos modos. Con mas de una semana a la vista arranca en
 * promedio, que es el que se puede comparar entre periodos distintos.
 */
const ORDEN_DOW = [1, 2, 3, 4, 5, 6, 0];   // la semana arranca el lunes

/** Cuantas veces cae cada dia de semana entre las dos fechas, inclusive. */
function vecesPorDia(desde, hasta) {
  const veces = {};
  for (const d of ORDEN_DOW) veces[d] = 0;
  const fin = new Date(`${hasta}T12:00:00Z`);
  for (let f = new Date(`${desde}T12:00:00Z`); f <= fin; f.setUTCDate(f.getUTCDate() + 1)) {
    veces[f.getUTCDay()] = (veces[f.getUTCDay()] || 0) + 1;
  }
  return veces;
}

// Lo que eligió quien mira, que se respeta mientras dure la sesión aunque de
// paso mire un período de una semana, donde no se puede elegir.
let modoCalor = 'promedio';

/** Con una semana o menos, promediar y sumar dan lo mismo: no se ofrece elegir. */
const sePuedeElegir = () => ultimoPanel.periodo.dias > 7;

function montarModoCalor() {
  if (!sePuedeElegir()) { $('modo-calor').innerHTML = ''; return; }
  $('modo-calor').innerHTML = [['promedio', 'Promedio'], ['total', 'Total']]
    .map(([id, texto]) => `<button type="button" data-modo="${id}"${
      modoCalor === id ? ' aria-pressed="true"' : ''}>${texto}</button>`).join('');
  $('modo-calor').querySelectorAll('[data-modo]').forEach((b) => {
    b.onclick = () => { modoCalor = b.dataset.modo; montarModoCalor(); pintarCalor(); };
  });
}

function pintarCalor() {
  const d = ultimoPanel;
  const veces = vecesPorDia(d.periodo.desde, d.periodo.hasta);
  const promedio = modoCalor === 'promedio' && sePuedeElegir();
  const datos = d.heatmap.map((c) => ({
    ...c,
    total: promedio ? c.total / Math.max(1, veces[c.dow] || 1) : c.total,
  }));

  calor($('g-calor'), datos, promedio
    ? { formato: (v) => dec(v, 1), unidad: () => 'consultas en promedio' }
    : {});

  const pico = datos.slice().sort((a, b) => b.total - a.total)[0];
  if (!pico) { $('sub-calor').textContent = 'para dimensionar el personal en cada franja'; return; }

  const dia = DIAS[ORDEN_DOW.indexOf(pico.dow)];
  const hora = `${String(pico.hora).padStart(2, '0')}:00`;
  const cuantos = veces[pico.dow] || 1;
  const cuantosDias = `${cuantos} ${plural(dia, cuantos).toLowerCase()}`;

  if (cuantos === 1) {
    // Una sola semana: aclarar sobre cuántos lunes se promedia no aporta nada.
    $('sub-calor').textContent = `pico: ${dia} ${hora} con ${num(pico.total)} consultas`;
    return;
  }
  $('sub-calor').textContent = promedio
    ? `promedio de cada día · pico: ${dia} ${hora} con ${dec(pico.total, 1)} consultas, `
      + `sobre ${cuantosDias}`
    : `suma del período · pico: ${dia} ${hora} con ${num(pico.total)} consultas `
      + `entre ${cuantosDias}`;
}

/** Lunes a viernes no cambian en plural; sábado y domingo sí. */
const plural = (dia, n) => (n === 1 || dia.endsWith('s') ? dia : `${dia}s`);

function montarPuestos() {
  $('puesto-panel').innerHTML = PUESTOS_PANEL.map(([id, texto]) => `
    <button type="button" data-puesto="${id}"${filtros.puesto === id ? ' aria-pressed="true"' : ''}>
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
      <div class="pie">${pct(r.pct_pendientes)} del total</div></div>`;

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

  // --- motivos: todos, con el mismo corte por resultado que los sectores
  const usadosMotivo = new Set();
  for (const m of d.por_motivo) for (const x of partesDe(m)) if (x.valor) usadosMotivo.add(x.estado);
  // Dos sectores pueden tener un motivo con el mismo nombre —"Reclamos" está
  // en TIC y en mesa de informes—. Al que se repite se le agrega el sector,
  // que si no aparecen dos renglones iguales y no se sabe cuál es cuál.
  const repetidos = new Set();
  const vistos = new Set();
  for (const m of d.por_motivo) {
    if (vistos.has(m.nombre)) repetidos.add(m.nombre);
    vistos.add(m.nombre);
  }
  apiladas($('g-motivos'), d.por_motivo.map((m) => ({
    etiqueta: repetidos.has(m.nombre) && m.sector ? `${m.nombre} (${m.sector})` : m.nombre,
    detalle: m.sector || '',
    partes: partesDe(m),
  })), {
    maxEtiqueta: 38,
    leyenda: partesDe(d.por_motivo[0] || { total: 0, derivadas: 0, pendientes: 0, reclamos: 0 })
      .filter((x) => usadosMotivo.has(x.estado)),
  });
  $('sub-motivos').textContent = d.por_motivo.length
    ? `los ${d.por_motivo.length} motivos con consultas en el período · lo verde se resolvió en el momento`
    : 'qué se pregunta y qué parte se resolvió en el momento';

  barras($('g-puesto'), d.por_puesto.map((c) => ({ etiqueta: etiquetaPuesto(c.nombre), valor: c.total })));

  // --- demanda por dia y hora
  montarModoCalor();
  pintarCalor();

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
        <th class="num">Solucionadas</th><th class="num">Sin solucionar</th></tr></thead>
      <tbody>${d.por_sector.map((s) => `
        <tr><td>${escapar(s.nombre)}</td>
            <td class="num">${num(s.total)}</td>
            <td class="num">${pct(s.pct)}</td>
            <td class="num">${pct(s.pct_primer_contacto)}</td>
            <td class="num">${num(s.pendientes)}</td>
            </tr>`).join('')
    || '<tr><td colspan="6" class="vacio">Sin datos</td></tr>'}
      </tbody>
    </table>`;

  $('t-operador').innerHTML = `
    <table>
      <thead><tr><th>Operador</th><th>Puesto</th><th class="num">Consultas</th>
        <th class="num">Solucionadas</th></tr></thead>
      <tbody>${d.por_operador.map((o) => `
        <tr><td>${escapar(o.nombre)}</td>
            <td>${etiquetaPuesto(o.puesto)}</td>
            <td class="num">${num(o.total)}</td>
            <td class="num">${pct(o.pct_primer_contacto)}</td>
            </tr>`).join('')
    || '<tr><td colspan="5" class="vacio">Sin datos</td></tr>'}
      </tbody>
    </table>`;

  if (d.por_localidad.length) {
    $('caja-localidad').classList.remove('oculto');
    barras($('g-localidad'), d.por_localidad.map((l) => ({ etiqueta: l.nombre, valor: l.total })));
  }
}


export function limpiar() { ultimoPanel = null; }
