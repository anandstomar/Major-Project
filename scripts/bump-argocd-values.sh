#!/usr/bin/env bash
set -euo pipefail
MANIFEST=${1:-out/image-manifest.json}
ROOT=$(git rev-parse --show-toplevel || pwd)
echo "Using manifest: $MANIFEST"

for svc in $(jq -r 'keys[]' "$MANIFEST"); do
  image=$(jq -r --arg k "$svc" '.[$k]' "$MANIFEST")
  echo "Service: $svc -> $image"
  APP_DIR="${ROOT}/infra/argocd-apps/${svc}"
  VALUES_FILE="${APP_DIR}/values.yaml"
  if [ -f "$VALUES_FILE" ]; then
    echo "Updating $VALUES_FILE"
    yq eval -i ".image.full = \"${image}\"" "$VALUES_FILE"
    TAG="${image##*:}"
    yq eval -i ".image.tag = \"${TAG}\"" "$VALUES_FILE"
  else
    echo "No $VALUES_FILE (skipping)"
  fi
done
