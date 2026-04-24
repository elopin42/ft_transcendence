# === Makefile de docker ===

.PHONY: up down build start stop restart logs ps top images docker-clean docker-fclean docker-prune shell

build: ## Construit ou reconstruit les images (Interactif)
	@read -p "Service spécifique à build (laisser vide pour tous) : " svc; \
	read -p "Options (ex: --no-cache, laisser vide sinon) : " opts; \
	echo "$(C_BLUE)🔨 Construction...$(C_RESET)"; \
	$(COMPOSE) build $$opts $$svc

up: ## Démarre les conteneurs en arrière-plan (Interactif)
	@read -p "Service spécifique à démarrer (laisser vide pour tous) : " svc; \
	echo "$(C_BLUE)🚀 Démarrage...$(C_RESET)"; \
	$(COMPOSE) up -d $$svc; \
	if [ -z "$$svc" ]; then \
		echo "$(C_GREEN)✓ Environnement complet prêt !$(C_RESET)"; \
	else \
		echo "$(C_GREEN)✓ Service '$$svc' prêt !$(C_RESET)"; \
	fi

down: ## Arrête les conteneurs et le réseau
	@echo "$(C_YELLOW)🛑 Arrêt de l'environnement...$(C_RESET)"
	$(COMPOSE) down

start: ## Démarre des conteneurs existants (Interactif)
	@read -p "Service spécifique à démarrer (laisser vide pour tous) : " svc; \
	$(COMPOSE) start $$svc

stop: ## Arrête des conteneurs existants sans les détruire (Interactif)
	@read -p "Service spécifique à arrêter (laisser vide pour tous) : " svc; \
	$(COMPOSE) stop $$svc

restart: ## Redémarre les conteneurs (Interactif)
	@read -p "Service spécifique à redémarrer (laisser vide pour tous) : " svc; \
	$(COMPOSE) restart $$svc

# Status
logs: ## Affiche les logs en temps réel (Interactif)
	@read -p "Service spécifique à observer (laisser vide pour tous) : " svc; \
	$(COMPOSE) logs -f $$svc

ps: ## Liste les conteneurs du projet
	$(COMPOSE) ps

top: ## Affiche les processus tournant dans les conteneurs
	$(COMPOSE) top

images: ## Liste les images créées par le projet
	$(COMPOSE) images

# Shell
shell: ## Ouvre un shell interactif dans le conteneur de ton choix
	@echo "$(C_YELLOW)Services courants : backend, frontend, db, nginx$(C_RESET)"
	@read -p "Dans quel conteneur veux-tu entrer ? : " svc; \
	if [ -z "$$svc" ]; then echo "$(C_RED)❌ Nom du service requis$(C_RESET)"; exit 1; fi; \
	echo "$(C_CYAN)🐚 Connexion au conteneur $$svc...$(C_RESET)"; \
	$(COMPOSE) exec $$svc /bin/sh

docker-clean: ## Arrête et supprime les conteneurs et volumes (sans toucher aux images)
	@echo "$(C_YELLOW)🧹 Nettoyage de l'environnement courant...$(C_RESET)"
	$(COMPOSE) down -v

docker-fclean: ## Nettoyage complet (conteneurs, volumes, images, orphelins)
	@echo "$(C_RED)🗑️ Suppression totale (images et volumes)...$(C_RESET)"
	$(COMPOSE) down -v --rmi all --remove-orphans

docker-prune: ## ⚠️ DANGER: Purge tout Docker sur la machine (Interactif)
	@echo "$(C_RED)⚠️ ATTENTION : Purge complète du système Docker !$(C_RESET)"
	@read -p "Es-tu sûr de vouloir tout supprimer (y/N) ? : " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(DOCKER) system prune -af --volumes; \
		echo "$(C_GREEN)✓ Système $(DOCKER) purgé.$(C_RESET)"; \
	else \
		echo "$(C_GREEN)✓ Opération annulée.$(C_RESET)"; \
	fi
