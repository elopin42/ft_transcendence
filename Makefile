.PHONY: all run logs clean fclean re

all:
	docker-compose up --build

run:
	docker-compose up -d

logs:
	docker-compose logs -f

clean:
	docker-compose down

fclean:
	docker-compose down -v

re: clean all
