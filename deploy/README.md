# Cómo ponerlo en internet (gratis, sin servidor propio)

La aplicación queda en una dirección pública (`https://…`), entra cualquiera desde
el navegador de la PC del call center, del mostrador o del celular, y **no hay
ninguna máquina de la cooperativa que mantener, ni prendida, ni actualizada**.

Son dos servicios, los dos con plan gratuito y los dos permiten uso comercial:

| Servicio | Qué hace | Plan gratis |
|---|---|---|
| **Turso** | Guarda los datos (es la misma base SQLite, pero en la nube) | 500 bases, 5 GB, 1000 millones de lecturas por mes |
| **Netlify** | Sirve las páginas y corre el código del servidor | 100 GB de tráfico y 125.000 pedidos de función por mes |

Para lo que necesita la cooperativa (5 personas, unas cuantas miles de consultas
por mes) esos límites sobran por lejos: no se llega ni al 5 %.

> **Los datos no se borran.** Turso es una base de verdad, persistente. Lo que se
> carga hoy sigue estando el año que viene. La aplicación **no** guarda nada en el
> disco de Netlify — ahí sí se borraría en cada actualización.

---

## Paso 1 — Crear la base en Turso

1. Entrar a <https://turso.tech> y crear la cuenta (se puede con GitHub).
2. Crear una base nueva. Nombre sugerido: `coop-consultas`.
   Región: la más cercana, **São Paulo (`gru`)**.
3. En la pantalla de la base, copiar dos cosas:
   - la **URL**, que empieza con `libsql://` — ej. `libsql://coop-consultas-agucami.turso.io`
   - un **token de acceso** ("Create Token", con permiso de lectura y escritura).

Guardá los dos: se pegan en el paso 3 y el token no se vuelve a mostrar.

## Paso 2 — Conectar el repositorio a Netlify

1. Entrar a <https://netlify.com> y crear la cuenta **con GitHub**.
2. *Add new site → Import an existing project → GitHub*.
3. Elegir el repositorio `Encuesta-y-estadistica-coop` y la rama que corresponda.
4. Netlify lee `netlify.toml` y ya sabe qué hacer: publica `public/`, arma la
   función de `netlify/functions` y le manda todo lo que empieza con `/api/`.
   **No hay que cambiar ninguna opción.**
5. *Deploy site*.

## Paso 3 — Cargar las variables de entorno

En Netlify: *Site configuration → Environment variables → Add a variable*.

| Variable | Valor | ¿Obligatoria? |
|---|---|---|
| `DB_URL` | la URL `libsql://…` del paso 1 | sí |
| `DB_TOKEN` | el token del paso 1 | sí |
| `CLAVE_INICIAL` | la clave con la que entran todos la primera vez | recomendado |
| `ORG_NOMBRE` | el nombre que aparece arriba, ej. `Cooperativa Eléctrica` | opcional |
| `TZ_APP` | `America/Argentina/Buenos_Aires` | opcional (ya es el valor por defecto) |

Después de cargarlas: *Deploys → Trigger deploy → Clear cache and deploy site*.
Las variables se leen recién en el despliegue siguiente.

## Paso 4 — Entrar

Netlify da una dirección tipo `https://coop-consultas.netlify.app`. Se abre, se
inicia sesión y **la primera vez se crean solos** el esquema de la base, los
sectores, los motivos y los cinco usuarios.

Lo primero que tiene que hacer cada uno: *Administración → Mi clave*, y cambiar la
clave inicial.

### Dirección propia (opcional)

Si la cooperativa tiene dominio, en *Domain management → Add a domain* se apunta
un subdominio (ej. `consultas.lacoope.coop`) y Netlify emite el certificado HTTPS
solo, sin costo.

---

## Respaldos

- **Automático:** Turso guarda su propio historial y permite volver la base a un
  punto anterior en el tiempo.
- **A mano:** con sesión de administrador, entrar a `/api/respaldo` — baja un
  archivo `coop-AAAA-MM-DD.json` con todos los datos. Una vez por mes alcanza.
- **Programado:** `node scripts/backup.js /carpeta 30` hace lo mismo desde
  cualquier PC que tenga cargadas `DB_URL` y `DB_TOKEN`.

## Verificar que está viva

`GET /api/salud` responde sin necesidad de sesión:

```json
{ "ok": true, "consultas": 1234, "hora": "2026-08-05T11:09:08.931Z" }
```

Sirve para engancharle un monitor gratuito (UptimeRobot o similar) y enterarse si
alguna vez se cae.

## Qué queda expuesto

Estando en internet, cualquiera con la dirección llega a la pantalla de ingreso
—que pide usuario y clave— y a la encuesta del socio, que es pública a propósito.
El resto necesita sesión iniciada.

Cuando detecta HTTPS, la aplicación marca la cookie de sesión como `Secure`, y
frena los intentos de adivinar claves: ocho fallidos por usuario e IP y hay que
esperar diez minutos.

---

## Para probar en una PC antes de subirlo

Sin `DB_URL`, la aplicación usa un archivo local y no toca la nube:

```bash
npm install
npm start            # http://localhost:3000
npm run seed:demo    # datos de ejemplo para ver los gráficos
```

Para probar contra la base de la nube desde la PC:

```bash
DB_URL=libsql://… DB_TOKEN=… npm start
```

## Otras formas de subirlo

Están armadas y funcionan, pero **no hacen falta** si se sigue lo de arriba:

- `Dockerfile` — cualquier hosting que corra contenedores (Fly.io, Railway).
- `render.yaml` — despliegue en Render.
- `consultas.service` + `Caddyfile` — servidor propio con Linux, systemd y HTTPS.

Todas necesitan una máquina prendida; Netlify + Turso, no.
