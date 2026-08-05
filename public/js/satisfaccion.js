/* Panel de la encuesta de satisfaccion + carga manual de respuestas. */

import {
  get, post, exigirSesion, montarBarra, montarFiltros, leerFiltros, escribirFiltros, qs,
  escapar, num, dec, pct, fechaLarga, avisar, puede,
} from '/js/api.js';
import { barras, lineas, distribucion, paleta } from '/js/charts.js';

const $ = (id) => document.getElementById(id);
let filtros, catalogos, usuario;

inicio().catch((e) => console.error(e));

async function inicio() {
  // Las tres en paralelo: en la nube cada una es una ida y vuelta, y hacerlas
  // en fila se notaba al cambiar de pantalla.
  [usuario, catalogos] = await Promise.all([exigirSesion(), get('/api/catalogos')]);
  montarBarra(usuario);
  filtros = leerFiltros();
  montarFiltros($('filtros'), catalogos, filtros, (nuevos) => escribirFiltros(nuevos),
    { campos: ['sector', 'canal', 'operador'] });
  $('exp').href = `/api/encuestas/export?${qs(filtros)}`;
  $('exp').classList.toggle('oculto', !puede(usuario, 'supervisor'));

  $('e-sector').innerHTML = catalogos.sectores.filter((s) => s.activo)
    .map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
  $('form-encuesta').addEventListener('submit', guardarEncuesta);
  $('btn-link').onclick = generarLink;

  pintar(await get(`/api/estadisticas/encuestas?${qs(filtros)}`));
}

function pintar(d) {
  const r = d.resumen;
  $('kpis').innerHTML = `
    <div class="kpi"><div class="etiqueta">Respuestas</div>
      <div class="valor">${num(r.respondidas)}</div>
      <div class="pie">${r.tasa_respuesta === null ? `${num(r.enviadas)} enviadas` : `${pct(r.tasa_respuesta)} de ${num(r.enviadas)} enviadas`}</div></div>
    <div class="kpi"><div class="etiqueta">Conformidad general</div>
      <div class="valor">${r.satisfaccion === null ? '—' : `${dec(r.satisfaccion, 2)}/5`}</div>
      <div class="pie">promedio del período</div></div>
    <div class="kpi"><div class="etiqueta">Socios conformes</div>
      <div class="valor">${pct(r.csat)}</div>
      <div class="pie">respuestas de 4 o 5</div></div>
    <div class="kpi"><div class="etiqueta">NPS</div>
      <div class="valor">${r.nps === null ? '—' : r.nps}</div>
      <div class="pie">promotores − detractores</div></div>
    <div class="kpi"><div class="etiqueta">Resolución</div>
      <div class="valor">${r.resolucion === null ? '—' : dec(r.resolucion, 2)}</div>
      <div class="pie">¿se resolvió lo que necesitaba?</div></div>
    <div class="kpi"><div class="etiqueta">Tiempo de espera</div>
      <div class="valor">${r.espera === null ? '—' : dec(r.espera, 2)}</div>
      <div class="pie">percepción del socio</div></div>`;

  distribucion($('g-distribucion'), d.distribucion);

  const p = paleta();
  barras($('g-dimensiones'), [
    { etiqueta: 'Conformidad', valor: r.satisfaccion || 0 },
    { etiqueta: 'Resolución', valor: r.resolucion || 0 },
    { etiqueta: 'Atención', valor: r.atencion || 0 },
    { etiqueta: 'Espera', valor: r.espera || 0 },
  ].filter((x) => x.valor), { color: p.series[0], escala: 5 });

  lineas($('g-serie'), [{
    nombre: 'Conformidad promedio',
    puntos: d.serie.map((s) => ({ x: s.fecha, y: s.satisfaccion })),
  }], {
    alto: 220,
    etiquetaX: (v, completo) => (completo ? fechaLarga(v) : `${v.slice(8)}/${v.slice(5, 7)}`),
    formatoY: (v) => dec(v, 1),
  });

  $('t-sector').innerHTML = d.por_sector.length ? `
    <table>
      <thead><tr><th>Sector</th><th class="num">Respuestas</th><th class="num">Conformidad</th>
        <th class="num">Resolución</th><th class="num">Atención</th><th class="num">Espera</th></tr></thead>
      <tbody>${d.por_sector.map((s) => `
        <tr><td>${escapar(s.nombre)}</td>
            <td class="num">${num(s.respuestas)}</td>
            <td class="num">${dec(s.satisfaccion, 2)}</td>
            <td class="num">${dec(s.resolucion, 2)}</td>
            <td class="num">${dec(s.atencion, 2)}</td>
            <td class="num">${dec(s.espera, 2)}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p class="vacio">Sin respuestas en el período</p>';

  $('comentarios').innerHTML = d.comentarios.length ? d.comentarios.map((c) => `
    <div style="border-bottom:1px solid var(--grid);padding:.5rem 0">
      <div style="font-size:.76rem;color:var(--muted)">
        ${fechaLarga(c.respondida)} · ${escapar(c.sector || 'Sin sector')} · conformidad ${c.satisfaccion}/5
      </div>
      <div>${escapar(c.comentario)}</div>
    </div>`).join('') : '<p class="vacio">Sin comentarios en el período</p>';
}

async function guardarEncuesta(e) {
  e.preventDefault();
  try {
    await post('/api/encuestas', {
      sector_id: $('e-sector').value,
      consulta_id: $('e-consulta').value || null,
      satisfaccion: $('e-satisfaccion').value,
      resolucion: $('e-resolucion').value,
      atencion: $('e-atencion').value,
      espera: $('e-espera').value,
      comentario: $('e-comentario').value,
    });
    avisar($('aviso'), 'Respuesta cargada.', 'ok');
    e.target.reset();
    pintar(await get(`/api/estadisticas/encuestas?${qs(filtros)}`));
  } catch (err) {
    avisar($('aviso'), err.message, 'error');
  }
}

async function generarLink() {
  try {
    const sectorId = $('e-sector').value;
    const { url } = await post('/api/encuestas/link', { sector_id: sectorId });
    const completo = location.origin + url;
    await navigator.clipboard.writeText(completo).catch(() => {});
    avisar($('aviso'), `Enlace copiado: ${completo}`, 'ok');
  } catch (err) {
    avisar($('aviso'), err.message, 'error');
  }
}
