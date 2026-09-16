# Imagen del Frontend React + Vite.
#
# Dos etapas: la primera compila y la segunda solo lleva el resultado, para
# que la imagen final no arrastre node_modules ni el codigo fuente.

# --- Etapa 1: compilacion ---------------------------------------------------
FROM node:22-alpine AS compilacion

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# La direccion del Backend se fija al compilar: Vite la incrusta en el
# JavaScript, no se lee en tiempo de ejecucion.
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Etapa 2: servir --------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

COPY --from=compilacion /app/dist ./dist
COPY --from=compilacion /app/servidor.js ./servidor.js

USER node

EXPOSE 4173

CMD ["node", "servidor.js"]
