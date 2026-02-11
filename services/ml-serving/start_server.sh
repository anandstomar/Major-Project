#!/usr/bin/env bash
set -euo pipefail
# If you use gunicorn for concurrency in K8s:
exec gunicorn -k uvicorn.workers.UvicornWorker "app.server:app" \
  --bind 0.0.0.0:8080 \
  --workers ${WEB_CONCURRENCY:-2} \
  --timeout 120
