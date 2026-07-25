# 인물 상세 → 같은 국가 전/후 재위(승계) 검토서

- 작성일: 2026-07-22
- 상태: **검토 완료 · B1~B4 전 배치 구현·검증 완료(미커밋)** (2026-07-22)
  - **B1 백엔드**(구현·검증): `person-reign-adjacency.{service,controller}.ts`·`dto`·`head-record.shared.ts`(공용 추출, contemporaries도 소비 전환)·`person.module.ts` 배선. **라이브 검증**(러시아 왕조): 파벨 1세=선대 예카테리나 2세/후대 알렉산드르 1세·정상승계 overlap=false, 예카테리나 2세=선대 표트르 3세/후대 파벨.
  - **B2 프론트 데이터층**: `shared/api/person-reign-adjacency.ts`(래퍼+queryKeys)·`invalidate-tenure.ts` prefix 등록.
  - **B3 UI**: `succession-box.{tsx,lib.ts}`·`tenure-reign-list.tsx`·`person-detail-panel.tsx`(useQuery 1회·recordId 맵 주입·무효화). tsc 0·eslint 0(내 파일)·render 5 pass.
  - **B4 크로스-정체 전이 그래프**(구현·검증): `resolveScope`가 succession 모드에서 `HistoricalCountryTransition`(STATE_SUCCESSION+REGIME_CHANGE) 1-hop 확장 + historical→modern linkedModern. 프론트는 scope=succession 기본 요청. **라이브 검증**: 표트르 대제 제국 재위의 선대가 (B4 전엔 공백) 차르국 이반 5세+표트르(공동군주, co-boundary)로 채워짐·차르국↔제국 크로스 성립, degraded=false.
  - **검증 총계**: API 유닛 41 pass(adjacency 20[B1 16+B4 4] + contemporaries 회귀 21), web render 5 pass, 내 파일 tsc/eslint 0.
  - ⚠️ `build:api`가 **비영-종료**하나 이는 **기존 broken nestia SDK**(`src/api/functional/*` 부분 생성, `nestia sdk` ConfigAnalyzer TypeError — 메모 build-nestia-noop-workaround) 탓이며 내 코드 무관. `tspc`는 noEmitOnError=false라 dist를 정상 emit(내 service/controller 컴파일 확인) → 백엔드 배포·구동 정상.
- 요구: 인물 상세에서 재위(또는 수장급 재임)가 등록돼 있으면, **그 인물이 다스린 같은 국가의 바로 앞(선대)·바로 뒤(후대) 재위**를 클릭 없이 보고, 클릭으로 그 인물 상세로 이동하고 싶다.
- 방법: 10-에이전트 워크플로(5 병렬 정독 → 4 설계 facet → 1 적대적 완전성 비평). 기존 「동시대 수장」 기능(코드) 실측 대조 + `HistoricalCountryTransition`/시드 filing 규약 실측 확인. 비평 확정 결함 8건(P1 0 · P2 6 · P3 2)을 아래 결정으로 수렴 반영.

> **한 줄 요약**: 이 기능은 이미 출시된 「동시대 수장」(시간 **겹침**, OVERLAP)의 **시간축 인접**(ADJACENCY = 승계) 자매다. 유니온 소스·부호연도·dedup·isOwned·가드 등 기반은 거의 그대로 미러링하되, **핵심 한 곳 — "같은 국가" 스코프 — 만은 재사용하면 안 된다**(§2.2). **DB 스키마 변경 0건**의 순수 읽기모델로 구현 가능.

---

## 1. 현황 진단 (검증된 코드 사실)

### 이미 갖춰진 것 (핵심 지렛대)
- **자매 계약이 완성돼 있다** — `GET /persons/:id/contemporaries` 쿼드(컨트롤러·서비스·DTO·spec, `apps/api/src/libs/person/{application,presentation}/`)가 "인물 X의 재위 기간에 **누가 동시에** 통치했는가"를 답한다. 승계는 같은 재료로 "누가 **바로 앞뒤에** 통치했는가"를 답하면 된다.
- **그대로 미러링 가능한 규약**(`person-contemporaries.service.ts`):
  - 유니온 소스: `GovernmentPositionTenure(positionType ∈ {HEAD_OF_STATE, HEAD_OF_GOVERNMENT})` ∪ `SovereignReign` 전량을 **한 시간축으로 병합**(:14, :149). → tenure↔reign 크로스(마지막 왕→초대 대통령)가 자연 성립.
  - 부호연도(BC 음수) 계약, `signedYearFromEraDate`(:21), `utcYearStart`(:34 — `setUTCFullYear`로 y<100→19xx 함정 회피).
  - dedup: `${personId}:${startDate.slice(0,10)}`(UTC **날짜** 단위) 키, 충돌 시 **REIGN 우선**(:293) — normalize-tenures와 규칙 일치(두 화면이 다르게 세면 안 됨).
  - `effectiveEndYear`(:52 — 종료일 null을 사망연도/올해로 캡), `RULER_PERSON_SELECT`(:84), `isOwned`(:352 — 타계정 인물은 상세 진입 불가라 칩 비활성).
  - 권한 혼합: 대상(:id)은 `findFirst({id, accountId})` 소유자 게이트, 결과 목록은 글로벌 읽기. `@UseGuards(AuthGuard('jwt'))` 클래스 가드(무가드 tenure GET 안티패턴 복제 금지).
  - 무성 절단 금지: cap 후 `omittedCount` 노출, 프론트 캡션 강제(`dto:80`).
- **승계 진실원 테이블이 이미 존재·시드됨** — `HistoricalCountryTransition`(`libs/db/prisma/historical.prisma:300`): `predecessorId`/`successorId` + `transitionScope`(`STATE_SUCCESSION` 등), `@@index([predecessorId, successorId])`. 정체(政體) 전환 승계선의 **방향성 그래프**. (m:n 무순서 `HistoricalCountryModernCountry`와 대비 — 후자는 승계/병렬을 구분 못 함.)
- **통합 지면·삽입 자리가 이미 있다** — 개요 탭 `<section aria-label="재임·재위">`(`person-detail-panel.tsx:2075`)에서 `TenureReignList`가 재임·재위 카드를 **record별** 렌더하고, 각 카드는 `d.country?.{id,name}`·`d.historicalCountry?.{id,name}`·`d.startDate`·`d.id`를 로컬 보유. `CabinetConnections`가 `UnifiedCardMain` 안 `TenureAchievements` 다음에 `!isReign && onPersonClick && …` 게이트로 **per-card 렌더**(`tenure-reign-list.tsx:228`)된다 — 승계 박스가 그대로 미러할 위치·게이트 선례.
- 프론트 배선 선례: `shared/api/person-contemporaries.ts`(래퍼+queryKeys), `contemporaries-strip.tsx`(+`.lib.ts`), `handlePersonClick`(모달스택 — 페이지 이탈 없음), `invalidateTenureQueries`(`['person-contemporaries']` prefix 등록).

### 스키마 사실
- `SovereignReign`/`GovernmentPositionTenure` 모두 `startDate`(필수 DATETIME)·`endDate`(nullable)·`countryId?`/`historicalCountryId?`·`regnalNumber?`·`termNumber?` 보유. **`idx_sovereign_reign_startDate`·`idx_gov_tenure_startDate` 단일 인덱스 존재**(이웃 쿼리 프루닝에 활용). `endDate`·복합 `(positionType, startDate)`는 **무인덱스**.
- **시드 filing 규약(실측)**: 재위·재임 시드에서 `historicalCountryId` 496회 vs `countryId` 121회 — **역사 인물은 압도적으로 `historicalCountryId`에 filed**. (§5-4 크로스-정체 비대칭의 근거.)

### 갭 (없는 것)
- **인접(전/후) 발견 API가 없다.** `contemporaries`는 시간창 overlap이라 인접을 못 답한다. `/person-records/compare`는 `personIds` 필수(enrichment 전용). 국가의 역대 승계선을 record 인접으로 답하는 계약이 코드베이스에 없다.
- **BC 재위는 서버에 존재 불가** — tenure/reign `startDate`는 AD 전용 DATETIME이고 era/signed 컬럼이 없다. tenure/reign era 마이그는 지연 배치에도 미등재(동시대 수장 검토서 §4-7과 동일 한계). → 카이사르·진시황 승계는 지금 불가, **별도 마이그 항목**.

---

## 2. 핵심 결정

### 2.1 직교 신설 — `GET /persons/:id/reign-adjacency` (권고)
`/contemporaries`를 모드 파라미터로 확장하지 **않는다**. 근거:
1. **응답형이 근본적으로 다르다.** contemporaries=`{ window, rulers[] }`(시간창+인물목록), adjacency=`{ entries[]{ subjectRecordId, predecessors[], successors[] } }`(창 없음, record별 앵커+관계). 한 핸들러에 `resolveWindow`(병합구간 유도) vs record-anchored(창 없음)를 욱여넣으면 계약이 오염된다.
2. **DTO 헤더가 직교 신설을 선례로 승인** — contemporaries DTO 주석이 스스로를 "첫 발견(discovery) 계약 … 미래 지면이 재사용"이라 선언. adjacency는 같은 논리의 두 번째 직교 발견 계약.
3. **스코프 계약이 정반대**(§2.2). 같은 엔드포인트가 상반된 스코프 규칙을 가질 수 없다.

### 2.2 ⚠️ "같은 국가" 스코프 — `buildSameCountryWhere` **재사용 금지** (이 검토의 최중요 판단)
동시대 수장의 `buildSameCountryWhere`(:418)는 `historicalCountryModernCountry` m:n 브리지로 역사↔현대를 **양방향 union**한다. **동시대에선 시간창이 병렬 정체를 프룬해 무해**하지만, **승계엔 시간창이 없어** 병렬 정체가 날짜순 한 체인에 인터리브해 **가짜 선대/후대를 조용히 생성**한다.

- 실증(코드 확인): 모던→역사 방향 확장(`linkedHistorical`, `service.ts:441-448`)은 현대 깃발 하나(`countryId=FR`)에 매달린 **모든** 역사정체(서프랑크·왕국·제국·5공화국·**로트링겐 공국**(병렬))를 끌어온다. 독일은 HRE·프로이센·바이에른·작센 등 30+ 병렬 정체가 `['DE']`로 묶여 최악.

**확정 스코프 규칙**:
- **① 인스턴스 한정(MVP 기본)** — 앵커 record가 filed된 **정확한 인스턴스**(`countryId` 또는 `historicalCountryId`)로만 좁힌다. 확장 0. 항상 안전(가짜 이웃 불가), 다만 정체 경계에서 체인이 끊길 수 있음.
- **② 크로스-정체 승계(Batch 4, 가산)** — 왕국→공화국 같은 정체 전환은 **`HistoricalCountryTransition`(방향성 predecessor/successor, `transitionScope=STATE_SUCCESSION`) 그래프로만** 1-hop 확장. 병렬 공존 정체는 전이 엣지가 없어 유입되지 않는다.
- **③ 폴백** — 전이 미시드 국가는 **인스턴스-only로 강등**(체인 단절 감수 ≫ 가짜 이웃). `meta`로 강등을 정직하게 노출(브리지로 가짜 채우기 금지).
- **record 단위 필수** — 대상 record 전체를 union하지 않는다. 프랑스+스페인 동시 통치자(부르봉)의 프랑스 재위 이웃에 스페인 왕이 끼면 안 됨.

---

## 3. 설계

### 3.1 API 계약

```
GET /persons/:id/reign-adjacency
  Guard : @UseGuards(AuthGuard('jwt'))          // 클래스 가드 — 무가드 tenure GET 복제 금지
  Param : id                                    // 대상 인물 (소유자 게이트 → 미소유 404)
  Query : scope? 'instance'|'succession'         // 기본 'instance' (MVP). 'succession'=전이그래프 가산(Batch 4)
                                                // ⚠️ fromYear/toYear 없음(창 개념 없음). depth 파라미터도 MVP엔 없음 — ±1 고정.
```

**알고리즘**(결정본):
1. 대상 소유자 게이트 `findFirst({id, accountId})` → 미소유 **404**.
2. 대상 수장급 record 수집: `TENURE(positionType ∈ HEAD_POSITION_TYPES)` ∪ `SOVEREIGN_REIGN` 전량 → **dedup**(`person+startDate.slice(0,10)`, REIGN 우선) → `startDate` null·미파싱·**BC(연<1)** 는 앵커에서 제외.
3. 각 앵커 record `R` 마다 **인스턴스 스코프 `W_R`**: `R.historicalCountryId` 있으면 `{historicalCountryId}`, 아니면 `{countryId}`, 둘 다 없으면(교황 등) 빈 엔트리.
4. `W_R` 안에서 head 후보 풀을 **글로벌 읽기**로 조회(`positionType IN HEAD_POSITION_TYPES` 절 **필수** — SovereignReign은 전량 head라 불필요) → dedup → `startDate` 정렬. **SQL은 스코프·경계 프루닝, JS 후처리가 진실.**
   - **선대** = `startDate < S`(앵커 시작) 중 **최댓값 경계 그룹**(동률 전부).
   - **후대** = `startDate > S` 중 **최솟값 경계 그룹**(동률 전부).
5. 각 이웃 `isOwned = accountId != null && person.accountId === accountId`.

**재사용(추출 권고 → 신규 `person/application/head-record.shared.ts`, contemporaries도 소비하게 리팩터)**: `HEAD_POSITION_TYPES`, `yearOf`/`signedYearFromEraDate`/`utcYearStart`, `effectiveEndYear`/`deathInfoOf`, `RULER_PERSON_SELECT`/`recordSelect`, record→DTO 매퍼(SOVEREIGN_REIGN→positionType HEAD_OF_STATE 어댑터 — categorize 오분류 방지의 단일 지점), dedup 규칙. **재사용 금지**: `buildSameCountryWhere`(§2.2), `resolveWindow`(창 없음), overlap 3-branch SQL.

### 3.2 응답 DTO — 봉투 확정 (비평 #3 수렴: predecessors/successors는 **반드시 배열**)

```typescript
// person-reign-adjacency.response.ts
import type {
  ContemporaryRecordDto,       // recordKind/positionType/title/regnalName/startYear/endYear/country/historicalCountry
  ContemporaryRulerPersonDto,  // id/name/.../deathYear/isOwned  — 재사용(import)
} from './person-contemporaries.response'

export type AdjacencyRelation = 'PREDECESSOR' | 'SUCCESSOR'  // 프론트: 선대/후대

export interface AdjacencyRecordDto extends ContemporaryRecordDto {
  startDatePrecision: string | null  // 'year'면 01-01 관행채움 — 같은 해 동률/정밀도 인지(additive)
}

export interface AdjacencyNeighborDto {
  relation: AdjacencyRelation
  person: ContemporaryRulerPersonDto  // isOwned 포함 — 타계정이면 칩 비활성
  record: AdjacencyRecordDto
  overlapsAnchor: boolean             // 앵커 재위와 기간 겹침(공동/중첩) — 순수 승계 아님 표시(비평 #2)
  coBoundary: boolean                 // 같은 경계 startDate 공유하는 공동 이웃이 이 그룹에 함께 있음
  isSelf: boolean                     // 대상 본인의 다른 재위단계(복위·공동→단독) — 딥링크 비활성(비평 #1)
}

export interface ReignAdjacencyEntryDto {
  subjectRecordId: string             // 대상 이 재위 record (카드가 이 id로 조인)
  subjectRecordKind: 'TENURE' | 'SOVEREIGN_REIGN'
  scope: { countryId: string | null; historicalCountryId: string | null; degradedToStrict: boolean }
  predecessors: AdjacencyNeighborDto[]  // 배열 — 동률(공동군주) 전부, 무성절단금지
  successors: AdjacencyNeighborDto[]
  omittedCoBoundaryCount: number        // 0 아니면 캡션 필수
}

export interface PersonReignAdjacencyResponseDto {
  meta: {
    scope: 'instance' | 'succession'
    totalSubjectRecords: number
    bcSkippedCount: number       // BC라 계산 못한 앵커 수
    noCountryCount: number        // 국가정보 없어 스코프 못 잡은 앵커 수(교황 등)
  }
  entries: ReignAdjacencyEntryDto[]
}
```
- `recordKind`는 `'SOVEREIGN_REIGN'` **정확 토큰** 유지(categorize 정확일치 계약, `categorize.ts:53`) — lowercase 넘기면 전원 오분류.

### 3.3 프론트 UI — **카드 인라인 "승계 박스"** (권고), 리스트 하단 단일 스트립 부결

**근거**: 복위·다국가 통치 인물은 재위 record가 여럿이라 "인물의 전/후"는 정의 불가 — **record 단위**여야 한다. 단일 스트립은 "**어느 재위**의 선대인가"를 구조적으로 구분 못 해 결국 재위별 그룹핑을 다시 요구(인라인 이점 소멸). 카드는 이미 필요한 record 필드를 로컬 보유하고 `CabinetConnections` per-card 게이트 선례가 있다. 위키백과 succession box도 "인물"이 아니라 "직위/재위"에 붙는다.

**쿼리 1회로 전 카드 충족**: 배치 엔드포인트가 대상의 모든 수장급 record 전/후를 한 번에 반환 → 카드는 `adjacencyByRecordId.get(d.id)`로 조회만(per-card N쿼리 회피).

```
┌──────────────────────────────────────────────────────────────────────┐
│ [재위] 루이 15세 · 국왕         15대                    [연임]      ✎  │  ← 기존 카드
│ 🇫🇷 프랑스 왕국 · 부르봉 왕조 5대 · 1715–1774 · 5세경에 즉위             │
│ 즉위: 세습 · 즉위식: 랭스 대관식                                        │
│ ▸ 업적 2건 …                                                          │
│ ┌─ 승계 ───────────────────────────────────────────────────────────┐ │  ◀ 신규(CabinetConnections 자리)
│ │  ← 선대                                              후대 →        │ │
│ │  ┌─────────────────┐                      ┌─────────────────────┐ │ │
│ │  │ 👑 루이 14세      │                      │ 👑 루이 16세          │ │ │
│ │  │    1643–1715     │                      │    1774–1792         │ │ │
│ │  └─────────────────┘                      └─────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

정체 전환(왕→공화국) — 이웃 정체가 다르면 태그:   후대 → 🏛 아돌프 티에르 · 프랑스 제3공화국 1871–1873
초대/최후:                                       ← 선대  "이전 재위 기록 없음"
공동/중첩(overlapsAnchor):                        👑 후아나 1세 [공동] 1504–1555   (겹침 배지로 구분)
본인 다음 단계(isSelf, 복위·공동→단독):            👑 (본인) 단독 재위 1555–  [본인]  ← 딥링크 비활성
타계정(isOwned=false):                            🔒 어느 군주 1600–1620         ← 비클릭 static, title '다른 계정 소유'
```

- **상호작용**: 칩 클릭 → `handlePersonClick(personId)`(모달스택, 페이지 이탈 없음). `navigate()` 딥링크 절대 금지(embed 모달 파손). 승계 박스엔 편집·딥링크 어포던스가 없어 **embed에서도 렌더 유지**(게이트 불필요).
- **상태 문구**: 로딩=스켈레톤 미니칩 2(`aria-hidden`) · 양쪽 빈=박스 미렌더 · 한쪽 빈=`이전/다음 재위 기록 없음` · 에러=`선대·후대 재위를 불러오지 못했습니다`(`role=status`) · BC/미파싱=미렌더.
- **a11y**: 박스=`<nav aria-label="{재위 라벨} 승계">`, 화살표 글리프 `aria-hidden`(의미는 "선대"/"후대" 텍스트), 클릭 칩 `aria-label`에 방향 포함, isOwned=false는 `(다른 계정 소유)` 접미.
- **공존(중복 인상 방지)**: 동시대 수장=**가로 병렬** 칩밭(리스트 아래 1회), 승계=**좌우 선형** 2칩 레일(카드 내부). 시각언어로 명확히 분리.
- **칩 primitive 공용 추출**(권고, D6): `RulerChip`/`RulerChipStatic`/`ChipAvatarOrGlyph`/`chipSurfaceCss`는 현재 `contemporaries-strip.tsx` 모듈 로컬 → `person-detail-panel/ruler-chip.tsx`로 최소 추출 후 양쪽 import(복제는 드리프트 위험). 표시 어댑터 `chipLabelOf`/`spanTextOf`/`categoryOfRecord`/`formatSignedYear`는 이미 export — 그대로 재사용.

---

## 4. 엣지케이스 매트릭스 (비평 반영 · 확정 규칙)

| # | 케이스 | 확정 규칙 | contemporaries 대비 |
|---|--------|-----------|------|
| E1 | 공동군주 / 동일 startDate | dedup 후 남은 동일 startDate는 **진짜 별개 인물** → **동률 그룹 전부 배열 노출**(임의 1개 선택 금지). 그룹 내 안정정렬은 `record.id.localeCompare` | ✅ 무성절단금지 승계 |
| E2 | 간왕기·공백(직전이 수십 년 전) | **창 없이 최근접**: 선대=start<S 최댓값, 후대=start>S 최솟값. 공백 거리 무관(필요 시 공백연수 부가표시) | ⚠️ 의도적 상이(창 없음) |
| E3 | 복위(같은 국가 2회 등장) | **record 단위 계산**. 복위 record는 자기 앞뒤로 간왕을 선대로 가짐. regnalNumber는 복위 시 NULL 강제 → **NULL이면 대수 표시 생략, 조작 금지** | ✅ record별 = 카드 렌더와 일관 |
| E4 | 대립왕/평행 계승자 | 정통성 판정 안 함. startDate 순 최근접 제시 + 겹치면 `overlapsAnchor` 태그. **동시대 라이벌은 contemporaries가 담당**(상보) | ✅ 직교 실현 |
| E5 | startDatePrecision='year'(연만 앎) | 같은 해에 한쪽이라도 year-precision이면 **월·일을 순서 근거로 삼지 않고** "같은 해, 순서 미상" 동률 그룹으로 묶음. **경계 그룹핑을 precision-aware로**(비평 #5) | ⚠️ 신규 로직 |
| E6 | endDate 없는 현직 | 정렬키는 startDate뿐이라 endDate null은 순서에 무해. overlap 태그 계산엔 `effectiveEndYear`(사망캡) 재사용 — 서버·프론트 규칙 동기화 | ✅ 정렬키가 startDate라 null 취약성 감소 |
| E7 | tenure↔reign 크로스(왕→대통령) | HEAD tenure ∪ REIGN을 **한 시간축 병합·정렬**. recordKind 대문자 토큰 유지 | ✅ 동일 유니온 |
| E8 | **브리지 과확장(치명)** | **`buildSameCountryWhere` 재사용 금지** → 인스턴스 스코프 + `HistoricalCountryTransition` 그래프(§2.2) | ⚠️ 의도적 상이 |
| E9 | 국가정보 없음(교황) | 해당 record만 **빈 결과**(박스 미렌더), `noCountryCount++`. **record별 분기**(대상 전체 빈 처리 금지) | ⚠️ per-record(contemporaries는 per-subject 병합) |
| E10 | 자기 자신(복위·공동→단독 접점) | 본인 record를 **전역 제외하지 않음**(제외 시 단계전환 끊김). 최근접이 본인이면 **`isSelf` 라벨 + 딥링크 비활성**(same-route no-op 회피). 타인만 '선대/후대 군주' 칩 | ⚠️ 의도적 상이(contemporaries는 personId≠subject 전역필터) |
| E11 | 타계정 이웃(isOwned) | 글로벌 읽기 + `isOwned` 탑재, `!isOwned`면 비클릭 static 칩(클릭 데드엔드 금지) | ✅ 완전 동일 |
| E12 | BC(현재 불가) | 앵커 startYear<1이면 해당 방향 빈결과, `bcSkippedCount++`. `utcYearStart` 재사용. **era 마이그는 별도 백로그** | ✅ 동일 한계(체인 앞부분 공백이 더 두드러짐) |
| E13 | head 아닌 재임만(장관·의원) | 승계 박스는 **head-level record에만** 렌더(kind==='reign' ∪ positionType∈HEAD). 비-head엔 미노출 | ✅ 동일 head 필터 |

---

## 5. 구현 함정 체크리스트 (적대 비평 8건 → 확정 결정)

비평은 **P1(치명) 0건**. 스키마 0변경 주장은 인덱스 실재로 확인. 아래는 설계 facet 간 상충·잠복을 결정으로 수렴한 것.

1. **[비평 #1 · 본인 record 상충 → 확정] 유지 + `isSelf` 라벨**. `{personId:{not:subject}}` 전역 제외를 **쓰지 않는다**(Charles V 공동 record1→단독 record2 접점 1555-04-12를 건너뛰고 Philip II로 점프하는 오답 방지). 최근접이 본인이면 `isSelf:true` + 동일인물 딥링크 비활성.
2. **[비평 #2 · 겹침 이웃 상충 → 확정] tag-and-keep(`overlapsAnchor`)**. "겹치면 서버가 분기해 동시대로만 노출"(크로스-계약 결합, 어느 서비스도 미소유)은 **폐기**. 겹치는 공동군주(후아나↔카를 5세)는 승계 박스에 뜨되 `overlapsAnchor` 배지로 '공동/중첩' 구분 렌더.
3. **[비평 #3 · 봉투 상충 → 확정] `predecessors[]`/`successors[]` 배열**. ui-design 초안의 단수 `predecessor/successor|null`은 공동군주 배열 계약을 깨므로 폐기. §3.2 봉투로 통일.
4. **[비평 #4 · 크로스-정체 비대칭 · Batch 4 유의] 시드 filing 실측 = historicalCountryId 우세(496:121)**. 군주=역사정체, 현대 수반=`countryId`로 서로 다르게 filed되면, 역방향(모던 filed 앵커→역사 왕) 전이 확장이 비대칭. → **Batch 4에서** histId 없는 앵커에 한해 제한적 역방향 transition 조회 추가 또는 filing 정규화. MVP(인스턴스 한정)엔 무영향.
5. **[비평 #5 · year-precision 역전] 경계 그룹핑 precision-aware**. `startDate.slice(0,10)` 정확일 그룹핑은 같은 해 year(01-01)와 day(06-15)를 다른 경계로 취급해 순서를 조작. → 한쪽이라도 'year'면 **연 단위 동률 그룹**. 백엔드와 `isoDateSortKey` 양쪽에 동일 규칙.
6. **[비평 #6 · 저AD 경계 클램프] year<1000 앵커는 경계 완화 + over-fetch**. contemporaries가 클램프하는 <AD1000 DATETIME 불안정 구간에서 원시 `startDate {lt/gt}` 프루닝은 이웃을 잘못 탈락시킬 수 있음(pruned 행은 JS가 복구 불가). 저AD는 경계를 넉넉히 걸고 JS 후처리가 선택.
7. **[비평 #7 · depth 계약] MVP는 ±1 고정, `depth` 파라미터 없음**. 체인(±N)은 후속 배치.
8. **[비평 #8 · head 필터 누락] 이웃 tenure 쿼리에 `positionType IN HEAD_POSITION_TYPES` 필수**. 누락 시 같은 국가 장관·의원이 선/후대 후보로 유입.

그 외 승계된 함정(동시대 검토서 §4): `parseIsoDateParts` 부호 쌍둥이 혼용 금지(`iso-date.ts`=signed vs `helpers.ts`=unsigned), categorize kind 대문자 유지, 캐시 prefix `['person-reign-adjacency']`를 `invalidateTenureQueries` 등록(미등록 시 stale), WIP 레이스(현 `feature/service-manager-v2` 다수 미커밋 — 착수 전 정리), `(positionType, startDate)` 복합 인덱스는 지연 additive.

---

## 6. 배치별 구현 계획 (스키마 변경 0건)

| 배치 | 목표 | 규모 | 주요 파일 |
|---|---|---|---|
| **B0** | WIP 정리(선행) | S | 현 미커밋 성격별 분리 커밋(person-register-modal·seeds·portfolio). 스크린샷 제외 |
| **B1** | 백엔드 읽기모델(service+dto+controller+module+spec) | L | 신규 `person-reign-adjacency.{service,controller}.ts`·`dto/person-reign-adjacency.response.ts`·`.service.spec.ts`, 수정 `person.module.ts`. (선행: `head-record.shared.ts` 추출 리팩터 — contemporaries spec 통과 확인 후 독립 커밋) |
| **B2** | 프론트 API 래퍼+queryKeys+무효화+SDK | S~M | 신규 `shared/api/person-reign-adjacency.ts`, 수정 `invalidate-tenure.ts`, SDK 재생성 |
| **B3** | UI: 카드별 승계박스 | L | 신규 `reign-adjacency-box.tsx`(+`ruler-chip.tsx` 추출), 수정 `tenure-reign-list.tsx`·`person-detail-panel.tsx`(useQuery 1회·recordId 맵 주입·무효화), render 테스트 |
| **B4** | 크로스-정체 승계 브리지(HistoricalCountryTransition 그래프) | M~L · **조건부** | `person-reign-adjacency.service.ts` 스코프 가산 + spec + `meta.scope='succession'`. D1 확정 후 |

- **되돌리기 쉬운 순서**: B0(무영향) → B1(UI 미배선, 단독 머지·즉시 롤백) → B2(무해) → B3(박스 제거로 원복) → B4(스코프 가산, 독립 롤백).
- **검증**: B1=jest spec + `npm run build:api` 후 main.js kill+재기동(watch 아님) + verify skill(login admin/1234 :8000, 프랑스 왕·Charles V 등 알려진 승계선). B2/B3=`NODE_OPTIONS=--max-old-space-size=12288 npx tsc`(exit code) + 변경파일 eslint + render test + verify(복위·다국가 인물 카드 육안).
- **spec 필수**: 소유자밖 404 · 인스턴스 스코프 정확일치(자매 정체 미유입) · 동률 배열 · dedup REIGN 우선 자기-인접 방지 · head-level만 · startDate null 제외 · **BC 앵커 스킵+bcSkippedCount** · isOwned 타계정 false · **다국가 대상 record별 스코프 분리**(프랑스 재위 후보에 스페인 왕 부재) · 복위 2 record 상호 이웃 · isSelf 라벨 · **모던 브리지 병렬정체 오염 부재**.

### 명시적 범위 밖 (now)
- **DB 스키마 변경 — 불필요(확답)**: 기존 `SovereignReign ∪ head-level tenure` + (B4) `HistoricalCountryTransition`(이미 시드) 위의 순수 읽기모델. 필요한 필드·인덱스 전부 존재. **마이그레이션 0건.**
- **BC/era 컬럼 마이그** — 미계획 유지(별도 백로그 등재만). 계약은 첫날부터 signed year라 era가 와도 DTO 불변.
- **regnalNumber 정합화/자동부여** — 안 함(정렬 진실원은 startDate, regnalNumber는 표시용).
- `findTenuresByCountry` 2차 정렬키 보강, 복위 유니크 최대안 — 무관, 건드리지 않음.

---

## 7. 미결정 사항 (제품 결정 필요 · 권고 기본값 병기)

- **D1 — 스코프 범위(B4 존재를 가름)**: (a) 인스턴스 한정만(깨끗·크로스 승계 단절) / (b) transition 그래프로 크로스-정체 브리지(마지막 왕→초대 대통령, FR/DE 등 시드국만) / (c) m:n 브리지 재사용(**비권고**, §2.2 치명). ✅ **결정(2026-07-22): (a)로 출시 → (b)를 B4로 가산.** B1은 인스턴스 스코프만(가짜 이웃 0), B4에서 `HistoricalCountryTransition` 그래프로 왕국→공화국 승계 가산.
- **D2 — ±1 vs 체인**: **권고 ±1**("전/후 재위" 어의 일치, 카드 밀도 최소). 체인은 후속.
- **D3 — 카드 인라인 vs 리스트 하단 스트립**: **권고 인라인**(record 시맨틱·복위/다국가 대응). 단 카드 시각밀도 증가 확인 필요.
- **D4 — 본인 다음 재위단계(E10)**: **권고 표시 + `isSelf` 라벨·딥링크 비활성**(진짜 다음 재위이므로 숨기지 않음).
- **D5 — 공동/중첩 재위(E4)**: **권고 MVP는 startDate-strict 이웃 유지 + `overlapsAnchor` 배지**(겹침 배제는 후속 옵션).
- **D6 — 칩 styled 재사용**: **권고 `ruler-chip.tsx` 최소 추출**.
- **D7 — B4 폴백**: **권고 전이 미시드 국가는 인스턴스-only 폴백 허용**(무해, 커버리지 점진 확대).

---

### 부록: 신규/수정 파일 지도
- 백엔드 신규: `apps/api/src/libs/person/application/person-reign-adjacency.service.ts`, `.../application/head-record.shared.ts`, `.../presentation/person-reign-adjacency.controller.ts`, `.../presentation/dto/person-reign-adjacency.response.ts`, `.../application/person-reign-adjacency.service.spec.ts`
- 백엔드 수정: `apps/api/src/libs/person/person.module.ts`, (리팩터) `person-contemporaries.service.ts`(공용 헬퍼 소비 전환)
- 프론트 신규: `apps/web-admin/src/shared/api/person-reign-adjacency.ts`, `.../widgets/person/person-detail-panel/reign-adjacency-box.tsx`, `.../ruler-chip.tsx`
- 프론트 수정: `.../invalidate-tenure.ts`, `.../tenure-reign-list.tsx`, `.../person-detail-panel.tsx`
