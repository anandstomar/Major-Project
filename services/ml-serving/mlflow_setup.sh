#!/usr/bin/env bash
# Example envs - set them in CI / k8s secret
export MLFLOW_TRACKING_URI=http://mlflow:5000  # or http://localhost:5000
# If using mlflow server with S3/minio configure backend store and artifact store in mlflow server.
# Also ensure AWS envs available to allow MLflow to push artifacts to MinIO
export AWS_ACCESS_KEY_ID=minioadmin
export AWS_SECRET_ACCESS_KEY=minioadmin
export MLFLOW_S3_ENDPOINT_URL=http://minio:9000

echo "Set MLFLOW_TRACKING_URI to $MLFLOW_TRACKING_URI"
