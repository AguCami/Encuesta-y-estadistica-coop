# Puesta en línea

La aplicación va a estar **en internet**, no en una PC de la cooperativa. Se
entra desde cualquier lado con la dirección web y la clave de cada uno.

Lo único que hay que resolver bien es **dónde vive la base de datos**: es un
archivo, así que el servicio elegido tiene que darle un **disco que sobreviva a
cada actualización**. Los servicios que no lo dan borran los datos en cada
despliegue, y ese es el error que hay que evitar.

## Opción recomendada: Render

Se conecta el repositorio de GitHub y se despliega solo con cada cambio. Trae
HTTPS y dominio propio sin configurar nada.

1. Crear la cuenta en <https://render.com> y conectar el repositorio.
2. **New → Blueprint**: Render lee `render.yaml` y arma todo (servicio, disco de
   1 GB montado en `/var/datos`, chequeo de salud).
3. En *Environment*, cargar `CLAVE_INICIAL` con la clave de arranque del
   personal — se escribe ahí, nunca en el repositorio.
4. Cuando termina, queda una dirección `https://consultas-coop.onrender.com`.
   Para usar el dominio de la cooperativa: *Settings → Custom Domain*, agregar
   `consultas.tucoop.com.ar` y cargar el CNAME que indica Render en el panel
   del dominio.

**Importante**: el plan gratuito **no sirve** para esto — no admite disco y se
apaga solo cuando nadie lo usa. El plan pago más chico alcanza y sobra para
cinco personas (unos 7 USD al mes, más centavos por el disco).

Cada `git push` a la rama publica la versión nueva. La base no se toca: las
columnas nuevas se agregan solas al arrancar.

## Alternativas

| Servicio | Cómo | Cuándo conviene |
|---|---|---|
| **Railway** | Conecta el repositorio, agregar un *Volume* montado en `/var/datos` y la variable `DATA_DIR=/var/datos` | Si preferís su panel; cuesta parecido |
| **Fly.io** | Usa el `Dockerfile` de la raíz; `fly volumes create datos` y montarlo en `/var/datos` | Si querés el servidor más cerca (San Pablo) y pagar por uso |
| **VPS** (Hetzner, DigitalOcean) | Los archivos `consultas.service` y `Caddyfile` de esta carpeta | Si querés control total y el costo más bajo; hay que mantener el servidor |

En todos los casos la regla es la misma: **`DATA_DIR` tiene que apuntar a un
disco persistente**.

## Respaldos estando en la nube

El servicio hace copias de su disco, pero conviene tener una afuera. Entrando
como administrador:

```
https://<tu-dirección>/api/respaldo
```

descarga la base entera en un archivo, tomado en caliente y sin frenar a nadie.
Guardalo donde la cooperativa guarda el resto de sus respaldos. Con hacerlo una
vez por semana alcanza para el volumen que maneja esta aplicación.

Para restaurar: se reemplaza el archivo `coop.db` del disco por la copia.

## Después de publicar

1. Entrá como `acami` con la clave inicial y cambiala desde
   *Administración → Mi clave*.
2. Que cada uno del equipo haga lo mismo en su primer ingreso.
3. Revisá sectores y motivos en *Administración*: son los botones que va a ver
   el personal.
4. Probá `https://<tu-dirección>/api/salud` — tiene que responder `ok`. Sirve
   para engancharle un monitor gratuito (UptimeRobot y similares) que avise si
   se cae.

## Qué queda expuesto

Estando en internet, cualquiera con la dirección llega a la pantalla de ingreso
—que pide usuario y clave— y a la encuesta del socio, que es pública a
propósito. El resto necesita sesión iniciada.

La aplicación, cuando detecta HTTPS, marca la cookie de sesión como `Secure`, y
frena los intentos de adivinar claves: ocho fallidos por usuario e IP y hay que
esperar diez minutos.

## Los archivos de esta carpeta

- `consultas.service` — servicio de systemd, sólo si se elige un VPS.
- `Caddyfile` — HTTPS automático en un VPS, con la variante que publica
  únicamente la encuesta al socio.

En la raíz del repositorio: `render.yaml` (Render), `Dockerfile` (Fly, Railway y
cualquier hosting de contenedores) y `.node-version`.
