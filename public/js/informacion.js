/*
 * Información útil: lo que el personal necesita tener a mano mientras atiende.
 *
 * Cinco solapas. Las tres primeras son datos de consulta que viajan con la
 * página (precios, internos, lugares de pago): se ven al instante y sin
 * pedirle nada al servidor. Las dos últimas —notas y cortes— sí se guardan,
 * en la misma base que el resto de la aplicación.
 */

import {
  get, post, del, exigirSesion, montarBarra, escapar, avisar, fechaLarga, puede,
} from '/js/api.js';
import { SERVICIOS, INTERNOS, PAGOS } from '/js/datos-info.js';

const $ = (id) => document.getElementById(id);

const SOLAPAS = [
  { id: 'servicios', texto: 'Servicios' },
  { id: 'internos', texto: 'Internos' },
  { id: 'pagos', texto: 'Pagos' },
  { id: 'cortes', texto: 'Cortes' },
  { id: 'notas', texto: 'Notas' },
];

let usuario;
let solapa = 'servicios';
let sectorInternos = 'todos';

inicio().catch((e) => console.error(e));

async function inicio() {
  usuario = await exigirSesion();
  montarBarra(usuario);

  pintarSolapas();
  pintarServicios();
  pintarSectores();
  pintarInternos();
  pintarPagos();

  $('q-servicios').addEventListener('input', pintarServicios);
  $('q-internos').addEventListener('input', pintarInternos);
  $('n-guardar').onclick = guardarNota;
  $('c-guardar').onclick = guardarCorte;

  // La solapa queda guardada: al volver de otra pantalla se abre donde estabas.
  const guardada = sessionStorage.getItem('info-solapa');
  if (SOLAPAS.some((s) => s.id === guardada)) elegirSolapa(guardada);
}

// ------------------------------------------------------------- solapas ---

function pintarSolapas() {
  $('pestanas').innerHTML = SOLAPAS
    .map((s) => `<button type="button" data-solapa="${s.id}"
      aria-pressed="${s.id === solapa}">${s.texto}</button>`).join('');
  $('pestanas').querySelectorAll('button').forEach((b) => {
    b.onclick = () => elegirSolapa(b.dataset.solapa);
  });
}

function elegirSolapa(id) {
  solapa = id;
  sessionStorage.setItem('info-solapa', id);
  pintarSolapas();
  for (const s of SOLAPAS) $(`p-${s.id}`).hidden = s.id !== id;
  if (id === 'notas') cargarNotas();
  if (id === 'cortes') cargarCortes();
}

// ----------------------------------------------------------- servicios ---

const sinAcentos = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function pintarServicios() {
  const q = sinAcentos($('q-servicios').value.trim());
  const visibles = SERVICIOS.filter((s) => !q || sinAcentos(textoDelServicio(s)).includes(q));

  $('servicios').innerHTML = visibles.map((s) => `
    <article class="tarjeta servicio">
      <header><h2>${s.icono ? `${s.icono} ` : ''}${escapar(s.titulo)}</h2></header>
      ${s.bloques.map(bloque).join('')}
      ${s.notas.map((n) => `<p class="nota-servicio">${escapar(n)}</p>`).join('')}
    </article>`).join('');

  $('sin-servicios').style.display = visibles.length ? 'none' : '';
}

const textoDelServicio = (s) => [
  s.titulo, s.etiquetas,
  ...s.bloques.flatMap((b) => [b.titulo, ...b.precios.flat(), ...b.requisitos]),
  ...s.notas,
].join(' ');

function bloque(b) {
  const precios = b.precios.map(([etiqueta, valor]) => `
    <div class="precio"><span>${escapar(etiqueta)}</span><b>${escapar(valor)}</b></div>`).join('');
  const reqs = b.requisitos.length
    ? `<ul class="requisitos">${b.requisitos.map((r) => `<li>${escapar(r)}</li>`).join('')}</ul>`
    : '';
  return `${b.titulo ? `<h3 class="bloque">${escapar(b.titulo)}</h3>` : ''}${precios}${reqs}`;
}

// ------------------------------------------------------------ internos ---

function pintarSectores() {
  const sectores = ['todos', ...[...new Set(INTERNOS.map((i) => i.sector))].sort()];
  $('sectores').innerHTML = sectores.map((s) => `
    <button type="button" class="chico" data-sector="${escapar(s)}"
      aria-pressed="${s === sectorInternos}">${s === 'todos' ? 'Todos' : escapar(s)}</button>`).join('');
  $('sectores').querySelectorAll('button').forEach((b) => {
    b.onclick = () => { sectorInternos = b.dataset.sector; pintarSectores(); pintarInternos(); };
  });
}

function pintarInternos() {
  const q = sinAcentos($('q-internos').value.trim());
  const filas = INTERNOS.filter((i) => {
    if (sectorInternos !== 'todos' && i.sector !== sectorInternos) return false;
    return !q || sinAcentos(`${i.nombre} ${i.sector} ${i.num}`).includes(q);
  });
  $('internos').innerHTML = filas.length
    ? filas.map((i) => `
      <tr>
        <td><b class="interno">${escapar(i.num)}</b></td>
        <td>${escapar(i.sector)}</td>
        <td>${escapar(i.nombre)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" class="solo-lectura">No se encontraron internos.</td></tr>';
}

// --------------------------------------------------------------- pagos ---

function pintarPagos() {
  $('pagos').innerHTML = PAGOS.map((z) => `
    <article class="tarjeta">
      <header><h2>${escapar(z.zona)}</h2></header>
      ${z.lugares.map((l) => `
        <div class="lugar">
          <b>${escapar(l.nombre)}</b>
          <span class="solo-lectura">${escapar(l.direccion)}</span>
        </div>`).join('')}
    </article>`).join('');
}

// --------------------------------------------------------------- notas ---

const puedeBorrar = (fila) => fila.usuario_id === usuario.id || puede(usuario, 'supervisor');

async function cargarNotas() {
  const notas = await get('/api/notas');
  $('notas').innerHTML = notas.length ? notas.map((n) => `
    <article class="tarjeta nota">
      <header>
        <h3>${escapar([n.nombre, n.apellido].filter(Boolean).join(' ')) || 'Sin nombre'}</h3>
        ${n.socio_nro ? `<span class="chip">Socio ${escapar(n.socio_nro)}</span>` : ''}
        ${n.telefono ? `<span class="solo-lectura">${escapar(n.telefono)}</span>` : ''}
        <span style="flex:1"></span>
        ${puedeBorrar(n) ? `<button class="chico" data-borrar="${n.id}">Borrar</button>` : ''}
      </header>
      ${n.texto ? `<p class="texto-nota">${escapar(n.texto)}</p>` : ''}
      <p class="solo-lectura">${escapar(n.autor || '')} · ${fechaLarga(n.ts)}</p>
    </article>`).join('')
    : '<p class="solo-lectura">Todavía no hay notas cargadas.</p>';

  $('notas').querySelectorAll('[data-borrar]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Borrar esta nota?')) return;
      await del(`/api/notas/${b.dataset.borrar}`);
      await cargarNotas();
    };
  });
}

async function guardarNota() {
  const cuerpo = {
    nombre: $('n-nombre').value, apellido: $('n-apellido').value,
    socio_nro: $('n-socio').value, telefono: $('n-telefono').value, texto: $('n-texto').value,
  };
  try {
    await post('/api/notas', cuerpo);
    for (const id of ['n-nombre', 'n-apellido', 'n-socio', 'n-telefono', 'n-texto']) $(id).value = '';
    avisar($('aviso'), 'Nota guardada.', 'ok');
    await cargarNotas();
  } catch (e) { avisar($('aviso'), e.message, 'error'); }
}

// -------------------------------------------------------------- cortes ---

async function cargarCortes() {
  const cortes = await get('/api/cortes');
  $('cortes').innerHTML = cortes.length ? cortes.map((c) => `
    <tr>
      <td>${escapar(c.seccion)}</td>
      <td>${c.aviso ? fechaLarga(c.aviso) : '—'}</td>
      <td>${c.plazo ? fechaLarga(c.plazo) : '—'}</td>
      <td>${c.corte ? fechaLarga(c.corte) : '—'}</td>
      <td>${escapar(c.observaciones || '')}</td>
      <td class="solo-lectura">${escapar(c.autor || '')}</td>
      <td>${puedeBorrar(c) ? `<button class="chico" data-borrar="${c.id}">Borrar</button>` : ''}</td>
    </tr>`).join('')
    : '<tr><td colspan="7" class="solo-lectura">Todavía no hay cortes cargados.</td></tr>';

  $('cortes').querySelectorAll('[data-borrar]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Borrar este corte?')) return;
      await del(`/api/cortes/${b.dataset.borrar}`);
      await cargarCortes();
    };
  });
}

async function guardarCorte() {
  try {
    await post('/api/cortes', {
      seccion: $('c-seccion').value, aviso: $('c-aviso').value,
      plazo: $('c-plazo').value, corte: $('c-corte').value, observaciones: $('c-obs').value,
    });
    for (const id of ['c-aviso', 'c-plazo', 'c-corte', 'c-obs']) $(id).value = '';
    $('c-seccion').value = '';
    avisar($('aviso'), 'Corte guardado.', 'ok');
    await cargarCortes();
  } catch (e) { avisar($('aviso'), e.message, 'error'); }
}
