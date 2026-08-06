/* Vista: Atención rápida */

export const TITULO = 'Atención rápida';

export const html = `
<main class="rapido">
  <div class="fila" style="align-items:center;gap:.8rem">
    <h1 style="margin:0">Atención rápida</h1>
    <p class="solo-lectura" style="margin:0">Un toque en el motivo y la consulta queda registrada</p>
    <span style="flex:1"></span>
    <span class="contador-hoy" id="contador">—</span>
  </div>

  <div class="tarjeta canal-barra" style="margin-top:.7rem">
    <label style="margin:0 .6rem 0 0;align-self:center">Estás atendiendo en</label>
    <div class="segmentado" id="puestos"></div>
  </div>

  <section class="tarjeta" style="margin-top:1rem" id="caja-frecuentes">
    <header><h2>Los que más usás</h2><p>se arma solo con los motivos que más registrás</p></header>
    <div class="botonera destacada" id="frecuentes"></div>
  </section>

  <div id="sectores"></div>

  <p class="vacio oculto" id="sin-datos">
    Todavía no hay sectores ni motivos cargados. Pedile a un supervisor que los cargue
    en Administración.
  </p>
</main>

<div class="brindis" id="brindis" role="status" aria-live="polite"></div>

<dialog id="detalle">
  <div class="cuerpo" id="detalle-cuerpo"></div>
</dialog>
`;

/* Atencion rapida: un toque en el motivo = una consulta registrada.
   Todo lo demas (socio, observaciones, derivacion) es opcional y se agrega
   despues sobre la consulta recien creada, sin frenar la atencion. */

import {
  get, post, put, del, escapar, num, etiquetaEstado,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
const SEGUNDOS_DESHACER = 12;

let datos, usuario, puestoActual;
let ultima = null;      // consulta recien registrada (para deshacer o completar)
let temporizador = null;


export async function iniciar(ctx) {
  ({ usuario } = ctx);
  await recargar();
  document.addEventListener('keydown', atajos);
}

async function recargar() {
  datos = await get('/api/tablero');
  puestoActual = elegirPuesto();
  pintarPuestos();
  pintarFrecuentes();
  pintarSectores();
  pintarContador();
}

const PUESTOS = [
  { id: 'call_center', nombre: 'Call center', canal: 'telefonico' },
  { id: 'mesa_informes', nombre: 'Mesa de informes', canal: 'presencial' },
];

const esPuestoDeAtencion = (p) => PUESTOS.some((x) => x.id === p);

/**
 * El puesto elegido en esta PC manda; si no hay, el del usuario. Quien no
 * atiende en un puesto fijo (administración) arranca en call center y cambia
 * de tablero cuando quiere.
 */
function elegirPuesto() {
  const guardado = localStorage.getItem('puesto');
  if (esPuestoDeAtencion(guardado)) return guardado;
  return esPuestoDeAtencion(usuario.puesto) ? usuario.puesto : 'call_center';
}

const sinAcentos = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * El operador elige una sola vez dónde está atendiendo y no lo toca más.
 * El canal se deduce del puesto (call center → telefónico, mesa → presencial);
 * si la consulta entró por WhatsApp o mail se corrige desde "Agregar datos".
 */
function canalDelPuesto(puesto = puestoActual) {
  const buscado = (PUESTOS.find((p) => p.id === puesto) || PUESTOS[0]).canal;
  const c = datos.canales.find((x) => sinAcentos(x.nombre) === buscado) || datos.canales[0];
  return c ? c.id : null;
}

/** Los grupos del puesto elegido (más los marcados para ambos). */
const sectoresDelPuesto = () =>
  datos.sectores.filter((s) => !s.puesto || s.puesto === 'ambos' || s.puesto === puestoActual);

function pintarPuestos() {
  $('puestos').innerHTML = PUESTOS.map((p) => `
    <button type="button" data-puesto="${p.id}"${p.id === puestoActual ? ' aria-pressed="true"' : ''}>
      ${escapar(p.nombre)}</button>`).join('');
  $('puestos').querySelectorAll('[data-puesto]').forEach((b) => {
    b.onclick = () => {
      puestoActual = b.dataset.puesto;
      localStorage.setItem('puesto', puestoActual);
      pintarPuestos();
      pintarFrecuentes();
      pintarSectores();
    };
  });
}

function boton(motivo) {
  const hoy = datos.hoy_por_motivo[motivo.id] || 0;
  return `
    <button type="button" class="ficha" data-motivo="${motivo.id}">
      <span class="titulo">${escapar(motivo.nombre)}</span>
      <span class="veces${hoy ? '' : ' oculto'}" data-veces="${motivo.id}">${hoy} hoy</span>
    </button>`;
}

function pintarFrecuentes() {
  const delPuesto = new Set(sectoresDelPuesto().map((s) => s.id));
  const lista = datos.frecuentes
    .map((id) => datos.motivos.find((m) => m.id === id))
    .filter((m) => m && delPuesto.has(m.sector_id));
  $('caja-frecuentes').classList.toggle('oculto', !lista.length);
  $('frecuentes').innerHTML = lista.map((m) => boton(m)).join('');
  enlazarFichas($('frecuentes'));
}

function pintarSectores() {
  const conMotivos = sectoresDelPuesto().filter((s) => datos.motivos.some((m) => m.sector_id === s.id));
  $('sin-datos').classList.toggle('oculto', conMotivos.length > 0);
  $('sectores').innerHTML = conMotivos.map((s) => `
    <section class="tarjeta" style="margin-top:1rem">
      <header><h2>${escapar(s.nombre)}</h2><p>${escapar(s.detalle || '')}</p></header>
      <div class="botonera">
        ${datos.motivos.filter((m) => m.sector_id === s.id).map((m) => boton(m)).join('')}
      </div>
    </section>`).join('');
  enlazarFichas($('sectores'));
}

function enlazarFichas(contenedor) {
  contenedor.querySelectorAll('[data-motivo]').forEach((b) => {
    b.onclick = () => registrar(Number(b.dataset.motivo), b);
  });
}

function pintarContador() {
  $('contador').innerHTML = `<b>${num(datos.hoy.mias)}</b> cargadas hoy por vos ·
    <b>${num(datos.hoy.total)}</b> en total`;
}

/** Escape deshace el ultimo registro mientras el aviso sigue en pantalla. */
function atajos(e) {
  if (e.key === 'Escape' && ultima) deshacer();
}

// -------------------------------------------------------------- registrar ---

async function registrar(motivoId, ficha) {
  const canalId = canalDelPuesto();
  if (!canalId) return brindis('Cargá al menos un canal de contacto en Administración', 'error');
  const motivo = datos.motivos.find((m) => m.id === motivoId);
  if (!motivo) return;

  if (ficha) {
    ficha.classList.add('marcada');
    setTimeout(() => ficha.classList.remove('marcada'), 450);
  }

  try {
    const creada = await post('/api/consultas', {
      canal_id: canalId,
      sector_id: motivo.sector_id,
      motivo_id: motivo.id,
      estado: 'pendiente',        // se marca solucionada solo si el operador la resolvió
      primer_contacto: false,
      puesto: puestoActual,
    });
    ultima = creada;

    // Contadores al instante, sin volver a pedir el tablero.
    datos.hoy.mias++;
    datos.hoy.total++;
    datos.hoy_por_motivo[motivoId] = (datos.hoy_por_motivo[motivoId] || 0) + 1;
    document.querySelectorAll(`[data-veces="${motivoId}"]`).forEach((s) => {
      s.textContent = `${datos.hoy_por_motivo[motivoId]} hoy`;
      s.classList.remove('oculto');
    });
    pintarContador();
    mostrarConfirmacion(creada, motivo.nombre);
  } catch (err) {
    brindis(err.message, 'error');
  }
}

/**
 * Confirmacion con las salidas de excepcion a un clic: si la consulta no se
 * resolvio en el momento, o hay que anotar el socio, se corrige sin volver
 * a cargarla.
 */
function mostrarConfirmacion(consulta, titulo) {
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

  caja.querySelector('#solucionada').onclick = marcarSolucionada;
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

function brindis(mensaje, tipo = 'ok') {
  const caja = $('brindis');
  caja.className = `brindis visible ${tipo}`;
  caja.innerHTML = `<div class="linea">${escapar(mensaje)}</div>`;
  clearInterval(temporizador);
  // Al pasar a un mensaje simple ya no hay nada que deshacer con Esc.
  ultima = null;
  temporizador = setTimeout(() => { caja.className = 'brindis'; }, 5000);
}

/**
 * La consulta entra sin resolver: el operador la marca solucionada solo si
 * pudo resolverla en el momento. Marcarla cierra el aviso y deja la pantalla
 * lista para la próxima atención.
 */
async function marcarSolucionada() {
  if (!ultima) return;
  const id = ultima.id;
  cerrarConfirmacion();
  try {
    await put(`/api/consultas/${id}`, { estado: 'resuelta', primer_contacto: true });
  } catch (err) {
    brindis(err.message, 'error');
  }
}

async function deshacer() {
  if (!ultima) return;
  const c = ultima;
  cerrarConfirmacion();
  try {
    await del(`/api/consultas/${c.id}`);
    datos.hoy.mias--;
    datos.hoy.total--;
    if (c.motivo_id && datos.hoy_por_motivo[c.motivo_id]) {
      datos.hoy_por_motivo[c.motivo_id]--;
      document.querySelectorAll(`[data-veces="${c.motivo_id}"]`).forEach((s) => {
        const n = datos.hoy_por_motivo[c.motivo_id];
        s.textContent = `${n} hoy`;
        s.classList.toggle('oculto', !n);
      });
    }
    pintarContador();
  } catch (err) {
    brindis(err.message, 'error');
  }
}



/** Al cambiar de pantalla hay que soltar lo que quedó escuchando. */
export function limpiar() {
  document.removeEventListener('keydown', atajos);
  clearInterval(temporizador);
  ultima = null;
}
