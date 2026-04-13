include build.mk

.PHONY: up down logs fclean ffclean db migrate seed

up:
	$(COMPOSE) up --build -d
	@echo ""
	@echo "  App:     https://localhost"
	@echo "  Logs:    make logs"
	@echo ""

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

fclean:
	$(COMPOSE) down -v

ffclean:
	$(COMPOSE) down -v --rmi all
	docker system prune -af --volumes
	@echo "Docker nettoyé"

db:
	@echo "Prisma Studio: http://localhost:5555"
	$(COMPOSE) run --rm -p 5555:5555 backend npx prisma studio --port 5555 --browser none

migrate:
	$(COMPOSE) exec backend npx prisma migrate dev

seed:
	$(COMPOSE) exec backend npx ts-node prisma/seed.ts