# Consultas y encuestas — Mesa de Informes y Call Center

Aplicación web para registrar **todas las consultas que recibe la cooperativa** (por
teléfono, mostrador, WhatsApp, mail o redes), imputarlas al **sector** que
corresponde y sacar de ahí **estadística detallada**: cuánto recibe cada sector, por
qué motivo, en qué franja horaria, cómo se resolvió y qué opina el socio.

Corre en una PC de la cooperativa o en un servidor propio. **No necesita internet,
ni base de datos externa, ni instalar dependencias**: sólo Node.js 22 o superior.

---

## Qué resuelve

| Problema típico | Cómo lo resuelve |
|---|---|
| "No sabemos cuántas consultas atendemos ni de qué" | Un botón por motivo: un toque durante la llamada y queda registrada |
| "El personal no va a cargar nada si le lleva tiempo" | El camino normal es **un clic**; el detalle es opcional y se agrega después |
| "Cada sector dice que recibe mucho, pero no hay número" | Toda consulta se imputa a un sector y a un motivo dentro de ese sector |
| "No sabemos cuándo poner más gente" | Mapa de demanda por día y hora, con el pico marcado |
| "El socio llamó tres veces por lo mismo" | Estado (resuelta / derivada / pendiente / reclamo) con seguimiento y notas |
| "No tenemos idea de si el socio quedó conforme" | Encuesta de satisfacción por enlace, QR o carga del operador, con CSAT y NPS |
| "El informe mensual lo armamos a mano" | Exportación a CSV (detallado y por sector) y vista lista para imprimir |

---

## Puesta en marcha

```bash
node -v            # tiene que decir v22 o superior
npm start          # levanta el servidor en http://localhost:3000
```

Primer ingreso: usuario **`admin`**, clave **`admin`**.
Cambiala en *Administración → Mi clave* antes de usarlo con datos reales.

Para ver la aplicación con datos de ejemplo (no usar en producción):

```bash
npm run seed:demo          # 90 días de consultas y encuestas ficticias
npm run seed:demo 30 15    # o: 30 días, ~15 consultas por día
npm run reset              # borra todo y deja la base vacía
```

### Demostración sin instalar nada

`demo/demostracion.html` es un archivo suelto que abre la aplicación completa con
datos de ejemplo, sin servidor ni base de datos: se abre con doble clic o se sube a
cualquier hosting para mostrarla. Usa la misma hoja de estilos y el mismo motor de
gráficos que la aplicación real; lo que se carga ahí vive en el navegador y se borra
al recargar la página.

```bash
node scripts/build-demo.js   # regenera demo/demostracion.html
```

### Configuración

Todo se controla con variables de entorno (opcionales):

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Interfaz donde escucha |
| `ORG_NOMBRE` | `Cooperativa` | Nombre que se muestra en el encabezado y en la encuesta |
| `TZ_APP` | `America/Argentina/Buenos_Aires` | Zona horaria con la que se fechan las consultas |
| `DATA_DIR` | `./data` | Carpeta de la base de datos |
| `SESSION_HORAS` | `12` | Duración de la sesión de cada operador |

```bash
ORG_NOMBRE="Cooperativa Eléctrica de ..." PORT=8080 npm start
```

---

## Las pantallas

### 1. Atención rápida — la pantalla del día a día
Entra la llamada, el operador toca **un solo botón** y la consulta ya quedó
registrada. Sin formulario, sin guardar, sin confirmar.

- Tablero de botones grandes con los motivos agrupados por sector, más una fila
  **"Los que más usás"** que se arma sola con los nueve motivos que ese operador
  más registra.
- Arriba, una sola decisión: **Call center** o **Mesa de informes**. Se elige al
  empezar el turno y queda fija. De ahí se deduce el canal (call center →
  telefónico, mesa → presencial); si la consulta entró por WhatsApp o mail, el
  canal se corrige desde *Agregar datos*.
- Cada botón muestra cuántas veces se usó hoy, así el operador ve su propio ritmo.
- Al registrar aparece un aviso de 12 segundos con el resultado y la corrección a
  un clic: **Solucionada · Derivada · Deshacer** (`Esc`). Toda consulta entra como
  solucionada; si hubo que derivarla, es un clic más.
- Cada botón deja igual el sector, el motivo, el canal, el operador, el puesto, la
  fecha y la hora: la estadística sale completa aunque nadie escriba una palabra.

Si el operador se equivoca de botón, tiene 10 minutos para deshacerlo él mismo;
pasado ese plazo lo elimina un supervisor.

### 2. Carga detallada
El formulario completo, para cuando la consulta lo amerita: socio, contacto,
localidad, prioridad, observaciones, **cronómetro** de duración y generación del
enlace de encuesta. `Ctrl` + `Enter` guarda y deja todo listo para la siguiente.

### 3. Consultas
Listado con todos los filtros (fecha, sector, canal, puesto, estado, operador y
búsqueda por socio, N° de reclamo u observaciones), detalle de cada consulta,
línea de tiempo de seguimiento, cambio de estado y exportación a CSV.

### 4. Estadísticas
El panel que mira la gerencia o el consejo:

- **KPIs**: total, promedio por día, % resuelto en el primer contacto, pendientes,
  duración promedio, conformidad, y la variación contra el período anterior.
- Evolución diaria, ranking por sector, **cómo se cierra** cada consulta por sector,
  motivos más consultados, canal, puesto, localidad.
- **Mapa de demanda por día y hora** — el insumo para armar turnos.
- Un mini gráfico por sector con la misma escala (evolución comparada).
- Tablas con los mismos números, para leer o copiar.
- CSV detallado, CSV por sector y versión para imprimir.

### 5. Satisfacción
Respuestas de la encuesta: conformidad general, CSAT (% de 4 y 5), **NPS**,
resolución, atención y espera; distribución de las notas, evolución, ranking por
sector y los últimos comentarios textuales. También permite generar un enlace de
encuesta o cargar a mano una respuesta tomada por teléfono.

### 6. Encuesta del socio (`/encuesta.html`)
Formulario público, pensado para el celular, en dos variantes:

- **Con enlace único** (`/encuesta.html?t=...`): queda atado a la consulta y al
  sector que atendió; se responde una sola vez.
- **Abierto**: `/encuesta.html` sin parámetros. Es el que conviene imprimir como
  **QR en el mostrador**; el socio elige el sector que lo atendió.

### 7. Administración
Sectores, motivos por sector, canales, localidades y usuarios. Los catálogos no se
borran, se **desactivan**: así la estadística vieja no pierde el nombre del sector.

---

## Roles

| Rol | Puede |
|---|---|
| **Operador** | Cargar consultas, ver el listado y las estadísticas, cargar encuestas, editar lo que él mismo cargó y deshacer su carga dentro de los 10 minutos |
| **Supervisor** | Todo lo anterior + editar/eliminar cualquier consulta, administrar catálogos y exportar encuestas |
| **Administrador** | Todo + crear usuarios, cambiar roles y claves |

---

## Qué se guarda de cada consulta

Fecha y hora, operador, puesto (call center / mesa de informes), canal, sector,
motivo, localidad, socio (número, nombre, contacto), estado, prioridad, si se
resolvió en el primer contacto, duración, N° de reclamo u orden de trabajo,
observaciones y toda la línea de seguimiento.

---

## Estructura del proyecto

```
server/
  index.js          servidor HTTP y ruteo (sin frameworks)
  db.js             esquema SQLite, índices y catálogos iniciales
  auth.js           sesiones e inicio de sesión
  auth-hash.js      hash de claves (scrypt)
  filtros.js        filtros compartidos por listado y estadísticas
  util.js           fechas en la zona de la cooperativa, JSON, CSV
  api/              consultas · catálogos · estadísticas · encuestas · usuarios
public/
  rapido.html       atención rápida (un toque = una consulta)
  carga.html        carga detallada
  consultas.html    listado y seguimiento
  panel.html        estadísticas
  satisfaccion.html encuesta: resultados
  encuesta.html     encuesta: formulario público
  admin.html        catálogos y usuarios
  js/charts.js      gráficos en SVG, sin librerías
demo/
  plantilla.html    estructura de la demostración
  demo.js           datos de ejemplo y pantallas de la demostración
  demostracion.html archivo generado, autónomo, para mostrar sin instalar
scripts/
  seed-demo.js      datos de ejemplo
  reset-db.js       reinicio de la base
  build-demo.js     arma la demostración autónoma
```

Los gráficos usan una paleta verificada para **daltonismo** y **modo claro y
oscuro**; todos tienen etiqueta de valor visible o una tabla equivalente, para que
el color nunca sea la única forma de leer el dato.

---

## Copias de seguridad

Toda la información está en un solo archivo: `data/coop.db`.

```bash
# copia en caliente, sin parar el servidor
mkdir -p respaldos
sqlite3 data/coop.db ".backup 'respaldos/coop-$(date +%F).db'"
```

Si no está instalado `sqlite3`, alcanza con copiar `data/coop.db`, `data/coop.db-wal`
y `data/coop.db-shm` con el servidor detenido.

---

## Dejarlo andando siempre (Linux)

`/etc/systemd/system/consultas.service`:

```ini
[Unit]
Description=Consultas y encuestas
After=network.target

[Service]
WorkingDirectory=/opt/consultas
ExecStart=/usr/bin/node --no-warnings server/index.js
Environment=ORG_NOMBRE=Cooperativa
Environment=PORT=3000
Restart=always
User=consultas

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now consultas
```

Para que los socios lleguen a la encuesta desde afuera, publicá **solamente**
`/encuesta.html` y `/api/publico/*` detrás de un proxy con HTTPS (nginx, Caddy).
El resto de la aplicación conviene dejarlo en la red interna.

---

## Ideas para la próxima etapa

- Buscar el socio por número contra el sistema de facturación (si tiene API o base
  accesible) para completar nombre y localidad solos.
- Aviso automático a los sectores con consultas pendientes de más de X días.
- Informe mensual en PDF listo para el consejo de administración.
- Alta automática del reclamo en el sistema de gestión al elegir *Reclamo generado*.
- Envío automático de la encuesta por WhatsApp Business al cerrar la atención.
