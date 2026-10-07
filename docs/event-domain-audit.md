# 사건 도메인 전수 점검 — 중복 기능·설계 이상 (2026-10-06)

범위: 스키마(`libs/db/prisma/event*.prisma` 외 사건을 참조하는 모델), API(`apps/api/src/libs/event`),
web-admin 사건 관련 전 디렉터리. 근거는 실DB 행 수(로컬 DB) · import 도달성(엔트리 `app/main.tsx`부터)
· 서버 라우트↔웹 호출 대조.

기준 수치: event 417행 / 생존 368 / 소프트삭제 49 · 최상위 243 (그중 하위 있는 것 30) · 깊이 d0 243 · d1 118 · d2 7.

---

## A. 지금 화면에서 틀리게 나오는 것 (결함)

### A1. 여파 단락 90개가 '전개' 아래에 그려진다 — 60개 사건
- `event_section.section_type` 실값: narrative 284 · **background 118 · process 136 · aftermath 90** · content 7.
- 상세는 `isBackgroundSection`(narrative-sections.lib.ts:16)만 갈라내고 **나머지 전부를 전개**로 본다.
  → `aftermath` 단락이 전개 번호 단락 사이에 섞이고, 같은 사건의 '여파' 섹션은 `event.aftermath` 컬럼만 보여준다.
- 60개 사건 중 다수는 `event.aftermath` 컬럼도 채워져 있어 여파가 **두 군데**(전개 속 단락 + 여파 섹션)로 나온다.
- 저장 시 `serialize`가 `row.sectionType`을 보존하므로 편집해도 잘못된 위치가 고쳐지지 않는다.

### A2. 사건 피커 3곳이 사건의 2/3를 못 찾는다
| 피커 | 요청 | 서버가 실제로 주는 것 |
|---|---|---|
| `shared/ui/event-picker-modal` (재위 업적·재임 업적·군주 등록) | `limit: 200` | 최상위 100건 |
| `heads-of-state-timeline/event-search-modal` | `limit: 500` | 최상위 100건 |
| `country-detail/cabinet-event-attach-modal` | `limit: 100` | 최상위 100건 |

서버는 숫자 limit을 100으로 자르고(event.controller.ts:557), `includeSubEvents`를 안 주면 최상위만 준다.
생존 368건 중 **최대 100건만 후보**이고, 하위 사건(125건, 예: 1차대전의 개별 전투)은 **절대 나오지 않는다**.
사건 상세·등록 폼은 이미 서버 검색 `link-candidates`로 옮겼는데 이 3곳만 남았다.

### A3. 삭제한 사건을 되살릴 화면이 없다 — 49건
`GET /events/deleted/list`·`POST /:id/restore`·`DELETE /:id/permanent`와 웹 래퍼(`shared/api/events.ts:484-508`)는
다 있지만 **호출하는 화면이 0곳**. 소프트삭제된 49건은 DB에만 있다.

### A4. 국가 대시보드에서 등록·수정하면 다른 화면이 갱신되지 않는다
`event-create-form-dashboard.tsx`는 `createEvent`/`updateEvent`를 직접 부르고 **쿼리 무효화가 0줄**이다.
사건 목록·상세·좌측 사이드바·인물 상세는 staleTime이 끝날 때까지 옛 값을 보여준다.
(사건 등록 모달 `event-basic-form`은 목록·인물·국가 캐시를 무효화한다 — 같은 일을 하는 두 폼의 동작이 다르다.)

---

## B. 같은 일을 하는 표면이 여러 개 (기능 중복)

### B1. 사건 생성/수정 — 4개
1. 상세 인라인 편집 (`pages/events/detail`) — 정본
2. 등록 모달 `EventRegisterModal` / `LazyEventRegisterModal` (목록·대시보드·상세의 '새 하위 사건')
3. 등록 페이지 `/events/create` (`event-create.page.refactored.tsx`, 같은 `EventBasicForm` 재사용)
4. **국가 대시보드 전용 폼 `event-create-form-dashboard.tsx` (1,954줄, 생성+수정)** — 탭 3개짜리 독자 구현

`/events/:id/edit`는 "같은 필드를 고치는 세 번째 표면"이라 이미 폐지했다(event-route.ts 주석). 4번은 같은 이유로
폐지 대상인데 남아 있고, A4의 캐시 결함도 여기서 나온다. 3번은 2번과 내용이 같다(모달로 통일하기로 한 결정의 잔재).

### B2. 사건 고르기(피커) — 6개, 데이터 경로 3종
| 구현 | 데이터 |
|---|---|
| `use-link-candidate-picker` (상세 상위/하위) | 서버 검색 `link-candidates` |
| `related-block` (상세 관련 사건) | 서버 검색 + 별도 fetch |
| `event-basic-form` (등록 폼 상위) | 서버 검색 |
| `EventPickerModal` | 전량 로드 200 (→100) |
| `EventSearchModal` | 전량 로드 500 (→100) |
| `CabinetEventAttachModal` | 전량 로드 100, `useEffect`+`setState` 수동 페치 |
| `PersonEventLinkModal` | 인물 전용 후보 API |

→ 공용 `EventSearchPicker` 하나(서버 검색 + 하위 포함)로 모으면 A2가 함께 해결된다.

### B3. 사건 엿보기(퀵뷰) — 3개
- 상세 페이지 `/events/:id`
- 목록의 우측 패널 `EventDetailPanel` (880줄)
- 인물·국가 화면의 `EventInlineModal` (398줄)

셋이 같은 사건을 각자 다른 필드로 요약한다. 목록 패널과 인라인 모달은 같은 역할(페이지 이동 없이 요약)이라
하나의 요약 컴포넌트로 합칠 수 있다.

### B4. '하위 사건 보기' — 5군데, 기준이 제각각
상세 `ChildrenBlock`(직계만, 24개 상한) · 상세 '추가 하위' 칩 · 목록 레일 트리 · 목록 `?anchor=` 범위 축소 ·
요약 모달 `TreeView`(깊이 무제한). 최상위 사건 상세는 **배지 하나 외에 일반 사건과 똑같고**(parent-block.tsx:194),
하위 사건의 정보(참여국·기간·인물·사상자)를 모아 보여주는 곳은 어디에도 없다. → C1과 함께 볼 문제.

---

## C. 같은 사실을 두 곳에 저장 (설계 이상)

### C1. '최상위'가 세 개념이다
- **루트**: `parentEventId IS NULL` — 243건. 그중 **213건(88%)은 하위가 0건**인 단독 사건.
- **앵커**: 파생(자손 ≥ 1) + `anchorOverride` — 30건 + 지정 3건.
- 화면 라벨 '최상위 사건': 루트이면서 앵커일 때만.

"최상위 사건 페이지"를 만들려면 기준은 루트가 아니라 **앵커**여야 한다(루트 기준이면 213개의 단독 사건이 빈 조망 페이지를 갖게 된다).

### C2. 배경·여파 — 컬럼 + 섹션 이중 저장
| | 둘 다 | 컬럼만 | 섹션만 |
|---|---|---|---|
| 배경 (`event.background` vs `section_type=background`) | 54 | 81 | 14 |
| 여파 (`event.aftermath` vs `section_type=aftermath`) | 50 | 33 | 10 |

배경은 '요약(컬럼) + 번호 단락(섹션)'으로 의미를 나눠 쓰고 있다. 여파는 그런 구분 없이 컬럼만 렌더되므로(A1)
섹션 쪽은 고아다. `process`(136)는 전개와 같은 뜻인데 이름이 다르다. 정본을 정해야 한다(권고: 여파도 배경과 같은 '요약 + 단락' 규약으로 맞추고, process→narrative로 정규화).

### C3. 사건의 '나라' — 직접 FK + 관계표
`event.historical_country_id`(59건) ↔ `event_country_relation`(800행). 59건 중 **13건은 관계표에 그 나라가 없다**.
컨트롤러가 응답에서 두 출처를 합쳐 메운다(event.controller.ts:281-290 'F17'). 필터·집계 경로마다 이 합치기를
기억해야 하는 구조다. 권고: 13건을 관계표로 이관하고 직접 FK는 '주 무대' 의미로만 남기거나 폐기.

### C4. 조약 — 4곳
`Treaty` 엔티티(17행) · `TreatyEventLink`(**0행**) · `MilitaryDetailsNorm.treaty` 자유텍스트(5행) ·
카테고리 '회담/조약'(43건). 사건과 조약을 잇는 정식 경로(TreatyEventLink)는 비어 있고, 자유텍스트가 그 역할을 하고 있다.

### C5. 동맹 — 4곳
`Alliance`/`AllianceMember`(사건 소속, **0행·API 코드 0**) · `Organization` type `MILITARY_ALLIANCE` ·
`Treaty` type `ALLIANCE` · 역사국가 관계 `ALLIANCE`. 진영(`EventSide`)이 생긴 뒤로 사건 소속 `Alliance`는 쓸 곳이 없다.

### C6. 인물↔사건 — 연결 경로 4개, 서로 안 이어짐
`PersonEvent`(180) · `PersonLifeEvent`(759, **`eventId` 연결 0건**) · `TenureAchievement`(0) · `SovereignReignAchievement`.
연보 759건 중 사건 목록의 사건을 가리키는 것이 하나도 없다 — 연보와 사건이 별개로 쌓이고 있다.
`PersonEvent.sideId`도 180건 중 0건(진영 모듈은 국가 쪽만 쓰임, 24/800).

### C7. 군사 정보 — 3겹
`MilitaryDetailsNorm`(5행, 응답에 `@ts-ignore`로 `militaryEvent` 덧붙임 controller:1622) · `event.warCost` 텍스트(9건) ·
새 진영·측정값 모듈(observation). 사상자·병력이 측정값으로 옮겨갔으니 `militaryEvent` 레거시 경로를 정리할 시점.

---

## D. 쓰이지 않는 것 (죽은 스키마·코드)

### D1. 0행 + 코드 0인 모델 — 같은 개념의 병렬 구현
| 모델 | 행 | API | 웹 | 겹치는 정본 |
|---|---|---|---|---|
| `WarHistory` + `WarHistory{Weapon,GroundVehicle,Aircraft,NavalVessel,MilitaryUnit}` (6표) | 0 | 0 | 0 | `Event`(전쟁) + `SideWeapon`/`SideDeployedUnit` |
| `OrganizationEvent` | 0 | 0 | 0 | `Event` + `EventOrganizationRelation` |
| `Alliance` / `AllianceMember` | 0 | 0 | 0 | `EventSide` / `Organization` |
| `SideWeapon` / `SideDeployedUnit` | 0 | 0 | 0 | (군사 확장 미착수) |
| `CabinetEvent` · `BookEvent` · `AdministrationDepartmentEvent` | 0 | 있음 | 있음 | — (기능은 있으나 데이터 0) |

`WarHistory`와 `OrganizationEvent`는 '사건'을 도메인마다 따로 만들던 시절의 흔적으로, 사건 모델과 정면으로 중복된다.

### D2. 라우트에 닿지 않는 웹 코드 — 25파일 · 약 4,900줄
- `pages/events/ledger/**` (≈4,300줄) — "보류·미라우트"(event-route.ts). 그런데 **상세 페이지 12개 파일이
  `ledger/styles/ledger-tokens`를 import** 한다 → 살아 있는 페이지가 죽은 페이지의 토큰에 의존(의존 방향 역전).
  토큰을 `pages/events/shared`(또는 entities)로 옮기고 나머지는 삭제.
- `pages/events/components/intro-section`, `widgets/event-list/ui/simple-select-modal`,
  `features/event-list/ui/catalog-view-empty`, `shared/api/event-eras.ts`, `features/event-create/model/index.ts`.
- `pages/events/styles/*`(theme.ts 1,130 · list.styles 2,427 · detail.styles 1,134 …)는 도달은 하지만
  상세가 자체 `detail/styles.ts`를 따로 가져 스타일 출처가 2벌이다.
- 사건 뷰 6종 제거 후 남은 타입: `pages/events/types/belligerents-graph.types.ts`·`conference-event.types.ts`,
  `pages/events/create/events.types.ts`(지도 마커·전역·영향 지표 등 구현되지 않은 형상).

### D3. 호출되지 않는 API
- `GET /events/eras` (컨트롤러 ≈150줄) — 시대 뷰 삭제 후 소비처 0.
- 휴지통 3종 — A3.

---

## E. 구조 (당장 깨지진 않지만 위 문제들을 낳는 원인)

- **컨트롤러 비대**: `event.controller.ts` 2,293줄, `this.prisma.` 직접 호출 31곳. 목록 쿼리(≈300줄)·상세 빌더·
  계층 가드가 컨트롤러에 있고, 서비스의 `getAllEvents`/`getEventById`와 레포지토리 `findAll`/`findById`는
  컨트롤러가 거의 쓰지 않는 **두 번째 읽기 경로**다.
- **소유권 검사 복붙 12곳**: `createdById !== userId → Forbidden`이 핸들러마다 인라인. 가드/헬퍼 하나로.
- **타입 4벌**: SDK `EventResponseDto` · 손으로 쓴 `EventDetail`(use-event-detail.ts, 하위 타입 9개) ·
  `entities/event` `HistoricalEvent` · 응답 `militaryEvent`는 `@ts-ignore`. 필드 추가 때마다 네 군데를 맞춰야 한다.
- **캐시 키 접두사 불일치**: `['events', …]` · `['event-detail', …]` · `['events-by-country']` · `['events-count']` ·
  `['dashboard-recent-events']` · `['events-for-cabinet-linkage-fallback']` · `['heads-of-state','events-overlay-list']`.
  `['events']` 하나로 무효화가 안 되어 A4 같은 누락이 생긴다.
- **목록 구현 2벌**: `widgets/event-list-compact`(6,464줄)와 좌측 `event-list-sidebar`(909줄)가 각자 그룹핑·정렬을 한다.

---

## 진행 상황

- **배치 1 완료** (94bf139d1 · 73ba6e0a6 · 412a417b4): A1 여파 단락 분류 · A2 피커 3곳 서버 검색/전량 · A4 무효화 헬퍼.
  `process` 백필은 하지 않음 — 시드 47개가 `aftermath`/`process`를 의도적으로 써서, 고칠 쪽은 화면 분류였다.
- **배치 2 완료**: D2 장부 페이지·죽은 파일 24개 삭제 + `ledger-tokens`를 `entities/event/ui`로 이전 ·
  D3 `GET /events/eras` 제거 · B1-4 국가 대시보드 전용 폼(1,954줄) → 공용 `EventRegisterModal`
  (편집 분기는 넘겨주는 곳이 없던 죽은 코드라 함께 삭제).

## 권고 순서

| 배치 | 내용 | 규모 | 스키마 |
|---|---|---|---|
| 1 | A1 여파 단락 분류 수정(+process 정규화 백필) · A2 피커 3곳을 서버 검색으로 · A4 무효화 | S~M | 백필만 |
| 2 | D2 죽은 웹 코드 삭제 + ledger 토큰 이전 · D3 `/eras` 제거 · B1-4 대시보드 폼을 등록 모달로 교체 | M | 없음 |
| 3 | A3 휴지통 화면 · 소유권 가드 단일화 · 캐시 키 `eventKeys` 단일 팩토리 | M | 없음 |
| 4 | C1 앵커 상세에 '하위 조망' 섹션(참여국·기간 막대·인물·진영 집계) — 처음 요청 | M~L | 없음 |
| 5 | D1 0행 모델 드롭(WarHistory 6표·OrganizationEvent·Alliance 2표) · C3 13건 이관 · C4 TreatyEventLink 채우기 | M | **마이그(파괴적, 결정 필요)** |
| 6 | C6 연보↔사건 연결 · C7 militaryEvent 레거시 정리 · E 컨트롤러 분해·타입 단일화 | L | 일부 |
