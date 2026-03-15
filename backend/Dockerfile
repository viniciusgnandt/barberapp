# ===== BUILD STAGE =====
FROM node:20-alpine AS build

WORKDIR /app

# Copia manifests e instala apenas deps de produção
# (node_modules local é excluído via .dockerignore)
COPY package*.json ./
RUN npm install --omit=dev

# Copia o código-fonte
COPY . .

# ===== RUNTIME STAGE =====
FROM node:20-slim

WORKDIR /app

# Copia tudo do stage de build (código + node_modules prod)
COPY --from=build /app .

RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
