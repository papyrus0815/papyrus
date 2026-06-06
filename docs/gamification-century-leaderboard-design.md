# 세기별 기여자 리더보드 — 설계 문서

작성일: 2026-06-05 · 상태: **✅ 구현 완료**

관련 문서: [`gamification-points-grade-design.md`](./gamification-points-grade-design.md)

## 구현 요약 (채택된 결정)

미래 지향적으로 가장 강력한 옵션을 채택해 구현했다.

- **데이터 모델**: 접근 A(비정규화). `PointEntry.contentCentury Int?` 추가 + 인덱스.
  부호 컨벤션 = AD 양수/BC 음수(`-1`=기원전 1세기). 세기 미상·현대국가는 null.
- **세기 산출**: `apps/api/src/libs/gamification/domain/century.ts` (프론트 `centuryOf`와 동일 컨벤션).
  `PointService.resolveContentCentury(ownerType, recordId)`가 **엔티티를 직접 읽어** 산출 →
  도메인 서비스로 세기 값을 넘길 필요 없음. 적립/보너스 시 record 전체 행을 최신 세기로 재스탬프.
- **D1 (세기 미상 처리)**: 숨기지 않고 **'세기 미상' 버킷**으로 선택 가능 → 어떤 기여도 손실 없음.
- **D2**: 데이터에 적립이 달린 세기만 동적 노출 (`GET /gamification/centuries`).
- **D3**: **세기 × 기간(all/week/month) 교차** 전부 지원.
- **D5**: 점수/등급/뱃지 정책 불변 — 순수 조회 슬라이스.
- **공개 프로필 세기 분해**: `GET /gamification/profile/:id` 응답에 `centuryBreakdown`(세기별 net 등록 수)
  추가 → 프로필에 "기여한 세기" 칩으로 노출. 셀렉터와 동일한 `centuryOptions(accountId?)` 헬퍼 재사용.

구현 파일: `gamification.prisma`, `domain/century.ts`, `application/point.service.ts`,
`presentation/gamification.controller.ts`, 마이그레이션 `20260605085514_add_point_entry_content_century`(백필 포함),
프론트 `entities/gamification/gamification.api.ts` + `pages/leaderboard/leaderboard.page.tsx`.

**한계(데이터 모델 기인)**: 인물 세기는 `birthDate`(MySQL DATETIME, 연 1000~9999)에서 산출하므로
고대·BC 인물은 세기가 null로 남을 수 있다. 역사적 국가는 `startYear`(Int)+era라 BC/고대도 정확.
**사건은 BC/고대 지원 완료**(2026-06-06) — `Event`에 구조화 날짜 필드(`startEra/startYear/...`)를 추가해
DATETIME 한계를 우회. 세기 산출은 `startYear+startEra` 우선. 상세는
`docs/`가 아닌 메모리 `event-structured-bc-date` 및 마이그레이션 `20260606072137_add_event_structured_bc_date` 참고.
잔여 갭: 사건 *목록*의 `?century=` 필터는 아직 AD만(레거시 DATETIME range). 타임라인 그룹핑은 BC 정상.

---

---

## 1. 목표

기존 리더보드는 **계정의 누적/기간별 점수 순위**다. 여기에 **세기(century) 축**을 추가해
"**19세기 콘텐츠를 가장 많이 등록한 기여자**"처럼 세기별 기여자 순위를 보여준다.

- 순위 대상: **기여자(계정)** — 콘텐츠 목록이 아니라 사람 순위 (사용자 확정)
- 세기 = 등록한 콘텐츠가 **다루는 시대**의 세기 (등록 시점/날짜가 아님)
- 결과물: 본 문서(설계/검토)만. 구현은 별도 합의 후.

---

## 2. 현재 구조 요약 (출발점)

| 요소 | 위치 | 메모 |
|------|------|------|
| 점수 원장 | `libs/db/prisma/gamification.prisma` → `PointEntry` | `accountId, amount, reason, ownerType, recordId, createdAt` |
| 적립/순위 로직 | `apps/api/.../gamification/application/point.service.ts` | `getLeaderboard(limit, meId, period)` |
| 컨트롤러 | `.../gamification/presentation/gamification.controller.ts` | `GET /gamification/leaderboard?limit&period` |
| 프론트 | `apps/web-admin/src/pages/leaderboard/leaderboard.page.tsx` | 전체/주간/월간 탭 |
| 세기 계산(프론트) | `apps/web-admin/src/widgets/person-infographic/model/century.ts` | `centuryOf(year)` — 재사용 가능 |

**기간 리더보드 핵심 쿼리** (`point.service.ts:357`):

```ts
prisma.pointEntry.groupBy({
  by: ['accountId'],
  where: { createdAt: { gte: start } },   // ← 여기에 세기 조건을 더하면 됨
  _sum: { amount: true },
})
```

→ 세기 축은 이 `where`에 **세기 필터 한 줄을 더하는 것**으로 자연스럽게 확장된다.
문제는 단 하나: **`PointEntry`에 세기 정보가 없다.**

---

## 3. 핵심 과제 — `PointEntry`에는 세기가 없다

세기는 콘텐츠 타입마다 **파생 출처가 다르다.**

| ownerType | 적립점수 | 세기 출처 | 세기 산출 가능? |
|-----------|:---:|------|:---:|
| `PERSON` | 30 | `birthDate` + `birthEra` | ✅ (생년 미상이면 ❌) |
| `EVENT` | 20 | `startDate` | ✅ (시작일 없으면 ❌) |
| `HISTORICAL_COUNTRY` | 30 | `startYear` + `startEra` | ✅ (시작년 없으면 ❌) |
| `COUNTRY` (현대국가) | 30 | **시간 필드 없음** | ❌ **항상 불가** |

> 적립 대상은 이 4종뿐 (`point.policy.ts`의 `CREATE_POINTS`). 즉 점수의 약 1/4(현대국가)은
> 구조적으로 세기를 가질 수 없고, 나머지도 "연도 미상" 비율만큼 세기를 못 매긴다.

이게 이 기능의 본질적 제약이며, **§5의 제품 결정**이 필요한 이유다.

---

## 4. 데이터 모델 — 두 가지 접근

### 접근 A. `PointEntry`에 세기 비정규화 (권장)

적립 시점에 콘텐츠의 세기를 계산해 원장 행에 **스냅샷**으로 박아둔다.

```prisma
model PointEntry {
  // ...기존 필드...
  /// 대상 콘텐츠가 다루는 시대의 세기 (BC는 음수, AD는 양수, 미상/현대국가는 null)
  /// 학술 컨벤션: 1701~1800 = 18, BC 100~1 = -1
  contentCentury Int? @map("content_century")

  @@index([contentCentury, accountId], name: "idx_point_entry_century")
}
```

- **쿼리**: `where: { contentCentury: X, createdAt: {gte: start} }` — 기존 groupBy에 그대로 합류. 빠름.
- **적립**: `awardForCreate` / `awardCompletenessBonus` / `revokeForRecord` 가 동일 `(ownerType, recordId)`에
  대해 **같은 세기 값**을 박아야 net 합산이 세기별로 정합. → 세기 계산을 record 기준 1회로 중앙화.
- **백필**: 기존 행은 마이그레이션에서 타입별로 조인해 1회 채움 (현대국가/미상은 null 유지).
- **트레이드오프**: 콘텐츠의 연도를 나중에 수정하면 과거 원장의 세기는 **스냅샷이라 안 바뀜**.
  → 빈도 낮음. 수용하거나, 엔티티 수정 훅에서 해당 record의 `contentCentury` 재스탬프(선택).

### 접근 B. 쿼리 시점 조인 (비권장)

스키마 변경 없이 리더보드 쿼리에서 `ownerType`별로 각 엔티티 테이블을 조인해 세기를 즉석 계산.

- 장점: 스키마/백필 불필요, 항상 최신 연도 반영.
- 단점: `ownerType`이 다형성이라 **타입별 분기 + 4-way 조인 + 인메모리 세기 환산**. 쿼리 복잡·느림,
  groupBy 한 방으로 안 끝남. 리더보드는 자주 호출되는 화면이라 비용 부담.

**결론: 접근 A 권장.** 세기는 콘텐츠 등록 후 거의 안 바뀌고, 읽기 빈도가 높아 비정규화가 적합.

---

## 5. 제품 결정 필요 항목

| # | 결정 사항 | 옵션 | 기본 제안 |
|---|-----------|------|-----------|
| D1 | **현대국가/연도미상**(세기 null) 처리 | (a) 세기별 리더보드에서 제외 (b) "현대·미상" 버킷으로 별도 노출 | (a) 제외 — 단 사용자에게 "이 점수는 세기 순위에 미포함" 안내 |
| D2 | 세기 **선택 UI 범위** | (a) 데이터에 존재하는 세기만 (b) 고정 전체 목록(BC~21C) | (a) 존재하는 세기만 동적 노출 |
| D3 | 세기 × **기간** 조합 | (a) 세기만 (전체기간 고정) (b) 세기 + all/week/month 교차 | (a) 1차는 세기만, 기간 교차는 2차 |
| D4 | 세기 **경계/BC 컨벤션** | `century.ts`와 동일(1701~1800=18C, BC 음수) | 프론트 로직 재사용해 일관성 유지 |
| D5 | "세기가 있는 콘텐츠만 점수 인정" 여부 | 점수 정책은 **불변**, 세기는 순위 필터일 뿐 | 점수/등급/뱃지엔 영향 없음 — 순수 조회 슬라이스 |

> **D1이 가장 중요.** 현대국가 등록 30점이 세기 리더보드에서 빠지면 사용자 혼란 가능 → 명시 안내 필수.

---

## 6. 구현 범위 (합의 시)

### 백엔드
1. `gamification.prisma` → `PointEntry.contentCentury` 추가 (소스: `libs/db/prisma/`, **`db:build` 후** 마이그레이션 — CLAUDE.md 규칙)
2. 세기 산출 유틸을 백엔드에 추가 (프론트 `centuryOf` 로직 포팅 또는 공용 모듈화). 타입별 입력:
   - PERSON: `birthDate`+`birthEra`, EVENT: `startDate`, HISTORICAL_COUNTRY: `startYear`+`startEra`
3. `point.service.ts`
   - `awardForCreate`/`awardCompletenessBonus`/`revokeForRecord`: record 기준 세기 1회 산출 → 모든 신규 행에 스탬프
   - `getLeaderboard(limit, meId, period, century?)`: `century` 지정 시 groupBy `where`에 `contentCentury` 추가
   - 세기 목록 조회용 메서드(`getAvailableCenturies`) — D2(a)면 `groupBy contentCentury` distinct
4. `gamification.controller.ts`: `GET /gamification/leaderboard`에 `century` 쿼리 추가, `GET /gamification/centuries`(선택)
5. 마이그레이션 백필: 기존 PointEntry를 타입별 조인으로 `contentCentury` 1회 채움
6. **SDK 재생성**: `apps/api/src/api/functional/` (build:nestia 무동작 우회 — 메모리 참조)

### 프론트
7. `leaderboard.page.tsx`: 기간 탭 옆에 **세기 선택기**(드롭다운/칩) 추가
8. `apps/web-admin/src/shared/api/` 래퍼에 `century` 파라미터 전달
9. 세기 미선택 시 = 기존 전체 리더보드(하위호환). 선택 시 = 세기 슬라이스 + "세기 미상 점수 제외" 안내

### 영향 없음
- 점수/등급/뱃지 정책, `Account.totalPoints` 캐시, 기존 `/leaderboard?period=` 동작 (파라미터 추가 only)

---

## 7. 작업량 개략

| 항목 | 규모 |
|------|------|
| 스키마 + 마이그레이션 + 백필 | S |
| 세기 산출 유틸 + 적립 3개 메서드 스탬핑 | M (타입별 분기·테스트) |
| 리더보드 쿼리 확장 + 세기 목록 API | S |
| SDK 재생성 | S (우회 절차) |
| 프론트 세기 선택기 + 래퍼 + 안내 | M |

대략 **백엔드 위주의 중간 규모 1건**. 가장 큰 리스크는 §3 세기 산출의 타입별 정합성과 D1 UX 결정.

---

## 8. 권장 결론

- 기술적으로 **무리 없음**. 기존 groupBy 리더보드에 비정규화 컬럼 하나 추가하는 깔끔한 확장.
- 단, **세기를 못 매기는 콘텐츠(현대국가·연도미상)** 를 어떻게 다룰지(D1)를 먼저 못 박아야 함.
- 점수 정책은 건드리지 않고 **순수 조회 슬라이스**로 가는 게 안전 (등급/뱃지 영향 0).
- 1차는 "세기만" 슬라이스로 단순하게, 기간×세기 교차(D3)는 반응 보고 2차.
