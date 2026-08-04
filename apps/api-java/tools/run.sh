#!/usr/bin/env bash
# 파일럿을 :8081 에 띄운다. 루트 env.development 에서 DB·JWT 값을 읽어 넣는다.
#
#   ./tools/run.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./env.sh
source "$SCRIPT_DIR/env.sh"

echo "DB   : ${PILOT_DB_HOST}:${PILOT_DB_PORT}/${PILOT_DB_NAME} (읽기 전용 — ddl-auto=validate)"
echo "포트 : ${PILOT_PORT:-8081}   (Nest 는 :8000 에서 계속 정본)"
echo

exec "$SCRIPT_DIR/../gradlew" -p "$SCRIPT_DIR/.." bootRun
