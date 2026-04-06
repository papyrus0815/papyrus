#!/usr/bin/env bash
# Docker mysql-backup 서비스: 주기적으로 mysqldump 후 gzip, 오래된 파일 정리
set -u

INTERVAL="${BACKUP_INTERVAL_SEC:-86400}"
RETENTION="${RETENTION_COUNT:-7}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

mkdir -p /backups

while true; do
  TS="$(date +%Y%m%d-%H%M%S)"
  OUT="/backups/papyrus-${TS}.sql.gz"
  echo "[mysql-backup] 시작: ${OUT}"

  if mysqldump \
    -h"${MYSQL_HOST}" \
    -P"${MYSQL_PORT}" \
    -u"${MYSQL_USER}" \
    -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "${MYSQL_DATABASE}" | gzip -c >"${OUT}.tmp"
  then
    mv "${OUT}.tmp" "${OUT}"
    echo "[mysql-backup] 완료: ${OUT}"
    # 최신 RETENTION 개만 유지 (파일명 타임스탬프 기준 정렬)
    mapfile -t files < <(ls -1 /backups/papyrus-*.sql.gz 2>/dev/null | sort -r)
    if ((${#files[@]} > RETENTION)); then
      for ((i = RETENTION; i < ${#files[@]}; i++)); do
        rm -f "${files[$i]}"
        echo "[mysql-backup] 삭제(보관 한도): ${files[$i]}"
      done
    fi
  else
    rm -f "${OUT}.tmp"
    echo "[mysql-backup] 실패 (다음 주기까지 대기)"
  fi

  sleep "${INTERVAL}"
done
