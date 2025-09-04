#!/usr/bin/env bash
set -xe
echo "===> ENTRYPOINT v4 starting"

# Work from the folder that contains manage.py
cd /app

echo "Applying migrations and collecting static files..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

# Hand off to the container's CMD
exec "$@"

