'use strict';

/**
 * Arma la demostración autónoma: un solo archivo HTML que se abre con doble
 * clic (o se publica en cualquier lado) y no necesita servidor.
 *
 *   node scripts/build-demo.js
 *
 * Usa la misma hoja de estilos y el mismo motor de gráficos que la aplicación
 * real, para que lo que se muestra sea exactamente lo que se instala.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = leer('public/css/app.css');

// El motor de gráficos se comparte tal cual; solo se quitan los `export`,
// porque en la demo todo vive dentro de un único módulo.
const charts = leer('public/js/charts.js')
  .replace(/^export (function|const|let)/gm, '$1')
  .replace(/^export \{[^}]*\};?$/gm, '');

const demo = leer('demo/demo.js');

// Los datos de Información útil son los mismos que usa la aplicación.
const datosInfo = leer('public/js/datos-info.js').replace(/^export /gm, '');

// El logo va incrustado: la demostración tiene que ser un archivo solo.
const logo = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'public/img/logo.png')).toString('base64')}`;

const salida = leer('demo/index.html')
  .replace('/*{{CSS}}*/', () => css)
  .replace('/*{{CHARTS}}*/', () => charts)
  .replace('/*{{DATOS_INFO}}*/', () => datosInfo)
  .replace('/*{{DEMO}}*/', () => demo)
  .replace('/*{{LOGO}}*/', () => logo);

const destino = path.join(ROOT, 'demo/demostracion.html');
fs.writeFileSync(destino, salida);
console.log(`Listo: ${destino} (${(Buffer.byteLength(salida) / 1024).toFixed(0)} KB)`);
