#setup des .env (copie .env.example si .env existe pas)
#vérification des prérequis (docker, node, etc.)
#make init = tout préparer pour un nouveau dev

include build.mk

# vérifie que docker et docker compose sont installés
.PHONY: check-deps init

check-deps:
	@command -v docker >/dev/null 2>&1 || { echo "Docker n'est pas installé"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Docker Compose n'est pas installé"; exit 1; }
	@echo "Dépendances OK"

# génère les .env si ils existent pas
# JWT_SECRET généré automatiquement avec openssl
init: check-deps
	@if [ ! -f .env ]; then \
		JWT=$$(openssl rand -hex 64); \
		echo "JWT_SECRET=\"$$JWT\"" > .env; \
		echo "JWT_EXPIRATION=\"$(JWT_EXPIRATION)\"" >> .env; \
		echo ".env racine créé (JWT_SECRET auto-généré)"; \
	fi
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "backend/.env créé depuis .env.example"; \
	fi
	@if [ ! -f frontend/.env ]; then \
		cp frontend/.env.example frontend/.env; \
		echo "frontend/.env créé depuis .env.example"; \
	fi
	@echo "Init terminé"