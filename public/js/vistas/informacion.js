/* Vista: Información útil */

export const TITULO = 'Información útil';

export const html = `
<main>
  <h1>Información útil</h1>

  <div class="tarjeta" style="margin-bottom:1rem">
    <div class="segmentado" id="pestanas"></div>
  </div>

  <div id="aviso"></div>

  <!-- ------------------------------------------------------- servicios -->
  <section id="p-servicios">
    <div class="tarjeta" style="margin-bottom:1rem">
      <label for="q-servicios">Buscar</label>
      <input type="search" id="q-servicios" placeholder="Servicio, requisito o precio…">
    </div>
    <div class="grilla g2" id="servicios"></div>
    <p class="solo-lectura" id="sin-servicios" style="display:none">No se encontraron resultados.</p>
  </section>

  <!-- -------------------------------------------------------- internos -->
  <section id="p-internos" hidden>
    <div class="tarjeta" style="margin-bottom:1rem">
      <label for="q-internos">Buscar</label>
      <input type="search" id="q-internos" placeholder="Nombre, sector o número de interno…">
      <div class="segmentado ajustable" id="sectores" style="margin-top:.7rem"></div>
    </div>
    <div class="tarjeta tabla-scroll">
      <table>
        <thead>
          <tr><th>Interno</th><th>Sector</th><th>Quién atiende</th></tr>
        </thead>
        <tbody id="internos"></tbody>
      </table>
    </div>
  </section>

  <!-- ----------------------------------------------------------- pagos -->
  <section id="p-pagos" hidden>
    <div class="tarjeta" style="margin-bottom:1rem">
      <header><h2>Pago por internet</h2></header>
      <p style="margin:0">Desde la web de la cooperativa:
        <a href="https://www.coop5.com.ar" target="_blank" rel="noopener">www.coop5.com.ar</a></p>
    </div>
    <div class="grilla g3" id="pagos"></div>
  </section>

  <!-- ----------------------------------------------------------- notas -->
  <section id="p-notas" hidden>
    <div class="tarjeta" style="margin-bottom:1rem">
      <header><h2>Nueva nota</h2><p>queda a la vista del resto del personal</p></header>
      <div class="fila">
        <div class="campo"><label for="n-nombre">Nombre</label><input id="n-nombre"></div>
        <div class="campo"><label for="n-apellido">Apellido</label><input id="n-apellido"></div>
        <div class="campo corto"><label for="n-socio">N° de socio</label><input id="n-socio"></div>
        <div class="campo corto"><label for="n-telefono">Teléfono</label><input id="n-telefono"></div>
      </div>
      <div style="margin-top:.6rem">
        <label for="n-texto">Nota</label>
        <textarea id="n-texto" placeholder="Qué pasó, qué quedó pendiente…"></textarea>
      </div>
      <div class="fila" style="margin-top:.6rem">
        <button class="primario" id="n-guardar">Guardar nota</button>
      </div>
    </div>
    <div id="notas"></div>
  </section>

  <!-- ---------------------------------------------------------- cortes -->
  <section id="p-cortes" hidden>
    <div class="tarjeta" style="margin-bottom:1rem">
      <header><h2>Registrar corte</h2><p>fechas de aviso, plazo y corte real</p></header>
      <div class="fila">
        <div class="campo corto"><label for="c-aviso">Fecha de aviso</label><input type="date" id="c-aviso"></div>
        <div class="campo corto"><label for="c-plazo">Plazo (vencimiento)</label><input type="date" id="c-plazo"></div>
        <div class="campo corto"><label for="c-corte">Fecha real de corte</label><input type="date" id="c-corte"></div>
        <div class="campo"><label for="c-seccion">Sección</label>
          <select id="c-seccion">
            <option value="">Elegir…</option>
            <option>Luz comercial</option>
            <option>TICs</option>
            <option>Luz y agua familia</option>
          </select>
        </div>
      </div>
      <div style="margin-top:.6rem">
        <label for="c-obs">Observaciones</label>
        <textarea id="c-obs" placeholder="Opcional"></textarea>
      </div>
      <div class="fila" style="margin-top:.6rem">
        <button class="primario" id="c-guardar">Guardar corte</button>
      </div>
    </div>
    <div class="tarjeta tabla-scroll">
      <table>
        <thead>
          <tr><th>Sección</th><th>Aviso</th><th>Plazo</th><th>Corte</th><th>Observaciones</th><th>Cargó</th><th></th></tr>
        </thead>
        <tbody id="cortes"></tbody>
      </table>
    </div>
  </section>
</main>
`;

/*
 * Información útil: lo que el personal necesita tener a mano mientras atiende.
 *
 * Cinco solapas. Las tres primeras son datos de consulta que viajan con la
 * página (precios, internos, lugares de pago): se ven al instante y sin
 * pedirle nada al servidor. Las dos últimas —notas y cortes— sí se guardan,
 * en la misma base que el resto de la aplicación.
 */

import {
  get, post, del, escapar, avisar, fechaLarga, puede,
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


export async function iniciar(ctx) {
  ({ usuario } = ctx);

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
