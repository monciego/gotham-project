# Lets the API container run as your user, so files it creates stay editable.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

# Mount points for the web container's node_modules volumes. If Docker creates
# them it makes them root-owned, which breaks pnpm install on the host.
NODE_MODULES_DIRS := node_modules apps/web/node_modules packages/ui/node_modules packages/eslint-config/node_modules

.PHONY: dev down fresh api migrate seed api-init mountpoints

dev: mountpoints
	docker compose up

down:
	docker compose down

# Deletes the postgres, redis and node_modules volumes, so all data is wiped.
fresh: mountpoints
	docker compose down -v && docker compose up --build

mountpoints:
	@mkdir -p $(NODE_MODULES_DIRS)

api:
	docker compose exec api bash

migrate:
	docker compose exec api php artisan migrate

seed:
	docker compose exec api php artisan db:seed

# One-time: scaffold Laravel into apps/api, keeping the Docker files and the
# Gotham .env.example already there.
api-init:
	docker compose build api
	docker compose run --rm --no-deps --entrypoint sh api -c '\
		composer create-project --no-interaction laravel/laravel /tmp/laravel && \
		tar -C /tmp/laravel --exclude=./.env --exclude=./.env.example \
			--exclude=./database/database.sqlite -cf - . | tar -C /app -xf -'
