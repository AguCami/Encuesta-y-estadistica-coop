/* Vista: Administración */

export const TITULO = 'Administración';

export const html = `
<main>
  <h1>Administración</h1>
  <p class="aviso" id="aviso"></p>

  <div class="grilla g2">
    <section class="tarjeta">
      <header><h2>Sectores</h2><p>cada consulta se imputa a uno · definen el tablero de cada puesto</p></header>
      <form class="fila" id="form-sector">
        <div class="campo"><label for="s-nombre">Nuevo sector</label><input id="s-nombre" required></div>
        <div class="campo corto"><label for="s-puesto">Aparece en</label>
          <select id="s-puesto">
            <option value="call_center">Call center</option>
            <option value="mesa_informes">Mesa de informes</option>
            <option value="ambos">Los dos</option>
          </select></div>
        <div class="campo corto"><label for="s-orden">Orden</label><input id="s-orden" type="number" value="100"></div>
        <button class="primario">Agregar</button>
      </form>
      <div class="tabla-scroll" id="t-sectores" style="margin-top:.7rem"></div>
    </section>

    <section class="tarjeta">
      <header><h2>Motivos de consulta</h2><p>el detalle dentro de cada sector</p></header>
      <form class="fila" id="form-motivo">
        <div class="campo"><label for="m-sector">Sector</label><select id="m-sector"></select></div>
        <div class="campo"><label for="m-nombre">Nuevo motivo</label><input id="m-nombre" required></div>
        <button class="primario">Agregar</button>
      </form>
      <div class="fila" style="margin-top:.7rem">
        <div class="campo"><label for="m-filtro">Ver motivos de</label><select id="m-filtro"></select></div>
      </div>
      <div class="tabla-scroll" id="t-motivos" style="margin-top:.5rem"></div>
    </section>
  </div>

  <div class="grilla g2" style="margin-top:1rem">
    <section class="tarjeta">
      <header><h2>Canales de contacto</h2></header>
      <form class="fila" id="form-canal">
        <div class="campo"><label for="c-nombre">Nuevo canal</label><input id="c-nombre" required></div>
        <button class="primario">Agregar</button>
      </form>
      <div class="tabla-scroll" id="t-canales" style="margin-top:.7rem"></div>
    </section>

    <section class="tarjeta">
      <header><h2>Localidades</h2><p>opcional, para ver de dónde llega la demanda</p></header>
      <form class="fila" id="form-localidad">
        <div class="campo"><label for="l-nombre">Nueva localidad</label><input id="l-nombre" required></div>
        <button class="primario">Agregar</button>
      </form>
      <div class="tabla-scroll" id="t-localidades" style="margin-top:.7rem"></div>
    </section>
  </div>

  <section class="tarjeta peligro" style="margin-top:1rem" id="caja-reinicio">
    <header><h2>Reiniciar estadísticas</h2>
      <p>borra todas las consultas cargadas para arrancar de cero</p></header>
    <p class="solo-lectura" style="margin:0 0 .7rem">
      Se borran las consultas, sus seguimientos y sus encuestas. <b>No hay vuelta atrás.</b>
      No se tocan los usuarios, los sectores, los motivos, las notas ni los cortes.
      Si querés guardarte lo que hay, bajá primero
      <a href="/api/respaldo">una copia de todos los datos</a>.
    </p>
    <form class="fila" id="form-reinicio">
      <div class="campo corto"><label for="r-codigo">Código</label>
        <input id="r-codigo" autocomplete="off" required></div>
      <button class="primario">Reiniciar</button>
    </form>
  </section>

  <section class="tarjeta" style="margin-top:1rem" id="caja-usuarios">
    <header><h2>Usuarios</h2><p>operadores del call center y de la mesa de informes</p></header>
    <form class="fila" id="form-usuario">
      <div class="campo corto"><label for="u-usuario">Usuario</label><input id="u-usuario" required></div>
      <div class="campo"><label for="u-nombre">Nombre y apellido</label><input id="u-nombre" required></div>
      <div class="campo corto"><label for="u-clave">Clave inicial</label><input id="u-clave" required></div>
      <div class="campo corto"><label for="u-rol">Rol</label>
        <select id="u-rol">
          <option value="operador">Operador</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Administrador</option>
        </select></div>
      <div class="campo corto"><label for="u-puesto">Puesto</label>
        <select id="u-puesto">
          <option value="call_center">Call center</option>
          <option value="mesa_informes">Mesa de informes</option>
          <option value="otro">Otro</option>
        </select></div>
      <button class="primario">Crear</button>
    </form>
    <div class="tabla-scroll" id="t-usuarios" style="margin-top:.7rem"></div>
  </section>

</main>
`;

/* Administracion de catalogos y usuarios. */

import {
  get, post, put, del, olvidar, avisar, escapar, puede,
  etiquetaRol, etiquetaPuesto,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
let catalogos, usuarios = [], usuario;


export async function iniciar(ctx) {
  ({ usuario } = ctx);
  if (!puede(usuario, 'supervisor')) {
    document.querySelector('main').innerHTML = '<p class="aviso error">Esta sección es para supervisores.</p>';
    return;
  }
  $('caja-usuarios').classList.toggle('oculto', !puede(usuario, 'admin'));
  await recargar();

  enlazar('form-sector', () => post('/api/catalogos/sectores', {
    nombre: $('s-nombre').value,
    puesto: $('s-puesto').value,
    orden: Number($('s-orden').value || 100),
  }));
  enlazar('form-motivo', () => post('/api/catalogos/motivos',
    { sector_id: $('m-sector').value, nombre: $('m-nombre').value }));
  enlazar('form-canal', () => post('/api/catalogos/canales', { nombre: $('c-nombre').value }));
  enlazar('form-localidad', () => post('/api/catalogos/localidades', { nombre: $('l-nombre').value }));
  enlazar('form-usuario', () => post('/api/usuarios', {
    usuario: $('u-usuario').value, nombre: $('u-nombre').value, clave: $('u-clave').value,
    rol: $('u-rol').value, puesto: $('u-puesto').value,
  }));

  $('form-reinicio').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm('Se van a borrar todas las consultas cargadas. Esto no se puede deshacer.\n\n¿Seguís?')) return;
    try {
      const r = await post('/api/reiniciar', { codigo: $('r-codigo').value });
      $('r-codigo').value = '';
      avisar($('aviso'), `Listo: se borraron ${r.borradas} consultas. Las estadísticas arrancan de cero.`, 'ok');
    } catch (err) { avisar($('aviso'), err.message, 'error'); }
  });

  $('m-filtro').onchange = pintarMotivos;
}

function enlazar(idForm, accion) {
  $(idForm).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await accion();
      e.target.reset();
      await recargar();
      avisar($('aviso'), 'Listo.', 'ok');
    } catch (err) { avisar($('aviso'), err.message, 'error'); }
  });
}

async function recargar() {
  // Acá se editan los catálogos: lo guardado en la pestaña queda viejo y el
  // resto de las pantallas tiene que volver a pedirlos.
  olvidar('/api/catalogos');
  dispatchEvent(new Event('catalogos-cambiados'));
  catalogos = await get('/api/catalogos');
  if (puede(usuario, 'admin')) usuarios = await get('/api/usuarios');

  const opcionesSector = catalogos.sectores.filter((s) => s.activo)
    .map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
  const anterior = $('m-filtro').value;
  $('m-sector').innerHTML = opcionesSector;
  $('m-filtro').innerHTML = opcionesSector;
  if (anterior) $('m-filtro').value = anterior;

  pintarCatalogo('t-sectores', 'sectores', catalogos.sectores, ['nombre', 'orden'], true);
  pintarCatalogo('t-canales', 'canales', catalogos.canales, ['nombre']);
  pintarCatalogo('t-localidades', 'localidades', catalogos.localidades, ['nombre']);
  pintarMotivos();
  pintarUsuarios();
}

const PUESTOS_SECTOR = [
  ['call_center', 'Call center'], ['mesa_informes', 'Mesa de informes'], ['ambos', 'Los dos'],
];

/** `conPuesto` agrega el selector que decide en qué tablero aparece el sector. */
function pintarCatalogo(destino, tabla, filas, columnas, conPuesto = false) {
  const cont = $(destino);
  if (!filas.length) { cont.innerHTML = '<p class="vacio">Todavía no hay registros</p>'; return; }
  cont.innerHTML = `
    <table><tbody>
      ${filas.map((f) => `
        <tr data-id="${f.id}" style="${f.activo ? '' : 'opacity:.5'}">
          ${columnas.map((c) => `<td>${escapar(f[c])}</td>`).join('')}
          ${conPuesto ? `<td><select data-puesto style="width:auto">
            ${PUESTOS_SECTOR.map(([v, t]) => `<option value="${v}"${(f.puesto || 'ambos') === v ? ' selected' : ''}>${t}</option>`).join('')}
          </select></td>` : ''}
          <td class="num" style="white-space:nowrap">
            <button class="chico" data-accion="renombrar">Renombrar</button>
            <button class="chico" data-accion="estado">${f.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}
    </tbody></table>`;

  cont.querySelectorAll('[data-puesto]').forEach((sel) => {
    sel.onchange = async () => {
      try {
        await put(`/api/catalogos/${tabla}/${sel.closest('tr').dataset.id}`, { puesto: sel.value });
        await recargar();
      } catch (err) { avisar($('aviso'), err.message, 'error'); }
    };
  });

  cont.querySelectorAll('button').forEach((b) => {
    b.onclick = async () => {
      const id = b.closest('tr').dataset.id;
      const fila = filas.find((f) => String(f.id) === id);
      try {
        if (b.dataset.accion === 'renombrar') {
          const nombre = prompt('Nuevo nombre', fila.nombre);
          if (!nombre) return;
          await put(`/api/catalogos/${tabla}/${id}`, { nombre });
        } else if (fila.activo) {
          await del(`/api/catalogos/${tabla}/${id}`);
        } else {
          await put(`/api/catalogos/${tabla}/${id}`, { activo: true });
        }
        await recargar();
      } catch (err) { avisar($('aviso'), err.message, 'error'); }
    };
  });
}

function pintarMotivos() {
  const sectorId = Number($('m-filtro').value);
  const filas = catalogos.motivos.filter((m) => m.sector_id === sectorId);
  pintarCatalogo('t-motivos', 'motivos', filas, ['nombre']);
}

function pintarUsuarios() {
  if (!puede(usuario, 'admin')) return;
  $('t-usuarios').innerHTML = `
    <table>
      <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Puesto</th><th></th></tr></thead>
      <tbody>${usuarios.map((u) => `
        <tr data-id="${u.id}" style="${u.activo ? '' : 'opacity:.5'}">
          <td>${escapar(u.usuario)}</td>
          <td>${escapar(u.nombre)}</td>
          <td>${etiquetaRol(u.rol)}</td>
          <td>${etiquetaPuesto(u.puesto)}</td>
          <td class="num" style="white-space:nowrap">
            <button class="chico" data-accion="clave">Nueva clave</button>
            <button class="chico" data-accion="estado">${u.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  $('t-usuarios').querySelectorAll('button').forEach((b) => {
    b.onclick = async () => {
      const id = b.closest('tr').dataset.id;
      const u = usuarios.find((x) => String(x.id) === id);
      try {
        if (b.dataset.accion === 'clave') {
          const clave = prompt(`Nueva clave para ${u.usuario}`);
          if (!clave) return;
          await put(`/api/usuarios/${id}`, { clave });
          avisar($('aviso'), 'Clave actualizada.', 'ok');
        } else {
          await put(`/api/usuarios/${id}`, { activo: !u.activo });
        }
        await recargar();
      } catch (err) { avisar($('aviso'), err.message, 'error'); }
    };
  });
}
