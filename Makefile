.DEFAULT_GOAL := all

include build.mk
include make/color.mk

-include make/setup.mk
include make/docker.mk
-include make/db.mk
-include make/tests.mk

.PHONY: all clean fclean ffclean help re ra rme rvme rr clean-null print-runtime

# Purge les NULL bytes residuels dans les sources (.ts/.tsx/.json/.mjs).
# Cause : combo NTFS WSL2 (/mnt/c/...) + writes partiels d'editeurs ou outils
# qui pad les fichiers avec des NULL en fin. SWC/Turbopack/tsc plantent dessus
# avec "Invalid character" sans indiquer la ligne. No-op sur Linux ext4 natif.
# A retirer le jour ou le projet vit hors de /mnt/c/.
# Ref : https://github.com/microsoft/WSL/issues/8474
clean-null:
	@find apps packages -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' -o -name '*.mjs' \) \
		-exec sed -i 's/\x00//g' {} + 2>/dev/null || true

print-runtime:
	@echo "$(C_BLUE)→ Runtime detecte : $(C_CYAN)$(DOCKER) ($(COMPOSE))$(C_RESET)"

# Pipeline complet :
#   1. setup        -> genere les .env si absents (idempotent)
#   2. clean-null   -> purge NULL bytes WSL2/NTFS sur les sources
#   3. check-env    -> valide .env (placeholders, longueurs JWT/2FA)
#   4. build        -> docker/podman compose build
#   5. up           -> docker/podman compose up -d
#   6. wait-healthy -> sonde /api/health jusqu'a 200 OK
#   7. seed         -> peuple la DB avec les comptes dev (idempotent)
#
# Marche sur Fedora (podman) / Debian / Ubuntu / WSL2 sans changement.
all: print-runtime setup clean-null check-env ## Setup + verif env + build + demarrage + seed
	@echo "$(C_BLUE)🔨 Construction...$(C_RESET)"
	@$(COMPOSE) build
	@echo "$(C_BLUE)🚀 Demarrage...$(C_RESET)"
	@$(COMPOSE) up -d
	@$(MAKE) --no-print-directory wait-healthy
	@$(MAKE) --no-print-directory seed
	@echo ""
	@echo "  App:     $(C_GREEN)https://$(DOMAIN_NAME)$(C_RESET)"
	@echo "  Logs:    make logs"
	@echo "  Down:    make down"
	@echo "  Reset:   make re"
	@echo "  Tests:   make tests"
	@echo "  Help:    make help"
	@echo ""

clean: docker-clean ## Stop + supprime volumes
	@echo "$(C_GREEN)✓ clean OK$(C_RESET)"

fclean: docker-fclean ## clean + supprime images
	@echo "$(C_GREEN)✓ fclean OK$(C_RESET)"

ffclean: fclean docker-prune ## Nettoyage Docker total (toutes images machine)
	@echo "$(C_GREEN)✓ ffclean OK$(C_RESET)"

re: fclean all ## Reset complet + rebuild
ra: down all ## Reset (garde images) + rebuild
rme: fclean up ## Reset complet sans rebuild
rvme: fclean all ## Alias de re
rr: clean up ## Reset léger sans rebuild

status: ps

help: ## Affiche ce menu d'aide dynamique
	@echo "$(C_BLUE)$(C_BOLD)=== $(NAME) - Menu d'aide ===$(C_RESET)"
	@echo "Utilisation : make $(C_CYAN)<commande>$(C_RESET)\n"
	@awk 'BEGIN {FS = ":.*##"; printf "Commandes disponibles :\n"} /^[a-zA-Z0-9_.-]+:.*?##/ { printf "  $(C_CYAN)%-20s$(C_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
