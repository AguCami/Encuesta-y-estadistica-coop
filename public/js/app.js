/*
 * El armazón de la aplicación.
 *
 * Antes cada pestaña era una página web distinta: al cambiar, el navegador
 * descartaba todo y volvía a cargar de cero. Ahora hay una sola página que no
 * se recarga nunca. Cambiar de pestaña sólo reemplaza el contenido del medio;
 * la barra de arriba, la sesión y los catálogos se quedan donde están.
 *
 * Cada pantalla vive en `js/vistas/` y se descarga la primera vez que se
 * entra. La dirección de la barra del navegador sigue cambiando, así que el
 * botón de volver, los favoritos y recargar funcionan como siempre.
 */

import {
  get, getGuardado, post, escapar, etiquetaRol, aplicarTemaGuardado,
} from '/js/api.js';

const $ = (id) => document.getElementById(id);

const PANTALLAS = [
  // Registrar una consulta es para quien atiende. Información útil la ve
  // cualquiera que entre, incluso quien solo tiene ese permiso.
  { ruta: '/rapido', texto: 'Atención rápida', rol: 'operador', catalogos: true, modulo: () => import('/js/vistas/rapido.js') },
  { ruta: '/informacion', texto: 'Información útil', modulo: () => import('/js/vistas/informacion.js') },
  // El historial, las estadísticas y la administración son solo para
  // administradores. Los operadores registran y consultan información útil.
  { catalogos: true, ruta: '/consultas', texto: 'Consultas', rol: 'admin', modulo: () => import('/js/vistas/consultas.js') },
  { catalogos: true, ruta: '/estadisticas', texto: 'Estadisticas', rol: 'admin', modulo: () => import('/js/vistas/panel.js') },
  { catalogos: true, ruta: '/administracion', texto: 'Administracion', rol: 'admin', modulo: () => import('/js/vistas/admin.js') },
];

// Las direcciones viejas siguen funcionando: alguien puede tenerlas guardadas.
const VIEJAS = {
  '/rapido.html': '/rapido',
  '/informacion.html': '/informacion',
  '/consultas.html': '/consultas',
  '/panel.html': '/estadisticas',
  '/admin.html': '/administracion',
};

const NIVEL = { info: 0, operador: 1, supervisor: 2, admin: 3 };
const puede = (u, rol) => NIVEL[u.rol] >= NIVEL[rol];

let usuario = null;
let config = { org: 'Cooperativa', org_corto: '' };
let vistaActual = null;      // el módulo montado, para poder limpiarlo
let cargando = false;
let pendiente = null;        // si tocan otra pestaña mientras carga, se encola

aplicarTemaGuardado();
arrancar().catch((e) => console.error(e));

// ------------------------------------------------------------- arranque ---

async function arrancar() {
  config = await getGuardado('/api/config').catch(() => config);
  $('titulo').textContent = config.org;
  document.title = config.org_corto || config.org;

  usuario = await getGuardado('/api/yo').catch(() => null);
  if (!usuario) return mostrarIngreso();

  entrar(false);
}

/**
 * El código de cada pantalla se descarga la primera vez que se entra. Para que
 * esa primera vez tampoco se note, se van trayendo en segundo plano apenas el
 * navegador queda libre, empezando por las más chicas.
 */
function adelantarPantallas() {
  const pendientes = PANTALLAS.filter((p) => !p.rol || puede(usuario, p.rol));
  const traer = () => {
    const p = pendientes.shift();
    if (!p) return;
    p.modulo().catch(() => {}).finally(() => setTimeout(traer, 150));
  };
  if (window.requestIdleCallback) requestIdleCallback(traer, { timeout: 3000 });
  else setTimeout(traer, 1200);
}

function mostrarIngreso() {
  $('acceso').classList.remove('oculto');
  $('usuario').focus();
}

// Un clic en el fondo de la pantalla de ingreso suelta una pelota. Otro clic,
// otra pelota. El archivo recién se descarga con el primero.
$('acceso').addEventListener('pointerdown', (e) => {
  if (e.target.closest('#forma')) return;
  import('/js/pelotas.js').then((m) => m.soltar(e.clientX, e.clientY)).catch(() => {});
});

/** Deja lista la aplicación y muestra la pantalla que corresponda. */
async function entrar(reciénIngresado) {
  $('acceso').classList.add('oculto');
  import('/js/pelotas.js').then((m) => m.limpiar()).catch(() => {});
  pintarBarra();
  document.body.classList.add('adentro');
  await ir(destino(), { reemplazar: true, sinTransicion: !reciénIngresado });
  adelantarPantallas();
}

function destino() {
  const pedida = new URLSearchParams(location.search).get('volver');
  const cruda = pedida && pedida.startsWith('/') ? pedida : location.pathname;
  const ruta = VIEJAS[cruda] || cruda;
  const existe = PANTALLAS.some((p) => p.ruta === ruta && (!p.rol || puede(usuario, p.rol)));
  return existe ? ruta : primeraPermitida().ruta;
}

// ---------------------------------------------------------------- barra ---

function pintarBarra() {
  const barra = $('barra');
  barra.innerHTML = `
    <div class="marca" title="${escapar(config.org)}">
      <img src="/img/logo.png" alt="" class="logo" onerror="this.remove()">
      <span class="nombre">${escapar(config.org_corto || config.org)}</span>
      <small>consultas y encuestas</small>
    </div>
    <nav class="nav" id="nav"></nav>
    <div class="derecha">
      <span class="usuario"><b>${escapar(usuario.nombre)}</b> · ${etiquetaRol(usuario.rol)}</span>
      <button id="btn-clave" class="chico">Mi clave</button>
      <button id="btn-tema" class="chico" title="Cambiar tema claro / oscuro">Tema</button>
      <button id="btn-salir" class="chico">Salir</button>
    </div>`;
  barra.classList.remove('oculto');

  $('nav').innerHTML = PANTALLAS
    .filter((p) => !p.rol || puede(usuario, p.rol))
    .map((p) => `<a href="${p.ruta}" data-ruta="${p.ruta}">${p.texto}</a>`).join('');

  $('btn-salir').onclick = async () => {
    await post('/api/logout', {}).catch(() => {});
    try { sessionStorage.clear(); } catch { /* nada que hacer */ }
    location.href = '/';
  };
  $('btn-clave').onclick = () => $('clave-dialogo').showModal();
  $('btn-tema').onclick = () => {
    const oscuro = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = oscuro ? 'light' : 'dark';
    localStorage.setItem('tema', oscuro ? 'light' : 'dark');
    dispatchEvent(new Event('tema-cambiado'));
  };
}

const marcarActiva = (ruta) => {
  document.querySelectorAll('#nav a').forEach((a) => {
    if (a.dataset.ruta === ruta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
};

// ------------------------------------------------------------ enrutador ---

/** Un clic en la navegación cambia la pantalla sin recargar la página. */
addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ruta]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  if (a.dataset.ruta !== location.pathname) ir(a.dataset.ruta);
});

addEventListener('popstate', () => { if (usuario) ir(location.pathname, { reemplazar: true }); });

// Cambiar un filtro no cambia de pantalla: se rearma la misma, sin fundido,
// para que se sienta como que solo cambiaron los números.
addEventListener('filtros-cambiados', () => {
  if (usuario) ir(location.pathname, { reemplazar: true, sinTransicion: true });
});

/** La primera pantalla que este usuario tiene permitida. */
const primeraPermitida = () => PANTALLAS.find((p) => !p.rol || puede(usuario, p.rol));

async function ir(ruta, opciones = {}) {
  // Si la pantalla no existe, o no es para este usuario, se va a la primera
  // que sí lo sea. Escribir la dirección a mano no alcanza para entrar.
  const pedida = PANTALLAS.find((p) => p.ruta === ruta);
  const pantalla = pedida && (!pedida.rol || puede(usuario, pedida.rol))
    ? pedida : primeraPermitida();
  // Si ya se está armando otra pantalla, se anota esta y se atiende al
  // terminar: un clic apurado no se pierde, y gana el último.
  if (cargando) { pendiente = [ruta, opciones]; return; }
  const { reemplazar = false, sinTransicion = false } = opciones;
  cargando = true;

  try {
    const modulo = await pantalla.modulo();
    // Los filtros viajan en la dirección. Si es la misma pantalla se
    // conservan (así una dirección guardada abre el mismo recorte, y la
    // flecha atrás vuelve al filtro anterior); si se cambia de pantalla se
    // descartan, porque los filtros de una no valen para la otra.
    const filtros = pantalla.ruta === location.pathname ? location.search : '';
    if (reemplazar) history.replaceState({}, '', pantalla.ruta + filtros);
    else history.pushState({}, '', pantalla.ruta + filtros);

    const cambiar = () => {
      if (vistaActual && vistaActual.limpiar) vistaActual.limpiar();
      $('vista').innerHTML = modulo.html;
      vistaActual = modulo;
      marcarActiva(pantalla.ruta);
      document.title = `${modulo.TITULO} — ${config.org_corto || config.org}`;
      scrollTo(0, 0);
    };

    // El fundido entre pantallas: donde no esté, cambia y listo.
    if (!sinTransicion && document.startViewTransition) {
      await document.startViewTransition(cambiar).updateCallbackDone;
    } else {
      cambiar();
    }

    // Los catálogos (sectores, motivos, operadores) solo los necesitan las
    // pantallas que los usan. Información útil no, y pedirlos ahí sería un
    // viaje de más — y un error para quien no tiene permiso de leerlos.
    await modulo.iniciar({ usuario, config, catalogos: pantalla.catalogos ? await catalogos() : null });
  } catch (e) {
    if (String(e.message).includes('sesion')) return location.reload();
    console.error(e);
  } finally {
    cargando = false;
    if (pendiente) { const [r, o] = pendiente; pendiente = null; ir(r, o); }
  }
}

/** Los catálogos se piden una vez y quedan para todas las pantallas. */
let promesaCatalogos = null;
function catalogos() {
  promesaCatalogos ||= getGuardado('/api/catalogos');
  return promesaCatalogos;
}
addEventListener('catalogos-cambiados', () => { promesaCatalogos = null; });

// ------------------------------------------------------------- mi clave ---
// Cada uno cambia la suya desde acá. Antes vivía en Administración, que ahora
// solo ven los administradores.

$('forma-clave').addEventListener('submit', async (e) => {
  e.preventDefault();
  const aviso = $('clave-aviso');
  try {
    await post('/api/mi-clave', { actual: $('k-actual').value, nueva: $('k-nueva').value });
    aviso.className = 'aviso ok';
    aviso.textContent = 'Listo, tu clave quedó cambiada.';
    $('forma-clave').reset();
  } catch (err) {
    aviso.className = 'aviso error';
    aviso.textContent = err.message;
  }
});
$('clave-cerrar').onclick = () => $('clave-dialogo').close();

// ---------------------------------------------------------------- ingreso ---

const quietito = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nombreDePila = (completo) => {
  const parte = completo.includes(',') ? completo.split(',')[1] : completo;
  return parte.trim().split(/\s+/)[0] || completo;
};

const forma = $('forma');

forma.addEventListener('input', () => forma.classList.remove('mal'));

forma.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = forma.querySelector('button');
  boton.disabled = true;
  try {
    usuario = await post('/api/login', {
      usuario: $('usuario').value,
      clave: $('clave').value,
    });
    try { sessionStorage.clear(); } catch { /* nada que hacer */ }

    $('nombre-bienvenida').textContent = nombreDePila(usuario.nombre);
    await (quietito ? desvanecer(forma) : hacerPolvo(forma));
    $('acceso').classList.add('oculto');
    const saludo = $('bienvenida');
    saludo.classList.remove('oculto');

    await entrar(true);                       // se arma la aplicación por detrás
    await new Promise((r) => setTimeout(r, 3400));
    saludo.classList.add('saliendo');
    await new Promise((r) => setTimeout(r, 420));
    saludo.classList.add('oculto');
    saludo.classList.remove('saliendo');
  } catch (err) {
    forma.classList.remove('mal');
    void forma.offsetWidth;                   // reinicia la animación si vuelve a fallar
    forma.classList.add('mal');
    $('aviso-acceso').textContent = err.message;
    $('clave').select();
    boton.disabled = false;
  }
});

function desvanecer(tarjeta) {
  tarjeta.style.transition = 'opacity .5s ease';
  tarjeta.style.opacity = '0';
  return new Promise((listo) => setTimeout(listo, 520));
}

/**
 * Deshace la tarjeta en partículas y se las lleva el viento hacia la derecha.
 * Las partículas se siembran sobre las cajas reales de cada elemento, así el
 * polvo tiene la forma de lo que había en pantalla.
 */
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
        // el viento entra por la izquierda: esa franja se deshace primero
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
