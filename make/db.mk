# === Makefile de database ===

.PHONY: migrate migrate-apply migrate-status db-reset db-generate db-studio seed

migrate: ## Crée et applique une nouvelle migration (Interactif)
	@echo "$(C_BLUE)📝 Création d'une nouvelle migration Prisma...$(C_RESET)"
	@read -p "Nom de la migration (ex: add_user_points) : " name; \
	if [ -z "$$name" ]; then echo "$(C_RED)❌ Erreur: Nom requis$(C_RESET)"; exit 1; fi; \
	$(COMPOSE) exec backend npx prisma migrate dev --name $$name && \
	echo "$(C_BLUE)⚙️ Régénération du client Prisma...$(C_RESET)" && \
	$(COMPOSE) exec backend npx prisma generate && \
	echo "$(C_BLUE)🔄 Restart backend pour recharger le client...$(C_RESET)" && \
	$(COMPOSE) restart backend && \
	echo "$(C_GREEN)✓ Migration '$$name' générée, appliquée et backend rechargé !$(C_RESET)" && \
	echo "$(C_YELLOW)⚠️ Pense à git add backend/prisma/migrations/$(C_RESET)"

migrate-apply: ## Applique les migrations existantes en attente
	@echo "$(C_BLUE)🔄 Application des migrations...$(C_RESET)"
	$(COMPOSE) exec backend npx prisma migrate deploy

migrate-status: ## Vérifie l'état des migrations
	@echo "$(C_BLUE)📊 Vérification de l'état des migrations...$(C_RESET)"
	$(COMPOSE) exec backend npx prisma migrate status

db-reset: ## ⚠️ DANGER: DROP la DB, la recrée et relance les migrations (Interactif)
	@echo "$(C_RED)⚠️ ATTENTION : Cette action va DÉTRUIRE TOUTES LES DONNÉES de la base !$(C_RESET)"
	@read -p "Es-tu sûr de vouloir réinitialiser la base de données ? (y/N) : " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(C_YELLOW)💣 Réinitialisation en cours...$(C_RESET)"; \
		$(COMPOSE) exec backend npx prisma migrate reset --force; \
	else \
		echo "$(C_GREEN)✓ Annulation. Tes données sont intactes.$(C_RESET)"; \
	fi

db-generate: ## Génère le client Prisma (après modif schema sans migration)
	@echo "$(C_BLUE)⚙️ Génération du client Prisma...$(C_RESET)"
	$(COMPOSE) exec backend npx prisma generate

db: ## Lance Prisma Studio (interface web DB) sur le port 5555
	@echo "$(C_GREEN)📊 Démarrage de Prisma Studio...$(C_RESET)"
	@echo " 🔗 Accès : http://localhost:5555"
	$(COMPOSE) run --rm -p 5555:5555 backend npx prisma studio --port 5555 --browser none

seed: ## Peuple la base de données avec les données par défaut
	@# tsx au lieu de ts-node : @ftt/shared est en "type": "module" (ESM),
	@# ts-node CJS ne sait pas le require. tsx gere ESM/CJS interop nativement.
	@echo "$(C_BLUE)🌱 Lancement du seed script...$(C_RESET)"
	$(COMPOSE) exec backend npx tsx prisma/seed.ts