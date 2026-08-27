FROM php:8.3-apache

# extensao PDO Postgres
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Render injeta a porta em $PORT (padrao 10000)
RUN sed -i 's/80/10000/g' /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf
EXPOSE 10000

COPY . /var/www/html/

# permissoes basicas
RUN chown -R www-data:www-data /var/www/html