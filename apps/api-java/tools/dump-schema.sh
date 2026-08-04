#!/usr/bin/env bash
# 파일럿이 건드리는 9개 테이블의 DDL 스냅샷을 뜬다.
#
# 이 파일은 두 곳에서 기준선 역할을 한다.
#   1) Testcontainers 초기화 — 테스트가 진짜 스키마 위에서 돈다
#   2) 드리프트 감지 — 모놀리스가 스키마를 바꾸면 이 파일과 diff 가 난다
#
# 데이터는 뜨지 않는다(--no-data). 골든 응답에 들어가는 실데이터는 별도다.
#
#   ./tools/dump-schema.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./env.sh
source "$SCRIPT_DIR/env.sh"

OUT="$SCRIPT_DIR/../src/test/resources/db/testschema/V1__prisma_schema_snapshot.sql"
CONTAINER="${MYSQL_CONTAINER:-mysql}"

TABLES=(
  account
  point_entry
  account_badge
  wallet_ledger
  shop_item
  user_item
  promo_code
  artifact
  user_artifact
)

mkdir -p "$(dirname "$OUT")"

echo "덤프 대상: ${#TABLES[@]}개 테이블 → $OUT"

{
  cat <<'HEADER'
-- 자동 생성 — 직접 수정하지 말 것. 갱신은 ./tools/dump-schema.sh
--
-- apps/api-java 파일럿이 읽는 9개 테이블의 DDL 스냅샷.
-- 스키마 정본은 libs/db/prisma/*.prisma 이며 파일럿은 구조를 바꾸지 않는다.
--
-- FOREIGN_KEY_CHECKS=0 인 이유: 이 9개 테이블만 잘라 담기 때문에 파일럿 범위 밖 테이블을
-- 가리키는 FK 가 남는다. InnoDB 는 FK 검사가 꺼져 있을 때만 존재하지 않는 대상을 참조하는
-- 테이블 생성을 허용한다.
SET FOREIGN_KEY_CHECKS = 0;
HEADER

  docker exec -i "$CONTAINER" mysqldump \
    --no-data \
    --skip-add-drop-table \
    --skip-comments \
    --compact \
    --single-transaction \
    --user="$PILOT_DB_USER" \
    --password="$PILOT_DB_PASSWORD" \
    "$PILOT_DB_NAME" "${TABLES[@]}" 2>/dev/null \
    | sed -E 's/ AUTO_INCREMENT=[0-9]+//' \
    | sed -E '/^\/\*![0-9]+ .*\*\/;$/d'

  echo "SET FOREIGN_KEY_CHECKS = 1;"
} > "$OUT"

echo "완료: $(grep -c 'CREATE TABLE' "$OUT") 테이블, $(wc -l < "$OUT") 줄"
