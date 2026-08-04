/* Atencion rapida: un toque en el motivo = una consulta registrada.
   Todo lo demas (socio, observaciones, derivacion) es opcional y se agrega
   despues sobre la consulta recien creada, sin frenar la atencion. */

import {
  get, post, put, del, exigirSesion, montarBarra, escapar, num, etiquetaEstado,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
const SEGUNDOS_DESHACER = 12;

let datos, usuario, puestoActual;
let ultima = null;      // consulta recien registrada (para deshacer o completar)
let temporizador = null;

inicio().catch((e) => console.error(e));

async function inicio() {
  usuario = await exigirSesion();
  await montarBarra(usuario);
  await recargar();
  document.addEventListener('keydown', atajos);
}

async function recargar() {
  datos = await get('/api/tablero');
  puestoActual = localStorage.getItem('puesto') || usuario.puesto || 'call_center';
  pintarPuestos();
  pintarFrecuentes();
  pintarSectores();
  pintarContador();
}

const PUESTOS = [
  { id: 'call_center', nombre: 'Call center', canal: 'telefonico' },
  { id: 'mesa_informes', nombre: 'Mesa de informes', canal: 'presencial' },
];

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

function pintarPuestos() {
  $('puestos').innerHTML = PUESTOS.map((p) => `
    <button type="button" data-puesto="${p.id}"${p.id === puestoActual ? ' aria-pressed="true"' : ''}>
      ${escapar(p.nombre)}</button>`).join('');
  $('puestos').querySelectorAll('[data-puesto]').forEach((b) => {
    b.onclick = () => {
      puestoActual = b.dataset.puesto;
      localStorage.setItem('puesto', puestoActual);
      pintarPuestos();
    };
  });
}

const nombreSector = (id) => (datos.sectores.find((s) => s.id === id) || {}).nombre || '';

/** `conSector` solo hace falta en la fila de frecuentes, donde se mezclan. */
function boton(motivo, { atajo = null, conSector = false } = {}) {
  const hoy = datos.hoy_por_motivo[motivo.id] || 0;
  return `
    <button type="button" class="ficha" data-motivo="${motivo.id}">
      ${atajo ? `<span class="atajo">${atajo}</span>` : ''}
      <span class="titulo">${escapar(motivo.nombre)}</span>
      ${conSector ? `<span class="sector">${escapar(nombreSector(motivo.sector_id))}</span>` : ''}
      <span class="veces${hoy ? '' : ' oculto'}" data-veces="${motivo.id}">${hoy} hoy</span>
    </button>`;
}

function pintarFrecuentes() {
  const lista = datos.frecuentes
    .map((id) => datos.motivos.find((m) => m.id === id))
    .filter(Boolean);
  $('caja-frecuentes').classList.toggle('oculto', !lista.length);
  $('frecuentes').innerHTML = lista.map((m, i) => boton(m, { atajo: i + 1, conSector: true })).join('');
  enlazarFichas($('frecuentes'));
}

function pintarSectores() {
  const conMotivos = datos.sectores.filter((s) => datos.motivos.some((m) => m.sector_id === s.id));
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

/** Atajos 1..9 sobre la fila de frecuentes. */
function atajos(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  if (e.key === 'Escape' && ultima) return deshacer();
  const n = Number(e.key);
  if (!n || n < 1 || n > 9) return;
  const ficha = $('frecuentes').querySelectorAll('.ficha')[n - 1];
  if (ficha) { e.preventDefault(); ficha.click(); }
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
      estado: 'resuelta',
      primer_contacto: true,
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
    b.onclick = () => cambiarEstado(b.dataset.estado, b);
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
 * Corrige el resultado de la consulta recien cargada sin cerrar el aviso:
 * el operador todavia puede agregarle datos o deshacerla.
 */
async function cambiarEstado(estado, boton) {
  if (!ultima) return;
  try {
    await put(`/api/consultas/${ultima.id}`, { estado, primer_contacto: estado === 'resuelta' });
    ultima.estado = estado;
    const caja = $('brindis');
    caja.querySelectorAll('[data-estado]').forEach((b) => b.removeAttribute('aria-pressed'));
    if (boton) boton.setAttribute('aria-pressed', 'true');
    const marca = caja.querySelector('#marca-estado');
    if (marca) marca.textContent = `· ${etiquetaEstado(estado)}`;
  } catch (err) {
    brindis(err.message, 'error');
  }
}

async function deshacer() {
  if (!ultima) return;
  const c = ultima;
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
    brindis('Registro deshecho');
  } catch (err) {
    brindis(err.message, 'error');
  }
}

// ---------------------------------------------------- datos complementarios ---

function abrirDetalle() {
  const c = ultima;
  if (!c) return;
  clearInterval(temporizador);
  $('detalle-cuerpo').innerHTML = `
    <h2>Consulta #${c.id}</h2>
    <p class="solo-lectura">${escapar(c.sector || '')}${c.motivo ? ` · ${escapar(c.motivo)}` : ''}</p>
    <form id="form-detalle">
      <div class="fila" style="margin-top:.6rem">
        <div class="campo corto"><label for="d-socio">N° de socio</label>
          <input id="d-socio" inputmode="numeric" autofocus></div>
        <div class="campo"><label for="d-nombre">Nombre del socio</label><input id="d-nombre"></div>
        <div class="campo corto"><label for="d-canal">Canal</label>
          <select id="d-canal">${datos.canales.map((x) => `
            <option value="${x.id}"${x.id === c.canal_id ? ' selected' : ''}>${escapar(x.nombre)}</option>`).join('')}
          </select></div>
        <div class="campo corto"><label for="d-reclamo">N° de reclamo / OT</label><input id="d-reclamo"></div>
        <div class="campo corto"><label for="d-duracion">Duración (min)</label>
          <input id="d-duracion" type="number" min="0" step="1"></div>
      </div>
      <div style="margin-top:.6rem">
        <label for="d-obs">Observaciones</label>
        <textarea id="d-obs" placeholder="Qué se le informó al socio, a quién se derivó…"></textarea>
      </div>
      <label style="display:flex;gap:.4rem;align-items:center;margin-top:.6rem;font-size:.85rem">
        <input type="checkbox" id="d-encuesta" style="width:auto"> Generar encuesta de satisfacción
      </label>
      <p class="aviso" id="d-aviso"></p>
      <div class="pie" style="border:0;padding:.6rem 0 0">
        <button type="button" id="d-cerrar">Cancelar</button>
        <button type="submit" class="primario">Guardar</button>
      </div>
    </form>`;
  $('detalle').showModal();
  $('d-cerrar').onclick = () => { $('detalle').close(); cerrarConfirmacion(); };

  $('form-detalle').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await put(`/api/consultas/${c.id}`, {
        canal_id: $('d-canal').value,
        socio_nro: $('d-socio').value,
        socio_nombre: $('d-nombre').value,
        reclamo_nro: $('d-reclamo').value,
        duracion_seg: Math.round(Number($('d-duracion').value || 0) * 60),
        observaciones: $('d-obs').value,
      });
      let mensaje = `Consulta #${c.id} completada`;
      if ($('d-encuesta').checked) {
        const { url } = await post('/api/encuestas/link', { sector_id: c.sector_id, consulta_id: c.id });
        await navigator.clipboard.writeText(location.origin + url).catch(() => {});
        mensaje += ' · enlace de encuesta copiado';
      }
      $('detalle').close();
      cerrarConfirmacion();
      brindis(mensaje);
    } catch (err) {
      $('d-aviso').className = 'aviso error';
      $('d-aviso').textContent = err.message;
    }
  });
}
