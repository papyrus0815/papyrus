#!/usr/bin/env bash
# Nest(:8000)와 파일럿(:8081)을 <b>같은 토큰·같은 순간</b>에 호출해 응답을 대조한다.
#
# 골든 대조(오프라인)의 약점을 메운다. 골든은 계정 1개·원장 6행 위에 고정돼 있고 DB 는
# 살아 움직여서(실제로 1시간 만에 total_points 가 7185 -> 7205 로 바뀌었다) 언젠가는 썩는다.
# 이 스크립트는 양쪽이 같은 DB 를 보므로 데이터가 변해도 대조가 성립한다.
#
#   ./tools/live-parity.sh              # 읽기 엔드포인트 전부
#   ./tools/live-parity.sh /wallet/me   # 하나만
#
# 두 서버가 모두 떠 있어야 한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./env.sh
source "$SCRIPT_DIR/env.sh"

LOGIN_USER="${GOLDEN_USER:-admin}"
LOGIN_PASS="${GOLDEN_PASSWORD:-1234}"

TOKEN="$(curl -sS --max-time 10 -X POST "$NEST_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$LOGIN_USER\",\"password\":\"$LOGIN_PASS\"}" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.accessToken||'')})")"

if [[ -z "$TOKEN" ]]; then
  echo "로그인 실패 — Nest 가 $NEST_BASE_URL 에 떠 있는지 확인할 것" >&2
  exit 1
fi

if [[ $# -gt 0 ]]; then
  PATHS=("$@")
else
  # 파일럿이 구현한 읽기 경로만. 구현이 늘면 여기에 추가한다.
  PATHS=(/wallet/me)
fi

pass=0
fail=0

for path in "${PATHS[@]}"; do
  nest="$(curl -sS --max-time 15 -H "Authorization: Bearer $TOKEN" "$NEST_BASE_URL$path")"
  pilot="$(curl -sS --max-time 15 -H "Authorization: Bearer $TOKEN" "$PILOT_BASE_URL$path")"

  if node -e "
    const nest = process.argv[1], pilot = process.argv[2];
    // 키 순서까지 본다. JSON.stringify 는 삽입 순서를 보존하므로 문자열 비교로 순서가 잡힌다.
    if (nest === pilot) { process.exit(0); }
    let a, b;
    try { a = JSON.parse(nest); b = JSON.parse(pilot); } catch (e) {
      console.log('  JSON 파싱 실패'); process.exit(1);
    }
    if (JSON.stringify(a) === JSON.stringify(b)) { process.exit(0); }
    console.log('  nest : ' + JSON.stringify(a).slice(0, 400));
    console.log('  pilot: ' + JSON.stringify(b).slice(0, 400));
    process.exit(1);
  " "$nest" "$pilot"; then
    printf '  ✓ %s\n' "$path"
    pass=$((pass + 1))
  else
    printf '  ✗ %s\n' "$path"
    fail=$((fail + 1))
  fi
done

echo
echo "일치 $pass / 불일치 $fail"
[[ "$fail" -eq 0 ]]
