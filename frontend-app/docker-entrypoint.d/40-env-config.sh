#!/bin/sh
# Gera /usr/share/nginx/html/env-config.js em runtime.
# No container, o nginx proxia /api/ para o backend — URL sempre fixa.

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  apiUrl: "/api"
};
EOF

echo "env-config.js gerado com apiUrl=/api"
