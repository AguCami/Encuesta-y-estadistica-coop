/*
 * Huevo de pascua: escribí "pacman" en cualquier pantalla.
 *
 * La página se viene abajo —cada pedazo cae de verdad, con gravedad, rebote,
 * rozamiento y giro— y aparece el juego con la tabla de los diez mejores.
 * Al salir, la página se recarga y todo vuelve a su lugar.
 *
 * Este archivo no se descarga hasta que alguien escribe la palabra: el
 * detector vive en api.js y son tres renglones.
 */

const AMARILLO = '#f5d84a';
const AZUL = '#2a4bd8';
const PARED = '#2a4bd8';

// ---------------------------------------------------------------- física ---

const GRAVEDAD = 2600;      // px/s²
const REBOTE = 0.34;
const ROZAMIENTO = 0.86;
const QUIETO = 26;          // por debajo de esto la pieza se duerme

/** Los bloques que van a caer: los de más adentro, para que no caiga todo junto. */
function piezasDeLaPagina() {
  const candidatos = [...document.querySelectorAll(
    '.barra, .kpi, .tarjeta, .ficha, .chip, button, input, select, textarea,'
    + ' h1, h2, h3, tr, li, .precio, .lugar, .nota, .viz, img')];
  // Si un candidato contiene a otro, cae el de adentro: así se desarma en
  // pedazos parejos en vez de en dos bloques enormes.
  const hojas = candidatos.filter((el) => !candidatos.some((otro) => otro !== el && el.contains(otro)));
  return hojas.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 6 && r.height > 6 && r.bottom > 0 && r.top < innerHeight
      && r.right > 0 && r.left < innerWidth;
  });
}

function derrumbar() {
  const piezas = piezasDeLaPagina();
  const cajas = piezas.map((el) => el.getBoundingClientRect());

  // La marca va en el <body>: hay un observador del tema que vigila los
  // cambios de clase del documento y repintaría la pantalla justo ahora.
  document.body.classList.add('derrumbe');
  document.documentElement.style.overflow = 'hidden';
  const cx = innerWidth / 2, cy = innerHeight * 0.45;

  const cuerpos = piezas.map((el, i) => {
    const r = cajas[i];
    el.classList.add('escombro');
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;

    // Empujón inicial desde el centro, como si algo hubiese explotado ahí.
    const dx = (r.left + r.width / 2) - cx;
    const dy = (r.top + r.height / 2) - cy;
    const dist = Math.max(60, Math.hypot(dx, dy));
    const fuerza = 26000 / dist;
    return {
      el, x: r.left, y: r.top, w: r.width, h: r.height,
      vx: (dx / dist) * fuerza + (Math.random() - 0.5) * 90,
      vy: (dy / dist) * fuerza - 260 - Math.random() * 220,
      ang: 0,
      va: (Math.random() - 0.5) * 5,
      dormido: false,
    };
  });

  let previo = performance.now();
  let vivo = true;

  const paso = (ahora) => {
    if (!vivo) return;
    const dt = Math.min(0.032, (ahora - previo) / 1000);
    previo = ahora;
    const suelo = innerHeight;

    for (const c of cuerpos) {
      if (c.dormido) continue;
      c.vy += GRAVEDAD * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ang += c.va * dt;

      // Las cuatro esquinas giradas: con ellas la pieza se apoya, se tumba y
      // termina quedándose quieta en un ángulo cualquiera, como en la realidad.
      const s = Math.sin(c.ang), co = Math.cos(c.ang);
      const mx = c.x + c.w / 2, my = c.y + c.h / 2;
      const esquinas = [[-c.w / 2, -c.h / 2], [c.w / 2, -c.h / 2], [c.w / 2, c.h / 2], [-c.w / 2, c.h / 2]]
        .map(([ex, ey]) => [mx + ex * co - ey * s, my + ex * s + ey * co]);

      for (const [ex, ey] of esquinas) {
        if (ey > suelo) {
          const hundido = ey - suelo;
          c.y -= hundido;
          if (c.vy > 0) {
            c.vy = -c.vy * REBOTE;
            c.vx *= ROZAMIENTO;
            // el golpe fuera del centro hace girar la pieza
            c.va += ((ex - mx) / Math.max(20, c.w)) * c.vy * 0.004;
            c.va *= 0.92;
          }
        }
        if (ex < 0 && c.vx < 0) { c.x -= ex; c.vx = -c.vx * REBOTE; c.va *= 0.9; }
        if (ex > innerWidth && c.vx > 0) { c.x -= ex - innerWidth; c.vx = -c.vx * REBOTE; c.va *= 0.9; }
      }

      if (Math.abs(c.vy) < QUIETO && Math.abs(c.vx) < QUIETO && Math.abs(c.va) < 0.25
          && esquinas.some(([, ey]) => ey > suelo - 2)) {
        c.dormido = true;
      }
      c.el.style.transform = `translate(${c.x - parseFloat(c.el.style.left)}px,`
        + `${c.y - parseFloat(c.el.style.top)}px) rotate(${c.ang}rad)`;
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);

  return () => { vivo = false; };
}

// ------------------------------------------------------------------ mapa ---
// # pared · . bolita · o bolita grande · espacio vacío · P pacman · G fantasma

const MAPA = [
  '####################',
  '#.........##.......#',
  '#o##.####.##.####.o#',
  '#.##.####.##.####..#',
  '#..................#',
  '#.##.#.######.#.##.#',
  '#....#...##...#....#',
  '####.###.##.###.####',
  '   #.#...GG...#.#   ',
  '####.#.##--##.#.####',
  '....... #GG G#......',
  '####.#.##P####.#.###',
  '   #.#........#.#   ',
  '####.#.######.#.####',
  '#........##........#',
  '#.##.###.##.###.##.#',
  '#o.#...........#..o#',
  '##.#.#.######.#.#.##',
  '#....#...##...#....#',
  '#.########..########',
  '####################',
];

const FILAS = MAPA.length;
const COLS = MAPA[0].length;

// -------------------------------------------------------------- el juego ---

function crearJuego(lienzo, alPuntuar, alPerder) {
  const ctx = lienzo.getContext('2d');
  let lado = 0;

  const grilla = MAPA.map((f) => f.split(''));
  const comida = grilla.map((f) => f.map((c) => (c === '.' ? 1 : c === 'o' ? 2 : 0)));
  let quedan = comida.flat().filter(Boolean).length;

  const esPared = (c, f) => {
    if (f < 0 || f >= FILAS) return true;
    const fila = grilla[f];
    const col = ((c % COLS) + COLS) % COLS;
    return fila[col] === '#' || fila[col] === '-';
  };

  const inicioPac = { c: 9, f: 16 };
  const iniciosFantasma = [{ c: 9, f: 8 }, { c: 10, f: 8 }, { c: 9, f: 10 }, { c: 10, f: 10 }];
  const COLORES = ['#e34948', '#e87ba4', '#43c6dc', '#eda100'];

  let pac, fantasmas, puntos, vidas, nivel, asustados, terminado, pausa, reloj;

  function reiniciarPosiciones() {
    pac = { ...inicioPac, dx: -1, dy: 0, sig: [-1, 0], avance: 0, boca: 0 };
    fantasmas = iniciosFantasma.map((p, i) => ({
      ...p, dx: 0, dy: -1, avance: 0, color: COLORES[i], salida: 90 + i * 75,
    }));
    asustados = 0;
    pausa = 75;
    reloj = 0;
  }

  function nuevaPartida() {
    puntos = 0; vidas = 3; nivel = 1; terminado = false;
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) comida[f][c] = grilla[f][c] === '.' ? 1 : grilla[f][c] === 'o' ? 2 : 0;
    }
    quedan = comida.flat().filter(Boolean).length;
    reiniciarPosiciones();
  }

  const VEL_PAC = 0.13;
  const VEL_FAN = 0.105;

  function mover(ente, velocidad) {
    ente.avance += velocidad;
    if (ente.avance < 1) return false;
    ente.avance = 0;
    const c = ente.c + ente.dx, f = ente.f + ente.dy;
    if (esPared(c, f)) return false;
    ente.c = ((c % COLS) + COLS) % COLS;
    ente.f = f;
    return true;
  }

  function pasoPac() {
    // Si el giro pedido es posible, se toma; si no, sigue derecho.
    const [sx, sy] = pac.sig;
    if (!esPared(pac.c + sx, pac.f + sy)) { pac.dx = sx; pac.dy = sy; }
    if (mover(pac, VEL_PAC)) {
      pac.boca = (pac.boca + 1) % 8;
      const bocado = comida[pac.f][pac.c];
      if (bocado) {
        comida[pac.f][pac.c] = 0;
        quedan--;
        puntos += bocado === 2 ? 50 : 10;
        if (bocado === 2) asustados = 420;
        if (!quedan) { nivel++; reiniciarPosiciones();
          for (let f = 0; f < FILAS; f++) {
            for (let c = 0; c < COLS; c++) comida[f][c] = grilla[f][c] === '.' ? 1 : grilla[f][c] === 'o' ? 2 : 0;
          }
          quedan = comida.flat().filter(Boolean).length;
        }
      }
    }
  }

  /** Persecución simple: en cada cruce elige la salida que más lo acerca. */
  function pasoFantasma(g, i) {
    if (g.salida > 0) { g.salida--; return; }
    g.avance += VEL_FAN * (asustados ? 0.72 : 1);
    if (g.avance < 1) return;
    g.avance = 0;

    const opciones = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .filter(([dx, dy]) => !esPared(g.c + dx, g.f + dy))
      .filter(([dx, dy]) => !(dx === -g.dx && dy === -g.dy) || false);
    const posibles = opciones.length ? opciones : [[-g.dx, -g.dy]];

    // Al principio se dispersan a las esquinas, como en el original: da tiempo
    // a acomodarse antes de que empiece la persecución en serio.
    const disperso = reloj < 420;
    const esquinas = [[1, 1], [COLS - 2, 1], [1, FILAS - 2], [COLS - 2, FILAS - 2]];
    // Cada fantasma apunta un poco distinto, para que no vayan todos en fila.
    const metaC = asustados ? COLS - pac.c : disperso ? esquinas[i][0] : pac.c + (i === 1 ? pac.dx * 4 : 0);
    const metaF = asustados ? FILAS - pac.f : disperso ? esquinas[i][1] : pac.f + (i === 2 ? pac.dy * 4 : 0);

    let mejor = posibles[0], mejorD = Infinity;
    for (const [dx, dy] of posibles) {
      const d = Math.hypot(g.c + dx - metaC, g.f + dy - metaF) + Math.random() * 0.6;
      if (d < mejorD) { mejorD = d; mejor = [dx, dy]; }
    }
    [g.dx, g.dy] = mejor;
    g.c = ((g.c + g.dx) % COLS + COLS) % COLS;
    g.f += g.dy;
  }

  function chocar() {
    if (pausa > 0 || terminado) return;
    for (const g of fantasmas) {
      if (g.c !== pac.c || g.f !== pac.f) continue;
      if (asustados) {
        puntos += 200;
        Object.assign(g, iniciosFantasma[fantasmas.indexOf(g)], { salida: 60 });
      } else {
        vidas--;
        if (vidas <= 0) { terminado = true; alPerder(puntos, nivel); }
        else reiniciarPosiciones();
      }
      return;
    }
  }

  function dibujar() {
    const w = lienzo.width, h = lienzo.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, w, h);

    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * lado, y = f * lado;
        if (grilla[f][c] === '#') {
          ctx.fillStyle = PARED;
          ctx.fillRect(x + lado * 0.12, y + lado * 0.12, lado * 0.76, lado * 0.76);
        } else if (grilla[f][c] === '-') {
          ctx.fillStyle = '#d55181';
          ctx.fillRect(x, y + lado * 0.42, lado, lado * 0.16);
        }
        if (comida[f][c] === 1) {
          ctx.fillStyle = '#f2e6c8';
          ctx.beginPath(); ctx.arc(x + lado / 2, y + lado / 2, lado * 0.09, 0, 7); ctx.fill();
        } else if (comida[f][c] === 2) {
          ctx.fillStyle = AMARILLO;
          ctx.beginPath(); ctx.arc(x + lado / 2, y + lado / 2, lado * 0.26, 0, 7); ctx.fill();
        }
      }
    }

    // pacman
    const px = pac.c * lado + lado / 2, py = pac.f * lado + lado / 2;
    const abertura = (Math.sin(pac.boca / 8 * Math.PI * 2) * 0.5 + 0.5) * 0.9;
    const giro = Math.atan2(pac.dy, pac.dx);
    ctx.fillStyle = AMARILLO;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, lado * 0.44, giro + abertura / 2, giro - abertura / 2 + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    for (const g of fantasmas) {
      const gx = g.c * lado + lado / 2, gy = g.f * lado + lado / 2;
      ctx.fillStyle = asustados ? (asustados < 90 && Math.floor(asustados / 10) % 2 ? '#fff' : AZUL) : g.color;
      ctx.beginPath();
      ctx.arc(gx, gy, lado * 0.42, Math.PI, 0);
      ctx.lineTo(gx + lado * 0.42, gy + lado * 0.36);
      for (let k = 0; k < 3; k++) {
        ctx.lineTo(gx + lado * 0.42 - lado * 0.28 * k - lado * 0.14, gy + lado * (k % 2 ? 0.36 : 0.2));
      }
      ctx.lineTo(gx - lado * 0.42, gy + lado * 0.36);
      ctx.closePath();
      ctx.fill();
      if (!asustados) {
        ctx.fillStyle = '#fff';
        for (const lx of [-0.15, 0.15]) {
          ctx.beginPath(); ctx.ellipse(gx + lado * lx, gy - lado * 0.06, lado * 0.11, lado * 0.14, 0, 0, 7); ctx.fill();
        }
      }
    }
  }

  function cuadro() {
    if (terminado) return;
    if (pausa > 0) { pausa--; dibujar(); return; }
    reloj++;
    if (asustados) asustados--;
    pasoPac();
    chocar();
    fantasmas.forEach(pasoFantasma);
    chocar();
    dibujar();
    alPuntuar(puntos, vidas, nivel);
  }

  return {
    nuevaPartida,
    cuadro,
    girar(dx, dy) { pac.sig = [dx, dy]; },
    get terminado() { return terminado; },
    redimensionar(ancho) {
      lado = Math.floor(ancho / COLS);
      lienzo.width = lado * COLS;
      lienzo.height = lado * FILAS;
      lienzo.style.width = `${lienzo.width}px`;
      lienzo.style.height = `${lienzo.height}px`;
    },
  };
}

// ------------------------------------------------------------- la pantalla ---

/**
 * `puntajes` es el par de funciones que hablan con el servidor. La demostración
 * pasa las suyas, que guardan en el navegador.
 */
export default async function arrancar(puntajes) {
  const detener = derrumbar();

  const caja = document.createElement('div');
  caja.className = 'pacman';
  caja.innerHTML = `
    <div class="pacman-panel">
      <div class="pacman-cabecera">
        <b>PAC-MAN</b>
        <span class="marcador">Puntos <b id="pm-puntos">0</b></span>
        <span class="marcador">Vidas <b id="pm-vidas">3</b></span>
        <span class="marcador">Nivel <b id="pm-nivel">1</b></span>
        <span style="flex:1"></span>
        <button class="chico" id="pm-salir">Salir (Esc)</button>
      </div>
      <div class="pacman-cuerpo">
        <div class="pacman-tablero">
          <canvas id="pm-lienzo"></canvas>
          <div class="pacman-cartel" id="pm-cartel">
            <p><b>¿Listo?</b></p>
            <p>Flechas o W A S D para moverte.</p>
            <button class="primario" id="pm-jugar">Jugar</button>
          </div>
        </div>
        <aside class="pacman-tabla">
          <h3>Los diez mejores</h3>
          <ol id="pm-top"><li class="solo-lectura">Cargando…</li></ol>
        </aside>
      </div>
    </div>`;
  document.body.appendChild(caja);

  const $$ = (id) => document.getElementById(id);
  const lienzo = $$('pm-lienzo');

  async function pintarTop() {
    try {
      const filas = await puntajes.leer();
      $$('pm-top').innerHTML = filas.length
        ? filas.map((p) => `<li><span>${p.nombre}</span><b>${p.puntos}</b></li>`).join('')
        : '<li class="solo-lectura">Todavía no jugó nadie. Estrenalo.</li>';
    } catch {
      $$('pm-top').innerHTML = '<li class="solo-lectura">No se pudo leer la tabla.</li>';
    }
  }

  const juego = crearJuego(lienzo,
    (p, v, n) => {
      $$('pm-puntos').textContent = p;
      $$('pm-vidas').textContent = v;
      $$('pm-nivel').textContent = n;
    },
    async (p, n) => {
      $$('pm-cartel').innerHTML = `<p><b>Se acabó</b></p><p>Hiciste ${p} puntos.</p>
        <button class="primario" id="pm-jugar">Otra vez</button>`;
      $$('pm-cartel').classList.remove('oculto');
      $$('pm-jugar').onclick = comenzar;
      try { await puntajes.guardar(p, n); } catch { /* el juego es lo de menos */ }
      pintarTop();
    });

  const medir = () => juego.redimensionar(Math.min(560, innerWidth - 40, (innerHeight - 200) * COLS / FILAS));
  medir();
  addEventListener('resize', medir);

  let lazo = 0;
  function comenzar() {
    $$('pm-cartel').classList.add('oculto');
    juego.nuevaPartida();
    clearInterval(lazo);
    lazo = setInterval(() => juego.cuadro(), 1000 / 60);
  }
  $$('pm-jugar').onclick = comenzar;

  const TECLAS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  const alTeclado = (e) => {
    if (e.key === 'Escape') return salir();
    const t = TECLAS[e.key] || TECLAS[e.key.toLowerCase?.()];
    if (t) { e.preventDefault(); juego.girar(t[0], t[1]); }
  };
  addEventListener('keydown', alTeclado);

  function salir() {
    clearInterval(lazo);
    removeEventListener('keydown', alTeclado);
    removeEventListener('resize', medir);
    detener();
    // La página quedó hecha pedazos: la forma honesta de dejarla como estaba.
    location.reload();
  }
  $$('pm-salir').onclick = salir;

  pintarTop();
}
