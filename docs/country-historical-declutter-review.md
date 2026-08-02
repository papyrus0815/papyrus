# 검토서 — 국가 페이지 "역사국가가 불필요하게 많다" 개선

> 멀티에이전트 리뷰(45에이전트: 인벤토리 5 → 6렌즈 검토 → 건별 적대검증 → 종합). findings 33건 중 **생존 31·반증 2**.
> 작성 2026-07-25, 브랜치 feature/service-manager-v2.

## 1. 한 줄 진단

**"많다"의 진짜 근인은 수량이 아니라 분류 부재다.** 브리지 테이블(`historical_country_modern_country`)이 관계타입 컬럼 없는 순수 M:N(`id·historical_country_id·modern_country_id·created_at·updated_at` 5컬럼뿐)이라 **① 직계 전신(~10) ② 신성로마제국 당대 구성 제후국(~25) ③ 로마류 고대조상·속주(~3)** 세 가지 이질적 관계를 한 축에 뭉갠다. 구분 신호는 이미 별도 테이블(`transition`·`membership`)에 정규화돼 있으나 **list 뷰 리포지토리가 그걸 조인하지 않아**(`country.prisma.repository.ts:66-117`, `include: historicalCountry`만·`startYear desc` 정렬만) 47개가 평면 덤프로 나오고, 섹션 제목 **"역사적 전신"이 과대약속**(`dashboard.widget.tsx:347`·`country-inline-modal.tsx:277`)해 "왜 이렇게 많냐"는 체감을 만든다.

**과다연결의 발원지 = 시딩 정책**: `historicalCountry.germany.seed.ts`가 42개 엔트리 전부에 `linkToGermany: true`를 하드코딩(false 0개) → 직계전신·구성국·고대조상 구분 없이 무조건 브리지 행 생성(`:578-587`). 즉 "표시 버그"가 아니라 "링크 포함기준 부재"가 근본.

> **핵심 제약: 브리지 행은 표시용이 아니라 스코프 합산의 정의다.** `buildCountryScopeOr`가 브리지 전 행을 타입필터 없이 무차별 OR로 읽어 **7개 도메인**(선거·법령·정당·사건·리더보드·조직·인물)이 재사용한다(`country-scope.util.ts:52-56,74-94`). 그래서 **표시 재분류 = 파급 0**, **행 삭제 = 롤업 파괴**로 두 경로가 정면 갈린다. 독일 47링크 중 20건이 실콘텐츠 보유(프로이센 reign8/aff10, HRE reign8/aff9/event22/point18).

---

## 2. 핵심 권고

| # | 권고 | 우선 | Effort | 파급 |
|---|------|------|--------|------|
| R1 | 제목 정직화 + LineageFlow 거짓 계승 화살표 제거 | P0 | S | 0 |
| R2 | list 3-버킷 점진노출(전신 펼침 / 구성국·조상 접기) + 분절 카운트 | P1 | M | 0 |
| R3 | 분류 신호 규칙 확정 — SUCCESSION/transitionScope 축 금지 (게이트) | P1 | S | 0 |
| R4 | 브리지 불변 + 스코프 격리 봉인 (삭제·relationKind 스코프승격 금지) | P1 | S | 0 |
| R5 | 커버리지 폴백 + 정본 수렴 + 타입 진실화 | P2 | M | additive |

### R1 — 제목·화살표 정직화 (P0, S, 파급 0)
- **무엇을**: `dashboard.widget.tsx:347`과 `country-inline-modal.tsx:277`의 "역사적 전신" → "관련 역사국가"/"역사적 국가"로 교체(이미 섹션 위젯 `widget:1029/1116`이 쓰는 중립 라벨과 정합). LineageFlow(`lineage-flow.tsx:42-55`)의 무조건 `→` 화살표 제거 → 쉼표/줄바꿈 나열.
- **왜**: 47건 중 진짜 전신은 소수인데 라벨이 전부를 전신이라 단언 → "많다" 체감의 절반은 프레이밍. LineageFlow는 병존 구성국·로마까지 `chip→arrow→…→현재` 한 줄로 꿰어 **존재하지 않는 선형 계승을 날조**하며 `styled.ol`이라 스크린리더에 "순서있는 목록 48항목"으로 낭독된다.
- **어떻게**: 순수 카피/렌더 변경, 데이터·스코프 무변경. `transitionByEdge`는 대시보드 위젯에 없으므로(별 탭 소유) 최소 수정은 "화살표 제거"이지 "엣지 기반 화살표"가 아님.

### R2 — list 3-버킷 점진노출 (P1, M, 파급 0)
- **무엇을**: 기본 list의 단일 `list.map`(`widget:1120-1136`)을 3버킷 분할로. **직계 전신선만 펼치고** 구성국·고대조상은 접어 카운트 배지만 노출. 요약 스탯 "연결 47개"(`widget:1105-1112`)를 **"전신 N · 구성국 M · 유산 K"** 분절로 교체.
- **왜**: 분류에 필요한 per-노드 관계가 이미 `countryRelations` Map으로 계산돼 카드에 전달됨(`widget:618-643,1122`) — 신규 fetch 불필요. 브리지 무변경이라 스코프 파급 0(A5 확정).
- **어떻게**: 버킷 내부는 `compareByCountryStart`(`country-period.ts:123-139`) 재사용, 접기/더보기는 era-story-view의 `GROUP_TOP_N` 인라인 패턴(`era-story-view.tsx:129-173`) 복제(공용 `CollapsibleSection`은 코드베이스에 없음·person 위젯 종속이므로 storageKey 명시 주입 또는 shared 추출 필요). 완화 효과는 독일(47)·프랑스(23) 등 대형국 롱테일에 집중.

### R3 — 분류 신호 규칙 확정 (P1, S, 게이트) ⚠️ 가장 큰 함정 차단
- **무엇을**: 트렁크(직계 전신) 판정 축을 **못박는다**.
- **왜**: 순진한 규칙 두 개가 실측으로 **반증**됨:
  - `eventType==='SUCCESSION'` 필터(`flow-graph.ts:154-159`) → 독일 SUCCESSION 13엣지 대부분이 **구성국 등급 승격 사슬**(바이에른공국→선제후국→왕국). 적용 시 길이3 구성국 사슬이 "메인"으로 뽑히고 진짜 계보가 브랜치로 강등.
  - `transitionScope==='STATE_SUCCESSION'` → 전체 189건 중 **168건(89%)** 을 차지하는 비판별 신호. 이걸 `DIRECT_PREDECESSOR` 축으로 쓰면 사실상 모든 링크가 직계전신으로 오표기.
- **어떻게(정답)**:
  - **트렁크** = `flow-graph.ts:154-159`의 SUCCESSION-only 필터를 **제거**하고 **전체 transition 엣지**로 최장경로 구성 → 실측상 이미 `게르마니아→…→서독` 완전 트렁크 산출. 단 **membership(구성국축)으로 들어온 엣지는 메인경로 후보에서 제외**(UNION 합류 오염 방지).
  - **구성국** = `membership.memberCountryId===h.id`(방향 필수, `widget:638-641`) **AND `isLeadingMember!==true`**(프로이센·독일 왕국은 국가핵이므로 전신으로 라우팅).
  - **고대조상·속주** = 트렁크 연결요소(getChains)에 닿지 않는 광역 정체(로마 3국은 A3 실측상 독일 트렁크와 무엣지 별도 컴포넌트).
  - **선행 크래시 방어**: `longestPathFrom`(`flow-graph.ts:169-178`)에 visited/재귀스택 가드 추가 — 폼이 만들 수 있는 SUCCESSION 순환에서 스택오버플로 크래시(L6-6). list 재사용 전 필수.

### R4 — 브리지 불변 + 스코프 격리 봉인 (P1, S)
- **무엇을**: 이 개선을 **"브리지 행 불변 + 파생 재분류·그룹·접기만"** 으로 규정. 로마류 고대조상도 **삭제 아닌 표시 게이트(접기)**.
- **왜**: 로마 링크는 현재 콘텐츠 0이라 삭제해도 파급 0이지만 이는 "구조적 무해"가 아니라 **"현시점 무해"**(향후 콘텐츠 태깅 시 롤업 끊김). 구성국 20건은 실콘텐츠 보유라 삭제 시 7개 도메인 집계 이탈. HRE의 DE/AT 이중계상·소련 15국 팬아웃은 **의도적 공유유산**.
- **어떻게**: (1) `buildCountryScopeOr`에 relationKind 인자 **절대 추가 금지** 주석 명기(`country-scope.util.ts` F14 주석 옆). (2) 파생 태그는 표시 DTO에만, `resolveLinkedHistoricalCountryIds` 경로 무변경. (3) 이미 있는 `country-scope.util.spec.ts`(타입무관 OR·id만 select 검증)에 불변식 명시 단언 강화. (4) **브리지 relationKind 컬럼 신설 비권장** — 쓰기가 delete-recreate(`historical-country.prisma.repository.ts:161-181`)라 폼이 값을 안 실으면 매 편집마다 소실(delete-recreate 시한폭탄).

### R5 — 커버리지 폴백 + 정본 수렴 (P2, M, additive)
- **무엇을**: 폴백 버킷 1급 설계 + 분류 정본 단일화 + 훅 타입 진실화.
- **왜**: 브리지 링크 보유 40개국 중 **6개는 타입신호 0**, membership 커버리지 편차 극심(독일 36/47 vs 프랑스 3/23·이탈리아 6/24·세르비아 1/13). 폴백 없으면 "독일은 예쁘게, 프랑스는 평면 덤프"로 롱테일 회귀.
- **어떻게**: (1) "빈 계보"와 "분류불가"를 구분, 폴백에서도 `compareByCountryStart`+세기 그룹으로 압축. (2) 분류를 **리포지토리 파생 linkKind additive DTO**(옵션A)로 올려 list·flow·인라인모달 3면이 동일 태그 소비 — 옵션B(프론트 셀렉터)는 인라인모달이 transitions/memberships 미조회라 추가 fetch 필요. build:nestia·SDK·web 래퍼 갱신 동반, **스코프 무변경**. (3) `use-historical-countries-by-modern-country.hook.ts:57-68`의 `as any` + 지어낸 `startDate/endDate` 타입 제거 → 실 DTO(`startEra/startYear/…`) 타입으로 진실화해야 linkKind가 컴파일타임 전파(소비 4곳 회귀 검증: use-historical-country-scope·elections·heads-of-state·register-monarch-modal, 실소비 필드=`startYear/endYear/enName`).

---

## 3. 배치 로드맵

### 배치 A — 즉효 (프론트 표시, 무마이그, 파급 0)
| 작업 | 근거 | 비고 |
|------|------|------|
| 제목 3면 정직화(dashboard/inline→중립, section은 이미 중립) | dashboard.widget.tsx:347, inline-modal:277 | 카피만 |
| LineageFlow 화살표 제거(거짓 계승) | lineage-flow.tsx:42-55 | 최소 수정 |
| 분절 카운트 칩("전신·구성국·유산") | widget:1105-1112, badge.tsx:18-27 | R3 규칙 선행 |
| list 3-버킷 접기 | widget:1120-1136,618-643 | era-story GROUP_TOP_N 복제 |
| 스코프 격리 봉인 주석/spec | country-scope.util.ts:74-94 + spec | 회귀 차단 |
| longestPathFrom visited 가드 | flow-graph.ts:169-178 | 크래시 방지 |
| 훅 타입 진실화(as any 제거) | use-...-by-modern-country.hook.ts:57-68 | 런타임 무변경 |

### 배치 B — 중기 (관계 타입화/큐레이션, 백엔드 additive)
- 리포지토리가 transition/membership 조인 → `linkKind`/`isMember` **additive** DTO(`country.prisma.repository.ts:66` 확장). **⚠️ 브리지 반환 행 집합 불변, resolveLinkedHistoricalCountryIds 무변경** = 리더보드·인물국적 스코프 파급 0. build:nestia·SDK·래퍼 연쇄.
- 정본 수렴: `country.historicalCountries` 임베드 필드에 linkKind 실어 3면 자동 상속.
- flow 모드 lazy화(`viewMode==='flow'`만 by-ids 3배치 fetch) — 현재 list 기본진입에 무거운 배치 3콜을 스탯/배지로만 소비(과다 페치).
- 커버리지 폴백 버킷 + 세기 그룹.
- 이미 존재하는 membership/transition CRUD(소속·구성 탭, historical-country-detail.widget)의 **발견성 개선**(레지스터 모달/전신 섹션 인접 배치) — "시드 전용"이 아니라 "도달 지점 부재"가 진짜 갭.
- god 위젯(2567줄) 파츠 분해 + glassOrSolidMixin/theme 토큰 치환(**표면→믹스인은 solid→글래스 시각변경이므로 별도 커밋**) + @media 도입(flow 최소폭 독일 ~15,210px 가로폭발 절단, 패딩 36/32→16).

### 배치 C — 데이터정리 (신중, 스코프 파급)
- **삭제 금지 원칙 유지.** 로마류는 표시 게이트만.
- 고아 역사국가 **12건**(테스트 픽스처 `검증용역사국가_F1` 제외) 감사 뷰 — 자동연결 금지·건별. 근인 2종 구분: **현대국가 미시딩**(NO/DK/SE/GR/AL → 후보 제안 불가·현대국가 선시딩 필요) vs **미연결**(JP/CN 존재 → 진짜 "연결 빠뜨림"). 단독 시드러너가 관계단계 건너뛴 것도 별개 고아화 경로.
- 68개국 transition/membership 커버리지 감사 — 분류 재설계의 선행조건.
- transition SUCCESSION 순환 서버 거부(create/update 역방향 검사, `repository:208-217`) — L6-6 근본책.
- transitionScope null 2건(신성로마제국→라인연방/프로이센왕국) 백필.

> **파급 요약**: 배치 A·B는 브리지·`resolveLinkedHistoricalCountryIds` 무변경 → 7도메인 스코프 합산 불변. 배치 C만 행을 건드리며, 이때 20개 콘텐츠 보유 링크·HRE 이중계상·소련 15국 팬아웃을 건별 검증해야 하는 고비용 경로.

---

## 4. 열린 결정사항 (사용자 판단 필요)

| 결정 | 선택지 | 검토 의견 |
|------|--------|-----------|
| **섹션의 정체성** | (A)"직계 전신선"으로 좁힘 vs (B)"이 땅을 거쳐간 정치체" 백과사전 | 한 리스트로 두 임무를 동시 만족시키려던 게 실패 근인(L6-5). **이름 붙여 분리** 권고: 전신=기본노출, 병존/조상=접힌 opt-in |
| **로마류 고대조상** | 링크 제거 vs 재분류(접기) | **접기** 권고 — 삭제는 현시점 무해일 뿐, 미래 콘텐츠 롤업 끊김 |
| **구성국 배치** | 별도 탭 vs 같은 섹션 접힌 그룹 | 접힌 그룹 권고(발견성 유지). 단 "이 국가의 모든 역사국가 한눈에" 의도면 재고 |
| **기본 뷰** | list(접힘형) vs flow | list 유지 권고 — flow는 47노드 가로 타임라인이라 기본 부적합, opt-in 탭으로 |
| **광역 정체 다중계상** | HRE DE/AT·소련 15국 유지 vs 축소 | 코드상 버그 아닌 의도적 공유유산 — 데이터 모델 정책 결정 |
| **분류 저장 방식** | 브리지 relationKind 컬럼 vs 파생(무저장) | **파생** 권고(옵션b) — 마이그 0·백필 0·스코프 파급 0. 컬럼 방식은 delete-recreate 시한폭탄 + 폼/리포 왕복 재설계(L)라 실비용 큼 |
| **정본 위치** | 리포지토리 파생(옵션A) vs 프론트 셀렉터(옵션B) | A 권고 — 인라인모달 추가 fetch 회피, 3면 자동 상속 |
| **토글 상태 저장** | 위젯 로컬 useState vs zustand persist vs URL | 로컬 useState로 시작 권고(persist는 과함). 토글 컴포넌트는 `SegmentControl`(shared/ui) — `SegmentedRadioGroup`(위젯내부)은 FSL 경계 위반 |

---

## 5. 반증되어 채택 안 한 것

- **"transition/membership 없음 → 고대조상 tier3" 규칙(L2-2)**: 자기모순으로 반증. 로마 제국(transitions=2)·로마 공화국·서로마·게르마니아 전부 transition을 **가진다** → 이 규칙상 오히려 tier1(직계)로 분류됨. '전이·소속 모두 없음' 조건을 실제 만족하는 독일 집합은 `{작센코부르크고타, 작센코부르크잘펠트}`(정당한 구성 소공국)뿐이고 정작 노이즈인 로마 3줄은 상단에 남는다. → **그래프 도달가능성(연결요소)으로만** 판정해야 함.
- **transitionScope=STATE_SUCCESSION을 직계전신 축으로(L5-2)**: 반증. STATE_SUCCESSION이 전체 168/189건(**89%**)을 덮어 비판별. 구성국 등급승격까지 전부 STATE_SUCCESSION이라 "트렁크에서 빠짐" 메커니즘 자체가 거짓. `eventType==='SUCCESSION'`도 마찬가지(구성국 승격사슬). → 정답은 **전체 transition 엣지 최장경로 − membership 엣지**(R3).
- **getMainPathAndBranchRows를 list "메인 전신선" 선택기로 재사용(L3-3)**: 반증. SUCCESSION-only 필터가 직계 트렁크를 이벤트타입 경계마다 ≤3노드로 파편화, 남는 길이3 후보 다수가 endYear 1918 동률이라 순회순서로 임의 결정(3/4가 구성국 사슬). → 재사용 금지, membership 노드 신호 프리미티브 사용.

---

**주요 파일 참조**: 리포지토리 `apps/api/src/libs/country/infrastructure/country.prisma.repository.ts:66-117` · 스코프유틸 `apps/api/src/libs/country/domain/country-scope.util.ts:52-56,74-94` · 브리지 스키마 `libs/db/prisma/historical.prisma:360-379` · flow그래프 `apps/web-admin/src/widgets/country/country-detail/model/linked-historical-flow-graph.ts:154-193,169-178` · list위젯 `apps/web-admin/src/widgets/country/country-detail/ui/linked-historical-countries-section.widget.tsx:591,618-643,1105-1136` · LineageFlow `dashboard-panels/lineage-flow.tsx:42-55` · 인라인모달 `country-inline-modal.tsx:173,277` · 훅 타입 `features/country/api/use-historical-countries-by-modern-country.hook.ts:57-68` · 시드 `apps/api/prisma/seeds/historicalCountry.germany.seed.ts:22,578-587`

> 수치 주의: 실측치가 시드값과 드리프트(브리지 269~288, 로마제국 11~13, membership 독일 36/47 노드 vs 40/41 엣지). 구현 시 카운트는 **쿼리/백필 시점 DB에서 재산출**, 하드코딩 금지.
