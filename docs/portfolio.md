# Papyrus — 역사 지식그래프 백과사전

**역사를 구조화된 데이터로 기록하고 가계도·연표·지도로 되살리는 지식그래프 백과사전.**
위키는 역사를 글로 쓴다. Papyrus는 전용 폼으로 구조화 입력받아 관계를 자동 연결하고, 그 위에 수집·랭킹의 게이미피케이션을 얹었다.

> 📄 디자인된 웹 버전(스크린샷·차트 포함): `docs/portfolio.html` — 브라우저로 열면 됩니다.

---

## 개요

| | |
|---|---|
| **역할** | 풀스택 **1인** — 기획 · DB 설계 · API · 프론트 · 인프라 · 배포 전부 |
| **기간** | 2025.12 – 진행 중 (약 7개월, 566커밋) |
| **규모** | TypeScript **42.6만 LOC** · DB 테이블 **185** · REST API **389** |
| **백엔드** | NestJS 11 · Prisma 7(mariadb 어댑터) · MySQL 8 · nestia/typia · passport-JWT |
| **프론트** | React 19 · Vite 7 · TypeScript 5.9 · styled-components · TanStack Query · zustand |
| **인프라** | Nx 22 모노레포 · Docker Compose(nginx·MySQL·백업 사이드카) · Electron · Expo |
| **배포** | 로컬 Docker 운영 (k8s 매니페스트·GitLab CI 구성 보유, 배포 준비 단계) |

*모든 수치는 2026-07 저장소 실측(git ls-files · wc · swagger.json · git log).*

---

## 기술 스택 & 선택 이유

1인이 4개 앱(서버·웹·모바일·데스크톱)을 유지하기 위해 **타입 안전과 자동화**에 집중했다.

- **Backend** — NestJS 11 · Prisma 7 · MySQL 8 · **nestia + typia**
  → 컨트롤러에서 검증 코드·타입 SDK·OpenAPI를 컴파일 타임에 자동 생성. 프론트가 그 타입을 그대로 소비해 **수기 API 클라이언트 0줄**.
- **Frontend** — React 19 · Vite 7 · styled-components · **TanStack Query + zustand**
  → 서버 상태와 클라이언트 상태를 분리. **FSD(Feature-Sliced Design)** 6레이어로 30만 LOC를 구조화.
- **시각화** — @xyflow/react(가계도 그래프) · Leaflet(지도 클러스터) · Recharts(주가·능력치)
- **Infra/Tooling** — Nx 22 모노레포 · Docker Compose(mysqldump 백업 사이드카 24h·7세대) · jest · Electron 운영 도구 · Expo WebView 셸

---

## 핵심 기능

*실제 구동 화면은 `docs/portfolio.html` 또는 `docs/portfolio-assets/` 참고.*

1. **인물** — 시호·묘호·자·호·별명 **별칭 13종**, 정실·계비·후궁·귀천상혼 혼인 서열, 세습·정복·복위·선거군주제 즉위 방식까지 구조화 입력. 날짜는 "1138년 1월 1일**경**"처럼 불확실한 그대로.
2. **사건** — 타임라인·목록·지도·격자·대시보드·트리·갤러리 **7가지 뷰**. 전쟁은 교전 진영·사상자·무기·조약까지 모델 18개.
3. **국가** — 현대국가↔역사국가 **M:N 계승 브리지**. "독일"을 열면 연결된 역사국가 47개(신성로마제국 포함)까지 합산.
4. **동시대 비교** — 영국·프랑스·러시아를 한 축에. 인물 상세에 동시대 수장을 서버에서 계산해 자동 연결.
5. **현대 기업** — 일별 주가·증권사 목표주가 컨센서스·전망 시나리오, click-to-edit 인라인 편집 문서.
6. **게이미피케이션** — 세기·국가별 리더보드, 가상화폐 '파피', 역사 유물 수집(실제 문서로 딥링크), 싸이월드식 미니홈피.

---

## 기술적 도전과 해결

렌더링 알고리즘 · 브라우저 시스템 · 백엔드 정합성 · 기하 알고리즘에 걸친 다섯 가지.

### 01 · 수백 개 겹치는 시간구간을, 프레임당 선형 시간에 배치한다 (렌더링 알고리즘)
**문제** — 사건 타임라인은 겹치는 수백 개 구간을 최소 트랙으로 쌓고(구간 분할), 그 위 라벨이 서로 가리지 않게 배치해야 한다. 라벨 배치는 지도 라벨링과 동형인 **NP-hard 문제**다. **해결** — 구간 그리디 스태킹 + **중요도 가중 "steal" 휴리스틱**(모든 행이 차면 가장 덜 중요한 라벨을 밀어내되 critical 보존).

```ts
// event-timeline.tsx — 모든 row 충돌 시 importance-weighted steal
const myTier = LABEL_IMPORTANCE_TIER[info.importance]
let weakestRow = 0, weakestTier = Infinity
for (const r of ROW_COUNT) { const owner = lastLabelOwner[r]; if (!owner) continue
  const t = LABEL_IMPORTANCE_TIER[owner.importance]
  if (t < weakestTier) { weakestTier = t; weakestRow = r } }
const shouldSteal = !!weakest && (isCriticalSingle
  ? weakest.importance !== 'critical' : myTier > LABEL_IMPORTANCE_TIER[weakest.importance])
```
결정적으로 **가상화를 일부러 뺐다** — 클러스터링이 전역 정렬이라 viewport로 자르면 경계에서 클러스터↔싱글이 토글되는 시각 jitter가 생기기 때문. 클러스터링은 1회만, 가시성은 브라우저 SVG paint에 위임. **결과** — 단일 위젯 5,582줄, 라벨 결정 O(bucket). (프레임타임 before/after는 미측정.)

### 02 · 라이브러리 없이 만든 리치텍스트 에디터의 캐럿 정합성 (브라우저 시스템)
**문제** — slate·lexical·tiptap 없이 자작(38파일·8,494줄). controlled contentEditable에서 부모가 value를 내리면 innerHTML 전체 교체가 텍스트 노드를 detach시켜 **캐럿을 파괴**하고, sanitize가 임시 마크업을 떼어내며 emit값 ≠ 복귀값이 되어 **매 글자마다 리셋되는 자기참조 루프**가 생긴다. **해결** — 캐럿 정본을 노드 참조가 아니라 **평탄 문자 오프셋**으로.

```ts
// rich-text-editor.tsx
if (incoming === lastEmittedValueRef.current) return  // 자기 변경이면 리컨실 스킵
const probe = document.createRange()                  // caret을 문자 오프셋으로 기억
probe.selectNodeContents(editor); probe.setEnd(r.startContainer, r.startOffset)
const caretOffset = probe.toString().length
editor.innerHTML = newContent                         // 전체 교체
addRange(caretRangeFromCharOffset(editor, caretOffset))  // 문자 인덱스 → (node, offset) 역산
```
**결과** — 캐럿 복원 O(텍스트노드 수). 에디터 spec 125케이스로 회귀 고정. 외부 라이브러리 의존 0.

### 03 · SQL은 일부러 부정확하게, 정합성 판정은 애플리케이션에서 (백엔드 정합성)
**문제** — 이종 두 테이블(재임 ∪ 재위)의 시간구간 overlap을, DATETIME이 AD 1000 미만에서 불안정하고 `endDate < startDate` 오염 행이 있는 조건에서 조회한다. 정확한 overlap 술어만 쓰면 **오염 행을 DB가 먼저 탈락시켜** 앱의 정본 판정이 개입할 기회를 잃는다. **해결** — SQL을 일부러 superset으로 두고 정합성 판정을 앱으로 분리.

```ts
// person-contemporaries.service.ts — 「재임 중」과 「미입력」이 구분 불가 → 사망연도로 캡
function effectiveEndYear({ startYear, endYear, death, nowYear }) {
  if (endYear != null) return Math.max(startYear, endYear)
  if (death.signedYear != null) return Math.max(startYear, Math.min(death.signedYear, nowYear))
  if (death.unknownDeathYear) return startYear
  return Math.max(startYear, nowYear)  // 시작 클램프 — 미래 시작일 오타가 음수 겹침 못 만들게
}
```
**결과** — 클라이언트와 규칙을 강제 동형화(이중 계산 정합성 계약). 엣지케이스 테스트 25개로 고정.

### 04 · flexbox가 배치한 좌표를, SVG가 독립적으로 예측한다 (기하 알고리즘)
**문제** — 노드 위치는 CSS flex(`align-items:center`)가 정하는데 연결선은 별도 SVG 레이어다. 선이 카드 중심에 닿으려면 SVG가 **flex의 최종 배치를 동일 폭 공식으로 독립 재현**해야 한다(좌표를 내가 정하고 내가 그리는 일반 트리 레이아웃의 **역문제**). 카드 중심은 NODE_W/2가 아니라 손자녀로 팽창한 폭/2라 **상수폭 가정은 레벨마다 오차 누적**. **해결** — 서브트리 폭 상호 재귀 실측 + 비대칭 보정.

```ts
// geometry.ts — 자녀 폭이 비대칭이면 기하중심 ≠ 첫·끝 자녀 중심의 평균(childMean)
export function childrenCenterShift(layouts) {
  const totalW = sum(pairWidth) + (n - 1) * CHILD_GAP
  const childMean = (centerX(first) + centerX(last)) / 2
  return childMean - totalW / 2   // 차이만큼 그리드 전체를 translateX
}
// 폭은 상호 재귀: slotW = max(NODE_W, 서브트리폭), 깊이 3 절단으로 메모 없이 O(N)
```
**결과** — 상수폭 대비 교정 오차 **204~350px**를 회귀 스펙 11개가 실제 버그 스크린샷을 픽스처로 동결.

### 05 · 이벤트 소싱 원장의 파생 스냅샷과 SQL 3치논리 함정 (데이터 정합성)
**문제** — append-only `PointEntry` 원장 + `totalPoints` 캐시(드리프트 0) 위에 세기별 리더보드용 파생 스냅샷 `contentCentury`를 비정규화한다. 재스탬프를 `{ not: century }`로 최적화하려는 유혹이 있는데, **SQL의 `NULL <> n`은 TRUE가 아니라 UNKNOWN**이라 null로 적립됐던 과거 행을 놓친다. **해결** — record당 ≤2행이니 조건 없이 무조건 갱신.

```ts
// point.service.ts — { not: century } 필터를 쓰면 NULL <> n 이 UNKNOWN이라 null 행을 놓침
await tx.pointEntry.updateMany({
  where: { ownerType, recordId },   // 세기 조건 없음(의도적)
  data:  { contentCentury: century },
})
```
**결과** — 멱등은 `@@unique` + skipDuplicates + P2002 2중 방어. N+1은 net을 집계해 createMany 1회 + 계정당 recalc 1회로 접음. 게이미피케이션 실패는 본 흐름을 절대 안 깬다.

> 원장 동시성(`spend()`의 `FOR UPDATE` + 조건부 차감 + 역분개 + 음수 불변식 롤백), BC/고대 날짜 구조화, nestia 타입세이프 SDK, 도메인별 스키마 머지 등도 코드에 있으나, 위 5개가 알고리즘·시스템 난이도 기준 대표작이다.

---

## 아키텍처

```
papyrus/  (Nx 22 모노레포)
├── apps/api/              NestJS 11 — 도메인 모듈 31개 (presentation/application/domain/infra 4계층)
│   └── prisma/            마이그레이션 163 + 시드 135 (역사국가 계보·인물·사건)
├── apps/web-admin/        React 19 + Vite 7 — FSD (pages 25 · widgets 23 · 공용 UI 61)
├── apps/mobile/           Expo WebView 셸 — 화면 로직은 웹 한 곳에만
├── apps/service-manager/  Electron 트레이 앱 — Docker→MySQL→API→웹 원클릭 기동
├── libs/db/prisma/        스키마 단일 진실 — 도메인 26파일 → 머지 → 185모델
└── docker/                nginx(템플릿 생성) + MySQL + mysqldump 백업 사이드카(24h·7세대)
```

- **타입 안전 풀스택 파이프라인** — 컨트롤러 → typia 검증 → SDK·OpenAPI 자동생성 → 프론트가 타입 소비. 계약을 컴파일러가 강제.
- **상태·캐시 정합성** — 같은 데이터가 3개 화면에 다른 캐시로 흩어지는 문제를 prefix 쿼리키 규약 + 중앙 무효화 헬퍼로 해결. Redis 없이 DB 비정규화 캐시로 리더보드 처리.

---

## 개발 방식

기능·결함마다 `다각도 병렬 리뷰 → 건별 적대 검증 → 우선순위 배치 구현 → 디프 재리뷰 → tsc·lint·jest·라이브 e2e` 사이클을 반복하고, 검토 문서 **27편(6,832줄)**을 코드와 같은 저장소에 커밋했다. 테스트는 회귀 위험이 높은 순수 로직(BC 날짜 파싱·가계도 기하·원장 정책)에 **427케이스** 집중. 커밋 **conventional 99.8%**.

---

## 성과 (실측)

| 지표 | 값 |
|---|---|
| 손으로 쓴 TypeScript | **425,768 LOC** (자동생성 SDK 제외) |
| DB 테이블 · enum | **185** · 93 |
| REST API 오퍼레이션 | **389** |
| 무중단 DB 마이그레이션 | **163회** (6.5개월, 리셋 0) |
| 커밋 | **566** (conventional 99.8%) |
| 화면 · 공용 UI | 25페이지 · 61종 |
| 자동화 테스트 | 427케이스 |

---

*배포는 로컬 Docker 운영 단계이며 k8s 매니페스트·CI 구성을 보유. GitHub·라이브 데모 링크는 준비되는 대로 추가 예정.*
