#!/bin/bash
set -e

# Belt-and-suspenders: explicitly set the production API URL so this script is safe
# even when EXPO_PUBLIC_API_URL is set to something else in .env/.env.local.
export EXPO_PUBLIC_API_URL=https://api.ascentlearning.app/api

# Belt-and-suspenders: set NODE_ENV to production to prevent any remaining code
# from making incorrect environment assumptions.
export NODE_ENV=production

MESSAGE="${1:-Production OTA update}"

echo "Running backend health check..."
curl -sf https://api.ascentlearning.app/health || {
  echo "ERROR: Backend health check failed. Aborting OTA deploy."
  exit 1
}
echo "Backend is healthy."

echo "Deploying OTA update: '$MESSAGE'"
pnpm dlx eas-cli update --channel preview --message "$MESSAGE"
