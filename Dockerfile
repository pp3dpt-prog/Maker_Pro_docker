FROM node:24-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os ficheiros de dependências primeiro (otimiza a cache)
COPY package*.json ./

# Instala as dependências de forma limpa
RUN npm install

# Copia todo o resto do código
COPY . .

# Expõe a porta que o Render espera (o Render define a porta via variável de ambiente)
EXPOSE 10000

# Comando para iniciar o servidor
CMD ["node", "server.js"]