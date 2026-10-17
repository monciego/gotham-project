FROM php:8.4-cli

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions pdo_pgsql redis intl zip pcntl bcmath

# Run as your host user so files written to the bind mount (vendor, storage,
# generated migrations) stay editable outside the container.
ARG HOST_UID=1000
ARG HOST_GID=1000
RUN groupadd --gid "${HOST_GID}" --non-unique gotham \
    && useradd --uid "${HOST_UID}" --gid "${HOST_GID}" --non-unique --create-home gotham

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

USER gotham
WORKDIR /app

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
