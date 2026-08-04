/* Pantalla de carga rapida: pensada para completar durante la llamada. */

import {
  get, post, exigirSesion, montarBarra, avisar, escapar, num, hoyISO,
  etiquetaEstado, fechaCorta,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
let catalogos, usuario;

const el = {
  canal: $('canal'), puesto: $('puesto'), prioridad: $('prioridad'), sector: $('sector'),
  motivo: $('motivo'), localidad: $('localidad'), estado: $('estado'), aviso: $('aviso'),
};

inicio().catch((e) => console.error(e));

async function inicio() {
  usuario = await exigirSesion();
  await montarBarra(usuario);
  catalogos = await get('/api/catalogos');
  llenarSelectores();
  await Promise.all([cargarFrecuentes(), refrescarPanelLateral()]);
  prepararEventos();
}

// ------------------------------------------------------------ selectores ---

const opciones = (lista, { vacio = '', valor = 'id', etiqueta = 'nombre', soloActivos = true } = {}) =>
  (vacio ? `<option value="">${vacio}</option>` : '') +
  lista.filter((o) => (soloActivos ? o.activo !== 0 : true))
    .map((o) => `<option value="${o[valor]}">${escapar(o[etiqueta])}</option>`).join('');

function llenarSelectores() {
  el.canal.innerHTML = opciones(catalogos.canales, { vacio: 'Elegí…' });
  el.puesto.innerHTML = opciones(catalogos.puestos);
  el.puesto.value = usuario.puesto;
  el.prioridad.innerHTML = opciones(catalogos.prioridades);
  el.prioridad.value = 'normal';
  el.sector.innerHTML = opciones(catalogos.sectores, { vacio: 'Elegí…' });
  el.localidad.innerHTML = opciones(catalogos.localidades, { vacio: '—' });
  el.estado.innerHTML = opciones(catalogos.estados);
  if (!catalogos.localidades.length) el.localidad.closest('.campo').classList.add('oculto');
  actualizarMotivos();
}

function actualizarMotivos() {
  const sectorId = Number(el.sector.value);
  const motivos = catalogos.motivos.filter((m) => m.sector_id === sectorId && m.activo !== 0);
  const sinSector = !sectorId;
  el.motivo.innerHTML = opciones(motivos, {
    vacio: sinSector ? 'Elegí primero un sector' : (motivos.length ? 'Elegí…' : 'Sin motivos cargados'),
  });
  el.motivo.disabled = !motivos.length;
}

/** Accesos directos a los motivos mas usados en los ultimos 30 dias. */
async function cargarFrecuentes() {
  const cont = $('frecuentes');
  try {
    const est = await get(`/api/estadisticas?desde=${hoyISO().slice(0, 8)}01&hasta=${hoyISO()}`);
    const top = est.por_motivo.slice(0, 8);
    if (!top.length) return;
    cont.innerHTML = '<span class="solo-lectura" style="align-self:center">Frecuentes:</span>' +
      top.map((m) => `<button type="button" class="chico" data-motivo="${m.id}">${escapar(m.nombre)}</button>`).join('');
    cont.querySelectorAll('[data-motivo]').forEach((b) => {
      b.onclick = () => {
        const motivo = catalogos.motivos.find((m) => m.id === Number(b.dataset.motivo));
        if (!motivo) return;
        el.sector.value = motivo.sector_id;
        actualizarMotivos();
        el.motivo.value = motivo.id;
        el.motivo.focus();
      };
    });
  } catch { /* si falla, la pantalla sigue siendo usable */ }
}

// ------------------------------------------------------------ cronometro ---

let inicioCrono = null, tickCrono = null;

function alternarCrono() {
  const boton = $('crono');
  if (inicioCrono) {
    const seg = Math.round((Date.now() - inicioCrono) / 1000);
    $('duracion').value = Math.max(1, Math.round(seg / 60));
    clearInterval(tickCrono);
    inicioCrono = null;
    boton.textContent = '▶ Iniciar';
  } else {
    inicioCrono = Date.now();
    boton.textContent = '⏸ 0:00';
    tickCrono = setInterval(() => {
      const seg = Math.round((Date.now() - inicioCrono) / 1000);
      boton.textContent = `⏸ ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    }, 1000);
  }
}

function detenerCrono() {
  clearInterval(tickCrono);
  inicioCrono = null;
  $('crono').textContent = '▶ Iniciar';
}

// --------------------------------------------------------------- guardar ---

function prepararEventos() {
  el.sector.onchange = actualizarMotivos;
  $('crono').onclick = alternarCrono;
  $('limpiar').onclick = () => limpiar(true);
  $('form').addEventListener('submit', guardar);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('form').requestSubmit(); }
  });
}

function limpiar(todo = false) {
  ['socio_nro', 'socio_nombre', 'contacto', 'reclamo_nro', 'observaciones'].forEach((id) => { $(id).value = ''; });
  $('duracion').value = 0;
  $('primer_contacto').checked = true;
  $('generar_encuesta').checked = false;
  el.estado.value = 'resuelta';
  el.prioridad.value = 'normal';
  detenerCrono();
  if (todo) {
    el.sector.value = '';
    actualizarMotivos();
    el.canal.value = '';
  }
  $('link-encuesta').classList.add('oculto');
  el.sector.focus();
}

async function guardar(e) {
  e.preventDefault();
  const boton = e.target.querySelector('button[type=submit]');
  boton.disabled = true;
  try {
    const datos = {
      canal_id: el.canal.value,
      puesto: el.puesto.value,
      prioridad: el.prioridad.value,
      sector_id: el.sector.value,
      motivo_id: el.motivo.value || null,
      localidad_id: el.localidad.value || null,
      socio_nro: $('socio_nro').value,
      socio_nombre: $('socio_nombre').value,
      contacto: $('contacto').value,
      estado: el.estado.value,
      reclamo_nro: $('reclamo_nro').value,
      duracion_seg: Math.round(Number($('duracion').value || 0) * 60),
      observaciones: $('observaciones').value,
      primer_contacto: $('primer_contacto').checked,
      generar_encuesta: $('generar_encuesta').checked,
    };
    const creada = await post('/api/consultas', datos);
    avisar(el.aviso, `Consulta #${creada.id} registrada.`, 'ok');
    mostrarLinkEncuesta(creada);
    limpiar();
    await refrescarPanelLateral();
  } catch (err) {
    avisar(el.aviso, err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

function mostrarLinkEncuesta(consulta) {
  const caja = $('link-encuesta');
  if (!consulta.encuesta) return caja.classList.add('oculto');
  const url = location.origin + consulta.encuesta.url;
  caja.className = 'aviso ok';
  caja.innerHTML = `Encuesta para el socio:
    <input readonly value="${url}" style="flex:1;min-width:200px">
    <button type="button" class="chico" id="copiar">Copiar</button>`;
  caja.querySelector('#copiar').onclick = async () => {
    await navigator.clipboard.writeText(url);
    caja.querySelector('#copiar').textContent = 'Copiado';
  };
}

// ---------------------------------------------------------- panel lateral ---

async function refrescarPanelLateral() {
  const hoy = hoyISO();
  const [est, mias] = await Promise.all([
    get(`/api/estadisticas?desde=${hoy}&hasta=${hoy}`),
    get(`/api/consultas?desde=${hoy}&hasta=${hoy}&operador_id=${usuario.id}&limite=8`),
  ]);

  $('kpis-hoy').innerHTML = `
    <div class="kpi"><div class="etiqueta">Consultas hoy</div>
      <div class="valor">${num(est.resumen.total)}</div>
      <div class="pie">${num(mias.total)} cargadas por vos</div></div>
    <div class="kpi"><div class="etiqueta">Pendientes</div>
      <div class="valor">${num(est.resumen.pendientes)}</div>
      <div class="pie">de todos los sectores</div></div>`;

  $('mis-total').textContent = `${num(mias.total)} hoy`;
  $('ultimas').innerHTML = mias.filas.length ? `
    <table>
      <thead><tr><th>Hora</th><th>Sector</th><th>Motivo</th><th>Estado</th></tr></thead>
      <tbody>${mias.filas.map((c) => `
        <tr><td>${fechaCorta(c.ts).slice(-5)}</td>
            <td>${escapar(c.sector || '—')}</td>
            <td>${escapar(c.motivo || '—')}</td>
            <td><span class="chip ${c.estado}">${etiquetaEstado(c.estado)}</span></td></tr>`).join('')}
      </tbody>
    </table>` : '<p class="vacio">Todavía no cargaste consultas hoy</p>';
}
