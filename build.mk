# === Variables du projet ===
PROJECT_NAME    = ft_transcendence
COMPOSE         = docker compose
COMPOSE_FILE    = docker-compose.yml

# === Variables d'environnement par défaut ===
# utilisées par init.mk pour générer les .env
JWT_EXPIRATION  = 3h
CORS_ORIGIN     = https://localhost
BACKEND_PORT    = 4000
DATABASE_URL    = postgresql://user:password@db:5432/transcendence
FORTYTWO_CALLBACK_URL = https://localhost/api/auth/42/callback