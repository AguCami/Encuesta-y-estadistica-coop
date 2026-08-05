# Puesta en producción

Tres archivos y dos decisiones. La aplicación no necesita nada instalado más
que **Node 22 o superior**: no hay dependencias, ni base de datos aparte, ni
compilación.

## Decisión 1 — ¿dónde vive?

**Servidor propio, dentro de la cooperativa.** Una PC con Linux en la red
interna. Los datos no salen de la cooperativa, no hay costo mensual y el
respaldo es copiar un archivo. Se entra desde cualquier máquina de la red
escribiendo `http://<ip-del-servidor>:3000`. Es lo que conviene si todos
atienden desde la sede.

**Servidor en internet (VPS).** Una máquina chica alcanza y sobra. Hace falta
un dominio o subdominio y HTTPS. Conviene si alguien necesita entrar desde
afuera —el celular, la casa, otra sucursal— o si se va a publicar la encuesta
al socio.

## Decisión 2 — ¿qué se publica hacia afuera?

Si sale a internet, lo prudente es publicar **solo la encuesta del socio**
(`/encuesta.html` y `/api/publico/*`) y dejar el resto puertas adentro o
detrás de la VPN. El `Caddyfile` de esta carpeta trae las dos variantes.

## Pasos

```bash
# 1. Node 22 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. La aplicación
sudo useradd --system --home /opt/consultas consultas
sudo git clone <url-del-repositorio> /opt/consultas
sudo chown -R consultas:consultas /opt/consultas

# 3. Clave inicial del personal (se cambia después desde la aplicación)
sudo systemctl edit consultas   # o agregala al archivo .service
#   [Service]
#   Environment=CLAVE_INICIAL=loquesea

# 4. Que quede corriendo
sudo cp /opt/consultas/deploy/consultas.service /etc/systemd/system/
sudo systemctl enable --now consultas
systemctl status consultas

# 5. HTTPS (solo si sale a internet)
sudo apt install -y caddy
sudo cp /opt/consultas/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # poné tu dominio
sudo systemctl reload caddy

# 6. Respaldo diario a las 22
sudo crontab -u consultas -e
#   0 22 * * * cd /opt/consultas && /usr/bin/node scripts/backup.js /var/respaldos 30
```

## Después de instalar

1. Entrá como `acami` con la clave inicial y **cambiala** desde
   *Administración → Mi clave*.
2. Que cada uno del equipo haga lo mismo en su primer ingreso.
3. Revisá sectores y motivos en *Administración*: son los que ve el personal
   en los botones.
4. Verificá que el respaldo corrió: `ls -l /var/respaldos`.

## Actualizar a una versión nueva

```bash
cd /opt/consultas
sudo -u consultas git pull
sudo systemctl restart consultas
```

La base no se toca: las columnas nuevas se agregan solas al arrancar.
