### Documentação Passo a Passo para Deploy com Docker e Docker Compose

Esta documentação detalha como configurar e fazer o deploy de uma aplicação composta por um backend (Node.js + Express), frontend (React), e um banco de dados MongoDB em contêineres Docker utilizando o Docker Compose. Além disso, o Nginx é utilizado como um proxy reverso para rotear as solicitações para o frontend e backend.

### Requisitos

- Docker e Docker Compose instalados na máquina.
- Estrutura do projeto com os seguintes diretórios e arquivos:
  ```
  ├── backend/
  │   ├── Dockerfile.backend
  │   ├── index.js
  │   ├── package.json
  │   └── (outros arquivos do backend)
  ├── frontend/
  │   ├── Dockerfile.frontend
  │   ├── src/
  │   ├── public/
  │   ├── package.json
  │   └── (outros arquivos do frontend)
  ├── nginx/
  │   ├── nginx.conf
  ├── docker-compose.yml
  └── backup/
      ├── (arquivos de backup do MongoDB)
  ```

### Passo 1: Criar os Arquivos Docker

#### 1.1 Backend - `Dockerfile.backend`

Crie o `Dockerfile.backend` na pasta do backend:

```Dockerfile
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Baixar o script wait-for
ADD https://raw.githubusercontent.com/eficode/wait-for/master/wait-for /wait-for
RUN chmod +x /wait-for

EXPOSE 4000

# Usar o wait-for para aguardar o MongoDB estar pronto
CMD ["./wait-for", "mongodb:27017", "--", "node", "index.js"]
```

#### 1.2 Frontend - `Dockerfile.frontend`

Crie o `Dockerfile.frontend` na pasta do frontend:

```Dockerfile
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Usa a imagem do Nginx para servir o frontend
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 1.3 Nginx - `nginx.conf`

Crie um arquivo `nginx.conf` na pasta `nginx` para configurar o Nginx como proxy reverso:

#### Nginx - `nginx.conf` (continuação)

```nginx
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve os arquivos estáticos do frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
}
```

### Passo 2: Configurar o Docker Compose

Crie o arquivo `docker-compose.yml` na raiz do projeto. Este arquivo definirá os serviços para o backend, frontend, MongoDB, e Nginx:

#### `docker-compose.yml`

```yaml
version: '3'

services:
  mongodb:
    image: mongo
    container_name: mongodb
    ports:
      - "27017:27017"
    volumes:
      - ./data:/data/db
      - ./backup:/backup
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    container_name: backend
    ports:
      - "4000:4000"
    networks:
      - app-network
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    container_name: frontend
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Passo 3: Iniciar os Contêineres

Para iniciar todos os contêineres, execute os seguintes comandos:

1. **Ir para o diretório do projeto**:

   ```bash
   cd /caminho/para/o/projeto
   ```

2. **Construir e iniciar os contêineres**:

   ```bash
   docker-compose up -d --build
   ```

   - `-d`: Inicia os contêineres em segundo plano.
   - `--build`: Reconstrói as imagens do Docker antes de iniciar.

### Passo 4: Verificar o Deploy

Após iniciar os contêineres, você pode verificar se tudo está funcionando corretamente:

- **Acessar o frontend**: No navegador, acesse `http://localhost` para ver o aplicativo em execução.
- **Verificar os logs**: Use `docker-compose logs -f` para ver os logs dos contêineres e identificar possíveis problemas.
- **Parar os contêineres**: Para parar os contêineres, use o comando:

   ```bash
   docker-compose down
   ```

### Passo 5: Restaurar o Backup do MongoDB (Opcional)

Se precisar restaurar dados de backup no MongoDB:

1. **Colocar os arquivos de backup**: Coloque os arquivos de backup (`.bson` e `.json`) na pasta `backup/` na raiz do projeto.

2. **Acessar o contêiner do MongoDB**:

   ```bash
   docker exec -it mongodb /bin/bash
   ```

3. **Restaurar o backup**:

   ```bash
   mongorestore --drop /backup
   ```

   - `--drop`: Remove as coleções existentes antes de restaurar os dados.

### Passo 6: Configurações Adicionais

1. **CORS**: No backend (`index.js`), certifique-se de que as origens permitidas no CORS correspondam aos domínios que você está usando (por exemplo, `http://localhost`).
2. **Variáveis de ambiente**: Se precisar configurar variáveis de ambiente (como credenciais do banco de dados), você pode usar o arquivo `.env` e referenciá-lo no `docker-compose.yml` usando a chave `env_file`.

### Resumo da Configuração

1. **Backend**:
   - Definido no `Dockerfile.backend`.
   - Aguarda o MongoDB ficar pronto usando o script `wait-for`.
2. **Frontend**:
   - Construído usando o `Dockerfile.frontend`.
   - Servido pelo Nginx.
3. **Nginx**:
   - Configurado com `nginx.conf` para servir os arquivos estáticos do frontend e rotear requisições para o backend.
4. **MongoDB**:
   - Executa no contêiner, com persistência de dados usando volumes.
5. **Rede Docker**:
   - Todos os serviços compartilham a rede `app-network`.

### Comandos Úteis

- **Iniciar e construir os contêineres**: `docker-compose up -d --build`
- **Parar os contêineres**: `docker-compose down`
- **Verificar os logs**: `docker-compose logs -f`
- **Acessar um contêiner**: `docker exec -it <container_name> /bin/bash`
- **Restaurar backup do MongoDB**: `mongorestore --drop /backup`

### Conclusão

Este guia cobre todos os passos necessários para configurar, construir e implantar a aplicação completa usando Docker e Docker Compose. O Nginx atua como proxy reverso, roteando requisições para o frontend e backend, enquanto o MongoDB é gerenciado em seu próprio contêiner com suporte a backups.