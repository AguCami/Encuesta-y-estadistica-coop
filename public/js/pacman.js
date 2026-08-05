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
//
// '#' pared · '.' bolita · 'o' bolita grande · ',' pasillo sin bolita (túnel)
// '-' puerta de la casa: solo la cruzan los fantasmas, para salir
// 'G' arranque de fantasma · 'P' arranque de Pac-Man · ' ' relleno macizo
//
// El laberinto está verificado: no hay bolitas encerradas, ningún pasillo
// termina cortado y los fantasmas pueden salir de la casa y llegar hasta
// Pac-Man.

const MAPA = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '######.##..........##.######',
  '######.##.###--###.##.######',
  '######.##.#GGGGGG#.##.######',
  ',,,,,,....#GGGGGG#....,,,,,,',
  '######.##.########.##.######',
  '######.##..........##.######',
  '######.##.########.##.######',
  '######.##.########.##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......P........##..o#',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

const FILAS = MAPA.length;
const COLS = MAPA[0].length;
const FILA_PUERTA = 12;   // por encima de esta fila, el fantasma ya salió

// -------------------------------------------------------------- el juego ---

function crearJuego(lienzo, alPuntuar, alPerder) {
  const ctx = lienzo.getContext('2d');
  let lado = 0;

  const grilla = MAPA.map((f) => f.split(''));
  const comida = grilla.map((f) => f.map(() => 0));

  const casilla = (c, f) => grilla[f][((c % COLS) + COLS) % COLS];

  /** La puerta de la casa solo la cruzan los fantasmas que todavía no salieron. */
  function pared(c, f, puedeCruzarPuerta = false) {
    if (f < 0 || f >= FILAS) return true;
    const x = casilla(c, f);
    if (x === '#' || x === ' ') return true;
    if (x === '-') return !puedeCruzarPuerta;
    return false;
  }

  let inicioPac = { c: 13, f: 22 };
  const iniciosFantasma = [];
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLS; c++) {
      if (grilla[f][c] === 'P') inicioPac = { c, f };
      if (grilla[f][c] === 'G' && iniciosFantasma.length < 4) {
        // los cuatro repartidos en la casa, no todos encima
        if ((c + f) % 2 === 0) iniciosFantasma.push({ c, f });
      }
    }
  }
  const COLORES = ['#e34948', '#e87ba4', '#43c6dc', '#eda100'];

  let pac, fantasmas, puntos, vidas, nivel, asustados, terminado, pausa, reloj;

  function sembrarComida() {
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        comida[f][c] = grilla[f][c] === '.' ? 1 : grilla[f][c] === 'o' ? 2 : 0;
      }
    }
  }
  const quedanBolitas = () => comida.some((f) => f.some(Boolean));

  function reiniciarPosiciones() {
    pac = { x: inicioPac.c, y: inicioPac.f, dx: -1, dy: 0, sig: [-1, 0], boca: 0 };
    fantasmas = iniciosFantasma.map((p, i) => ({
      x: p.c, y: p.f, dx: 0, dy: -1, color: COLORES[i],
      espera: 70 + i * 70, afuera: false,
    }));
    asustados = 0;
    pausa = 80;
    reloj = 0;
  }

  function nuevaPartida() {
    puntos = 0; vidas = 3; nivel = 1; terminado = false;
    sembrarComida();
    reiniciarPosiciones();
  }

  const VEL_PAC = 0.115;
  const VEL_FANTASMA = 0.098;

  /**
   * Movimiento continuo: el personaje avanza una fracción de casillero por
   * cuadro y solo puede doblar cuando está justo sobre el centro de uno. Eso
   * es lo que hace que se deslice en vez de saltar de casillero en casillero.
   */
  function avanzar(e, vel, puedeCruzarPuerta) {
    const cx = Math.round(e.x), cy = Math.round(e.y);
    const enElCentro = Math.abs(e.x - cx) < vel && Math.abs(e.y - cy) < vel;

    if (enElCentro) {
      e.x = cx; e.y = cy;
      if (e.sig && !pared(cx + e.sig[0], cy + e.sig[1], puedeCruzarPuerta)) {
        e.dx = e.sig[0]; e.dy = e.sig[1];
      }
      if (pared(cx + e.dx, cy + e.dy, puedeCruzarPuerta)) return true;  // contra la pared
    }

    e.x += e.dx * vel;
    e.y += e.dy * vel;
    if (e.x < -0.5) e.x += COLS;            // túnel de un lado al otro
    if (e.x > COLS - 0.5) e.x -= COLS;
    return enElCentro;
  }

  function pasoPac() {
    const antesC = Math.round(pac.x), antesF = Math.round(pac.y);
    avanzar(pac, VEL_PAC, false);
    pac.boca += 0.28;

    const c = ((Math.round(pac.x) % COLS) + COLS) % COLS, f = Math.round(pac.y);
    if (c === antesC && f === antesF && comida[f][c] === 0) return;
    const bocado = comida[f][c];
    if (!bocado) return;
    comida[f][c] = 0;
    puntos += bocado === 2 ? 50 : 10;
    if (bocado === 2) asustados = 460;
    if (!quedanBolitas()) { nivel++; sembrarComida(); reiniciarPosiciones(); }
  }

  const ESQUINAS = [[1, 1], [COLS - 2, 1], [1, FILAS - 2], [COLS - 2, FILAS - 2]];

  function pasoFantasma(g, i) {
    if (g.espera > 0) { g.espera--; return; }
    if (!g.afuera && g.y <= FILA_PUERTA - 1) g.afuera = true;

    const vel = VEL_FANTASMA * (asustados ? 0.68 : 1) * (g.afuera ? 1 : 0.8);
    const cx = Math.round(g.x), cy = Math.round(g.y);
    const enElCentro = Math.abs(g.x - cx) < vel && Math.abs(g.y - cy) < vel;

    if (enElCentro) {
      // Mientras está adentro apunta a la puerta; después, a lo suyo.
      const meta = !g.afuera ? [13, FILA_PUERTA - 1]
        : asustados ? [COLS - 1 - pac.x, FILAS - 1 - pac.y]
          : reloj < 460 ? ESQUINAS[i]
            : [pac.x + (i === 1 ? pac.dx * 4 : 0), pac.y + (i === 2 ? pac.dy * 4 : 0)];

      const opciones = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => !pared(cx + dx, cy + dy, !g.afuera));
      // No se dan media vuelta en mitad de un pasillo, salvo que no quede otra.
      const derechas = opciones.filter(([dx, dy]) => !(dx === -g.dx && dy === -g.dy));
      const posibles = derechas.length ? derechas : opciones;

      let mejor = [g.dx, g.dy], mejorD = Infinity;
      for (const [dx, dy] of posibles) {
        const d = Math.hypot(cx + dx - meta[0], cy + dy - meta[1]) + Math.random() * 0.4;
        if (d < mejorD) { mejorD = d; mejor = [dx, dy]; }
      }
      g.sig = mejor;
    }
    avanzar(g, vel, !g.afuera);
  }

  function chocar() {
    if (pausa > 0 || terminado) return;
    for (const g of fantasmas) {
      if (Math.hypot(g.x - pac.x, g.y - pac.y) > 0.7) continue;
      if (asustados) {
        puntos += 200;
        const i = fantasmas.indexOf(g);
        Object.assign(g, { x: iniciosFantasma[i].c, y: iniciosFantasma[i].f, espera: 80, afuera: false });
      } else {
        vidas--;
        if (vidas <= 0) { terminado = true; alPerder(puntos, nivel); }
        else reiniciarPosiciones();
      }
      return;
    }
  }

  function dibujar() {
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);

    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * lado, y = f * lado, t = grilla[f][c];
        if (t === '#') {
          // Los bloques van enteros: las paredes vecinas se unen y se lee
          // como un laberinto, no como un damero.
          ctx.fillStyle = PARED;
          ctx.fillRect(x, y, lado + 0.5, lado + 0.5);
        } else if (t === '-') {
          ctx.fillStyle = '#d55181';
          ctx.fillRect(x, y + lado * 0.4, lado + 0.5, lado * 0.2);
        }
        if (comida[f][c] === 1) {
          ctx.fillStyle = '#f2e6c8';
          ctx.beginPath(); ctx.arc(x + lado / 2, y + lado / 2, Math.max(1, lado * 0.09), 0, 7); ctx.fill();
        } else if (comida[f][c] === 2) {
          ctx.fillStyle = AMARILLO;
          ctx.beginPath();
          ctx.arc(x + lado / 2, y + lado / 2, lado * (0.22 + Math.sin(reloj / 9) * 0.05), 0, 7);
          ctx.fill();
        }
      }
    }

    const px = pac.x * lado + lado / 2, py = pac.y * lado + lado / 2;
    const abertura = (Math.sin(pac.boca) * 0.5 + 0.5) * 0.85;
    const giro = Math.atan2(pac.dy, pac.dx);
    ctx.fillStyle = AMARILLO;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, lado * 0.46, giro + abertura / 2, giro - abertura / 2 + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    for (const g of fantasmas) {
      const gx = g.x * lado + lado / 2, gy = g.y * lado + lado / 2;
      const parpadea = asustados && asustados < 110 && Math.floor(asustados / 12) % 2;
      ctx.fillStyle = asustados ? (parpadea ? '#fff' : AZUL) : g.color;
      ctx.beginPath();
      ctx.arc(gx, gy, lado * 0.44, Math.PI, 0);
      ctx.lineTo(gx + lado * 0.44, gy + lado * 0.4);
      for (let k = 0; k < 3; k++) {
        ctx.lineTo(gx + lado * 0.44 - lado * 0.293 * (k + 0.5), gy + lado * (k % 2 ? 0.4 : 0.24));
      }
      ctx.lineTo(gx - lado * 0.44, gy + lado * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = asustados ? (parpadea ? AZUL : '#fff') : '#fff';
      for (const lx of [-0.16, 0.16]) {
        ctx.beginPath();
        ctx.ellipse(gx + lado * lx, gy - lado * 0.07, lado * 0.115, lado * 0.145, 0, 0, 7);
        ctx.fill();
      }
      if (!asustados) {
        ctx.fillStyle = '#243';
        for (const lx of [-0.16, 0.16]) {
          ctx.beginPath();
          ctx.arc(gx + lado * (lx + g.dx * 0.05), gy - lado * (0.07 - g.dy * 0.05), lado * 0.06, 0, 7);
          ctx.fill();
        }
      }
    }
  }

  function cuadro() {
    if (terminado) return;
    reloj++;
    if (pausa > 0) { pausa--; dibujar(); return; }
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
      lado = Math.max(6, Math.floor(ancho / COLS));
      lienzo.width = lado * COLS;
      lienzo.height = lado * FILAS;
      lienzo.style.width = `${lienzo.width}px`;
      lienzo.style.height = `${lienzo.height}px`;
      if (pac) dibujar();
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

  let lazo = 0, sobrante = 0, previo = 0;
  const PASO = 1000 / 60;

  function tic(ahora) {
    if (!lazo) return;
    sobrante += Math.min(120, ahora - previo);
    previo = ahora;
    // Paso fijo: el juego corre siempre a la misma velocidad, vaya la pantalla
    // a 60 o a 120 cuadros por segundo.
    while (sobrante >= PASO) { juego.cuadro(); sobrante -= PASO; }
    lazo = requestAnimationFrame(tic);
  }

  function comenzar() {
    $$('pm-cartel').classList.add('oculto');
    juego.nuevaPartida();
    cancelAnimationFrame(lazo);
    sobrante = 0;
    previo = performance.now();
    lazo = requestAnimationFrame(tic);
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
    cancelAnimationFrame(lazo);
    lazo = 0;
    removeEventListener('keydown', alTeclado);
    removeEventListener('resize', medir);
    detener();
    // La página quedó hecha pedazos: la forma honesta de dejarla como estaba.
    location.reload();
  }
  $$('pm-salir').onclick = salir;

  pintarTop();
}
