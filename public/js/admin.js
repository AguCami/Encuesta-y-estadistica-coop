/* Administracion de catalogos y usuarios. */

import {
  get, post, put, del, exigirSesion, montarBarra, avisar, escapar, puede,
  etiquetaRol, etiquetaPuesto,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
let catalogos, usuarios = [], usuario;

inicio().catch((e) => console.error(e));

async function inicio() {
  usuario = await exigirSesion();
  await montarBarra(usuario);
  if (!puede(usuario, 'supervisor')) {
    document.querySelector('main').innerHTML = '<p class="aviso error">Esta sección es para supervisores.</p>';
    return;
  }
  $('caja-usuarios').classList.toggle('oculto', !puede(usuario, 'admin'));
  await recargar();

  enlazar('form-sector', () => post('/api/catalogos/sectores',
    { nombre: $('s-nombre').value, orden: Number($('s-orden').value || 100) }));
  enlazar('form-motivo', () => post('/api/catalogos/motivos',
    { sector_id: $('m-sector').value, nombre: $('m-nombre').value }));
  enlazar('form-canal', () => post('/api/catalogos/canales', { nombre: $('c-nombre').value }));
  enlazar('form-localidad', () => post('/api/catalogos/localidades', { nombre: $('l-nombre').value }));
  enlazar('form-usuario', () => post('/api/usuarios', {
    usuario: $('u-usuario').value, nombre: $('u-nombre').value, clave: $('u-clave').value,
    rol: $('u-rol').value, puesto: $('u-puesto').value,
  }));

  $('form-clave').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await post('/api/mi-clave', { actual: $('k-actual').value, nueva: $('k-nueva').value });
      e.target.reset();
      avisar($('aviso'), 'Clave actualizada.', 'ok');
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
  catalogos = await get('/api/catalogos');
  if (puede(usuario, 'admin')) usuarios = await get('/api/usuarios');

  const opcionesSector = catalogos.sectores.filter((s) => s.activo)
    .map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
  const anterior = $('m-filtro').value;
  $('m-sector').innerHTML = opcionesSector;
  $('m-filtro').innerHTML = opcionesSector;
  if (anterior) $('m-filtro').value = anterior;

  pintarCatalogo('t-sectores', 'sectores', catalogos.sectores, ['nombre', 'orden']);
  pintarCatalogo('t-canales', 'canales', catalogos.canales, ['nombre']);
  pintarCatalogo('t-localidades', 'localidades', catalogos.localidades, ['nombre']);
  pintarMotivos();
  pintarUsuarios();
}

function pintarCatalogo(destino, tabla, filas, columnas) {
  const cont = $(destino);
  if (!filas.length) { cont.innerHTML = '<p class="vacio">Todavía no hay registros</p>'; return; }
  cont.innerHTML = `
    <table><tbody>
      ${filas.map((f) => `
        <tr data-id="${f.id}" style="${f.activo ? '' : 'opacity:.5'}">
          ${columnas.map((c) => `<td>${escapar(f[c])}</td>`).join('')}
          <td class="num" style="white-space:nowrap">
            <button class="chico" data-accion="renombrar">Renombrar</button>
            <button class="chico" data-accion="estado">${f.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}
    </tbody></table>`;

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
