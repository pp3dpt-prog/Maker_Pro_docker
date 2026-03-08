FROM node:24-alpine

# Cria e define o diretório de trabalho
WORKDIR /app

# Copia apenas os ficheiros de configuração do npm
COPY package.json package-lock.json ./

# Instala as dependências de forma forçada
RUN npm install

# Copia todo o código fonte para o diretório de trabalho
COPY . .

# Comando de arranque
CMD ["node", "server.js"]