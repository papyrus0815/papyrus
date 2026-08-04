#!/usr/bin/env bash
# 모노레포 루트의 env.development 에서 파일럿이 쓰는 값만 뽑아 export 한다.
#
# 시크릿(DB 비밀번호, JWT 서명키)을 apps/api-java 안으로 복사하지 않기 위한 장치다.
# 정본은 언제나 루트의 env.development 이고, 파일럿은 읽기만 한다.
#
#   source tools/env.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${PILOT_ENV_FILE:-$REPO_ROOT/env.development}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env 파일을 찾을 수 없다: $ENV_FILE" >&2
  exit 1
fi

# KEY=VALUE 한 줄을 읽어 따옴표만 벗긴다. DATABASE_URL 을 파싱하지 않는 이유는
# 비밀번호에 @ 나 : 가 들어가면 URL 분해가 조용히 깨지기 때문이다.
read_env() {
  grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}

export PILOT_DB_HOST="${PILOT_DB_HOST:-$(read_env MYSQL_HOST)}"
export PILOT_DB_PORT="${PILOT_DB_PORT:-$(read_env MYSQL_PORT)}"
export PILOT_DB_NAME="${PILOT_DB_NAME:-$(read_env MYSQL_DATABASE)}"
export PILOT_DB_USER="${PILOT_DB_USER:-$(read_env MYSQL_USER)}"
export PILOT_DB_PASSWORD="${PILOT_DB_PASSWORD:-$(read_env MYSQL_PASSWORD)}"
export PILOT_JWT_SECRET="${PILOT_JWT_SECRET:-$(read_env JWT_SECRET)}"

export PILOT_DB_URL="${PILOT_DB_URL:-jdbc:mysql://${PILOT_DB_HOST}:${PILOT_DB_PORT}/${PILOT_DB_NAME}?connectionTimeZone=Asia/Seoul&sessionVariables=innodb_lock_wait_timeout=5&rewriteBatchedStatements=true}"

# 골든 캡처가 대조할 원본 서버.
export NEST_BASE_URL="${NEST_BASE_URL:-http://localhost:$(read_env API_PORT)}"
export PILOT_BASE_URL="${PILOT_BASE_URL:-http://localhost:${PILOT_PORT:-8081}}"

# Docker Desktop 의 CLI 가 PATH 에 없는 환경이 있다.
if ! command -v docker >/dev/null 2>&1 && [[ -x /Applications/Docker.app/Contents/Resources/bin/docker ]]; then
  export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
fi
