#include build.mk
#include init.mk

.PHONY: all run logs clean fclean re db migrate seed init

all: init
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
# Prisma Studio via Docker 
db:
	@echo "Prisma Studio: http://localhost:5555"
	docker compose run --rm -p 5555:5555 backend npx prisma studio --port 5555 --browser none

# Migrations prisma qui soule via Docker dois etre run
migrate:
	docker compose exec backend npx prisma migrate dev

# Seed via Docker
seed:
	docker compose exec backend npx ts-node prisma/seed.ts
