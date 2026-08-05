/**
 * Adaptador para Netlify Functions.
 *
 * Netlify entrega un `Request` de la web y espera un `Response`; la
 * aplicación (server/app.js) trabaja con el `req`/`res` de node:http. Acá se
 * traduce de uno al otro, sin tocar nada del resto del código: el mismo
 * servidor corre igual en una computadora o en la nube.
 */

import { createRequire } from 'node:module';
import { Readable } from 'node:stream';

const require = createRequire(import.meta.url);
const { manejarApi } = require('../../server/app.js');

/** Un `req` con lo poco que usa la aplicación: cabeceras, método y cuerpo. */
function pedidoNode(request, cuerpo, ip) {
  const headers = Object.fromEntries(request.headers.entries());
  const req = Readable.from(cuerpo.length ? [cuerpo] : []);
  req.method = request.method;
  req.headers = headers;
  req.url = new URL(request.url).pathname + new URL(request.url).search;
  req.socket = { remoteAddress: ip, encrypted: true };
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
    setHeader(k, v) { cabeceras[k.toLowerCase()] = v; },
    getHeader(k) { return cabeceras[k.toLowerCase()]; },
    writeHead(status, extra) {
      estado = status;
      for (const [k, v] of Object.entries(extra || {})) cabeceras[k.toLowerCase()] = v;
      res.headersSent = true;
      return res;
    },
    write(chunk) { if (chunk) partes.push(Buffer.from(chunk)); return true; },
    end(chunk) {
      if (chunk) partes.push(Buffer.from(chunk));
      res.headersSent = true;
      listo(new Response(Buffer.concat(partes), { status: estado, headers: cabeceras }));
    },
  };
  return { res, terminado };
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const cuerpo = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
  const ip = context?.ip || request.headers.get('x-nf-client-connection-ip') || '';

  const req = pedidoNode(request, cuerpo, ip);
  const { res, terminado } = respuestaNode();

  try {
    await manejarApi(req, res, url);
  } catch (e) {
    console.error('[error]', request.method, url.pathname, e);
    if (!res.headersSent) {
      return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }
  return terminado;
}

export const config = { path: '/api/*' };
