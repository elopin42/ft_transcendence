# === Variables centrales ===
# Modifier ici pour personnaliser rapidement l'environnement de dev
# - Les valeurs ?= peuvent être surchargées en CLI: make DOMAIN_NAME=test.42.fr up
# - make init lit ces vars pour générer les .env (voir make/setup.mk)
#
# Types d'assignation:
#   =  récursive (évaluée à chaque usage)
#   := immédiate (évaluée une seule fois)
#   ?= conditionnelle (assignée uniquement si pas déjà définie)
#   += concaténation

# === Projet ===
NAME        		:= ft_transcendence
VERSION     		:= 1.0.0
# Mode runtime applicatif. Valeurs : development | production
ENV_MODE            ?= development
# Bypass rate-limiter en dev. Override : make THROTTLER_DISABLED=false up
THROTTLER_DISABLED  ?= true

# === Paths ===
ROOT_DIR        := $(shell pwd)
BACKEND_DIR     := $(ROOT_DIR)/apps/backend
FRONTEND_DIR    := $(ROOT_DIR)/apps/frontend
NGINX_DIR       := $(ROOT_DIR)/apps/nginx
SHARED_DIR      := $(ROOT_DIR)/packages/shared
ENV_FILE        := $(ROOT_DIR)/.env

# === Orchestration ===
# Auto-detection du runtime :
#   1. DOCKER en env (override CLI explicite, ex: `make DOCKER=podman up`)
#   2. docker installe -> docker
#   3. podman installe -> podman (postes Fedora ecole)
#   4. sinon -> docker quand meme, le check-deps fail proprement
#
# COMPOSE : prefere `<docker> compose` (plugin v2), fallback `docker-compose`
# (binaire v1 historique sur certains Debian). Decide au chargement.
DOCKER          ?= $(shell command -v docker >/dev/null 2>&1 && echo docker \
                    || (command -v podman >/dev/null 2>&1 && echo podman) \
                    || echo docker)
COMPOSE         := $(shell if $(DOCKER) compose version >/dev/null 2>&1; \
                    then echo "$(DOCKER) compose" ; \
                    else echo "docker-compose" ; fi)
COMPOSE_FILE    := $(ROOT_DIR)/compose.yml

# === Network ===
DOMAIN_NAME         ?= localhost
FRONTEND_PORT       ?= 3000
BACKEND_PORT        ?= 4000
CORS_ORIGIN         ?= https://$(DOMAIN_NAME)

# === i18n ===
# Locale par defaut servie par Next.js. Source unique de verite : ce fichier.
# Repercute dans le .env racine, lu en build args par compose pour le frontend.
DEFAULT_LOCALE      ?= fr

# === Database (PostgreSQL) ===
POSTGRES_USER       ?= user
POSTGRES_PASSWORD   ?= password
POSTGRES_DB         ?= transcendence
DB_HOST             ?= db
DB_PORT             ?= 5432
DATABASE_URL        ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(POSTGRES_DB)

# === Security ===
JWT_EXPIRATION      ?= 3h
JWT_REFRESH_EXPIRATION  ?= 7d
# JWT_SECRET et TWO_FA_ENCRYPTION_KEY sont generes par `make setup` via openssl

# === 42 OAuth ===
# Laisser vide: make init génère un backend/.env avec champs vides, à remplir à la main
# https://profile.intra.42.fr/oauth/applications
FORTYTWO_CLIENT_ID      ?=
FORTYTWO_CLIENT_SECRET  ?=
FORTYTWO_CALLBACK_URL   ?= https://$(DOMAIN_NAME)/api/auth/42/callback
