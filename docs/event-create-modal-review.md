# 사건 등록: 페이지 → 모달 전환 검토

> 조사 5렌즈 → 설계안 3종 → 교차심사 3인 → 적대검증 4건 → 종합. 2026-08-01.
> 수치는 헤드리스 Chrome 실측 또는 소스 직접 판독. 추정치는 명시.

## 1. 결론

**모달로 간다. 범위는 "등록(create)만", 셸은 `<RegisterModal>`, URL 동기화는 후속, 편집(`/events/:eventId/edit`)은 모달화하지 않고 상세 인라인으로 흡수한다.**
착수 전 중첩 피커 2종(TimePicker·AdvancedCountrySelect) 수리가 협상 불가능한 게이트다.

**다만 먼저 할 것은 모달이 아니다.** 현행 페이지에 실측 결함 5건(복귀 목적지 유실·`useBlocker` 부재·저장 CTA 소실·불필요 API 5개·`onSuccess` 캐시 시딩 스킵)이 모달과 무관하게 존재한다. 이걸 고치는 배치는 UX 변화 0의 단독 머지 가능 커밋이다. **배치1 → 게이트(배치2) → 모달(배치3)** 순서.

---

## 2. 왜 그런가 (실측 근거)

### (1) "폼이 커서 모달에 안 들어간다"는 판별력이 없다

폼 실측 높이 **1343px(빈) / 1532px(채움)** @1440×900.
현행 페이지 실사용 세로는 **772px** (`apps/web-admin/src/pages/events/create/event-create.styles.ts:218-229` — `PageWrapper { height: calc(100vh - var(--header-height)) }` − padding 64px).
→ **페이지에서도 이미 571px 스크롤 중이다.** 모달 본문 680px으로 옮길 때 손해는 92px = 11.9%.

대신 저장 CTA가 sticky 푸터로 상시 노출된다. 현행 `S.FormAreaHeader`(`event-create.styles.ts:243-250`)에는 sticky가 없어 **스크롤하면 저장 버튼이 사라진다.**

### (2) 폭 손실은 셸 선택으로 0으로 만들 수 있다

폼 설계폭 = 라벨 200px + gap 24px + 필드 680px = **904px** (`event-create.styles.ts:11`, `:307-331`).

| 셸 | 콘텐츠 폭 | 판정 |
|---|---|---|
| **`RegisterModal`** + `$maxWidth='min(1040px,96vw)'` | 976px | ✅ **픽셀 무손실** (기본 min(960,96vw), FormScroll padding 32×2 — `register-modal-shell.tsx:29-41`, `:99`) |
| 기본 `<Modal>` (560px) | 496px | ❌ 카테고리 그리드가 1열 980px로 붕괴 → 폼 2126/2424px(**+58%**) |
| `CountryFormShell` | — | ❌ `max-height:1200px` 하드캡(`country-form-shell.tsx:115-116`), `formId` **필수**(`:58`, 푸터 `type="submit" form={formId}` `:934`)라 없는 `<form>` 래핑 강제 + Enter 암시적 제출 신규 발생. 결정타는 Esc를 **window에 바인딩**(`:630`) → 카탈로그 window 단축키와 이중 발화 |

`event-create.styles.ts:307-331`의 미디어쿼리가 뷰포트 기준이라 컨테이너 쿼리 전환이 필요하다는 문제도 976px에서는 발생하지 않는다.

### (3) `/events/create`의 딥링크 가치는 0 — 부재가 아니라 적극 증거가 있다

- 진입점 4곳 전부 인자·state 없는 programmatic `navigate`. `<Link>`/href/`window.open` 형태 **0건**.
- 폼은 `useSearchParams`/`useLocation`을 **아예 읽지 않는다**.
- 결정적: `apps/web-admin/src/app/legacy-redirects.tsx:25-29`가 "북마크·외부 링크 흡수" 목적으로 `/history/events`를 흡수하면서 **`create`는 제외**했다. 그래서 `/history/events/create`는 지금 **404**(`browser-router.tsx:216-219`)인데, 대외 문서(`docs/예비창업패키지_사업계획서.md:463,1261`)에 페이지로 적혀 있는데도 회수 요구가 없었다.

### (4) 잃는 것은 "목록 보며 입력"이 아니라 "돌아갈 자리" — 팀은 이미 이 손실을 버그로 판정한 적이 있다

`apps/web-admin/src/pages/events/list/events.page.tsx:415-422` 주석:
> 예전엔 위젯 로컬 state였다. 그래서 뷰를 잠깐 바꿨다 돌아오면 위젯이 언마운트돼 접기 작업이 통째로 사라졌고… 이 페이지의 다른 상태는 전부 보존되는데 접힘만 예외였다.

`collapsedYears`/`collapsedCenturies`(`:423-429`)와 `expandedEventIds`(`:258-274`)는 **페이지 소유 useState**라 `/events/create`로 나가는 순간 소멸한다. 게다가 '이전' 버튼은 `pathKeys.events.root()`(`event-create.page.refactored.tsx:132`) = 쿼리 없는 `/events/`(`shared/router.ts:159`)라 **URL 동기화된 12개 필터·정렬·뷰모드·선택이 전부 날아간다.**

※ 서버 데이터는 안 날아간다(`shared/queryClient.ts:5-12`, staleTime 3분). 손실은 순수 UI 상태다.

### (5) 선례는 "다수 규약 합류"가 아니라 "동급 형제 3종이 모달"

전수 집계: 등록 표면 39개 · 4패턴 — **모달 25 / 페이지 7 / 사이드패널 4 / 인라인 뷰스왑 3**.
총합 모달 64%지만 **사건이 속한 최상위 내비 11개로 좁히면 모달 5개(45%)로 과반 미달**이다(기업·조직=페이지, 대륙·군부대=사이드패널, 민족=인라인).

유효한 근거는 좁은 쪽뿐: **국가·인물·가문이 모달**이고, 그중 인물은 폼 본체 5,515줄·useState 81개로 **사건의 6.6배인데 모달이 정본**이며 페이지 라우트는 호출처 0건의 사표다(`pathKeys.persons.create()`/`edit()` grep 0건).

---

## 3. 채택안 설계

### 셸
`@/shared/ui/register-modal-shell`의 **`<RegisterModal>`**.

1. `useModalBehavior` 채택 = Esc를 **root에 바인딩 + stopPropagation**(`use-modal-behavior.hook.ts:110-115,136`) → 카탈로그 window 단축키와 Esc 이중 발화 없음
2. 푸터를 children으로 받음 → `<form>` 래핑 불필요 → onClick 제출 유지 → Enter 암시적 제출 회귀 없음
3. `$maxWidth`로 1040px 무손실
4. 1200px 하드캡 없음

**보강 1건**: `PersonRegisterModalBox`에 ≤768px 풀블리드 opt-in prop 추가. 현재 모바일 분기가 없어(`register-modal-shell.tsx:41-42`) 390×844에서 콘텐츠 ≈630px < 페이지 716px. `CountryFormShell:123-131`의 `100vw/100dvh` 방식을 opt-in 이식하면 730px로 **페이지보다 넓어진다.**

dirty 가드는 셸에 없으므로 래퍼에서 구현(Esc·오버레이·취소 → `requestClose` → confirm). `beforeunload`는 폼 본체에 유지(새로고침·탭 닫기).

### 진입점별 동작

| 진입점 | 현재 | 전환 후 |
|---|---|---|
| 대시보드 원형 CTA `pages/dashboard/dashboard.page.tsx:223` | navigate | 모달 (전 뷰포트 동일) |
| 카탈로그 툴바 CTA + 모바일 FAB `pages/events/list/events.page.tsx:623` | navigate | 모달 |
| 컴팩트 빈 상태 `widgets/event-list-compact/ui/event-compact-list.tsx:323` | navigate | `onCreateEvent` prop 승격, 마운트 지면이 결정 |
| `widgets/event-list/ui/event-list-section.tsx:175` | navigate | **삭제** (importer 0건, 죽은 코드) |
| 편집 `widgets/event-list/ui/event-detail-panel.tsx:208,:439` | navigate(edit) | **범위 밖** → 배치4 상세 인라인 흡수 |

**뷰포트 분기는 하지 않는다.** 이 앱의 모든 등록 모달이 전 폭에서 모달이고 셸이 모바일을 흡수하는 구조라 분기 선례 0, QA 매트릭스만 2배.

### 편집 모드
모달은 `editEventId` prop을 받아 편집을 지원하되(4종 모달 canon과 동일 계약), **편집 진입점은 만들지 않는다.**
상세가 이미 제목·기간·위치·요약(`detail-hero.tsx:122/143/153/171`), 카테고리·키워드·관련국가(`use-event-mutation.ts:44/171/185-186`), 이미지 CRUD(`detail-appendix.tsx:95-214`)를 인라인 PATCH하므로 `/edit`은 **세 번째 편집 표면**이다.

⚠️ 흡수 전 선결 1건 — **이벤트 `thumbnail`은 상세에서 표시도 편집도 안 된다**(detail 하위 grep 결과 `use-event-detail.ts:118` 타입 정의뿐). 히어로에 썸네일 인라인 편집을 먼저 추가해야 한다.

### 저장 후 흐름
캐시 시딩(`setQueryData`)·프리페치(`ensureQueryData`)를 **분기 밖으로 승격**한 뒤 3지 완료 다이얼로그.
현행 `event-create.page.refactored.tsx:391-406`은 `onSuccess`가 있으면 **둘 다 통째로 건너뛴다** → 콜백 경로를 쓰는 순간 커밋 `b16c8af3f`('등록 직후 무로딩 상세 진입')가 조용히 회귀한다.

- **상세 보기**(기본) → 모달 정산 후 `/events/:id`, 무효화 `refetchType:'none'`
- **사건 계속 등록** → 폼 리셋(카테고리·관련국가 유지), 모달 잔류
- **닫기** → 목록·스크롤·필터·접힘 그대로 복귀

선례 이식: `person-register-view.tsx:2706-2733`(ConfirmDialog + altLabel, **초기 포커스는 '닫기'** — 주 액션이 페이지 이탈이라 반사적 Enter가 연속 등록을 끊지 않게), `country-list/ui/person-register-view-modal.tsx:94-101`("오버라이드는 목적지만 바꾼다 — 정산을 건너뛸 수 없는 구조").
전제: `features/event-form/model/useBasicInfoForm.ts`에 `reset()`이 **없다**(확인함) → 추가 필요.

### URL 동기화
**1단계에서는 하지 않는다.** 대신 모달이 dirty인 동안 호스트 페이지에 `useBlocker`(`pages/persons/person-edit.page.tsx:61-83` 패턴 그대로).
`?eventForm=` 도입은 배치4 — 사건 상세가 이미 `?country=`/`?person=`를 push로 열고 replace로 닫으며 상호배타까지 처리하는 동형 선례가 있으나(`event-detail.page.tsx:111-158`), **URL push + useBlocker + 중첩 dirty confirm 조합은 사내 전례 0**(useBlocker 3곳 전부 평범한 라우트 전환)이라 spec 0건 영역에서 처음 시도할 자리가 아니다.

라우트 `/events/create`·`/events/:eventId/edit`은 배치3까지 **얇은 페이지 셸로 존치**(딥링크 폴백, 앱 내 진입점 0). 배치4에서 URL 동기화 시 redirect loader로 강등.

---

## 4. 구현 계획

### 배치 1 — 페이지 결함 수리 + 폼 본체 추출 (UX 변화 0, 단독 머지·롤백 가능)
모달 채택 여부와 무관하게 전부 순이득. **여기까지만 하고 멈춰도 손해가 없다.**

| 파일 | 작업 | 규모 |
|---|---|---|
| `widgets/event-form/ui/event-basic-form.tsx` **(신규)** | `event-create.page.refactored.tsx`에서 폼 본체 이관. `useParams`(:129,:146)→`eventId` prop, `isDirtyRef`(:192)→state 승격 + `onDirtyChange`, `onSuccess(eventId)` 계약 확장, 페이지 크롬(`:420-484`)·`FormOverlay`(`:423-435`) 제거, 편집 로드 토스트(`:268`) 제거 | L |
| 〃 | **캐시 시딩·프리페치를 `onSuccess` 분기 밖으로 승격**(`:391-406`) — 현재 잠복 지뢰 | M |
| `pages/events/create/event-create.page.refactored.tsx` | 얇은 페이지 셸로 축소 + `useBlocker` 추가(현재 `beforeunload` `:312-320`와 '이전' 버튼 `:133-144`만 가드) + `goBack` 기본값을 `location.state.from` 우선으로 | M |
| `pages/events/create/event-create.styles.ts` | `FormAreaHeader`(`:243-250`) sticky + 불투명 배경. `FormOverlay`(`:261-278`)의 `position:absolute; inset:0`은 1343px 폼 전체 기준 중앙이라 **스크롤 위치에 따라 화면 밖 렌더** — 함께 수정 | S |
| `features/event-form/model/useBasicInfoForm.ts` | 초기값 상수화 + `reset()` 노출 (현재 없음) | S |
| `entities/event-form/model/useFormEntities.ts` | `only` 옵션. BASIC은 3개만 쓰는데(`create page:149-150`) **8개를 병렬 호출**하며 그중 `getAllEvents()`(`:49`)는 사건 전량 조회. ⚠️ 모듈 단일 `cachedSnapshot`(`:38-40`)이라 **부분 스냅샷을 캐시에 쓰면 8개를 기대하는 국가상세 1770줄 폼이 빈 배열을 받는다** — 캐시 미기록 또는 키 분리 필수 | M |
| `widgets/event-form/**/*.spec.tsx` **(신규)** | 현재 이 영역 spec **0건**. 4본: `buildPreservedEventImages` 이미지 보존(`create page:73-122`), 편집 하이드레이션, 저장 후 시딩+프리페치 호출, dirty 닫기 confirm | M |
| `widgets/event-list/ui/event-list-section.tsx` | 삭제 (importer 0건) | S |

### 배치 2 — 중첩 오버레이 선수리 (착수 게이트, 사용자 체감 0)
완료 조건 = **다크 모드 프로토타입 시각검증 통과**.

| 파일 | 작업 | 규모 |
|---|---|---|
| `shared/ui/time-picker-modal/time-picker-modal.tsx` | `createPortal(document.body)` + `useModalBehavior` + z-index 하드코딩 1000(`:153-164`) → `Z_INDEX`. `createPortal`·키보드 핸들러 grep **0건**. 소비자가 `basic-info-section` 2곳뿐 → blast 0 | S |
| `shared/ui/advanced-country-select-modal/advanced-country-select-modal.tsx` | 동일 처리(`:286-291`, `:539-551`). 소비자 5곳(사건 상세 belligerents/actors, 목록 필터, 국가 폼, 사건 등록) 전수 회귀 검증 | M |
| `widgets/event-form/ui/basic-info-section.tsx` | `:360-362` `setTimeout(() => setIsEndDateModalOpen(true), 200)` **연쇄 오픈 제거** → 종료일 필드 포커스 이동. 피커 4개 open 상태를 부모로 보고(`person-register-view.tsx:1454-1470`의 `anyModalOpen` 레시피) | S |
| `pages/events/list/hooks/use-catalog-keyboard.ts` | 오버레이 열림 시 `?`·`/` 게이트. `isTextEntryTarget`(`:67-77`)이 input/textarea/contenteditable만 막아 **폼의 날짜·국가 버튼에 포커스가 있으면 `/`가 통과해 모달 뒤 검색창으로 포커스를 탈취**한다 | S |

### 배치 3 — 모달 전환

| 파일 | 작업 | 규모 |
|---|---|---|
| `widgets/event-form/ui/event-register-modal.tsx` **(신규)** | `RegisterModal` 래퍼 ~150줄. `$maxWidth='min(1040px,96vw)'`, dirty confirm, 3지 완료 다이얼로그, **`React.lazy` + `<Suspense>`로 본문 격리**. 이름은 `EventRegisterModal`(`widgets/event/event-inline-modal`은 읽기 전용 퀵뷰라 혼동 방지) | M |
| `shared/ui/register-modal-shell/register-modal-shell.tsx` | ≤768px 풀블리드 opt-in prop | S |
| `events.page.tsx` / `dashboard.page.tsx` / `event-compact-list.tsx` | 진입점 3곳 전환 + hover/focus prefetch | S×3 |
| `pages/events/list/hooks/use-catalog-modals.ts` | `externalOverlayOpen`을 **`anyOverlayOpen` 계산에만** 편입. `closeTopOverlay`(`:80-98`, 동기 boolean 반환이라 비동기 dirty confirm과 계약 불일치)와 raw body 스크롤락(`:44-63`, refcount `useBodyScrollLock`과 이중 락)에는 넣지 않는다 | S |
| `pages/events/event-route.ts` | 유지. 페이지 셸 상단에 "딥링크 폴백, 앱 내 진입점 0" 주석 명시 | S |

### 배치 4 — 후속 (개별 승인 필요)
- **편집 흡수**: 상세 히어로에 썸네일 인라인 편집 추가 → `/events/:eventId/edit` 리다이렉트 → `event-detail-panel.tsx:208,:439` 상세로. create 페이지 577 → ~430줄 [M]
- **URL 동기화**: `?eventForm=new` push/replace + 라우트 redirect loader 강등 [M]
- **세로 압축**: 카테고리 카드그리드(354px, 390뷰포트 563px) → 드롭다운, 역사국가 존속기간 경고 N개 나열(`basic-info-section.tsx:171-188`, `:766-776`) → 1개 요약+접기. **모달 전용 이득 아님 — 페이지에서도 그대로 이득** [M]
- ~~**스타일 canon 이관**~~ — **절반 완료 + 절반 기각**(2026-08-02 실측).
  - ✅ 브랜드색: 이 폼만 `#8b5cf6`(= 앱의 *secondary*)를 primary로 쓰던 진짜 canon 위반 → `getC(theme)`가 앱 테마에서 덮어쓰도록 수정. 실측 라이트 `rgb(99,102,241)` / 다크 `rgb(99,106,242)`.
  - ❌ 구조 이관: **기각.** `register-form-layout`과 골격을 대조하니 **일치하는 컴포넌트가 0개**다 — 라벨 200px/14px vs 360px/13px, 필수 표식 `*` 글리프 vs 5px 점, 에러 `⚠`+#ef4444 vs 평문 #ea4335, 힌트 `text.muted` vs `text.secondary`. 사본이 아니라 **서로 다른 시각 언어**다.
    결정타: 라벨 360px를 받으면 등록 모달(콘텐츠 990px)에서 필드가 606px로 눌려 **설계폭 680px 아래로 내려간다** — 모달 폭 1040px로 확보한 "가로 손실 0"이 무너진다.
    → 이관은 리팩터가 아니라 재디자인이므로, **두 폼의 시각 규격을 먼저 하나로 정하는 제품/디자인 결정이 선행**해야 한다. 근거는 `event-create.styles.ts` 헤더 주석에 박아 뒀다.

---

## 5. 리스크

### 검증에서 기각됨 (재발굴 금지)
- **z-index 충돌 — 기각.** 부모 `ModalBox`가 `z-index: MODAL_CONTENT`로 스태킹 컨텍스트를 만들어 자식의 1000/9999가 로컬 값으로 흡수된다. 시각 결함의 근인은 z-index가 아니라 **`backdrop-filter` containing block**이다.
- **DatePickerModal 중첩 위험 — 기각.** 실제 마운트 실행 결과 부모 `<Modal>` 안에서 Esc → `parentClose:0, childClose:1` 정상. `date-picker-modal.tsx:158-163,180,642`가 캡처 리스너 + `stopPropagation` + `createPortal`을 갖췄기 때문.
- **"폼이 커서 모달에 안 들어간다" — 판별력 0.** 페이지도 571px 스크롤 중, 차이 92px. 사내 기준점(인물 폼 5,515줄)은 훨씬 크게 안 들어가면서 모달 정본이며, 그 셸은 긴 스크롤을 전제한 scroll-spy 인덱스를 기본 장착한다.
- **"딥링크를 잃는다" — 기각.** §2(3).
- **"모달이 앱 기본 규약이므로 합류" — 축소됨.** 사건 계층에서 모달은 45%(소수). 근거는 "동급 형제 국가·인물·가문이 모달"로만 쓸 것.

### 살아 있는 리스크
- **[P1·실행 확인] Esc 누수 + 포커스 트랩 오염.** 부모 `<Modal>` 안에 `TimePickerModal`을 넣고 Esc 발사 → `parentClose:1, childClose:0` — 자식은 안 닫히고 **사건 등록 모달이 통째로 닫힘**. 부모 dialog 트랩 후보 96개에 자식에 가려진 `사건명` input **포함**. 근인 = `use-modal-behavior.hook.ts:9-11,110-115`(root 바인딩 방어는 **자식이 포털일 때만** 성립) + `getFocusable(root)`(`:31-41`). 배치2 미완이면 발생이 아니라 **확정**.
  - 참고: 이 결함은 사내 최강 선례인 인물 등록 모달에도 **live**다 — `CountrySelectModal`은 포털은 쓰나 키보드 핸들러 0건이고 `CountryFormShell:630`이 Esc를 window에서 듣는다. **"인물이 잘 되니 사건도 될 것"은 성립하지 않는다.**
- **[P1·실측] 다크 전용 클리핑.** 헤드리스 Chrome 실측 — light(박스에 backdrop-filter 없음): 자식 fixed = 1440×813 @(0,0) 정상 탈출. dark(`glassCardMixin`의 `blur(24px)`, `shared/styles/mixins.ts:56-71`): 자식 = **400×300 @(520,257)**, 박스 `overflow:hidden`에 갇힘. **라이트만 보면 리뷰를 그냥 통과한다 → QA는 다크 우선.**
- **[P1] `/` 포커스 탈취.** 배치2 참조. `aria-modal` 다이얼로그에서의 포커스 탈출이라 Esc·`?`보다 심각하다.
- **[P2] 무효화 버스트.** 지금은 저장 시 목록이 언마운트라 refetch가 안 일어나지만, 모달에서는 `autoLoadAll`(`entities/event/model/useEvents.ts:122-152`)이 소진해 둔 N페이지가 즉시 재조회된다. 목적지별 `refetchType` 분기 필요.
- **[P2] 번들 +19KB gzip.** 사내 지배 규약은 정적 import이고(`PersonRegisterViewModal` 소비처 4곳 전부 정적 → dist에서 `person-detail.page` 청크가 gzip 30KB짜리 폼 본체를 무조건 물고 있음), 모달 lazy 선례는 전 앱 1건인데 그마저 채택 이유가 순환참조 절단이다(`shared/ui/country-picker-create/historical-country-create.tsx:10-12`). 현행 create 청크 실측 raw 93,450B / gzip 19,325B → **`lazy()`+`Suspense` 래핑을 계획 필수 항목으로 못박을 것.** 안 하면 `/events`·`/dashboard` 진입에 상시 추가.
- **[P2] draft 없음.** 사건 폼에는 인물의 `use-person-draft.hook` 대응물이 없다. 모달은 실수 이탈이 페이지보다 쉬우므로 dirty confirm만으로는 방어가 약하다 → 최소한 "닫아도 세션 내 재오픈까지 값 유지"(모달 언마운트 시 부모 ref 보존)를 배치3 필수 항목으로.
- **[P2] `AdvancedCountrySelectModal` 포털화 blast 5곳** — 사건 모달화와 무관한 지면이 함께 깨질 수 있는데 그 5곳에도 spec이 0건이다.

### 명시적으로 버리는 것
- **"목록을 보면서 입력"은 못 준다.** 오버레이가 `rgba(15,23,42,0.45)` + blur이고 박스가 1040px이라 1440 화면 대부분을 가린다. 사는 것은 **복귀 충실도**(아무것도 언마운트되지 않음)이지 병행 참조가 아니다. **이 구분을 흐리면 착수 후 "기대와 다르다"는 평가가 나온다.**
- 페이지 전환 `viewTransition` 연출(`create page:403`) → 모달 애니메이션으로 대체
- 편집 로드 성공 토스트(`:268`) → 모달은 열 때마다 마운트라 매번 뜬다. 셸 subtitle(대상 사건명)로 대체
- 데스크톱 세로 92px(11.9%)
- **등록 표면 파편화는 줄지 않는다**(3벌 유지). 배치4의 통합 결정 전까지 "등록 UI 단일화"는 이 안의 명분이 아니다.

---

## 6. 결정이 필요한 지점

### 1. 편집(`/events/:eventId/edit`) 처리 — 흡수 vs 존치
상세 인라인이 제목·기간·위치·요약·카테고리·키워드·관련국가·이미지 CRUD를 이미 커버하지만 **이벤트 `thumbnail` 필드만 상세에서 편집 불가**(확인함). 흡수하려면 히어로에 썸네일 인라인 편집을 먼저 추가해야 한다(추가 M).
흡수하면 create 페이지가 577→430줄, "등록=모달/수정=페이지" 비대칭 논쟁 소멸. 존치하면 그 비대칭이 남는다 — **인물 도메인이 이 상태로 표류해 진입점 패리티 결손 7종을 남긴 이력이 있다**(`docs/person-register-modal-ux-review-2.md:316-335`).
→ **흡수 권고.**

### 2. 등록 표면 3벌 통합 여부 (제품 결정)
`widgets/country/country-detail/ui/event-create-form-dashboard.tsx`(1,770줄, 본문 RichTextEditor·관계 탭 보유)와 `widgets/country/country-detail/ui/cabinet-event-attach-modal.tsx`(289줄, 자체 Overlay·native `type="date"`라 **BC 사건 등록 불가**·모달 토대 규약 위반)를 폐기하고 신규 모달로 수렴할 것인가.
폐기하면 국가 상세에서 **등록 시점에 본문·관계를 채우는 능력이 사라진다**(등록 후 상세 인라인으로만 가능).
→ cabinet 모달은 규약 위반 + BC 불가라 통합 여부와 무관하게 정리 대상. 국가상세 1770줄 폼은 **능력 회귀가 있으므로 별도 판단 필요.**

### 3. 카테고리 카드그리드 → 드롭다운 축약
단일 행이 데스크톱 354px(전체 24%)·모바일 563px(28%). 바꾸면 모달 본문 680px 대비 46% 회수. 대신 10개를 한눈에 훑고 고르는 시각 선택을 잃는다.
**모달을 안 하기로 해도 페이지에서 그대로 이득**이라 별도로도 성립한다.
→ 취향 확인 필요.
