#!/usr/bin/env bash
set -euo pipefail

# You may run this image using spark-submit in cluster (recommended).
# For convenience: if SPARK_MASTER is provided, run local-mode; otherwise, expect spark-submit provided by the Kubernetes spark-operator.

if [ -z "${SPARK_SUBMIT_ARGS:-}" ]; then
  # run with embedded pyspark (local) for dev/testing
  python3 /app/app.py
else
  # used by spark-submit wrapper in cluster
  exec spark-submit $SPARK_SUBMIT_ARGS /app/app.py
fi
