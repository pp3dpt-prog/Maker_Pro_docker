FROM node:24-alpine

# Instala o OpenSCAD e dependências necessárias
RUN apk add --no-cache openscad

WORKDIR /app

# Copia os ficheiros de dependências
COPY package.json package-lock.json ./

# Instala as dependências do Node
RUN npm install

# Copia o resto do código
COPY . .

EXPOSE 10000
CMD ["node", "server.js"]