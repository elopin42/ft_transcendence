#include build.mk
#include init.mk

.PHONY: all run logs down clean fclean ffclean re ra rme rvme db migrate-new migrate-apply migrate-status db-reset db-generate seed

all:
	docker compose up --build -d
	@echo ""
	@echo "  App:     https://localhost"
	@echo "  Logs:    make logs"
	@echo "  Down:    make down"
	@echo "  Reset:   make fclean"
	@echo ""

run:
	docker compose up -d

logs:
	docker compose logs -f

down:
	docker compose down

clean:
	docker compose down -v

fclean:
	docker compose down -v --rmi all

ffclean: fclean
	docker system prune -af --volumes
	@echo "Docker entièrement nettoyé"

re: fclean all
ra: clean all
rme: fclean run
rvme: fclean all


# claude ma fait ca pour qu'on retrouve les lien et accede facilement
# ═══════════════════════════════════════════════════════
# PRISMA / DB
# ═══════════════════════════════════════════════════════

# Créer une nouvelle migration (interactif)
# Usage: make migrate-new
# -> te demande le nom, puis crée + applique la migration
# -> fichier synchronisé sur ton FS grâce au bind mount
migrate-new:
	@read -p "Nom de la migration (ex: add_user_points): " name; \
	if [ -z "$$name" ]; then echo "❌ Nom requis"; exit 1; fi; \
	docker compose exec backend npx prisma migrate dev --name $$name; \
	echo ""; \
	echo "✓ Migration créée: backend/prisma/migrations/"; \
	echo "  Pense à: git add backend/prisma/migrations/ && git commit"

# Appliquer les migrations existantes sans en créer de nouvelle
# Utile après git pull si un collègue a ajouté une migration
migrate-apply:
	docker compose exec backend npx prisma migrate deploy

# Voir l'état des migrations (détecte le drift)
# À lancer avant chaque session de dev pour vérifier que tout est sync
migrate-status:
	docker compose exec backend npx prisma migrate status

# Reset complet DB (dev uniquement - PERTE DE DONNÉES)
# Utile quand drift détecté ou pour repartir propre
db-reset:
	@echo "⚠️  Cette commande va DROP la DB. Ctrl+C pour annuler."
	@sleep 3
	docker compose exec backend npx prisma migrate reset --force

# Régénère le client Prisma (après modif schema.prisma sans migration)
db-generate:
	docker compose exec backend npx prisma generate

# Prisma Studio (interface web pour la DB)
db:
	@echo "Prisma Studio: http://localhost:5555"
	docker compose run --rm -p 5555:5555 backend npx prisma studio --port 5555 --browser none

# Seed : insère les données par défaut (4 comptes dev, etc.)
seed:
	docker compose exec backend npx ts-node prisma/seed.ts