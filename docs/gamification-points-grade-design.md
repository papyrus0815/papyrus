# 게이미피케이션(점수·등급) 설계서

> 상태: **1차·2차·3차 구현 완료**.
> - 1차(적립부): 인물/사건/국가/역사적국가 등록·삭제 시 점수 적립/회수.
> - 2차(조회·노출): `GET /gamification/me` + `account.me`에 totalPoints·gradeCode + web-admin 헤더/프로필 등급 칩·진행 바.
> - 3차(뱃지·리더보드·등급업 알림): `AccountBadge` 테이블 + 코드 정의 뱃지 카탈로그(영구), `GET /gamification/badges`·`GET /gamification/leaderboard`, web-admin 리더보드 페이지(`/leaderboard`)·뱃지 그리드, 등급 상승/새 뱃지 토스트.
> - 3.5차(뱃지 노출 강화): 뱃지 **진행도**(current/target, 잠금 뱃지 진행 바), **프로필 드롭다운** 뱃지 노출(획득 수 + compact 그리드), **알림 벨 연동**(개인 성취를 localStorage 영구 저장 후 벨에 병합), **등록 직후 즉시 토스트**(콘텐츠 create mutation에서 `invalidateGamification`).
> - 4차(완성도 보너스): `COMPLETENESS_BONUS` 실제 적립. 신호당 5점, 콘텐츠당 1회(unique·멱등). 인물=사진/약력/출생연도, 국가=썸네일/수도/현지어명, 역사적국가=썸네일/설명/명칭유래(각 등록·수정 시), 사건=이미지/섹션/배경(등록 시). 삭제 시 base점과 함께 자동 회수.
> 미구현: Notification 개인 타깃(accountId 미도입 — 개인 알림은 프론트 스토어로 처리), 완성도 보너스 사용자 안내 카피(현재는 점수에만 반영).
> 목적: 사용자가 인물·사건·국가 등 콘텐츠를 등록할 때 **점수를 적립하고 등급을 부여**해 등록 욕구를 자극한다.
> 결정 사항: 등급 테마 = **일반 등급(Bronze~Diamond)**, **어뷰징 방지 포함**, 1차 범위 = 백엔드 점수 적립부.

---

## 1. 배경 / 현황

### 재활용 가능한 기존 자산
- `Account` (`libs/db/prisma/common.prisma`) — 유저 본체. **점수/등급 필드 없음.**
- 콘텐츠 작성자 추적이 **이미 존재**:
  - `Event.createdById` (사건)
  - `Person.accountId`, `Country.accountId`, `HistoricalCountry.accountId`, `PersonLifeEvent.accountId`
- `ActionLog` (`common.prisma`) — 시스템 전체 CRUD 감사 로그. 단 **accountId 미보유**(누가 했는지 모름).
- `Notification` — 유저 알림 인프라. 등급업/뱃지 알림에 재활용 가능.
- `AggregateType` enum (`base.prisma`) — PERSON, COUNTRY, HISTORICAL_COUNTRY, EVENT 등 콘텐츠 타입을 이미 망라 → 점수 원장의 `ownerType`으로 그대로 사용.
- `EventMethod` enum — CREATE/UPDATE/DELETE.

### 없는 것
- 점수 적립/차감 기록, 등급, 기여 통계, (뱃지/리더보드).

---

## 2. 핵심 설계 결정 — 점수 원장(Ledger) 방식

| 방식 | 장점 | 단점 |
|---|---|---|
| A. 실시간 집계 (콘텐츠 테이블 `accountId` COUNT) | 스키마 변경 최소 | 6+ 테이블 조인, 정책 변경 시 전수 재계산, **어뷰징 추적 불가** |
| **B. 점수 원장 테이블** ✅ 채택 | 액션 1건 = 1행, 감사 가능, **삭제 시 차감 처리**, 정책 분리, 조회는 캐시로 빠름 | 적립 훅 추가 필요 |

**B 채택.** 이유: 어뷰징 방지(삭제 회수 행), 정책 일원화, `Account` 합계 비정규화로 빠른 조회.

---

## 3. 데이터 모델

> ⚠️ 스키마는 `libs/db/prisma/*.prisma` 소스 수정 후 `npm run db:build`. `apps/api/prisma/schema.prisma` 직접 수정 금지 (CLAUDE.md).
> 신규 도메인 파일 권장: `libs/db/prisma/gamification.prisma`

### 3.1 PointEntry — 점수 원장 (적립/차감 1건 = 1행)

```prisma
model PointEntry {
  id        String        @id @default(uuid()) @db.Char(36)
  accountId String        @map("account_id") @db.Char(36)
  amount    Int           // +적립 / -차감(삭제 회수)
  reason    PointReason   @map("reason")
  ownerType AggregateType @map("owner_type")  // 기존 enum 재사용
  recordId  String?       @map("record_id") @db.Char(36)
  createdAt DateTime      @default(now()) @map("created_at")

  account   Account       @relation(fields: [accountId], references: [id])

  // 동일 액션 중복 적립 차단 (어뷰징/재시도 방지의 1차 방어선)
  @@unique([accountId, ownerType, recordId, reason], name: "uniq_point_action")
  @@index([accountId])
  @@map("point_entry")
}

enum PointReason {
  CREATE_CONTENT       // 콘텐츠 등록 적립
  COMPLETENESS_BONUS   // 완성도 보너스(사진/출처/연보 등)
  CONTENT_DELETED      // 소프트삭제로 인한 회수(음수)
  ADMIN_ADJUST         // 운영자 수동 조정
}
```

> `@@unique`에 `recordId`가 NULL인 reason(예: 일회성 운영 조정)은 충돌하지 않도록 주의 — 운영 조정은 recordId를 항상 채우거나 별도 처리.

### 3.2 Account 확장 (비정규화 캐시)

```prisma
model Account {
  // ...기존 필드
  totalPoints Int          @default(0) @map("total_points")
  gradeCode   String       @default("BRONZE") @map("grade_code") @db.VarChar(20)
  pointEntries PointEntry[]
}
```

`totalPoints`/`gradeCode`는 `PointEntry` 합계의 캐시. **단일 트랜잭션**에서 PointEntry 추가 + Account 합계 갱신 + 등급 재계산을 함께 처리해 정합성 유지.

---

## 4. 점수 정책 (초안 — 운영 중 튜닝)

### 4.1 콘텐츠별 기본 적립 (가중치 = 등록 난이도/가치)

| 콘텐츠 | ownerType | 기본점 | 비고 |
|---|---|---|---|
| 인물 | PERSON | 30 | 입력량 많음 |
| 국가 | COUNTRY | 30 | |
| 역사적 국가 | HISTORICAL_COUNTRY | 30 | |
| 사건 | EVENT | 20 | |
| 인물 연보 항목 | PERSON(연보) | 5 | 소규모 |

### 4.2 완성도 보너스 (`COMPLETENESS_BONUS`)
필수필드만 채운 "양산형" 대신 **질 좋은 등록**을 유도:
- 사진/대표 이미지 첨부: +5
- 출처/참고 링크: +5
- 연보·세부 항목 N개 이상: +5
> 콘텐츠별로 보너스 항목은 도메인 특성에 맞춰 정의.

### 4.3 점수 → 등급 매핑 (코드 상수, 테이블 X)

| 등급 | 코드 | 누적 점수 |
|---|---|---|
| Bronze | BRONZE | 0 ~ 99 |
| Silver | SILVER | 100 ~ 299 |
| Gold | GOLD | 300 ~ 699 |
| Platinum | PLATINUM | 700 ~ 1499 |
| Diamond | DIAMOND | 1500 ~ |

> 임계값은 코드 상수(`gamification` 모듈)로 둬 운영 중 조정 용이. 테이블화는 과설계.

---

## 5. 어뷰징 방지 (등록→삭제 파밍 차단)

1. **삭제 시 점수 회수**: 콘텐츠 소프트삭제(`deletedAt` 세팅) 시 동일 record에 대해 `CONTENT_DELETED` 음수 행 추가 → 합계에서 차감.
2. **중복 적립 차단**: `@@unique(accountId, ownerType, recordId, reason)` — 같은 콘텐츠로 재적립/재시도 불가.
3. **재등록 재적립 방지**: 삭제 후 동일 recordId 복구 시, 회수 행이 존재하면 재적립하지 않거나 순적립 0 유지(정책 결정 필요).
4. (선택) **레이트 리밋/리뷰**: 단시간 대량 등록 감지 시 적립 보류 — 2차 과제.

---

## 6. 코드 적용 지점

신규 모듈: `apps/api/src/libs/gamification/`
- `application/point.service.ts` — `award(accountId, ownerType, recordId, reason, amount)` / `revoke(...)` , 트랜잭션 처리 + 등급 재계산.
- `domain/grade.ts` — 점수→등급 상수/함수.

호출 위치 (각 도메인 service의 create / soft-delete):
- `libs/event/application/*` — 사건 create 후 `award(..., EVENT, ...)`, delete 시 `revoke`.
- `libs/person/application/*` — 인물.
- `libs/country/application/*`, `libs/historical-country/application/*`.

> 결합도를 낮추려면 도메인 이벤트(생성/삭제 이벤트) 발행 → gamification 모듈이 구독하는 방식이 이상적이나, 1차는 service 직접 호출로 단순하게 시작 가능.

현재 유저 식별: `req.user?.id ?? req.user?.sub` (JWT `sub`), `@UseGuards(AuthGuard('jwt'))` — 기존 컨트롤러 패턴 그대로.

---

## 7. 단계적 구현 로드맵

1. **1차 (백엔드 적립부)** — 본 문서 범위
   - `gamification.prisma` 추가 → `db:build` → migrate
   - `PointService` + 등급 상수
   - 인물/사건/국가 create·delete 훅 연결
   - `build:nestia` (주의: 무동작 우회 필요 — memory 참고)
2. **2차 (노출)** — 프로필/헤더에 점수·등급 표시 (`web-admin`)
3. **3차 (확장)** — 뱃지(`Badge`/`AccountBadge`), 리더보드, 등급업 `Notification`, 레이트리밋

---

## 8. 미결 사항 (추후 결정)

- 삭제 후 재등록 시 재적립 허용 여부 (§5.3)
- 완성도 보너스 항목의 콘텐츠별 정확한 기준
- 기존 데이터 백필 여부 (이미 등록된 콘텐츠에 소급 점수 부여할지)
- UPDATE(수정)에도 소액 적립할지 (현재는 CREATE만)
