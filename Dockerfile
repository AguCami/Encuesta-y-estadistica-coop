# Imagen para cualquier hosting que corra contenedores (Fly.io, Railway, etc.).
# La base vive en /var/datos, que tiene que ser un volumen persistente.
FROM node:22-alpine

WORKDIR /app
COPY . .

ENV DATA_DIR=/var/datos \
    HOST=0.0.0.0 \
    PORT=3000
VOLUME /var/datos
EXPOSE 3000

CMD ["node", "--no-warnings", "server/index.js"]
