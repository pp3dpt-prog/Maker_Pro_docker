FROM node:20-bullseye-slim

# Instala OpenSCAD e fontes
RUN apt-get update && apt-get install -y \
    openscad \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia TODOS os ficheiros (incluindo a pasta templates/ e server.js)
COPY . .

# Cria a pasta temp explicitamente
RUN mkdir -p temp

EXPOSE 10000
CMD ["node", "server.js"]