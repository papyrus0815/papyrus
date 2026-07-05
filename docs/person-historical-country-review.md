# 인물 등록 — 과거(역사) 국가 주 국적 설정 검토

> 제보: "인물 등록 시 현대 국가는 설정되는데 과거 국가를 설정할 수가 없다. 예로 에드워드 3세를 등록하는데 (현대) 영국밖에 못 고른다."
> 검토일: 2026-07-04 · 4각도 병렬 조사(주국적피커·백엔드persist·역사국가데이터/발견성·다운스트림/선례) 후 종합.

## 1. TL;DR

사용자는 인물 등록 시 필수 "주 국적" 피커에서 **역사 국가를 실제로 고를 수 있고(모달에 '역사 국가' 탭 존재), 저장도 깨지지 않는다.** 그럼에도 "현대 영국밖에 못 고른다"고 느끼는 이유는 (a) 국가 선택 모달의 기본 탭이 현대 국가라 사용자가 '역사' 탭 전환을 인지하지 못하고, (b) 잉글랜드 왕국이 시드로 들어와 있어야만 목록에 뜨며(안 돌린 DB면 없음), (c) 폼 안에 역사국가 인라인 생성 수단이 없다는 **발견성 문제** 때문이다. 구조적 근인은 `Person.countryId`가 현대 `Country` 전용 FK(주석상 "deprecated 예정")이고 역사 소속은 `PersonCountryAffiliation`로만 표현되며, 프론트 `handleCountrySelect`가 `isHistorical`을 버리고 백엔드 id-probing 번역 레이어에 의존하는 **비대칭 설계**에 있다. **권고: 먼저 UX 발견성/피커 계약을 봉합한 뒤(옵션 1), 다른 엔티티 선례(모두 `historicalCountryId` first-class)에 맞춰 구조 정합화를 결정(옵션 2/3)한다.**

## 2. 현재 실제 동작 (사용자가 겪는 것)

**주 국적 필드에서 보이는 것.** 인물 등록 모달의 필수 "국적" 필드 버튼은 `CountrySelectModal`을 연다(`person-register-view.tsx:2080-2098`). 이 모달은 `modernCountries`와 `historicalCountries`를 **둘 다** 넘겨받고(`person-register-view.tsx:2403-2411`), 모달 내부에는 '현대 국가 / 역사 국가' 밑줄 탭이 실제로 존재해 `countryType` state로 두 목록을 전환한다(`country-select-modal.tsx:51,156,358-384`). 즉 역사 국가는 **선택 가능하다** — 다만 탭을 전환해야 보인다.

**역사국가를 고르면 실제로 벌어지는 일.** 모달은 카드 클릭 시 `onSelect`에 `isHistorical(=countryType==='historical')`을 실어 보낸다(`country-select-modal.tsx:1159`). 그러나 주 국적 핸들러 `handleCountrySelect`는 파라미터가 `{ id, name }`뿐이라 **`isHistorical`을 받지도 쓰지도 않고 무조건 `setCountryId(c.id)`만 한다**(`person-register-view.tsx:1032-1035`). 그 결과 `countryId` state에 역사 국가 id가 담기고, 제출 payload는 그 역사 id를 그대로 `CreatePersonDto.countryId`로 보낸다(`person-register-view.tsx:1511`; `create-person.dto.ts:444-449`).

**그런데도 저장은 깨지지 않는다.** `Person.countryId`는 현대 `Country` 전용 FK라(`person.prisma:213,232`) 원래는 FK 위반이 날 자리지만, 백엔드가 이 케이스를 명시적으로 방어한다: 입력 `countryId`가 `Country`에 없으면 `HistoricalCountry`를 조회해, 역사국가면 `Person.countryId`를 비우고(FK 위반 회피) `CITIZENSHIP priority=0` `PersonCountryAffiliation.historicalCountryId`로 재라우팅한다(`person.prisma.repository.ts:1785-1800,1819-1828`). update 경로도 동일하다(`repository:1879-1898,1950-1974`). 응답 `countryId`는 `getEffectiveBirthCountryId`가 그 소속의 `historicalCountryId`를 최우선 반환해 되돌려주고(`repository:319-329,445`), 편집 로드 시엔 `CITIZENSHIP priority=0` 행을 추가 소속 목록에서 필터링해 중복을 막는다(`person-register-view.tsx:768-778`). UI 표시·필수검증·이름순서·왕복 저장이 모두 일관되게 동작한다.

**에드워드 3세를 "잉글랜드 왕국"에 붙이는 경로.** 시드가 돌아가 있는 DB라면 경로는 간단하다: 등록 모달의 국적 필드 → 국가선택 모달에서 '역사' 탭 전환 → '잉글랜드 왕국' 검색·선택. 잉글랜드 왕국(Kingdom of England)은 영국 역사국가 시드에 실존하며(`historicalCountry.britain.seed.ts:84-92`), 메인 오케스트레이터에 배선돼 있고(`seed.ts:17,130`), 시드가 현대 영국(GB)과의 브리지까지 자동 생성한다(`britain.seed.ts:92,170-174,211-218`). **막히는 지점**은 (a) 시드 미실행 DB면 잉글랜드 왕국 자체가 없어 `/country` 상세 페이지의 '역사' 탭까지 들어가 `HistoricalCountryFormModal`로 먼저 생성해야 하고(폼 안에 인라인 생성 없음, `country-select-modal`은 선택 전용), (b) 기본 탭이 현대라 '역사' 탭 전환을 사용자가 인지해야 하며, (c) 다중 소속으로 넣으려면 접힌 "더 입력 (선택)" 폴드를 펼쳐야 한다는 것이다.

## 3. 근본 원인 (구조적 진단)

### (a) 데이터 모델 — 주 국적은 현대 전용, 역사 소속은 조인으로만

`Person.countryId`는 현대 `Country` 전용 FK(`onDelete SetNull`)이며, 컬럼 주석에 "주 국적(간편 조회용, deprecated 예정)"으로 명시돼 있다(`person.prisma:213,232`). Person 모델에는 `historicalCountryId` 직접 FK가 **존재하지 않는다**. 역사국가를 인물에 연결하는 유일한 스키마 경로는 조인 테이블 `PersonCountryAffiliation`으로, 이 테이블만 `countryId`와 `historicalCountryId`를 **둘 다 first-class**로 보유한다(둘 중 하나 필수, 양쪽 인덱스, `onDelete Cascade`; `person.prisma:593,596,615-616,623-624`). 즉 "주 국적 = 역사국가"는 스키마상 first-class 표현이 없고, `CITIZENSHIP priority=0` 슬롯이라는 **관례적 우회 경로**로만 성립한다.

### (b) 프론트 버그 — handleCountrySelect가 isHistorical을 버림

추가 소속 행 핸들러는 `c.isHistorical`로 정확히 분기한다: `countryId: c.isHistorical ? undefined : c.id, historicalCountryId: c.isHistorical ? c.id : undefined`(`person-register-view.tsx:2415-2424`). 반면 **주 국적 핸들러는 이 정보를 통째로 버리고** `setCountryId(c.id)`만 한다(`:1032-1035`). 이 비대칭이 역사 국가 id를 현대용 `countryId` 필드에 밀어 넣는 직접 원인이다. 다만 백엔드가 테이블 조회로 판별·재라우팅하므로 **하드 브레이크는 아니고 "은닉된 계약 위반"**이다 — `countryName` 표시 effect가 modern·historical 양쪽에서 이름을 조회하고(`:931-938`) 핸들러가 `setCountryName`을 직접 세팅해(`:1035`) UI에 역사 국가 이름이 정상 표시되므로 필드 라우팅 이슈가 시각적으로 가려진다.

### (c) 발견성 — 데이터·관리 UI는 있으나 도달 경로가 깊다

역사국가는 스키마·백엔드 CRUD·관리 UI·시드가 모두 갖춰져 있다(`widgets/historical-country/*`, `shared/api/historical-countries.ts:65,82,101`). 그러나 관리 UI는 **독립 라우트가 아니라** `/country` 상세 페이지의 하위 '역사' 세그먼트 탭에 내장돼 있어(`country.route.tsx`; `browser-router.tsx`에 전용 라우트 없음) 발견성이 낮다. 인물 폼 쪽에서도 "추가 국가 소속" 섹션(`CountryAffiliationsSection`)은 "더 입력 (선택)" 접이식(`moreOpen`) 뒤에 숨어 있고 기본값 `false`이며 편집 모드에서 상세필드에 값이 있을 때만 1회 자동 펼침된다(`person-register-view.tsx:293,2161-2178,2334,392·1437`). 국가선택 모달의 기본 활성 탭이 현대라 사용자가 '역사' 탭을 인지해야 하는 점, 폼 안에 역사국가 인라인 생성 수단이 없는 점(`country-select-modal`은 선택 전용)이 겹쳐 "현대밖에 없다"는 체감을 만든다.

### (d) 선례 불일치 — 다른 엔티티는 modern|historical first-class

앱의 표준 패턴은 "엔티티가 `countryId`+`historicalCountryId` 두 nullable FK를 **모두 first-class 컬럼+인덱스**로 갖고, 통합 피커가 `{id,name,isHistorical}`을 반환하면 호출부가 `isHistorical`로 두 컬럼/배열에 분기 저장"이다. `Event`(`event.prisma:308,512`), `GovernmentPositionTenure`·`SovereignReign`(`government.prisma:300,408,411`), `Organization`·`OrganizationCountryMembership`(`organization.prisma:214,318`)이 모두 이 대칭을 갖는다. 프론트 호출부도 예컨대 `detail-actors.addCountry`가 `isHistorical`로 `relatedHistoricalCountryIds` vs `relatedCountryIds`에 분기한다(`advanced-country-select-modal.tsx:28,55`; `detail-actors.tsx:188`). **인물 주 국적만 이 계약을 어기고** first-class 컬럼 없이 백엔드 id-probing 번역에 의존한다(`person-register-view.tsx:1032,1511`; `country-select-modal.tsx:38`).

## 4. 영향 반경 / 리스크

### 지금 역사국가를 주 국적으로 고를 때 — 데이터 손실/저장 실패는 없음

네 각도의 정적 추적이 일치한다: create/update/응답/편집로드 4경로가 모두 역사 id를 `CITIZENSHIP priority=0`으로 일관 처리해 **저장 실패나 데이터 손실이 발생하지 않는다**(무효 uuid는 조용히 드롭돼 `countryId=null`, 무에러). 유일한 경미한 UX 저하는 출생지/사망지 `PlaceAutocomplete`가 역사 id로 행정구역을 조회하는데 행정구역이 현대 Country 기준이라 빈 목록이 되어 구조화 도시 선택이 사실상 수기 입력으로 떨어지는 것이다(`person-register-view.tsx:2262`; `place-autocomplete.tsx:362-383`). **(미확인/추가확인 필요)** 조사 A는 행정구역이 정말 현대 Country에만 종속인지 스키마로 최종 확인하지 않아 이 부작용 confidence를 medium으로 뒀다.

한편 조사 B는 **다중 소속(`countryAffiliations`) 배열 항목의 `countryId`/`historicalCountryId`에는 존재 검증이 없다**(주 `countryId` 가드와 비대칭)고 지적한다. FK가 존재하므로 잘못된 id가 오면 삽입 시 P2003 → NestJS 500으로 샐 수 있다(`repository.ts:1831-1844`; `person.service.ts:365-381`, try/catch 부재). **(미확인/추가확인 필요)** 이 500 반환은 스키마 FK+try/catch 부재로 추론한 것이며 런타임 재현은 하지 않았다.

### 주 국적을 역사국가로 허용하면 열화되는 하류 4곳 (조사 D)

이미 역사국가를 주 국적으로 저장할 수 있으므로, 아래는 **현재도 잠재적으로 존재하는** 다운스트림 결함이다.

- **#1 (진짜 깨진 링크):** 상세 패널의 주 country 배지는 `pathKeys.countryDetail(p.country.id)`로 이동하는데, effective country가 역사국가면 `p.country.id`는 `HistoricalCountry` PK다. `countryDetail`은 현대 국가 상세 라우트이고 country 객체에 `isHistorical` 플래그가 없어 역사국가 상세로 분기 불가 → **빈/깨진 상세로 이동**(`person-detail-panel.tsx:1156`; `router.ts:46`; `person.controller.ts:624`). **(미확인)** 브라우저 재현은 하지 않음, 역사국가 상세 전용 라우트 존재 여부 추가 확인 필요.
- **#2 (열화):** 가계도 노드 카드 국기는 `Person.country` 스칼라 관계만 로드하고 `countryAffiliations`는 안 본다. 역사국적(`countryId` NULL) 비군주 인물은 노드에 국기가 없다(군주는 reign 폴백으로만 유지; `repository.ts:4467,4804,4857`).
- **#3 (열화, confidence medium):** 이름 표시순서는 `HistoricalCountry`에 `defaultNameDisplayOrder`가 없어(`country.prisma:68`) 컨트롤러가 연결 현대국가에서 주입하지만(`person.controller.ts:627`), 역사국가에 modernConnection이 없으면 null → `resolveOrder`가 최종 폴백 korean(동양식)으로 뒤집힌다(`repository.ts:4447`). 현대 연결이 없는 서양 역사국가 인물에서 이름 순서가 틀어진다.
- **#4 (열화):** 현대국가 대시보드 인물 수/국가 상세 인물탭은 역사국적 인물을 `HistoricalCountryModernCountry` 링크가 있을 때만 포함한다(`repository.ts:814,917,928`). 역사국가가 현대국가와 미연결이면 그 인물은 어떤 현대국가 목록/카운트에도 안 잡힌다.

**영향 없음으로 확인된 곳:** 리더보드 국가귀속(`point.service.resolveContentCountry`)은 `countryId` NULL이면 priority asc 첫 affiliation의 `countryId ?? historicalCountryId`로 폴백해 정상 귀속하며, 세기귀속은 birthDate 기반이라 국가와 무관하다(`point.service.ts:976,986,878`). 단 `contentCountryId`는 modern/historical을 구분 않는 bare string 버킷이다. **(미확인)** 리더보드 프론트가 두 버킷을 어떻게 렌더/링크하는지는 미확인.

## 5. 해결 옵션

### 옵션 1 — 빠른 봉합: 피커 계약 정합 + 발견성 개선 (버그부터)

- **변경 파일군:** `person-register-view.tsx`(`handleCountrySelect` 시그니처를 `{id,name,isHistorical}`로 확장해 추가-소속 핸들러와 대칭화; "추가 국가 소속" 섹션 노출 개선 또는 국적 필드에 "역사국가 가능" 힌트 추가), `country-select-modal.tsx`(기본 탭/전환 가시성). 필요 시 국적이 역사국가일 때 `PlaceAutocomplete`의 행정구역 조회를 스킵/폴백 처리.
- **마이그레이션:** 불필요.
- **다운스트림 파급:** 없음(백엔드 계약 불변, 여전히 `CITIZENSHIP priority=0`으로 저장됨). 단 §4의 다운스트림 #1~#4는 그대로 남는다 — 봉합이지 근치가 아니다.
- **사용자 체감:** "현대밖에 없다"는 오해가 즉시 해소되고, 역사국가 선택 의도가 UI에 명시된다.
- **비용/리스크:** 낮음. 공용 `CountrySelectModal`을 건드리므로 이 모달을 쓰는 다른 호출부 회귀만 확인하면 된다.

### 옵션 2 — 정공법: Person에 `historicalCountryId` first-class 추가 (선례 정합)

- **변경 파일군:** `libs/db/prisma/person.prisma`(nullable `historicalCountryId` FK + `idx_person_historicalCountryId` 신설, `HistoricalCountry`에 Person 역관계 추가), `person.prisma.repository.ts`(번역 레이어 `1785-1828`/`1879-1974`와 effective-country 도출 `controller:610-641`를 직접 FK 읽기로 단순화), DTO/응답(`create-person.dto.ts`, `person.response.ts`, `person.controller.ts`), 프론트 통합 피커(`person-register-view.tsx`).
- **마이그레이션:** **필요.** CLAUDE.md 제약상 `apps/api/prisma/schema.prisma` 직접 수정 금지 — `libs/db/prisma/person.prisma` 소스 수정 후 `ts-node libs/db/prisma/run-migrate.ts <name>`. **기존 `CITIZENSHIP priority=0` affiliation 데이터를 새 컬럼으로 백필**하는 마이그레이션이 필요하고, 이중화 해소 전략(affiliation 슬롯 유지 vs 폐기)을 정해야 한다.
- **다운스트림 파급:** 큼 — §4 #1~#4를 근본적으로 고칠 기반이 되지만, effective-country 도출·상세 배지 라우팅·가계도 국기·국가탭 카운트 등을 새 필드 기준으로 재배선해야 한다. DTO/컨트롤러 변경이므로 `npm run build:nestia` + `shared/api/` 래퍼 갱신 필요(단, MEMORY상 build:nestia 무동작 우회 필요).
- **사용자 체감:** 최종적으로 가장 깔끔하나 도달까지 리스크·범위가 크다.
- **(미확인)** 구체 마이그레이션 파일/백필 SQL은 조사에서 확인하지 않음.

### 옵션 3 — 모델 유지 + 브리지 활용 + UX 개선 (중도)

- **개념:** 주 국적 스칼라는 현대국가로만 두고, 역사국가는 소속(affiliation)으로만 표현하되, `HistoricalCountryModernCountry` 브리지로 현대국가를 자동 매핑해 다운스트림(카운트·이름순서·배지 링크)을 현대국가로 해석. 옵션 1의 UX 개선을 포함.
- **변경 파일군:** 프론트 UX(옵션 1과 동일) + 다운스트림 해석부(`person-detail-panel.tsx` 배지 라우팅을 브리지 현대국가로, 가계도 국기 폴백 추가). 백엔드 스키마 변경 없음.
- **마이그레이션:** 불필요(브리지·시드는 이미 존재).
- **다운스트림 파급:** 중간 — 브리지가 없는 역사국가(현대 미연결)는 여전히 사각지대(§4 #3·#4). 브리지 커버리지에 의존.
- **사용자 체감:** 주 국적은 여전히 "현대국가"가 정본이라, 순수 역사국가를 1급으로 다루고 싶은 요구와는 철학적으로 어긋날 수 있다.

## 6. 권고

**1단계 (즉시, 옵션 1):** 프론트 버그를 봉합한다. `handleCountrySelect`를 추가-소속 핸들러와 대칭이 되도록 `isHistorical`을 받게 고치고(현재 계약 위반 명시적 제거), 국적 피커에 "역사국가 선택 가능" 힌트와 '역사' 탭 가시성을 높인다. 이는 마이그레이션·SDK 재생성 없이 사용자 체감 문제("현대밖에 없다")를 바로 해소한다. 동시에 국적이 역사국가일 때 `PlaceAutocomplete` 빈 목록 UX를 최소 보완한다.

**2단계 (병행 조사):** §4의 다운스트림 #1(깨진 상세 링크)이 실제로 재현되는지 브라우저로 확인하고, `countryAffiliations` 배열 항목의 미검증 FK가 500을 유발하는지 런타임 검증한다. 둘 다 사용자에게 실질 피해가 되는 확정 결함 후보다.

**3단계 (구조 결정):** Person을 선례(Event/Tenure/Reign/Organization)에 맞춰 `historicalCountryId` first-class로 승격할지(옵션 2) 아니면 브리지 해석으로 유지할지(옵션 3)를 결정한다. 선례 일관성·다운스트림 근치 측면에서 **옵션 2가 정합적**이나, 백필 마이그레이션·이중화 해소·nestia 재생성 범위가 크므로 2단계 결과로 피해 규모를 확인한 뒤 착수한다. 스키마는 반드시 `libs/db/prisma/person.prisma` 소스부터 수정하고 `run-migrate.ts`로 빌드해야 하며(schema.prisma 직접 수정 금지), 병렬 스키마 WIP 드리프트를 피하기 위해 트리 정리 후 진행한다.

### 결정이 필요한 열린 질문

- 주 국적을 "역사국가 1급"으로 승격할 것인가, 아니면 "항상 현대국가로 정규화하고 역사는 소속으로만" 유지할 것인가(옵션 2 vs 3의 철학).
- 옵션 2 채택 시 기존 `CITIZENSHIP priority=0` affiliation 슬롯을 유지(호환)할지 폐기(단일화)할지.
- `HistoricalCountry.defaultNameDisplayOrder` 부재로 인한 이름순서 폴백(§4 #3)을 스키마에 컬럼을 추가해 풀지, 브리지 주입으로 유지할지.

### 미확인/추가확인 필요 (조사자 gaps 정직 표기)

- 행정구역이 현대 Country에만 종속인지 스키마 최종 확인 안 됨(PlaceAutocomplete 부작용 confidence medium).
- 역사국가를 주 국적으로 저장→재편집하는 **런타임 왕복 미실행**(4경로 정적 추적 일치는 확인).
- `countryAffiliations` 미검증 FK의 P2003/500 **런타임 재현 안 함**.
- 사용자 실제 DB에 britain 시드 적용 여부(잉글랜드 왕국 행 존재 여부) 미확인 — 없으면 먼저 생성 필요.
- `CreatePersonDto.countryId`가 `@IsUUID` 등으로 역사국가 id를 통과시키는지 DTO 데코레이터 세부 — 조사 B는 `@IsOptional @IsString`뿐이라 통과한다고 봤으나(`create-person.dto.ts:444-449`) 조사 C는 "추가 확인 필요"로 남김.
- 상세 배지 깨진 링크(#1)·역사국가 상세 전용 라우트 존재 여부 브라우저 미확인.
- 전역 인물 검색/필터의 `countryId` 스칼라 의존 여부, 리더보드 프론트의 현대/역사 버킷 렌더 미확인.
