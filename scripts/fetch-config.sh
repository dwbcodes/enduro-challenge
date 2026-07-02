#!/usr/bin/env bash
#
# Fetch frontend config from AWS SSM Parameter Store and write apps/web/.env.local
#
# Usage:
#   ./scripts/fetch-config.sh                         # uses default namespace /enduro-challenge
#   ./scripts/fetch-config.sh /my-custom-namespace    # uses custom namespace
#   SSM_NAMESPACE=/my-ns ./scripts/fetch-config.sh    # via env var
#
set -euo pipefail

NAMESPACE="${1:-${SSM_NAMESPACE:-/enduro-challenge}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../apps/web/.env.local"

echo "Fetching config from SSM namespace: ${NAMESPACE}"

get_param() {
  aws ssm get-parameter \
    --name "${NAMESPACE}/$1" \
    --query 'Parameter.Value' \
    --output text \
    --with-decryption 2>/dev/null
}

API_URL="$(get_param 'api-url')"
STRAVA_CLIENT_ID="$(get_param 'strava/client-id')"

cat > "${ENV_FILE}" <<EOF
# Auto-generated from SSM ${NAMESPACE} — do not edit manually
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}
EOF

echo "Wrote ${ENV_FILE}"
