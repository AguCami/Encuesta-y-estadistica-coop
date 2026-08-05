/* Utilidades compartidas: llamadas al servidor, sesion, formato y filtros. */

/**
 * Barrita de progreso arriba de todo. Con la base en la nube cada pedido
 * tarda un momento, y sin esto la pantalla queda en blanco y parece colgada.
 * Se cuenta cuántos pedidos hay en curso para que no desaparezca a mitad.
 */
let enCurso = 0;
function progreso(delta) {
  enCurso = Math.max(0, enCurso + delta);
  let barra = document.getElementById('cargando');
  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'cargando';
    document.documentElement.appendChild(barra);
  }
  barra.classList.toggle('activa', enCurso > 0);
}

export async function api(ruta, opciones = {}) {
  progreso(1);
  try {
    const res = await fetch(ruta, {
      headers: { 'content-type': 'application/json' },
      ...opciones,
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    });
    let datos = null;
    try { datos = await res.json(); } catch { /* respuesta sin cuerpo */ }
    if (!res.ok) throw new Error((datos && datos.error) || `Error ${res.status}`);
    return datos;
  } finally {
    progreso(-1);
  }
}

export const get = (ruta) => api(ruta);
export const post = (ruta, body) => api(ruta, { method: 'POST', body });
export const put = (ruta, body) => api(ruta, { method: 'PUT', body });
export const del = (ruta) => api(ruta, { method: 'DELETE' });

/**
 * Guardado corto de las respuestas que se repiten en todas las pantallas.
 *
 * Cambiar de pestaña es una carga entera de página, y antes de dibujar nada
 * había que preguntar de nuevo quién sos, cómo se llama la cooperativa y toda
 * la lista de sectores y motivos. Con la base en la nube eso son tres viajes
 * de ida y vuelta cada vez, y se siente.
 *
 * Ahora se guardan en la memoria de la pestaña: la pantalla se dibuja al
 * instante con lo guardado y, por atrás, se vuelve a pedir para que quede
 * fresco para la próxima. Nada de esto es un permiso: el servidor sigue
 * controlando la sesión en cada pedido de verdad.
 */
const VIGENCIA = {
  '/api/config': 30 * 60 * 1000,
  '/api/catalogos': 10 * 60 * 1000,
  '/api/yo': 5 * 60 * 1000,
};

const guardar = (clave, datos) => {
  try { sessionStorage.setItem(clave, JSON.stringify({ ts: Date.now(), datos })); } catch { /* sin espacio */ }
};

export async function getGuardado(ruta) {
  const vigencia = VIGENCIA[ruta];
  if (!vigencia) return get(ruta);
  const clave = `cache:${ruta}`;
  let previo = null;
  try { previo = JSON.parse(sessionStorage.getItem(clave) || 'null'); } catch { /* ilegible */ }

  if (previo && Date.now() - previo.ts < vigencia) {
    get(ruta).then((d) => guardar(clave, d)).catch(() => { /* se reintenta la próxima */ });
    return previo.datos;
  }
  const datos = await get(ruta);
  guardar(clave, datos);
  return datos;
}

/** Se llama al cambiar algo que está guardado, para que se vuelva a pedir. */
export function olvidar(ruta) {
  try { sessionStorage.removeItem(`cache:${ruta}`); } catch { /* nada que hacer */ }
}

/** Exige sesion iniciada; si no hay, manda al login. Devuelve el usuario. */
export async function exigirSesion() {
  const usuario = await getGuardado('/api/yo');
  if (!usuario) {
    location.href = `/index.html?volver=${encodeURIComponent(location.pathname + location.search)}`;
    throw new Error('sin sesion');
  }
  return usuario;
}

const PAGINAS = [
  { href: '/rapido.html', texto: 'Atención rápida' },
  { href: '/consultas.html', texto: 'Consultas' },
  { href: '/panel.html', texto: 'Estadisticas' },
  { href: '/admin.html', texto: 'Administracion', rol: 'supervisor' },
];

const NIVEL = { operador: 1, supervisor: 2, admin: 3 };
export const puede = (usuario, rol) => NIVEL[usuario.rol] >= NIVEL[rol];

/** Dibuja la barra superior con la navegacion y el usuario conectado. */
export async function montarBarra(usuario) {
  const config = await getGuardado('/api/config');
  const actual = location.pathname;
  const enlaces = PAGINAS
    .filter((p) => !p.rol || puede(usuario, p.rol))
    .map((p) => `<a href="${p.href}"${actual === p.href ? ' aria-current="page"' : ''}>${p.texto}</a>`)
    .join('');

  // Si hay logo cargado en /img/logo.png se usa ese; si no, el nombre solo.
  // Arriba va el nombre corto: el completo no entra y empuja la navegación.
  const nombre = escapar(config.org_corto || config.org);
  const barra = document.createElement('header');
  barra.className = 'barra';
  barra.innerHTML = `
    <div class="marca" title="${escapar(config.org)}">
      <img src="/img/logo.png" alt="" class="logo" onerror="this.remove()">
      <span class="nombre">${nombre}</span><small>consultas y encuestas</small>
    </div>
    <nav class="nav">${enlaces}</nav>
    <div class="derecha">
      <span class="usuario"><b>${usuario.nombre}</b> · ${etiquetaRol(usuario.rol)}</span>
      <button id="btn-tema" class="chico" title="Cambiar tema claro / oscuro">Tema</button>
      <button id="btn-salir" class="chico">Salir</button>
    </div>`;
  document.body.prepend(barra);

  barra.querySelector('#btn-salir').onclick = async () => {
    await post('/api/logout', {});
    try { sessionStorage.clear(); } catch { /* nada que hacer */ }
    location.href = '/index.html';
  };
  barra.querySelector('#btn-tema').onclick = () => {
    const oscuro = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = oscuro ? 'light' : 'dark';
    localStorage.setItem('tema', oscuro ? 'light' : 'dark');
    window.dispatchEvent(new Event('tema-cambiado'));
  };
  return config;
}

export function aplicarTemaGuardado() {
  const t = localStorage.getItem('tema');
  if (t) document.documentElement.dataset.theme = t;
}
aplicarTemaGuardado();

const ROLES = { operador: 'Operador', supervisor: 'Supervisor', admin: 'Administrador' };
const PUESTOS = { call_center: 'Call center', mesa_informes: 'Mesa de informes', otro: 'Otro' };
export const etiquetaRol = (r) => ROLES[r] || r;
export const etiquetaPuesto = (p) => PUESTOS[p] || p;

const ESTADOS = { resuelta: 'Solucionada', pendiente: 'No solucionada', derivada: 'Derivada', reclamo: 'Reclamo generado' };
export const etiquetaEstado = (e) => ESTADOS[e] || e;

// ------------------------------------------------------------- formato ---

export const nf = new Intl.NumberFormat('es-AR');
export const num = (n) => (n === null || n === undefined ? '—' : nf.format(n));
export const dec = (n, d = 1) => (n === null || n === undefined ? '—' : Number(n).toFixed(d).replace('.', ','));
export const pct = (n) => (n === null || n === undefined ? '—' : `${dec(n, 1)}%`);

export function fechaCorta(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}` + (iso.length > 10 ? ` ${iso.slice(11, 16)}` : `/${a.slice(2)}`);
}
export function fechaLarga(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}` + (iso.length > 10 ? ` ${iso.slice(11, 16)}` : '');
}
export const minutos = (seg) => (seg ? `${Math.round(seg / 60)} min` : '—');

export function hoyISO() {
  const f = new Date();
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function sumarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const escapar = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------- filtros ---

/**
 * Barra de filtros compartida por el listado y por las estadisticas: escribe
 * el estado en la URL para que un filtro se pueda guardar o mandar por mail.
 */
export function leerFiltros() {
  const p = new URLSearchParams(location.search);
  const f = {};
  for (const k of ['desde', 'hasta', 'sector_id', 'motivo_id', 'canal_id', 'operador_id',
    'localidad_id', 'estado', 'puesto', 'prioridad', 'q']) {
    const v = p.get(k);
    if (v) f[k] = v;
  }
  if (!f.hasta) f.hasta = hoyISO();
  if (!f.desde) f.desde = sumarDias(f.hasta, -29);
  return f;
}

export function escribirFiltros(f, recargar = true) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const url = `${location.pathname}?${p}`;
  if (recargar) location.href = url;
  else history.replaceState(null, '', url);
}

export const qs = (f) => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

/** Lunes de la semana de esa fecha. */
export function inicioSemana(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return sumarDias(iso, -((d.getUTCDay() + 6) % 7));
}

/**
 * Los períodos con los que se mira la operación. `historico` arranca en la
 * primera consulta cargada, así que lo resuelve quien monta los filtros.
 */
export const PERIODOS = [
  { id: 'dia', texto: 'Hoy', desde: (h) => h },
  { id: 'semana', texto: 'Esta semana', desde: (h) => inicioSemana(h) },
  { id: 'mes', texto: 'Este mes', desde: (h) => `${h.slice(0, 7)}-01` },
  { id: 'historico', texto: 'Histórico', desde: (h, primera) => primera || sumarDias(h, -730) },
];

const CAMPOS_FILTRO = {
  sector: { id: 'f-sector', clave: 'sector_id', titulo: 'Sector', lista: 'sectores' },
  canal: { id: 'f-canal', clave: 'canal_id', titulo: 'Canal', lista: 'canales' },
  puesto: { id: 'f-puesto', clave: 'puesto', titulo: 'Puesto', lista: 'puestos' },
  estado: { id: 'f-estado', clave: 'estado', titulo: 'Estado', lista: 'estados' },
  operador: { id: 'f-operador', clave: 'operador_id', titulo: 'Operador', lista: 'operadores' },
};

/**
 * Inserta la barra de filtros. `campos` limita los selectores visibles: cada
 * pantalla muestra solo los que realmente aplica en sus consultas.
 */
export function montarFiltros(contenedor, catalogos, filtros, alCambiar, opciones = {}) {
  const usados = (opciones.campos || Object.keys(CAMPOS_FILTRO)).map((c) => CAMPOS_FILTRO[c]).filter(Boolean);
  const opts = (lista, valor, etiqueta = 'nombre') =>
    lista.map((o) => `<option value="${o.id}"${String(o.id) === String(valor) ? ' selected' : ''}>${escapar(o[etiqueta])}</option>`).join('');

  contenedor.className = 'tarjeta filtros';
  contenedor.innerHTML = `
    <div class="fila">
      <div class="campo corto"><label for="f-desde">Desde</label>
        <input type="date" id="f-desde" value="${filtros.desde}"></div>
      <div class="campo corto"><label for="f-hasta">Hasta</label>
        <input type="date" id="f-hasta" value="${filtros.hasta}"></div>
      ${usados.map((c) => `
        <div class="campo"><label for="${c.id}">${c.titulo}</label>
          <select id="${c.id}"><option value="">Todos</option>${opts(catalogos[c.lista], filtros[c.clave])}</select></div>`).join('')}
      <button id="f-aplicar" class="primario">Aplicar</button>
      <button id="f-limpiar">Limpiar</button>
    </div>
    <div class="fila" style="margin-top:.5rem">
      ${PERIODOS.map((p) => `<button class="chico" data-periodo="${p.id}">${p.texto}</button>`).join('')}
      <span class="solo-lectura" style="align-self:center">o elegí las fechas arriba</span>
    </div>`;

  const leer = () => {
    const f = {
      desde: contenedor.querySelector('#f-desde').value,
      hasta: contenedor.querySelector('#f-hasta').value,
      q: filtros.q || '',
    };
    for (const c of usados) f[c.clave] = contenedor.querySelector(`#${c.id}`).value;
    return f;
  };

  contenedor.querySelector('#f-aplicar').onclick = () => alCambiar(leer());
  contenedor.querySelector('#f-limpiar').onclick = () =>
    alCambiar({ desde: `${hoyISO().slice(0, 7)}-01`, hasta: hoyISO() });
  contenedor.querySelectorAll('[data-periodo]').forEach((b) => {
    b.onclick = () => {
      const hasta = hoyISO();
      const periodo = PERIODOS.find((p) => p.id === b.dataset.periodo);
      alCambiar({ ...leer(), desde: periodo.desde(hasta, catalogos.primera_consulta), hasta });
    };
  });
  return { leer };
}

/** Muestra un aviso temporal (ok / error). */
export function avisar(el, mensaje, tipo = 'ok') {
  el.className = `aviso ${tipo}`;
  el.textContent = mensaje;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; el.className = 'aviso'; }, 6000);
}
