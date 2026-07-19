#!/usr/bin/env bash
# Задача A.1 — установка PocketBase на LXC 108 (192.168.3.59).
#
# TODO(ручной запуск): выполнить на самом LXC 108 от root/sudo — у Claude нет
# SSH-доступа к этому хосту, поэтому скрипт не был запущен автоматически.
# Использование:
#   scp pocketbase-infra/install.sh root@192.168.3.59:/tmp/
#   ssh root@192.168.3.59 'bash /tmp/install.sh'
set -euo pipefail

PB_VERSION="0.23.4"
PB_DIR="/opt/pocketbase"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) PB_ARCH="amd64" ;;
  aarch64) PB_ARCH="arm64" ;;
  *) echo "Неизвестная архитектура: $ARCH" >&2; exit 1 ;;
esac

id -u pocketbase &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin pocketbase

mkdir -p "$PB_DIR"
cd "$PB_DIR"

curl -fsSL -o pocketbase.zip \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
unzip -o pocketbase.zip pocketbase
rm pocketbase.zip
chmod +x pocketbase
chown -R pocketbase:pocketbase "$PB_DIR"

cp "$(dirname "$0")/pocketbase.service" /etc/systemd/system/pocketbase.service
systemctl daemon-reload
systemctl enable --now pocketbase

sleep 2
curl -fsS http://127.0.0.1:8090/api/health && echo "OK: PocketBase запущен"
