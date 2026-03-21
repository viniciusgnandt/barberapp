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

# Instala Chromium e dependências necessárias para Puppeteer/whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Aponta Puppeteer para o Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copia tudo do stage de build (código + node_modules prod)
COPY --from=build /app .

RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
