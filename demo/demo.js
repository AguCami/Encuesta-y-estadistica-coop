/* ============================================================
   Demostración: la misma interfaz y los mismos gráficos que la
   aplicación real, pero con los datos generados en el navegador.
   No hay servidor ni base de datos: todo vive en memoria.
   ============================================================ */

const $ = (id) => document.getElementById(id);

// --------------------------------------------------------------- datos ---

const SECTORES = [
  // call center
  { id: 1, nombre: 'Cortes por falta de pago', detalle: 'Plazos, información y reconexiones', puesto: 'call_center', peso: 5 },
  { id: 2, nombre: 'Ventas', detalle: 'Altas de servicios y gestiones comerciales', puesto: 'call_center', peso: 7 },
  { id: 3, nombre: 'Reclamos', detalle: 'Fallas y reclamos de servicio', puesto: 'call_center', peso: 9 },
  { id: 4, nombre: 'TIC', detalle: 'Internet, IPTV y servicios de conectividad', puesto: 'call_center', peso: 6 },
  { id: 5, nombre: 'Pagos', detalle: 'Acreditación e información de pagos', puesto: 'call_center', peso: 4 },
  // mesa de informes: todo en un solo grupo, como se atiende en el mostrador
  { id: 6, nombre: 'Mesa de informes', detalle: 'Atención presencial en el mostrador', puesto: 'mesa_informes', peso: 12 },
];

const MOTIVOS_POR_SECTOR = {
  1: ['Plazo', 'Información', 'Reconexiones'],
  2: ['Servicios sociales', 'TIC', 'Movilcoop', 'Luz', 'Agua', 'Cambios de titularidad',
    'Traslados de servicios', 'Solicitar lectura', 'Baja de servicio'],
  3: ['Mucho consumo (luz)', 'Mucho consumo (agua)', 'Pérdida de agua', 'Poda',
    'Sin luz', 'Sin agua', 'Error de facturación', 'Estado del reclamo'],
  4: ['Reclamos', 'Consultas', 'Lentitud', 'Micro cortes', 'Problemas IPTV', 'Sensa'],
  5: ['Roela no impactado', 'Información'],
  6: ['Reclamos', 'Trámites y ventas', 'Entrega de notas', 'Proveedores',
    'Recursos humanos', 'Reclamos internet / IPTV', 'Oficina técnica', 'Red Bienestar Cooperativo',
    'Estados de cuenta', 'Información general', 'Boletas', 'Actualización de datos',
    'Reconexiones', 'Apros', 'Prórroga'],
};

const MOTIVOS = [];
let idMotivo = 0;
for (const [sectorId, nombres] of Object.entries(MOTIVOS_POR_SECTOR)) {
  for (const nombre of nombres) MOTIVOS.push({ id: ++idMotivo, sector_id: Number(sectorId), nombre });
}

const CANALES = [
  { id: 1, nombre: 'Telefónico', peso: 12 },
  { id: 2, nombre: 'Presencial', peso: 4 },
  { id: 3, nombre: 'WhatsApp', peso: 5 },
  { id: 4, nombre: 'Email', peso: 2 },
  { id: 5, nombre: 'Web / Redes', peso: 1 },
];

const OPERADORES = [
  { id: 1, nombre: 'Lenarduzzi, Andres Alejandro', puesto: 'call_center' },
  { id: 2, nombre: 'Rodriguez, Cristian Adrian', puesto: 'call_center' },
  { id: 3, nombre: 'Moyano, Emilio Noel', puesto: 'call_center' },
  { id: 4, nombre: 'Roggero, Pablo Gustavo', puesto: 'mesa_informes' },
];

const LOCALIDADES = [
  { id: 1, nombre: 'Centro' }, { id: 2, nombre: 'Barrio Norte' }, { id: 3, nombre: 'Villa Elisa' },
  { id: 4, nombre: 'Colonia San José' }, { id: 5, nombre: 'Zona rural' },
];

// Con quién se navega la demostración: lo decide el usuario que se escribe en
// el ingreso, para poder ver qué ve cada uno.
const CUENTAS = {
  acami: { id: 0, nombre: 'Cami, Agustín', rol: 'admin', puesto: 'otro' },
  alenarduzzi: { ...OPERADORES[0], rol: 'operador' },
  crodriguez: { ...OPERADORES[1], rol: 'operador' },
  emoyano: { ...OPERADORES[2], rol: 'operador' },
  proggero: { ...OPERADORES[3], rol: 'operador' },
};
let USUARIO = CUENTAS.acami;
const DIAS_DEMO = 90;

let CONSULTAS = [];
let PRIMERA_CONSULTA = '';

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
const inicioSemana = (fechaISO) => sumarDias(fechaISO, -((diaSemana(fechaISO) + 6) % 7));
const inicioMes = (fechaISO) => `${fechaISO.slice(0, 7)}-01`;
function sumarMeses(fechaISO, n) {
  const [a, m] = fechaISO.split('-').map(Number);
  const total = (a * 12) + (m - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}
const diasEntre = (a, b) => Math.max(1, Math.round(
  (new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000) + 1);

/** Por día en períodos cortos, por semana hasta un año, por mes en el histórico. */
const granularidad = (dias) => (dias <= 62 ? 'dia' : dias <= 400 ? 'semana' : 'mes');
const inicioPeriodo = (f, g) => (g === 'mes' ? inicioMes(f) : g === 'semana' ? inicioSemana(f) : f);
const siguientePeriodo = (f, g) => (g === 'mes' ? sumarMeses(f, 1) : sumarDias(f, g === 'semana' ? 7 : 1));

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

const ESTADOS = { resuelta: 'Solucionada', pendiente: 'No solucionada', derivada: 'Derivada', reclamo: 'Reclamo generado' };
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
      const enMesa = sector.puesto === 'mesa_informes';
      const canal = enMesa ? CANALES[1] : pesado(CANALES, CANALES.map((c) => c.peso));
      // Cada puesto lo atiende su propia gente
      const operador = uno(OPERADORES.filter((o) => o.puesto === (enMesa ? 'mesa_informes' : 'call_center')));
      const hora = pesado(horas, horas.map((h) => pesoHora[h]));
      const ts = `${fecha}T${String(hora).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00`;
      // El operador solo marca "solucionada" cuando pudo resolverla en el momento.
      const estado = pesado(['resuelta', 'pendiente'], [74, 26]);

      CONSULTAS.push({
        id: ++id,
        ts, fecha, hora, dow,
        operador_id: operador.id,
        puesto: enMesa ? 'mesa_informes' : 'call_center',
        canal_id: canal.id,
        sector_id: sector.id,
        motivo_id: motivo.id,
        localidad_id: uno(LOCALIDADES).id,
        socio_nro: String(entre(1000, 9999)),
        estado,
        primer_contacto: estado === 'resuelta' ? 1 : 0,
        duracion_seg: entre(90, 900),
        observaciones: `Consulta por ${motivo.nombre.toLowerCase()}.`,
      });

    }
  }
  CONSULTAS.sort((a, b) => (a.ts < b.ts ? -1 : 1));
  PRIMERA_CONSULTA = CONSULTAS.length ? CONSULTAS[0].fecha : HOY;
}

// ------------------------------------------------------------- filtros ---

// Cada puesto se mira por separado; '' muestra los dos juntos.
const filtro = { desde: '', hasta: '', sector_id: '', puesto: 'call_center' };
const PERIODOS = [
  { id: 'dia', texto: 'Hoy', desde: (h) => h },
  { id: 'semana', texto: 'Esta semana', desde: (h) => inicioSemana(h) },
  { id: 'mes', texto: 'Este mes', desde: (h) => inicioMes(h) },
  { id: 'historico', texto: 'Histórico', desde: () => PRIMERA_CONSULTA },
];
const PUESTOS_PANEL = [
  ['call_center', 'Call center'], ['mesa_informes', 'Mesa de informes'], ['', 'Los dos juntos'],
];
const desdeFiltro = () => filtro.desde || inicioMes(HOY);

function consultasFiltradas() {
  const desde = desdeFiltro();
  return CONSULTAS.filter((c) => c.fecha >= desde && c.fecha <= HOY
    && (!filtro.puesto || c.puesto === filtro.puesto)
    && (!filtro.sector_id || c.sector_id === Number(filtro.sector_id)));
}


/** Barra de filtros de la demo: rango de fechas y sector. */
function montarFiltros(contenedor, alCambiar) {
  const sectores = SECTORES.filter((x) => !filtro.puesto || x.puesto === 'ambos' || x.puesto === filtro.puesto);
  contenedor.innerHTML = `
    <div class="fila" style="align-items:flex-end">
      <div class="campo" style="flex:0 0 auto">
        <label>Estadísticas de</label>
        <div class="segmentado">
          ${PUESTOS_PANEL.map(([id, t]) => `<button type="button" data-puesto="${id}"${filtro.puesto === id ? ' aria-pressed="true"' : ''}>${t}</button>`).join('')}
        </div>
      </div>
      <div class="campo" style="flex:0 0 auto">
        <label>Período</label>
        <div class="segmentado">
          ${PERIODOS.map((p) => `<button type="button" data-periodo="${p.id}"${desdeFiltro() === p.desde(HOY) ? ' aria-pressed="true"' : ''}>${p.texto}</button>`).join('')}
        </div>
      </div>
      <div class="campo"><label>Sector</label>
        <select data-sector>
          <option value="">Todos</option>
          ${sectores.map((s) => `<option value="${s.id}"${String(s.id) === String(filtro.sector_id) ? ' selected' : ''}>${escapar(s.nombre)}</option>`).join('')}
        </select></div>
      <span style="flex:1"></span>
      <span class="solo-lectura">${fechaLarga(desdeFiltro())} — ${fechaLarga(HOY)}</span>
    </div>`;
  contenedor.querySelectorAll('[data-puesto]').forEach((b) => {
    b.onclick = () => { filtro.puesto = b.dataset.puesto; filtro.sector_id = ''; alCambiar(); };
  });
  contenedor.querySelectorAll('[data-periodo]').forEach((b) => {
    b.onclick = () => {
      filtro.desde = PERIODOS.find((p) => p.id === b.dataset.periodo).desde(HOY);
      alCambiar();
    };
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
  const dias = diasEntre(desde, HOY);
  const diasConAtencion = new Set(filas.map((c) => c.fecha)).size;
  const gran = granularidad(dias);

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

  // Todos los motivos con consultas, con el mismo corte por resultado que los
  // sectores. Sin tope: el detalle completo es lo que se mira.
  const porMotivoFilas = new Map();
  for (const c of filas) {
    if (!porMotivoFilas.has(c.motivo_id)) porMotivoFilas.set(c.motivo_id, []);
    porMotivoFilas.get(c.motivo_id).push(c);
  }
  const porMotivo = [...porMotivoFilas].map(([id, cs]) => {
    const m = motivoDe(id);
    return {
      id,
      nombre: m.nombre,
      sector: sectorDe(m.sector_id).nombre,
      total: cs.length,
      pendientes: cs.filter((c) => c.estado === 'pendiente').length,
      derivadas: cs.filter((c) => c.estado === 'derivada').length,
      reclamos: cs.filter((c) => c.estado === 'reclamo').length,
    };
  }).sort((a, b) => b.total - a.total);

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

  const porFecha = agrupar(filas, (c) => inicioPeriodo(c.fecha, gran));
  const serie = [];
  const fin = inicioPeriodo(HOY, gran);
  for (let f = inicioPeriodo(desde, gran); f <= fin; f = siguientePeriodo(f, gran)) {
    serie.push({ fecha: f, total: porFecha.get(f) || 0 });
  }

  const heatmap = [...agrupar(filas, (c) => `${c.dow}|${c.hora}`)]
    .map(([k, total]) => ({ dow: Number(k.split('|')[0]), hora: Number(k.split('|')[1]), total }));

  const topSectores = porSector.slice(0, 6).map((s) => s.id);
  const serieSector = [];
  for (const sid of topSectores) {
    const delSector = agrupar(filas.filter((c) => c.sector_id === sid), (c) => inicioPeriodo(c.fecha, gran));
    for (const [fecha, tot] of delSector) serieSector.push({ sector_id: sid, fecha, total: tot });
  }

  return {
    periodo: { desde, hasta: HOY, dias, dias_con_atencion: diasConAtencion, granularidad: gran },
    resumen: {
      total,
      // Los dias sin ninguna consulta son feriados o fin de semana: no entran
      // en el promedio, que si no queda mas bajo que un dia de trabajo real.
      promedio_dia: diasConAtencion ? redondear(total / diasConAtencion, 1) : null,
      resueltas: cuenta((c) => c.estado === 'resuelta'),
      derivadas: cuenta((c) => c.estado === 'derivada'),
      pendientes: cuenta((c) => c.estado === 'pendiente'),
      pct_primer_contacto: total ? redondear((cuenta((c) => c.primer_contacto) / total) * 100, 1) : null,
      pct_pendientes: total ? redondear((cuenta((c) => c.estado === 'pendiente') / total) * 100, 1) : null,
      duracion_prom_min: conDuracion.length
        ? redondear(conDuracion.reduce((a, c) => a + c.duracion_seg, 0) / conDuracion.length / 60, 1) : null,
      variacion_pct: anterior ? redondear(((total - anterior) / anterior) * 100, 1) : null,
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
  const delPuesto = new Set(sectoresDelPuesto().map((s) => s.id));
  const suyas = CONSULTAS.filter((c) => c.motivo_id && delPuesto.has(c.sector_id));
  return [...agrupar(suyas, (c) => c.motivo_id)]
    .sort((a, b) => b[1] - a[1]).slice(0, 9).map(([id]) => motivoDe(id));
}

const hoyPorMotivo = (motivoId) =>
  CONSULTAS.filter((c) => c.fecha === HOY && c.operador_id === USUARIO.id && c.motivo_id === motivoId).length;

function fichaHTML(motivo) {
  const hoy = hoyPorMotivo(motivo.id);
  return `
    <button type="button" class="ficha" data-motivo="${motivo.id}">
      <span class="titulo">${escapar(motivo.nombre)}</span>
      <span class="veces${hoy ? '' : ' oculto'}" data-veces="${motivo.id}">${hoy} hoy</span>
    </button>`;
}

/**
 * El operador elige una sola vez dónde atiende. El canal se deduce del puesto;
 * si la consulta entró por WhatsApp o mail se corrige desde "Agregar datos".
 */
const canalDelPuesto = () => (PUESTOS_ATENCION.find((p) => p.id === puestoActual) || PUESTOS_ATENCION[0]).canal;

/** Los grupos del puesto elegido. */
const sectoresDelPuesto = () =>
  SECTORES.filter((s) => s.puesto === 'ambos' || s.puesto === puestoActual);

function pintarRapido() {
  // Cada uno atiende en su puesto: solo quien no tiene uno fijo puede elegir.
  const opciones = USUARIO.puesto === 'otro'
    ? PUESTOS_ATENCION
    : PUESTOS_ATENCION.filter((p) => p.id === USUARIO.puesto);
  $('fila-puesto').innerHTML = opciones.length === 1
    ? `<span class="solo-lectura">Estás atendiendo en <b>${escapar(opciones[0].nombre)}</b></span>`
    : '<label style="margin:0 .6rem 0 0;align-self:center">Estás atendiendo en</label>'
      + '<div class="segmentado" id="puestos"></div>';

  if (opciones.length > 1) {
    $('puestos').innerHTML = opciones.map((p) => `
      <button type="button" data-puesto="${p.id}"${p.id === puestoActual ? ' aria-pressed="true"' : ''}>
        ${escapar(p.nombre)}</button>`).join('');
    $('puestos').querySelectorAll('[data-puesto]').forEach((b) => {
      b.onclick = () => { puestoActual = b.dataset.puesto; pintarRapido(); };
    });
  }

  $('frecuentes').innerHTML = frecuentesDelOperador().map((m) => fichaHTML(m)).join('');

  $('sectores').innerHTML = sectoresDelPuesto().map((s) => `
    <section class="tarjeta" style="margin-top:1rem">
      <header><h2>${escapar(s.nombre)}</h2><p>${escapar(s.detalle)}</p></header>
      <div class="botonera">
        ${MOTIVOS.filter((m) => m.sector_id === s.id).map((m) => fichaHTML(m)).join('')}
      </div>
    </section>`).join('');

  document.querySelectorAll('#p-rapido [data-motivo]').forEach((b) => {
    b.onclick = () => registrar(Number(b.dataset.motivo), b);
  });
  pintarContador();
}

function pintarContador() {
  const deHoy = CONSULTAS.filter((c) => c.fecha === HOY);
  $('contador').innerHTML = `<b>${num(deHoy.filter((c) => c.operador_id === USUARIO.id).length)}</b>
    cargadas hoy por vos · <b>${num(deHoy.length)}</b> en total`;
}

function registrar(motivoId, ficha) {
  const motivo = motivoDe(motivoId);
  if (!motivo) return;

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
    sector_id: motivo.sector_id, motivo_id: motivo.id, localidad_id: null,
    socio_nro: '', estado: 'pendiente', primer_contacto: 0, duracion_seg: 0, observaciones: '',
  };
  CONSULTAS.push(consulta);
  ultima = consulta;

  const n = hoyPorMotivo(motivoId);
  document.querySelectorAll(`[data-veces="${motivoId}"]`).forEach((s) => {
    s.textContent = `${n} hoy`;
    s.classList.remove('oculto');
  });
  pintarContador();
  mostrarConfirmacion(motivo.nombre);
}

function mostrarConfirmacion(titulo) {
  const caja = $('brindis');
  caja.className = 'brindis visible';
  caja.innerHTML = `
    <div class="linea">
      <b>Registrada</b> · ${escapar(titulo)}
      <span class="cuenta" id="cuenta">${SEGUNDOS_DESHACER}</span>
    </div>
    <div class="acciones">
      <button type="button" id="solucionada">Solucionada</button>
      <button type="button" id="deshacer">Deshacer <small>(Esc)</small></button>
    </div>`;

  // La consulta entra sin resolver: marcarla solucionada cierra el aviso.
  caja.querySelector('#solucionada').onclick = () => {
    if (!ultima) return;
    ultima.estado = 'resuelta';
    ultima.primer_contacto = 1;
    cerrarConfirmacion();
  };
  caja.querySelector('#deshacer').onclick = deshacer;

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
  cerrarConfirmacion();
  CONSULTAS = CONSULTAS.filter((c) => c.id !== quitada.id);
  if (quitada.motivo_id) {
    const n = hoyPorMotivo(quitada.motivo_id);
    document.querySelectorAll(`[data-veces="${quitada.motivo_id}"]`).forEach((s) => {
      s.textContent = `${n} hoy`;
      s.classList.toggle('oculto', !n);
    });
  }
  pintarContador();
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
  $('caja-puesto').classList.toggle('oculto', !!filtro.puesto);
  const d = estadisticas();
  const r = d.resumen;

  const variacion = r.variacion_pct === null ? ''
    : `<span class="${r.variacion_pct >= 0 ? 'sube' : 'baja'}">${r.variacion_pct >= 0 ? '▲' : '▼'} ${dec(Math.abs(r.variacion_pct))}%</span> vs. período anterior`;

  // Los dias sin ninguna consulta son feriados o fin de semana: no cuentan.
  const diasAtendidos = (x) => {
    const n = x.periodo.dias_con_atencion;
    if (!n) return 'sin atención en el período';
    const texto = `${num(n)} día${n === 1 ? '' : 's'} con atención`;
    return n === x.periodo.dias ? texto : `${texto} de ${num(x.periodo.dias)}`;
  };

  $('kpis').innerHTML = `
    <div class="kpi"><div class="etiqueta">Consultas</div>
      <div class="valor">${num(r.total)}</div>
      <div class="pie">${variacion || diasAtendidos(d)}</div></div>
    <div class="kpi"><div class="etiqueta">Promedio por día</div>
      <div class="valor">${dec(r.promedio_dia)}</div>
      <div class="pie">sobre ${diasAtendidos(d)}</div></div>
    <div class="kpi"><div class="etiqueta">Solucionadas</div>
      <div class="valor">${pct(r.pct_primer_contacto)}</div>
      <div class="pie">${num(r.resueltas)} resueltas en el momento</div></div>
    <div class="kpi"><div class="etiqueta">Sin solucionar</div>
      <div class="valor">${num(r.pendientes)}</div>
      <div class="pie">${pct(r.pct_pendientes)} del total</div></div>`;

  $('sub-evolucion').textContent = `${fechaLarga(d.periodo.desde)} — ${fechaLarga(d.periodo.hasta)}`;

  const gran = d.periodo.granularidad;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
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

  lineas($('g-evolucion'), [{ nombre: 'Consultas', puntos: d.serie.map((s) => ({ x: s.fecha, y: s.total })) }],
    { alto: 250, etiquetaX });

  barras($('g-sector'), d.por_sector.map((s) => ({
    etiqueta: s.nombre, valor: s.total,
    detalle: `${pct(s.pct)} del total · ${pct(s.pct_primer_contacto)} al 1er contacto`,
  })));

  const p = paleta();
  // El mismo corte por resultado para los sectores y para los motivos.
  const NOMBRE_PARTE = {
    pendiente: 'Otros', derivada: 'Derivada', reclamo: 'Reclamo generado', resuelta: 'Solucionadas',
  };
  const partesDe = (s) => [
    { estado: 'pendiente', valor: s.pendientes || 0 },
    { estado: 'derivada', valor: s.derivadas || 0 },
    { estado: 'reclamo', valor: s.reclamos || 0 },
    { estado: 'resuelta', valor: s.total - (s.derivadas || 0) - (s.pendientes || 0) - (s.reclamos || 0) },
  ].map((x) => ({ ...x, nombre: NOMBRE_PARTE[x.estado], color: p.estado[x.estado] }));

  const usadosSector = new Set();
  for (const s of d.por_sector) for (const x of partesDe(s)) if (x.valor) usadosSector.add(x.estado);
  apiladas($('g-estado-sector'), d.por_sector.map((s) => ({ etiqueta: s.nombre, partes: partesDe(s) })),
    { leyenda: partesDe(d.por_sector[0] || { total: 0 }).filter((x) => usadosSector.has(x.estado)) });

  const usadosMotivo = new Set();
  for (const m of d.por_motivo) for (const x of partesDe(m)) if (x.valor) usadosMotivo.add(x.estado);
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
  const subMotivos = $('sub-motivos');
  if (subMotivos) {
    subMotivos.textContent = `los ${d.por_motivo.length} motivos con consultas en el período `
      + '· lo verde se resolvió en el momento';
  }
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
}

// -------------------------------------------------------------- arranque ---

const PINTAR = {
  rapido: pintarRapido,
  consultas: pintarConsultas,
  panel: pintarPanel,
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

// Reiniciar borra todo lo cargado: se pide un código para que no pase de casualidad.
const CODIGO_REINICIO = '11235813';

$('btn-reiniciar').onclick = () => {
  const codigo = prompt('Para reiniciar las estadísticas ingresá el código:');
  if (codigo === null) return;
  if (codigo.trim() !== CODIGO_REINICIO) {
    aviso('Código incorrecto: las estadísticas no se tocaron');
    return;
  }
  generarDatos();
  ir('rapido');
  aviso('Estadísticas reiniciadas');
};

// Escape deshace el ultimo registro mientras el aviso sigue en pantalla.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ultima) deshacer();
});

// Al cambiar el tema se repinta la pantalla activa: los colores de las barras
// apiladas y sus leyendas se resuelven al armar los datos, no al dibujarlos.
window.addEventListener('tema-cambiado', () => {
  const activa = document.querySelector('.pantalla.activa');
  if (activa && PINTAR[activa.id.replace('p-', '')]) PINTAR[activa.id.replace('p-', '')]();
});

// Los gráficos se redibujan cuando el lector cambia el tema de la página.
new MutationObserver(() => window.dispatchEvent(new Event('tema-cambiado')))
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => window.dispatchEvent(new Event('tema-cambiado')));

generarDatos();
ir('rapido');

/* ============================================================
   Información útil
   Los precios, internos y lugares de pago son los reales.
   Las notas y los cortes viven en memoria: en la aplicación
   instalada se guardan en la base de la cooperativa.
   ============================================================ */

const SOLAPAS_INFO = [
  { id: 'servicios', texto: 'Servicios' },
  { id: 'internos', texto: 'Internos' },
  { id: 'pagos', texto: 'Pagos' },
  { id: 'cortes', texto: 'Cortes' },
  { id: 'notas', texto: 'Notas' },
];

let solapaInfo = 'servicios';
let sectorInternos = 'todos';
const NOTAS = [];
const CORTES = [];

const sinTildes = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function pintarSolapasInfo() {
  $('pestanas').innerHTML = SOLAPAS_INFO.map((s) => `<button type="button" data-solapa="${s.id}"
    aria-pressed="${s.id === solapaInfo}">${s.texto}</button>`).join('');
  $('pestanas').querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      solapaInfo = b.dataset.solapa;
      pintarSolapasInfo();
      for (const s of SOLAPAS_INFO) $(`i-${s.id}`).hidden = s.id !== solapaInfo;
    };
  });
  for (const s of SOLAPAS_INFO) $(`i-${s.id}`).hidden = s.id !== solapaInfo;
}

const textoServicio = (s) => [
  s.titulo, s.etiquetas,
  ...s.bloques.flatMap((b) => [b.titulo, ...b.precios.flat(), ...b.requisitos]),
  ...s.notas,
].join(' ');

function pintarServicios() {
  const q = sinTildes($('q-servicios').value.trim());
  const visibles = SERVICIOS.filter((s) => !q || sinTildes(textoServicio(s)).includes(q));
  $('servicios').innerHTML = visibles.map((s) => `
    <article class="tarjeta servicio">
      <header><h2>${s.icono ? `${s.icono} ` : ''}${escapar(s.titulo)}</h2></header>
      ${s.bloques.map((b) => `
        ${b.titulo ? `<h3 class="bloque">${escapar(b.titulo)}</h3>` : ''}
        ${b.precios.map(([e, v]) => `<div class="precio"><span>${escapar(e)}</span><b>${escapar(v)}</b></div>`).join('')}
        ${b.requisitos.length ? `<ul class="requisitos">${b.requisitos.map((r) => `<li>${escapar(r)}</li>`).join('')}</ul>` : ''}`).join('')}
      ${s.notas.map((n) => `<p class="nota-servicio">${escapar(n)}</p>`).join('')}
    </article>`).join('');
  $('sin-servicios').style.display = visibles.length ? 'none' : '';
}

function pintarSectoresInt() {
  const sectores = ['todos', ...[...new Set(INTERNOS.map((i) => i.sector))].sort()];
  $('sectores-int').innerHTML = sectores.map((s) => `<button type="button" class="chico"
    data-sector="${escapar(s)}" aria-pressed="${s === sectorInternos}">${s === 'todos' ? 'Todos' : escapar(s)}</button>`).join('');
  $('sectores-int').querySelectorAll('button').forEach((b) => {
    b.onclick = () => { sectorInternos = b.dataset.sector; pintarSectoresInt(); pintarInternos(); };
  });
}

function pintarInternos() {
  const q = sinTildes($('q-internos').value.trim());
  const filas = INTERNOS.filter((i) => {
    if (sectorInternos !== 'todos' && i.sector !== sectorInternos) return false;
    return !q || sinTildes(`${i.nombre} ${i.sector} ${i.num}`).includes(q);
  });
  $('internos').innerHTML = filas.length ? filas.map((i) => `
    <tr><td><b class="interno">${escapar(i.num)}</b></td><td>${escapar(i.sector)}</td>
      <td>${escapar(i.nombre)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="solo-lectura">No se encontraron internos.</td></tr>';
}

function pintarPagos() {
  $('pagos').innerHTML = PAGOS.map((z) => `
    <article class="tarjeta">
      <header><h2>${escapar(z.zona)}</h2></header>
      ${z.lugares.map((l) => `<div class="lugar"><b>${escapar(l.nombre)}</b>
        <span class="solo-lectura">${escapar(l.direccion)}</span></div>`).join('')}
    </article>`).join('');
}

function pintarNotas() {
  $('notas').innerHTML = NOTAS.length ? NOTAS.map((n, i) => `
    <article class="tarjeta nota">
      <header>
        <h3>${escapar([n.nombre, n.apellido].filter(Boolean).join(' ')) || 'Sin nombre'}</h3>
        ${n.socio_nro ? `<span class="chip">Socio ${escapar(n.socio_nro)}</span>` : ''}
        ${n.telefono ? `<span class="solo-lectura">${escapar(n.telefono)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="chico" data-borrar-nota="${i}">Borrar</button>
      </header>
      ${n.texto ? `<p class="texto-nota">${escapar(n.texto)}</p>` : ''}
      <p class="solo-lectura">${escapar(USUARIO.nombre)} · ${n.cuando}</p>
    </article>`).join('')
    : '<p class="solo-lectura">Todavía no hay notas cargadas.</p>';
  $('notas').querySelectorAll('[data-borrar-nota]').forEach((b) => {
    b.onclick = () => { NOTAS.splice(Number(b.dataset.borrarNota), 1); pintarNotas(); };
  });
}

function pintarCortes() {
  $('cortes').innerHTML = CORTES.length ? CORTES.map((c, i) => `
    <tr><td>${escapar(c.seccion)}</td><td>${c.aviso || '—'}</td><td>${c.plazo || '—'}</td>
      <td>${c.corte || '—'}</td><td>${escapar(c.observaciones)}</td>
      <td class="solo-lectura">${escapar(USUARIO.nombre)}</td>
      <td><button class="chico" data-borrar-corte="${i}">Borrar</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="solo-lectura">Todavía no hay cortes cargados.</td></tr>';
  $('cortes').querySelectorAll('[data-borrar-corte]').forEach((b) => {
    b.onclick = () => { CORTES.splice(Number(b.dataset.borrarCorte), 1); pintarCortes(); };
  });
}

function pintarInformacion() {
  pintarSolapasInfo();
  pintarServicios();
  pintarSectoresInt();
  pintarInternos();
  pintarPagos();
  pintarNotas();
  pintarCortes();
}

$('q-servicios').addEventListener('input', pintarServicios);
$('q-internos').addEventListener('input', pintarInternos);

$('n-guardar').onclick = () => {
  const n = {
    nombre: $('n-nombre').value.trim(), apellido: $('n-apellido').value.trim(),
    socio_nro: $('n-socio').value.trim(), telefono: $('n-telefono').value.trim(),
    texto: $('n-texto').value.trim(), cuando: new Date().toLocaleString('es-AR'),
  };
  if (!n.texto && !n.nombre && !n.apellido) return;
  NOTAS.unshift(n);
  for (const id of ['n-nombre', 'n-apellido', 'n-socio', 'n-telefono', 'n-texto']) $(id).value = '';
  pintarNotas();
};

$('c-guardar').onclick = () => {
  if (!$('c-seccion').value) return;
  CORTES.unshift({
    seccion: $('c-seccion').value, aviso: $('c-aviso').value, plazo: $('c-plazo').value,
    corte: $('c-corte').value, observaciones: $('c-obs').value.trim(),
  });
  for (const id of ['c-aviso', 'c-plazo', 'c-corte', 'c-obs']) $(id).value = '';
  $('c-seccion').value = '';
  pintarCortes();
};

PINTAR.informacion = pintarInformacion;

/* ============================================================
   Pantalla de ingreso
   En la demostración entra cualquiera: lo que se muestra es el
   efecto, igual que en la aplicación instalada.
   ============================================================ */

const quietito = matchMedia('(prefers-reduced-motion: reduce)').matches;

function desvanecer(tarjeta) {
  tarjeta.style.transition = 'opacity .5s ease';
  tarjeta.style.opacity = '0';
  return new Promise((listo) => setTimeout(listo, 520));
}
const formIngreso = $('form-ingreso');

const nombreDePila = (completo) => {
  const parte = completo.includes(',') ? completo.split(',')[1] : completo;
  return parte.trim().split(/\s+/)[0] || completo;
};

/** Deshace la tarjeta en partículas y se las lleva el viento. */
function hacerPolvo(tarjeta) {
  const lienzo = $('polvo');
  const ctx = lienzo.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  lienzo.width = innerWidth * dpr;
  lienzo.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  lienzo.classList.remove('oculto');

  const estilo = getComputedStyle(document.documentElement);
  const caja = tarjeta.getBoundingClientRect();
  const particulas = [];

  const sembrar = (r, tinta, densidad) => {
    const cuantas = Math.min(900, Math.round(r.width * r.height * densidad));
    for (let i = 0; i < cuantas; i++) {
      const x = r.left + Math.random() * r.width;
      const y = r.top + Math.random() * r.height;
      particulas.push({
        x, y, tinta, r: 0.6 + Math.random() * 1.5,
        demora: ((x - caja.left) / caja.width) * 18 + Math.random() * 8,
        vx: 1.4 + Math.random() * 3.4, vy: -0.5 - Math.random() * 1.1,
        giro: (Math.random() - 0.5) * 0.25, vida: 32 + Math.random() * 26, edad: 0,
      });
    }
  };

  sembrar(caja, estilo.getPropertyValue('--surface-1').trim(), 0.05);
  for (const el of tarjeta.querySelectorAll('h1, p, label, input, button, img')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const c = getComputedStyle(el);
    sembrar(r, el.tagName === 'BUTTON' ? c.backgroundColor : c.color, 0.5);
  }

  tarjeta.style.visibility = 'hidden';

  return new Promise((listo) => {
    let cuadro = 0;
    const dibujar = () => {
      cuadro++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let vivas = 0;
      for (const p of particulas) {
        if (cuadro < p.demora) { vivas++; continue; }
        p.edad++;
        if (p.edad > p.vida) continue;
        vivas++;
        p.x += p.vx + Math.sin((p.y + cuadro) * 0.05) * 0.4;
        p.y += p.vy + p.giro;
        p.vx *= 1.012;
        ctx.globalAlpha = Math.max(0, 1 - p.edad / p.vida);
        ctx.fillStyle = p.tinta;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (vivas) requestAnimationFrame(dibujar);
      else { lienzo.classList.add('oculto'); listo(); }
    };
    requestAnimationFrame(dibujar);
  });
}

formIngreso.addEventListener('input', () => formIngreso.classList.remove('mal'));

// Un clic en el fondo del ingreso suelta una pelota. Otro clic, otra pelota.
$('p-ingreso').addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#form-ingreso')) soltar(e.clientX, e.clientY);
});

/** Deja a la vista solo lo que le corresponde a quien entró. */
function aplicarPermisos() {
  const esAdmin = USUARIO.rol === 'admin';
  document.querySelectorAll('#nav a').forEach((a) => {
    const soloAdmin = ['consultas', 'panel'].includes(a.dataset.ir);
    a.classList.toggle('oculto', soloAdmin && !esAdmin);
  });
  if (!esAdmin) puestoActual = USUARIO.puesto;
}

formIngreso.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Con la clave de ejemplo entra; con cualquier otra muestra el error.
  if ($('i-clave').value !== 'coop2026') {
    formIngreso.classList.remove('mal');
    void formIngreso.offsetWidth;
    formIngreso.classList.add('mal');
    $('i-clave').select();
    return;
  }
  formIngreso.querySelector('button').disabled = true;
  USUARIO = CUENTAS[$('i-usuario').value.trim().toLowerCase()] || CUENTAS.acami;
  aplicarPermisos();

  $('nombre-bienvenida').textContent = nombreDePila(USUARIO.nombre);
  await (quietito ? desvanecer(formIngreso) : hacerPolvo(formIngreso));
  $('p-ingreso').classList.add('oculto');
  limpiar();
  const saludo = $('bienvenida');
  saludo.classList.remove('oculto');
  await new Promise((r) => setTimeout(r, 3400));
  saludo.classList.add('saliendo');
  await new Promise((r) => setTimeout(r, 420));
  saludo.classList.add('oculto');
  document.body.classList.remove('sin-ingresar');
  ir('rapido');
});


/* ============================================================
   Huevo de pascua: escribí "pacman".
   En la demostración los puntajes quedan en este navegador; en
   la aplicación instalada son de toda la cooperativa.
   ============================================================ */

const CLAVE_PUNTAJES = 'demo-pacman';
const leerPuntajes = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE_PUNTAJES) || '[]'); } catch { return []; }
};

let tecleado = '';
addEventListener('keydown', (e) => {
  if (e.key.length !== 1 || document.querySelector('.pacman')) return;
  tecleado = (tecleado + e.key.toLowerCase()).slice(-6);
  if (tecleado !== 'pacman') return;
  tecleado = '';
  arrancar({
    leer: async () => leerPuntajes().sort((a, b) => b.puntos - a.puntos).slice(0, 10),
    guardar: async (puntos, nivel) => {
      const tabla = leerPuntajes();
      tabla.push({ nombre: USUARIO.nombre, puntos, nivel });
      localStorage.setItem(CLAVE_PUNTAJES, JSON.stringify(tabla));
    },
  });
});
