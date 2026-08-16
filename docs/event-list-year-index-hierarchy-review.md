# /events 목록 — 연도 그룹 헤더와 행 연도가 어긋나는 문제 검토서

작성일 2026-08-06 · 대상 브랜치 `feat/spring-pilot` · 조사 범위 `/events` LIST 뷰 색인 체계
조사 방식: 코드 정독 + 라이브 DB(`mysql 127.0.0.1:3307/papyrus`) 실측 + 프론트 파이프라인 시뮬레이션. **코드 수정 0건.**

---

## 1. 요약

사용자가 보고한 "년도가 안 맞음"은 표기 실수가 아니라 **색인 규약 자체**에서 나온다. `/events` LIST 뷰는 하위 사건을 자기 시작 연도가 아니라 **부모의 연도 버킷**에 넣는다(`list-grouping.ts:117-124`). 라이브 DB 268행(`deleted_at IS NULL`)을 프론트 파이프라인 그대로 시뮬레이션한 결과, **자기 시작 연도와 다른 연도 그룹에 놓이는 행이 67행(25%)**, 그중 **세기까지 다른 행이 13행**이다. 예컨대 `16세기 (1501–1600)` 헤더 아래 `1600년` 그룹에 7행이 놓이는데 그중 4행이 수라트 상관 설립(1613)·캘커타 설립(1690)·카르나틱 전쟁(1746)·플라시 전투(1757)다.

2차 피해가 더 크다. 흡수된 자식들 때문에 **실제 시작 연도 115종 중 25종이 색인에서 통째로 사라지고**, 그 빈자리를 `yearGapBefore`가 공백으로 읽어 **10년 이상 '기록 없음' 표지 18개 중 8개가 사실과 어긋난다**(7개는 그 구간에 실제 사건이 있는데도 "N년 기록 없음"이라 단언, 1개는 라벨 자체는 참이나 203년 여백으로 구간을 오도). 헤더 카운트도 모수가 달라 **연 헤더 90개 중 18개**, **세기 헤더 12개 중 7개**가 그 아래 렌더되는 행 수와 다르다(최악: `1894년 1건` 헤더 아래 16행, `11세기 1건` 아래 11행). 여기에 진단에서 새로 발굴한 것 하나 — **평면 보기(`flat=1`)에서는 귀속이 배열 순서에 의존해, 정렬 방향 화살표 한 번에 67행이 다른 연도 그룹으로 이동한다**(버킷 수 desc 111 ↔ asc 94).

즉 화면은 ⑴ 행을 잘못된 헤더 아래 놓고 ⑵ 있는 데이터를 없다고 **능동적으로 주장**하며 ⑶ 헤더 숫자가 최대 15배 틀리고 ⑷ 정렬·필터 토글마다 소속이 바뀐다. 네 가지가 하나의 규약에서 갈라져 나온다.

---

## 2. 근인

### 2-1. 코드

`apps/web-admin/src/features/event-hierarchy/model/list-grouping.ts:117-124`

```ts
const parentBucket = parentPresent
  ? bucketYearById.get(item.parentNodeId!)
  : undefined
const prefersOwnYear =
  !parentPresent || (filteringActive && item.isMatch && parsedYear !== null)
const bucketYear = prefersOwnYear
  ? (parsedYear ?? parentBucket)
  : (parentBucket ?? parsedYear)
```

필터가 걸리지 않은 기본 상태(`filteringActive === false`)에서는 `prefersOwnYear`가 항상 false가 되어 **자식은 예외 없이 부모 버킷으로 간다.** 손자도 같은 식이 2홉 누적된다(실측: `1913년 조건부 철도 차관` → 부모 1888 → 조부 1894 → **1894년 그룹**, 19년 괴리).

### 2-2. 왜 이렇게 짜였는가 — 실수가 아니라 트레이드오프

같은 파일 `:95-115` 주석이 배경을 남겨 두었다. 요약하면 세 가지다.

1. **직전 규약이 더 나빴다.** 예전에는 "배열에서 직전 depth 0 항목이 곧 내 부모"라는 **위치 휴리스틱**이었고, 북마크 필터가 부모만 제거하면 976년 자식이 '20세기 › 1990년' 헤더 아래 렌더되면서 행은 976을 주장했다. 지금 코드는 그 휴리스틱을 폐기하고 `parentNodeId`를 쓰는 **개선의 결과물**이다(선행 검토 IA-2).
2. **부모-자식 시각 인접성이 명시적 선택이었다.** `docs/event-subevent-visibility-review.md:149-161`이 옵션 H1(부모 버킷 귀속)과 H2(자식 연도를 `allYears`로 승격)를 비교해 H1을 채택하고, H2는 "부모-자식 시각 인접 소실"을 이유로 기각했다. 당시 H1의 트레이드오프는 문서상 **"없음"**으로 기록됐다.
3. **필터 예외(DATA-9)는 그 모순을 이미 인지한 흔적이다.** `:110-115` 주석은 "세기 칩은 행의 *자기* 날짜로 판정하는데 버킷은 부모를 따르므로 모순이 생긴다"고 적고, 필터 중에만 매칭 행을 자기 연도로 되돌린다. **문제를 알고 있었지만 필터 상태에서만 고쳤다.**

이번 사용자 보고는 ②의 "트레이드오프 없음"을 **실측으로 반증한다**. 이 검토서는 그 반증을 근거로 H1 재검토를 제안한다.

### 2-3. 파생 결함의 연쇄

```
buildYearBuckets 귀속 (117-124)
 ├─ allYears 90종 (실제 115종)  → yearGapBefore(:169-188) 입력 오염 → 거짓 '기록 없음' 8개
 ├─ isGroupRoot(:132) 모수       → centuryCount/yearRootCount(:146-153) → 헤더 카운트 18+7개 불일치
 ├─ filteringActive 축(:120-121) → 필터 토글마다 행 이동(16~27행) + 부모·자식 밴드 분리
 ├─ 전방 1패스 전제(:106-107)    → 평면 뷰 배열 순서 의존(정렬 방향 토글로 67행 이동)
 └─ groupYear ≠ 자기 연도        → rowDateLabel(:368) 연도만 반환 + 괄호 표기 → 월·일 소실
```

---

## 3. 불일치 경로 전수표

### 3-1. 색인 축 (LIST 내부)

| # | 재현 조건 | 화면에 보이는 것 | 파일:줄 | 실측 |
|---|---|---|---|---|
| D-1 | `/events` 기본 진입(LIST·시기순 desc·무필터) | `16세기 (1501–1600)` › `1600년 2건` 헤더 아래 7행, 그중 4행이 17·18세기 사건. `16세기` 밴드를 접으면 플라시 전투(1757)가 사라진다 | `list-grouping.ts:117-124` | 어긋난 행 **67/268(25%)**, 세기까지 다름 **13** |
| D-2 | 동상, 10세기·18세기 구간까지 스크롤 | `977년`과 `965년` 그룹 사이에 "12년 기록 없음" 점선 표지 + 여백. 실제로는 966·968·974·976에 6건 존재 | `list-grouping.ts:169-188`(계산) → `event-compact-list.tsx:680-688`(연), `:573-581`(세기) | 10년+ 표지 **18개 중 8개가 사실과 어긋남**(7개 명백 거짓 · 1개 구간 오도) |
| D-3 | `/events?flat=1`에서 정렬 방향 화살표 1회 | 순서만 뒤집힐 줄 알았는데 `마이크론 어닝 서프라이즈 발표`가 2024년 그룹→2022년 그룹으로 이동, 연 그룹 수가 111→94로 감소 | `list-grouping.ts:117-118` + `useEventHierarchy.ts:248-257`(배열 전역 재정렬) | 방향 토글로 **67행** 이동, 세기까지 **13행** |
| D-4 | 동상, 헤더 숫자 확인 | `1894년 1건` 헤더 아래 16행 / `1002년 1건` 아래 11행 / `11세기 1건` 접기 → 11행 소멸 | `list-grouping.ts:132,146-153` → `event-compact-list.tsx:615,627,718,729` | 연 헤더 **18/90**, 세기 헤더 **7/12** 불일치 |
| D-5 | 세기 칩 `20세기` 적용 후 해제 | `1908년 함대법 보충안`이 켜면 `20세기 › 1908년`, 끄면 `19세기 › 1898년`으로 점프 | `list-grouping.ts:120-121` | 20세기 칩 **16행 이동/16쌍 분리**, 19세기 칩 **27행/26쌍** |
| D-6 | 세기 칩 `20세기` 적용 상태 | 부모 없이 들여쓰기(depth 1)만 남은 자식 행. 그 위 행은 무관한 사건 | `event-list-item.tsx:970-976`(들여쓰기), `:738-746`(가이드선) | 분리 16쌍, 그중 세기까지 다름 9 |
| D-7 | 세기 칩 `20세기` 적용 | `19세기 › 1894년` 헤더가 20세기 칩 아래 남는다 | 술어 `century-span.ts`(구간 겹침) vs 버킷 `list-grouping.ts:91`(시작 한 점) | 다세기 사건 **6건**, 잔존 5행 |
| D-8 | 툴바 '하위 사건 모두 접기' | 접어 뒀던 `1875년` 그룹의 행이 되살아나고 접기 토글이 사라진다 | `events.page.tsx:789-792,861-864` + `list-grouping.ts:160-163` | headerless **52→62**, 토글 소멸 연도 10개 |
| D-9 | 정렬을 '등록순'으로 변경 | 전 행 날짜가 `(2024)`처럼 괄호 연도만. 월·일 소실 | `event-compact-list.tsx:536-544`(`groupYear=null`) → `event-list-item.tsx:337-340,368` | 괄호 **268행 전부**, `M.D`를 잃는 행 **190** |
| D-10 | 검색창에 한 글자 입력 후 250ms | `조건 일치 268건 / 등록 전체 178건`처럼 부분이 전체보다 큼. 카테고리 칩 46→82 | raw 입력 `events.page.tsx:1017-1018` vs 디바운스 `useEventFilters.ts:241-247` | — |

### 3-2. 다른 화면과의 대조 (같은 사건, 다른 연도)

`buildYearBuckets`의 부모 귀속을 쓰는 소비처는 **LIST 그룹 헤더 하나뿐**이다. 나머지 10개는 전부 `node.period.start`(자기 날짜)를 쓴다.

| 소비처 | 연도 산출 | 파일:줄 | LIST 헤더와 |
|---|---|---|---|
| LIST 그룹 헤더 | `parentBucket ?? parsedYear` | `list-grouping.ts:117-124` | (기준) |
| LIST 행 날짜 토큰 | 자기 시작 | `event-list-item.tsx:320,341-369` | **다름 67행** |
| 타임라인 막대 | 자기 시작 | `event-timeline.tsx:598-605` | 다름 |
| 격자 10년대 셀 | 자기 시작 | `event-grid-view.tsx:107-109` | 다름 |
| 지도 연도 슬라이더 | `new Date(start).getFullYear()` | `event-map-view.tsx:75` | 다름 + **BC/TZ 결함** |
| 갤러리 카드 라벨 | 자기 시작 | `event-gallery-view.tsx:106-111` | 다름 |
| 트리 노드 라벨 | 자기 시작 | `event-tree-view.tsx:43-47` | 다름 |
| 대시보드 세기 차트 | 자기 시작 | `event-dashboard-view.tsx:108` | 다름 |
| JSON 내보내기 | 서버 원본 `startDate` | `export-events.ts:79-82` | 다름 |
| 드로어 상세 날짜 | 자기 시작 | `event-detail-panel.tsx:259` | 다름 |
| 세기 필터 술어/옵션 | 구간 겹침 | `century-span.ts` | 축 자체가 다름 |

**실증(3중 불일치)**: `러일 전쟁기 전시 차관` — 자기 1904, 부모 1888, 조부 1894. LIST 헤더는 `19세기 › 1894년`, 행 토큰은 `(1904)`, 대시보드 세기 차트는 20세기에 +1, JSON은 `"startDate": "1904-…"`.

⚠️ **정정**: 진단 초안에 있던 "격자 뷰로 바꾸면 1750년대 셀에서 다시 나타난다"는 **거짓**이다. `event-grid-view.tsx:104`가 `depth !== 0`을 건너뛰므로 플라시 전투는 격자에 애초에 없다. 근거로 쓰지 말 것.

### 3-3. 접근성 축

| # | 재현 조건 | 화면/AT에서 | 파일:줄 |
|---|---|---|---|
| A-1 | 행 클릭(드로어 열림) → 그 세기 헤더 접기 | 렌더된 행 중 `tabIndex=0`이 0개 → Tab으로 **행**에 진입 불가, ↑↓ 게이트도 열리지 않음. 복구는 divider 재펼침 또는 드로어의 '필터·접힘 초기화' | `event-compact-list.tsx:264-270` vs `events.page.tsx:1476`, `event-list-item.tsx:434` |
| A-2 | 스크린리더로 1894년 그룹 순회 | 그룹은 "사건 1건", 목록은 "항목 16개". aria-level 1·2·3이 섞인 채 posinset/setsize는 통합 인덱스 | `event-compact-list.tsx:689-691` vs `:742-750`, `event-list-item.tsx:436-438` |
| A-3 | 연도 접기 → '하위 사건 모두 접기' | 접어 둔 연도가 headerless로 승격되며 토글이 사라지고 행이 되살아남(‘하위 펼치기’로 복원 가능) | `list-grouping.ts:160-163,310` ↔ `event-compact-list.tsx:648,655,692` |
| A-4 | ↑로 뷰포트 위쪽 행으로 이동 | 포커스 행이 sticky 연 헤더 뒤에 가려짐. cozy 부족분 32px(행 45px의 71%) | 사다리 `list.styles.ts:407-413,818-829,636-649` vs 보정 `event-list-item.tsx:719` |
| A-5 | 세기 접기 | "11세기 — 1건 접힘"인데 11행이 사라짐(연 쪽은 이미 '행' 단위로 고쳐져 있음) | `event-compact-list.tsx:627` vs `:726-731` |
| A-6 | 드로어 Esc로 닫기 | 포커스는 그 행에 남는데 `tabIndex=0`은 목록 첫 행으로 이동 → Tab 왕복 시 위치 상실 | `events.page.tsx:925-937`, `event-compact-list.tsx:264-270` |
| A-7 | 세기 경계 낭독 | 11세기 그룹 안에서 "12세기 기록 없음"이 낭독됨(시각 순서 vs 그룹 소속 상충, 의도적 배치) | `event-compact-list.tsx:565-581` |
| A-8 | 날짜 셀 | `title`/`aria-label` 없음. 주석 `:347`은 "전체 표기는 title이 유지"라고 하나 JSX에 title 없음. BC는 `BC 1046`으로만 낭독 | `event-list-item.tsx:341-368` vs `:450` |
| A-9 | 초기 로딩(autoLoadAll) 중 세기 접기 | 라이브 문구가 로딩 상수라 **행 수 변화가 고지되지 않음** | `event-compact-list.tsx:517-531` |
| A-10 | 필터 없이 사건이 0이 되는 경로 | 목록 라이브 영역이 통째로 언마운트 + 헤더 스트립도 제거 → 무성 | `event-compact-list.tsx:499,517`, `catalog-header-stats.tsx:69` |

### 3-4. 표기 축 (P2~P3)

| # | 조건 | 보이는 것 | 파일:줄 |
|---|---|---|---|
| T-1 | 다른 해 행 | 연도만, 월·일 소실. hover 툴팁 없음 | `event-list-item.tsx:368`, `:450` |
| T-2 | 다른 해 신호 | CSS `::before/::after` 괄호 하나뿐. 문장부호라 낭독 verbosity 기본값에서 무음, 복사 시 소실. BC는 `year >= 0` 가드로 **영원히 신호 없음**(현재 BC 0건, 잠복) | `event-list-item.tsx:337-340,1179-1191` |
| T-3 | 기간 사건 | 종료 연도가 행 어디에도 없다. `[dur]` 열은 '23년 10개월'만, title 없음 | `event-list-item.tsx:141-189,585-591` |
| T-4 | 12세기 결번 구간 | 203년 공백(28px)이 131년 공백(56px)보다 **좁게** 그려짐 | `event-compact-list.tsx:669-678` + `list.styles.ts:526-528` |
| T-5 | '연도 미상' 섹션(현재 0건, 잠복) | 카운트에 단위 '건'이 없음(같은 파일이 못 박은 규약 위반) + 모수도 행 수라 연 헤더와 다름 | `event-compact-list.tsx:777` vs `list.styles.ts:766-780` |

---

## 4. 설계안 비교

### 4-1. 세 안 요약

| | 안 A 「정합우선」 | 안 B 「계층우선」 | 안 C 「모드분리」 |
|---|---|---|---|
| 규약 한 줄 | 버킷 = **자기 시작 연도**, 예외 0. 계보는 들여쓰기(같은 해)+앵커 칩(다른 해)으로 | 귀속은 그대로 두고 **헤더가 수록 범위를 말한다**(`1894년 · 수록 1887–1913`) | 색인 축과 계보 축을 **분리**. 연대기 축엔 자기 연도, 계보 축엔 연도 헤더 자체가 없음 |
| 행 이동 | 67행이 자기 해로 | **0행** | 연대기 축 67행, 계보 축 헤더 소멸 |
| 연 그룹 수 | 90 → 115 | 90 → 90 | 90 → 115 |
| 새 상태 | `resolveBucketCollapse` 술어 | 없음 | `listAxis`(기존 `showFlatView` 폐기·흡수) |

### 4-2. 채점

| 축 | 안 A | 안 B | 안 C |
|---|---|---|---|
| **색인 정직성** | ◎ 헤더≠행 0행, 거짓 공백 0, 헤더 카운트 불일치 0, 25개 연도 복귀 | △ 헤더 *문장*은 참이 되나 **25개 연도는 여전히 색인에 없음**. "1757년"을 사다리에서 찾을 수 없다 | ◎ 연대기 축은 A와 동일 |
| **계층 온전함** | △ 들여쓰기 행 **85→25**, depth2 **5→0**. 65행이 앵커 칩 한 줄로만 부모를 안다 | ◎ 서브트리 한 줄도 안 쪼갬. 오히려 DATA-9 필터 예외를 철회해 지금 있는 분리 16쌍도 없앰 | ○ 계보 축에서 완전 보존(옵트인), 연대기 축은 A와 같은 손실 + 문맥 칩 1홉만 |
| **구현 규모** | M(L 하한) — 파일 6, 순수 프론트 계산. 백엔드 0 | M — 파일 6, 라벨·카운트·gap 계약 변경. 행 배열·순서·모집단 전부 불변 | M — 파일 **15**, `showFlatView` 폐기 + URL 키 교체 + 툴바/필터 패널 파급 |
| **회귀 위험** | 중 — 접힘 술어 재정의(R4)가 상태 개념을 하나 더 만듦. `revealEventInList`가 접힘·스크롤·포커스·고지 5개를 동시에 건드림 | **낮** — 행이 한 줄도 안 움직여 회귀 표면이 '라벨과 그 입력'으로 닫힘 | 중~높 — 기본값 전환 + 선행 확정 3건 뒤집기 + 축 컨트롤 발견성이 미검증 |
| **되돌리기 쉬움** | ○ 귀속식은 한 줄 revert지만 spec 12건 신규·5건 삭제가 딸림 | ◎ 라벨·카운트 롤백이 국소 | △ 상태·URL 키·평탄화 계약이 함께 묶여 부분 롤백이 어려움 |

### 4-3. 정본 추천: **안 A(정합우선)**

근거는 전부 실측이다.

1. **사용자 보고가 색인 축이다.** "년도에 맞춰 사건 리스트가 나오는데 년도가 안 맞음" — 헤더 문장의 참/거짓이 아니라 행이 놓인 위치를 말한다. 안 B는 `1894년 · 수록 1887–1913`으로 문장을 참으로 만들지만, 그 자기비판이 인정하듯 **25개 연도(872·1005·1017·1613·1690·1746·1757 …)는 여전히 사다리에 정거장이 없다.**

2. **2차 피해 셋을 동시에 0으로 만드는 것은 A뿐이다.** 사라진 연 그룹 25개 → 0, 거짓 공백 8개 → 0, 거짓 헤더 카운트 25개(연 18 + 세기 7) → 0. 특히 `yearGapBefore`(`list-grouping.ts:169-188`)는 **한 줄도 고치지 않고** 입력(`allYears` 90→115)이 정직해지며 자동으로 고쳐진다.

3. **A가 잃는 인접성은 이미 시간축을 왜곡해 얻은 것이다.** 부모-자식 90쌍 중 **65쌍(72%)이 시작 연도가 다르다.** 같은 해 쌍 25쌍은 A에서도 그대로 들여쓰기로 남는다(들여쓰기 행 25 = 그 25쌍). 즉 A가 포기하는 것은 "다른 해인데도 붙여 놓은" 인접성이고, 그 대가가 지금의 거짓 색인이다.

4. **"부모는 기간 컨테이너"라는 데이터 사실은 A를 반박하지 않는다.** 자식 기간 전체가 부모 기간 안인 쌍 **73/90(81%)**, 자식 시작이 부모 기간 안 **75/90(83%)** — 이건 "부모가 자식을 시간적으로 **포함**한다"는 뜻이지 "**같은 해에 시작**한다"는 뜻이 아니다. 색인 축이 필요로 하는 건 후자다. 부모 시작 == 최소 자식 시작인 부모는 15/21(71%)이지만, 쌍 단위로 보면 자기 연도가 부모와 일치하는 것은 25/90(28%)뿐이다.

5. **C는 A의 상위집합인데 순서가 거꾸로다.** C의 연대기 축 = A의 귀속 규칙이고, C가 A보다 더 주는 것은 '계보 전용 축' 하나다. 그런데 그건 **A 적용 후에 현행 `grouped=false` 렌더 경로를 재사용해 얹을 수 있다**(신규 렌더 트리 0). C를 먼저 하면 색인 검증과 기본값 전환·`showFlatView` 폐기·URL 키 교체 리스크가 한 배치에 섞인다. **A → (필요시) C**가 순방향이다.

6. **B의 고유 성과 중 두 가지는 A에 흡수 가능하다.** `coveredYears` 기반 gap 정직화는 A에서 자동으로 성립하고, DATA-9 필터 예외 철회는 A의 `filteringActive` 인자 삭제와 같은 결과다.

### 4-4. 각 안의 가장 약한 지점 (원문 그대로)

**안 A** — "계층이 화면에서 사실상 소멸한다 — 그리고 그 손실을 대체하는 장치가 텍스트 칩 하나뿐이다. 들여쓰기 행은 85 → 25, depth 2는 5 → 0. 268행짜리 목록에서 '트리처럼 보이는' 부분은 25행(9%)만 남고, 나머지 65개 자식은 서로 다른 해에 흩어진 채 `↑ 러불 동맹 · 1894`라는 한 줄로만 부모를 안다. 연 그룹 25개는 행 전부가 앵커 칩이다 — 그 해의 색인을 열었는데 남의 하위 목록을 보는 느낌이 된다. 러불 동맹은 11개 자식에 앵커로 붙어 한 화면에 같은 문자열이 5회 이상 나오는 구간이 생긴다. 그리고 이 안은 `event-subevent-visibility-review.md:155-161`이 명시적으로 기각한 옵션 H2를 되살리면서, 그 저울질의 무게는 사용자 보고 하나에서 왔을 뿐 **화면에서 검증된 적이 없다.**"

**안 B** — "밴드가 시간축의 분할이 아니게 되는데, 이 안은 그 사실을 정직하게 표시할 뿐 조회 기능을 복구하지 않는다. `1894년` 밴드가 1887–1913을 덮는 동안 1891·1890·1888 밴드가 사다리 아래쪽에 따로 존재한다 — 밴드끼리 시간 구간이 겹치고, 내림차순 사다리 안에서 국소적으로 시간이 거꾸로 흐른다. **25개 연도는 여전히 색인에 밴드로 존재하지 않는다.** 사용자가 '1757년'을 찾으면 사다리에 그 정거장이 없고, 흡수 표지는 '상위 묶음 안에 있다'고 알려줄 뿐 어느 묶음인지 말하지 않으며 거기로 데려가지도 않는다."

**안 C** — "'연대기가 이 화면의 1차 목적'이라는 전제가 데이터 분포로만 뒷받침되고, 사용 근거가 하나도 없다. 사용자가 `/events`에서 실제로 무엇을 하는지 말해 주는 로그·인터뷰가 없다. 만약 실사용의 주 과업이 계보 탐색이라면, 이 안은 대다수 사용자를 옵트인 축으로 밀어내고 러불 동맹 아래 8건의 전사(前史)처럼 **사용자가 손으로 만든 인과 서사**를 기본 화면에서 조각내는 대가만 치른다. 문맥 칩은 부모 1홉만 보여주므로 손자 체인에서는 최상위 맥락이 끊긴다. 게다가 축 컨트롤이 필터 패널 안의 12px 스위치라, '사용자가 목적을 고른다'는 전제가 고르는 수단이 보이지 않아 무너질 수 있다 — **둘 다 브라우저 실측으로 검증하지 않았다.**"

### 4-5. 추천에 딸린 조건

안 A를 채택하면 **선행 확정 결정 3건을 명시적으로 폐기**하게 된다. 검토서에 기록 없이 진행하면 안 된다.

| 결정 | 출처 | 처리 |
|---|---|---|
| A1 자식은 부모 연도 버킷에 귀속(옵션 H1) | `event-subevent-visibility-review.md:149-161` | **폐기** — 당시 기록된 "트레이드오프: 없음"(:91)이 이번 사용자 보고 + 실측 4종으로 반증됨 |
| A5 필터 중 매칭 행만 자기 연도(DATA-9) | `event-list-filter-review.md:359` | **폐기** — 예외가 상시 규칙이 되어 예외 자체가 소멸 |
| A7 그룹과 다른 해면 괄호 표기 | `event-list-page-ux-review.md:411` | **폐기** — 어긋남이 구조적으로 불가능해져 소비처 0 |
| R2 그룹핑 **구조** 변경 금지(표기 보정만) | `event-list-page-ux-review.md:160` | **부분 해제 필요** — 해제 근거는 사라진 연 그룹 25·거짓 공백 8·거짓 헤더 25이며, 이들이 표기로 도달 불가임은 §2-3 연쇄가 코드 라인으로 입증 |

A2(never-drop)·A3(`parentNodeId`)·A4(그룹 단위 카운트, A에서는 렌더 행 수와 자명히 일치)·A6·A8·A9·A10은 **전부 유지**한다.

---

## 5. 배치 계획

### 배치 1 — 색인 정본화 (P1 전량)

**목적**: 버킷 귀속을 행의 순수 함수로 만들고, 그 위에 얹힌 카운트·공백·표기의 거짓을 동시에 제거한다.

**대상 파일**
- `apps/web-admin/src/features/event-hierarchy/model/list-grouping.ts`
  - `:87,92-93,117-124` 삭제 → `const bucketYear = parsedYear`
  - `:132` `isGroupRoot` 삭제, `:146-153` 카운트를 버킷 행 수로(세기는 합)
  - `:160-163` 헤더리스를 **접힘 이전 모집단** 기준으로 고정
  - `:169-188` `yearGapBefore` **코드 무변경**(입력이 정직해지며 자동 해소)
  - 신규 반환: `indentDepthById`(같은 버킷 조상 체인, 사이클 가드), `anchorParentById`, `offBucketChildCountById`
  - 신규 함수 `resolveBucketCollapse(items, expandedIds)` — 계층 접힘을 **같은 해 자손에만** 적용
- `apps/web-admin/src/pages/events/list/events.page.tsx` — `:789-792`(접힘 술어 교체), `:861-864`(`hasNarrowingFilters` 인자 제거, `{hierarchy: !showFlatView}` 전달), `:726-743`(모수 규약 주석에 "헤더 카운트는 계층 접힘에 불변" 추가), 신규 `revealEventInList(id)`
- `apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx` — `renderRow`에 `indentDepth`/`anchorParent`/`offBucketChildCount` 배선, 세기·연 헤딩 문구를 "…에 시작한 사건 N건"으로, `:627` 세기 접힘 자리표시자를 행 수로, `:1092` 열 헤더 `날짜`→`시작`
- `apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx` — `:337-340` `isOffGroupYear` 방어 분기로 격하, `:341-369` `rowDateLabel` 재작성(BC 분기를 `groupYear` 비교 뒤로), 앵커 칩 2종 신설, `:420-424` `--depth`를 `indentDepth`로, `:436` `aria-level`
- (P1 접근성, 색인과 독립) `event-compact-list.tsx:264-270` — `rovingRowId` 계산을 페이지로 이관(`navigableItems` 기준). `:742-750` + `event-list-item.tsx:436-438` — posinset/setsize를 **레벨별** 형제 시퀀스로

**해소 대상**: D-1, D-2, D-3, D-4, D-5, D-6, D-8, A-1, A-2, A-3, A-5. 부수적으로 URL 딥링크 재현 실패(`?century=20` 공유 후 칩 해제 시 세기 이동)와 "연 헤더 N건 ↔ 접힘 N행" 모순도 사라진다.

**검증**
- 기존 spec 갱신: `list-grouping.spec.ts:115-121`(부모 부재 폴백 → "부모 유무와 무관하게 자기 연도"), `:123-134`(`yearRootCount ≠ 렌더 행 수`를 의도로 못 박은 케이스 → **역전**), `:38-59`(헤더리스를 모집단 기준으로), `:144-182`(`filteringActive` 4분기 **전량 삭제**), `:150`에 폐기 주석 + 반증 근거(사용자 보고 + 실측 67행) 기록
- 신규 spec 최소 12건: ⑴ 자식이 배열에서 **부모보다 앞**에 와도 결과 동일(D-3 회귀 가드) ⑵ `hierarchy:false`면 정렬 방향 무관 동일 버킷 ⑶ `indentDepth` 조상 체인(같은 해 조부까지) ⑷ `anchorParentById` ⑸ `resolveBucketCollapse` 3케이스 ⑹ 흡수됐던 연도가 gap 후보에 포함돼 유령 공백 0 ⑺ **`centuryCount` assert 최초 도입**(현재 파일 전체에 0개) ⑻ `yearRootCount === eventsByYear.get(y).length` 불변식 ⑼ 입력 N행 → 버킷+미상 합계 N행(never-drop) ⑽ 헤더리스가 접힘에 불변 ⑾ posinset/setsize 레벨별 ⑿ `rovingRowId` 폴백
- 게이트: `NODE_OPTIONS=--max-old-space-size=12288 npx tsc -p apps/web-admin/tsconfig.json` exit 0 / 변경 파일 단독 lint 신규 0 / `list-grouping.spec.ts`·`useEventHierarchy.spec.ts`·`event-list-item.spec.tsx`·`use-catalog-keyboard.spec.tsx` 통과
- **라이브 DB 재시뮬레이션 필수**: 기대값 = 버킷 **115** / 헤더≠행 **0** / 거짓 공백 **0** / 헤더 카운트 불일치 **0** / 헤더리스 **65**

**되돌리기 비용**: 중. 귀속식은 한 줄 revert지만 spec 12건 신규 + 5건 삭제 + 6건 갱신이 함께 되돌아가야 한다. 접힘 술어(`resolveBucketCollapse`)는 독립 함수라 단독 revert 가능. **커밋을 ⑴ 귀속+카운트+gap ⑵ 접힘 술어 ⑶ 앵커/들여쓰기 표기 ⑷ a11y 로빙·setsize로 4분할하면 부분 롤백이 가능하다** — 그렇게 나눌 것.

---

### 배치 2 — 표기 층 (P2)

**목적**: 색인이 정직해진 뒤에도 남는 날짜 토큰 결손을 닫는다.

**대상 파일**: `event-list-item.tsx`, `event-compact-list.tsx`

- D-9/T-1: `renderRow`에 `ungrouped` 플래그를 추가(현재 `groupYear`가 '그룹 소속'과 '그룹 존재 여부'를 동시에 인코딩하는 것이 근인). `groupYear == null`이면 정밀도별 풀 표기(`YYYY.M.D`/`YYYY.M`/`YYYY`, BC는 `BC N`)를 반환하고 괄호를 붙이지 않는다. '연도 미상' 섹션(`:781-783`)도 같은 플래그.
- T-2: 배치 1로 off-group이 소멸하므로 괄호 CSS(`:1179-1191`)는 삭제 대상. 남는 것은 **BC 잠복 결손**(`:339`의 `year >= 0`) — 어긋남 자체가 불가능해지므로 함께 소멸.
- T-3: `<Duration title={`${시작}–${종료}`}>` 추가, 또는 `[dur]` 셀 텍스트를 `–1917 · 23년 10개월`로. (⚠️ 모든 걸친 연도에 행을 **복제하는 안은 금지** — `bucketYearById`가 행 id → 단일 버킷을 전제)
- A-8: `<Year title={fullDateLabel}>` 추가 — `formatDateWithPrecision`(상세 패널이 이미 쓰는 함수) 재사용, 새 포맷 규칙 만들지 말 것

**검증**: `event-list-item.spec.tsx`에 신규 6건(`groupYear=null` 풀 표기 / 같은 해 축약 / 헤더리스 연도 되살림 / BC 같은 해 / BC 헤더리스 / 미상). 현재 이 파일의 `groupYear`·offgroup 관련 it은 **0개**.

**되돌리기 비용**: 낮음. 표시 문자열 계층에 갇힘.

---

### 배치 3 — 상태 위생 (P2)

**목적**: 파생 집합과 사용자 상태가 어긋나는 경로를 닫는다.

- D-10: `events.page.tsx:1018`의 `keywordInput.trim().length > 0`을 디바운스된 값으로 교체 → `isFiltered`·`statsEvents`·`matchedCount`가 한 프레임에서 전환
- D-8 잔여: `collapsedYears`/`collapsedCenturies`를 `allYears \ headerlessYears`와 교집합 정리하는 effect(빈 교집합이면 setState 생략해 루프 방지). ⚠️ 접힘 예외 분기 `list-grouping.ts:310` ↔ `event-compact-list.tsx:655`는 **양쪽을 동시에** 고칠 것 — 한쪽만 고치면 실패 모드 ②가 재발한다
- A-4: `scroll-margin-top`을 사다리 토큰으로 유도 — `calc(var(--col-header-h) + var(--century-header-h) + var(--year-mt) + var(--year-h) + 4px)`. 더 나은 단일 출처는 스크롤 컨테이너의 `scroll-padding-top`. 열 헤더가 숨는 `max-width:899px` 대역에서는 `--col-header-h` 항을 0으로
- A-6: `lastFocusedRowId`를 페이지 state로 두고 `rovingRowId` 우선순위를 `선택(보이는 경우) > lastFocusedRowId > navigableItems[0]`로

**검증**: `use-catalog-keyboard.spec.tsx` 하네스에 **로빙(한 행만 tabIndex=0)** 반영(현재 `:63`이 모든 행에 `tabIndex={0}`을 박아 로빙을 모델링하지 않는다). A-4는 브라우저 실측 필요.

**되돌리기 비용**: 낮음. 각 항목이 독립.

---

### 배치 4 — P3 마감

- T-4: `event-compact-list.tsx:671-676`의 `'0px'` 강제를 `Math.max(0, gapSpacingPx(gap.years) - centuryGap)`로. (현재 데이터에서는 `1205→1002` 한 쌍에서만 발현)
- T-5: `:777`에 단위 '건' 추가(`list.styles.ts:766-780` 규약)
- A-7: `GapMarker`를 `CenturySection` **밖**(직전 형제)으로 + `aria-label`로 구간 명시. ⚠️ 현재 배치는 사고가 아니라 의도(`event-compact-list.tsx:570-572` 주석) — "시각 순서(연대기) vs AT 순서(그룹 소속) 상충"으로 서술할 것
- A-9: 라이브 문구에 `displayedCount`를 **모든 분기에 포함**(로딩 중에도 값이 바뀌게)
- A-10: 라이브 영역을 3항 연산자 분기 밖으로 끌어올려 상시 마운트. ⚠️ 발현 경로는 **필터 없이 events가 0이 되는 경우**로 한정(검색으로 0건이 되는 경로는 `MetaArea aria-live`가 이미 고지)
- 별건: `event-map-view.tsx:75`의 `new Date(start).getFullYear()`를 `parseIsoDateParts`로(1줄, BC/TZ 결함). 다른 6개 뷰는 이미 이관 완료 — 지도만 누락
- 별건: `list-grouping.ts:177-183` `missingCenturies` 열거에 상한 없음(`century-span.ts:46`은 `MAX_ENUMERATED_CENTURIES = 200`을 둠). 현재 미발현이나 6자리 `start_year` 저장이 가능하므로 방어 권고

**되돌리기 비용**: 낮음.

---

### 배치 5 (옵션, 별도 판단) — 계보 전용 축

배치 1 적용 후 "계층이 안 보인다"는 실사용 반응이 나오면, 안 C의 계보 축을 현행 `grouped=false` 렌더 경로 재사용으로 얹는다(신규 렌더 트리 0). **선행 조건**: 축 컨트롤을 필터 패널(`filters-panel.tsx:526-539`, 12px 스위치)에서 `ViewSwitcherRow`로 승격해 발견성을 먼저 확보하고, 그 다음에 축을 도입한다. 기본값은 연대기 유지.

**이 배치는 사용 근거가 확보되기 전에는 착수하지 말 것** — 안 C의 자기비판이 지적한 대로 "연대기가 1차 목적"이라는 전제에 로그·인터뷰가 없다.

---

### 데이터 정정 (코드 아님)

`세 하인리히 전쟁 (974~978)` — 제목은 974~978인데 저장된 `start_year=977`, `end_year=978`이다(실측). 자식 974·976은 정상이고 **부모 레코드가 틀렸다.** 이 4쌍을 '자식이 부모보다 앞선 사례'의 의미론적 근거로 쓰면 안 된다. 별도로 데이터를 고칠 것.

---

## 6. 손대지 말 것

### 6-1. 적대검증에서 기각된 주장 (재발굴 금지)

| # | 주장 | 기각 사유 |
|---|---|---|
| DATA-4 | "'18세기' 칩을 걸면 '16세기' 헤더가 렌더된다 → 결함" | 헤더 렌더 자체는 재현되나 **잘못된 헤더 아래 놓이는 행이 0건**이다. 필터 중에는 DATA-9 예외로 플라시 전투가 자기 연도(1757) 버킷에 들어가고, 16세기 › 1600년 그룹에는 부모 1행만 남는다. 1600년 헤더는 그 사건의 실제 시작 연도를 정직하게 말한다. 제안된 clamp는 오히려 시작 연도를 거짓말하게 만든다. desc 정렬이므로 '목록 최상단'도 아니다(맨 아래) |
| DATA-10 ㉮ | "BC 행이 다른 해 버킷에 놓여도 신호가 없다" | `BC 44`가 자기 연도로 그대로 표시돼 헤더와의 불일치는 보인다. 게다가 `event-list-item.tsx:332-336` 주석이 "'BC' 접두사 자체가 다른 축이라는 신호라 괄호는 중복"이라고 **명시적 설계 의도**를 기록 |
| DATA-10 ㉯ | "BC↔AD 공백이 1년 과다 → '2년 기록 없음' 표지" | `formatGapLabel:219`가 `years < 10`이면 null을 돌려주고 두 렌더 지점 모두 `if (label)` 가드가 있어 **표지가 아예 생성되지 않는다**. 산술 오차는 실재하나 영향은 4px 여백뿐 |

DATA-10 ㉰(`missingCenturies` 열거 상한 부재)만 **별건으로 살아 있다** — 배치 4에 포함.

### 6-2. 선행 검토에서 이미 기각·비범위 확정 (재제기 금지)

| # | 항목 | 출처 |
|---|---|---|
| R3 | 연도 그룹핑 폐기 → 계층 순서 보존 렌더(회귀 표면 과대) | `event-subevent-visibility-review.md:167-171` |
| R4 | **occurrence 복제** — 한 사건을 걸친 모든 연도에 반복 표시 | `event-multi-parent-review.md:506` (그리고 `bucketYearById`가 행 id → 단일 버킷을 전제) |
| R5 | `parentEventId` 컬럼 드롭·정본 이관 | `event-multi-parent-review.md:507` |
| R6 | `relationType` enum 도입 | `event-multi-parent-review.md:508` |
| R7 | `sortOrder`(자식 수동 정렬) v1 제외 | `event-multi-parent-review.md:509` |
| R8 | 상시 2열 레이아웃 | 사용자 결정 미채택 |
| R9 | SPACE-6 세기 인덱스(우측 컬럼) — 거터 36px와 배타 | `event-list-view-design-overhaul-review.md:19` |
| R10 | 목록 가상화 — 근본책은 서버 `COALESCE` 정렬이라 그 결정이 먼저 | `event-list-page-ux-review.md:157` |
| R11 | 행 전체 들여쓰기(`margin-left: depth*22`) — 제목 셀 *안* 들여쓰기가 채택안 | `event-list-empty-right-review.md:264` |
| R12 | 행을 `<a>`/`role="link"`로 승격 | `event-list-page-ux-review.md:150` |

R1(자식 연도를 `allYears`로 승격 기각)은 **이 검토서가 명시적으로 재제기**한다 — §4-5 참조.

### 6-3. 이 화면이 이미 태운 실패 모드 6가지 — 코드상 방어 위치

| # | 실패 | 현재 방어 | 배치 1이 어떻게 지키는가 |
|---|---|---|---|
| ① | 그룹핑이 행을 드롭(날짜 미상·부모 없는 자식 소멸) | never-drop + '연도 미상' 버킷 `list-grouping.ts:66-67,134-138` | `bucketYear`가 전사(全射) — 있으면 그 해, 없으면 `unknownItems`. `orderRowsForRender` 길이 방어 `:284` 유지 + 신규 spec ⑼ |
| ② | 모수(`selectVisibleRows`)와 렌더 분기가 갈림 | `list-grouping.ts:303-311` ↔ `event-compact-list.tsx:648,655` **같은 표현식** | 두 분기 표현식 무변경. 헤더리스가 접힘에 **불변**이 되어 시점 차로 갈릴 여지가 줄어든다 |
| ③ | sticky 연 헤더 34겹 적층 | `CenturySection > YearSection` 그룹 단위 containing block | 렌더 트리·`groupYearsByCentury` 무변경. 연 그룹 90→115지만 헤더리스 65개가 흡수해 시각 밴드 38→**50**, 적층은 세기 1 + 연 1 |
| ④ | 카운트 모수 혼선 | `events.page.tsx:726-743` 4단 파이프라인 주석 | `matchedCount`(①술어 직후)·`displayedCount`(④밴드 접힘 이후) 정의 무변경. 헤더 카운트는 모집단을 ③계층 접힘 **이전**으로 고정해 규약을 오히려 강화 |
| ⑤ | 위치 휴리스틱('직전 depth 0이 내 부모') 부활 | `parentNodeId` 필수 `useEventHierarchy.ts:43-50` | 배열 위치를 읽는 코드가 **0**이 된다. 기존 `bucketYearById.get(parentNodeId)`(전방 패스 의존)조차 제거되고, `indentDepth`·앵커는 `parentNodeId` 체인 워크만 |
| ⑥ | 공유 모집단 오염(타임라인·격자·지도·트리·갤러리·JSON이 같은 배열) | 평탄화는 항상 완전, 접힘은 `isCollapsedAway` 플래그 `useEventHierarchy.ts:52-58,259-271` | `flattenedHierarchy`/`matchedOnlyHierarchy`/`visibleFlattenedHierarchy` **전부 무변경**. 새 술어는 목록 파생 배열에만 적용 — 다른 6개 뷰는 한 행도 잃지 않는다. `isCollapsedAway`에 "목록은 `resolveBucketCollapse`를 쓴다 — 이 플래그를 목록 술어로 되돌리지 말 것" 경고 주석 1줄 |

---

## 7. 미확인 사항 (정직하게)

1. **브라우저 시각 검증 미실시.** 크롬 확장이 연결돼 있지 않아 라이브 DOM을 한 번도 보지 않았다. 이 문서의 "화면에 보이는 것" 항목은 전부 **코드 정독 + DB 실측 기반 추론**이다. 특히 sticky 사다리 실측 높이(A-4), 앵커 칩 65개의 밀도 영향, `1876년`처럼 전 행이 앵커인 25개 그룹의 실제 인상, 스크린리더 낭독 순서(A-2·A-7)는 **검증되지 않았다.** 배치 1의 종료 게이트에 브라우저 시각 검증을 1급 항목으로 둘 것.

2. **행 수 267 vs 268.** 과제 브리핑은 267건, 이번 세 차례 독립 시뮬레이션은 모두 268건(`deleted_at IS NULL`)을 얻었다. 조사 도중 1건이 추가됐거나 집계 시점이 다른 것으로 **추정**하나 확인하지 않았다. 이 문서의 비율은 268 기준이다.

3. **사용 근거가 없다.** `/events`에서 사용자가 연대순으로 훑는지 계보를 파고드는지 알려주는 로그·인터뷰가 없다. 안 A 추천은 **데이터 분포와 사용자 보고 문장 하나**에 기댄다. 안 A가 잃는 계층 표현력(들여쓰기 85→25)이 실사용에서 얼마나 아픈지는 **측정된 바 없다** — 배치 5를 옵션으로 남긴 이유가 그것이다.

4. **BC·'연도 미상' 경로는 전부 잠복.** `start_era` 분포는 AD 262 / NULL 6이고 BC 사건 0건, 최소 연도 867, 시작 연도를 못 구하는 사건 0건이다. T-2·T-5·P4 계열은 **현재 데이터로 발현하지 않으며** 코드 경로만 확인했다.

5. **다중 상위는 목록에 오지 않는다.** `event_parent_link` 1행(데모)이고 `GET /events` include에 `extraParentLinks`가 없다(`event.controller.ts:505-596`). 현재 연도 어긋남에 기여하지 않지만, PD1 이후에는 "한 자식이 두 부모 버킷"이라는 미해결이 생긴다 — 그때 앵커 규칙('주 상위만')을 재확인해야 한다.

6. **안 A 적용 후 수치는 시뮬레이션 값이다.** 버킷 115 / 헤더리스 65 / 들여쓰기 25 / 앵커 65 / 거짓 공백 0은 라이브 DB에 규칙을 대입한 결과이지, 코드를 고쳐 얻은 값이 아니다. 배치 1 종료 시 **같은 스크립트로 재측정**해 일치를 확인해야 한다.

7. **미해소로 남기는 것.** ⑴ 기간 사건이 시작 한 점에만 색인된다 — 걸쳐 있으나 색인에 나타나지 않는 (사건,연도) 조합 **194개**. occurrence 복제 봉인(R4) + 단일 버킷 전제 때문에 어느 안도 못 고친다. ⑵ 세기 필터(구간 겹침) ↔ 색인(시작점) 축 불일치 — 다세기 사건 **6건**. 완화는 표기뿐(`날짜`→`시작` 열 헤더, "…에 시작한 사건"). ⑶ 격자·갤러리·지도·대시보드의 `depth !== 0` 스킵 ↔ 드로어 이전/다음 모수 불일치. ⑷ 서버 `century` 필터의 10세기 이하 Invalid Date, 정렬의 `COALESCE(start_date, start_year)` 미적용(`start_date IS NULL` 24건, 루트 8건). ⑶⑷는 **이 검토의 범위 밖 별건**이며 어느 안의 전제도 아니다.

8. **백엔드·마이그레이션은 어느 안도 필요 없다** — 확인함. 필요한 입력(`node.period.start`·`parentNodeId`·`canExpand`·`isMatch`)이 전부 응답에 있고, `take`는 루트에만 걸리며 자식은 include(`event.controller.ts:415-416,566-590`) + `autoLoadAll`(`events.page.tsx:304`)로 전 페이지를 소진하므로 **자식이 부모와 다른 페이지에 있을 수 없다.** 스키마·DTO·SDK(`build:nestia`) 무변경.

---

### 참고 파일 (절대 경로)

- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-hierarchy/model/list-grouping.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-hierarchy/model/list-grouping.spec.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-hierarchy/model/useEventHierarchy.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-hierarchy/model/matched-rows.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/pages/events/list/events.page.tsx`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/pages/events/list/hooks/use-catalog-url-sync.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/pages/events/styles/list.styles.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/widgets/event-list-compact/ui/event-compact-list.tsx`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/widgets/event-list-compact/ui/event-list-item.tsx`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-filters/model/useEventFilters.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/features/event-filters/model/century-span.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/web-admin/src/shared/lib/iso-date.ts`
- `/Users/taeyoung/Desktop/project/papyrus/apps/api/src/libs/event/presentation/event.controller.ts`
- `/Users/taeyoung/Desktop/project/papyrus/libs/db/prisma/event.prisma`
- 선행 검토서: `docs/event-subevent-visibility-review.md`, `docs/event-list-page-ux-review.md`, `docs/event-list-view-ux-review-3.md`, `docs/event-list-view-design-overhaul-review.md`, `docs/event-list-filter-review.md`, `docs/event-multi-parent-review.md`

**이 조사에서 프로젝트 코드는 한 줄도 수정하지 않았다.** 시뮬레이션 스크립트는 전부 스크래치패드(`/private/tmp/claude-501/-Users-taeyoung-Desktop-project-papyrus/088bdd6a-40c3-4064-9225-a4f2410ccb63/scratchpad/`)에만 있으며 DB는 읽기 전용 쿼리만 수행했다.