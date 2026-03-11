FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y \
    openscad \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia todos os ficheiros, incluindo a pasta 'templates' com os STLs
COPY . .

# Garante que a pasta temp existe para gravar os ficheiros temporários
RUN mkdir -p temp

EXPOSE 10000
CMD ["node", "server.js"]