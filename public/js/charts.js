/* ============================================================
   Graficos en SVG, sin librerias externas.
   Reglas: marcas finas, extremos redondeados de 4px, separacion de
   2px entre rellenos, etiquetas directas, leyenda siempre que haya
   dos o mas series, y tooltip en todos los graficos.
   ============================================================ */

const SVGNS = 'http://www.w3.org/2000/svg';

export function paleta() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const oscuro = document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    oscuro,
    series: [v('--s1'), v('--s2'), v('--s3'), v('--s4'), v('--s5'), v('--s6'), v('--s7'), v('--s8')],
    // Rampa ordinal: en claro no arranca mas claro que el paso 250;
    // en oscuro no termina mas oscuro que el paso 600.
    ordinal: oscuro
      ? [v('--seq-100'), v('--seq-200'), v('--seq-300'), v('--seq-400'), v('--seq-600')]
      : [v('--seq-200'), v('--seq-300'), v('--seq-400'), v('--seq-500'), v('--seq-700')],
    // Rampa de magnitud: siempre del paso mas cercano a la superficie (cero)
    // al mas alejado, asi "mas" siempre resalta — en claro oscureciendo y en
    // oscuro aclarando.
    secuencial: (() => {
      const r = [v('--seq-100'), v('--seq-200'), v('--seq-300'), v('--seq-400'), v('--seq-500'), v('--seq-600'), v('--seq-700')];
      return oscuro ? r.reverse() : r;
    })(),
    superficie: v('--surface-1'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    muted: v('--muted'),
    grid: v('--grid'),
    axis: v('--axis'),
    // Lo solucionado se destaca en verde; el resto usa el azul del resto de
    // los graficos, porque no es un problema sino simplemente lo demas.
    estado: { resuelta: v('--ok'), pendiente: v('--s1'), derivada: v('--s7'), reclamo: v('--serio') },
  };
}

function el(tag, attrs = {}, texto) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
  if (texto !== undefined) n.textContent = texto;
  return n;
}

// --------------------------------------------------------------- tooltip ---

let tip;
function tooltip() {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tip';
    document.body.appendChild(tip);
  }
  return tip;
}
function mostrarTip(evt, html) {
  const t = tooltip();
  t.innerHTML = html;
  t.style.opacity = '1';
  const ancho = t.offsetWidth, alto = t.offsetHeight;
  let x = evt.clientX + 14, y = evt.clientY + 14;
  if (x + ancho > innerWidth - 8) x = evt.clientX - ancho - 14;
  if (y + alto > innerHeight - 8) y = evt.clientY - alto - 14;
  t.style.left = `${Math.max(8, x)}px`;
  t.style.top = `${Math.max(8, y)}px`;
}
function ocultarTip() { if (tip) tip.style.opacity = '0'; }

// ---------------------------------------------------------------- varios ---

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = new Intl.NumberFormat('es-AR');

function recortar(txt, max) {
  const s = String(txt ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function vacio(cont, mensaje = 'Sin datos en el periodo elegido') {
  cont.innerHTML = `<p class="vacio">${esc(mensaje)}</p>`;
}

/** Redibuja el grafico cuando cambia el ancho del contenedor o el tema. */
function responsivo(cont, dibujar) {
  let ancho = 0;
  const render = () => {
    const w = cont.clientWidth;
    if (!w) return;
    ancho = w;
    dibujar(w);
  };
  render();
  if (cont._ro) cont._ro.disconnect();
  cont._ro = new ResizeObserver(() => { if (Math.abs(cont.clientWidth - ancho) > 8) render(); });
  cont._ro.observe(cont);
  if (cont._tema) window.removeEventListener('tema-cambiado', cont._tema);
  cont._tema = () => render();
  window.addEventListener('tema-cambiado', cont._tema);
}

function escalaLinda(max) {
  if (max <= 5) return Math.max(1, Math.ceil(max));
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / exp;
  const paso = n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return paso * exp;
}

// ------------------------------------------------------ barras horizontales ---

/**
 * Ranking (sector, motivo, canal...). Una sola serie: sin leyenda, con la
 * etiqueta de valor escrita al final de cada barra.
 * datos: [{ etiqueta, valor, detalle? }]
 */
export function barras(cont, datos, opciones = {}) {
  if (!datos || !datos.length) return vacio(cont);
  const { color, sufijo = '', maxEtiqueta = 26, alturaBarra = 16, escala } = opciones;

  responsivo(cont, (ancho) => {
    const p = paleta();
    const tinta = color || p.series[0];
    const anchoEtiqueta = Math.min(210, Math.max(90, ...datos.map((d) => recortar(d.etiqueta, maxEtiqueta).length * 6.6)));
    const gap = 12;
    const alto = datos.length * (alturaBarra + gap) + 8;
    const anchoValor = 54;
    const x0 = anchoEtiqueta + 10;
    const util = Math.max(40, ancho - x0 - anchoValor);
    // `escala` fija el tope del eje (por ejemplo 5 en una encuesta de 1 a 5):
    // sin eso, comparar promedios contra el maximo exagera las diferencias.
    const max = escala || Math.max(...datos.map((d) => d.valor), 1);

    const svg = el('svg', { class: 'viz', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    datos.forEach((d, i) => {
      const y = i * (alturaBarra + gap) + 4;
      const w = Math.max(2, (d.valor / max) * util);

      svg.appendChild(el('text', {
        x: anchoEtiqueta, y: y + alturaBarra / 2 + 4, 'text-anchor': 'end',
        'font-size': 12.5, fill: p.ink2,
      }, recortar(d.etiqueta, maxEtiqueta)));

      // pista de fondo, para leer la proporcion aun con barras cortas
      svg.appendChild(el('rect', { x: x0, y, width: util, height: alturaBarra, rx: 4, fill: p.grid, opacity: .45 }));

      const barra = el('rect', { x: x0, y, width: w, height: alturaBarra, rx: 4, fill: tinta });
      barra.style.cursor = 'default';
      barra.addEventListener('mousemove', (e) => mostrarTip(e,
        `<b>${esc(d.etiqueta)}</b><br>${fmt.format(d.valor)}${sufijo}${d.detalle ? `<br><span style="color:var(--muted)">${esc(d.detalle)}</span>` : ''}`));
      barra.addEventListener('mouseleave', ocultarTip);
      svg.appendChild(barra);

      svg.appendChild(el('text', {
        x: x0 + w + 7, y: y + alturaBarra / 2 + 4, 'font-size': 12.5,
        fill: p.ink, 'font-weight': 600, 'font-variant-numeric': 'tabular-nums',
      }, `${fmt.format(d.valor)}${sufijo}`));
    });

    cont.replaceChildren(svg);
  });
}

// --------------------------------------------------------- barras apiladas ---

/**
 * Composicion por estado dentro de cada sector.
 * datos: [{ etiqueta, partes: [{ nombre, valor, color }] }]
 */
export function apiladas(cont, datos, opciones = {}) {
  if (!datos || !datos.length) return vacio(cont);
  const leyenda = opciones.leyenda || [];

  responsivo(cont, (ancho) => {
    const p = paleta();
    const anchoEtiqueta = Math.min(200, Math.max(90, ...datos.map((d) => recortar(d.etiqueta, 24).length * 6.6)));
    const alturaBarra = 18, gap = 12;
    const alto = datos.length * (alturaBarra + gap) + 6;
    const x0 = anchoEtiqueta + 10;
    const util = Math.max(40, ancho - x0 - 52);
    const max = Math.max(...datos.map((d) => d.partes.reduce((a, b) => a + b.valor, 0)), 1);

    const svg = el('svg', { class: 'viz', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    datos.forEach((d, i) => {
      const y = i * (alturaBarra + gap) + 3;
      const total = d.partes.reduce((a, b) => a + b.valor, 0);
      svg.appendChild(el('text', {
        x: anchoEtiqueta, y: y + alturaBarra / 2 + 4, 'text-anchor': 'end', 'font-size': 12.5, fill: p.ink2,
      }, recortar(d.etiqueta, 24)));

      let x = x0;
      d.partes.filter((s) => s.valor > 0).forEach((s, j, arr) => {
        const w = Math.max(2, (s.valor / max) * util);
        const primera = j === 0, ultima = j === arr.length - 1;
        const r = el('rect', {
          x, y, width: Math.max(2, w - (ultima ? 0 : 2)), height: alturaBarra,
          rx: primera || ultima ? 4 : 0, fill: s.color,
        });
        r.addEventListener('mousemove', (e) => mostrarTip(e,
          `<b>${esc(d.etiqueta)}</b><br>${esc(s.nombre)}: ${fmt.format(s.valor)} (${Math.round(s.valor / total * 100)}%)`));
        r.addEventListener('mouseleave', ocultarTip);
        svg.appendChild(r);
        x += w;
      });

      svg.appendChild(el('text', {
        x: x + 7, y: y + alturaBarra / 2 + 4, 'font-size': 12.5, fill: p.ink,
        'font-weight': 600, 'font-variant-numeric': 'tabular-nums',
      }, fmt.format(total)));
    });

    const caja = document.createElement('div');
    caja.appendChild(svg);
    if (leyenda.length > 1) {
      const l = document.createElement('div');
      l.className = 'leyenda';
      l.innerHTML = leyenda.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.nombre)}</span>`).join('');
      caja.appendChild(l);
    }
    cont.replaceChildren(caja);
  });
}

// ------------------------------------------------------------------ lineas ---

/**
 * Evolucion diaria. series: [{ nombre, color?, puntos: [{ x, y }] }]
 * Con dos o mas series dibuja leyenda; el tooltip es un cursor vertical con
 * todos los valores del dia.
 */
export function lineas(cont, series, opciones = {}) {
  const hayDatos = series && series.length && series.some((s) => s.puntos.length);
  if (!hayDatos) return vacio(cont);
  const { alto: altoTotal = 240, etiquetaX = (v) => v, sufijo = '', minY0 = true } = opciones;

  responsivo(cont, (ancho) => {
    const p = paleta();
    const m = { top: 14, right: 14, bottom: 26, left: 42 };
    const w = Math.max(120, ancho - m.left - m.right);
    const h = altoTotal - m.top - m.bottom;
    const ejeX = series[0].puntos.map((pt) => pt.x);
    const n = ejeX.length;
    const valores = series.flatMap((s) => s.puntos.map((pt) => pt.y)).filter((v) => v !== null);
    const maxY = escalaLinda(Math.max(...valores, 1));
    const minYv = minY0 ? 0 : Math.min(...valores, 0);
    const px = (i) => m.left + (n === 1 ? w / 2 : (i / (n - 1)) * w);
    const py = (v) => m.top + h - ((v - minYv) / (maxY - minYv || 1)) * h;

    const svg = el('svg', { class: 'viz', width: ancho, height: altoTotal, viewBox: `0 0 ${ancho} ${altoTotal}` });

    // grilla horizontal (hairline, recesiva)
    const pasos = 4;
    for (let i = 0; i <= pasos; i++) {
      const v = minYv + ((maxY - minYv) * i) / pasos;
      const y = py(v);
      svg.appendChild(el('line', { x1: m.left, x2: m.left + w, y1: y, y2: y, stroke: p.grid, 'stroke-width': 1 }));
      svg.appendChild(el('text', {
        x: m.left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: p.muted,
        'font-variant-numeric': 'tabular-nums',
      }, opciones.formatoY ? opciones.formatoY(v) : fmt.format(Math.round(v * 10) / 10)));
    }

    // etiquetas del eje X (hasta 7, sin encimarse)
    const cada = Math.max(1, Math.ceil(n / Math.min(7, Math.max(2, Math.floor(w / 70)))));
    ejeX.forEach((x, i) => {
      if (i % cada && i !== n - 1) return;
      svg.appendChild(el('text', {
        x: px(i), y: altoTotal - 8, 'text-anchor': 'middle', 'font-size': 11, fill: p.muted,
      }, etiquetaX(x)));
    });

    series.forEach((s, si) => {
      const color = s.color || p.series[si % 8];
      const puntos = s.puntos.map((pt, i) => [px(i), py(pt.y)]);
      if (series.length === 1) {
        const area = `M${puntos[0][0]},${py(minYv)} ` + puntos.map(([x, y]) => `L${x},${y}`).join(' ')
          + ` L${puntos[puntos.length - 1][0]},${py(minYv)} Z`;
        svg.appendChild(el('path', { d: area, fill: color, opacity: .10 }));
      }
      svg.appendChild(el('path', {
        d: `M${puntos.map(([x, y]) => `${x},${y}`).join(' L')}`,
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      }));
      if (n <= 14) {
        puntos.forEach(([x, y]) => {
          svg.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: color, stroke: p.superficie, 'stroke-width': 2 }));
        });
      }
    });

    // capa de interaccion: cursor vertical + puntos + tooltip
    const cursor = el('line', { y1: m.top, y2: m.top + h, stroke: p.axis, 'stroke-width': 1, opacity: 0 });
    svg.appendChild(cursor);
    const marcas = series.map((s, si) => {
      const c = el('circle', { r: 4.5, fill: s.color || p.series[si % 8], stroke: p.superficie, 'stroke-width': 2, opacity: 0 });
      svg.appendChild(c);
      return c;
    });

    const captura = el('rect', { x: m.left, y: m.top, width: w, height: h, fill: 'transparent' });
    captura.addEventListener('mousemove', (e) => {
      const caja = svg.getBoundingClientRect();
      const rel = e.clientX - caja.left - m.left;
      const i = Math.max(0, Math.min(n - 1, Math.round((rel / w) * (n - 1))));
      cursor.setAttribute('x1', px(i)); cursor.setAttribute('x2', px(i)); cursor.setAttribute('opacity', 1);
      series.forEach((s, si) => {
        const pt = s.puntos[i];
        if (!pt || pt.y === null) { marcas[si].setAttribute('opacity', 0); return; }
        marcas[si].setAttribute('cx', px(i)); marcas[si].setAttribute('cy', py(pt.y));
        marcas[si].setAttribute('opacity', 1);
      });
      const filas = series.map((s, si) => {
        const pt = s.puntos[i];
        return `<span style="display:inline-flex;align-items:center;gap:.35rem">
          <i style="width:9px;height:9px;border-radius:3px;background:${s.color || p.series[si % 8]};display:inline-block"></i>
          ${esc(s.nombre)}: <b>${pt && pt.y !== null ? fmt.format(pt.y) + sufijo : '—'}</b></span>`;
      }).join('<br>');
      mostrarTip(e, `<b>${esc(etiquetaX(ejeX[i], true))}</b><br>${filas}`);
    });
    captura.addEventListener('mouseleave', () => {
      ocultarTip();
      cursor.setAttribute('opacity', 0);
      marcas.forEach((c) => c.setAttribute('opacity', 0));
    });
    svg.appendChild(captura);

    const caja = document.createElement('div');
    caja.appendChild(svg);
    if (series.length > 1) {
      const l = document.createElement('div');
      l.className = 'leyenda';
      l.innerHTML = series.map((s, si) =>
        `<span><i style="background:${s.color || p.series[si % 8]}"></i>${esc(s.nombre)}</span>`).join('');
      caja.appendChild(l);
    }
    cont.replaceChildren(caja);
  });
}

// ------------------------------------------------------- pequenos multiplos ---

/**
 * Un mini grafico por sector, todos con la misma escala vertical. Reemplaza al
 * grafico de ocho lineas superpuestas, que se vuelve ilegible.
 * series: [{ nombre, puntos: [{ x, y }] }]
 */
export function multiplos(cont, series, opciones = {}) {
  if (!series || !series.length) return vacio(cont);
  const { etiquetaX = (v) => v, altoCelda = 92 } = opciones;

  responsivo(cont, (ancho) => {
    const p = paleta();
    const columnas = Math.max(1, Math.min(3, Math.floor(ancho / 260)));
    const anchoCelda = Math.floor(ancho / columnas) - 12;
    const max = Math.max(...series.flatMap((s) => s.puntos.map((pt) => pt.y)), 1);

    const grilla = document.createElement('div');
    grilla.style.display = 'grid';
    grilla.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
    grilla.style.gap = '.8rem';

    series.forEach((s, si) => {
      const color = s.color || p.series[si % 8];
      const m = { top: 8, right: 4, bottom: 14, left: 4 };
      const w = anchoCelda - m.left - m.right;
      const h = altoCelda - m.top - m.bottom;
      const n = s.puntos.length;
      const px = (i) => m.left + (n === 1 ? w / 2 : (i / (n - 1)) * w);
      const py = (v) => m.top + h - (v / max) * h;
      const total = s.puntos.reduce((a, b) => a + b.y, 0);

      const celda = document.createElement('div');
      celda.innerHTML = `<div style="font-size:.8rem;font-weight:600;display:flex;gap:.4rem;align-items:center">
        <i style="width:9px;height:9px;border-radius:3px;background:${color};display:inline-block"></i>
        ${esc(recortar(s.nombre, 24))}
        <span style="margin-left:auto;color:var(--muted);font-weight:500">${fmt.format(total)}</span></div>`;

      const svg = el('svg', { class: 'viz', width: anchoCelda, height: altoCelda, viewBox: `0 0 ${anchoCelda} ${altoCelda}` });
      svg.appendChild(el('line', {
        x1: m.left, x2: m.left + w, y1: py(0), y2: py(0), stroke: p.grid, 'stroke-width': 1,
      }));
      const puntos = s.puntos.map((pt, i) => [px(i), py(pt.y)]);
      svg.appendChild(el('path', {
        d: `M${puntos[0][0]},${py(0)} ${puntos.map(([x, y]) => `L${x},${y}`).join(' ')} L${puntos[n - 1][0]},${py(0)} Z`,
        fill: color, opacity: .12,
      }));
      svg.appendChild(el('path', {
        d: `M${puntos.map(([x, y]) => `${x},${y}`).join(' L')}`,
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round',
      }));

      const marca = el('circle', { r: 4, fill: color, stroke: p.superficie, 'stroke-width': 2, opacity: 0 });
      svg.appendChild(marca);
      const captura = el('rect', { x: m.left, y: m.top, width: w, height: h, fill: 'transparent' });
      captura.addEventListener('mousemove', (e) => {
        const caja = svg.getBoundingClientRect();
        const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - caja.left - m.left) / w) * (n - 1))));
        marca.setAttribute('cx', px(i)); marca.setAttribute('cy', py(s.puntos[i].y)); marca.setAttribute('opacity', 1);
        mostrarTip(e, `<b>${esc(s.nombre)}</b><br>${esc(etiquetaX(s.puntos[i].x, true))}: <b>${fmt.format(s.puntos[i].y)}</b>`);
      });
      captura.addEventListener('mouseleave', () => { ocultarTip(); marca.setAttribute('opacity', 0); });
      svg.appendChild(captura);

      svg.appendChild(el('text', { x: m.left, y: altoCelda - 2, 'font-size': 10, fill: p.muted },
        etiquetaX(s.puntos[0].x)));
      svg.appendChild(el('text', {
        x: m.left + w, y: altoCelda - 2, 'font-size': 10, fill: p.muted, 'text-anchor': 'end',
      }, etiquetaX(s.puntos[n - 1].x)));

      celda.appendChild(svg);
      grilla.appendChild(celda);
    });

    const caja = document.createElement('div');
    caja.appendChild(grilla);
    const nota = document.createElement('p');
    nota.className = 'solo-lectura';
    nota.style.marginTop = '.5rem';
    nota.textContent = `Todos los gráficos usan la misma escala (0 a ${fmt.format(max)} consultas por día).`;
    caja.appendChild(nota);
    cont.replaceChildren(caja);
  });
}

// ----------------------------------------------------------------- heatmap ---

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ORDEN_DOW = [1, 2, 3, 4, 5, 6, 0]; // la semana arranca el lunes

/** datos: [{ dow, hora, total }] — magnitud continua: una sola tinta, clara a oscura. */
export function calor(cont, datos, opciones = {}) {
  if (!datos || !datos.length) return vacio(cont);
  const horas = [];
  const desdeHora = Math.min(...datos.map((d) => d.hora));
  const hastaHora = Math.max(...datos.map((d) => d.hora));
  for (let h = Math.min(desdeHora, opciones.desde ?? 7); h <= Math.max(hastaHora, opciones.hasta ?? 20); h++) horas.push(h);

  responsivo(cont, (ancho) => {
    const p = paleta();
    const mapa = new Map(datos.map((d) => [`${d.dow}-${d.hora}`, d.total]));
    const max = Math.max(...datos.map((d) => d.total), 1);
    const anchoEtiqueta = 66;
    const gap = 2;
    const celda = Math.max(14, Math.floor((ancho - anchoEtiqueta - 4) / horas.length) - gap);
    const alturaFila = Math.min(28, Math.max(16, celda));
    const alto = 7 * (alturaFila + gap) + 22;

    const svg = el('svg', { class: 'viz', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    const tinta = (v) => {
      if (!v) return p.grid;
      const escala = p.secuencial;
      const i = Math.min(escala.length - 1, Math.max(1, Math.round((v / max) * (escala.length - 1))));
      return escala[i];
    };

    ORDEN_DOW.forEach((dow, fila) => {
      const y = fila * (alturaFila + gap) + 2;
      svg.appendChild(el('text', {
        x: anchoEtiqueta - 8, y: y + alturaFila / 2 + 4, 'text-anchor': 'end', 'font-size': 11.5, fill: p.ink2,
      }, DIAS[fila].slice(0, 3)));

      horas.forEach((h, col) => {
        const v = mapa.get(`${dow}-${h}`) || 0;
        const x = anchoEtiqueta + col * (celda + gap);
        const r = el('rect', { x, y, width: celda, height: alturaFila, rx: 3, fill: tinta(v), opacity: v ? 1 : .5 });
        r.addEventListener('mousemove', (e) => mostrarTip(e,
          `<b>${DIAS[fila]} ${String(h).padStart(2, '0')}:00</b><br>${fmt.format(v)} consulta${v === 1 ? '' : 's'}`));
        r.addEventListener('mouseleave', ocultarTip);
        svg.appendChild(r);
      });
    });

    horas.forEach((h, col) => {
      if (horas.length > 12 && h % 2) return;
      svg.appendChild(el('text', {
        x: anchoEtiqueta + col * (celda + gap) + celda / 2, y: alto - 6,
        'text-anchor': 'middle', 'font-size': 10.5, fill: p.muted,
      }, String(h).padStart(2, '0')));
    });

    const caja = document.createElement('div');
    caja.appendChild(svg);
    const l = document.createElement('div');
    l.className = 'leyenda';
    l.innerHTML = `<span>Menos</span>${p.secuencial.map((c) =>
      `<i style="background:${c};width:16px;height:10px;border-radius:2px"></i>`).join('')}<span>Más (${fmt.format(max)})</span>`;
    caja.appendChild(l);
    cont.replaceChildren(caja);
  });
}

// ------------------------------------------------------------ distribucion ---

/** Distribucion 1..5 de la encuesta: escala ordenada, una sola tinta. */
export function distribucion(cont, datos, opciones = {}) {
  const total = datos.reduce((a, b) => a + b.total, 0);
  if (!total) return vacio(cont, 'Todavia no hay respuestas');

  responsivo(cont, (ancho) => {
    const p = paleta();
    const etiquetas = opciones.etiquetas || ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Muy bueno'];
    const alturaBarra = 18, gap = 12;
    const alto = 5 * (alturaBarra + gap);
    const anchoEtiqueta = 88;
    const x0 = anchoEtiqueta + 10;
    const util = Math.max(40, ancho - x0 - 92);
    const max = Math.max(...datos.map((d) => d.total), 1);

    const svg = el('svg', { class: 'viz', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    for (let v = 5; v >= 1; v--) {
      const fila = 5 - v;
      const y = fila * (alturaBarra + gap) + 2;
      const d = datos.find((x) => x.valor === v) || { total: 0 };
      const w = Math.max(2, (d.total / max) * util);
      svg.appendChild(el('text', {
        x: anchoEtiqueta, y: y + alturaBarra / 2 + 4, 'text-anchor': 'end', 'font-size': 12, fill: p.ink2,
      }, `${v} · ${etiquetas[v - 1]}`));
      svg.appendChild(el('rect', { x: x0, y, width: util, height: alturaBarra, rx: 4, fill: p.grid, opacity: .45 }));
      const r = el('rect', { x: x0, y, width: w, height: alturaBarra, rx: 4, fill: p.ordinal[v - 1] });
      r.addEventListener('mousemove', (e) => mostrarTip(e,
        `<b>${v} · ${etiquetas[v - 1]}</b><br>${fmt.format(d.total)} de ${fmt.format(total)} (${Math.round(d.total / total * 100)}%)`));
      r.addEventListener('mouseleave', ocultarTip);
      svg.appendChild(r);
      svg.appendChild(el('text', {
        x: x0 + w + 7, y: y + alturaBarra / 2 + 4, 'font-size': 12, fill: p.ink, 'font-weight': 600,
      }, `${fmt.format(d.total)}  (${Math.round(d.total / total * 100)}%)`));
    }
    cont.replaceChildren(svg);
  });
}

export { DIAS };
