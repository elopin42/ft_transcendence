.PHONY: all run logs clean fclean re db migrate migrate-docker seed

all:
	docker compose up --build -d
	@echo ""
	@echo "  App:     https://localhost"
	@echo "  Logs:    make logs"
	@echo "  Down:    make clean"
	@echo "  Reset:   make fclean"
	@echo ""

run:
	docker compose up -d

logs:
	docker compose logs -f

down: clean

clean:
	docker compose down

fclean:
	docker compose down -v

ffclean:
	docker compose down -v --rmi all
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
