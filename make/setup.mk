# === Setup, vérifications et diagnostic ===
# Retire l'include build.mk : le Makefile racine le charge déjà avant cet include

.PHONY: setup check-deps check-env fix-env doctor regen-env check-i18n sync-i18n

setup: check-deps ## Génère les .env depuis build.mk (idempotent, skip si existent)
	@echo "$(C_BLUE)🔧 Initialisation de l'environnement...$(C_RESET)"
	@# .env racine : source de verite des vars partagees back+front (DB, JWT, NEXT_PUBLIC_*)
	@# JWT_SECRET = 256 bits HS256 (RFC 7518) -> openssl rand -hex 32 (32 bytes = 64 hex chars)
	@# TWO_FA_ENCRYPTION_KEY = 256 bits AES-256-GCM (NIST SP 800-38D) -> idem
	@if [ ! -f .env ]; then \
		JWT=$$(openssl rand -hex 32); \
		TFA=$$(openssl rand -hex 32); \
		printf "# Genere par 'make setup' (source: build.mk)\n\nDOMAIN_NAME=%s\nCORS_ORIGIN=%s\n\nPOSTGRES_USER=%s\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=%s\n\nJWT_SECRET=\"%s\"\nJWT_EXPIRATION=\"%s\"\nJWT_REFRESH_EXPIRATION=\"%s\"\nTWO_FA_ENCRYPTION_KEY=\"%s\"\n\nNEXT_PUBLIC_API_URL=https://%s/api\nNEXT_PUBLIC_SOCKET_URL=https://%s\nNEXT_PUBLIC_DEFAULT_LOCALE=%s\n" \
			"$(DOMAIN_NAME)" "$(CORS_ORIGIN)" "$(POSTGRES_USER)" "$(POSTGRES_PASSWORD)" "$(POSTGRES_DB)" "$$JWT" "$(JWT_EXPIRATION)" "$(JWT_REFRESH_EXPIRATION)" "$$TFA" "$(DOMAIN_NAME)" "$(DOMAIN_NAME)" "$(DEFAULT_LOCALE)" > .env; \
		echo "  $(C_GREEN)✓$(C_RESET) .env cree (JWT_SECRET + TWO_FA_ENCRYPTION_KEY = 64 hex chars / 256 bits)"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) .env existe deja (skip)"; \
	fi
	@# apps/backend/.env (ENV_MODE NestJS, valeurs : development | production)
	@if [ ! -f apps/backend/.env ]; then \
		printf "# Généré par 'make setup' (source: build.mk)\n\nENV_MODE=%s\nDATABASE_URL=\"%s\"\nPORT=%s\nTHROTTLER_DISABLED=%s\n\nFORTYTWO_CLIENT_ID=\"%s\"\nFORTYTWO_CLIENT_SECRET=\"%s\"\nFORTYTWO_CALLBACK_URL=\"%s\"\n" \
			"$(ENV_MODE)" "$(DATABASE_URL)" "$(BACKEND_PORT)" "$(THROTTLER_DISABLED)" "$(FORTYTWO_CLIENT_ID)" "$(FORTYTWO_CLIENT_SECRET)" "$(FORTYTWO_CALLBACK_URL)" > apps/backend/.env; \
		echo "  $(C_GREEN)✓$(C_RESET) apps/backend/.env créé (mode=$(ENV_MODE), throttler_disabled=$(THROTTLER_DISABLED))"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) apps/backend/.env existe déjà (skip)"; \
	fi
	@# apps/frontend/.env (purement frontend : PORT lu par `next start` au runtime)
	@# Les NEXT_PUBLIC_* vivent dans le .env racine, source unique de verite,
	@# et sont passes en build args par compose.yml.
	@if [ ! -f apps/frontend/.env ]; then \
		printf "# Genere par 'make setup' (source: build.mk)\n# NEXT_PUBLIC_* sont dans le .env racine et arrivent en build args.\n\nPORT=%s\n" \
			"$(FRONTEND_PORT)" > apps/frontend/.env; \
		echo "  $(C_GREEN)✓$(C_RESET) apps/frontend/.env cree (PORT seulement)"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) apps/frontend/.env existe deja (skip)"; \
	fi
	@# Warnings persistants (affichés même quand skip)
	@if [ -f apps/backend/.env ] && grep -qE '^FORTYTWO_CLIENT_ID=""?$$' apps/backend/.env; then \
		echo "  $(C_YELLOW)⚠$(C_RESET) FORTYTWO_CLIENT_ID vide dans apps/backend/.env -> 42 OAuth désactivé"; \
	fi
	@echo "$(C_GREEN)✓ Setup terminé$(C_RESET)"

check-deps: ## Verifie runtime container ($(DOCKER)) + compose + openssl + curl
	@# Le projet tourne entierement en container : node, npm, prisma, etc. vivent
	@# tous dans les images Docker. Cote hote, il faut UNIQUEMENT docker/podman,
	@# compose, openssl (pour les secrets) et curl (pour wait-healthy + tests).
	@# AUCUNE dependance npm/node hote n'est requise -> pas de souci avec le
	@# npm 8 des postes ecole Fedora 39+ / Debian 12 / Ubuntu 22.04.
	@if ! command -v $(DOCKER) >/dev/null 2>&1; then \
		echo "$(C_RED)✗ '$(DOCKER)' introuvable$(C_RESET)" ; \
		echo "  Fedora :  $(C_CYAN)sudo dnf install podman podman-compose$(C_RESET) (ou docker-ce)" ; \
		echo "  Debian :  $(C_CYAN)sudo apt install docker.io docker-compose-plugin$(C_RESET)" ; \
		echo "  Ubuntu :  $(C_CYAN)sudo apt install docker.io docker-compose-v2$(C_RESET)" ; \
		echo "  Override : $(C_CYAN)make DOCKER=podman ...$(C_RESET)" ; \
		exit 1 ; \
	fi
	@if ! $(COMPOSE) version >/dev/null 2>&1; then \
		echo "$(C_RED)✗ '$(COMPOSE)' ne repond pas$(C_RESET)" ; \
		echo "  Tente : $(C_CYAN)$(DOCKER) compose version$(C_RESET) ou install docker-compose-plugin" ; \
		exit 1 ; \
	fi
	@command -v openssl >/dev/null 2>&1 || { \
		echo "$(C_RED)✗ openssl manquant$(C_RESET) (genere JWT_SECRET / TWO_FA_ENCRYPTION_KEY)" ; \
		echo "  Fedora : $(C_CYAN)sudo dnf install openssl$(C_RESET)" ; \
		echo "  Debian/Ubuntu : $(C_CYAN)sudo apt install openssl$(C_RESET)" ; \
		exit 1 ; \
	}
	@command -v curl >/dev/null 2>&1 || { \
		echo "$(C_RED)✗ curl manquant$(C_RESET) (utilise par make tests + make wait-healthy)" ; \
		echo "  Fedora : $(C_CYAN)sudo dnf install curl$(C_RESET)" ; \
		echo "  Debian/Ubuntu : $(C_CYAN)sudo apt install curl$(C_RESET)" ; \
		exit 1 ; \
	}
	@echo "$(C_GREEN)✓ Dependances OK ($(DOCKER) + $(COMPOSE) + openssl + curl)$(C_RESET)"

regen-env: ## Supprime et régénère les .env (Interactif)
	@echo "$(C_YELLOW)⚠ Supprime .env, apps/backend/.env, apps/frontend/.env et régénère$(C_RESET)"
	@read -p "Confirmer ? (y/N) : " c; \
	if [ "$$c" = "y" ] || [ "$$c" = "Y" ]; then \
		rm -f .env apps/backend/.env apps/frontend/.env; \
		$(MAKE) setup; \
	else \
		echo "$(C_GREEN)✓ Annulé$(C_RESET)"; \
	fi

doctor: ## Diagnostique l'environnement (dépendances, .env, secrets, docker, db)
	@echo ""
	@echo "$(C_BOLD)$(C_BLUE)=== Doctor $(NAME) ===$(C_RESET)"
	@echo ""
	@echo "$(C_BOLD)[1] Dépendances système$(C_RESET)"
	@command -v $(DOCKER) >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) $(DOCKER)" || echo "  $(C_RED)✗$(C_RESET) $(DOCKER) manquant"
	@$(COMPOSE) version >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) $(DOCKER) compose" || echo "  $(C_RED)✗$(C_RESET) $(DOCKER) compose manquant"
	@command -v openssl >/dev/null 2>&1 && echo "  $(C_GREEN)✓$(C_RESET) openssl" || echo "  $(C_RED)✗$(C_RESET) openssl manquant"
	@echo ""
	@echo "$(C_BOLD)[2] Fichiers .env$(C_RESET)"
	@for f in .env apps/backend/.env apps/frontend/.env; do \
		[ -f "$$f" ] && echo "  $(C_GREEN)✓$(C_RESET) $$f" || echo "  $(C_RED)✗$(C_RESET) $$f manquant -> 'make setup'"; \
	done
	@echo ""
	@echo "$(C_BOLD)[3] Secrets à compléter$(C_RESET)"
	@found=0; \
	for f in .env apps/backend/.env apps/frontend/.env; do \
		if [ -f "$$f" ] && grep -qE "GENERATE_ME|CHANGEME" "$$f"; then \
			echo "  $(C_RED)✗$(C_RESET) Placeholders dans $$f:"; \
			grep -nE "GENERATE_ME|CHANGEME" "$$f" | sed 's/^/        /'; \
			found=1; \
		fi; \
	done; \
	if [ -f apps/backend/.env ] && grep -qE '^FORTYTWO_CLIENT_ID=""?$$' apps/backend/.env; then \
		echo "  $(C_YELLOW)⚠$(C_RESET) FORTYTWO_CLIENT_ID vide dans apps/backend/.env (42 OAuth désactivé)"; \
		found=1; \
	fi; \
	[ $$found -eq 0 ] && echo "  $(C_GREEN)✓$(C_RESET) Aucun placeholder détecté"
	@echo ""
	@echo "$(C_BOLD)[4] Docker$(C_RESET)"
	@running=$$($(COMPOSE) ps --services --filter status=running 2>/dev/null | grep -c .); \
	if [ "$$running" -gt 0 ]; then \
		echo "  $(C_GREEN)✓$(C_RESET) $$running service(s) actif(s):"; \
		$(COMPOSE) ps --services --filter status=running | sed 's/^/        - /'; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) Aucun service actif -> 'make up' ou 'make'"; \
	fi
	@echo ""
	@echo "$(C_BOLD)[5] Base de données$(C_RESET)"
	@if $(COMPOSE) ps --services --filter status=running 2>/dev/null | grep -q "^db$$"; then \
		$(COMPOSE) exec -T db pg_isready -U $(POSTGRES_USER) >/dev/null 2>&1 \
			&& echo "  $(C_GREEN)✓$(C_RESET) PostgreSQL répond" \
			|| echo "  $(C_RED)✗$(C_RESET) PostgreSQL ne répond pas"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) Container db pas démarré (skip check)"; \
	fi
	@echo ""

check-env: ## Verifie que les .env sont valides (presence + secrets + format hex strict)
	@bad=0; \
	for f in .env apps/backend/.env apps/frontend/.env; do \
		if [ ! -f "$$f" ]; then \
			echo "$(C_RED)✗$(C_RESET) $$f manquant"; \
			bad=1; \
		fi; \
	done; \
	if [ $$bad -eq 1 ]; then \
		echo "$(C_YELLOW)-> 'make setup' pour generer les .env$(C_RESET)"; \
		exit 1; \
	fi; \
	for f in .env apps/backend/.env apps/frontend/.env; do \
		if grep -qE "GENERATE_ME|CHANGEME" "$$f" 2>/dev/null; then \
			echo "$(C_RED)✗$(C_RESET) Placeholders non resolus dans $$f:"; \
			grep -nE "GENERATE_ME|CHANGEME" "$$f" | sed 's/^/      /'; \
			bad=1; \
		fi; \
	done; \
	jwt=$$(grep -E "^JWT_SECRET=" .env | sed -E 's/^JWT_SECRET="?([^"]*)"?$$/\1/'); \
	if ! printf "%s" "$$jwt" | grep -qE '^[0-9a-fA-F]{64}$$'; then \
		jwt_len=$$(printf "%s" "$$jwt" | wc -c); \
		echo "$(C_RED)✗$(C_RESET) JWT_SECRET invalide (a $$jwt_len chars, attendu 64 hex pile = 256 bits)"; bad=1; \
	fi; \
	tfa=$$(grep -E "^TWO_FA_ENCRYPTION_KEY=" .env | sed -E 's/^TWO_FA_ENCRYPTION_KEY="?([^"]*)"?$$/\1/'); \
	if ! printf "%s" "$$tfa" | grep -qE '^[0-9a-fA-F]{64}$$'; then \
		tfa_len=$$(printf "%s" "$$tfa" | wc -c); \
		echo "$(C_RED)✗$(C_RESET) TWO_FA_ENCRYPTION_KEY invalide (a $$tfa_len chars, attendu 64 hex pile = AES-256)"; bad=1; \
	fi; \
	if ! grep -qE "^DOMAIN_NAME=" .env; then \
		echo "$(C_RED)✗$(C_RESET) DOMAIN_NAME manquant dans .env"; bad=1; \
	fi; \
	if ! grep -qE "^NEXT_PUBLIC_DEFAULT_LOCALE=" .env; then \
		echo "$(C_YELLOW)⚠$(C_RESET) NEXT_PUBLIC_DEFAULT_LOCALE absent -> fallback 'fr'"; \
	fi; \
	if [ $$bad -eq 1 ]; then \
		echo "$(C_YELLOW)-> 'make fix-env' pour regenerer uniquement les secrets cassés$(C_RESET)"; \
		echo "$(C_YELLOW)   (ou 'make regen-env' pour tout regenerer interactivement)$(C_RESET)"; \
		exit 1; \
	fi; \
	echo "$(C_GREEN)✓ Env valides (JWT 64 hex, 2FA 64 hex, pas de placeholder)$(C_RESET)"

fix-env: ## Regenere uniquement les secrets invalides (JWT_SECRET, TWO_FA_ENCRYPTION_KEY) sans toucher au reste
	@if [ ! -f .env ]; then \
		echo "$(C_RED)✗$(C_RESET) .env manquant -> 'make setup' d'abord"; exit 1; \
	fi
	@jwt=$$(grep -E "^JWT_SECRET=" .env | sed -E 's/^JWT_SECRET="?([^"]*)"?$$/\1/'); \
	if ! printf "%s" "$$jwt" | grep -qE '^[0-9a-fA-F]{64}$$'; then \
		new=$$(openssl rand -hex 32); \
		sed -i.bak -E 's|^JWT_SECRET=.*|JWT_SECRET="'"$$new"'"|' .env; \
		echo "  $(C_GREEN)✓$(C_RESET) JWT_SECRET regenere (64 hex chars)"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) JWT_SECRET deja valide (skip)"; \
	fi
	@tfa=$$(grep -E "^TWO_FA_ENCRYPTION_KEY=" .env | sed -E 's/^TWO_FA_ENCRYPTION_KEY="?([^"]*)"?$$/\1/'); \
	if ! printf "%s" "$$tfa" | grep -qE '^[0-9a-fA-F]{64}$$'; then \
		new=$$(openssl rand -hex 32); \
		sed -i.bak -E 's|^TWO_FA_ENCRYPTION_KEY=.*|TWO_FA_ENCRYPTION_KEY="'"$$new"'"|' .env; \
		echo "  $(C_GREEN)✓$(C_RESET) TWO_FA_ENCRYPTION_KEY regenere (64 hex chars)"; \
	else \
		echo "  $(C_YELLOW)⚠$(C_RESET) TWO_FA_ENCRYPTION_KEY deja valide (skip)"; \
	fi
	@rm -f .env.bak
	@echo "$(C_GREEN)✓ fix-env termine -> 'make re' pour redemarrer$(C_RESET)"

wait-healthy: ## Attend que le backend boot (logs Nest "successfully started" + curl /api/health)
	@# Triple check (le premier qui passe gagne, polling 0.5s) :
	@#   1. Logs backend contiennent "Nest application successfully started"
	@#      -> on sait que Nest a fini de boot meme si nginx n'a pas encore
	@#      les routes mappees (pas d'attente artificielle)
	@#   2. Curl /api/health = 200 (backup, plus lent car passe par nginx)
	@#   3. compose ps --format json : state=restarting/exited -> bail tout
	@#      de suite (env invalide, crash boucle, etc.)
	@max=20; i=0; \
	while [ $$i -lt $$max ]; do \
		i=$$((i+1)); \
		printf "\r$(C_BLUE)⏳ Attente backend healthy$(C_RESET) (%ds/%ds)..." "$$i" "$$max"; \
		if $(COMPOSE) logs --tail 50 backend 2>/dev/null | grep -q "Nest application successfully started"; then \
			printf "\r$(C_GREEN)✓ Backend healthy$(C_RESET) (Nest started)                  \n" ; exit 0 ; \
		fi ; \
		if curl -sk --max-time 1 https://$(DOMAIN_NAME)/api/health 2>/dev/null | grep -q "ok\|status\|health"; then \
			printf "\r$(C_GREEN)✓ Backend healthy$(C_RESET) (api/health OK)                 \n" ; exit 0 ; \
		fi ; \
		state=$$($(COMPOSE) ps --format json backend 2>/dev/null | grep -oE '"State":"[a-z]+"' | head -1 | cut -d'"' -f4) ; \
		if [ "$$state" = "restarting" ] || [ "$$state" = "exited" ]; then \
			printf "\r$(C_RED)✗ Backend en boucle de restart (state=%s)$(C_RESET)        \n" "$$state" ; \
			echo "$(C_YELLOW)→ Probable env invalide ou erreur de boot. Tente :$(C_RESET)" ; \
			echo "    $(C_CYAN)make check-env$(C_RESET)" ; \
			echo "    $(C_CYAN)make fix-env && make re$(C_RESET)" ; \
			echo "    $(C_CYAN)make logs$(C_RESET)  (pour voir l'erreur exacte)" ; \
			exit 1 ; \
		fi ; \
		sleep 1 ; \
	done ; \
	printf "\r$(C_RED)✗ Timeout apres %ds$(C_RESET)                                 \n" "$$max" ; \
	echo "$(C_YELLOW)→ check 'make logs'$(C_RESET)" ; exit 1

# ============================================================================
# i18n : sync entre shared/errors/codes.ts (source de verite) et locales JSON
# ============================================================================

check-i18n: ## Verifie sync entre ERR (shared/errors/codes.ts) et locales JSON
	@echo "$(C_BLUE)🌍 Check i18n (ERR -> locales)$(C_RESET)"
	@python3 -c "$$CHECK_I18N_PY"

sync-i18n: ## Pre-remplit shared/i18n/locales/*.json avec [TODO] pour les cles ERR manquantes
	@echo "$(C_BLUE)🌍 Sync i18n (ajout [TODO] pour les cles manquantes)$(C_RESET)"
	@python3 -c "$$SYNC_I18N_PY"

# Heredocs Python lus par check-i18n / sync-i18n. Definis hors des cibles
# pour eviter l'echappement des $ et des '. La regex extrait les valeurs
# string format 'a.b.c' depuis le .ts (suffisant pour notre format).
define CHECK_I18N_PY
import json, re, sys
from pathlib import Path

root = Path('.')
codes_ts = (root / 'shared/errors/codes.ts').read_text()
codes = set(re.findall(r"'([a-z][a-z_0-9]*(?:\.[a-z][a-z_0-9]*)+)'", codes_ts))
locales = sorted((root / 'shared/i18n/locales').glob('*.json'))
fail = 0

def flatten(obj, prefix=''):
    out = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            out |= flatten(v, prefix + k + '.' if prefix else k + '.')
    else:
        out.add(prefix.rstrip('.'))
    return out

for f in locales:
    data = json.loads(f.read_text())
    keys = flatten(data)
    errors_in_locale = {k for k in keys if k.startswith('errors.')}
    expected = {f"errors.{c}" for c in codes}
    missing = expected - errors_in_locale
    extra = errors_in_locale - expected
    if missing:
        print(f"  \033[31m{chr(0x2717)}\033[0m {f.name} : {len(missing)} cle(s) manquante(s)")
        for k in sorted(missing): print(f"      - {k}")
        fail = 1
    elif extra:
        print(f"  \033[33m{chr(0x26A0)}\033[0m {f.name} : {len(extra)} cle(s) orpheline(s)")
        for k in sorted(extra): print(f"      - {k}")
    else:
        print(f"  \033[32m{chr(0x2713)}\033[0m {f.name} ({len(errors_in_locale)} codes)")

sys.exit(fail)
endef
export CHECK_I18N_PY

define SYNC_I18N_PY
import json, re
from pathlib import Path

root = Path('.')
codes_ts = (root / 'shared/errors/codes.ts').read_text()
codes = sorted(set(re.findall(r"'([a-z][a-z_0-9]*(?:\.[a-z][a-z_0-9]*)+)'", codes_ts)))

def set_nested(obj, path, value):
    keys = path.split('.')
    for k in keys[:-1]:
        if k not in obj or not isinstance(obj[k], dict):
            obj[k] = {}
        obj = obj[k]
    if keys[-1] not in obj:
        obj[keys[-1]] = value

for locale_file in sorted((root / 'shared/i18n/locales').glob('*.json')):
    locale = locale_file.stem
    txt = locale_file.read_text().strip()
    data = json.loads(txt) if txt else {}
    if 'errors' not in data or not isinstance(data['errors'], dict):
        data['errors'] = {}
    added = 0
    for code in codes:
        before = json.dumps(data)
        set_nested(data['errors'], code, f'[TODO {locale}] {code}')
        if json.dumps(data) != before: added += 1
    locale_file.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f"  \033[32m{chr(0x2713)}\033[0m {locale_file.name} : +{added} cle(s)")
endef
export SYNC_I18N_PY
