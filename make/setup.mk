# === Setup, vérifications et diagnostic ===
# Retire l'include build.mk : le Makefile racine le charge déjà avant cet include

.PHONY: setup check-deps check-env doctor regen-env

setup: check-deps ## Génère les .env depuis build.mk (idempotent, skip si existent)
	@echo "$(C_BLUE)🔧 Initialisation de l'environnement...$(C_RESET)"
	@# .env racine (partagé)
	@if [ ! -f .env ]; then \
		JWT=$$(openssl rand -hex 64); \
		printf "# Généré par 'make setup' (source: build.mk)\n\nDOMAIN_NAME=%s\nCORS_ORIGIN=%s\n\nPOSTGRES_USER=%s\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=%s\n\nJWT_SECRET=\"%s\"\nJWT_EXPIRATION=\"%s\"\n" \
			"$(DOMAIN_NAME)" "$(CORS_ORIGIN)" "$(POSTGRES_USER)" "$(POSTGRES_PASSWORD)" "$(POSTGRES_DB)" "$$JWT" "$(JWT_EXPIRATION)" > .env; \
		echo "  $(C_GREEN)✓$(C_RESET) .env créé (JWT_SECRET auto-généré)"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) .env existe déjà (skip)"; \
	fi
	@# backend/.env
	@if [ ! -f backend/.env ]; then \
		printf "# Généré par 'make setup' (source: build.mk)\n\nDATABASE_URL=\"%s\"\nPORT=%s\n\nFORTYTWO_CLIENT_ID=\"%s\"\nFORTYTWO_CLIENT_SECRET=\"%s\"\nFORTYTWO_CALLBACK_URL=\"%s\"\n" \
			"$(DATABASE_URL)" "$(BACKEND_PORT)" "$(FORTYTWO_CLIENT_ID)" "$(FORTYTWO_CLIENT_SECRET)" "$(FORTYTWO_CALLBACK_URL)" > backend/.env; \
		echo "  $(C_GREEN)✓$(C_RESET) backend/.env créé"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) backend/.env existe déjà (skip)"; \
	fi
	@# frontend/.env
	@if [ ! -f frontend/.env ]; then \
		printf "# Généré par 'make setup' (source: build.mk)\n\nPORT=%s\n" "$(FRONTEND_PORT)" > frontend/.env; \
		echo "  $(C_GREEN)✓$(C_RESET) frontend/.env créé"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) frontend/.env existe déjà (skip)"; \
	fi
	@# Warnings persistants (affichés même quand skip)
	@if [ -f backend/.env ] && grep -qE '^FORTYTWO_CLIENT_ID=""?$$' backend/.env; then \
		echo "  $(C_YELLOW)⚠$(C_RESET) FORTYTWO_CLIENT_ID vide dans backend/.env → 42 OAuth désactivé"; \
	fi
	@echo "$(C_GREEN)✓ Setup terminé$(C_RESET)"

check-deps: ## Vérifie $(DOCKER) / $(DOCKER) compose / openssl
	@command -v $(DOCKER) >/dev/null 2>&1 || { echo "$(C_RED)✗ $(DOCKER) manquant$(C_RESET)"; exit 1; }
	@$(COMPOSE) version >/dev/null 2>&1 || { echo "$(C_RED)✗ $(DOCKER) compose manquant$(C_RESET)"; exit 1; }
	@command -v openssl >/dev/null 2>&1 || { echo "$(C_RED)✗ openssl manquant$(C_RESET)"; exit 1; }
	@echo "$(C_GREEN)✓ Dépendances OK$(C_RESET)"

regen-env: ## Supprime et régénère les .env (Interactif)
	@echo "$(C_YELLOW)⚠ Supprime .env, backend/.env, frontend/.env et régénère$(C_RESET)"
	@read -p "Confirmer ? (y/N) : " c; \
	if [ "$$c" = "y" ] || [ "$$c" = "Y" ]; then \
		rm -f .env backend/.env frontend/.env; \
		$(MAKE) setup; \
	else \
		echo "$(C_GREEN)✓ Annulé$(C_RESET)"; \
	fi

doctor: ## Diagnostique l'environnement (dépendances, .env, secrets, docker, db)
	@echo ""
	@echo "$(C_BOLD)$(C_BLUE)=== Doctor $(NAME) ===$(C_RESET)"
	@echo ""
	@# 1. Dépendances système
	@echo "$(C_BOLD)[1] Dépendances système$(C_RESET)"
	@command -v $(DOCKER) >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) $(DOCKER)" || echo "  $(C_RED)✗$(C_RESET) $(DOCKER) manquant"
	@$(COMPOSE) version >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) $(DOCKER) compose" || echo "  $(C_RED)✗$(C_RESET) $(DOCKER) compose manquant"
	@command -v openssl >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) openssl" || echo "  $(C_RED)✗$(C_RESET) openssl manquant"
	@echo ""
	@# 2. Fichiers .env
	@echo "$(C_BOLD)[2] Fichiers .env$(C_RESET)"
	@for f in .env backend/.env frontend/.env; do \
		[ -f "$$f" ] && echo "  $(C_GREEN)✓$(C_RESET) $$f" || echo "  $(C_RED)✗$(C_RESET) $$f manquant → 'make setup'"; \
	done
	@echo ""
	@# 3. Placeholders à compléter
	@echo "$(C_BOLD)[3] Secrets à compléter$(C_RESET)"
	@found=0; \
	for f in .env backend/.env frontend/.env; do \
		if [ -f "$$f" ] && grep -qE "GENERATE_ME|CHANGEME" "$$f"; then \
			echo "  $(C_RED)✗$(C_RESET) Placeholders dans $$f:"; \
			grep -nE "GENERATE_ME|CHANGEME" "$$f" | sed 's/^/        /'; \
			found=1; \
		fi; \
	done; \
	if [ -f backend/.env ] && grep -qE '^FORTYTWO_CLIENT_ID=""?$$' backend/.env; then \
		echo "  $(C_YELLOW)⚠$(C_RESET) FORTYTWO_CLIENT_ID vide dans backend/.env (42 OAuth désactivé)"; \
		found=1; \
	fi; \
	[ $$found -eq 0 ] && echo "  $(C_GREEN)✓$(C_RESET) Aucun placeholder détecté"
	@echo ""
	@# 4. Docker state
	@echo "$(C_BOLD)[4] Docker$(C_RESET)"
	@running=$$($(COMPOSE) ps --services --filter status=running 2>/dev/null | grep -c .); \
	if [ "$$running" -gt 0 ]; then \
		echo "  $(C_GREEN)✓$(C_RESET) $$running service(s) actif(s):"; \
		$(COMPOSE) ps --services --filter status=running | sed 's/^/        - /'; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) Aucun service actif → 'make up' ou 'make'"; \
	fi
	@echo ""
	@# 5. DB accessible (si db up)
	@echo "$(C_BOLD)[5] Base de données$(C_RESET)"
	@if $(COMPOSE) ps --services --filter status=running 2>/dev/null | grep -q "^db$$"; then \
		$(COMPOSE) exec -T db pg_isready -U $(POSTGRES_USER) >/dev/null 2>&1 \
			&& echo "  $(C_GREEN)✓$(C_RESET) PostgreSQL répond" \
			|| echo "  $(C_RED)✗$(C_RESET) PostgreSQL ne répond pas"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) Container db pas démarré (skip check)"; \
	fi
	@echo ""

check-env: ## Vérifie que les .env sont valides (fail si placeholders restants)
	@missing=0; \
	for f in .env backend/.env frontend/.env; do \
		if [ ! -f "$$f" ]; then \
			echo "$(C_RED)✗$(C_RESET) $$f manquant"; \
			missing=1; \
		fi; \
	done; \
	if [ $$missing -eq 1 ]; then \
		echo "$(C_YELLOW)→ 'make setup' pour générer les .env$(C_RESET)"; \
		exit 1; \
	fi; \
	for f in .env backend/.env frontend/.env; do \
		if grep -qE "GENERATE_ME|CHANGEME" "$$f" 2>/dev/null; then \
			echo "$(C_RED)✗$(C_RESET) Placeholders non résolus dans $$f:"; \
			grep -nE "GENERATE_ME|CHANGEME" "$$f" | sed 's/^/      /'; \
			missing=1; \
		fi; \
	done; \
	if [ $$missing -eq 1 ]; then \
		echo "$(C_YELLOW)→ Édite les fichiers ou 'make regen-env' pour regénérer$(C_RESET)"; \
		exit 1; \
	fi; \
	echo "$(C_GREEN)✓ Env valides$(C_RESET)"