'use strict';

/**
 * Carga datos de ejemplo para poder ver la aplicacion funcionando.
 *   npm run seed:demo
 * No se usa en produccion: genera consultas y encuestas ficticias.
 */

const crypto = require('node:crypto');
const { all, get, run, iniciar } = require('../server/db');
const { sumarDias, hoy } = require('../server/util');

const DIAS = Number(process.argv[2] || 90);
const POR_DIA = Number(process.argv[3] || 28);

const LOCALIDADES = ['Centro', 'Barrio Norte', 'Villa Elisa', 'Colonia San Jose', 'Zona rural'];

const azar = (a) => a[Math.floor(Math.random() * a.length)];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Elige un item segun pesos relativos. */
function pesado(items, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= pesos[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

async function crearOperadores() {
  for (const nombre of LOCALIDADES) {
    if (!await get('SELECT id FROM localidades WHERE nombre = ?', [nombre])) {
      await run('INSERT INTO localidades (nombre) VALUES (?)', [nombre]);
    }
  }
}

async function generar() {
  await iniciar();
  await crearOperadores();

  const sectores = await all('SELECT * FROM sectores WHERE activo = 1 ORDER BY orden');
  const motivos = await all('SELECT * FROM motivos WHERE activo = 1');
  const canales = await all('SELECT * FROM canales WHERE activo = 1');
  const localidades = await all('SELECT * FROM localidades');
  const operadores = await all("SELECT * FROM usuarios WHERE activo = 1 AND puesto <> 'otro'");

  // La demanda no se reparte pareja: reclamos y ventas se llevan la mayor parte.
  const PESOS = {
    'Reclamos': 9, 'Ventas': 7, 'TIC': 6, 'Cortes por falta de pago': 5, 'Pagos': 4,
    'Mesa de informes': 12,
  };
  const pesoSector = sectores.map((s) => PESOS[s.nombre] ?? 3);
  const pesoCanal = canales.map((c) => ({ Telefonico: 12, Presencial: 4, WhatsApp: 5, Email: 2, 'Web / Redes': 1 }[c.nombre] ?? 2));
  const pesoHora = { 8: 6, 9: 10, 10: 12, 11: 10, 12: 6, 13: 4, 14: 5, 15: 7, 16: 8, 17: 6, 18: 3 };
  const horas = Object.keys(pesoHora).map(Number);

  let creadas = 0, encuestas = 0;
  const finalizar = hoy();

  for (let d = DIAS - 1; d >= 0; d--) {
    const fecha = sumarDias(finalizar, -d);
    const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    if (dow === 0) continue;                       // domingo cerrado
    const factor = dow === 6 ? 0.35 : 1;           // sabado, media jornada
    const pico = Math.random() < 0.08 ? 1.9 : 1;   // dias de corte general o vencimiento
    const cantidad = Math.round(POR_DIA * factor * pico * (0.75 + Math.random() * 0.5));

    for (let i = 0; i < cantidad; i++) {
      const sector = pesado(sectores, pesoSector);
      const delSector = motivos.filter((m) => m.sector_id === sector.id);
      const motivo = delSector.length ? azar(delSector) : null;
      const enMesa = sector.puesto === 'mesa_informes';
      const canal = enMesa
        ? (canales.find((c) => c.nombre === 'Presencial') || canales[0])
        : pesado(canales, pesoCanal);
      // Cada puesto lo atiende su propia gente
      const delPuesto = operadores.filter((o) => o.puesto === (enMesa ? 'mesa_informes' : 'call_center'));
      const operador = azar(delPuesto.length ? delPuesto : operadores);
      const hora = pesado(horas, horas.map((h) => pesoHora[h]));
      const minuto = entre(0, 59);
      const ts = `${fecha}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;

      // El operador solo marca "solucionada" cuando pudo resolverla en el momento.
      const estado = pesado(['resuelta', 'pendiente'], [74, 26]);
      const primerContacto = estado === 'resuelta' ? 1 : 0;
      const duracion = entre(90, 900);

      const r = await run(
        `INSERT INTO consultas (ts, fecha, hora, dow, operador_id, puesto, canal_id, sector_id,
            motivo_id, localidad_id, socio_nro, socio_nombre, contacto, estado, prioridad,
            primer_contacto, duracion_seg, reclamo_nro, observaciones, cerrada_ts, cerrada_por)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ts, fecha, hora, dow, operador.id,
          sector.puesto === 'mesa_informes' ? 'mesa_informes' : 'call_center',
          canal.id, sector.id, motivo ? motivo.id : null, azar(localidades).id,
          String(entre(1000, 9999)), '', '', estado,
          pesado(['baja', 'normal', 'alta'], [1, 8, 2]), primerContacto, duracion,
          '',
          motivo ? `Consulta por ${motivo.nombre.toLowerCase()}.` : '',
          estado === 'resuelta' ? ts : null, estado === 'resuelta' ? operador.id : null]);
      creadas++;

      // Una de cada seis atenciones deja una encuesta respondida.
      if (Math.random() < 0.17) {
        const base = estado === 'resuelta' ? 4 : 3;
        const nota = Math.max(1, Math.min(5, base + entre(-1, 1)));
        await run(`INSERT INTO encuestas (token, consulta_id, sector_id, canal_id, operador_id, origen,
                creada, respondida, fecha, satisfaccion, resolucion, atencion, espera, recomendaria, comentario)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [crypto.randomBytes(9).toString('base64url'), Number(r.lastInsertRowid), sector.id, canal.id,
            operador.id, azar(['link', 'qr', 'operador']), ts, ts, fecha, nota,
            Math.max(1, Math.min(5, nota + entre(-1, 0))), Math.max(1, Math.min(5, nota + entre(0, 1))),
            Math.max(1, Math.min(5, nota + entre(-1, 1))), Math.max(0, Math.min(10, nota * 2 + entre(-2, 1))),
            Math.random() < 0.25 ? azar([
              'Me atendieron muy bien y rapido.', 'Estuve mucho tiempo esperando en linea.',
              'Resolvieron el problema en el dia.', 'Me derivaron y nunca me llamaron.',
              'Muy amables en el mostrador.', 'Deberian tener mas lineas telefonicas.',
            ]) : '']);
        encuestas++;
      }
    }
  }

  console.log(`Listo: ${creadas} consultas y ${encuestas} encuestas en los ultimos ${DIAS} dias.`);
  console.log(`Consultas repartidas entre ${operadores.length} operadores del padron.`);
}

generar().catch((e) => { console.error(e); process.exit(1); });
