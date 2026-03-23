#!/usr/bin/env bash
# OTA deploy guard — validates environment before running eas update
# Usage: npm run deploy:ota
#
# Prevents accidental OTA deploys that bake a local http:// API URL into the
# production bundle (the root cause of the pc-012/pc-013 production crash).

set -e

API_URL="${EXPO_PUBLIC_API_URL:-}"

if [[ -n "$API_URL" && "$API_URL" != https://* ]]; then
  echo ""
  echo "ERROR: EXPO_PUBLIC_API_URL is set to an insecure URL:"
  echo "  $API_URL"
  echo ""
  echo "OTA deploys must not override EXPO_PUBLIC_API_URL with a local or http:// URL."
  echo "Unset EXPO_PUBLIC_API_URL before deploying, or set it to the production https:// URL."
  echo ""
  exit 1
fi

echo "API URL check passed. Running: eas update --environment production $*"
npx eas update --environment production "$@"
