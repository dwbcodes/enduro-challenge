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

echo "Fetching config from namespace: ${NAMESPACE}"

get_ssm_json_field() {
  aws ssm get-parameter \
    --name "${NAMESPACE}/$1" \
    --query 'Parameter.Value' \
    --output text \
    --with-decryption | jq -r --arg field "$2" '.[$field] // empty'
}

API_URL="$(get_ssm_json_field 'aws' 'apiUrl')"
STRAVA_CLIENT_ID="$(get_ssm_json_field 'strava' 'clientId')"

if [[ -z "${API_URL}" ]]; then
  echo "Missing apiUrl in ${NAMESPACE}/aws" >&2
  exit 1
fi

if [[ -z "${STRAVA_CLIENT_ID}" ]]; then
  echo "Missing clientId in ${NAMESPACE}/strava" >&2
  exit 1
fi

cat > "${ENV_FILE}" <<EOF
# Auto-generated from ${NAMESPACE} SSM params - do not edit manually
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_STRAVA_CLIENT_ID=${STRAVA_CLIENT_ID}
EOF

echo "Wrote ${ENV_FILE}"
