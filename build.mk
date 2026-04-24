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
NAME        := ft_transcendence
VERSION     := 1.0.0
ENV_MODE    ?= dev

# === Paths ===
ROOT_DIR        := $(shell pwd)
BACKEND_DIR     := $(ROOT_DIR)/backend
FRONTEND_DIR    := $(ROOT_DIR)/frontend
NGINX_DIR       := $(ROOT_DIR)/nginx
ENV_FILE        := $(ROOT_DIR)/.env

# === Orchestration ===
# DOCKER ?= docker → surchargeable en CLI pour Podman (Fedora) :
#   make DOCKER=podman up
# COMPOSE dérive de DOCKER : `docker compose` ou `podman compose`.
DOCKER          ?= docker
COMPOSE         := $(DOCKER) compose
COMPOSE_FILE    := $(ROOT_DIR)/docker-compose.yml

# === Network ===
DOMAIN_NAME         ?= localhost
FRONTEND_PORT       ?= 3000
BACKEND_PORT        ?= 4000
CORS_ORIGIN         ?= https://$(DOMAIN_NAME)

# === Database (PostgreSQL) ===
POSTGRES_USER       ?= user
POSTGRES_PASSWORD   ?= password
POSTGRES_DB         ?= transcendence
DB_HOST             ?= db
DB_PORT             ?= 5432
DATABASE_URL        ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(POSTGRES_DB)

# === Security ===
JWT_EXPIRATION      ?= 3h
# JWT_SECRET est généré par `make init` via openssl rand -hex 64, pas défini ici

# === 42 OAuth ===
# Laisser vide: make init génère un backend/.env avec champs vides, à remplir à la main
# https://profile.intra.42.fr/oauth/applications
FORTYTWO_CLIENT_ID      ?=
FORTYTWO_CLIENT_SECRET  ?=
FORTYTWO_CALLBACK_URL   ?= https://$(DOMAIN_NAME)/api/auth/42/callback