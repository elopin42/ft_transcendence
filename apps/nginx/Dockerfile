# ==============================================================================
# NGINX - Reverse Proxy HTTPS pour ft_transcendence
# ==============================================================================
# Multi-stage : le cert SSL est généré au build, pas besoin de script .sh
# Image officielle nginx (debian bookworm, pas Alpine)

# ── Stage 1 : Génération du certificat SSL ──
FROM nginx:1.27-bookworm AS ssl

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ARG DOMAIN_NAME=localhost
RUN mkdir -p /certs && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /certs/nginx.key -out /certs/nginx.crt \
    -subj "/C=FR/ST=IDF/L=Paris/O=42/OU=ft_transcendence/CN=${DOMAIN_NAME}" \
    && chmod 644 /certs/nginx.crt && chmod 600 /certs/nginx.key

# ── Stage 2 : Image nginx officielle ──
FROM nginx:1.27-bookworm

# Copie du cert SSL depuis le stage précédent
COPY --from=ssl /certs/nginx.crt /etc/nginx/ssl/nginx.crt
COPY --from=ssl /certs/nginx.key /etc/nginx/ssl/nginx.key

# Config nginx personnalisée (écrase la config par défaut)
COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY conf/proxy_headers.conf /etc/nginx/conf.d/proxy_headers.conf

EXPOSE 443