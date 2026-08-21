#!/usr/bin/env bash
# Сборка фронтенда и выкладка в /opt/udacha-web с перезапуском сервиса.
set -euo pipefail
cd "$(dirname "$0")/.."

(cd frontend && npm run build)

mkdir -p /opt/udacha-web
rm -rf /opt/udacha-web/dist.new
cp -r frontend/dist /opt/udacha-web/dist.new
cp deploy/serve.mjs /opt/udacha-web/serve.mjs
rm -rf /opt/udacha-web/dist.old
[ -d /opt/udacha-web/dist ] && mv /opt/udacha-web/dist /opt/udacha-web/dist.old
mv /opt/udacha-web/dist.new /opt/udacha-web/dist

cp deploy/udacha-web.service /etc/systemd/system/udacha-web.service
systemctl daemon-reload
systemctl enable --now udacha-web.service
systemctl restart udacha-web.service
sleep 1
systemctl is-active udacha-web.service
curl -sf -o /dev/null -w 'local 4173: %{http_code}\n' http://127.0.0.1:4173/
