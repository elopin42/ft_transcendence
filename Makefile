.PHONY: all run logs clean fclean re

all:
	docker-compose up --build

run:
	docker-compose up

rund:
	docker-compose up -d

logs:
	docker-compose logs -f

clean:
	docker-compose down

fclean:
	docker-compose down -v

re: clean run
ra: clean all
rme: fclean run
rvme: fclean all
