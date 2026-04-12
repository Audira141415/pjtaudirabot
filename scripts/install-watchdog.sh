#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/audira/pjtaudirabot"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_NAME="pjtaudi-watchdog.service"
TIMER_NAME="pjtaudi-watchdog.timer"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

install -m 644 "$ROOT_DIR/systemd/$SERVICE_NAME" "$SYSTEMD_DIR/$SERVICE_NAME"
install -m 644 "$ROOT_DIR/systemd/$TIMER_NAME" "$SYSTEMD_DIR/$TIMER_NAME"
chmod 755 "$ROOT_DIR/scripts/health-gate.sh"
chmod 755 "$ROOT_DIR/scripts/watchdog-recover.sh"
chmod 755 "$ROOT_DIR/scripts/server-control.sh"

systemctl daemon-reload
systemctl enable --now "$TIMER_NAME"

systemctl status "$TIMER_NAME" --no-pager
