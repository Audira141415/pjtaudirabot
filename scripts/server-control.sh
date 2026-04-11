#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-}"
TAIL="${2:-200}"

if [[ -z "$ACTION" ]]; then
  echo "Usage: $0 {start|stop|restart|status|logs|follow|release-start|release-stop|release-restart|release-status|release-logs} [tail]"
  exit 1
fi

ROOT_DIR="/home/audira/pjtaudirabot"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_MAIN="$ROOT_DIR/.env.production"
ENV_SECRET="$HOME/.config/pjtaudi/secrets.env"
RELEASE_IMAGES_ENV="$HOME/.config/pjtaudi/release-images.env"

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

cd "$DOCKER_DIR"

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
    compose_release pull
    compose_release up -d
    compose_release ps
    echo
    curl -fsS http://localhost:4000/health
    ;;
  release-stop)
    compose_release down
    ;;
  release-restart)
    compose_release pull
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
  *)
    echo "Unknown action: $ACTION"
    echo "Usage: $0 {start|stop|restart|status|logs|follow|release-start|release-stop|release-restart|release-status|release-logs} [tail]"
    exit 1
    ;;
esac
