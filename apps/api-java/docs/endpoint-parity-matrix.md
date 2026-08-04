# 엔드포인트 이관 현황 (23)

경로는 Nest 와 **완전히 동일**하게 간다. 전역 prefix 없음. 파일럿은 `:8081` 에 뜬다.

범례 — 골든: `RO` 읽기 캡처됨 / `ERR` 에러 봉투만 / `—` 미캡처(쓰기라 DB 를 바꿈)

## gamification (7)

| # | 메서드 | 경로 | 담당 클래스 | 골든 | 구현 | 비고 |
|---|---|---|---|---|---|---|
| 1 | GET | `/gamification/me` | `GamificationController.me` | RO | ⬜ | null 이면 빈 바디 200 |
| 2 | GET | `/gamification/badges` | `.badges` | RO | ⬜ | 카탈로그 19종 전량. DB enum 아니라 Java 상수 |
| 3 | GET | `/gamification/leaderboard` | `.leaderboard` | RO | ⬜ | `limit/period/century/country` 전부 String 수신 |
| 4 | GET | `/gamification/centuries` | `.centuries` | RO | ⬜ | net>0 만, 미상 맨끝. `century='unknown'` sentinel 유지 |
| 5 | GET | `/gamification/countries` | `.countries` | RO | ⬜ | 브리지 합산 |
| 6 | GET | `/gamification/activity` | `.activity` | RO | ⬜ | limit 기본 30 · 캡 100 |
| 7 | GET | `/gamification/profile/{accountId}` | `.profile` | RO | ⬜ | 소유권 검사 없음(현행 동일) |

## wallet (11)

| # | 메서드 | 경로 | 담당 클래스 | 골든 | 구현 | 비고 |
|---|---|---|---|---|---|---|
| 8 | GET | `/wallet/me` | `WalletController.me` | RO + ERR(401) | ✅ | 골든 대조 + 라이브 대조 통과. 키 순서·날짜 포맷 포함 |
| 9 | POST | `/wallet/exchange` | `.exchange` | — | ⬜ | 멱등키 `EXCHANGE:{requestId}`. 중복은 흡수 후 200 |
| 10 | POST | `/wallet/redeem` | `.redeem` | ERR(404) | ⬜ | 재사용은 **409** |
| 11 | GET | `/wallet/shop` | `.shop` | RO | ⬜ | 잘못된 category 는 무시(200) |
| 12 | POST | `/wallet/shop/purchase` | `.purchase` | — | ⬜ | 멱등키 `CONSUME:{itemId}:{requestId}` |
| 13 | GET | `/wallet/items` | `.items` | RO | ⬜ | N+1 시연 무대 (`UserItem.item` 이 유일한 `@ManyToOne`) |
| 14 | GET | `/wallet/equipped/{accountId}` | `.equippedOf` | RO | ⬜ | 축약 4필드 projection |
| 15 | POST | `/wallet/items/equip` | `.equip` | — | ⬜ | 같은 카테고리 형제 자동 해제 |
| 16 | POST | `/wallet/grant` | `.grant` | — | ⬜ | 운영자 전용 |
| 17 | POST | `/wallet/promo` | `.createPromo` | — | ⬜ | 운영자 전용 |
| 18 | POST | `/wallet/refund` | `.refund` | — | ⬜ | 멱등키 `REVERSAL:{itemId}` — `{ledgerId}` 로 바꾸면 무한 증폭 |

## artifacts (5) — W6, 첫 컷 대상

| # | 메서드 | 경로 | 담당 클래스 | 골든 | 구현 | 비고 |
|---|---|---|---|---|---|---|
| 19 | GET | `/artifacts` | `ArtifactController.list` | RO | ⬜ | |
| 20 | GET | `/artifacts/collection` | `.myCollection` | RO | ⬜ | |
| 21 | GET | `/artifacts/collection/{accountId}` | `.collectionOf` | RO | ⬜ | |
| 22 | POST | `/artifacts/purchase` | `.purchase` | — | ⬜ | `SpendService` 를 REQUIRED 전파로 재사용 |
| 23 | POST | `/artifacts/display` | `.display` | — | ⬜ | |

## 현황

| | |
|---|---|
| 구현 완료 | **1 / 23** (`GET /wallet/me`) |
| 골든 확보 | 18건 — GET 16 · 에러 봉투 2 |
| 골든 미확보 | 쓰기 7 (`--include-mutating` 필요, DB 가 바뀜) |
| 라이브 대조 | `./tools/live-parity.sh` — 구현된 경로만. 현재 1/1 일치 |

**MVP 컷라인은 #1–#18 (gamification 7 + wallet 11).** artifacts 5 는 일정이 밀리면 첫 번째로 자른다.
