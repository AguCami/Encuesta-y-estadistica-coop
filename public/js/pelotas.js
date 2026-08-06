/*
 * Segundo huevo de pascua, para el que espera en la pantalla de ingreso:
 * cada clic fuera de la tarjeta suelta una pelota que rebota contra los
 * bordes y contra las otras. No hacen nada, y ese es el punto.
 *
 * Se van solas al entrar. El archivo recién se descarga con el primer clic.
 */

const CAIDA = 1500;      // px/s²
const PIQUE = 0.86;
const TOPE = 400;           // por las dudas: más que esto ya no se ve nada

const pelotas = [];
let lienzo = null;
let ctx = null;
let corriendo = false;

function preparar() {
  if (lienzo) return;
  lienzo = document.createElement('canvas');
  lienzo.id = 'pelotas';
  document.body.appendChild(lienzo);
  ctx = lienzo.getContext('2d');
  medir();
  addEventListener('resize', medir);
}

function medir() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  lienzo.width = innerWidth * dpr;
  lienzo.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const COLORES = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'];

/** Suelta una pelota en ese punto, con un envión para cualquier lado. */
export function soltar(x, y) {
  preparar();
  if (pelotas.length >= TOPE) return;
  const estilo = getComputedStyle(document.documentElement);
  pelotas.push({
    x, y,
    vx: (Math.random() - 0.5) * 700,
    vy: -220 - Math.random() * 320,
    r: 9 + Math.random() * 16,
    color: estilo.getPropertyValue(COLORES[pelotas.length % COLORES.length]).trim(),
  });
  if (!corriendo) { corriendo = true; previo = performance.now(); requestAnimationFrame(paso); }
}

/** Al entrar, las pelotas se van. */
export function limpiar() {
  pelotas.length = 0;
  corriendo = false;
  if (lienzo) { lienzo.remove(); lienzo = null; ctx = null; removeEventListener('resize', medir); }
}

let previo = 0;

function paso(ahora) {
  if (!corriendo || !ctx) return;
  const dt = Math.min(0.032, (ahora - previo) / 1000);
  previo = ahora;

  for (const p of pelotas) {
    p.vy += CAIDA * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x - p.r < 0) { p.x = p.r; p.vx = -p.vx * PIQUE; }
    if (p.x + p.r > innerWidth) { p.x = innerWidth - p.r; p.vx = -p.vx * PIQUE; }
    if (p.y + p.r > innerHeight) {
      p.y = innerHeight - p.r;
      p.vy = -p.vy * PIQUE;
      p.vx *= 0.99;
      // Si se está quedando quieta se le da un empujón: la gracia es que no pare.
      if (Math.abs(p.vy) < 120) p.vy = -320 - Math.random() * 260;
    }
    if (p.y - p.r < 0) { p.y = p.r; p.vy = -p.vy * PIQUE; }
  }

  // Choques entre pelotas: se separan y se reparten la velocidad.
  for (let i = 0; i < pelotas.length; i++) {
    for (let j = i + 1; j < pelotas.length; j++) {
      const a = pelotas[i], b = pelotas[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (!d || d >= min) continue;
      const nx = dx / d, ny = dy / d;
      const solape = (min - d) / 2;
      a.x -= nx * solape; a.y -= ny * solape;
      b.x += nx * solape; b.y += ny * solape;
      const va = a.vx * nx + a.vy * ny;
      const vb = b.vx * nx + b.vy * ny;
      const cambio = (vb - va) * PIQUE;
      a.vx += nx * cambio; a.vy += ny * cambio;
      b.vx -= nx * cambio; b.vy -= ny * cambio;
    }
  }

  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of pelotas) {
    // Un brillito arriba a la izquierda: alcanza para que parezca una pelota.
    const brillo = ctx.createRadialGradient(
      p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
    brillo.addColorStop(0, '#fff');
    brillo.addColorStop(0.35, p.color);
    brillo.addColorStop(1, p.color);
    ctx.fillStyle = brillo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(paso);
}
