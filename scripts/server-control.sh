#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-}"
TAIL="${2:-200}"

if [[ -z "$ACTION" ]]; then
  echo "Usage: $0 {start|stop|restart|status|logs|follow|release-start|release-start-local|release-stop|release-restart|release-restart-local|release-status|release-logs|release-api} [tail|api-image]"
  exit 1
fi

ROOT_DIR="/home/audira/pjtaudirabot"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_MAIN="$ROOT_DIR/.env.production"
ENV_SECRET="$HOME/.config/pjtaudi/secrets.env"
RELEASE_IMAGES_ENV="$HOME/.config/pjtaudi/release-images.env"
PREVIOUS_RELEASE_IMAGES_ENV="$HOME/.config/pjtaudi/release-images.previous.env"
HEALTH_GATE_SCRIPT="$ROOT_DIR/scripts/health-gate.sh"
SNAPSHOT_AVAILABLE="false"

LOCK_RELEASE_ONLY="${LOCK_RELEASE_ONLY:-true}"
ALLOW_MANUAL_HOTSWAP="${ALLOW_MANUAL_HOTSWAP:-false}"
ALLOW_RELEASE_PULL_FALLBACK="${ALLOW_RELEASE_PULL_FALLBACK:-true}"

if [[ ! -d "$DOCKER_DIR" ]]; then
  echo "ERROR: Docker directory not found: $DOCKER_DIR"
  exit 1
fi

if [[ ! -f "$ENV_MAIN" ]]; then
  echo "ERROR: Env file not found: $ENV_MAIN"
  exit 1
fi

if [[ ! -f "$ENV_SECRET" ]]; then
  echo "ERROR: Env file not found: $ENV_SECRET"
  exit 1
fi

compose_source() {
  docker compose \
    --env-file "$ENV_MAIN" \
    --env-file "$ENV_SECRET" \
    -f docker-compose.yml \
    -f docker-compose.prod.yml \
    "$@"
}

compose_release() {
  if [[ ! -f "$RELEASE_IMAGES_ENV" ]]; then
    echo "ERROR: Release image env not found: $RELEASE_IMAGES_ENV"
    echo "Upload ~/.config/pjtaudi/release-images.env first."
    exit 1
  fi

  docker compose \
    --env-file "$ENV_MAIN" \
    --env-file "$ENV_SECRET" \
    --env-file "$RELEASE_IMAGES_ENV" \
    -f docker-compose.release.yml \
    "$@"
}

compose_previous_release() {
  if [[ ! -f "$PREVIOUS_RELEASE_IMAGES_ENV" ]]; then
    echo "ERROR: Previous release image env not found: $PREVIOUS_RELEASE_IMAGES_ENV"
    return 1
  fi

  docker compose \
    --env-file "$ENV_MAIN" \
    --env-file "$ENV_SECRET" \
    --env-file "$PREVIOUS_RELEASE_IMAGES_ENV" \
    -f docker-compose.release.yml \
    "$@"
}

is_true() {
  [[ "${1,,}" == "true" || "$1" == "1" || "${1,,}" == "yes" ]]
}

enforce_release_lock() {
  if ! is_true "$LOCK_RELEASE_ONLY"; then
    return 0
  fi

  case "$ACTION" in
    start|restart|release-start-local|release-restart-local)
      echo "LOCKED: Source/local deploy path disabled in production."
      echo "Use release image flow only: build-and-push-release.cmd ... deploy"
      echo "or server-control.sh release-start / release-restart"
      exit 1
      ;;
    release-api)
      if ! is_true "$ALLOW_MANUAL_HOTSWAP"; then
        echo "LOCKED: Manual API hotswap disabled."
        echo "Use release image flow only."
        echo "Set ALLOW_MANUAL_HOTSWAP=true only for emergency break-glass."
        exit 1
      fi
      ;;
  esac
}

snapshot_current_release_images() {
  local api_image whatsapp_image telegram_image
  api_image="$(docker inspect -f '{{.Config.Image}}' pjtaudi-api 2>/dev/null || true)"
  whatsapp_image="$(docker inspect -f '{{.Config.Image}}' pjtaudi-whatsapp 2>/dev/null || true)"
  telegram_image="$(docker inspect -f '{{.Config.Image}}' pjtaudi-telegram 2>/dev/null || true)"

  if [[ -z "$api_image" || -z "$whatsapp_image" || -z "$telegram_image" ]]; then
    SNAPSHOT_AVAILABLE="false"
    echo "WARN: Unable to snapshot current release images (containers not fully available)."
    return 0
  fi

  cat > "$PREVIOUS_RELEASE_IMAGES_ENV" <<EOF
API_IMAGE=$api_image
WHATSAPP_IMAGE=$whatsapp_image
TELEGRAM_IMAGE=$telegram_image
EOF
  chmod 600 "$PREVIOUS_RELEASE_IMAGES_ENV"
  SNAPSHOT_AVAILABLE="true"
  echo "Snapshot saved: $PREVIOUS_RELEASE_IMAGES_ENV"
}

run_health_gate() {
  if [[ ! -x "$HEALTH_GATE_SCRIPT" ]]; then
    echo "ERROR: Health gate script missing or not executable: $HEALTH_GATE_SCRIPT"
    return 1
  fi

  "$HEALTH_GATE_SCRIPT" 8 5
}

rollback_to_previous_release() {
  if [[ "$SNAPSHOT_AVAILABLE" != "true" ]]; then
    echo "No fresh snapshot in this run; skip rollback."
    return 1
  fi

  echo "Attempting rollback to previous release images..."
  compose_previous_release down
  compose_previous_release up -d
  compose_previous_release ps
}

verify_or_rollback_release() {
  if run_health_gate; then
    return 0
  fi

  echo "Health gate failed for current release."
  if rollback_to_previous_release && run_health_gate; then
    echo "Rollback completed successfully."
    return 0
  else
    echo "Rollback failed or rollback target unhealthy."
  fi

  return 1
}

pull_release_images_with_fallback() {
  if compose_release pull; then
    return 0
  fi

  if is_true "$ALLOW_RELEASE_PULL_FALLBACK"; then
    echo "WARN: Release image pull failed; falling back to locally available images."
    return 0
  fi

  return 1
}

cd "$DOCKER_DIR"
enforce_release_lock

case "$ACTION" in
  start)
    compose_source up -d --build
    compose_source ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  stop)
    compose_source down
    ;;
  restart)
    compose_source down
    compose_source up -d --build
    compose_source ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  status)
    compose_source ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  logs)
    compose_source logs --tail="$TAIL" api whatsapp telegram db redis
    ;;
  follow)
    compose_source logs -f --tail="$TAIL" api whatsapp telegram db redis
    ;;
  release-start)
    snapshot_current_release_images
    pull_release_images_with_fallback
    compose_release up -d
    compose_release ps
    verify_or_rollback_release
    ;;
  release-start-local)
    compose_release up -d
    compose_release ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  release-stop)
    compose_release down
    ;;
  release-restart)
    snapshot_current_release_images
    pull_release_images_with_fallback
    compose_release down
    compose_release up -d
    compose_release ps
    verify_or_rollback_release
    ;;
  release-restart-local)
    compose_release down
    compose_release up -d
    compose_release ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  release-status)
    compose_release ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  release-logs)
    compose_release logs --tail="$TAIL" api whatsapp telegram db redis
    ;;
  release-api)
    API_OVERRIDE_IMAGE="${2:-}"
    if [[ -z "$API_OVERRIDE_IMAGE" ]]; then
      echo "Usage: $0 release-api <api-image>"
      exit 1
    fi
    API_IMAGE="$API_OVERRIDE_IMAGE" compose_release up -d --no-deps api
    compose_release ps api
    echo
    curl -fsS http://localhost:4000/health
    ;;
  *)
    echo "Unknown action: $ACTION"
    echo "Usage: $0 {start|stop|restart|status|logs|follow|release-start|release-start-local|release-stop|release-restart|release-restart-local|release-status|release-logs|release-api} [tail|api-image]"
    exit 1
    ;;
esac
