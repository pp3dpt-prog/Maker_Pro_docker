FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y \
    openscad \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia tudo, incluindo a pasta 'templates'
COPY . .

# Garante permissões e pastas necessárias
RUN mkdir -p temp templates

EXPOSE 10000
CMD ["node", "server.js"]