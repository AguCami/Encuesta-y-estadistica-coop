/* Listado, busqueda, detalle y seguimiento de las consultas. */

import {
  get, post, put, del, exigirSesion, montarBarra, montarFiltros, leerFiltros, escribirFiltros,
  qs, escapar, num, fechaLarga, fechaCorta, minutos, etiquetaEstado, etiquetaPuesto, puede, avisar,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);
let catalogos, usuario, filtros, offset = 0, total = 0;

inicio().catch((e) => console.error(e));

async function inicio() {
  // Las tres en paralelo: en la nube cada una es una ida y vuelta, y hacerlas
  // en fila se notaba al cambiar de pantalla.
  [usuario, catalogos] = await Promise.all([exigirSesion(), get('/api/catalogos')]);
  montarBarra(usuario);
  filtros = leerFiltros();
  $('buscar').value = filtros.q || '';

  montarFiltros($('filtros'), catalogos, filtros, (nuevos) => escribirFiltros({ ...nuevos, q: filtros.q }));
  $('btn-buscar').onclick = () => escribirFiltros({ ...filtros, q: $('buscar').value });
  $('buscar').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-buscar').click(); });
  $('btn-export').href = `/api/consultas/export?${qs(filtros)}`;
  $('mas').onclick = () => cargar(true);
  $('cerrar-detalle').onclick = () => $('detalle').close();

  await cargar();
}

async function cargar(agregar = false) {
  if (!agregar) offset = 0;
  const datos = await get(`/api/consultas?${qs({ ...filtros, limite: 100, offset })}`);
  total = datos.total;
  $('resumen').textContent = `${num(total)} consulta${total === 1 ? '' : 's'} entre ${fechaLarga(filtros.desde)} y ${fechaLarga(filtros.hasta)}`;
  pintarTabla(datos.filas, agregar);
  offset += datos.filas.length;
  $('mas').classList.toggle('oculto', offset >= total);
}

function pintarTabla(filas, agregar) {
  if (!filas.length && !agregar) {
    $('tabla').innerHTML = '<p class="vacio">No hay consultas con esos filtros</p>';
    return;
  }
  const cuerpo = filas.map((c) => `
    <tr data-id="${c.id}" style="cursor:pointer">
      <td>${fechaCorta(c.ts)}</td>
      <td>${escapar(c.sector || '—')}</td>
      <td>${escapar(c.motivo || '—')}</td>
      <td>${escapar(c.canal || '—')}</td>
      <td>${escapar(c.socio_nro || '')} ${escapar(c.socio_nombre || '')}</td>
      <td><span class="chip ${c.estado}">${etiquetaEstado(c.estado)}</span></td>
      <td>${escapar(c.operador || '—')}</td>
      <td class="num">${c.duracion_seg ? minutos(c.duracion_seg) : '—'}</td>
    </tr>`).join('');

  if (agregar) {
    $('tabla').querySelector('tbody').insertAdjacentHTML('beforeend', cuerpo);
  } else {
    $('tabla').innerHTML = `
      <table>
        <thead><tr>
          <th>Fecha</th><th>Sector</th><th>Motivo</th><th>Canal</th><th>Socio</th>
          <th>Estado</th><th>Operador</th><th class="num">Duración</th>
        </tr></thead>
        <tbody>${cuerpo}</tbody>
      </table>`;
  }
  $('tabla').querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.onclick = () => abrirDetalle(Number(tr.dataset.id));
  });
}

// --------------------------------------------------------------- detalle ---

async function abrirDetalle(id) {
  const c = await get(`/api/consultas/${id}`);
  const puedeEditar = c.operador_id === usuario.id || puede(usuario, 'supervisor');

  const dato = (etiqueta, valor) => `<div><label>${etiqueta}</label><div>${valor}</div></div>`;
  $('detalle-cuerpo').innerHTML = `
    <header style="display:flex;align-items:baseline;gap:.6rem">
      <h2>Consulta #${c.id}</h2>
      <span class="chip ${c.estado}">${etiquetaEstado(c.estado)}</span>
      ${c.prioridad === 'alta' ? '<span class="chip alta">Prioridad alta</span>' : ''}
    </header>
    <div class="grilla g3" style="margin:.8rem 0">
      ${dato('Fecha', fechaLarga(c.ts))}
      ${dato('Sector', escapar(c.sector || '—'))}
      ${dato('Motivo', escapar(c.motivo || '—'))}
      ${dato('Canal', escapar(c.canal || '—'))}
      ${dato('Puesto', etiquetaPuesto(c.puesto))}
      ${dato('Operador', escapar(c.operador || '—'))}
      ${dato('Socio', escapar(`${c.socio_nro || ''} ${c.socio_nombre || ''}`.trim() || '—'))}
      ${dato('Contacto', escapar(c.contacto || '—'))}
      ${dato('Localidad', escapar(c.localidad || '—'))}
      ${dato('Duración', c.duracion_seg ? minutos(c.duracion_seg) : '—')}
      ${dato('Primer contacto', c.primer_contacto ? 'Sí' : 'No')}
      ${dato('Reclamo / OT', escapar(c.reclamo_nro || '—'))}
    </div>
    ${c.observaciones ? `<div><label>Observaciones</label><p style="margin:.2rem 0">${escapar(c.observaciones)}</p></div>` : ''}
    ${c.encuesta && c.encuesta.respondida ? `
      <div class="aviso ok">Encuesta respondida: conformidad ${c.encuesta.satisfaccion}/5</div>` : ''}

    <h3 style="margin-top:1rem">Seguimiento</h3>
    <ul class="linea-tiempo" id="timeline">
      ${c.seguimientos.length ? c.seguimientos.map((s) => `
        <li><time>${fechaLarga(s.ts)} · ${escapar(s.usuario || '')}</time>
            <div>${escapar(s.nota)}</div></li>`).join('')
    : '<li class="solo-lectura">Sin movimientos registrados</li>'}
    </ul>

    ${puedeEditar ? `
      <div class="fila" style="margin-top:.8rem">
        <div class="campo ancho"><label for="nota">Agregar nota</label>
          <input id="nota" placeholder="Qué se hizo, a quién se derivó…"></div>
        <div class="campo corto"><label for="nuevo-estado">Nuevo estado</label>
          <select id="nuevo-estado">
            <option value="">Sin cambio</option>
            ${catalogos.estados.map((e) => `<option value="${e.id}">${e.nombre}</option>`).join('')}
          </select></div>
        <button id="guardar-seg" class="primario">Guardar</button>
        ${puede(usuario, 'supervisor') ? '<button id="borrar">Eliminar</button>' : ''}
      </div>
      <p class="aviso" id="aviso-detalle"></p>` : ''}`;

  $('detalle').showModal();

  if (puedeEditar) {
    $('guardar-seg').onclick = async () => {
      const nota = $('nota').value.trim();
      const estado = $('nuevo-estado').value;
      if (!nota && !estado) return;
      try {
        if (nota) await post(`/api/consultas/${id}/seguimientos`, { nota, estado });
        else await put(`/api/consultas/${id}`, { estado });
        $('detalle').close();
        await cargar();
      } catch (err) { avisar($('aviso-detalle'), err.message, 'error'); }
    };
    const borrar = $('borrar');
    if (borrar) {
      borrar.onclick = async () => {
        if (!confirm(`¿Eliminar la consulta #${id}? Esta acción no se puede deshacer.`)) return;
        await del(`/api/consultas/${id}`);
        $('detalle').close();
        await cargar();
      };
    }
  }
}
