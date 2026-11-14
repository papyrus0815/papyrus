#!/bin/sh
# migrate 이미지 엔트리 — API 파드의 initContainer로 돈다.
#
# 빈 DB에서는 마이그레이션 이력을 처음부터 재생하지 않고 기다린다. 이 레포의 이력은 빈 DB 재생을
# 전제로 쓰이지 않았다(실측, deploy/README.md 「DB 부트스트랩」):
#   - 특정 인물 UUID를 하드코딩한 데이터 마이그레이션 3건 → 행이 없으면 FK 위반으로 중간에 멈춘다
#   - 중간에 멈추면 _prisma_migrations에 실패 기록(P3009)이 남아 DB를 지우기 전엔 못 되돌린다
# 그래서 빈 DB는 스냅샷 복원(deploy/scripts/k8s.sh restore-snapshot)으로 세우고, 여기서는 증분만 적용한다.
# 이력을 baseline으로 정리해 빈 DB 재생이 가능해지면 MIGRATE_ALLOW_EMPTY=true로 이 대기를 끈다.
set -u

ATTEMPTS="${MIGRATE_WAIT_ATTEMPTS:-120}"
i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  if [ "${MIGRATE_ALLOW_EMPTY:-false}" = "true" ] \
     || echo 'SELECT 1 FROM `_prisma_migrations` LIMIT 1;' | npx prisma db execute --stdin >/dev/null 2>&1; then
    # 실제 실패(P3009 등)는 재시도해도 같으므로 바로 실패시켜 파드 상태로 드러낸다
    exec npx prisma migrate deploy
  fi
  echo "[migrate] DB 미준비 또는 빈 DB(_prisma_migrations 없음) — 스냅샷 복원 대기 ($i/$ATTEMPTS)"
  i=$((i + 1))
  sleep 5
done
echo "[migrate] 대기 시간 초과" >&2
exit 1
