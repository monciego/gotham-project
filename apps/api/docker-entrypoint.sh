#!/bin/sh
set -e

if [ ! -f artisan ]; then
    echo "apps/api has no Laravel app yet. Run 'make api-init' first." >&2
    exit 1
fi

[ -f vendor/autoload.php ] || composer install --no-interaction
[ -f .env ] || cp .env.example .env
grep -Eq '^APP_KEY=.+' .env || php artisan key:generate
# Serves uploaded avatars at APP_URL/storage
[ -e public/storage ] || php artisan storage:link

exec "$@"
