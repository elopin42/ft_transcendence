.DEFAULT_GOAL := all

include build.mk
include make/color.mk

-include make/setup.mk
include make/docker.mk
-include make/db.mk

.PHONY: all clean fclean ffclean help re ra rme rvme rr

all: setup check-env ## Setup + vérif env + build + démarrage (non-interactif)
	@echo "$(C_BLUE)🔨 Construction...$(C_RESET)"
	@$(COMPOSE) build
	@echo "$(C_BLUE)🚀 Démarrage...$(C_RESET)"
	@$(COMPOSE) up -d
	@echo ""
	@echo "  App:     $(C_GREEN)https://$(DOMAIN_NAME)$(C_RESET)"
	@echo "  Logs:    make logs"
	@echo "  Down:    make down"
	@echo "  Reset:   make re"
	@echo "  Help:    make help"
	@echo ""

clean: docker-clean ## Stop + supprime volumes
	@echo "$(C_GREEN)✓ clean OK$(C_RESET)"

fclean: docker-fclean ## clean + supprime images
	@echo "$(C_GREEN)✓ fclean OK$(C_RESET)"

ffclean: docker-prune ## Nettoyage Docker total (toutes images machine)
	@echo "$(C_GREEN)✓ ffclean OK$(C_RESET)"

re: fclean all ## Reset complet + rebuild
ra: clean all ## Reset (garde images) + rebuild
rme: fclean up ## Reset complet sans rebuild
rvme: fclean all ## Alias de re
rr: clean up ## Reset léger sans rebuild

help: ## Affiche ce menu d'aide dynamique
	@echo "$(C_BLUE)$(C_BOLD)=== $(NAME) - Menu d'aide ===$(C_RESET)"
	@echo "Utilisation : make $(C_CYAN)<commande>$(C_RESET)\n"
	@awk 'BEGIN {FS = ":.*##"; printf "Commandes disponibles :\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(C_CYAN)%-20s$(C_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)