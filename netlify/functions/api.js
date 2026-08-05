'use strict';

/**
 * Adaptador para Netlify Functions.
 *
 * Netlify entrega el pedido como un objeto plano y espera otro de vuelta; la
 * aplicación (server/app.js) trabaja con el `req`/`res` de node:http. Acá se
 * traduce de uno al otro, sin tocar nada del resto del código: el mismo
 * servidor corre igual en una computadora o en la nube.
 *
 * Está escrito en CommonJS a propósito: la aplicación entera lo es, y
 * mezclarlo con módulos ESM rompe el empaquetado (los `require` de Node
 * quedan sin resolver y la función no llega ni a arrancar).
 */

const { Readable } = require('node:stream');
const { manejarApi } = require('../../server/app.js');

/** Un `req` con lo poco que usa la aplicación: cabeceras, método y cuerpo. */
function pedidoNode(evento, url, cuerpo) {
  const req = Readable.from(cuerpo.length ? [cuerpo] : []);
  req.method = evento.httpMethod;
  req.headers = {};
  for (const [k, v] of Object.entries(evento.headers || {})) req.headers[k.toLowerCase()] = v;
  req.url = url.pathname + url.search;
  // Detrás de Netlify siempre se llega por HTTPS: la cookie va como Secure.
  req.socket = { remoteAddress: req.headers['x-nf-client-connection-ip'] || '', encrypted: true };
  return req;
}

/** Un `res` que junta lo que escribe la aplicación y lo devuelve al final. */
function respuestaNode() {
  const partes = [];
  let estado = 200;
  const cabeceras = {};
  let listo;
  const terminado = new Promise((r) => { listo = r; });

  const res = {
    headersSent: false,
    setHeader(k, v) { cabeceras[k.toLowerCase()] = String(v); },
    getHeader(k) { return cabeceras[k.toLowerCase()]; },
    writeHead(status, extra) {
      estado = status;
      for (const [k, v] of Object.entries(extra || {})) cabeceras[k.toLowerCase()] = String(v);
      res.headersSent = true;
      return res;
    },
    write(chunk) { if (chunk) partes.push(Buffer.from(chunk)); return true; },
    end(chunk) {
      if (chunk) partes.push(Buffer.from(chunk));
      res.headersSent = true;
      // En base64 sale bien cualquier cosa: JSON con acentos, CSV con BOM.
      listo({
        statusCode: estado,
        headers: cabeceras,
        body: Buffer.concat(partes).toString('base64'),
        isBase64Encoded: true,
      });
    },
  };
  return { res, terminado };
}

exports.handler = async (evento) => {
  // `rawUrl` trae la dirección original (/api/login), no la reescrita.
  const url = new URL(evento.rawUrl || `https://localhost${evento.path || '/'}`);
  const cuerpo = evento.body
    ? Buffer.from(evento.body, evento.isBase64Encoded ? 'base64' : 'utf8')
    : Buffer.alloc(0);

  const req = pedidoNode(evento, url, cuerpo);
  const { res, terminado } = respuestaNode();

  try {
    await manejarApi(req, res, url);
  } catch (e) {
    console.error('[error]', evento.httpMethod, url.pathname, e);
    if (!res.headersSent) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'Error interno del servidor' }),
      };
    }
  }
  return terminado;
};
