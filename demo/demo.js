/* ============================================================
   Demostración: la misma interfaz y los mismos gráficos que la
   aplicación real, pero con los datos generados en el navegador.
   No hay servidor ni base de datos: todo vive en memoria.
   ============================================================ */

const $ = (id) => document.getElementById(id);

// --------------------------------------------------------------- datos ---

const SECTORES = [
  { id: 1, nombre: 'Energía Eléctrica', detalle: 'Suministro, cortes, medidores, conexiones', peso: 9 },
  { id: 2, nombre: 'Agua Potable', detalle: 'Suministro, presión, roturas, medidores', peso: 7 },
  { id: 3, nombre: 'Cloacas y Saneamiento', detalle: 'Desagües, obstrucciones, conexiones', peso: 3 },
  { id: 4, nombre: 'Internet y Telefonía', detalle: 'Altas, fallas de servicio, planes', peso: 6 },
  { id: 5, nombre: 'TV por Cable', detalle: 'Altas, señal, grilla, decodificadores', peso: 3 },
  { id: 6, nombre: 'Facturación y Cobranzas', detalle: 'Facturas, planes de pago, débitos, deuda', peso: 8 },
  { id: 7, nombre: 'Servicio Sepelio', detalle: 'Cobertura, trámites, plan sepelio', peso: 2 },
  { id: 8, nombre: 'Obras y Nuevas Conexiones', detalle: 'Factibilidad, obras, ampliaciones', peso: 2 },
  { id: 9, nombre: 'Atención al Socio', detalle: 'Altas y bajas, datos, reclamos generales', peso: 4 },
];

const MOTIVOS_POR_SECTOR = {
  1: ['Corte de suministro', 'Baja tensión', 'Medidor con falla', 'Alumbrado público', 'Nueva conexión', 'Consumo elevado', 'Poda / cables'],
  2: ['Falta de agua', 'Baja presión', 'Pérdida en la vía pública', 'Rotura de caño', 'Calidad del agua', 'Nueva conexión'],
  3: ['Obstrucción', 'Desborde', 'Olores', 'Nueva conexión'],
  4: ['Sin servicio', 'Servicio lento', 'Alta de servicio', 'Cambio de plan', 'Configuración de equipo', 'Baja de servicio'],
  5: ['Sin señal', 'Falla de decodificador', 'Alta de servicio', 'Grilla de canales', 'Baja de servicio'],
  6: ['Consulta de saldo', 'Reimpresión de factura', 'Plan de pago', 'Reclamo por importe', 'Débito automático', 'Vencimientos', 'Medios de pago'],
  7: ['Consulta de cobertura', 'Alta de plan', 'Trámite / servicio', 'Traslados'],
  8: ['Factibilidad', 'Estado de obra', 'Presupuesto', 'Ampliación de servicio'],
  9: ['Alta de socio', 'Actualización de datos', 'Cambio de titularidad', 'Reclamo general', 'Información institucional'],
};

const MOTIVOS = [];
let idMotivo = 0;
for (const [sectorId, nombres] of Object.entries(MOTIVOS_POR_SECTOR)) {
  for (const nombre of nombres) MOTIVOS.push({ id: ++idMotivo, sector_id: Number(sectorId), nombre });
}

const CANALES = [
  { id: 1, nombre: 'Telefónico', peso: 10 },
  { id: 2, nombre: 'Presencial', peso: 6 },
  { id: 3, nombre: 'WhatsApp', peso: 5 },
  { id: 4, nombre: 'Email', peso: 2 },
  { id: 5, nombre: 'Web / Redes', peso: 1 },
];

const OPERADORES = [
  { id: 1, nombre: 'Marina López', puesto: 'call_center' },
  { id: 2, nombre: 'Julián Pérez', puesto: 'call_center' },
  { id: 3, nombre: 'Rocío Gómez', puesto: 'mesa_informes' },
  { id: 4, nombre: 'Diego Sosa', puesto: 'mesa_informes' },
  { id: 5, nombre: 'Silvia Vera', puesto: 'call_center' },
];

const LOCALIDADES = [
  { id: 1, nombre: 'Centro' }, { id: 2, nombre: 'Barrio Norte' }, { id: 3, nombre: 'Villa Elisa' },
  { id: 4, nombre: 'Colonia San José' }, { id: 5, nombre: 'Zona rural' },
];

const COMENTARIOS = [
  'Me atendieron muy bien y rápido.',
  'Estuve mucho tiempo esperando en línea.',
  'Resolvieron el problema en el día.',
  'Me derivaron y nunca me llamaron.',
  'Muy amables en el mostrador.',
  'Deberían tener más líneas telefónicas.',
  'La chica me explicó todo con paciencia.',
  'Tuve que llamar tres veces por lo mismo.',
];

const USUARIO = OPERADORES[0];   // el operador con el que se navega la demo
const DIAS_DEMO = 90;

let CONSULTAS = [];
let ENCUESTAS = [];

// ------------------------------------------------------------- helpers ---

/** Generador con semilla fija: todos los que abren la demo ven los mismos números. */
function generador(semilla) {
  let a = semilla >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let azar = generador(20260804);
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const uno = (lista) => lista[Math.floor(azar() * lista.length)];

function pesado(items, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = azar() * total;
  for (let i = 0; i < items.length; i++) { r -= pesos[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

const iso = (fecha) => {
  const d = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
const HOY = iso(new Date());
function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
const diaSemana = (fechaISO) => new Date(`${fechaISO}T12:00:00Z`).getUTCDay();

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('es-AR');
const num = (n) => (n === null || n === undefined ? '—' : nf.format(n));
const dec = (n, d = 1) => (n === null || n === undefined ? '—' : Number(n).toFixed(d).replace('.', ','));
const pct = (n) => (n === null || n === undefined ? '—' : `${dec(n, 1)}%`);
const redondear = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? null : Number(Number(n).toFixed(d)));

const fechaLarga = (isoTexto) => {
  if (!isoTexto) return '—';
  const [a, m, d] = isoTexto.slice(0, 10).split('-');
  return `${d}/${m}/${a}` + (isoTexto.length > 10 ? ` ${isoTexto.slice(11, 16)}` : '');
};
const fechaCorta = (isoTexto) => `${isoTexto.slice(8, 10)}/${isoTexto.slice(5, 7)}` +
  (isoTexto.length > 10 ? ` ${isoTexto.slice(11, 16)}` : '');
const minutos = (seg) => (seg ? `${Math.round(seg / 60)} min` : '—');

const ESTADOS = { resuelta: 'Resuelta', derivada: 'Derivada', pendiente: 'Pendiente', reclamo: 'Reclamo generado' };
const PUESTOS = { call_center: 'Call center', mesa_informes: 'Mesa de informes', otro: 'Otro' };
const etiquetaEstado = (e) => ESTADOS[e] || e;
const etiquetaPuesto = (p) => PUESTOS[p] || p;

const sectorDe = (id) => SECTORES.find((s) => s.id === id);
const motivoDe = (id) => MOTIVOS.find((m) => m.id === id);
const canalDe = (id) => CANALES.find((c) => c.id === id);
const operadorDe = (id) => OPERADORES.find((o) => o.id === id);

// --------------------------------------------------------- generación ---

function generarDatos() {
  azar = generador(20260804);
  CONSULTAS = [];
  ENCUESTAS = [];
  let id = 0;

  const pesoHora = { 8: 6, 9: 10, 10: 12, 11: 10, 12: 6, 13: 4, 14: 5, 15: 7, 16: 8, 17: 6, 18: 3 };
  const horas = Object.keys(pesoHora).map(Number);

  for (let d = DIAS_DEMO - 1; d >= 0; d--) {
    const fecha = sumarDias(HOY, -d);
    const dow = diaSemana(fecha);
    if (dow === 0) continue;                        // domingo cerrado
    const factor = dow === 6 ? 0.35 : 1;            // sábado, media jornada
    const pico = azar() < 0.08 ? 1.9 : 1;           // corte general o vencimiento
    const cantidad = Math.round(26 * factor * pico * (0.75 + azar() * 0.5));

    for (let i = 0; i < cantidad; i++) {
      const sector = pesado(SECTORES, SECTORES.map((s) => s.peso));
      const motivo = uno(MOTIVOS.filter((m) => m.sector_id === sector.id));
      const canal = pesado(CANALES, CANALES.map((c) => c.peso));
      const operador = uno(OPERADORES);
      const hora = pesado(horas, horas.map((h) => pesoHora[h]));
      const ts = `${fecha}T${String(hora).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00`;
      const estado = pesado(['resuelta', 'derivada', 'pendiente', 'reclamo'], [66, 14, 8, 12]);

      CONSULTAS.push({
        id: ++id,
        ts, fecha, hora, dow,
        operador_id: operador.id,
        puesto: canal.nombre === 'Presencial' ? 'mesa_informes' : operador.puesto,
        canal_id: canal.id,
        sector_id: sector.id,
        motivo_id: motivo.id,
        localidad_id: uno(LOCALIDADES).id,
        socio_nro: String(entre(1000, 9999)),
        estado,
        primer_contacto: estado === 'resuelta' ? 1 : (azar() < 0.2 ? 1 : 0),
        duracion_seg: entre(90, 900),
        observaciones: `Consulta por ${motivo.nombre.toLowerCase()}.`,
      });

      if (azar() < 0.17) {
        const base = estado === 'resuelta' ? 4 : 3;
        const nota = Math.max(1, Math.min(5, base + entre(-1, 1)));
        const acotar = (v) => Math.max(1, Math.min(5, v));
        ENCUESTAS.push({
          fecha, sector_id: sector.id, canal_id: canal.id, operador_id: operador.id,
          respondida: ts,
          satisfaccion: nota,
          resolucion: acotar(nota + entre(-1, 0)),
          atencion: acotar(nota + entre(0, 1)),
          espera: acotar(nota + entre(-1, 1)),
          recomendaria: Math.max(0, Math.min(10, nota * 2 + entre(-2, 1))),
          comentario: azar() < 0.25 ? uno(COMENTARIOS) : '',
        });
      }
    }
  }
  CONSULTAS.sort((a, b) => (a.ts < b.ts ? -1 : 1));
}

// ------------------------------------------------------------- filtros ---

const filtro = { dias: 30, sector_id: '' };
const desdeFiltro = () => sumarDias(HOY, -(filtro.dias - 1));

function consultasFiltradas() {
  const desde = desdeFiltro();
  return CONSULTAS.filter((c) => c.fecha >= desde && c.fecha <= HOY
    && (!filtro.sector_id || c.sector_id === Number(filtro.sector_id)));
}

function encuestasFiltradas() {
  const desde = desdeFiltro();
  return ENCUESTAS.filter((e) => e.fecha >= desde && e.fecha <= HOY
    && (!filtro.sector_id || e.sector_id === Number(filtro.sector_id)));
}

const RANGOS = [[7, 'Últimos 7 días'], [30, 'Últimos 30 días'], [90, 'Últimos 90 días']];

/** Barra de filtros de la demo: rango de fechas y sector. */
function montarFiltros(contenedor, alCambiar) {
  contenedor.innerHTML = `
    <div class="fila" style="align-items:flex-end">
      <div class="campo" style="flex:0 0 auto">
        <label>Período</label>
        <div class="segmentado">
          ${RANGOS.map(([d, t]) => `<button type="button" data-dias="${d}"${filtro.dias === d ? ' aria-pressed="true"' : ''}>${t}</button>`).join('')}
        </div>
      </div>
      <div class="campo"><label>Sector</label>
        <select data-sector>
          <option value="">Todos</option>
          ${SECTORES.map((s) => `<option value="${s.id}"${String(s.id) === String(filtro.sector_id) ? ' selected' : ''}>${escapar(s.nombre)}</option>`).join('')}
        </select></div>
      <span style="flex:1"></span>
      <span class="solo-lectura">${fechaLarga(desdeFiltro())} — ${fechaLarga(HOY)}</span>
    </div>`;
  contenedor.querySelectorAll('[data-dias]').forEach((b) => {
    b.onclick = () => { filtro.dias = Number(b.dataset.dias); alCambiar(); };
  });
  contenedor.querySelector('[data-sector]').onchange = (e) => {
    filtro.sector_id = e.target.value; alCambiar();
  };
}

// -------------------------------------------------------- agregaciones ---

function agrupar(lista, clave) {
  const mapa = new Map();
  for (const x of lista) {
    const k = clave(x);
    if (k === null || k === undefined) continue;
    mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  return mapa;
}

function estadisticas() {
  const desde = desdeFiltro();
  const filas = consultasFiltradas();
  const total = filas.length;
  const dias = filtro.dias;

  const cuenta = (fn) => filas.filter(fn).length;
  const conDuracion = filas.filter((c) => c.duracion_seg > 0);

  const anterior = (() => {
    const hastaPrev = sumarDias(desde, -1);
    const desdePrev = sumarDias(hastaPrev, -(dias - 1));
    return CONSULTAS.filter((c) => c.fecha >= desdePrev && c.fecha <= hastaPrev
      && (!filtro.sector_id || c.sector_id === Number(filtro.sector_id))).length;
  })();

  const porSector = SECTORES.map((s) => {
    const dell = filas.filter((c) => c.sector_id === s.id);
    const conDur = dell.filter((c) => c.duracion_seg > 0);
    const primer = dell.filter((c) => c.primer_contacto).length;
    return {
      id: s.id, nombre: s.nombre, total: dell.length,
      pendientes: dell.filter((c) => c.estado === 'pendiente').length,
      derivadas: dell.filter((c) => c.estado === 'derivada').length,
      reclamos: dell.filter((c) => c.estado === 'reclamo').length,
      pct: total ? redondear((dell.length / total) * 100, 1) : 0,
      pct_primer_contacto: dell.length ? redondear((primer / dell.length) * 100, 1) : null,
      duracion_prom_min: conDur.length
        ? redondear(conDur.reduce((a, c) => a + c.duracion_seg, 0) / conDur.length / 60, 1) : null,
    };
  }).filter((s) => s.total).sort((a, b) => b.total - a.total);

  const porMotivo = [...agrupar(filas, (c) => c.motivo_id)]
    .map(([id, n]) => {
      const m = motivoDe(id);
      return { id, nombre: m.nombre, sector: sectorDe(m.sector_id).nombre, total: n };
    })
    .sort((a, b) => b.total - a.total).slice(0, 15);

  const porCanal = [...agrupar(filas, (c) => c.canal_id)]
    .map(([id, n]) => ({ id, nombre: canalDe(id).nombre, total: n }))
    .sort((a, b) => b.total - a.total);

  const porPuesto = [...agrupar(filas, (c) => c.puesto)]
    .map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);

  const porOperador = [...agrupar(filas, (c) => c.operador_id)]
    .map(([id, n]) => {
      const suyas = filas.filter((c) => c.operador_id === id);
      const conDur = suyas.filter((c) => c.duracion_seg > 0);
      return {
        id, nombre: operadorDe(id).nombre, puesto: operadorDe(id).puesto, total: n,
        pct_primer_contacto: redondear((suyas.filter((c) => c.primer_contacto).length / n) * 100, 1),
        duracion_prom_min: conDur.length
          ? redondear(conDur.reduce((a, c) => a + c.duracion_seg, 0) / conDur.length / 60, 1) : null,
      };
    }).sort((a, b) => b.total - a.total);

  const porLocalidad = [...agrupar(filas, (c) => c.localidad_id)]
    .map(([id, n]) => ({ id, nombre: LOCALIDADES.find((l) => l.id === id).nombre, total: n }))
    .sort((a, b) => b.total - a.total);

  const porFecha = agrupar(filas, (c) => c.fecha);
  const serie = [];
  for (let f = desde; f <= HOY; f = sumarDias(f, 1)) serie.push({ fecha: f, total: porFecha.get(f) || 0 });

  const heatmap = [...agrupar(filas, (c) => `${c.dow}|${c.hora}`)]
    .map(([k, total]) => ({ dow: Number(k.split('|')[0]), hora: Number(k.split('|')[1]), total }));

  const topSectores = porSector.slice(0, 6).map((s) => s.id);
  const serieSector = [];
  for (const sid of topSectores) {
    const delSector = agrupar(filas.filter((c) => c.sector_id === sid), (c) => c.fecha);
    for (const [fecha, tot] of delSector) serieSector.push({ sector_id: sid, fecha, total: tot });
  }

  const enc = encuestasFiltradas();

  return {
    periodo: { desde, hasta: HOY, dias },
    resumen: {
      total,
      promedio_dia: redondear(total / dias, 1),
      resueltas: cuenta((c) => c.estado === 'resuelta'),
      derivadas: cuenta((c) => c.estado === 'derivada'),
      pendientes: cuenta((c) => c.estado === 'pendiente'),
      pct_primer_contacto: total ? redondear((cuenta((c) => c.primer_contacto) / total) * 100, 1) : null,
      pct_pendientes: total ? redondear((cuenta((c) => c.estado === 'pendiente') / total) * 100, 1) : null,
      duracion_prom_min: conDuracion.length
        ? redondear(conDuracion.reduce((a, c) => a + c.duracion_seg, 0) / conDuracion.length / 60, 1) : null,
      variacion_pct: anterior ? redondear(((total - anterior) / anterior) * 100, 1) : null,
      satisfaccion: enc.length ? redondear(enc.reduce((a, e) => a + e.satisfaccion, 0) / enc.length, 2) : null,
      encuestas_respondidas: enc.length,
    },
    por_sector: porSector,
    por_motivo: porMotivo,
    por_canal: porCanal,
    por_puesto: porPuesto,
    por_operador: porOperador,
    por_localidad: porLocalidad,
    serie,
    serie_sector: serieSector,
    heatmap,
  };
}

function estadisticasEncuestas() {
  const filas = encuestasFiltradas();
  const n = filas.length;
  const prom = (campo) => (n ? redondear(filas.reduce((a, e) => a + (e[campo] || 0), 0) / n, 2) : null);

  const promotores = filas.filter((e) => e.recomendaria >= 9).length;
  const detractores = filas.filter((e) => e.recomendaria <= 6).length;

  const porSector = SECTORES.map((s) => {
    const suyas = filas.filter((e) => e.sector_id === s.id);
    if (!suyas.length) return null;
    const p = (campo) => redondear(suyas.reduce((a, e) => a + (e[campo] || 0), 0) / suyas.length, 2);
    return {
      nombre: s.nombre, respuestas: suyas.length,
      satisfaccion: p('satisfaccion'), resolucion: p('resolucion'),
      atencion: p('atencion'), espera: p('espera'),
    };
  }).filter(Boolean).sort((a, b) => b.respuestas - a.respuestas);

  const porFecha = new Map();
  for (const e of filas) {
    const acc = porFecha.get(e.fecha) || { n: 0, suma: 0 };
    acc.n++; acc.suma += e.satisfaccion;
    porFecha.set(e.fecha, acc);
  }

  return {
    resumen: {
      respondidas: n,
      satisfaccion: prom('satisfaccion'),
      resolucion: prom('resolucion'),
      atencion: prom('atencion'),
      espera: prom('espera'),
      csat: n ? redondear((filas.filter((e) => e.satisfaccion >= 4).length / n) * 100, 1) : null,
      nps: n ? Math.round(((promotores - detractores) / n) * 100) : null,
    },
    distribucion: [1, 2, 3, 4, 5].map((v) => ({ valor: v, total: filas.filter((e) => e.satisfaccion === v).length })),
    por_sector: porSector,
    serie: [...porFecha.entries()].sort().map(([fecha, a]) => ({ fecha, satisfaccion: redondear(a.suma / a.n, 2) })),
    comentarios: filas.filter((e) => e.comentario).slice(-30).reverse(),
  };
}

// ------------------------------------------------------ pantalla rápida ---

const PUESTOS_ATENCION = [
  { id: 'call_center', nombre: 'Call center', canal: 1 },       // canal telefónico
  { id: 'mesa_informes', nombre: 'Mesa de informes', canal: 2 }, // canal presencial
];
let puestoActual = 'call_center';
let ultima = null;
let temporizador = null;
const SEGUNDOS_DESHACER = 12;

function frecuentesDelOperador() {
  const suyas = CONSULTAS.filter((c) => c.operador_id === USUARIO.id && c.motivo_id);
  return [...agrupar(suyas, (c) => c.motivo_id)]
    .sort((a, b) => b[1] - a[1]).slice(0, 9).map(([id]) => motivoDe(id));
}

const hoyPorMotivo = (motivoId) =>
  CONSULTAS.filter((c) => c.fecha === HOY && c.operador_id === USUARIO.id && c.motivo_id === motivoId).length;

function fichaHTML(motivo, { atajo = null, conSector = false } = {}) {
  const hoy = hoyPorMotivo(motivo.id);
  return `
    <button type="button" class="ficha" data-motivo="${motivo.id}">
      ${atajo ? `<span class="atajo">${atajo}</span>` : ''}
      <span class="titulo">${escapar(motivo.nombre)}</span>
      ${conSector ? `<span class="sector">${escapar(sectorDe(motivo.sector_id).nombre)}</span>` : ''}
      <span class="veces${hoy ? '' : ' oculto'}" data-veces="${motivo.id}">${hoy} hoy</span>
    </button>`;
}

/**
 * El operador elige una sola vez dónde atiende. El canal se deduce del puesto;
 * si la consulta entró por WhatsApp o mail se corrige desde "Agregar datos".
 */
const canalDelPuesto = () => (PUESTOS_ATENCION.find((p) => p.id === puestoActual) || PUESTOS_ATENCION[0]).canal;

function pintarRapido() {
  $('puestos').innerHTML = PUESTOS_ATENCION.map((p) => `
    <button type="button" data-puesto="${p.id}"${p.id === puestoActual ? ' aria-pressed="true"' : ''}>
      ${escapar(p.nombre)}</button>`).join('');
  $('puestos').querySelectorAll('[data-puesto]').forEach((b) => {
    b.onclick = () => { puestoActual = b.dataset.puesto; pintarRapido(); };
  });

  $('frecuentes').innerHTML = frecuentesDelOperador()
    .map((m, i) => fichaHTML(m, { atajo: i + 1, conSector: true })).join('');

  $('sectores').innerHTML = SECTORES.map((s) => `
    <section class="tarjeta" style="margin-top:1rem">
      <header><h2>${escapar(s.nombre)}</h2><p>${escapar(s.detalle)}</p></header>
      <div class="botonera">
        ${MOTIVOS.filter((m) => m.sector_id === s.id).map((m) => fichaHTML(m)).join('')}
        <button type="button" class="ficha otra" data-sector="${s.id}">
          <span class="titulo">Otra consulta</span>
          <span class="sector">sin motivo específico</span>
        </button>
      </div>
    </section>`).join('');

  document.querySelectorAll('#p-rapido [data-motivo]').forEach((b) => {
    b.onclick = () => registrar(Number(b.dataset.motivo), null, b);
  });
  document.querySelectorAll('#p-rapido [data-sector]').forEach((b) => {
    b.onclick = () => registrar(null, Number(b.dataset.sector), b);
  });
  pintarContador();
}

function pintarContador() {
  const deHoy = CONSULTAS.filter((c) => c.fecha === HOY);
  $('contador').innerHTML = `<b>${num(deHoy.filter((c) => c.operador_id === USUARIO.id).length)}</b>
    cargadas hoy por vos · <b>${num(deHoy.length)}</b> en total`;
}

function registrar(motivoId, sectorId, ficha) {
  const motivo = motivoId ? motivoDe(motivoId) : null;
  const sector = sectorId || (motivo && motivo.sector_id);
  if (!sector) return;

  if (ficha) {
    ficha.classList.add('marcada');
    setTimeout(() => ficha.classList.remove('marcada'), 450);
  }

  const ahora = new Date();
  const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const consulta = {
    id: Math.max(...CONSULTAS.map((c) => c.id)) + 1,
    ts: `${HOY}T${hhmm}:00`, fecha: HOY, hora: ahora.getHours(), dow: diaSemana(HOY),
    operador_id: USUARIO.id, puesto: puestoActual, canal_id: canalDelPuesto(),
    sector_id: sector, motivo_id: motivoId, localidad_id: null,
    socio_nro: '', estado: 'resuelta', primer_contacto: 1, duracion_seg: 0, observaciones: '',
  };
  CONSULTAS.push(consulta);
  ultima = consulta;

  if (motivoId) {
    const n = hoyPorMotivo(motivoId);
    document.querySelectorAll(`[data-veces="${motivoId}"]`).forEach((s) => {
      s.textContent = `${n} hoy`;
      s.classList.remove('oculto');
    });
  }
  pintarContador();
  mostrarConfirmacion(motivo ? motivo.nombre : sectorDe(sector).nombre);
}

function mostrarConfirmacion(titulo) {
  const caja = $('brindis');
  caja.className = 'brindis visible';
  caja.innerHTML = `
    <div class="linea">
      <b>Registrada</b> · ${escapar(titulo)}
      <span id="marca-estado" class="marca-estado"></span>
      <span class="cuenta" id="cuenta">${SEGUNDOS_DESHACER}</span>
    </div>
    <div class="acciones">
      <button type="button" data-estado="derivada">Derivada</button>
      <button type="button" data-estado="pendiente">Pendiente</button>
      <button type="button" data-estado="reclamo">Reclamo</button>
      <button type="button" id="mas-datos">Agregar datos</button>
      <button type="button" id="deshacer">Deshacer <small>(Esc)</small></button>
    </div>`;

  caja.querySelectorAll('[data-estado]').forEach((b) => {
    b.onclick = () => {
      if (!ultima) return;
      ultima.estado = b.dataset.estado;
      ultima.primer_contacto = b.dataset.estado === 'resuelta' ? 1 : 0;
      caja.querySelectorAll('[data-estado]').forEach((x) => x.removeAttribute('aria-pressed'));
      b.setAttribute('aria-pressed', 'true');
      $('marca-estado').textContent = `· ${etiquetaEstado(b.dataset.estado)}`;
    };
  });
  caja.querySelector('#deshacer').onclick = deshacer;
  caja.querySelector('#mas-datos').onclick = abrirDetalle;

  clearInterval(temporizador);
  let restante = SEGUNDOS_DESHACER;
  temporizador = setInterval(() => {
    restante--;
    const c = $('cuenta');
    if (c) c.textContent = restante;
    if (restante <= 0) cerrarConfirmacion();
  }, 1000);
}

function cerrarConfirmacion() {
  clearInterval(temporizador);
  ultima = null;
  $('brindis').className = 'brindis';
}

function aviso(mensaje) {
  const caja = $('brindis');
  caja.className = 'brindis visible';
  caja.innerHTML = `<div class="linea">${escapar(mensaje)}</div>`;
  clearInterval(temporizador);
  ultima = null;
  temporizador = setTimeout(() => { caja.className = 'brindis'; }, 4000);
}

function deshacer() {
  if (!ultima) return;
  const quitada = ultima;
  CONSULTAS = CONSULTAS.filter((c) => c.id !== quitada.id);
  if (quitada.motivo_id) {
    const n = hoyPorMotivo(quitada.motivo_id);
    document.querySelectorAll(`[data-veces="${quitada.motivo_id}"]`).forEach((s) => {
      s.textContent = `${n} hoy`;
      s.classList.toggle('oculto', !n);
    });
  }
  pintarContador();
  aviso('Registro deshecho');
}

function abrirDetalle() {
  const c = ultima;
  if (!c) return;
  clearInterval(temporizador);
  $('detalle-cuerpo').innerHTML = `
    <h2>Consulta #${c.id}</h2>
    <p class="solo-lectura">${escapar(sectorDe(c.sector_id).nombre)}${c.motivo_id ? ` · ${escapar(motivoDe(c.motivo_id).nombre)}` : ''}</p>
    <form id="form-detalle">
      <div class="fila" style="margin-top:.6rem">
        <div class="campo corto"><label for="d-socio">N° de socio</label>
          <input id="d-socio" inputmode="numeric"></div>
        <div class="campo"><label for="d-nombre">Nombre del socio</label><input id="d-nombre"></div>
        <div class="campo corto"><label for="d-canal">Canal</label>
          <select id="d-canal">${CANALES.map((x) => `
            <option value="${x.id}"${x.id === c.canal_id ? ' selected' : ''}>${escapar(x.nombre)}</option>`).join('')}
          </select></div>
        <div class="campo corto"><label for="d-duracion">Duración (min)</label>
          <input id="d-duracion" type="number" min="0" step="1"></div>
      </div>
      <div style="margin-top:.6rem">
        <label for="d-obs">Observaciones</label>
        <textarea id="d-obs" placeholder="Qué se le informó al socio, a quién se derivó…"></textarea>
      </div>
      <div class="pie" style="border:0;padding:.8rem 0 0">
        <button type="button" id="d-cerrar">Cancelar</button>
        <button type="submit" class="primario">Guardar</button>
      </div>
    </form>`;
  $('detalle').showModal();
  $('d-cerrar').onclick = () => { $('detalle').close(); cerrarConfirmacion(); };
  $('form-detalle').onsubmit = (e) => {
    e.preventDefault();
    c.canal_id = Number($('d-canal').value);
    c.socio_nro = $('d-socio').value.trim();
    c.socio_nombre = $('d-nombre').value.trim();
    c.duracion_seg = Math.round(Number($('d-duracion').value || 0) * 60);
    c.observaciones = $('d-obs').value.trim();
    $('detalle').close();
    cerrarConfirmacion();
    aviso(`Consulta #${c.id} completada`);
  };
}

// --------------------------------------------------- pantalla consultas ---

function pintarConsultas() {
  montarFiltros($('c-filtros'), pintarConsultas);
  const busqueda = $('c-buscar').value.trim().toLowerCase();
  let filas = consultasFiltradas().slice().reverse();
  if (busqueda) {
    filas = filas.filter((c) => {
      const m = c.motivo_id ? motivoDe(c.motivo_id).nombre : '';
      return `${c.socio_nro} ${m} ${c.observaciones} ${sectorDe(c.sector_id).nombre}`.toLowerCase().includes(busqueda);
    });
  }
  $('c-resumen').textContent = `${num(filas.length)} consulta${filas.length === 1 ? '' : 's'}
    entre ${fechaLarga(desdeFiltro())} y ${fechaLarga(HOY)}`;

  const visibles = filas.slice(0, 200);
  $('c-tabla').innerHTML = visibles.length ? `
    <table>
      <thead><tr><th>Fecha</th><th>Sector</th><th>Motivo</th><th>Canal</th><th>Socio</th>
        <th>Estado</th><th>Operador</th><th class="num">Duración</th></tr></thead>
      <tbody>${visibles.map((c) => `
        <tr>
          <td>${fechaCorta(c.ts)}</td>
          <td>${escapar(sectorDe(c.sector_id).nombre)}</td>
          <td>${escapar(c.motivo_id ? motivoDe(c.motivo_id).nombre : '—')}</td>
          <td>${escapar(canalDe(c.canal_id).nombre)}</td>
          <td>${escapar(c.socio_nro || '—')}</td>
          <td><span class="chip ${c.estado}">${etiquetaEstado(c.estado)}</span></td>
          <td>${escapar(operadorDe(c.operador_id).nombre)}</td>
          <td class="num">${minutos(c.duracion_seg)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${filas.length > visibles.length ? `<p class="solo-lectura" style="margin-top:.6rem">
      Se muestran las ${visibles.length} más recientes de ${num(filas.length)}. En la aplicación real
      el listado pagina y se exporta a CSV.</p>` : ''}`
    : '<p class="vacio">No hay consultas con esos filtros</p>';
}

// ------------------------------------------------------- pantalla panel ---

function pintarPanel() {
  montarFiltros($('p-filtros'), pintarPanel);
  const d = estadisticas();
  const r = d.resumen;

  const variacion = r.variacion_pct === null ? ''
    : `<span class="${r.variacion_pct >= 0 ? 'sube' : 'baja'}">${r.variacion_pct >= 0 ? '▲' : '▼'} ${dec(Math.abs(r.variacion_pct))}%</span> vs. período anterior`;

  $('kpis').innerHTML = `
    <div class="kpi"><div class="etiqueta">Consultas</div>
      <div class="valor">${num(r.total)}</div>
      <div class="pie">${variacion || `${d.periodo.dias} días`}</div></div>
    <div class="kpi"><div class="etiqueta">Promedio por día</div>
      <div class="valor">${dec(r.promedio_dia)}</div>
      <div class="pie">${d.periodo.dias} días del período</div></div>
    <div class="kpi"><div class="etiqueta">Resueltas al 1er contacto</div>
      <div class="valor">${pct(r.pct_primer_contacto)}</div>
      <div class="pie">${num(r.resueltas)} cerradas en el acto</div></div>
    <div class="kpi"><div class="etiqueta">Pendientes</div>
      <div class="valor">${num(r.pendientes)}</div>
      <div class="pie">${pct(r.pct_pendientes)} del total · ${num(r.derivadas)} derivadas</div></div>
    <div class="kpi"><div class="etiqueta">Duración promedio</div>
      <div class="valor">${r.duracion_prom_min === null ? '—' : `${dec(r.duracion_prom_min)}′`}</div>
      <div class="pie">sobre las consultas con tiempo cargado</div></div>
    <div class="kpi"><div class="etiqueta">Conformidad</div>
      <div class="valor">${r.satisfaccion === null ? '—' : `${dec(r.satisfaccion, 2)}/5`}</div>
      <div class="pie">${num(r.encuestas_respondidas)} encuestas respondidas</div></div>`;

  $('sub-evolucion').textContent = `${fechaLarga(d.periodo.desde)} — ${fechaLarga(d.periodo.hasta)}`;

  const etiquetaX = (v, completo) => (completo ? fechaLarga(v) : `${v.slice(8)}/${v.slice(5, 7)}`);

  lineas($('g-evolucion'), [{ nombre: 'Consultas', puntos: d.serie.map((s) => ({ x: s.fecha, y: s.total })) }],
    { alto: 250, etiquetaX });

  barras($('g-sector'), d.por_sector.map((s) => ({
    etiqueta: s.nombre, valor: s.total,
    detalle: `${pct(s.pct)} del total · ${pct(s.pct_primer_contacto)} al 1er contacto`,
  })));

  const p = paleta();
  const estados = ['resuelta', 'derivada', 'pendiente', 'reclamo'];
  apiladas($('g-estado-sector'), d.por_sector.map((s) => ({
    etiqueta: s.nombre,
    partes: [
      { nombre: 'Resuelta', valor: s.total - s.derivadas - s.pendientes - s.reclamos, color: p.estado.resuelta },
      { nombre: 'Derivada', valor: s.derivadas, color: p.estado.derivada },
      { nombre: 'Pendiente', valor: s.pendientes, color: p.estado.pendiente },
      { nombre: 'Reclamo generado', valor: s.reclamos, color: p.estado.reclamo },
    ],
  })), { leyenda: estados.map((e) => ({ nombre: etiquetaEstado(e), color: p.estado[e] })) });

  barras($('g-motivos'), d.por_motivo.map((m) => ({ etiqueta: m.nombre, valor: m.total, detalle: m.sector })),
    { maxEtiqueta: 30 });
  barras($('g-canal'), d.por_canal.map((c) => ({ etiqueta: c.nombre, valor: c.total })));
  barras($('g-puesto'), d.por_puesto.map((c) => ({ etiqueta: etiquetaPuesto(c.nombre), valor: c.total })));

  calor($('g-calor'), d.heatmap);
  const pico = d.heatmap.slice().sort((a, b) => b.total - a.total)[0];
  if (pico) {
    $('sub-calor').textContent = `pico: ${DIAS[[1, 2, 3, 4, 5, 6, 0].indexOf(pico.dow)]} ${String(pico.hora).padStart(2, '0')}:00 con ${num(pico.total)} consultas`;
  }

  const fechas = d.serie.map((s) => s.fecha);
  const seriesSector = [...new Set(d.serie_sector.map((s) => s.sector_id))].map((id) => {
    const mapa = new Map(d.serie_sector.filter((s) => s.sector_id === id).map((s) => [s.fecha, s.total]));
    return { nombre: sectorDe(id).nombre, puntos: fechas.map((f) => ({ x: f, y: mapa.get(f) || 0 })) };
  });
  multiplos($('g-sector-tiempo'), seriesSector, { etiquetaX });

  $('t-sector').innerHTML = `
    <table>
      <thead><tr><th>Sector</th><th class="num">Consultas</th><th class="num">%</th>
        <th class="num">1er contacto</th><th class="num">Pendientes</th><th class="num">Duración</th></tr></thead>
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
        <th class="num">1er contacto</th><th class="num">Duración</th></tr></thead>
      <tbody>${d.por_operador.map((o) => `
        <tr><td>${escapar(o.nombre)}</td>
            <td>${etiquetaPuesto(o.puesto)}</td>
            <td class="num">${num(o.total)}</td>
            <td class="num">${pct(o.pct_primer_contacto)}</td>
            <td class="num">${o.duracion_prom_min === null ? '—' : `${dec(o.duracion_prom_min)}′`}</td></tr>`).join('')
    || '<tr><td colspan="5" class="vacio">Sin datos</td></tr>'}
      </tbody>
    </table>`;
}

// ------------------------------------------------- pantalla satisfacción ---

function pintarSatisfaccion() {
  montarFiltros($('s-filtros'), pintarSatisfaccion);
  const d = estadisticasEncuestas();
  const r = d.resumen;

  $('sat-kpis').innerHTML = `
    <div class="kpi"><div class="etiqueta">Respuestas</div>
      <div class="valor">${num(r.respondidas)}</div>
      <div class="pie">del período elegido</div></div>
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

  distribucion($('sat-distribucion'), d.distribucion);

  const p = paleta();
  barras($('sat-dimensiones'), [
    { etiqueta: 'Conformidad', valor: r.satisfaccion || 0 },
    { etiqueta: 'Resolución', valor: r.resolucion || 0 },
    { etiqueta: 'Atención', valor: r.atencion || 0 },
    { etiqueta: 'Espera', valor: r.espera || 0 },
  ].filter((x) => x.valor), { color: p.series[0], escala: 5 });

  lineas($('sat-serie'), [{
    nombre: 'Conformidad promedio',
    puntos: d.serie.map((s) => ({ x: s.fecha, y: s.satisfaccion })),
  }], {
    alto: 220,
    etiquetaX: (v, completo) => (completo ? fechaLarga(v) : `${v.slice(8)}/${v.slice(5, 7)}`),
    formatoY: (v) => dec(v, 1),
  });

  $('sat-t-sector').innerHTML = d.por_sector.length ? `
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

  $('sat-comentarios').innerHTML = d.comentarios.length ? d.comentarios.map((c) => `
    <div style="border-bottom:1px solid var(--grid);padding:.5rem 0">
      <div style="font-size:.76rem;color:var(--muted)">
        ${fechaLarga(c.respondida || c.fecha)} · ${escapar(sectorDe(c.sector_id).nombre)} · conformidad ${c.satisfaccion}/5
      </div>
      <div>${escapar(c.comentario)}</div>
    </div>`).join('') : '<p class="vacio">Sin comentarios en el período</p>';
}

// ---------------------------------------------------- encuesta del socio ---

const PREGUNTAS = [
  { id: 'satisfaccion', texto: '¿Cómo calificás la atención que recibiste?', requerida: true },
  { id: 'resolucion', texto: '¿Se resolvió lo que necesitabas?' },
  { id: 'atencion', texto: '¿Te explicaron con claridad?' },
  { id: 'espera', texto: '¿Cómo fue el tiempo de espera?' },
];
const ESCALA = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Muy bueno'];

function montarEncuesta() {
  $('enc-sector').innerHTML = SECTORES.map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
  $('enc-preguntas').innerHTML = PREGUNTAS.map((p) => `
    <fieldset style="margin-bottom:1.1rem">
      <label>${p.texto}${p.requerida ? ' *' : ''}</label>
      <div class="escala">
        ${[1, 2, 3, 4, 5].map((v) => `
          <input type="radio" name="${p.id}" id="${p.id}-${v}" value="${v}">
          <label for="${p.id}-${v}">${v}<small>${ESCALA[v - 1]}</small></label>`).join('')}
      </div>
    </fieldset>`).join('');

  $('enc-nps').oninput = (e) => { $('enc-valor').textContent = e.target.value; };

  $('enc-form').onsubmit = (e) => {
    e.preventDefault();
    const valor = (nombre) => {
      const m = document.querySelector(`input[name="${nombre}"]:checked`);
      return m ? Number(m.value) : null;
    };
    if (!valor('satisfaccion')) {
      $('enc-aviso').className = 'aviso error';
      $('enc-aviso').textContent = 'Elegí una calificación para la primera pregunta';
      return;
    }
    ENCUESTAS.push({
      fecha: HOY, respondida: `${HOY}T12:00:00`,
      sector_id: Number($('enc-sector').value), canal_id: 2, operador_id: USUARIO.id,
      satisfaccion: valor('satisfaccion'),
      resolucion: valor('resolucion') || valor('satisfaccion'),
      atencion: valor('atencion') || valor('satisfaccion'),
      espera: valor('espera') || valor('satisfaccion'),
      recomendaria: Number($('enc-nps').value),
      comentario: $('enc-comentario').value.trim(),
    });
    $('enc-form').classList.add('oculto');
    $('enc-gracias').classList.remove('oculto');
  };

  $('enc-otra').onclick = () => {
    $('enc-form').reset();
    $('enc-valor').textContent = '8';
    $('enc-aviso').textContent = '';
    $('enc-aviso').className = 'aviso';
    $('enc-form').classList.remove('oculto');
    $('enc-gracias').classList.add('oculto');
  };
}

// -------------------------------------------------------------- arranque ---

const PINTAR = {
  rapido: pintarRapido,
  consultas: pintarConsultas,
  panel: pintarPanel,
  satisfaccion: pintarSatisfaccion,
  encuesta: () => {},
};

function ir(pantalla) {
  cerrarConfirmacion();   // el aviso pertenece a la pantalla de carga
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.remove('activa'));
  $(`p-${pantalla}`).classList.add('activa');
  document.querySelectorAll('#nav a').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.ir === pantalla);
    if (a.dataset.ir === pantalla) a.setAttribute('aria-current', 'page');
  });
  PINTAR[pantalla]();
  scrollTo({ top: 0 });
}

document.querySelectorAll('#nav a').forEach((a) => {
  a.onclick = () => ir(a.dataset.ir);
});

$('c-buscar').oninput = () => pintarConsultas();

$('btn-reiniciar').onclick = () => {
  generarDatos();
  ir('rapido');
  aviso('Datos de ejemplo regenerados');
};

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (!$('p-rapido').classList.contains('activa')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  if (e.key === 'Escape' && ultima) return deshacer();
  const n = Number(e.key);
  if (!n || n < 1 || n > 9) return;
  const ficha = $('frecuentes').querySelectorAll('.ficha')[n - 1];
  if (ficha) { e.preventDefault(); ficha.click(); }
});

// Los gráficos se redibujan cuando el lector cambia el tema de la página.
new MutationObserver(() => window.dispatchEvent(new Event('tema-cambiado')))
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => window.dispatchEvent(new Event('tema-cambiado')));

generarDatos();
montarEncuesta();
ir('rapido');
