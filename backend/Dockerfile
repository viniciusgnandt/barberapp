# ===== BUILD STAGE =====
FROM node:20-alpine AS build

WORKDIR /app

# Copia somente os manifests ##
COPY package*.json ./

# Instala SOMENTE deps de produção
RUN npm install --omit=dev

# Agora copia o código
COPY . .

# ===== RUNTIME STAGE =====
FROM node:20-slim

WORKDIR /app

# Copia apenas o necessário do stage de build
COPY --from=build /app .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "index.js"]