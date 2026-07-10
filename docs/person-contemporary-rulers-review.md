# 인물 상세 → 동시대 수장 바로보기 검토서

- 작성일: 2026-07-09
- 상태: 검토 완료 · **1단계 구현·커밋 완료**(2026-07-09 — §3 1단계 + 구현 후 적대 리뷰 8건 반영: 딥링크 세션화(transient 핀·URL range 미영속), url-sync suspend, isComplete 게이트(역사핀 삭제 사고 방지), settled 상태(스피너 5초 고착 해소), 미해석 핀 경고 토스트, 사망연도 미상 클램프, 헤더 행 wrap, 계약 스펙이 진짜 파서 실행; 유닛 34 + 훅 5 테스트)
- **2단계 구현 완료**(2026-07-10): `GET /persons/:id/contemporaries` — person-records식 수직 슬라이스(전용 컨트롤러·서비스, JWT 클래스 가드, signed-year 계약, 창 서버 유도(수장급 union + 사망 캡·미상 클램프), 2테이블 overlap + endDate=null 후처리(수장별 사망 캡), REIGN 우선 dedup(UTC 날짜 단위), 겹침 정렬 + limit/omittedCount, scope=sameCountry 브리지 확장) + 개요 탭 재임·재위 아래 「동시대 수장」 인라인 스트립(국가 그룹 칩, category-tokens는 entities 승격+위젯 shim, 1단계 CTA는 스트립 헤더로 이관). 구현 후 적대 리뷰 확정 7건 반영: ①effectiveEndYear 미래시작 클램프(음수 겹침·역전 창) ②dedup을 UTC 날짜 단위로(밀리초 정확 일치는 normalize-tenures의 24h 관용과 불일치) ③SQL 잔여필터 superset화(startDate gte 분기 — 종료<시작 오염 행 선탈락 방지) ④칩 role=listitem이 버튼 의미 박탈 → role=group+aria-label ⑤서양식 이름 순서(country.defaultNameDisplayOrder DTO 포함) ⑥인물(생몰) 수정 시 스트립 무효화(invalidatePersonCaches) ⑦**P2: 타계정 수장 칩 클릭 데드엔드 → isOwned DTO + 비소유 칩 비활성**(가계도 선례). api 21 + 스트립 lib 19 테스트, 라이브 e2e(창 유도·limit·scope·400·401·isOwned) 통과.
- 요구: 인물 상세에서 왕/대통령/황제 등 최고권력자를 볼 때, 수장비교로 수동 이동하지 않고 당대(같은 시기) 군주들을 바로 보고 싶다.
- 방법: 4방향 코드 조사(수장비교·인물상세·백엔드 API·공용 선례) → 설계안 3종(최소변경/한눈에 모달/서버계약 우선) → 안별 적대 검증(총 검증 체크 67건: CONFIRMED 67, REFUTED 5, UNVERIFIED 3).

## 1. 현황 진단 (검증된 코드 사실)

### 오늘의 경로가 왜 먼가
- 수장비교는 톱레벨 페이지 `/heads-of-state`(`pages/heads-of-state/heads-of-state.route.tsx:4-9`). 진입점은 헤더 메뉴·대시보드 버튼·**사건 상세의 "N년 동시대 수장 비교" 딥링크**(`pages/events/detail/components/detail-hero.tsx:253-267`)뿐이고, **인물 상세에는 진입점이 없다**. 인물 상세의 유일한 비교 CTA는 연보 탭 "다른 인물과 비교"(persons-timeline records)다(`person-detail-panel.tsx:2651-2661`).
- 인물 상세 → 당대 수장 확인까지 실제 동선: 헤더 메뉴 클릭 → (핀 보드 비었으면) CountrySearchModal에서 국가 검색·핀 → 시간축에서 연도 클릭 → ContemporaryPanel 오픈. 인물의 시대·국가가 전혀 프리시드되지 않아 **5+ 인터랙션**.

### 이미 갖춰진 것 (핵심 지렛대)
- **수장비교의 URL 계약은 완성돼 있다**: `?year`(음수 허용), `?range=START-END`(`-?\d{1,5}` regex), `?pins=C:<countryId>+H:<historicalCountryId>,…`, `?cat=` 전부 진입 시 파싱 + `replaceState` 양방향 미러링(`widgets/heads-of-state-timeline/model/use-heads-of-state-timeline-state.ts:44-98`, `use-url-sync.ts`). 즉 `/heads-of-state/?year=1435&pins=H:<조선id>`는 **목적지 코드 수정 0으로 이미 동작**한다.
- 인물 detail 응답에 재위 구간·국가가 이미 있다: `governmentPositions`(positionType/startDate/endDate/country/historicalCountry) + `sovereignReigns`(`person.prisma.repository.ts:~1579-1655`). 대표 연도·핀 세그먼트를 **클라이언트에서 백엔드 0으로 도출 가능**.
- `?year` + 핀 행 존재 시 ContemporaryPanel(수장 카드 + '그 해 한 일' + '이 해의 사건')이 자동 오픈(`heads-of-state-timeline.tsx:411`, 게이트 `highlightYear!=null && rows.length>0`).
- 공용 선례: CenturyStepper(`shared/ui/century-stepper`, 2개 지면 사용 중), `formatLifespan/formatSignedYear`(`shared/lib/lifespan-text.ts`), `GET /person-records/compare`(≤12명, signed fromYear inclusive/toYear exclusive, omittedCount 패턴).

### 갭 (없는 것)
- **by-year 수장 발견 API가 없다.** 수장비교는 `GET /government-positions/countries/:id/tenures` 계열(무가드·무페이지네이션·연도/카테고리 필터 없음)을 핀 국가마다 전량 받아 클라 필터링(`contemporary-panel.tsx:52-75`). `global/tenures`는 countryless(교황 등)만. `/person-records/compare`는 personIds 필수라 발견 불가(enrichment 전용).
- `?pins`는 **저장된 핀 보드가 비었을 때만 적용**되고 있으면 조용히 무시된다(`use-heads-of-state-timeline-state.ts:226-228`). 반대로 `?year`만 있는 링크는 핀 없는 신규 사용자에게 패널이 안 열린다(rows.length===0). → 딥링크 옵션은 이 게이트 수정이 필수.
- ContemporaryPanel·LeaderQuickView·normalize-tenures는 위젯 내부 비공개(index는 HeadsOfStateTimeline만 export) — 인물 상세에 임베드하려면 추출/재구현 필요.
- **BC 재위는 서버에 존재 불가**: GovernmentPositionTenure/SovereignReign에 era/signed-year 컬럼이 없고(`government.prisma`), tenure 등록 피커가 BC 입력을 막으며(`tenure-register-panel.tsx:663`), **tenure/reign era 마이그는 지연 배치에도 없다**(지연 배치는 연보 PersonLifeEvent era + 인덱스만 — `docs/person-record-convergence-era-compare-review.md`). 즉 카이사르·진시황의 동시대는 어떤 옵션으로도 지금은 불가 — 별도 마이그 항목으로 등재 필요.

## 2. 설계안 3종 비교

| | ① CTA 딥링크 (최소변경) | ② '한눈에' 글래스 모달 | ③ contemporaries API + 개요 스트립 |
|---|---|---|---|
| 핵심 | 재임·재위 섹션에 "동시대 수장 비교 →" CTA → `/heads-of-state/?year&range&pins` | 가문 모달 canon 복제, 모달 안 세기 스테퍼 + 국가별 수장 카드 + '그 해 한 일' | 서버가 발견을 답하는 첫 계약 `GET /persons/:id/contemporaries` + 재임·재위 밑 인라인 스트립 |
| 백엔드 | **0** (SDK 재생성도 불필요) | 신규 API 필요 | 신규 API 필요 (컨트롤러+DTO+서비스+repo+SDK regen) |
| 클릭 수 | 1 (페이지 이탈) | 1 (in-context) | **0** (개요 탭에 상시 노출) |
| 타국 수장 커버리지 | 사용자 핀 보드 의존(신규 사용자는 자국만) | 전 국가 (서버 쿼리) | 전 국가 (서버 쿼리) |
| effort | **S** | M | M |
| 검증 | feasible, 19/20 CONFIRMED, 치명 결함 0 | feasible, 29/33 CONFIRMED, 치명 결함 0 | feasible, 19/22 CONFIRMED, **치명 결함 4(§4)** |
| 한계 | modal-instead-of-navigation canon 역행·핀 보드 부수효과(localStorage 영구 기록) | 모달 상태 URL 공유 불가·god 컴포넌트 가중 | 표현력 낮음(탐색은 여전히 딥링크 원정) |

②와 ③은 같은 신규 API를 공유하고 지면만 다르다(모달 vs 스트립). 상충하지 않음 — 스트립이 발견, CTA/모달이 탐색 확장.

## 3. 권고: 2단계

### 1단계 — 지금 배치 (S, 프론트 전용): 옵션 ①
사건 상세 `ContemporaryHeadsLink`와 동일 문법의 CTA를 재임·재위 섹션 헤더에 추가하고, 이미 완성된 URL 계약으로 딥링크한다. 수장비교의 풀 UX(패널·그 해 한 일·이 해의 사건·LeaderQuickView)를 재구현 없이 전부 재사용.

터치포인트:
1. `shared/router.ts` — `pathKeys.headsOfState(year?, opts?)`로 확장: `?range`·`?pins` 조립. 위젯 내부에만 있던 C:/H: 핀 토큰 그램마(`rowsToPinsParam`)를 공유 팩토리로 승격.
2. 신규 `widgets/person/person-detail-panel/contemporary-heads-target.ts` — combinedTenures∪sovereignReigns에서 head-level만 취해 (a) 서명연도 변환, (b) 병합 스팬·대표연도(중앙값), (c) 국가 세그먼트 도출. 순수 함수 + spec.
3. `person-detail-panel.tsx` — 섹션 헤더(~1707)에 CTA, 파생 null이면 미노출. 모달 임베드 시 ↗ 표기.
4. `use-heads-of-state-timeline-state.ts:187-230` — `?pins` 게이트를 "보드 비면 replaceAll, 있으면 kind+countryId dedup 병합"으로 수정 (이 수정 없이는 기존 사용자에게 프리셋이 조용히 무시됨). 기존 공유 URL 의미가 걱정되면 대안: 별도 `?addPins=` 파라미터로 기존 `?pins` 동결.

### 2단계 — 본편 (M): `GET /persons/:id/contemporaries` + 개요 탭 인라인 스트립
"바로 보고싶다"의 완성형은 클릭 0회 노출. 서버 계약(옵션 ③) 위에 지면은 스트립부터, 스테퍼 탐색이 필요해지면 모달(옵션 ②)로 확장. CTA는 스트립 헤더로 이동.

API 계약(요지): JWT(PersonController 클래스 가드 상속 — 무가드 tenure GET 안티패턴 복제 금지), 대상 인물 owner-scoped·결과 글로벌 읽기, `fromYear/toYear`(signed, `^-?\d{1,6}$`, toYear exclusive — person-records/compare와 동일 관례, 생략 시 서버가 head-level 재임 구간에서 유도), `scope=all|sameCountry`, `excludeSelf`, `limit`(기본 100)+`meta.omittedCount`. 2테이블 union overlap(`startDate < toDateExclusive AND (endDate IS NULL OR endDate >= fromDate)`), positionType IN (HEAD_OF_STATE, HEAD_OF_GOVERNMENT) + SovereignReign 전량, same-person-same-start dedup(REIGN 우선 — normalize-tenures와 규칙 일치 문서화), **DTO는 첫날부터 signed year**(후일 era 마이그가 와도 계약 불변).

## 4. 구현 함정 체크리스트 (검증 단계에서 실측 확인된 것)

1. **`endDate=null` 이중 의미 (③의 치명 결함, ②에도 동일 적용)**: overlap 절은 null을 '재임 중'으로 읽지만 역사 인물의 null은 흔히 '미입력'. endDate 없는 조선 왕이 현대 대통령의 '동시대'로 등장한다. → 서버·파생 헬퍼 모두 **사망연도로 캡**: `min(now, deathYear)`. ①의 대표연도 중앙값도 동일(1418~2026 스팬 → 1722년 패널 오발).
2. **동명 `parseIsoDateParts` 함정**: `shared/lib/iso-date.ts:36`는 **signed** year, `person-detail-panel/helpers.ts:42-56`은 **unsigned year + era 분리**. 패널 안에서 잘못된 쌍둥이를 import하면 부호 소실. (사건 상세 `extractYear`는 BC-safe 확인 — 선행 검토들의 "부호 탈락 결함" 지적은 낡은 정보였음.)
3. **categorizePosition kind 케이스 함정**: combinedTenures는 lowercase `'tenure'|'reign'`(`person-detail-panel.tsx:592-594`), categorize는 `'SOVEREIGN_REIGN'`(`categorize.ts:45`) 비교, raw sovereignReigns에는 positionType 자체가 없음. 나이브 패스스루는 전원 오분류 — 어댑터 필수. (인물 상세에 categorizePosition 도입은 이번이 최초.)
4. **`?range`는 END<=START 거부**(`state.ts:69`) — 단년 재위는 패딩으로 END>START 보장.
5. **캐시**: 신규 `['person-contemporaries']` prefix를 `invalidateTenureQueries`에 등록(미등록 시 재임 편집 후 3분 stale 확정). ①은 신규 키 없음(목적지 키는 이미 중앙 헬퍼 등록됨).
6. **성능**: endDate 무인덱스 — 현 스케일 수용 가능하나 `(positionType, startDate)` 복합 인덱스는 additive 마이그로 열어둘 것. 창 유도 시 `findTenuresByPersonId`는 전 positionType 반환 — head-level 필터 없이는 장관·의원 경력이 창을 부풀림.
7. **BC**: 스키마·저작 경로 모두 막혀 있어 어떤 옵션도 BC 동시대 미지원. tenure/reign era 컬럼 마이그를 가계도 대기 마이그 배치에 **신규 등재** 필요(기존 배치에 없음 — 검증서가 "이미 계획됨" 주장 반박).
8. **12명 캡**: '그 해 한 일'(person-records/compare)은 ≤12 + own-account 연보 스코프 — omittedCount 캡션·스코프 캡션 패턴(contemporary-panel에 기구현) 답습.
9. **WIP 레이스**: person-detail-panel.tsx·router.ts·heads-of-state model·person.controller/service/repository 전부 feature/service-manager-v2에서 modified/untracked. 착수 전 선별 커밋(stage_hunks 선례) 또는 WIP 정리 선행.
10. **동일 라우트 재클릭 no-op**: 딥링크 파라미터는 마운트 1회 파싱(useMemo/useState initializer) — /heads-of-state 위에서 LeaderQuickView→인물 모달→CTA 클릭 시 무반응. v1은 허용 가능하나 인지할 것.

## 5. 미결정 사항 (제품 결정 필요)

- `?pins` 병합 시맨틱: 기존 보드에 append 병합 vs 별도 `?addPins=` 파라미터.
- 2단계 지면: 스트립(클릭 0, 개요 탭 무게 증가) vs 모달(클릭 1, 탐색력) — 본 검토 권고는 스트립 선행.
- 권한 체제: 대상 owner-scoped + 결과 글로벌 혼합은 신규 정책 — 방문자 방(public room) 재사용 시 cross-account read 게이트(싸이월드 패턴) 재설계 지점임을 명시적으로 결정하고 갈 것.
- 다중 재임 인물의 기본 창: v1은 head-level union 창 + `meta.derivedFromSubject`로 후속(재임별 선택 UI) 여지 확보.
