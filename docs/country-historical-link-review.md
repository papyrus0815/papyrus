# 국가(Country)↔역사국가(HistoricalCountry) 연결 설계·화면 UX 검토서

- 작성일: 2026-07-18
- 질문: "현대 국가와 과거(역사) 국가의 연결이 잘 설계되어 있고, 화면에서 적절하고 편하게 사용할 수 있는가"
- 방법: 멀티에이전트 리뷰(에이전트 56) — 인벤토리 5방향(스키마·API·웹저작·웹표시·실DB) → 리뷰 7렌즈(schema-design / time-bc / api-contracts / authoring-ux / reading-ux / cross-entity / data-reality) → 교차 중복 병합(원시 72건→42건) → **건별 적대적 검증**(반박 시도 후 판정) → 완전성 비평
- 판정: **CONFIRMED 34 · PARTIAL 8 · REFUTED 0** (PARTIAL은 사실이나 범위·심각도 정정 — 각 건에 정정문 병기)
- 실데이터 기준: historical_country 193행 · 브리지 243행 · person 역사 주국적 222명 · sovereign_reign 역사축 184행 · transition 158행 · membership 116행 (로컬 DB 재쿼리 검증)

## 1. 총평

**골격은 옳게 설계됐고 실데이터도 깨끗하게 안착했으나, "본체만 1급이고 그 주변은 2급"인 비대칭이 도처에 있다.**

- **잘된 것**: 현대/역사 분리 + N:M 브리지 구조 자체, 본체의 era+Y/M/D 구조화 시간축(BC 안전), entityKind/TransitionScope 2층 분류, Person 주국적 first-class 승격(모범 소비자 패턴), historical-country API의 소유권 모델, 역사국가 전용 14탭 상세 화면의 실존. 시드·저작 데이터 품질은 실측상 매우 깨끗함(브리지 중복 0·동명 0·era 채움 100%).
- **문제의 결**: ① 저작 표면이 "고를 수 있어 보이는데 저장이 안 되는" 함정을 2곳(행정부처·군부대) 노출하고, 역사국가 '역사' 서술 필드는 저장 자체가 무성 유실됨(P1 3건). ② 내비게이션이 "역사국가 전용 상세가 없다"는 **낡은 전제**로 우회·데드엔드 처리돼 있는데 실제로는 /country/:histId 상세가 완전 동작함. ③ XOR·브리지 합산·응답 판별 정보 같은 횡단 정책이 도메인마다 재발명돼 3~4갈래로 갈라짐. ④ 본체는 BC 안전한데 관계 테이블(membership/relation)은 순수 DATETIME이라 '역사국가 간 관계'가 BC를 못 담는 자기모순. ⑤ 인증·소유권 규약 미계승(조직 무인증 쓰기 등)이 이 데이터 그래프에도 그대로 남아 있음.

한 줄 결론: **연결 모델을 갈아엎을 필요는 없다. 배선 누락·정책 단일화·낡은 전제 제거가 과제의 8할이고, 마이그레이션이 필요한 건 브리지 unique/isPrimary와 관계 테이블 era 구조화 정도다.**

## 2. 강점 (유지할 설계)

- [schema-design] 브리지를 N:M 조인 테이블로 분리한 골격 자체는 올바르다 — 소련→15개국, 로마 제국→10개국 팬아웃이 실데이터로 작동 중(libs/db/prisma/historical.prisma:360-379, DB 243행·중복 0건)이고 양측 Cascade는 조인 행의 표준 정책이다.
- [schema-design/time-bc/api-contracts/authoring-ux] HistoricalCountry 본체의 시간축이 era+Y/M/D 완전 구조화 Int(historical.prisma:191-207)로 mariadb DATETIME 손상 제약을 정면 회피했고, DTO 검증(create-historical-country.dto.ts:66-134)·폼의 BC 부호 환산 시작<종료 교차 검증(historical-country-form.tsx:297-315)·create 모드 localStorage draft 자동저장(:498-509)까지 갖춰 BC 국가 저작이 본체 수준에서 완결. 실데이터 채움율도 start_era/start_year 193/193=100%로 설계가 실사용에 안착했다.
- [schema-design] entityKind(STATE/REGIME/PERIOD) + TransitionScope의 2층 분류가 '막부는 국가인가'류 난제를 스키마 레벨에서 흡수하며, HistoricalStateType 20종(ELECTORATE·MARGRAVIATE·SHOGUNATE·PERSONAL_UNION 포함)은 유럽·동아시아 정치체를 실제로 구분 가능한 도메인 충실도다.
- [schema-design/cross-entity/data-reality] Person.historicalCountryId first-class 승격이 모범 소비자 패턴을 확립 — 전용 인덱스·SetNull 대칭·응답에서 isHistorical/modernCountryId/차용 국기까지 해석해 주는 resolveCountryBlockForName(person.prisma.repository.ts:375-435), CITIZENSHIP priority=0 dual-write 미러(:1986-1996)는 DB 검증에서 FK 고아 0건·222명 전원 슬롯 보유·dual 182건 중 181건 브리지 정합으로 실데이터에서 성립함이 입증됐다.
- [schema-design] 듀얼 FK 모델들의 onDelete는 인상보다 정연 — 콘텐츠 엔티티는 SetNull/SetNull, 사건 관계 행은 Cascade/Cascade로 모델 내부 대칭이 일관(grep 전수 확인). 실질 비대칭은 AdministrationDepartment 1곳(+AdministrativeDivision 현대측 무관계)뿐이다.
- [time-bc] 서버 측 존속 시작일 정렬이 era-aware — 브리지 조회 정렬이 BC를 음수 환산하고 월·일 tie-break까지 처리(country.prisma.repository.ts:101-116).
- [time-bc/reading-ux] 과거국가 탭(관계 시각화의 본진)은 표시·타임라인 배치 모두 era를 정확히 다룸 — '기원전' 라벨(linked-historical-countries-section.widget.tsx:96-100)·부호 환산 좌표 배치(:713-719)·흐름도의 BC 음수 정규화(linked-historical-flow-graph.ts:23-45), 상세 개요 탭 formatPeriod/calculateDuration도 era-aware(historical-country-detail.widget.tsx:759-776).
- [time-bc] AdminDivisionScheme는 DATETIME 한계를 무성 손상 대신 명시 거부로 방어하는 이중 가드(프론트 BCE 사전 차단 + 백엔드 독립 거부, admin-division-scheme-modal.tsx:99-106·city.service.ts:331-344), BC-safe 파싱 유틸을 공용 lib에서 재사용하는 구조도 올바른 방향(가드 임계의 구멍은 F25 참조).
- [time-bc] 계승(transition) 시점을 별도 DATETIME 없이 후임 국가의 구조화 시작일에서 유도해 표시하는 설계(historical-country-transition.prisma.repository.ts:11-31) — 시간 정본을 한 곳에 두어 이중 기입 드리프트를 원천 차단했고, 연도 단독 경로는 BC 접두도 지원한다.
- [time-bc] 수장 비교 타임라인 옵션 빌드가 역사국가 lifespan을 부호 연도로 정규화(use-country-options.ts:25-28 eraYear, :89 formatRangeShort)해 BC 국가도 핀·범위 계산에 안전하게 실린다.
- [api-contracts] historical-country 도메인의 소유권 모델이 전 도메인 중 가장 정교하고 의도가 문서화됨 — 클래스 레벨 JWT, 관계 생성은 양단 소유(AND)·수정/삭제는 한쪽 소유(OR)로 비대칭을 주석으로 명시(historical-country.service.ts:242-252, :272-282 등), by-ids 일괄 조회 3종도 소유분 축소 패턴으로 통일.
- [api-contracts] P2003(FK 위반)의 전역 400 매핑 — GlobalExceptionFilter가 P2003→BAD_REQUEST + 'Invalid reference to related record'로 변환(global-exception.filter.ts:120-121)해 사전검증 없는 도메인에서도 무효 id가 500이 되지 않는다.
- [api-contracts/cross-entity] XOR 모범 구현이 코드베이스 안에 이미 존재 — Treaty의 validateSignatoryCountryXor 400(treaty.controller.ts:152-163)과 City의 resolveOwner '정확히 하나' 409 + 부모-자식·전신 행정구역 소속 축 일치 검증(city.service.ts:74-90, :207-208). 무정책 도메인으로 확산할 표준이 준비돼 있다.
- [api-contracts/cross-entity] 현대→역사 브리지 OR 확장 읽기 계약이 인물·재임·선거·정당에서 일관 동작(person.prisma.repository.ts:4515-4530, election.controller.ts:189-207, political-party.controller.ts:84-102) — 브리지를 실질 활용하는 좋은 소비자 경험(현재는 적용 도메인이 반쪽인 게 문제일 뿐).
- [authoring-ux] 재임·재위 패널의 국가 2필드 패턴이 수작업 맥락 힌트의 모범 — 현대 국가 선택 시 브리지로 역사국가를 좁히고 미선택 시 전체 직접 선택 폴백(tenure-register-panel.tsx:416-431), 역사 모달 첫 행 클리어 sentinel(sovereign-reign-register-panel.tsx:887-890), 목록 조회 성공 시에만 belongs 검사를 돌려 에러 시 연결 오파괴까지 막는 보존 가드(tenure-register-panel.tsx:604-613 — 단, sovereign 패널 미이식이 F18).
- [authoring-ux] CountrySearchModal은 열릴 때 현재값이 역사 목록에 있으면 역사 탭으로 자동 전환(country-search-modal.tsx:84-90) — 올바른 현재값 인식 패턴의 사내 전례가 이미 존재해 이식 비용이 낮다.
- [authoring-ux] 인물 등록 폼의 주국적은 상호배타 듀얼 상태가 정확히 배선(person-register-view.tsx:2570-2572)되고, 힌트 문구가 선택 상태 표시와 발견성 안내를 겸한다(:2319-2323).
- [authoring-ux/cross-entity] 사건 폼·저작의 축 분리 계약이 구조적으로 판별 가능 — 관련 국가 칩이 현대(flagEmoji)/역사(🏛️ 접두)를 시각 구분하고 축별 별도 메인(★) 지정 지원(basic-info-section.tsx:675-719), 현대/역사 관련국을 별도 배열로 받아 관계행도 한쪽만 채워 저장(event.service.ts:210-239), 목록 필터의 countryId 단일 파라미터가 양축을 OR로 수용(event.controller.ts:382-384).
- [authoring-ux] 브리지 편집이 역사국가 폼 단일 창구로 명확하고, 미연결 시 하류 결손(행정조직 뷰 누락)을 경고하는 AlertBox 제공(historical-country-form.tsx:1002-1007) — 다만 빈 배열 저장 불가(F10)가 이를 훼손.
- [reading-ux] 역사국가가 first-class 상세 화면을 이미 가짐 — /country/:id 단일 라우트가 raw 역사국가를 브리지 유무와 무관하게 resolve(use-content-core-data.hook.ts:100-104, country-detail-shell.tsx:94-97)하고 14탭 전용 UI로 분기하며, modern-only 탭 URL 진입 시 base URL 자동 정리 등 URL 위생도 처리됨(country-detail.widget.tsx:96-106).
- [reading-ux] 계승·소속·수평관계 표시 지면이 실재하고 CRUD까지 완비 — 역사국가 상세 3탭이 실제 API 기반 조회·등록·수정·삭제(historical-country-detail.widget.tsx:1975-1979, 2250-2280)이고, 현대국 '과거국가' 탭은 3종 관계를 목록|흐름도로 시각화하며 노드 클릭 내비까지 지원.
- [reading-ux] 검색·멘션 체계의 역사국가 커버리지 우수 — 멘션 타입 등록(mention-system.ts:137-145, name/enName 검색), 엔티티 링크 클라 폴백 포함(use-entity-link-search.ts:64), 커맨드 팔레트는 BC 표기 연도 범위·enName 서브타이틀·🏛️ 폴백 아이콘·타입 칩까지 갖춰 노출(command-palette.tsx:44-53, 226-233).
- [reading-ux] 목록 필터의 역사국가 포함이 대체로 잘 배선됨 — 사건 목록 클라 필터가 relatedHistoricalCountries까지 검사(useEventFilters.ts:130-133)하고 필터 모달이 역사 탭 제공, 조직 목록은 현대/역사 별도 필터 select, 인물 타임라인 URL 국가 해석도 현대+역사 겸용.
- [reading-ux] 국기 부재는 방치가 아니라 계층적 폴백 설계 — 공용 칩의 name-chip 규약 문서화·aria-label 종합 라벨(country-flags.tsx:5-6, :72-76), 역사 상세 헤더 thumbnailUrl 기반 CountryFlag, 목록 행 FaLandmark 앵커, 인물 배지는 서버가 연결 현대국 국기를 주입해 보완.
- [data-reality] 시드·저작 데이터 품질이 실측상 매우 깨끗함 — 브리지 중복 쌍 0건, 역사국가 동명 0건(현대와의 이름 충돌 0), entity_kind NULL 0건, start_era/start_year 채움 100%·era↔year 반쪽 채움 0건(전부 재쿼리 확인).
- [data-reality] 역사국가 관계 3종(계승·소속·수평)은 '만들어놓고 안 쓰는' 테이블이 아니라 활발히 사용 중 — transition 158행·membership 116행·relations 11행(재쿼리). 특히 계승 그래프는 193개 국가 대비 158개 엣지로 핵심 사용 기능.
- [data-reality] DATETIME 손상 위험값이 현재 0건 — membership/relations의 실제 날짜 최소값이 1002/1102년으로 위험대(연도<1000) 진입 데이터가 아직 없음. 위험은 전적으로 잠재적이며 지금 구조화 전환하면 백필 부담이 7+11행 수준으로 최소.

## 3. 발견 (42건, 심각도순)

> P1=데이터 유실·기능 불능·보안 / P2=계약 불일치·UX 막다른길·일관성 붕괴 / P3=마찰·비대칭·잠복 부채

## 3-1. P1 — 즉시 조치 (4건)

### F1 **[P1·CONFIRMED]** 역사국가 '역사(history)' 필드 3중 미배선 — 폼 입력이 무성 유실 (실데이터 193행 중 2행만 채움)

- **위치**: `apps/api/src/libs/historical-country/presentation/historical-country.controller.ts:267` · 렌즈: api-contracts, authoring-ux, data-reality
- **근거**: 폼은 8행·max 10,000자 '역사' textarea를 노출하고 payload에 담음(historical-country-form.tsx:1195-1210, :609 `history: data.history || null`). 그러나 컨트롤러 create(:267-290)·update(:369-389)가 서비스 전달 객체에 history를 누락하고, repo는 저장을 지원(historical-country.prisma.repository.ts:112, :211)하는데 컨트롤러가 끊어 도달 불가. 읽기도 toEntity가 history 미매핑(:235-259)이라 응답 `country.history ?? null`(:459)은 항상 null. 실데이터 재쿼리: SELECT SUM(history IS NOT NULL AND history<>'') FROM historical_country → 2/193 — 시드 직접 기입분만 존재, 폼 경유 저장 0건 실증. hydrate `raw?.history`가 항상 null(historical-country-form.tsx:537)이고 create draft는 성공 시 clear(:643)라 복구 수단도 없음.
- **영향**: 사용자가 마크다운 장문의 역사 서술을 입력·저장하면 성공 응답이 오지만 DB에 기록되지 않고, 재편집 진입 시 빈 칸으로 돌아옴 — 긴 서술일수록 피해가 큰 무성 데이터 유실. 시드로 넣은 2행의 history조차 API로는 영원히 읽을 수 없음.
- **권고**: 컨트롤러 create/update 전달 객체에 history 1줄씩 추가 + toEntity에 `history: data.history ?? null` 매핑 추가(3곳 각 1줄, 무마이그). 저장→재조회 라운드트립 테스트로 회귀 방지. 수정 전까지는 폼에서 필드를 숨기거나 '저장 안 됨' 경고 필요.

### F2 **[P1·CONFIRMED]** 행정부처 역사국가 등록 3층 단절 — 스키마·폼은 준비됐는데 API DTO가 countryId 단일이라 역사 탭 선택 시 저장 100% 실패

- **위치**: `apps/api/src/libs/administration-department/presentation/administration-department.controller.ts:54` · 렌즈: api-contracts, authoring-ux, cross-entity, data-reality
- **근거**: 스키마는 역사 부처를 명시 의도(libs/db/prisma/country.prisma:466 주석 "역사적 국가 부처(예: 조선 6조)는 historicalCountryId 설정", :474-475 컬럼 존재). 그러나 CreateAdministrationDepartmentDto는 `countryId: string` 필수 단일이고 historicalCountryId 필드 자체가 없음(administration-department.controller.ts:54-64, 파일 전체 historicalCountryId 0회, 응답 DTO :39에도 없음). 폼은 역사 목록을 로드해 CountrySelectModal 역사 탭을 노출(administration-department-form.page.tsx:244-249, :1307-1308)하면서 onSelect가 isHistorical을 버리고 역사국가 PK를 countryId에 저장(:1299-1304), 제출도 :465-470 단일 전송 → AdministrationDepartment.countryId는 Country FK(country.prisma:502)라 P2003 → 전역 필터 400 "Invalid reference". DB 확인: administration_department 0행 — 기능이 한 번도 성립한 적 없음. 목록 페이지 국가 필터도 동일 모달로 역사 탭을 보여주지만 countryId 매칭이라 결과 항상 공집합.
- **영향**: '조선 6조' 같은 역사 부처 등록 시 폼이 정상 진행되다가 저장에서 의미 불명의 400으로 항상 실패. 설계된 기능이 UI 유도 → 저장 불가라는 최악의 조합으로 완전 불능 상태이며, 사용도 0행으로 기능 사장이 실증됨.
- **권고**: Create/Update DTO에 historicalCountryId 추가(듀얼 옵셔널 + City식 XOR '정확히 하나' 검증), create/update 핸들러 배선, 폼 onSelect에서 isHistorical 분기 저장(person-register-view.tsx:2570-2571 기존 패턴 재사용), 목록 필터(:242-246)도 historicalCountryId 축 추가. 단기 차단이 필요하면 폼의 역사 탭을 숨겨 실패 경로 제거.

### F3 **[P1·CONFIRMED]** 군부대 폼: MilitaryUnit에 historicalCountryId 컬럼 자체가 없는데 역사 국가 탭을 노출 — 선택 시 FK 위반 400 확정

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/military-unit-form.modal.tsx:1218` · 렌즈: authoring-ux, cross-entity
- **근거**: military-unit-form.modal.tsx:1203-1226에서 CountrySelectModal에 historicalCountries를 주입(:1225)해 역사 탭을 노출하면서 onSelect는 `setCountryId(country.id)`(:1218)로 isHistorical 폐기, 저장은 :531 `countryId: countryId || null`. MilitaryUnit 스키마는 countryId(Country FK, SetNull)만 있고 historicalCountryId 컬럼 부재(libs/db/prisma/military.prisma:728, :770 — grep 전수 0히트). 역사 PK가 Country FK로 전송되면 P2003 → 400.
- **영향**: 로마 군단·조선군 같은 역사 군대를 등록하려는 사용자는 탭까지 제공받고 저장에서 원인 불명 400. 행정부처(F2)와 동류 패턴이지만 이쪽은 스키마부터 부재라 '고를 수 있어 보이는데 절대 안 되는' 함정 UI — 공용 피커가 isHistorical을 반환하는데 호출부가 버리는 구조적 실수의 두 번째 표면.
- **권고**: 단기: 이 모달에 historicalCountries=[] 전달(또는 modernOnly 피커로 교체)해 함정 제거(1줄). 장기: 역사 군대 지원 여부는 도메인 결정(마이그레이션 대기열과 함께). 역사 미지원 호출부는 historicalCountries 주입 금지를 규약화.

### F4 **[P1·CONFIRMED]** 소비 도메인 인증·소유권 붕괴 — Organization 무인증 쓰기, Dynasty 무가드, Election은 accountId를 클라 body에서 수신

- **위치**: `apps/api/src/libs/organization/presentation/organization.controller.ts:95` · 렌즈: api-contracts
- **근거**: OrganizationController는 클래스·라우트 어디에도 가드가 없음(organization.controller.ts:94-96에 @Controller만, POST :133·PUT :156 무가드 — AuthGuard grep 0히트). DynastyController도 동일(dynasty.controller.ts:56-57). Election은 클래스 JWT는 있으나(election.controller.ts:174) create가 `accountId: body.accountId ?? undefined`로 클라이언트 제공 값을 그대로 저장(:647)하고 PATCH/DELETE는 소유 게이트 없이 id만으로 수행(:704-710, :712-715). 대조적으로 historical-country는 클래스 JWT(historical-country.controller.ts:42)+전 라우트 403 소유 게이트(historical-country.service.ts:155-160 등).
- **영향**: 같은 국가 데이터 그래프에서 국가 본체는 본인 것만 만지게 하면서, 그 국가에 딸린 조직은 비로그인으로도 생성·수정·삭제 가능하고 선거는 타 계정 소유로 위장 등록 가능 — 계정 경계 데이터 오염·훼손 경로. 기존 리뷰들(서브리소스 소유권 22엔드포인트 P1)과 동일 뿌리인 '소유권 규약 미계승'.
- **권고**: Organization·Dynasty에 클래스 AuthGuard 부여, Election create의 accountId는 req.user에서 도출하고 update/delete에 소유 검증 추가. 도메인 신설 시 historical-country의 가드 패턴을 기본 템플릿으로.

## 3-2. P2 — 계약·UX 구조 결함 (22건)

### F5 **[P2·CONFIRMED]** Membership·Relation 날짜가 era 구조화 없는 순수 DATETIME — BC·고대 표현 불가 + 연도<100 mariadb 무성 손상 + null 클리어 불가

- **위치**: `libs/db/prisma/historical.prisma:343` · 렌즈: schema-design, time-bc, api-contracts, data-reality
- **근거**: 본체는 startEra/startYear/startMonth/startDay 완전 구조화(historical.prisma:190-207)인데 HistoricalCountryMembership.membershipStartDate/EndDate는 `DateTime?`(:343-345), HistoricalCountryRelation.startDate/endDate도 `DateTime?`(:395-397)로 era 필드 전무. API 입력도 @IsDateString(membership.dto.ts:18-24, relation.dto.ts:14-20) → 컨트롤러가 native new Date()로 저장(historical-country.controller.ts:209-210, :228-229, :325-326, :344-345). update는 `dto.membershipStartDate ? new Date(...) : undefined`(:325-326)라 null을 보내도 undefined로 바뀌어 한 번 넣은 날짜를 지울 수 없음. DB 실측: 현재 위험대(연도<1000) 값 0건(최소 1002/1102)이나, historical_country에 start가 AD1000 미만이거나 BC인 국가 37개(19%) 실존 — 로마 왕국(BC753)·로마 공화국(BC509)·로마 제국(BC27, 브리지 팬아웃 10)·프랑크 왕국(481-843) 등. mariadb 어댑터의 연도<100 DATETIME 손상(44→2044)은 배우자 혼인일 작업에서 실증된 하드 제약. membership 날짜 채움은 7/116(6%)에 불과.
- **영향**: 로마 공화국–카르타고 전쟁(BC) 같은 관계는 기간 저장 자체가 불가하고, AD 1~99 연도는 입력 순간 에러 없이 20xx로 둔갑 저장(무성 데이터 손상) — '역사적 국가 간 관계'라는 테이블의 존재 이유와 정면 충돌하며, 역사 도메인 내부에서 본체만 안전하고 관계는 뚫린 자기모순. 날짜 클리어 불가는 행 삭제 후 재생성 외 수단이 없는 편집 막다른길.
- **권고**: 본체·DynastyRule과 동일한 era+Y/M/D 구조화 Int 컬럼을 additive로 추가하고 DATETIME은 AD1000+ 레거시 표시용으로 강등(행 127건뿐이라 백필 비용 최소 — 채움률 낮은 지금이 전환 최적 시점). 단기적으로는 서버에서 BC·연도<1000 명시 거부 + update의 null→클리어 시맨틱 수정.

### F6 **[P2·CONFIRMED]** 소속·관계 날짜 필드가 웹 UI에 완전 미배선 — 저작 폼에 입력란 없고 목록에도 표시 없음 (시간축 사장)

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/historical-country-detail.widget.tsx:2290` · 렌즈: time-bc
- **근거**: MembershipSection 추가 폼 state는 asParent/otherCountryId/role/isLeadingMember뿐(historical-country-detail.widget.tsx:2236-2241)이고 create payload에도 날짜 없음(:2288-2296), 수정 폼도 role/isLeadingMember만(:2303-2312). RelationSection도 create payload에 relationType뿐(:2487-2494). 목록 렌더도 이름+역할 칩만으로 날짜 미표시(membership :2339-2359, relation :2521-2532). 전수 grep: membershipStartDate는 shared/api/historical-countries.ts:244-265 타입 선언에만 존재, 소비 컴포넌트 0곳.
- **영향**: 스키마·API(DTO·컨트롤러 완비)에 있는 관계 기간 축이 UI에서 저작도 표시도 불가능한 죽은 계약. DB에 시드로 존재하는 membership 시작일 7건은 어느 화면에서도 안 보임. '언제부터 언제까지 소속이었나'가 본질인 도메인이 무시간 스냅샷으로만 동작.
- **권고**: F5의 era 구조화 마이그레이션과 한 배치로: 소속·관계 폼에 시작/종료 파츠 입력(era+연/월/일, SpouseFormRow의 partial-date-string 공용 패턴 재사용) 추가 + 목록 행 기간 칩 표시. DATETIME인 채로 날짜 입력만 먼저 배선하면 BC 불가·손상 위험을 UI로 노출하게 되므로 순서 주의.

### F7 **[P2·CONFIRMED]** BC era-blind 표시·정렬이 목록·피커·계보 흐름 전반에 만연 — 로마 계보 역순 화살표·'509 - 27' AD 오독이 실데이터 4건에서 즉시 재현

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/dashboard-panels/lineage-flow.tsx:40` · 렌즈: time-bc, authoring-ux, reading-ux, data-reality
- **근거**: ① LineageFlow: getYears가 startEra를 아예 안 읽고(lineage-flow.tsx:21-30) startYearForSort=start??0(:40)에 오름차순 정렬(:57), 라벨 `${start}–${end}` raw(:34-35) — DB 실측 BC 국가 4건(로마 왕국 BC753–BC509·로마 공화국 BC509–BC27·로마 제국 BC27–AD395·게르마니아 BC100–AD500)에서 정렬 결과가 로마 제국(27)→게르마니아(100)→로마 공화국(509)→로마 왕국(753) — 실제 시간순의 정반대로 화살표가 그려짐. ② CountrySelectModal '시작년도' 정렬 `ha.startYear ?? -1` raw(country-select-modal.tsx:132-135), 카드 `{startYear} - {endYear}` raw + endYear 부재 시 ' - 현재' 폴백 + stateType raw enum 노출(:1217-1225). ③ CountrySearchModal 기간 칩 raw(country-search-modal.tsx:265-270). ④ 국가 목록 행 `{startYear}–{endYear}`(country-list-row.tsx:144-148 — UnifiedCountry에 startEra 존재하는데 안 씀). 대조: 같은 위젯군 linked-historical-flow-graph.ts:23-45는 BC 음수 정규화를 이미 구현, 개요 탭 formatPeriod도 '기원전' 처리(historical-country-detail.widget.tsx:759-767), 서버 정렬도 부호 환산(country.prisma.repository.ts:101-116).
- **영향**: 이탈리아 등 로마 계열 연결 현대국 대시보드의 '계승 계보 흐름'이 역순 화살표로 표시되고, 목록·피커·검색 어디서든 BC 국가가 AD 하강 연대로 오독되며 종료 미상 고대 국가는 '현재'로 표시돼 선택 오판 소지. 상세에 들어가야만 기원전임을 아는 표기 이원화 — 저작 진입 피커가 전부 이 표면이라 고대 인물 저작 흐름에서 반복 노출되는 시각적 오정보.
- **권고**: linked-historical-flow-graph.ts의 getCountryYearRange(BC 음수 정규화)와 formatPeriod의 '기원전' 라벨을 공용 포맷터·비교기로 추출(use-country-options.ts의 eraYear/formatRangeShort가 사실상 그 구현)해 LineageFlow·피커 3종·목록 행에 일괄 적용. startYearForSort의 폴백 0도 BC와 충돌하므로 교체, endYear null은 '미상', stateType은 폼 라벨 맵 재사용.

### F8 **[P2·CONFIRMED]** 듀얼 FK XOR 정책 3계층 분열 — DB CHECK 전무, 스키마 주석끼리 모순, 도메인별 400/409/침묵 저장 갈림 (sovereign_reign 이중 기입 12행 실존)

- **위치**: `libs/db/prisma/country.prisma:204` · 렌즈: schema-design, api-contracts, cross-entity, data-reality
- **근거**: 마이그레이션 163개 전체 grep에서 CHECK 제약 0건. 정책이 주석 레벨에서도 3갈래 모순: country.prisma:204 "둘 중 하나만 설정", :471 "역사적 국가 부처도 연결된 현대 국가를 넣을 수 있음"(dual 장려), person.prisma:259-260 "상호배타는 도출 우선순위(역사>현대)로 해소". 강제형: city.service.ts:74-87 resolveOwner '정확히 하나' 아니면 409, treaty.controller.ts:152-163 동시 지정 400. 무정책형: Organization(organization.controller.ts:150-151)·Election(election.controller.ts:641-642)·Glossary(glossary.controller.ts:143-144)·Law(law.controller.ts:46-47)는 둘 다 그대로 기록. Tenure는 둘 다 유효하면 둘 다 저장(person.prisma.repository.ts:2484-2505 — :2499 조건상 cid 유효+hid 유효면 양쪽 기록). DB 실측: person 182/392 dual 중 181건 브리지 정합(의도된 미러), sovereign_reign 187행 중 12행 양축 동시 기입(전부 브리지 정합인 레거시, 어느 규약에도 미소속), 둘 다 NULL 재위 2행.
- **영향**: 같은 '둘 다 채워진 행'이 person에선 정본, sovereign_reign에선 레거시 오염, scheme에선 규약 위반 — 테이블만 보고 의미 판별 불가. 같은 소속 입력이 도메인마다 409/400/침묵 저장으로 갈려 프론트·시드 작성자가 도메인별 규칙을 외워야 하고, 이중 기입 12행은 브리지 확장 OR 집계에서 이중 매칭 위험. 신규 도메인 작성자가 따를 단일 규범이 없어 갈래가 계속 늘어나는 구조.
- **권고**: 의미론을 하나로 결정(권장: person 방식 '역사 FK + 브리지 유도 현대 그림자'를 공인 규약으로 승격 또는 Treaty식 400 XOR 공용 유틸 추출)하고 스키마 주석 3곳 통일, 무정책 4개 도메인(Organization·Election·Glossary·Law)에 우선 적용. sovereign_reign 12행은 브리지 정합 확인 후 역사 단독으로 정리하는 백필 후보, 둘 다 NULL 2행은 데이터 점검. DB CHECK는 dual-write 규약과 충돌하므로 도입하지 않는 것이 정합적.

### F9 **[P2·CONFIRMED]** Tenure/Reign의 무효 국가 id 무성 드롭 — 오타가 '국가 없는 재임'으로 성공 저장됨

- **위치**: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:2484` · 렌즈: api-contracts, cross-entity
- **근거**: resolveTenureCountryFields는 countryId가 country·historicalCountry 두 테이블 모두 미히트면 에러 없이 결과에서 필드를 누락시키고(person.prisma.repository.ts:2484-2506), create는 null이 아닐 때만 스프레드(:2524-2527) — 무효 id 전송 시 국가 FK 없이 재임이 생성되고 200 응답. 타 도메인은 P2003→전역 필터 400 'Invalid reference'(global-exception.filter.ts:120-121, :135-136)로 실패가 최소한 드러남.
- **영향**: 삭제된 국가 id나 클라 버그로 잘못된 id가 오면 사용자는 성공으로 인지하지만 재임이 어느 국가 수반 목록에도 안 잡힘 — 발견이 어려운 데이터 품질 저하. 유일하게 사전검증을 하는 도메인이 유일하게 실패를 숨기는 역설.
- **권고**: 두 테이블 모두 미히트면 BadRequest('국가를 찾을 수 없습니다')로 명시 거부. 레거시 이관(역사 id가 countryId로 온 경우)만 무성 교정 유지.

### F10 **[P2·CONFIRMED]** 현대국가 브리지 편집 계약 공백 — 전량 재작성 단일 창구인데 폼이 빈 배열을 영원히 안 보내 '전체 해제' 불가, unique 제약·중복 방어도 전무

- **위치**: `apps/api/src/libs/historical-country/infrastructure/historical-country.prisma.repository.ts:160` · 렌즈: schema-design, api-contracts, authoring-ux
- **근거**: 브리지 개별 add/remove 엔드포인트가 없고 PUT /historical-countries/:id의 parentModernCountryIds로만 deleteMany→createMany 전량 재작성(repo :160-179). 계약상 undefined=무변경·[]=전체 해제인데, 유일 클라이언트인 역사국가 폼은 `selectedModernCountries.length > 0`일 때만 필드 포함(historical-country-form.tsx:631-633, 후임 배열도 :635-639 동일) — UI는 SelectionChips로 마지막 칩까지 제거 가능하고 0개 경고까지 보여주면서(:988-1007) 빈 배열이 영원히 전송되지 않음. 또 브리지 테이블은 비유니크 인덱스뿐(libs/db/prisma/historical.prisma:377 `@@index`, DB 실측 NON_UNIQUE=1, @@unique 없음)이고 createMany에 skipDuplicates 미사용(:172-177), 배열 내 중복·실존 id 검증도 없음. 현재 중복 쌍 0건(243행 전수 GROUP BY)은 요행.
- **영향**: 잘못 연결된 현대 국가를 모두 떼어내고 저장해도 서버에 그대로 남고 재진입 시 칩이 되살아나는 '지웠는데 안 지워지는' 무성 실패 — 잘못된 브리지(인물 국기·행정조직 뷰·tenure 좁히기의 하류 데이터)를 UI로 교정할 방법이 없음. 중복 쌍이 생기면 브리지를 include하는 모든 지면(과거국가 탭 카드·popover·인물 국기 주입)에 같은 국가가 2번 노출되며, 병렬 세션 저작이 일상인 이 리포에서 delete-recreate 창이 실제로 열림.
- **권고**: additive 마이그레이션으로 @@unique([historicalCountryId, modernCountryId]) 추가(현재 중복 0건이라 무손실) + createMany skipDuplicates: true. 폼은 수정 모드에서 길이와 무관하게 빈 배열 포함 항상 전송(서버는 이미 [] 전량 삭제 지원 — 폼 2줄 수정). 또는 브리지 전용 POST/DELETE 서브리소스 신설.

### F11 **[P2·CONFIRMED]** 국가 폼 update의 transitions delete-recreate가 계승 탭에서 행별 저작한 eventType·scope를 단일 대표값으로 평탄화

- **위치**: `apps/api/src/libs/historical-country/infrastructure/historical-country.prisma.repository.ts:183` · 렌즈: api-contracts, authoring-ux
- **근거**: update에서 parentHistoricalCountryIds !== undefined면 predecessor=자신인 transition 전량 deleteMany 후(repo :183-186) 단일 data.transitionEventType으로 일괄 재생성(:187-201). 폼은 상세 응답의 대표값(findFirst 1건 — :94-103 findTransitionEventTypeByPredecessorId)으로 hydrate(historical-country-form.tsx:555)하고 후임이 1개라도 있으면 항상 이 배열+단일 유형을 전송(:635-639). 반면 계승 탭은 transition 행별로 eventType을 개별 저작하는 별도 API 사용(historical-country-detail.widget.tsx:1969-2010).
- **영향**: 계승 탭에서 '후임 A=SUCCESSION, 후임 B=DIVISION'으로 행별 저작해 둔 국가를 폼에서 이름 오타 하나 고쳐 저장하면 두 행이 모두 삭제되고 대표값(findFirst — 임의) 하나로 재생성돼 나머지 행의 유형이 조용히 덮이며 id도 재발급됨. transitionScope도 폼 값으로 일괄 대체. 두 저작 지면(폼 vs 계승 탭)이 서로의 결과물을 파괴하는 전형적 delete-recreate 시한폭탄(기업 상세 백로그와 동일 계열).
- **권고**: update를 diff 기반(추가/삭제분만)으로 전환하거나 폼 경로에서는 successor '집합'만 관리하고 기존 행의 eventType/scope 보존. 폼 쪽은 후임 목록이 실제 변경된 경우에만 전송(dirty 비교). 최소한 '저장 시 계승 관계가 일괄 재작성됩니다' 경고.

### F12 **[P2·PARTIAL]** 단건 transition API가 광고한 transitionScope를 서비스 계층에서 무성 드롭 — 실데이터 scope NULL 2행으로 흔적 확인

- **위치**: `apps/api/src/libs/historical-country/application/historical-country.service.ts:253` · 렌즈: api-contracts, data-reality
- **근거**: POST /historical-countries/transitions는 DTO·컨트롤러가 transitionScope를 받고 전달(historical-country.controller.ts:247)하며 repo create도 지원(historical-country-transition.prisma.repository.ts:107-114)하지만, service.createTransition이 3필드만 넘겨 scope 유실(historical-country.service.ts:253-257), updateTransition도 eventType만 전달(:283-285). SDK 타입에는 노출됨(shared/api/historical-countries.ts:144-150). 국가 폼 경로(parentHistoricalCountryIds)는 정상 저장이라 두 경로 결과가 다름. 재쿼리: historical_country_transition 158행 중 transition_scope NULL 2행 — 단건 경로 결손과 정합하는 분포.
- **영향**: 계약상 받는다고 선언한 필드가 조용히 무시됨 — SDK로 STATE_SUCCESSION/REGIME_CHANGE를 지정해도 null 저장, 계승 흐름도의 scope 라벨이 누락됨. 상세 위젯에서 단건 등록·수정을 쓸수록 scope 없는 행이 누적되며, 계승 탭에 scope UI를 붙이는 순간 실결함으로 승격.
- **권고**: service create/update에 transitionScope 통과 2줄 추가 + 기존 NULL 2행 수동 보정. 계승 탭 폼에도 scope 셀렉트를 배선해 국가 폼 경로와 커버리지 일치.
- **검증자 정정(PARTIAL 사유)**: 핵심 결함(서비스 create/update의 transitionScope 무성 드롭, service.ts:253-257·283-285)은 실재하며 수정 권고(통과 2줄)도 타당하다. 단, (1) 증거 정정: 실데이터 NULL 2행은 단건 transition 경로의 흔적이 아니라 국가 폼 create/update 경로의 createMany 배치 산물(동일 ms 타임스탬프·공유 eventType·같은 predecessor가 결정적 증거; 이후 2026-05-11 HRE dedupe로 predecessor 재지정)이므로 "단건 경로 결손과 정합하는 분포" 근거는 삭제해야 한다. NULL은 설계상 '미구분' 합법 상태라 분포 자체가 결함 증거가 될 수 없다. (2) 영향 정정: 현재 이 엔드포인트로 transitionScope를 보내는 호출자가 코드베이스에 전무(위젯 폼은 scope 미수집, update는 호출자 0)하므로 실제 데이터 유실은 현재 0건 — 잠복 계약 결함(latent contract defect)으로 서술해야 정확하다. (3) "NULL 2행 수동 보정"은 버그 복구가 아니라 데이터 큐레이션 사항(시드 의도상 STATE_SUCCESSION이 맞긴 함). 심각도는 P2 유지 가능하나 근거는 '광고 필드 무시 계약 위반 + 향후 scope UI 배선 시 즉시 실결함화'로 한정하는 것이 옳다.

### F13 **[P2·PARTIAL]** 역사국가 판별 정보(isHistorical/이름 블록)가 person 응답에만 존재 — Organization·Glossary·Election 등은 naked FK라 프론트가 별도 조회 없이 판별 불가

- **위치**: `apps/api/src/libs/organization/presentation/dto/organization.response.ts:17` · 렌즈: api-contracts, cross-entity
- **근거**: person은 country 블록에 isHistorical·modernCountryId·연결 현대국 flag 주입까지 제공(person.prisma.repository.ts:375-418, 주석 :371-373이 프론트 라우팅 용도 명시). 반면 Organization 응답은 `countryId/historicalCountryId` 생 FK 2개뿐(organization.response.ts:17-18), Glossary 동일(glossary.controller.ts:32-33, :70-71), Election/Party는 raw row 반환(election.controller.ts:649-651). 프론트는 id→이름을 전체 목록 lookup으로 때움(organizations-list.page.tsx:590-594, 비링크 텍스트).
- **영향**: 프론트가 id의 소속(현대/역사)과 표시명을 알려면 전체 역사국가 목록을 별도 페치해 클라 조인해야 함 — 목록 화면마다 여분 fetch·불일치 위험, 역사국가 내비 데드엔드의 원인 축. 기업↔Organization 정본 통합으로 이 응답이 기업까지 대변하게 된 만큼 계약 부채 확대.
- **권고**: 최소 계약으로 `country: {id, name, isHistorical} | null` 요약 블록(person 블록의 축소판)을 Organization·Glossary·Election·Party·Law 응답에 추가. 완전 통일이 부담이면 Organization부터.
- **검증자 정정(PARTIAL 사유)**: Election은 상세(GET :id)·생성(POST)·수정(PATCH)이 electionInclude(election.controller.ts:27-29)로 country/historicalCountry {id,name} 이름 블록을 이미 반환하므로 증거 인용(:649-651="raw row")은 오류 — 이름 블록 공백은 Election 목록(:233-241)과 Party 목록(political-party.controller.ts:107-111)에 한정됨. Company는 자체 CompanyResponseDto(company.response.ts:49-53)에 country/historicalCountry {id,name} 요약을 이미 보유해 "기업까지 계약 부채 확대" 주장은 성립하지 않음. 또한 듀얼 FK 패턴상 isHistorical 여부 자체는 어느 FK가 채워졌는지로 별도 조회 없이 판별 가능 — 실제 공백은 이름·modernCountryId(역사국가 라우팅 타깃)·flag임. 유효 범위는 Organization(전 엔드포인트)·Glossary·Election/Party 목록이며 P2 심각도와 권고(최소 요약 블록 추가, Organization 우선)는 그 범위 안에서 타당. 참고로 electionInclude의 {id,name} select가 권고안의 기존 사내 전례로 재사용 가능.

### F14 **[P2·CONFIRMED]** 브리지 OR 확장이 도메인별 복붙·비대칭 — 같은 현대국가 대시보드에서 인물·선거·정당은 역사국가 합산, 사건·법령·용어·조직만 미합산 (사건 48건 불가시)

- **위치**: `apps/api/src/libs/event/presentation/event.controller.ts:382` · 렌즈: api-contracts, cross-entity
- **근거**: 인물: findPersonsWithTenureInCountry가 브리지 연결 역사국가를 OR 확장(person.prisma.repository.ts:4515-4530). 선거: election.controller.ts:189-207, 정당: political-party.controller.ts:84-102 동일(코드 복붙 동형, person repo에도 3곳 반복). 반면 사건 목록/카운트의 countryId 필터는 브리지 조회 없음(event.controller.ts:381-395), law(law.controller.ts:72-74)·glossary(glossary.controller.ts:101-102)·organization(organization.controller.ts:105-108)은 단순 일치만. 대시보드가 이 셋을 한 화면에서 소비: personCount=getPersonsByTenureCountry(use-country-dashboard-stats.ts:188), eventCount=getAllEvents({countryId})(:202, :293), elections=getElections(:232). DB 실측: 브리지 연결 역사국가가 태그된 사건 48건이 현대국가 사건 탭·카운트에서 불가시. glossary_term 8행 전부 스코프 NULL·law 0행이라 그쪽은 현재 잠복.
- **영향**: 대한민국 대시보드에서 조선 왕은 인물 수에 포함되고 조선 선거·정당도 잡히지만 임진왜란류 사건 48건은 사건 수·연대표에서 빠짐 — 같은 화면의 숫자들이 서로 다른 소속 정의를 써서 사용자에게 데이터 누락으로 보임. 같은 국가 상세에서 탭마다 포함 범위가 다르고, 복붙 5곳+는 향후 드리프트 온상. D-2 국가 스코프 살림 진행 시 glossary에서도 동일 비대칭 재생산.
- **권고**: getAllEvents/count의 countryId 필터에 동일한 브리지 OR 확장 추가. 근본적으로는 복붙된 확장 로직을 공용 헬퍼(resolveLinkedHistoricalIds/resolveCountryScopeWhere)로 추출해 law·glossary·organization에 적용하거나, '확장은 클라 opt-in 파라미터(includeHistorical=true)'로 계약 명시화. D-2 배선 시 glossary에 처음부터 포함.

### F15 **[P2·CONFIRMED]** 역사국가 내비 목적지 3원화 — 인물 배지·prose 클릭이 '전용 상세 없음'이라는 낡은 전제로 우회·데드엔드 처리 (무브리지 도쿠가와 막부는 사용도 2위인데 배지 비대화형)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1441` · 렌즈: reading-ux, data-reality
- **근거**: person-detail-panel.tsx:1441 주석 "역사국가는 전용 상세 라우트가 없다" → :1445-1447 역사 국적이면 navTargetId=modernCountryId, :1464 pathKeys.countryHistorical(navTargetId)로 현대국 '과거국가' 탭 이동, 브리지 없으면 :1451 비대화형 div + :1455 title 안내. prose 클릭도 동일: use-rich-text-prose-click.ts:302-309 첫 브리지 현대국으로, 없으면 토스트. 그러나 셸은 역사국가 id를 직접 resolve — use-content-core-data.hook.ts:100-104가 raw 역사국가를 무조건 인덱싱, country-detail-shell.tsx:94-97 O(1) 조회, country-detail.widget.tsx:134-153 HistoricalCountryDetail 분기, 과거국가 탭 카드·국가 목록은 pathKeys.countryDetail(h.id) 직행(linked-historical-countries-section.widget.tsx:1131 등 5곳). countryHistorical()은 특정 역사국가 포커스 파라미터도 없음(router.ts:62-64). DB 실측: 무브리지 8/193이지만 인물 수 기준 도쿠가와 막부가 26명으로 전체 2위(재위 15·재임 4·소속 29·사건 7 연결) — 국기·isoCode는 브리지 첫 현대국가 주입이라 전부 null.
- **영향**: 역사 국적 인물 222명의 국적 배지를 클릭하면 그 국가 상세가 아니라 '연결 현대국의 전체 과거국가 목록'에 떨어져 다시 찾아야 하고(러시아처럼 15개 연결국이면 특히), 무브리지 8개국(도쿠가와 막부·북한·중화민국 등) 소속 인물은 배지가 아예 비대화형·멘션 클릭은 토스트 데드엔드 — 실제로는 /country/:histId가 완전 동작하므로 불필요한 막다른길. 막부·번은 '현대 일본'으로 잇기 애매해 무브리지가 정당한 데이터인데 내비 설계가 브리지를 사실상 필수로 가정해 정당한 데이터가 벌점을 받는 구조.
- **권고**: 인물 배지·prose 클릭의 목적지를 pathKeys.countryDetail(historicalCountryId)로 통일(브리지 불필요, 이미 동작하는 경로)하고 :1441의 낡은 주석 삭제. '연결 현대국 맥락'이 필요하면 역사국가 상세에서 현대국으로 나가는 링크 제공. 국기는 name-chip 폴백 설계 유지.

### F16 **[P2·CONFIRMED]** 역사국가 상세 14탭 중 5탭이 mock/플레이스홀더 — 이름 includes 매칭으로 북한 상세에 조선왕조 목업이 실데이터처럼 노출되고, 실데이터·API가 있는데 미배선

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/historical-country-detail.widget.tsx:1043` · 렌즈: reading-ux, cross-entity
- **근거**: 사건 탭: getMockDataKey가 국가명 includes('조선')/('고려')로 historicalCountryMockData만 사용(historical-country-detail.widget.tsx:1043-1050, API 호출 0), :1053-1079 임진왜란 하드코딩. 인물 탭 동일(:1714-1724), 문화 탭(:2720-2727), 행정조직 탭 안내문뿐(:402-404), 영토 탭 '준비 중'(:2693-2710). DB 실측: '조선민주주의인민공화국'(AD 1948~) 실존 — includes('조선') 매칭으로 북한 상세의 사건/인물/문화 탭에 조선왕조 목업이 렌더됨. 한편 실데이터·API는 존재: event.historical_country_id 59건·person.historicalCountryId 222건, 사건 목록 API는 countryId에 역사 id를 넣으면 매칭(event.controller.ts:382-384 OR), 재임 인물 API도 존재(government-position.controller.ts:151-158).
- **영향**: 북한 역사국가 상세에서 임진왜란·조선 인물이 그 나라 데이터처럼 표시됨(허구의 실데이터 위장). 반대로 로마 제국 등에 사건·인물을 실제 등록한 사용자는 이 탭들에서 '정보가 없습니다'만 봄 — 탭이 사실상 영구 비기능인데 존재는 하여 데이터 유실로 오인. 현대국가 상세는 실데이터인데 같은 라우트의 역사국가만 mock인 이중 기준.
- **권고**: 이름 매칭 mock 즉시 제거. 사건 탭은 EventsTimelineSection(countryId=역사 id) 재사용으로 실배선(서버 필터 이미 지원), 인물 탭은 재임 API로 우선 배선 후 F21의 합집합 API 신설 시 교체. 영토·문화 탭은 로드맵 확정 전까지 탭 숨김 검토.

### F17 **[P2·PARTIAL]** 사건 본체 historicalCountryId가 필터·목록 칩·상세 히어로 어디에도 안 잡힘 — 14/59건이 역사국가 축에서 완전 불가시

- **위치**: `apps/api/src/libs/event/presentation/event.controller.ts:381` · 렌즈: reading-ux
- **근거**: 서버 목록 필터는 countryRelations만 검사(event.controller.ts:381-394 — countryRelationOr → :393 { some: { OR } }, 본체 event.historicalCountryId 조건 없음). 응답 relatedHistoricalCountries도 관계 행만 집계(:149-170, 본체 FK는 :204에 naked id로만). 웹 클라 필터도 관계 배열만(useEventFilters.ts:130-133), 목록 칩·상세 히어로(detail-hero.tsx:300-305)도 relatedHistoricalCountries 소비. DB 실측: 본체 historical_country_id 보유 사건 59건 중 14건은 event_country_relation·event_country_relation_new 어디에도 매칭 행 없음.
- **영향**: 본체 historicalCountryId만 지정한 14건(24%)은 사건 목록에서 그 역사국가로 필터해도 안 나오고, 칩·히어로·관련국 블록에도 국가가 표시되지 않음 — 저작한 국가 귀속 정보가 화면 어디에도 반영되지 않는 유령 데이터.
- **권고**: 응답 조립 시 본체 historicalCountryId를 relatedHistoricalCountries에 합류(dedup)시키거나 서버 필터 OR에 { historicalCountryId } 본체 조건 추가. 근본적으로는 본체 FK=주 무대, 관계=참여국 역할 정의를 확정하고 표시 계약 단일화.
- **검증자 정정(PARTIAL 사유)**: "14건이 목록 필터에서 안 나온다"는 부분은 현재 데이터에서 발생하지 않음: 14건 전원이 자식 사건이라 목록(최상위 전용, event.controller.ts:400)의 후보가 아니고, 그 부모 5건은 모두 동일 역사국가 관계 행을 보유해 국가 필터로 정상 검출되며, 최상위 사건 중 본체 FK만 있고 관계 행이 없는 건은 0건. 실제 임팩트는 "14개 자식 사건의 상세 화면에서 국가 귀속이 표시되지 않는 표시 공백"으로 한정되고, 해당 본체 FK는 웹 UI가 쓰지 않는 시드 전용 필드라 UI 사용으로 늘어나지도 않음. 구조적 계약 공백(본체 FK가 필터·표시 계약에서 제외)은 사실이므로 권고(응답 합류 dedup 또는 필터 OR 추가)는 유효하나, 심각도는 P2가 아니라 P3(자식 상세 표시 공백 + 잠재적 계약 위험) 수준이 적정.

### F18 **[P2·CONFIRMED]** 군주 재위 패널: 현대 국가 재선택 시 역사국가 연결을 무조건 클리어 — 자매 tenure 패널이 명시적으로 막은 버그를 그대로 보유

- **위치**: `apps/web-admin/src/shared/ui/sovereign-reign-register-panel/sovereign-reign-register-panel.tsx:874` · 렌즈: authoring-ux
- **근거**: sovereign-reign-register-panel.tsx:872-877 현대 국가 onSelect에서 `setHistoricalCountryId(null)` 무조건 실행. 반면 동형 패널인 tenure-register-panel.tsx:599-613은 "역사국가 전용 행을 수정하다 현대 국가를 골랐을 때 historicalCountryId가 조용히 NULL로 덮여 연결이 파괴되던 문제 방지" 주석과 함께 새 국가 소속이 아닐 때만 + 목록 로드 성공 시에만 해제하는 보수 정책(:606-612).
- **영향**: 역사국가가 걸린 재위(sovereign_reign 187행 중 184행이 historical_country_id 보유)를 수정하며 현대 국가를 (재)선택하면 역사 연결이 소리 없이 풀린 채 저장 → 해당 역사국가 상세 '역대 수반' 목록에서 재위가 사라지는 하류 결손. 같은 UX의 자매 패널과 정책이 달라 사용자 예측 불가.
- **권고**: tenure 패널의 belongs 검사 정책(:604-613)을 sovereign 패널에 그대로 이식(공용 훅으로 추출하면 재발 방지).

### F19 **[P2·CONFIRMED]** 국가 피커 4종 파편화 — 현재값(역사국가) 인식은 1종만, 검색 필드 제각각(2종은 enName 불가), 조직 폼은 검색 없는 네이티브 select

- **위치**: `apps/web-admin/src/shared/ui/country-select-modal/country-select-modal.tsx:156` · 렌즈: authoring-ux
- **근거**: ① CountrySelectModal은 기본 탭 'modern'(country-select-modal.tsx:156)이고 열릴 때 검색어만 리셋(:161-165) — selectedCountryId는 카드 체크(:477-479)에만 쓰이고 탭 전환 미사용. AdvancedCountrySelectModal도 무조건 'modern'(advanced-country-select-modal.tsx:55-57). 대조: CountrySearchModal만 열릴 때 selectedCountryId가 역사 목록에 있으면 'historical'로 자동 전환(country-search-modal.tsx:84-90). ② 검색 필드: CountrySelectModal은 name·localName·isoCode·대륙명·enName(country-select-modal.tsx:68-83), CountrySearchModal은 name includes만(:123-126), Advanced도 name만(advanced-country-select-modal.tsx:108-111) — 동명 로컬 파일 widgets/heads-of-state-timeline/ui/country-search-modal.tsx까지 별도 존재해 혼동 가중. ③ 조직 폼만 검색·존속기간·enName 없는 네이티브 <Select> 2개로 역사 193개를 플레인 스크롤(organization-form.page.tsx:403-442).
- **영향**: 역사 국적 인물(392명 중 222명) 수정 시 모달이 현대 탭으로 열려 현재 선택이 안 보임 — 미선택 오인 또는 매번 탭 전환. 'Holy Roman Empire'·'Prussia' 등 영문명 검색이 폼에 따라 0건이라 같은 국가를 다른 키워드로 찾아야 하고(역사국가는 한글 표기 흔들림이 커서 특히 아픔), 조직 폼은 동명 유사 국가(왕국/공국/제국 변형) 오선택 위험. 같은 '국가 선택' 과업인데 피커마다 동작이 달라 학습 불가 — 기존 검토(person-historical-country-review)의 '기본탭 현대' 지적이 여전히 미해소.
- **권고**: CountrySearchModal의 현재값 인식 로직(:84-90)을 나머지 피커에 이식, 필터 함수를 공용 유틸로 추출해 name+enName(+역사국가 startYear) 최소 공통 스펙 통일, 조직 폼은 공용 피커 트리거 버튼으로 교체(상호배타 로직 재사용). 장기적으로 피커 1~2종 수렴 + 직전 선택 탭 세션 기억.

### F20 **[P2·CONFIRMED]** 폼 안에서 역사국가 인라인 생성 불가 — 없으면 저작 흐름이 /country 페이지로 끊기고 입력 중이던 값 유실

- **위치**: `apps/web-admin/src/shared/ui/country-select-modal/country-select-modal.tsx:450` · 렌즈: authoring-ux
- **근거**: HistoricalCountryFormModal 마운트는 pages/country/country-detail-shell.tsx:237 단 한 곳, 생성 진입은 국가 목록 추가 메뉴(:195)뿐(grep 전수). 피커 빈 상태는 '검색 결과가 없습니다' 텍스트만(country-select-modal.tsx:449-457) — 등록 CTA 없음. CountrySearchModal·Advanced도 생성 어포던스 0.
- **영향**: 인물/재임/사건 저작 중 필요한 역사국가가 시드에 없으면(역사국가 누락 제보 워크플로가 별도 존재할 정도로 실제 빈발) 폼을 떠나 /country로 이동해야 함. person 폼은 draft가 있지만 tenure/sovereign 패널·사건 폼은 draft가 없어 입력값 유실. '없다' 제보의 상당수가 이 흐름 단절에서 발생.
- **권고**: 피커 빈 상태(및 역사 탭 하단)에 '새 역사국가 등록' CTA 추가 → HistoricalCountryFormModal 재사용해 인라인 생성 후 자동 선택(검색어를 name 프리필로 전달). 폼 모달이 이미 위젯으로 분리돼 있어 마운트 지점만 추가하면 됨.

### F21 **[P2·PARTIAL]** "이 역사국가 소속 인물 전부" 조회 경로 비대칭 — 현대는 3원 합집합 API, 역사는 재임 단독 API뿐이라 본체 FK 222행이 목록 API로 도달 불가

- **위치**: `apps/api/src/libs/person/presentation/government-position.controller.ts:151` · 렌즈: cross-entity
- **근거**: 현대국가: GET /persons/by-country/:countryId가 countryId 직접 + 재임 + affiliation 3원 합집합(person.service.ts:229-240, person-by-country.controller.ts:17-22). 역사국가: 유일한 목록 API가 GET /government-positions/historical-countries/:id/persons로 재임 보유자만 반환(government-position.controller.ts:151-158, findPersonsWithTenureInCountry는 historicalCountryId일 때 확장 없이 재임 단독 — person.prisma.repository.ts:4511-4513). person.historicalCountryId 본체 FK(DB 222행)·affiliation 기반 나열 엔드포인트는 person.controller.ts GET 라우트 전수 확인 결과 부재(:184-495).
- **영향**: 재임 없는 조선 문인·학자는 person.historicalCountryId='조선'이어도 조선 상세에서 영원히 안 보임. 반대로 대한민국 상세에는 브리지 확장으로 보임 — 데이터가 많은 쪽(역사국가, 222행)이 오히려 조회 불가인 역전.
- **권고**: GET /persons/by-historical-country/:id를 현대판과 동일한 3원 합집합(본체 FK + 재임 + affiliation)으로 신설. findPersonsByCountry의 합집합 로직을 축 파라미터화하면 코드 추가 소량.
- **검증자 정정(PARTIAL 사유)**: 임팩트 정정 3건: (1) "본체 FK 222행이 목록 API로 도달 불가" → 222행 중 131행은 재임 보유로 tenure 단독 엔드포인트(government-position.controller.ts:151)에 우연히 노출되고, 어떤 역사국가 스코프 목록으로도 도달 불가한 것은 91행(41%). (2) "조선 문인은 조선 상세에서 영원히 안 보임"은 역사국가 상세 지면 한정으로만 참 — 인물 대시보드(GET /persons/infographic + 클라 국가필터, 역사국가 이름 매칭·UUID 정규화 지원)에서는 "조선" 필터로 전원 조회 가능(단, 계정 소유분 한정·클라 필터라 스코프 API 대체는 아님). (3) "대한민국 상세에는 브리지 확장으로 보임"은 API 계약상만 성립 — 3원 합집합 GET /persons/by-country는 현재 프론트 호출처 0곳이고, 실제 현대국가 상세의 인물 보기(대시보드 리다이렉트)에서는 조선 문인이 country="조선"으로 해석돼 대한민국 필터에 안 잡히므로 UI 수준의 "역전" 대비는 현재 미성립. 비대칭 자체와 엔드포인트 신설 권고는 유효하며 P2 유지 가능하나 근거는 위 91행·역사국가 상세 지면 기준으로 서술해야 정확.

### F22 **[P2·CONFIRMED]** 브리지에 관계 성격·기간·primary 플래그가 없어 다중 연결(소련 15개국·로마제국 10개국) 해석이 '배열 첫 행' 임의 선택

- **위치**: `libs/db/prisma/historical.prisma:360` · 렌즈: schema-design
- **근거**: libs/db/prisma/historical.prisma:360-379 — 브리지 컬럼은 FK 2개+타임스탬프가 전부(성격/기간/isPrimary 없음). 소비 코드가 임의 첫 행에 의존: person.prisma.repository.ts:394 `const mc = hc.modernConnections?.[0]?.modernCountry`로 국기·isoCode·defaultNameDisplayOrder 차용(:393-404), use-rich-text-prose-click.ts:302 `const first = hc.parentModernCountryIds?.[0]`로 내비 목적지 결정. DB 실측 팬아웃: 소련 15, 로마 제국 10, 로마 공화국·서로마 5.
- **영향**: 소련 주국적 인물의 국기·이름표시순서·본문 링크 클릭 목적지가 '브리지 삽입 순서'라는 무의미한 기준으로 결정됨. 신성로마제국→독일/오스트리아/체코 케이스에서 '주 계승국'과 '영토 일부'를 구분해 표시할 방법이 스키마에 없고 사용자가 순서를 제어할 UI도 없음(SelectionChips는 순서 비보장).
- **권고**: 브리지에 isPrimary Boolean(또는 sortOrder Int) + 관계 성격 enum(PRIMARY_SUCCESSOR/TERRITORIAL_PART 등)을 additive로 추가하고 [0] 선택 3곳(person repo·prose-click·country repo)을 isPrimary 우선으로 전환. 팬아웃 1인 160개국은 자동 primary 백필 가능.

### F23 **[P2·PARTIAL]** AdministrationDepartment onDelete 비대칭(현대 Cascade vs 역사 SetNull) — 주석이 dual-fill을 장려해 현대 국가 삭제 시 역사 부처까지 연쇄 삭제

- **위치**: `libs/db/prisma/country.prisma:502` · 렌즈: schema-design
- **근거**: country.prisma:502 `country ... onDelete: Cascade` vs :503 `historicalCountry ... onDelete: SetNull`. 게다가 :471 주석 "현대 국가 ID (표시/그룹핑용. 역사적 국가 부처도 연결된 현대 국가를 넣을 수 있음)"이 두 FK 동시 기입을 명시 장려. 다른 듀얼 FK 모델들은 모델 내부 대칭(SetNull/SetNull 또는 Cascade/Cascade — grep 전수 확인)이라 모델 내부 비대칭은 이 모델과 AdministrativeDivision(현대측 relation 부재)뿐.
- **영향**: 주석대로 '조선 6조'에 연결 현대국가(대한민국)를 함께 넣은 뒤 그 현대 국가를 삭제하면 역사 부처 행 전체가 hard-delete됨(역사국가 삭제 시엔 SetNull로 생존하는 것과 정반대). 부처는 tenures(역대 장관)·events를 매단 허브라 2차 손실로 번짐.
- **권고**: 현대측도 SetNull로 전환(부처의 정체성은 소속 국가보다 큼). Cascade가 의도라면 최소한 :471 주석의 dual-fill 장려를 제거해 모순 해소.
- **검증자 정정(PARTIAL 사유)**: 스키마 비대칭(country.prisma:502 Cascade vs :503 SetNull)과 :471 dual-fill 장려 주석, DB 실제 제약 반영, 국가 삭제 경로의 서비스 가드 부재까지 모두 사실. 그러나 임팩트는 현재 실현 불가: historicalCountryId는 API(Create/Update DTO에 필드 부재, 도메인 코드 참조 0건)·web-admin 부처 플로·시드 어디서도 쓰지 않는 죽은 컬럼이고, 라이브 DB에 administration_department 행이 0건(부처 참조 tenure도 0건)이라 손실 대상 데이터 자체가 없다. 따라서 P2 데이터 손실이 아니라 '역사 부처 저작 기능이 배선될 때 터질 잠재 지뢰'(P3 수준 스키마 부채)로 보는 게 정확하다. 권고 자체(현대측 SetNull 전환 또는 :471 주석의 dual-fill 장려 제거)는 유효하며, 역사 부처 저작 배선 전에 처리하면 된다.

### F24 **[P2·PARTIAL]** City.countryId·AdministrativeDivision.countryId가 FK 제약 없는 생 컬럼 — 참조 무결성을 DB가 전혀 보장 못 함

- **위치**: `libs/db/prisma/country.prisma:412` · 렌즈: schema-design
- **근거**: country.prisma:412 `countryId String @map("country_id")` (NOT NULL)인데 관계 블록 :426-434에 country @relation이 없고 Country 모델(:80-124)에도 City 역방향 없음 — @@index(:440)만 존재. AdministrativeDivision도 동일(:306 스칼라만, 관계 블록 :335-342에 country 부재). DB 실측 확정: information_schema.KEY_COLUMN_USAGE에서 두 컬럼 모두 FK 제약 0건. 고아 행 현재 0건.
- **영향**: 국가 삭제 시 이 컬럼들엔 Cascade도 SetNull도 작동하지 않아 삭제된 Country id가 조용히 잔류. City는 인물 출생/사망지·사건 위치·기업 시설의 앵커라 dangling 참조가 하류 표시 결함으로 전파되고, 존재하지 않는 countryId로 도시를 만들어도 DB가 못 막음.
- **권고**: @relation 추가 마이그레이션(둘 다 onDelete: Cascade 또는 City는 Restrict). 현재 고아 0건이라 제약 추가 즉시 가능.
- **검증자 정정(PARTIAL 사유)**: 영향 범위 축소 필요: (1) AdministrativeDivision.countryId는 FK가 없어도 현재 앱 경로로는 dangling·유령 countryId 생성이 불가능 — 모든 구역이 소유국가 일치가 강제된 config(진짜 FK, onDelete: Restrict)를 NOT NULL로 참조하므로 구역 보유국은 DB 레벨에서 삭제가 거부되고, 유령 countryId는 서비스 검증(config owner 일치)에 막힌다(우연적·전이적 방어이므로 FK 추가는 심층방어로 여전히 유효). (2) "존재하지 않는 countryId로 도시 생성"은 공격면이 없음 — City 쓰기 API가 전무하고 유일한 시드도 국가 존재를 선확인. (3) 실재하는 결함은 City.countryId + 국가 삭제 경로뿐: 도시 보유국(러시아·대한민국)이 config 0건이라 삭제가 성공하며 city 3행이 고아화된다. 심각도는 P2 유지보다는 P3(단일 경로, 현재 도시 3행 규모)이 적정하나, City FK(Restrict 권장) 추가라는 권고 자체는 그대로 타당.

### F25 **[P2·PARTIAL]** AdminDivisionScheme BC 가드가 '연도<1'만 차단 — AD 1~99가 통과해 mariadb 2자리 연도 손상(44→2044) 경로가 UI에서 도달 가능

- **위치**: `apps/api/src/libs/city/application/city.service.ts:340` · 렌즈: time-bc
- **근거**: 백엔드 parseSchemeDate는 `trimmed.startsWith('-')`(음수 연도=BC)만 거부하고 나머지는 native new Date로 통과(city.service.ts:337-349). 프론트 가드도 `p.year < 1`만 BCE 취급(admin-division-scheme-modal.tsx:55-59, 100-106). 공용 DatePickerModal은 임의 연도 입력을 지원해(date-picker-modal.tsx:44-50, 96-97) 서기 1~99년 선택 가능. 연도<100 DATETIME의 어댑터 손상은 배우자 혼인일 작업에서 실증된 확정 결함.
- **영향**: 역사국가 행정구역 체계(예: 로마 제국 속주제, AD 1세기 시행)를 등록하면 에러 없이 저장되고 시행일이 20XX년으로 무성 둔갑. 목록 정렬도 startDate asc(city.service.ts:309)라 순서까지 왜곡. 현재 위험대 데이터 0건이지만 가드가 '있는 것처럼 보여서' 더 위험한 반쪽 가드.
- **권고**: parseSchemeDate에서 연도<1000(최소한 <100) 거부를 추가해 BC 거부와 같은 명시 에러로 통일하고, 프론트 isBceDate 가드도 동일 임계로 확장. 장기적으로 F5와 같은 era/YMD 구조화 배치에 합류.
- **검증자 정정(PARTIAL 사유)**: 두 가지 정정. (1) 손상 지점: 설치된 @prisma/adapter-mariadb 7.3.0에서는 쓰기 직렬화가 연도를 4자리로 패딩해(dist/index.js:163-166) 최초 저장 시 DB에는 0044가 올바르게 기록된다 — 'mariadb 2자리 연도 규칙에 의한 쓰기 손상'이 아니라, 어댑터 읽기 변환(mapRow의 new Date(value+'Z'), dist/index.js:149)에서 V8 관용 파서가 '0044-…'를 2044로 오파싱하는 읽기측 손상이다. 사용자 관점 증상(모든 화면에서 2044로 표시, 무에러)은 동일하고, 수정 모달이 손상된 응답 ISO를 그대로 재저장하는 편집 1회 왕복 후에는 실제 저장 손상으로 고착되므로 심각도 P2는 유지. (2) 정렬 왜곡(city.service.ts:309 startDate asc): SQL은 저장값(0044)으로 정렬하므로 최초 저장 상태에서는 정렬이 정상(표시만 2044)이고, 편집 재저장으로 2044가 고착된 뒤에야 왜곡된다. 권고(parseSchemeDate 연도<1000 거부 + 프론트 동일 임계)는 그대로 유효 — 읽기 경로가 연도<100을 충실히 표현하지 못하므로 오히려 차단이 더 정당화된다.

### F26 **[P2·CONFIRMED]** CITIZENSHIP priority=0 유일성 규칙 21명 붕괴 — 서비스가 무조건 create하고 스키마 unique도 없어 다중 왕관 군주의 슬롯이 병렬 증식

- **위치**: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:1987` · 렌즈: data-reality
- **근거**: 재쿼리로 중복 인물 정확히 21명 잔존 확인. 생성 경로는 유일성 검사 없는 무조건 create(person.prisma.repository.ts:1987-1996 '역사 국가인 경우 CITIZENSHIP priority=0 소속 생성'), 스키마도 index만 있고 unique 제약 없음(libs/db/prisma/person.prisma:711-714). effective 국적 도출은 priority 정렬 후 [0](repo:358-360)인데 priority=0끼리는 비교값 동일 → DB 반환 순서 의존 비결정. 극단 사례: 에른스트는 완전 동일 필드의 순수 중복 2행(작센코부르크고타 공국, 전 컬럼 동일) 보유 — 중복 생성 경로 실존 실증.
- **영향**: 합스부르크류 다중 왕관 군주 21명의 '주 국적'이 데이터 반환 순서에 따라 흔들릴 수 있고(FK 채워진 동안은 잠복, FK가 비워지는 순간 폴백이 비결정 국적 노출), 에른스트는 소속 칩에 같은 국가가 2번 표시(추정 — 칩 렌더는 affiliation 배열 직매핑).
- **권고**: 쓰기 경로를 upsert(기존 priority=0 CITIZENSHIP 행 갱신)로 변경, 다중 왕관은 priority=0 단일 + 나머지 priority>=1로 정리하는 일회성 스크립트. 에른스트 순수 중복 1행은 즉시 삭제 가능.

## 3-3. P3 — 마찰·부채 (16건)

### F27 **[P3·CONFIRMED]** HistoricalCountryTransition에 시점 필드 전무 — '언제 계승됐나'를 담을 곳이 없어 후임 국가 존속시작일로 대리 표시

- **위치**: `libs/db/prisma/historical.prisma:300` · 렌즈: schema-design
- **근거**: historical.prisma:300-324 — Transition 컬럼은 predecessorId/successorId/eventType/transitionScope뿐, 날짜류 0개. 이 때문에 API가 후임 국가의 존속 시작을 대리 포맷해 내려보냄(historical-country-transition.prisma.repository.ts:20-31 successorStartDate 포맷터).
- **영향**: 전임 국가가 서로 다른 시점에 여러 후임에게 분할·정복된 경우(폴란드 분할, 서로마 해체 등) 각 전환의 실제 시점을 기록·표시할 수 없고, 후임 건국일과 전환일이 다른 케이스(점진 병합)는 틀린 날짜가 노출됨.
- **권고**: 본체와 동형의 era+Y/M/D 구조화 시점 컬럼을 Transition에 additive 추가(옵셔널). 기존 행은 null 유지로 무해.

### F28 **[P3·CONFIRMED]** HistoricalCountry에 localName·capital·defaultNameDisplayOrder 등 자체 표시 속성 부재 — '첫 브리지 현대국가' 차용의 구조적 의존

- **위치**: `libs/db/prisma/historical.prisma:173` · 렌즈: schema-design
- **근거**: historical.prisma:173-297 전체 확인 — 자체 시각·명칭 속성은 thumbnailUrl(:188)뿐, Country의 fullName/localName/flagEmoji/capital/defaultNameDisplayOrder(country.prisma:38-68) 대응 필드 전무. 그 공백을 person.prisma.repository.ts:393-404가 첫 브리지 현대국가에서 주입으로 메우고, 공용 칩은 표시 포기(country-flags.tsx:6 "historical[]: { id, name } → 항상 name (flag 없음)").
- **영향**: 조선 인물의 이름 표시 순서가 '대한민국의 defaultNameDisplayOrder 설정'에 종속(의미상 무관한 결합)되고, 무브리지 역사국가 8건은 국기·이름순서·수도 등 표시 정보가 전부 소실. 신성로마제국의 '수도 없음' 같은 역사적 사실도 기록할 곳이 없음.
- **권고**: 최소셋으로 localName(당대 자칭)·capital·defaultNameDisplayOrder 3필드 additive 추가. flagEmoji는 실존 이모지가 없어 thumbnailUrl 유지가 타당 — 대신 F22의 isPrimary로 차용 대상을 명시화.

### F29 **[P3·CONFIRMED]** name unique 정책이 두 허브에서 역전 — HistoricalCountry는 무제약(중복 허용), Country는 전역 @unique(계정 모델과 충돌)

- **위치**: `libs/db/prisma/historical.prisma:178` · 렌즈: schema-design
- **근거**: historical.prisma:178 `name String @map("name") @db.VarChar(50)` — unique 없음(DB 실측: 인덱스는 PRIMARY+accountId뿐). 반면 country.prisma:35 `name String @unique @db.VarChar(100)` — 전역 unique인데 :127-128에 accountId 소유 모델 공존. 현재 historical_country 이름 중복 0건(193행 전수).
- **영향**: 역사국가는 같은 계정이 '고려'를 2번 만들어도 통과 — 이름으로 대상을 찾는 시드 워크플로와 멘션/링크 검색이 임의 행을 잡음. 거꾸로 Country는 두 계정이 각자 '프랑스'를 등록할 수 없어 개인 정보 플랫폼 전제(계정별 데이터)와 모순 — 멀티 계정 활성화 시 즉시 충돌.
- **권고**: 양쪽 다 @@unique([accountId, name])으로 수렴(MySQL은 accountId NULL 행 중복을 막지 못하므로 서비스 dup 체크 병행 — CountryAdminDivisionConfig :281 주석의 기존 관례와 동일).

### F30 **[P3·CONFIRMED]** SocialPhenomenon 관계 필드명 역전 — `country`가 HistoricalCountry를, `modernCountry`가 Country를 가리키는 도메인 유일의 명명 함정

- **위치**: `libs/db/prisma/social-phenomenon.prisma:337` · 렌즈: schema-design, cross-entity
- **근거**: social-phenomenon.prisma:337 `country HistoricalCountry? @relation(fields: [historicalCountryId], ...)` / :338 `modernCountry Country? @relation(fields: [countryId], ...)` — 다른 모든 듀얼 FK 모델(organization.prisma:223-224, government.prisma:304-307 등)의 country=현대/historicalCountry=역사 관례와 정반대. 스칼라 컬럼명(:332-334)은 관례대로라 관계 필드만 뒤집혀 있음.
- **영향**: `include: { country: true }`를 쓰는 코드가 이 모델에서만 역사국가를 받아, 횡단 유틸·신규 소비 코드가 조용히 잘못된 축을 표시할 수 있는 잠복 버그 씨앗. 컴파일 통과라 리뷰로만 잡히고 grep 추적도 오염. 현재 런타임 결함은 아님.
- **권고**: 관계 필드명만 스왑(@map 유지로 테이블 컬럼 불변 — 마이그레이션 무SQL, prisma generate만). 소비 코드 치환은 tsc가 전수 잡아줌 — 데이터·소비자가 적은 지금이 가장 싼 시점.

### F31 **[P3·CONFIRMED]** 역사국가에 귀속 불가능한 도메인군(City·NaturalFeature·Infrastructure·PersonGroup 등) — 전근대 도시·출생지가 자유텍스트 폴백으로 강등, '영토' 탭 '준비 중'의 구조적 원인

- **위치**: `libs/db/prisma/country.prisma:407` · 렌즈: schema-design, cross-entity
- **근거**: City는 countryId(NOT NULL, country.prisma:412)만 있고 historicalCountryId 없음 — 대조적으로 AdministrativeDivision은 듀얼 지원(:306-309). 인물 폼은 이 공백을 birthPlaceText 자유텍스트로 우회(person.prisma:271 "출생지 직접 입력 텍스트 (역사적 지명 등)" 주석이 공백 자인), Event.cityId(event.prisma:300)도 동일 제약. NaturalFeature·Infrastructure는 현대 Country NOT NULL Cascade(geography.prisma:73/:109, :138/:177), PersonGroup은 현대 SetNull 옵션(person.prisma:1615-1616). 역사국가 상세 '영토' 탭 '준비 중'과 정합.
- **영향**: '한양에서 출생한 조선 인물'을 구조화로 표현하려면 서울을 현대 대한민국 소속으로 등록해 시대착오를 감수하거나 텍스트 폴백으로 링크·집계(도시별 인물, 지도)를 포기해야 함. 조선 팔도(역사 행정구역)는 만들 수 있는데 그 아래 도시는 현대 소속만 가능한 반쪽 대칭이라 계층 중간에서 소속 축이 끊기고 사용자 멘탈 모델이 깨짐.
- **권고**: 역사 지리 지원 여부를 제품 결정으로 명시(미지원이면 영토 탭 제거가 정직). 지원 시 City부터 AdministrativeDivision과 동일한 듀얼+XOR(city.service.ts resolveOwner 409 재사용)로 확장 — countryId 옵셔널 완화 + F24의 FK 제약 추가와 동일 마이그레이션으로 묶으면 1회 비용.

### F32 **[P3·CONFIRMED]** 계승 표시일 포맷터가 BC+월 조합에서 BC 표기 탈락 — 'BC 44년 3월'이 '0044.03'으로 응답

- **위치**: `apps/api/src/libs/historical-country/infrastructure/historical-country-transition.prisma.repository.ts:28` · 렌즈: time-bc
- **근거**: formatSuccessorStartDate는 startMonth != null이면 `${yy}.${MM}`을 조기 반환해 era 검사(:30)에 도달하지 못함(historical-country-transition.prisma.repository.ts:27-30) — BC 접두는 '연도만 있는' 경로에서만 붙음. 이 문자열이 계승 탭 SuccessionRow에 그대로 렌더(historical-country-detail.widget.tsx:2592, 2621).
- **영향**: BC 역사국가에 존속 시작 월·일까지 기입하는 순간(start_month 채움 15/193, BC 4건과의 교집합 미확인 — 잠재) 계승 목록의 전환 시점이 AD로 오독. 서버가 표시 문자열을 만드는 계약이라 클라이언트 보정 불가.
- **권고**: era를 최우선 분기로 올려 월·일 유무와 무관하게 접두를 붙이도록 수정. 4자리 zero-pad('0044') 단독 노출도 함께 정리.

### F33 **[P3·CONFIRMED]** 역사국가 존속기간 vs 재위·재임·사건 시점 교차 검증 전무 — 존속 밖 기록이 무경고 저장

- **위치**: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:4260` · 렌즈: time-bc
- **근거**: addSovereignReign은 resolveTenureCountryFields로 국가 FK만 해소하고 startDate/endDate를 국가 존속기간과 대조하는 코드 없음(person.prisma.repository.ts:4260-4299). event.service의 관련국 연결도 relation 행 생성뿐 시점 검증 없음(event.service.ts:226-232, 392-398). 웹 저작 패널 2종에도 존속·lifespan 검증·경고 grep 무히트. 존속기간은 구조화로 100% 채워져(historical_country start_era/year 193/193) 대조 재료는 완비.
- **영향**: 조선(–1897) 국왕 재위를 1950년으로 저장해도, 로마 제국 사건을 존속 이전 연도로 연결해도 아무 경고 없음. sovereign_reign 184행이 historicalCountryId 기반이라 오기입이 조용히 축적되고 타임라인·동시대 수장 등 하류 지면에서만 이상하게 보임.
- **권고**: 하드 거부보다 소프트 경고가 적절: 저작 패널에서 선택 역사국가의 startEra/Year·endEra/Year와 입력 기간을 부호 환산 비교해 '존속 기간(1392–1897) 밖입니다' 인라인 경고 + 저장은 허용. 서버는 부호연도 비교 유틸 하나로 재위·재임·사건 3곳 공용.

### F34 **[P3·CONFIRMED]** 존재하지 않는 id도 403으로 응답 — 404 분기가 사문화되어 오류 구분 불가

- **위치**: `apps/api/src/libs/historical-country/application/historical-country.service.ts:84` · 렌즈: api-contracts
- **근거**: findById는 미존재와 비소유를 모두 null로 반환(historical-country.prisma.repository.ts:47-58)하고 서비스는 accountId가 있으면 무조건 Forbidden(historical-country.service.ts:84-88, :155-160, :187-192). 컨트롤러가 클래스 JWT라 accountId 항상 존재(:42, :61) — NotFoundException 분기는 도달 불가한 죽은 코드.
- **영향**: 클라이언트가 '삭제된 국가'와 '권한 문제'를 구분할 수 없어, 삭제 직후 stale 캐시 재조회 시 '본인이 등록한 역사적 국가만 조회할 수 있습니다'라는 오진성 메시지 노출.
- **권고**: 미존재·비소유 모두 404로 통일(존재 오라클 차단 관점에서도 표준)하거나 최소한 메시지를 '찾을 수 없거나 접근 권한이 없습니다'로 중립화.

### F35 **[P3·CONFIRMED]** 역사국가명 비링크 비대칭 — 상세 위젯 내부(계승·소속·관계)와 사건 히어로·관련국 블록에서 목적지가 실존하는데 plain text

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/historical-country-detail.widget.tsx:1962` · 렌즈: reading-ux
- **근거**: historical-country-detail.widget.tsx 전체에 navigate/pathKeys grep 0회 — 계승(SuccessionSection :1962-1999)·소속(:2229-2280)·관계 탭의 상대 국가명은 표시만, onClick은 추가/삭제 버튼뿐. 사건 상세도 detail-hero.tsx:372 현대국 CountryName 링크 vs :383 역사국 HistoricalName 비링크, detail-actors.tsx:385-389 vs :427 동일, 인물 소속 다중 칩(person-detail-panel.tsx:2785-2796)·LineageFlow 칩(lineage-flow.tsx:74-88)도 클릭 불가. 반면 과거국가 탭은 카드·흐름도 노드 클릭 → countryDetail(h.id) 지원(linked-historical-countries-section.widget.tsx:1131 등 5곳). /country/:histId가 동작하므로 목적지 부재가 아님.
- **영향**: 고려 상세의 계승 탭에서 '조선(계승)'을 보고도 이동할 수 없어 계보 사슬 탐색이 매번 국가 목록으로 돌아가 필터+검색 반복 — 전신↔후신 넘나들기라는 핵심 동선 단절. 같은 화면에서 현대국은 파고드는데 역사국은 못 파는 비대칭이 반복 학습돼 '역사국가는 원래 클릭 안 되는 것'으로 오인, 실존하는 14탭 상세의 발견성 저하.
- **권고**: 계승/소속/관계 행과 사건 히어로·관련국 블록의 역사국명을 pathKeys.countryDetail(상대 id) 링크로 전환(응답에 id 이미 포함). LineageFlow 칩도 동일 링크화 — 과거국가 탭과 같은 클릭 어포던스로 통일.

### F36 **[P3·CONFIRMED]** 역사국가 상세 탭 딥링크가 6/14종만 지원 — 계승·소속·관계 등 고유 탭은 새로고침 시 개요로 리셋

- **위치**: `apps/web-admin/src/widgets/country/country-detail/ui/historical-country-detail.widget.tsx:262` · 렌즈: reading-ux
- **근거**: SYNCED_TAB_SET = heads·regions·government·elections·laws·ethnicity 6종만(historical-country-detail.widget.tsx:262-269, 타입 :243-249), 탭은 14종(:655-670). country-detail.widget.tsx:135-143도 동일 6종만 forward — succession/membership/relation/events/figures/territory/culture/overview는 URL 미반영.
- **영향**: 실 CRUD가 있는 계승/소속/관계 탭을 보다가 새로고침하거나 URL 공유하면 항상 개요로 리셋 — 편집 작업 중 이탈 복귀 동선이 매번 2클릭 추가.
- **권고**: SYNCED_TAB_SET에 succession·membership·relation(실데이터 탭) 추가 + CountryDetailTabKey 세그먼트 확장. mock 탭(F16)은 처분 결정 후 포함 여부 판단.

### F37 **[P3·CONFIRMED]** 국가 목록 '전체' 필터에서 역사국가 비노출(검색 시에만 합류) — 브리지 없는 8개국은 chevron 경로도 없음

- **위치**: `apps/web-admin/src/widgets/country/country-list/country-list-state.context.tsx:118` · 렌즈: reading-ux
- **근거**: country-list-state.context.tsx:105-115 'all' 모드 기본은 modern만, :117-152 '검색어가 있을 때 역사적 국가도 함께 검색' — 검색어 없으면 역사국가 0건 노출. 도달 대안은 현대 행 chevron(country-list-row.tsx:168-177, 브리지 기반)과 '역사' 필터 전환(country-list-filters.tsx:82)뿐. DB 실측: 브리지 0개 역사국가 8건은 chevron 트리에도 안 나타남.
- **영향**: 기본 진입 화면에서 역사국가 193건이 전혀 안 보여 존재 자체의 발견성이 낮고, 브리지 없는 8개국은 '역사' 필터 전환이나 정확한 이름 검색으로만 도달 가능 — 신규 사용자가 역사국가 기능을 인지하기 어려움.
- **권고**: '전체' 모드에 역사국가를 구분 섹션(또는 접힌 그룹)으로 노출하거나 최소한 목록 헤더에 '역사 국가 N개' 카운트 배지로 필터 전환 유도. 브리지 없는 국가는 '역사' 필터에서 '연결 안 됨' 배지로 저작 유도(폼의 미연결 경고와 짝).

### F38 **[P3·CONFIRMED]** EventCountryRelation vs EventCountryRelationNew 이중 모델 — 'New'는 실데이터 0행인데 군사 모듈의 유일한 쓰기 경로이며 저장돼도 국가 필터·목록에서 불가시

- **위치**: `apps/api/src/libs/event/application/military-event.service.ts:106` · 렌즈: cross-entity
- **근거**: 일반 사건 저작은 구모델만(event.service.ts:213, :227, :370-393), 군사 모듈 '국가 간 관계'는 신모델만(military-event.service.ts:106, 조회 :218, 삭제 :358). 사건 목록의 국가 필터·include는 구모델(countryRelations)만 검사(event.controller.ts:406, :431-438). 신모델은 from/toHistoricalCountryId 인덱스도 누락(event-military.prisma:189-192). DB 실측: 구모델 248행(역사 103) vs 신모델 0행.
- **영향**: 군사 모듈로 '조선→일본 침공' 관계를 입력하면 국가 페이지·사건 목록 어디서도 국가 축으로 검색되지 않음(현재 0행이라 잠복). 두 모델이 둘 다 살아 있어 소비자마다 어느 표를 읽어야 하는지 갈리는 병렬 패턴 추가.
- **권고**: 신모델을 정본 승격할 계획이 없다면 군사 모듈 관계 저장을 구모델 role 확장으로 수렴하거나, 최소한 국가 필터가 양쪽 표를 보도록 통일. 방치 시 첫 실사용 데이터부터 불가시 현실화.

### F39 **[P3·CONFIRMED]** Dynasty 이원 테이블(DynastyRule/DynastyModernRule)이 또 하나의 병렬 패턴 — modern 쪽은 데이터 0행

- **위치**: `libs/db/prisma/dynasty.prisma:97` · 렌즈: cross-entity
- **근거**: 역사=DynastyRule(historicalCountryId NOT NULL, dynasty.prisma:97-150), 현대=DynastyModernRule(countryId NOT NULL, :160-212)로 테이블 자체 분리 — 듀얼 옵셔널 FK와도, Event의 관계표 방식과도 다른 세 번째 형태. DB 실측: dynasty_rule 34행 vs dynasty_modern_rule 0행. 국가 허브 역방향도 분리(country.prisma:117 / historical.prisma:274).
- **영향**: '이 국가를 통치한 왕조'를 묻는 모든 소비자가 국가 유형에 따라 다른 테이블을 조회해야 하고 왕조 상세도 두 배열 병합 표시 필요. 현대 쪽 0행이라 죽은 절반을 코드가 계속 부양하는 비용만 존재.
- **권고**: 당장 마이그레이션 가치는 낮음. 왕조 통치 조회는 서비스 레이어 단일 메서드(양표 병합)로만 노출하는 규약 유지, 장기적으로 듀얼 FK 단일 표 통합을 백로그에 기록.

### F40 **[P3·PARTIAL]** 막시밀리안 1건 dual-write 불변식 붕괴 — country_id=오스트리아 vs historical_country_id=보헤미아 왕국(브리지 비정합)

- **위치**: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:355` · 렌즈: data-reality
- **근거**: 재쿼리: 둘-다-채움 182건 중 181건은 브리지 정합, 불일치는 막시밀리안(id 7de8352f…) 1건 — country_id→오스트리아, historical_country_id→보헤미아 왕국인데 보헤미아 왕국↔오스트리아 브리지 행이 없음. effective 도출은 역사 FK 우선(repo:354-356)이라 응답·배지는 보헤미아 왕국(→체코 라우팅), 저장된 오스트리아 FK는 현대 축 필터·카운트에서만 살아 서로 다른 나라를 가리킴.
- **영향**: 1건이지만 '주국적 변경 시 country_id 동기화가 누락되는 갱신 경로가 존재한다'는 카나리아. 오스트리아 인물 목록에는 나오는데 상세 배지는 체코 역사 탭으로 가는 자기모순 UX.
- **권고**: 해당 1행은 country_id를 체코로 정정 또는 NULL화. 주국적 update 경로에서 historicalCountryId 변경 시 countryId를 브리지 기준으로 재도출하는 동기화 보강.
- **검증자 정정(PARTIAL 사유)**: 비정합 1행(막시밀리안)과 브리지 부재는 사실이나, 이는 런타임 갱신 경로의 카나리아가 아니라 2026-07-04 백필 마이그레이션(20260704122348, 12-19행)이 legacy country_id를 미정리한 채 CITIZENSHIP priority=0 슬롯을 복사한 일회성 산물임(컬럼이 2026-04-09~07-04 부재했고 person.updated_at=2026-05-11이라 런타임 기원 불가능). 근인은 이 인물의 priority=0 슬롯 3중복(보헤미아·신성로마제국·헝가리)에서 백필이 비결정적으로 보헤미아를 고른 것. 현행 프론트 주국적 편집은 양 FK를 상호배타·명시 null로 전송해(person-register-view.tsx:1126-1133, 1781-1783) 재발 불가. "오스트리아 목록 노출" UX 모순도 신성로마제국↔오스트리아 브리지 affiliation 경로로 country_id 정정 후에도 유지되므로 stale FK 탓만은 아님. 유효한 잔여분: 해당 1행 데이터 정정 + 서버측 불변식 부재(repo:2062-2065)에 대한 방어적 보강, 그리고 이 발견이 놓친 priority=0 슬롯 중복 정리.

### F41 **[P3·CONFIRMED]** historical_country.latitude/longitude 188/193(97%) 채움인데 폼에 편집 필드가 없어 시드 좌표를 UI로 수정 불가

- **위치**: `apps/web-admin/src/widgets/historical-country/historical-country-form/ui/historical-country-form.tsx:241` · 렌즈: data-reality
- **근거**: 재쿼리: SUM(latitude IS NOT NULL)=188/193. 폼 파일에 latitude/longitude 0회 검색 — zod 스키마(historical-country-form.tsx:241-296)에 좌표 필드 없음. 좌표는 시드가 채운 뒤 UI로 손댈 수 없는 상태.
- **영향**: 좌표 소비처(country simple 응답의 latitude/longitude 등)가 있는데 잘못된 시드 좌표를 발견해도 관리자 UI로 정정 불가 — DB 직접 수정만 가능한 마찰.
- **권고**: 폼에 좌표 2필드 추가(update 경로 API 지원 확인 후 배선). 우선순위 낮음.

### F42 **[P3·CONFIRMED]** 시대 힌트 부재 — 인물 생몰년이 있어도 역사국가 추천·필터가 전혀 없음

- **위치**: `apps/web-admin/src/shared/ui/person-register-modal/person-register-view.tsx:2551` · 렌즈: authoring-ux
- **근거**: person-register-view.tsx:2551-2559 — 주국적 CountrySelectModal에 전체 historicalCountries를 무가공 주입, 생몰년 관련 prop 없음. CountrySelectModal props(country-select-modal.tsx:35-49)에도 era/연도 힌트 입력 자체가 없음. 역사국가는 start/end year가 100%/96.9% 채워져 있어 필터 재료는 완비.
- **영향**: 1550년생 인물을 등록하며 이미 생몰년을 입력했어도 193개 역사국가 전체를 이름으로만 뒤져야 함. 존속기간×생몰년 교차는 오선택(멸망 후 국가 귀속 등)을 걸러줄 유일한 자동 신호인데 미활용 — 순수 마찰.
- **권고**: 피커에 옵션 prop(hintYearRange)을 추가해 생몰년과 존속기간이 겹치는 역사국가를 상단 정렬(제외가 아닌 우선순위 부스트 — 망명·유년기 경계 사례 보호). tenure 패널의 '현대 국가로 좁히기' 전례(:416-431)와 같은 결의 문맥 힌트.

## 4. 뿌리 패턴 (근본 원인 5)

42건은 대부분 다음 다섯 뿌리의 표면들이다. 개별 수리보다 뿌리 단위로 배치를 짜는 것이 재발을 막는다.

1. **공용 피커는 isHistorical을 반환하는데 호출부가 버린다** — F2(행정부처)·F3(군부대)가 현재 표면이고, 인물 주국적도 과거 같은 결함이었다(2026-07-04 수리). 피커에 historicalCountries를 주입하는 순간 호출부는 분기 저장 의무가 생기는데 이를 강제할 장치가 없다. → "역사 미지원 폼은 historicalCountries 주입 금지, 지원 폼은 isHistorical 분기 필수"를 규약화.
2. **"역사국가 전용 상세가 없다"는 낡은 전제** — 실제로는 /country/:histId가 14탭으로 완전 동작하는데, 인물 배지·prose 클릭(F15)·계승/소속/관계 행·사건 히어로(F35)가 여전히 브리지 우회·비링크·데드엔드로 처리. 전제 하나 지우면 내비 6건이 한 번에 풀린다.
3. **횡단 정책의 도메인별 재발명** — XOR 처리 3갈래(F8), 브리지 OR 합산 유무(F14), 응답 판별 블록 유무(F13), 소속 인물 조회 경로(F21)가 도메인마다 다르다. 모범 구현은 이미 사내에 존재(Treaty XOR 400·City resolveOwner 409·person 응답 블록·브리지 확장 3곳) — 공용 유틸 추출과 규약 선언이 답.
4. **본체만 era 구조화, 부속은 DATETIME** — membership/relation(F5·F6)·transition 시점 부재(F27)·scheme 가드 반쪽(F25). '역사' 도메인 내부에서 본체만 BC 안전한 자기모순. era+Y/M/D additive 마이그레이션 1배치로 수렴 가능(현재 위험 데이터 0건이라 지금이 최적기).
5. **소유권·계약 규율 미계승** — 조직 무인증 쓰기·Dynasty 무가드·Election accountId 클라 수신(F4), 무효 id 무성 드롭(F9), delete-recreate 파괴(F11)·전량 재작성 계약 공백(F10). 인물 2차 리뷰에서 확정된 '서브리소스 규약 미계승' 뿌리와 동일 계열.

## 5. 권장 배치 (레버리지순)

- **배치 1 — 유실·함정·보안 차단 (무마이그, 소규모)**: F1(history 3줄 배선) · F2(행정부처 DTO 듀얼+XOR) · F3(군부대 함정 1줄 제거) · F4(인증 가드) · F9(무효 id 명시 거부) · F12(scope 통과 2줄) · F18(sovereign 패널 보수정책 이식) · F25(연도 가드 임계 확장) · F26(슬롯 upsert+21명 정리) · F34(404 통일) · F40(막시밀리안 1행 정정)
- **배치 2 — 내비·표시 통일 (무마이그, 프론트 위주)**: F15(배지 목적지=countryDetail(histId) 통일) · F35(역사국명 링크화) · F36(딥링크 확장) · F37(목록 '전체' 노출) · F7+F32(BC 공용 포맷터·비교기 추출 일괄 적용) · F16(mock 제거+실배선) · F19(피커 현재값 인식·검색 스펙 통일) · F20(인라인 생성 CTA) · F42(시대 힌트) · F41(좌표 필드)
- **배치 3 — 횡단 계약 단일화 (무마이그, 서버)**: F8(XOR 정책 공인+무정책 4도메인 적용) · F13(응답 요약 블록) · F14(브리지 OR 공용 헬퍼→사건 합류) · F17(본체 FK 표시 합류) · F21(by-historical-country 합집합 API) · F10(폼 빈 배열 전송 2줄) · F11(transitions diff 전환) · F33(존속기간 소프트 경고)
- **배치 4 — 마이그레이션 일괄 (병렬 스키마 WIP 정리 후, 기존 마이그 대기열과 합류)**: F10(브리지 @@unique+skipDuplicates) · F22(isPrimary/성격 enum) · F5+F6(membership/relation era 구조화+UI 배선) · F27(transition 시점) · F28(localName·capital·defaultNameDisplayOrder) · F29(name 계정 unique 수렴) · F30(관계 필드명 스왑, 무SQL) · F24(City FK 제약) · F23(onDelete 대칭화)
- **배치 5 — 제품 결정 대기**: F31(역사 지리[도시] 지원 여부 — 미지원이면 '영토' 탭 제거) · F38(EventCountryRelationNew 처분) · F39(Dynasty 이원 테이블 통합 백로그)

## 6. 미검토 영역 (완전성 비평 — 검증 안 된 추가 후보 6건)

아래는 완전성 비평 에이전트가 근거와 함께 제시했으나 **적대 검증을 거치지 않은** 영역이다. 후속 검토 후보.

- **게이미피케이션 리더보드의 국가 귀속 축 전체 미검토 — contentCountryId가 현대/역사 PK 혼합 평면 키이며 브리지 병합·귀속 우선순위가 검증 안 됨**
  - 근거: PointEntry.contentCountryId는 'Country 또는 HistoricalCountry의 PK'를 한 컬럼에 섞어 담고(point.service.ts:77 주석), 리더보드 국가 필터는 정확일치 단일 id 매칭이라(point.service.ts:683) '프랑스' 선택 시 '프랑스 왕국' 기여가 합산되지 않음 — F14가 지적한 대시보드 브리지 비대칭과 동일한 문제가 완전히 다른 지면(리더보드)에 존재하는데 42건 어디에도 없음. 또 귀속 해석이 `countryId ?? historicalCountryId`로 modern-first라(point.service.ts:984-1005) dual-fill 행은 역사국가 리더보드에서 체계적으로 누락되고, getAvailableCountries(634-665)는 두 테이블을 평면 나열해 브리지 중복 국가가 별개 항목으로 병렬 노출됨.
  - 확인처: apps/api/src/libs/gamification/application/point.service.ts:634-665, 683, 984-1005; apps/api/src/libs/gamification/presentation/gamification.controller.ts:169; 웹 리더보드 국가 셀렉터 UI(contentCountryId 소비처)
- **시드 파이프라인(실데이터 193행의 주 유입 채널)의 계정 스코프 하드코딩·서비스 계층 우회 미검토**
  - 근거: 리뷰의 data 영역은 DB 행만 봤고 그 행이 '어떻게' 들어왔는지는 안 봄. 시드는 ACCOUNT_ID를 특정 UUID로 하드코딩하고(historicalCountry.france.seed.ts:5,249), 존재 검사를 name-only findFirst로 해 계정을 무시하므로(같은 파일 224-226 — F29의 name 무제약과 결합 시 타 계정 동명 행에 브리지가 붙음) 다중 계정 환경에서 오염 가능. 또 raw prisma.create(234-252)라 서비스 계층의 XOR 가드·알림(NOTIFICATION_CRUD_SCOPE.md:101-107이 약속한 HISTORICAL_COUNTRY 알림)·세기 스탬프를 전부 우회하며, findAll이 accountId 필터라(historical-country.prisma.repository.ts:22) 시드 계정이 아닌 사용자에겐 시드 국가가 통째로 비가시 — '역사국가 누락 제보' 워크플로의 구조적 원인 후보.
  - 확인처: apps/api/prisma/seeds/historicalCountry.*.seed.ts (france 기준 5, 224-226, 234-252행); libs/db/prisma/NOTIFICATION_CRUD_SCOPE.md:101-107 대조; apps/api/src/libs/historical-country/infrastructure/historical-country.prisma.repository.ts:22
- **크로스 계정 읽기 표면(방 놀러가기·공개 프로필)에서 국가/역사국가 축 완전 부재 + 방문자 403 데드엔드**
  - 근거: reading-ux 렌즈가 소유자 화면만 봤음. 방문자용 public-profile 페이지(530줄)에는 country/historical 참조가 0건이라 타인의 인물관·사건관 카드에 국적·시대 정체성이 전혀 안 실리고, 설령 배지를 달아도 HistoricalCountry 조회가 findFirst({id, accountId}) 게이트라(historical-country.prisma.repository.ts:47-55, service 82-85에서 403) 방문자는 어떤 역사국가 상세에도 도달 불가. 계정 종속 데이터(인물)와 계정 종속 역사국가가 교차하는 공유·방문 시나리오는 42건 중 어떤 발견도 다루지 않은 별도 표면.
  - 확인처: apps/web-admin/src/pages/public-profile/public-profile.page.tsx; apps/api/src/libs/historical-country/infrastructure/historical-country.prisma.repository.ts:47-55; apps/api/src/libs/historical-country/application/historical-country.service.ts:82-85; persons/by-account 카드 DTO의 국가 블록 유무
- **국가 통계·지표 도메인(경제/인구/발전 3테이블) 전체가 현대 Country 전용 — 역사국가에는 스키마도 탭도 없음**
  - 근거: country-statistics.prisma의 3개 지표 테이블 모두 countryId 단일 FK + Country 관계(Cascade)뿐이고(37, 94, 115, 233, 254, 326행) historicalCountryId가 없어, 조선왕조 인구·로마제국 경제 같은 시계열 서사가 구조적으로 불가. 역사국가 상세 14탭 목록(overview~culture, 656-669행)에도 통계 탭 자체가 없어 F16(기존 탭 mock)·F31(귀속 불가 도메인군)이 다루지 않은 별도 도메인 파일이 통째로 인벤토리에서 빠짐. 현대 상세는 지표 API·DTO가 완비돼(dto/demographic-indicator.response.ts 등) 비대칭이 큼.
  - 확인처: libs/db/prisma/country-statistics.prisma:37,94,115,254; apps/web-admin/src/widgets/country/country-detail/ui/historical-country-detail.widget.tsx:656-669; apps/api/src/libs/country/presentation/dto/demographic-indicator.response.ts
- **회귀 안전망(테스트) 렌즈 부재 — country·historical-country API 도메인 spec 0개**
  - 근거: F1·F9·F11·F12류 '무성 유실/드롭' 결함이 다수 확정됐는데, 그 수리·재발을 잡아줄 테스트가 어느 층에도 없음: apps/api/src/libs/historical-country와 country에 *.spec.ts가 0개(find 결과 공집합), 웹 country 위젯도 헬퍼 spec 2개뿐(cabinets-section.helpers.spec.ts, heads-of-state-tenure-dedup.spec.ts). 42건을 고치는 작업 자체가 무검증 리스크라 '수리 가능성' 관점에서 확인 가치가 있고, 리뷰 렌즈 7종 어디에도 테스트 커버리지가 없음.
  - 확인처: apps/api/src/libs/historical-country/, apps/api/src/libs/country/ (spec 파일 부재 확인); apps/web-admin/src/widgets/country/country-detail/ui/*.spec.ts
- **동시 편집 lost-update 렌즈 부재 — 전량 재작성·delete-recreate 창구에 동시성 토큰이 요청 DTO에 전무**
  - 근거: F10(브리지 전량 재작성 단일 창구)·F11(transitions delete-recreate)은 단일 세션 계약 결함으로만 다뤄졌고, 두 세션이 같은 국가 폼을 열면 나중 저장이 앞선 저장의 브리지·계승 행을 통째로 되감는 동시성 시나리오는 미검토. country presentation dto 디렉토리에 version/If-Match류 필드가 없고 updatedAt은 response 전용(country.response.ts:69 등)임을 확인 — 같은 프로젝트 인물 2차 리뷰에서 'PUT sections 동시성 토큰 0'이 P1으로 판정된 전례가 있어 동급 확인 가치.
  - 확인처: apps/api/src/libs/country/presentation/dto/ (update 요청 DTO의 토큰 부재), apps/api/src/libs/country/presentation/country.controller.ts의 update·브리지 교체 경로; historical-country update 흐름 동일 확인

---
*생성: Claude Code 멀티에이전트 워크플로(wf_1e58dc73). 모든 발견은 검증 에이전트의 반박 시도를 통과했으며, PARTIAL 8건은 정정문과 함께 수록.*
