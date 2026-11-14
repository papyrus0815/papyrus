#!/usr/bin/env bash
# Papyrus 로컬 쿠버네티스(k3d) 운영 스크립트 — 레포 루트에서 실행
#
#   deploy/scripts/k8s.sh up                클러스터 생성 → 이미지 빌드 → 배포 (처음 한 번)
#   deploy/scripts/k8s.sh build [대상...]   이미지 빌드 (api web migrate, 생략 시 전부)
#   deploy/scripts/k8s.sh deploy            이미지 import → apply → (빈 DB면 스냅샷 복원) → 롤아웃 대기
#   deploy/scripts/k8s.sh restore-snapshot  개발 DB(docker-compose) 전체를 클러스터 MySQL로 복원 — 기존 데이터 삭제
#   deploy/scripts/k8s.sh status            파드·서비스·헬스 요약
#   deploy/scripts/k8s.sh down              클러스터 삭제 (PVC 데이터도 함께 사라진다)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CLUSTER=papyrus
NS=papyrus
OVERLAY=deploy/k8s/overlays/local
SECRETS="$OVERLAY/secrets.env"
DOCKERFILE=deploy/docker/papyrus.Dockerfile
TAG=local
PUBLIC_URL="${PUBLIC_URL:-http://localhost:8088}"
# 스냅샷 원본 = docker-compose 개발 DB
DEV_MYSQL_CONTAINER="${DEV_MYSQL_CONTAINER:-mysql}"
DEV_MYSQL_ROOT_PASSWORD="${DEV_MYSQL_ROOT_PASSWORD:-papyrus}"
DEV_MYSQL_DATABASE="${DEV_MYSQL_DATABASE:-papyrus}"

# Docker Desktop을 DMG에서 바로 설치하면 /usr/local/bin/docker 링크가 /Volumes/Docker를 가리킨 채 깨져 있다
if ! command -v docker >/dev/null 2>&1 && [ -x /Applications/Docker.app/Contents/Resources/bin/docker ]; then
  export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
fi

log() { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

need() {
  for bin in "$@"; do command -v "$bin" >/dev/null 2>&1 || die "$bin 이 필요합니다 (brew install $bin)"; done
}

ensure_secrets() {
  [ -f "$SECRETS" ] && return
  log "$SECRETS 생성 (무작위 값)"
  # hex만 쓴다 — DATABASE_URL에 그대로 들어가므로 URL 예약 문자가 섞이면 안 된다
  {
    echo "MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)"
    echo "MYSQL_DATABASE=papyrus"
    echo "MYSQL_USER=papyrus"
    echo "MYSQL_PASSWORD=$(openssl rand -hex 16)"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
  } > "$SECRETS"
  chmod 600 "$SECRETS"
}

load_secrets() {
  # shellcheck disable=SC1090
  set -a; . "$SECRETS"; set +a
}

ensure_cluster() {
  if k3d cluster list -o json | grep -q "\"name\":\"$CLUSTER\""; then
    log "클러스터 $CLUSTER 이미 있음"
    k3d cluster start "$CLUSTER" >/dev/null
  else
    log "클러스터 $CLUSTER 생성"
    k3d cluster create --config deploy/k3d/cluster.yaml
  fi
  kubectl config use-context "k3d-$CLUSTER" >/dev/null
}

# 클러스터 MySQL에 root로 SQL 실행 (비밀번호는 커맨드라인이 아니라 환경변수로)
# KUBECTL_REMOTE_COMMAND_WEBSOCKETS=false: 기본(websocket) 스트림은 원격 mysql이 오류로 끝나도
# kubectl exec가 반환하지 않고 매달렸다(실측, 큰 stdin). SPDY로 돌리면 오류가 그대로 올라온다
cluster_mysql() {
  KUBECTL_REMOTE_COMMAND_WEBSOCKETS=false \
    kubectl -n "$NS" exec -i mysql-0 -c mysql -- env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$@"
}
dev_mysql() {
  docker exec -i "$DEV_MYSQL_CONTAINER" env MYSQL_PWD="$DEV_MYSQL_ROOT_PASSWORD" mysql -uroot "$@"
}

cluster_db_is_empty() {
  ! cluster_mysql -N "$MYSQL_DATABASE" -e 'SELECT 1 FROM `_prisma_migrations` LIMIT 1' >/dev/null 2>&1
}

build_one() {
  local target="$1"
  local args=()
  if [ "$target" = web ]; then
    # 번들에 구워지는 API 주소 — 브라우저 기준 절대 URL (Nestia fetcher가 new URL(host + path))
    args+=(--build-arg "VITE_API_BASE_URL=$PUBLIC_URL/api")
  fi
  log "이미지 빌드: papyrus/$target:$TAG"
  docker build -f "$DOCKERFILE" --target "$target" -t "papyrus/$target:$TAG" ${args[@]+"${args[@]}"} .
}

cmd_build() {
  need docker
  local targets=("$@")
  [ ${#targets[@]} -eq 0 ] && targets=(api migrate web)
  for target in "${targets[@]}"; do build_one "$target"; done
}

cmd_deploy() {
  need docker k3d kubectl
  ensure_secrets
  load_secrets
  kubectl config use-context "k3d-$CLUSTER" >/dev/null

  log "이미지 import → 노드"
  k3d image import -c "$CLUSTER" "papyrus/api:$TAG" "papyrus/web:$TAG" "papyrus/migrate:$TAG"

  local existed=false
  kubectl -n "$NS" get deployment/papyrus-api >/dev/null 2>&1 && existed=true
  log "apply -k $OVERLAY"
  kubectl apply -k "$OVERLAY"
  # 같은 태그로 다시 import한 경우 템플릿이 그대로라 롤아웃이 안 일어난다 → 명시적으로 재시작.
  # 첫 배포에는 하지 않는다: 방금 만든 ReplicaSet 옆에 하나가 더 생겨 migrate가 두 벌 동시에 돈다(실측)
  if $existed; then
    kubectl -n "$NS" rollout restart deployment/papyrus-api deployment/papyrus-web
  fi

  log "MySQL 대기"
  kubectl -n "$NS" rollout status statefulset/mysql --timeout=240s
  # API 파드의 migrate initContainer는 빈 DB에서 기다리고 있다(migrate.sh) → 여기서 채워 준다
  if cluster_db_is_empty; then
    log "빈 DB — 스냅샷 복원으로 부트스트랩"
    cmd_restore_snapshot
  fi

  log "롤아웃 대기"
  kubectl -n "$NS" rollout status deployment/papyrus-api --timeout=300s
  kubectl -n "$NS" rollout status deployment/papyrus-web --timeout=120s
  cmd_status
}

cmd_up() {
  need docker k3d kubectl openssl
  ensure_cluster
  ensure_secrets
  cmd_build
  cmd_deploy
}

# 개발 DB 전체(스키마 + 데이터 + 트리거 + _prisma_migrations)를 복원한다.
# 데이터만 붓지 않는 이유: 빈 DB에서 마이그레이션 이력을 재생할 수 없어서(migrate.sh 머리말).
# _prisma_migrations까지 같이 오므로 이후 migrate deploy는 그 뒤의 증분만 적용한다.
cmd_restore_snapshot() {
  need docker kubectl
  load_secrets
  docker inspect "$DEV_MYSQL_CONTAINER" >/dev/null 2>&1 \
    || die "원본 컨테이너 $DEV_MYSQL_CONTAINER 가 없습니다 (npm run docker:up)"

  # 복원 중엔 API를 내린다. mysqldump는 이름순이라 `_prisma_migrations`가 맨 먼저 들어가므로,
  # 그대로 두면 migrate 가드가 복원 도중에 통과해 앱이 반쯤 찬 DB로 뜬다(쓰기까지 섞일 수 있다)
  local replicas=1
  if kubectl -n "$NS" get deployment/papyrus-api >/dev/null 2>&1; then
    replicas=$(kubectl -n "$NS" get deployment/papyrus-api -o jsonpath='{.spec.replicas}')
    [ "$replicas" -gt 0 ] || replicas=1
    log "API 일시 중지 (replicas $replicas → 0)"
    kubectl -n "$NS" scale deployment/papyrus-api --replicas=0
    kubectl -n "$NS" wait --for=delete pod -l app.kubernetes.io/name=api --timeout=120s || true
  fi

  log "클러스터 DB 초기화: $MYSQL_DATABASE (utf8mb4_unicode_ci)"
  cluster_mysql -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`;
    CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';"

  log "덤프 $DEV_MYSQL_CONTAINER:$DEV_MYSQL_DATABASE → mysql-0:$MYSQL_DATABASE"
  # 트리거 DEFINER는 papyrus@% — 클러스터에도 같은 이름의 앱 계정이 있어야 한다(secrets.env MYSQL_USER)
  # sed: 마이그레이션이 트리거 본문을 끝의 ';'까지 저장해 두어, mysqldump가 그 ';'를 버전 주석
  #      /*!50003 ... ); */;; 안에 넣는다 → 복원 시 ERROR 1064 near ' */'(실측). 본문 끝 ';'만 뗀다
  docker exec "$DEV_MYSQL_CONTAINER" env MYSQL_PWD="$DEV_MYSQL_ROOT_PASSWORD" mysqldump -uroot \
      --single-transaction --routines --triggers --hex-blob --no-tablespaces \
      --default-character-set=utf8mb4 --set-gtid-purged=OFF "$DEV_MYSQL_DATABASE" \
    | sed -E 's/;[[:space:]]*\*\/;;$/ *\/;;/' \
    | cluster_mysql --default-character-set=utf8mb4 "$MYSQL_DATABASE"

  log "검증: 테이블별 행 수 · 트리거 · 마이그레이션 이력"
  local tables count_sql
  tables=$(dev_mysql -N "$DEV_MYSQL_DATABASE" -e \
    "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY 1")
  count_sql=$(for t in $tables; do printf "SELECT '%s', COUNT(*) FROM \`%s\` UNION ALL " "$t" "$t"; done)
  count_sql="${count_sql% UNION ALL }
    UNION ALL SELECT '#triggers', COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE()"
  if diff <(dev_mysql -N "$DEV_MYSQL_DATABASE" -e "$count_sql") <(cluster_mysql -N "$MYSQL_DATABASE" -e "$count_sql"); then
    log "일치: 테이블 $(echo "$tables" | wc -l | tr -d ' ')개 행 수 + 트리거 수"
  else
    die "원본과 다른 항목이 있습니다 (위 diff) — API는 내려 둔 상태"
  fi

  if kubectl -n "$NS" get deployment/papyrus-api >/dev/null 2>&1; then
    log "API 재개 (replicas → $replicas)"
    kubectl -n "$NS" scale deployment/papyrus-api --replicas="$replicas"
  fi
}

cmd_status() {
  kubectl -n "$NS" get pods,svc,ingress,pvc -o wide
  printf '\nGET %s/api/health/ready → ' "$PUBLIC_URL"
  curl -sS -o /dev/null -w '%{http_code}' "$PUBLIC_URL/api/health/ready" || true
  printf '\n웹: %s\n' "$PUBLIC_URL"
}

cmd_down() {
  need k3d
  log "클러스터 $CLUSTER 삭제"
  k3d cluster delete "$CLUSTER"
}

case "${1:-}" in
  up) cmd_up ;;
  build) shift; cmd_build "$@" ;;
  deploy) cmd_deploy ;;
  restore-snapshot) cmd_restore_snapshot ;;
  status) cmd_status ;;
  down) cmd_down ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
