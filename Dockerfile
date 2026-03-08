FROM alpine:edge

# Instalar dependências necessárias
RUN apk add --no-cache nodejs npm openscad ttf-liberation

WORKDIR /app

# Copia primeiro os ficheiros de dependência para aproveitar a cache do Docker
COPY package*.json ./

# Instala as dependências (isto é o que está a falhar no Render)
RUN npm install

# Copia o restante do código fonte
COPY . .

# Garante permissões (estratégia de segurança)
RUN adduser -D makeruser && chown -R makeruser /app
USER makeruser

EXPOSE 10000

# Usamos o comando direto para garantir que o Node arranca
CMD ["node", "server.js"]