#!/usr/bin/env bash
set -euo pipefail

PREFIX="${1:-/enduro-challenge}"

# Colours for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[OK]${NC}   $1"; }
skip()  { echo -e "${YELLOW}[SKIP]${NC} $1"; }

echo "=== Enduro Challenge — Bootstrap ==="
echo "Namespace: $PREFIX"
echo ""

# --- App secrets (SSM JSON parameter) ---
STRAVA_PARAM="$PREFIX/strava"
echo "--- App secrets: $STRAVA_PARAM ---"

if aws ssm get-parameter --name "$STRAVA_PARAM" >/dev/null 2>&1; then
  skip "$STRAVA_PARAM already exists"
else
  read -rp "Strava Client ID: " STRAVA_CLIENT_ID
  read -rp "Strava Client Secret: " STRAVA_CLIENT_SECRET

  JWT_SECRET="$(openssl rand -hex 32)"
  WEBHOOK_VERIFY_TOKEN="$(openssl rand -hex 16)"

  STRAVA_JSON=$(cat <<EOF
{"clientId":"$STRAVA_CLIENT_ID","clientSecret":"$STRAVA_CLIENT_SECRET","jwtSecret":"$JWT_SECRET","webhookVerifyToken":"$WEBHOOK_VERIFY_TOKEN","adminAthleteIds":"1788602"}
EOF
)

  aws ssm put-parameter \
    --name "$STRAVA_PARAM" \
    --value "$STRAVA_JSON" \
    --type String \
    --description "Enduro Challenge app secrets (JSON)" >/dev/null
  info "$STRAVA_PARAM created"
fi

echo ""

# --- Infrastructure outputs (SSM JSON parameter) ---
AWS_PARAM="$PREFIX/aws"
echo "--- Infrastructure outputs: $AWS_PARAM ---"

if aws ssm get-parameter --name "$AWS_PARAM" >/dev/null 2>&1; then
  skip "$AWS_PARAM already exists"
else
  aws ssm put-parameter \
    --name "$AWS_PARAM" \
    --value '{"frontendUrl":"https://placeholder.cloudfront.net","apiUrl":"placeholder"}' \
    --type String \
    --description "Enduro Challenge infrastructure outputs (JSON, updated by CDK)" >/dev/null
  info "$AWS_PARAM created (placeholders — CDK stacks will update on deploy)"
fi

echo ""

# Clean up legacy SSM params if they exist
echo "--- Cleaning up legacy params ---"
for old_param in "$PREFIX/client-id" "$PREFIX/client-secret" "$PREFIX/client-refresh" "$PREFIX/jwt-secret" "$PREFIX/webhook-verify-token" "$PREFIX/admin-athlete-ids" "$PREFIX/frontend-url" "$PREFIX/api-url"; do
  if aws ssm get-parameter --name "$old_param" >/dev/null 2>&1; then
    aws ssm delete-parameter --name "$old_param" >/dev/null
    info "Deleted legacy SSM param $old_param"
  fi
done

# Clean up Secrets Manager secrets if they were created by mistake
for old_secret in "$PREFIX/strava" "$PREFIX/aws"; do
  if aws secretsmanager describe-secret --secret-id "$old_secret" >/dev/null 2>&1; then
    aws secretsmanager delete-secret --secret-id "$old_secret" --force-delete-without-recovery >/dev/null
    info "Deleted Secrets Manager secret $old_secret"
  fi
done

echo ""
echo "Done. Run 'make deploy-db' to start deploying."
