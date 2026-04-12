#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/audira/pjtaudirabot"
ENV_MAIN="$ROOT_DIR/.env.production"
ENV_SECRET="$HOME/.config/pjtaudi/secrets.env"
API_BASE="${API_BASE:-http://localhost:4000}"
MAX_ATTEMPTS="${1:-6}"
SLEEP_SECONDS="${2:-5}"

read_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" \
    | tail -n 1 \
    | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//" \
    | tr -d '"' \
    || return 1
}

ADMIN_USERNAME="${ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_USERNAME" ]]; then
  ADMIN_USERNAME="$(read_env_value "$ENV_SECRET" "ADMIN_USERNAME" || true)"
fi
if [[ -z "$ADMIN_USERNAME" ]]; then
  ADMIN_USERNAME="$(read_env_value "$ENV_MAIN" "ADMIN_USERNAME" || true)"
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  ADMIN_PASSWORD="$(read_env_value "$ENV_SECRET" "ADMIN_PASSWORD" || true)"
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  ADMIN_PASSWORD="$(read_env_value "$ENV_MAIN" "ADMIN_PASSWORD" || true)"
fi

if [[ -z "$ADMIN_USERNAME" || -z "$ADMIN_PASSWORD" ]]; then
  echo "health-gate: missing ADMIN_USERNAME or ADMIN_PASSWORD in env files"
  exit 1
fi

check_http_200() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE$path" || true)"
  [[ "$code" == "200" ]]
}

json_escape() {
  local raw="$1"
  raw="${raw//\\/\\\\}"
  raw="${raw//\"/\\\"}"
  raw="${raw//$'\n'/\\n}"
  raw="${raw//$'\r'/\\r}"
  raw="${raw//$'\t'/\\t}"
  printf '%s' "$raw"
}

admin_health_ok() {
  local login_body login_resp token health_resp
  local username_candidates password_candidates username_candidate password_candidate

  username_candidates=("$ADMIN_USERNAME")
  password_candidates=("$ADMIN_PASSWORD")
  token=""

  for username_candidate in "${username_candidates[@]}"; do
    [[ -n "$username_candidate" ]] || continue

    for password_candidate in "${password_candidates[@]}"; do
      [[ -n "$password_candidate" ]] || continue
      login_body=$(printf '{"username":"%s","password":"%s"}' \
        "$(json_escape "$username_candidate")" \
        "$(json_escape "$password_candidate")")

      login_resp="$(curl -sS -X POST "$API_BASE/api/admin/auth/login" \
        -H 'Content-Type: application/json' \
        -d "$login_body" || true)"
      token="$(echo "$login_resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

      if [[ -n "$token" ]]; then
        break 2
      fi
    done
  done

  [[ -n "$token" ]] || return 1

  health_resp="$(curl -sS "$API_BASE/api/admin/system/health" -H "Authorization: Bearer $token" || true)"

  echo "$health_resp" | grep -Eq '"overallStatus"\s*:\s*"healthy"' || return 1

  return 0
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if check_http_200 '/health' \
    && check_http_200 '/' \
    && check_http_200 '/uptime' \
    && admin_health_ok; then
    echo "health-gate: PASS (attempt $attempt/$MAX_ATTEMPTS)"
    exit 0
  fi

  if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo "health-gate: FAIL after $MAX_ATTEMPTS attempts"
exit 1
