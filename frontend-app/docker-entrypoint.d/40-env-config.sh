#!/bin/sh
# Gera /usr/share/nginx/html/env-config.js em runtime com as variáveis do container.
# Esse arquivo é carregado pelo index.html antes do bundle do Vite.

API_URL="${VITE_API_URL:-http://localhost:3000/api}"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  apiUrl: "${API_URL}"
};
EOF

echo "env-config.js gerado com apiUrl=${API_URL}"
