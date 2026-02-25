#!/bin/bash
# Push .env secrets to Fly.io
# Usage: ./scripts/setup-fly-secrets.sh

set -e

if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

echo "Setting Fly.io secrets from .env..."

# Read .env and set each var as a Fly secret
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  # Strip quotes from value
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  echo "  Setting $key"
  fly secrets set "$key=$value" --stage
done < .env

# Deploy the staged secrets
fly secrets deploy

echo "Done! Secrets have been set."
