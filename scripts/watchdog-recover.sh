#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/audira/pjtaudirabot"
HEALTH_GATE_SCRIPT="$ROOT_DIR/scripts/health-gate.sh"
SERVER_CONTROL_SCRIPT="$ROOT_DIR/scripts/server-control.sh"
COOLDOWN_SECONDS="${WATCHDOG_COOLDOWN_SECONDS:-900}"
STATE_FILE="/tmp/pjtaudi-watchdog-last-recovery"

if [[ ! -x "$HEALTH_GATE_SCRIPT" || ! -x "$SERVER_CONTROL_SCRIPT" ]]; then
  echo "watchdog: required scripts are missing or not executable"
  exit 1
fi

if "$HEALTH_GATE_SCRIPT" 2 3; then
  echo "watchdog: healthy"
  exit 0
fi

now_ts="$(date +%s)"
last_ts="0"
if [[ -f "$STATE_FILE" ]]; then
  last_ts="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"
fi

if [[ "$last_ts" =~ ^[0-9]+$ ]] && (( now_ts - last_ts < COOLDOWN_SECONDS )); then
  echo "watchdog: in cooldown window, skip recovery"
  exit 1
fi

echo "$now_ts" > "$STATE_FILE"

echo "watchdog: unhealthy -> trigger release-restart"
if ! "$SERVER_CONTROL_SCRIPT" release-restart; then
  echo "watchdog: release-restart returned non-zero, checking final health state"
fi

if "$HEALTH_GATE_SCRIPT" 6 5; then
  echo "watchdog: recovered"
  exit 0
fi

echo "watchdog: recovery failed"
exit 1
