#!/usr/bin/env bash
# Nest(:8000) 의 현재 응답을 골든 파일로 떠 둔다.
#
# 반드시 파일럿 코드를 쓰기 <b>전에</b> 떠야 한다. 나중에 뜨면 파일럿의 출력이 기준이 되어
# 순환 논증이 된다 — "내가 낸 값과 내가 낸 값이 같다".
#
#   ./tools/capture-golden.sh                 # 읽기(GET) + 에러 봉투만. DB 를 바꾸지 않는다.
#   ./tools/capture-golden.sh --include-mutating   # 쓰기(POST) 성공 경로까지. DB 가 바뀐다.
#
# 기본이 읽기 전용인 이유: 이 스크립트가 보는 DB 는 운영에서 쓰는 그 DB 다. 성공하는 POST 를
# 캡처하면 원장에 행이 생기고 잔액이 깎인다. 골든을 뜨는 행위가 골든의 전제를 바꾼다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./env.sh
source "$SCRIPT_DIR/env.sh"

OUT_DIR="$SCRIPT_DIR/../src/test/resources/golden"
INCLUDE_MUTATING=0
[[ "${1:-}" == "--include-mutating" ]] && INCLUDE_MUTATING=1

LOGIN_USER="${GOLDEN_USER:-admin}"
LOGIN_PASS="${GOLDEN_PASSWORD:-1234}"

mkdir -p "$OUT_DIR"

echo "대상: $NEST_BASE_URL"

# ── 로그인 ──────────────────────────────────────────────────────────────────
# 로그인 DTO 의 필드명은 username 이 아니라 account 다.
# whitelist 검증이 켜져 있어 모르는 필드를 보내면 400 이 난다.
login_body="$(curl -sS --max-time 10 -X POST "$NEST_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"account\":\"$LOGIN_USER\",\"password\":\"$LOGIN_PASS\"}")"

TOKEN="$(printf '%s' "$login_body" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try {
    const j = JSON.parse(s);
    const t = j.accessToken || j.token || (j.data && (j.data.accessToken || j.data.token));
    if (!t) { console.error('토큰 필드를 못 찾음. 응답 키: ' + Object.keys(j).join(',')); process.exit(1); }
    process.stdout.write(t);
  } catch (e) { console.error('로그인 응답이 JSON 이 아님'); process.exit(1); }
});")"

# 토큰 자체는 저장하지 않는다(시크릿). 계정 id 만 뽑아 계정 스코프 엔드포인트를 부른다.
# base64url 디코딩을 셸 base64 로 하지 않는 이유: macOS 의 base64 는 패딩이 빠진
# base64url 입력에서 조용히 실패한다.
ACCOUNT_ID="$(printf '%s' "$TOKEN" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try {
    const payload = JSON.parse(Buffer.from(s.split('.')[1], 'base64url').toString('utf8'));
    const id = payload.sub || payload.accountId || payload.id;
    if (!id) { console.error('  (경고) 토큰 클레임에 계정 id 없음. 키: ' + Object.keys(payload).join(',')); }
    process.stdout.write(id || '');
  } catch (e) { console.error('  (경고) 토큰 페이로드 디코딩 실패: ' + e.message); }
});")"

echo "로그인 성공. accountId=${ACCOUNT_ID:-<파싱실패>}"

AUTH=(-H "Authorization: Bearer $TOKEN")

# ── 캡처 헬퍼 ───────────────────────────────────────────────────────────────
# 응답 본문과 상태코드를 함께 저장한다. 상태코드를 빼면 "빈 바디 200" 과 "204" 를 구분 못 한다.
capture() {
  local name="$1" method="$2" path="$3" body="${4:-}"
  local tmp status
  tmp="$(mktemp)"

  if [[ -n "$body" ]]; then
    status="$(curl -sS --max-time 15 -o "$tmp" -w '%{http_code}' \
      -X "$method" "$NEST_BASE_URL$path" "${AUTH[@]}" \
      -H 'Content-Type: application/json' -d "$body")"
  else
    status="$(curl -sS --max-time 15 -o "$tmp" -w '%{http_code}' \
      -X "$method" "$NEST_BASE_URL$path" "${AUTH[@]}")"
  fi

  node -e "
    const fs = require('fs');
    const raw = fs.readFileSync('$tmp', 'utf8');
    let body;
    try { body = raw.length ? JSON.parse(raw) : null; } catch (e) { body = { __unparsed: raw }; }
    fs.writeFileSync('$OUT_DIR/$name.json', JSON.stringify({
      request: { method: '$method', path: '$path' },
      status: Number('$status'),
      bodyEmpty: raw.length === 0,
      body,
    }, null, 2) + '\n');
  "
  rm -f "$tmp"
  printf '  %-34s %s  %s\n' "$name" "$status" "$method $path"
}

echo
echo "── 읽기 (GET) ──"
capture gamification-me            GET /gamification/me
capture gamification-badges        GET /gamification/badges
capture gamification-leaderboard   GET /gamification/leaderboard
capture gamification-leaderboard-century-unknown GET '/gamification/leaderboard?century=unknown'
capture gamification-centuries     GET /gamification/centuries
capture gamification-countries     GET /gamification/countries
capture gamification-activity      GET /gamification/activity
capture wallet-me                  GET /wallet/me
capture wallet-shop                GET /wallet/shop
capture wallet-shop-bad-category   GET '/wallet/shop?category=NOT_A_CATEGORY'
capture wallet-items               GET /wallet/items
capture artifacts-list             GET /artifacts
capture artifacts-collection       GET /artifacts/collection

if [[ -n "$ACCOUNT_ID" ]]; then
  capture gamification-profile     GET "/gamification/profile/$ACCOUNT_ID"
  capture wallet-equipped          GET "/wallet/equipped/$ACCOUNT_ID"
  capture artifacts-collection-of  GET "/artifacts/collection/$ACCOUNT_ID"
fi

echo
echo "── 에러 봉투 (상태를 바꾸지 않음) ──"
# 401 봉투가 프론트의 /auth/refresh 자동 재시도를 좌우한다. 모양이 달라지면 재로그인 루프가 난다.
tmp="$(mktemp)"
status="$(curl -sS --max-time 10 -o "$tmp" -w '%{http_code}' "$NEST_BASE_URL/wallet/me")"
node -e "
  const fs=require('fs'); const raw=fs.readFileSync('$tmp','utf8');
  let body; try{body=raw.length?JSON.parse(raw):null}catch(e){body={__unparsed:raw}}
  fs.writeFileSync('$OUT_DIR/wallet-me-unauthenticated.json', JSON.stringify({
    request:{method:'GET',path:'/wallet/me',note:'Authorization 헤더 없음'},
    status:Number('$status'), bodyEmpty: raw.length===0, body}, null, 2)+'\n');
"
rm -f "$tmp"
printf '  %-34s %s  %s\n' wallet-me-unauthenticated "$status" "GET /wallet/me (no auth)"

capture wallet-redeem-unknown-code POST /wallet/redeem '{"code":"__NO_SUCH_CODE__"}'

if [[ "$INCLUDE_MUTATING" == "1" ]]; then
  echo
  echo "── 쓰기 (POST) — DB 가 바뀐다 ──"
  echo "  주의: 아래는 원장에 행을 남긴다. 캡처 후 잔액·보유 아이템이 변한 상태가 새 기준선이 된다."
  capture wallet-exchange          POST /wallet/exchange '{"amount":10,"requestId":"golden-exchange-0001"}'
else
  echo
  echo "── 쓰기 (POST) 는 건너뜀 ──"
  echo "  성공 경로 골든이 필요하면: ./tools/capture-golden.sh --include-mutating"
  echo "  (DB 가 바뀐다는 것을 알고 실행할 것)"
fi

echo
echo "완료: $(find "$OUT_DIR" -name '*.json' | wc -l | tr -d ' ') 개 골든 → $OUT_DIR"
