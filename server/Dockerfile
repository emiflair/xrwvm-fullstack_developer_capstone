# server/Dockerfile
FROM python:3.12.0-slim-bookworm

# No .pyc, unbuffered logs, and explicit module path
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP=/app \
    PYTHONPATH=/app

# Work inside /app
WORKDIR $APP

# Install Python deps (copy first for better caching)
COPY requirements.txt $APP/requirements.txt
RUN python -m pip install --upgrade pip && pip install -r $APP/requirements.txt

# Copy everything from server/ into the image
COPY . $APP

# --- DEBUG (one-time): show what's inside the image so we can locate manage.py
RUN echo "== Contents of /app ==" && ls -la /app \
 && echo "== Django files under /app (depth 4) ==" \
 && find /app -maxdepth 4 -name manage.py -print \
 && echo "== Any *djangoapp* directories ==" \
 && find /app -maxdepth 3 -type d -name "*djangoapp*" -print
# --- end DEBUG

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose Django (gunicorn) port
EXPOSE 8000

# Run DB migrations & collectstatic before launching
ENTRYPOINT ["/bin/bash","/app/entrypoint.sh"]

# IMPORTANT: your Django project is "djangoapp"
CMD ["gunicorn", "--chdir", "/app", "--bind", "0.0.0.0:8000", "--workers", "3", "djangoproj.wsgi:application"]

