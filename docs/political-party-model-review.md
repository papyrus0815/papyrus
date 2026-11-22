# 정당 데이터 모델 — 한 번에 제대로 (설계 검토)

2026-11-22. 출발점: 나무위키 「국가 파시스트당」 문서에 들어가는 정보가 최소한 모두 들어가야 한다.
원칙: 그 문서 하나를 메우는 땜질이 아니라, 앞으로 들어올 **모든 시대·모든 체제의 정당**을 받는 구조를 한 번에 만든다.

---

## 1. 왜 칸 추가로는 안 되는가

나무위키 인포박스를 컬럼으로 1:1 옮기면 첫 문서는 메워지지만 둘째 문서에서 무너진다. 정당 정보의 대부분은 **시간에 따라 바뀌고, 여러 개이며, 근거가 갈린다.**

| 성질 | 예 | 컬럼 하나로 담으면 |
|---|---|---|
| 시간에 따라 바뀐다 | 당사 팔라초 브라스키 → 팔라초 리토리오, 청년단 AGF(1921–26) → ONB(1926–37) → GIL(1937–43), 이름 변경, 좌경화·우경화 | 마지막 값만 남고 이력이 사라진다 |
| 여러 개다 | 이념 13개, 표어·당가, 당기·로고·상징 이미지, 산하 조직 7개 | 쉼표로 이은 문자열 → 검색·연결 불가 (지금 이념 62종 중 '입헌주의·의회개혁·자유무역·반(反)절대왕권'이 한 태그) |
| 근거가 갈린다 | 당원 600만(1939) — 공식 발표 vs 연구자 추산, 창당 1919 vs 1921 | 값 하나만 남고 출처가 없다 |
| 다른 엔티티다 | 기관지(신문)·검은 셔츠단·대평의회·발릴라 | 이름 문자열 → 인물 경력·사건·부대와 연결 불가 |

그래서 기준은 **"정당 = 정체성 핵심(평평한 칸) + 시간을 가진 사실들(곁가지 표) + 다른 엔티티와의 연결 + 근거 있는 수치"** 로 잡는다.

## 2. 이미 있는 토대 (새로 만들지 않고 쓴다)

| 토대 | 있는 것 | 정당에 쓰는 법 |
|---|---|---|
| **근거(evidence.prisma)** | Source·Citation·MetricDefinition·Observation — 범위·근사·채택/대안/논쟁·구조화 날짜(BC 가능)·출처 필수 | 당원 수·득표 외 의석·재정 등 **모든 수치**. 대상 타입에 `POLITICAL_PARTY` 추가 |
| **조직(organization.prisma)** | Organization(계보·하위 계층·인물 직책·별칭·사건), MediaCareer→Organization | 기관지·청년단·여성단·대평의회·국제 조직 = **Organization 행**. 정당과는 역할 있는 연결 |
| **군부대(military.prisma)** | MilitaryUnit(역사 국가 dual FK) | 준군사조직이 정규 무력이 된 경우(MVSN·SS) 부대로 |
| **정당 계보** | PoliticalPartyTransition(승계·합당·분당·연속) | 그대로. 전투 파쇼 → 국가 파시스트당(1921 승계) → 공화 파시스트당 |
| **당원 소속** | PoliticalPartyMembership(분류·지도부 위계·직함·기간) | **당직의 정본**. 두체·서기장 |
| **사건–정당** | EventPoliticalPartyRelation(창당·해산·주체 역할·진영) | 로마 진군·해산 |
| **선거** | ElectionPartyResult · ElectionAlliance(신설) | 의석·득표·선거 연합 |
| **구조화 날짜 규약** | sovereign_reign·dynasty·observation의 era/year/month/day+precision | 정당의 모든 기간에 같은 규약 (DATETIME은 AD1000+만 안전) |

## 3. 버리는 것 · 하지 않는 것 (결정)

1. **나무위키 필드를 컬럼으로 1:1** — 위 1절 이유로 기각.
2. **EAV(키–값 표)·`extra` JSON에 사실 저장** — 타입·검증·검색·연결이 없다. 기각.
3. **산하 조직을 이름 문자열로** — 기관지 편집장 경력, 청년단 지도자, 부대 지휘관과 끊긴다. 대신 **입력 중 인라인으로 Organization을 만들게** 해서 엔티티를 강제한다.
4. **수치용 정당 전용 표(당원 수 표 등)** — 근거 도메인을 우회하면 출처·범위·학설 대립을 다시 만들어야 한다. 기각.
5. **정당 = Organization 1:1 브리지(기업 방향 B 재현)** — 기업은 사건·경력 연결이 없어 브리지가 이득이었지만, 정당은 별칭·당원·계보·사건 연결을 이미 자기 모델로 갖고 있어 브리지는 중복만 만든다. 기각. 정당은 독립 정본, 조직과는 **연결**로.
6. **PoliticalPartyLeadership 부활** — 0행·쓰기 API 0. 지도부는 PoliticalPartyMembership(LEADERSHIP)이 이미 정본. **테이블 제거**.
7. **연계 조직 표의 `OrganizationRelationType` 재사용** — 국제기구용 분류(전문기구·옵서버)라 '청년단·기관지·준군사'를 표현 못 한다. 0행이라 갈아엎는다.

## 4. 목표 모델

### 4.1 정당 본체 (PoliticalParty) — 정체성 핵심만

| 칸 | 변경 |
|---|---|
| `name`, `shortName`, `localName` | 유지 — **대표 표기 캐시**. 이력·번역은 4.2 |
| `kind` **(신설)** | `PARTY` 근대 정당 · `MOVEMENT` 운동(전투 파쇼) · `FACTION` 붕당·파벌(동인·서인·노론, 옵티마테스) · `PARLIAMENTARY_GROUP` 의회 클럽·교섭단체 · `ELECTORAL_LIST` 공동 명부(B안 연합) · `OTHER` |
| 창당·해산 **구조화 날짜 (신설)** | `founded{Era,Year,Month,Day}`·`dissolved{…}` + precision 서버 파생. 기존 `foundedDate`/`dissolvedDate`는 정렬 캐시로 유지(재위 정공법과 동일). 옵티마테스(BC)·토리(1678년경)·붕당(1575) 수용 |
| `position`, `ideology`, `headquartersCityId`, `logoUrl`, `brandColor` | 유지 — 각각 4.3·4.6·4.5의 **대표값 캐시**(서비스가 대표 행 변경 시 같은 트랜잭션에서 갱신). 목록·차트·정렬이 조인 없이 돈다 |
| `colorPalette` **(신설)** | 상징색 여러 개(#RRGGBB 배열, 검증). `brandColor`는 차트용 하나 |
| `description` | 유지(서식 글) |

### 4.2 이름 (PoliticalPartyAlias 확장)

- 유형: `OFFICIAL`(그 기간의 공식명 — 개명 이력) · `TRANSLATION`(영문 National Fascist Party) · `COMMON`(통칭 '파시스트당') · `ACRONYM` · `LOCAL_NAME` · `FORMER_NAME`(호환)
- `languageCode`, 기간(구조화), `isPrimary`(언어별 대표), `note`('국민·민족 파시스트당'이라는 번역도 드물게 쓰임)
- **개명 vs 새 정당 규칙**: 법적 동일성이 이어지면 같은 정당의 `OFFICIAL` 이력, 합당·재창당이면 새 정당 + 계보.

### 4.3 이념·스펙트럼

- **이념 카탈로그(Ideology) 신설** — 이름·원어·영문, 상위 이념(파시즘 ⊃ 이탈리아 파시즘), 설명. 정당·조직·인물이 함께 쓴다(이후 확장).
- **PoliticalPartyIdeology** — 정당 × 이념, `isPrimary`, 기간, 순서. '조합주의 정당 전부' 같은 가로 질의가 된다.
- **PoliticalPartyPositionPeriod** — 스펙트럼의 기간별 변화(+근거 메모). `position` 칸은 현재/대표 캐시.
- 기존 이념 텍스트(39개 정당, 62종 태그)는 **카탈로그로 이관**(가운뎃점 뭉침 분해 포함), 검증 후 텍스트는 읽기 전용 레거시.

### 4.4 법적 지위 (PoliticalPartyStatusPeriod 신설)

`LEGAL` · `SOLE_LEGAL`(유일 합법 정당 — PNF 1926/28~, NSDAP 1933~) · `RULING_STATE_PARTY`(당-국가) · `BANNED` · `UNDERGROUND` · `IN_EXILE` · `SUSPENDED` · `CONSTITUTIONALLY_DISSOLVED`(통합진보당 2014) + 기간 + 근거 법령(Law)·사건(Event) 연결.
국가의 `PartySystem`(일당제)과 짝: 국가는 '체제', 정당은 '그 체제에서의 자리'.

### 4.5 당사·표지·표현

- **PoliticalPartyHeadquarters** — 도시(FK), 건물명(팔라초 브라스키), 주소, 기간, 메모. 이전 이력.
- **PoliticalPartySymbol** — 종류 `LOGO`·`FLAG`·`EMBLEM`(파스케스)·`BALLOT_SYMBOL`(인도 국민회의 손바닥)·`PHOTO`·`POSTER`, 이미지, 캡션, 기간, 대표 여부. `logoUrl`은 대표 LOGO 캐시.
- **PoliticalPartyExpression** — 종류 `MOTTO`·`SLOGAN`·`ANTHEM`·`PARTY_SONG`·`SALUTE`, 원문·언어·번역, 기간, 음원/악보 URL, 대표 여부. ("Credere, Obbedire, Combattere" / 믿고, 따르고, 싸우라 · Giovinezza)

### 4.6 당직(지도부) — PoliticalPartyMembership 보강

- `officeKind` **(신설)**: `LEADER`(당수·두체) · `CHAIR` · `SECRETARY_GENERAL`(서기장) · `DEPUTY` · `PARLIAMENTARY_LEADER` · `SPOKESPERSON` · `TREASURER` · `HONORARY` · `OTHER`. 직함 문자열('두체')은 `roleTitle`로 그대로.
- `ordinal`(제N대), `isFounder`(창당 발기인).
- 규칙: **당직 = 당원 소속 행**, **기구의 구성원(정치국원·대평의회 위원) = 그 기구(Organization)의 인물 직책**. 두 곳에 같은 사실을 넣지 않는다.

### 4.7 산하·연계 조직 (PoliticalPartyOrganization 재구성)

| 칸 | 내용 |
|---|---|
| `role` (신설 enum, 기존 relationType 대체) | `GOVERNING_ORGAN`(대평의회·중앙위·정치국) · `YOUTH_WING` · `STUDENT_WING` · `WOMEN_WING` · `PARAMILITARY_WING` · `OFFICIAL_MEDIA`(기관지) · `THINK_TANK`/`FOUNDATION` · `TRADE_UNION` · `REGIONAL_BRANCH`(바트당 지역 지도부) · `OVERSEAS_BRANCH` · `PARLIAMENTARY_GROUP` · `INTERNATIONAL_MEMBERSHIP`(코민테른·사회주의 인터내셔널) · `ALLIANCE_MEMBERSHIP`(인민전선 등 지속 연합) · `OTHER` |
| 대상 | `organizationId` **또는** `militaryUnitId` (정확히 하나 — DB 체크 + 서비스 검증) |
| 기간 | 구조화 날짜 |
| 메모 | 자유 |

- OrganizationType에 `MEDIA`(신문·방송·출판) · `POLITICAL_ALLIANCE`(지속 연합) 추가. 기관지 '이탈리아 인민'(1914 창간 — 당보다 먼저)은 MEDIA 조직, 무솔리니의 창간·주필 이력은 기존 MediaCareer/인물 직책으로.
- 청년단 3개는 조직 3행 + 연결 3행(각 기간) + 조직 계보(AGF → ONB → GIL)로.
- UI는 '조직 선택 또는 이름 입력 → 즉석 생성'(유형은 역할에서 추정, 국가는 정당에서 상속).

### 4.8 정당 사이의 비(非)계보 관계 (PoliticalPartyLink 신설)

`SISTER_PARTY`(CDU–CSU) · `SATELLITE_OF`(위성정당) · `FACTION_OF`(당내 계파·붕당 내 분파) · `PARLIAMENTARY_UNION`(공동 교섭단체) + 기간. 계보(Transition)는 '어디서 왔나', 이건 '함께 있었나'.
ElectionAlliance에 `allianceOrganizationId?` — 선거마다의 연합이 지속 연합(POLITICAL_ALLIANCE 조직)의 한 회차임을 표시.

### 4.9 수치 — 근거 도메인으로

- `ObservationSubjectType.POLITICAL_PARTY`, `CitationTargetType`에 정당·정당 곁가지 행 추가.
- 지표 시드: `party.members`(당원 수) · `party.seats`(원 지정 qualifier) · `party.finance.income` 등.
- 당원 600만(1939, 공식 발표 · 채택)과 다른 추산(대안)을 나란히, 출처 필수.

### 4.10 (교차 도메인) 의회·원(院)

'400/400석(1929)'은 **어느 원의** 의석인지가 빠져 있다. 왕국 상원은 임명직이라 선거 집계로는 못 담는다.
→ **Chamber 카탈로그**(국가별 하원·상원·지방의회, 정원, 선출/임명) + `Election.chamberId` + 선거 사이 의석 변화(탈당·임명)는 Observation(`party.seats`, 대상 원 qualifier → Chamber FK 승격). 정당 작업과 독립 트랙으로 설계.

### 4.11 출처

곁가지 행 모두 Citation 대상. 나무위키 같은 3차 출처는 `Source(kind=WEBSITE, tier=TERTIARY)`로 정직하게 표시.

## 5. 검증 사례 — 이 모델이 받아야 하는 정당들

| 사례 | 시험하는 것 |
|---|---|
| 국가 파시스트당 | 전 항목(인수 기준) — 이름 4종·표어·당가·당사·청년단 3기·준군사·기관지·대평의회·유일 합법·당원 수·전신/후신 |
| 나치당(NSDAP) | SA(조직)·SS(부대 성격) 이중, 히틀러 유겐트, 지역 대관구(REGIONAL_BRANCH), 1933 유일 합법 |
| 소련 공산당 | 정치국·중앙위 기구 계층과 구성원, 서기장 대수, 코민테른 가입, 콤소몰, 프라우다, 당원 수 시계열 |
| 조선 붕당(동인·서인·노론·소론) | `FACTION`, 분당 계보, 학파 이념, 선거 없음, 1575 날짜 |
| 로마 옵티마테스·포풀라레스 | BC 구조화 날짜 |
| 더불어민주당 | 잦은 개명(OFFICIAL 이력)·합당·위성정당(SATELLITE_OF)·싱크탱크·원내대표 |
| 통합진보당 | 헌재 해산(CONSTITUTIONALLY_DISSOLVED + 사건·법령) |
| CDU/CSU | 자매 정당·공동 교섭단체 |
| 인도 국민회의 | 투표 상징(BALLOT_SYMBOL) |
| 바트당 | 초국가 정당의 국가별 지역 지도부 |
| 1921 이탈리아 국민 블록 | ElectionAlliance + 지속 연합 조직 연결 |

## 6. 실행 순서 (배치마다 스키마·API·화면·스펙·실데이터 검증을 한 번에)

| 배치 | 내용 | 의존 |
|---|---|---|
| B1 정체성 | 구조화 창당·해산 날짜(+백필) · `kind` · 이름 이력(Alias 확장 + CRUD/UI) · 법적 지위 기간 | — |
| B2 이념 | 이념 카탈로그 · 정당–이념 · 스펙트럼 기간 · 62종 태그 이관 | B1 |
| B3 조직·당직 | 연계 조직 재구성(role·조직/부대) · OrganizationType MEDIA/POLITICAL_ALLIANCE · 인라인 조직 생성 · 당직 `officeKind`/`ordinal`/`isFounder` · Leadership 테이블 제거 | B1 |
| B4 표지·표현·당사 | Symbol · Expression · Headquarters · colorPalette | B1 |
| B5 수치·출처 | Observation/Citation 대상 확장 · 지표 시드 · 상세 시계열 | B1 |
| B6 관계 | PoliticalPartyLink · ElectionAlliance↔지속 연합 | B3 |
| B7 의회·원 | Chamber 카탈로그 · Election.chamberId · 의석 스냅샷 | 별도 트랙 |
| B8 상세 지면 | 인포박스(데이터에서 생성) + 섹션 재편 + 등록 모달 확장 · **국가 파시스트당 완전 입력을 인수 시험으로** | B1–B6 |

## 7. 결정 (2026-11-23, 사용자 '권장')

1. 이념 카탈로그는 **정당·조직·인물 공용**.
2. 정당과 곁가지의 모든 기간은 **구조화 날짜**(era/year/month/day + 서버 파생 precision). 본체 창당·해산만 AD1000+ DATETIME 거울 유지.
3. 의회·원(B7)은 설계만 지금, 구현은 정당 배치(B1–B6) 뒤 별도 트랙.

## 8. 진행

### B1 정체성 — 구현 완료(미커밋)
- 마이그레이션 `20261123010000_political_party_identity` — `kind` · `founded*`/`dissolved*` 구조화 10칸 · 별칭 확장(OFFICIAL/TRANSLATION/COMMON, isPrimary·note·sortOrder·구조화 기간, DATETIME 두 칸 제거) · `political_party_legal_status` 신설(법령·사건 연결, isCurrent).
  `run-migrate`는 shadow DB 재생(20261021025955 FK)에서 죽어 `migrate diff` → 무관 드리프트 2줄 제외 → `db execute` + `migrate resolve --applied`.
- 백필: 거울 DATETIME → 구조화. **1월 1일·12월 31일은 연 정밀**(이탈리아 시드의 연도만 값 7건) · 나머지 29건 일 정밀 · 별칭 1건(스파르타쿠스단 1916 ~ 1918-12-30).
- API: 정당 생성·수정이 `kind`·`founded`/`dissolved`(구조화) 수용, 구 ISO `foundedDate`는 호환 경로(빠른 등록). `/political-parties/:id/aliases`·`/legal-statuses` CRUD(대표 1개 보장·이름 중복 409·언어 코드·역전·법령/사건 존재 검사, BC 인지 정렬). 공용 `party-structured-date.util`.
- 웹: 등록 모달 '종류' 칩 + 창당·해산 칸을 연도만·기원전 되는 칸으로(`PeriodDateField`를 shared로 승격) · 상세에 「이름」「법적 지위」 섹션과 모달 · 날짜 표시는 전부 `shared/lib/party-dates`(정밀도·BC 인지) — 거울을 직접 읽던 국가 정당 지면·전역 편람 둘 다.
- 실데이터: 국가 파시스트당 이름 4건(National Fascist Party·파시스트당·국민/민족 파시스트당+번역 메모)·법적 지위 3건(합법 1921.11.9–1926.11 → 유일 합법 1926.11–1943.7.27 → 불법화 1943.7.27–).
- 검증: API 단위 19·실API 왕복 16/16(BC 붕당 생성·역전·대표 유일·409·BC 정렬·연쇄 삭제) · 웹 스펙 26(구조화 날짜 저장·없는 날짜·이름/지위 모달·날짜 헬퍼) · tsc 기준선 동일 · 변경 줄 lint 0 · 1440px 화면 확인.

### B2 이념 — 구현 완료(미커밋)
- 마이그레이션 `20261123030000_ideology_catalog` — `ideology`(이름 전역 유일·영문·범주 사상/정책 노선/이익 대변/기타·상위 개념) · `ideology_alias`(표기 변형, 전역 유일) · `political_party_ideology`(대표·순서·구조화 기간·메모, 쓰이는 이념은 삭제 Restrict) · `political_party_position_period`(스펙트럼 기간, 지속 중 1개).
  (적용 사고: sed 실패로 빈 SQL이 적용 기록됨 → 파일 재작성·실행 후 `_prisma_migrations.checksum`을 파일 sha256으로 갱신, `migrate status` up to date)
- 시드 `ideology.catalog.seed`(+`scripts/run-ideology-catalog-seed.ts`, 멱등): 카탈로그 72개·별칭 6개, 정당 35곳 이관(쉼표 → 통째로 모르는 조각만 가운뎃점 분해), '선거연합'은 이념이 아니라 kind=ELECTORAL_LIST로, 국가 파시스트당은 나무위키 인포박스 13종 완비(조합주의·자급자족주의·제3의 위치·군주제 보강).
- 정본/캐시: 연결이 정본, `political_party.ideology` 문자열은 연결 순서대로 이은 **표시 캐시** — 연결을 바꾸는 모든 길(정당 생성·수정, PUT/PATCH/DELETE 연결, 카탈로그 개명, 시드)이 `party-ideology.util`로 같은 규칙에 다시 쓴다. 옛 문자열 입력(빠른 등록)은 서버가 카탈로그로 풀어 연결.
- API: `/ideologies` CRUD(이름·영문·별칭 검색, 이름/별칭 충돌 409, 상위 순환 400, 쓰이는 이념 삭제 409) · `/political-parties/:id/ideologies`(GET·PUT 집합 — 남는 연결의 기간·메모 보존·PATCH·DELETE, 대표 1개) · `/position-periods` CRUD(지속 중 저장 → 정당 대표 position 동기화).
- 웹: 이념 고르기(`widgets/ideology/ideology-picker` — 이름·영문·표기로 찾기·없으면 즉석 생성·첫 칩 대표·콤보박스 키보드) · 카탈로그 행 고치기 모달 · 정당 모달의 키워드 칸 대체 · 상세 「이념·스펙트럼」(연결별 시기·메모·대표, 카탈로그 이동, 스펙트럼 기간).
- 남김: 조직·인물 × 이념 연결 표는 카탈로그만 공용으로 두고 각 지면 작업 때(Organization.ideology 문자열 1건).
- 검증: API 단위 12 · 실API 16/16 · 웹 스펙 23 · tsc 기준선 동일 · 신규 lint 0 · 1440px 화면(13종·상위·영문, 선택기 목록이 모달 스크롤에 잘리던 것 → 흐름 배치 + 자동 스크롤로 수정).

### B3 조직·당직 — 구현 완료(미커밋)
- 마이그레이션 `20261123050000_party_organizations_offices` — `political_party_organization` 재구성(0행: 역할 14종 · organizationId|militaryUnitId 정확히 하나는 서비스 검증(Prisma에 CHECK 없음) · 구조화 기간 · 메모) · OrganizationType 5종(당 기구·대중 조직·준군사조직·언론·출판·정치 연합·인터내셔널) · 당원 소속에 officeKind·officeOrdinal·isFounder + 구조화 기간(거울 DATETIME 유지, 8행 백필) · `political_party_leadership` 제거(0행).
  (migrate diff가 unique 인덱스 교체로 떨어뜨린 정당 FK를 다시 걸지 않아 적용 후 재diff로 찾아 같은 마이그에 추가. 무관 드리프트 medical_career FK·event_political_party_relation 2줄은 제외)
- 지도부 표 제거 여파: 관계 그래프(당원 소속 LEADERSHIP을 '당직' 엣지로) · 인물 상세 `partyLeaderships`(LEADERSHIP 소속에서 파생, 같은 키) · 경력 힌트 · 정당 _count.
- API: `/political-parties/:id/organizations` CRUD(즉석 조직 생성 — 유형은 역할에서, 국가는 정당에서, 국제 가입은 국제 범위 · 같은 이름 409 · 기업·행정기관·정당 유형 제외) · `/organization-candidates`(조직: 이름·약칭·현지어·별칭 / 군부대: 이름·영문) · 당원 소속 API가 구조화 start/end·당직·발기인 수용(ISO는 호환 경로, 비지도부면 당직 비움).
- 웹: 「산하·연계 조직」(역할별 묶음, 조직 지면·부대 지면으로 이동, 연결 풀기는 조직을 남김) · 「소속 인물·당직」을 등록·수정 모달로(당직 종류·대수·위계·직함·발기인·연도만/기원전 기간) — **정당 지면과 인물 지면이 같은 모달**(`widgets/political-party/party-membership-form-modal`, 정당 고정|인물 고정). 인물 지면의 옛 폼은 'YYYY-MM-DD'만 다뤄 정당 지면에서 넣은 '1921년'을 일 정밀로 덮어쓰던 손상 경로라 제거. 곁가지 공용 부품은 `widgets/political-party/party-sidecar-parts`로.
- 조직 유형 라벨: 웹 4곳의 사본(조직 탭 상수·사이드바·경력·학력 모달)이 `shared/api/organizations` 정본을 다시 쓰게 — 유형을 늘릴 때 어긋나지 않게.
- 실데이터: 국가 파시스트당 산하 조직 7건(파시즘 대평의회·검은 셔츠단·청년 조직 3기·여성 단체·기관지 이탈리아 인민 — 이름·기간은 나무위키 인포박스).
- 남김: 무솔리니(두체) 당직은 인물 행이 없어 미입력 · 이탈리아 전투 파쇼가 조직(NGO)으로 있음 → 정당(kind=MOVEMENT)+계보로 옮길 데이터 작업 · 청년 조직 3기 사이의 조직 계보(AGF→ONB→GIL).
- 검증: 실API 20/20 · API 스펙 176 · 웹 스펙(소속 모달 4·인물 상세 28·정당 23) · tsc 기준선 동일 · 변경 줄 lint 0 · 1440px 화면.

### B4 표지·표현·당사 — 구현 완료(미커밋)
- 마이그레이션 `20261123070000_party_marks_expressions_hq` — `political_party_symbol`(로고·당기·상징물·투표 상징·사진·포스터, 대표·캡션·구조화 기간) · `political_party_expression`(표어·구호·당가·당 노래·인사법, 원문·언어·번역·음원 링크·대표·기간) · `political_party_headquarters`(도시 FK 선택·건물·주소·기간·지속 중 1개) · `political_party.color_palette`(JSON #RRGGBB 배열). 기존 logo_url 1건 → 대표 LOGO 표지로 백필.
  (새 표의 city FK 기본 이름이 political_party.headquarters_city_id FK와 겹쳐 `map: "party_hq_history_city_id_fkey"`)
- 캐시: `logoUrl` = 대표 LOGO 표지(정당 폼의 로고 업로드는 대표 LOGO를 만들거나 바꾸고, 지우면 대표 표시만 끈다 — 이력 보존), `headquartersCityId` = 지속 중 당사(없으면 가장 늦게까지 쓴 당사)의 도시. 둘 다 `party-marks.util` 한 곳. 정당 API의 `headquartersCityId` 쓰기는 무시(이력이 정본).
- API: `/symbols`·`/expressions`·`/headquarters` CRUD(종류별 대표 1개, 이미지·링크 형식, 언어 코드, 역전, 도시 존재, 당사는 도시·건물·주소 중 하나) · 정당 생성·수정의 colorPalette 검증(최대 12, 대문자·중복 제거).
- 웹: 정당 상세 「표지」(썸네일 격자·업로드 또는 주소)·「표어·당가」(원문 기울임·언어·번역·음원 링크; 노래는 '제목' 라벨)·「당사」(도시 검색·건물·주소·지금의 당사) · 정당 모달 '상징색' 칩 편집.
- 실데이터: 국가 파시스트당 표어 Credere, Obbedire, Combattere(믿고, 따르고, 싸우라)·당가 Giovinezza(청춘이여)·당사 팔라초 브라스키(로마 — 도시 목록에 로마가 없어 주소로)·상징색 검정.
- 남김: 당기·로고·파스케스 이미지(파일·라이선스 확인 후 B8) · 로마 도시 행.
- 검증: 실API 16/17(1건은 테스트 순서 오류 — 지속 중 당사는 끝을 비운다는 규칙대로 동작) · API 스펙 15 · 웹 스펙 14 · tsc 기준선 동일 · 신규 lint 0 · 1440px 화면.

### B5 수치·출처 — 구현 완료(미커밋)
- 마이그레이션 `20261123090000_party_evidence_targets` — 측정값 대상에 `POLITICAL_PARTY`, 인용 대상에 정당 본체와 곁가지 9종(이름·법적 지위·이념·스펙트럼 기간·산하 조직·소속·표지·표현·당사). 정당 전용 수치·출처 표는 만들지 않았다.
- 지표 카탈로그(시드 `evidence.metric-catalog`)에 `politics` 3종: 당원 수(COUNT·LATEST·person) · 지부 수(COUNT·LATEST·branch) · 당 재정 수입(MONEY).
- API: 근거 도메인 측정값 API가 정당을 대상으로 받음(정당은 공유 정본이라 소유 검사 없음) · `/political-parties/:id/citations` GET(정당 전체를 대상별로 한 번에)·PUT(한 대상의 인용을 목록과 같게 — CitationService.sync 자연키 머지, 클래스 DTO로 새 출처까지 전역 검증) · **정리**: 곁가지 행 삭제·이념 집합 축소·당원 소속 삭제·정당 삭제가 같은 트랜잭션에서 인용(과 정당 측정값)을 지운다(`party-evidence.util` — 다형이라 FK CASCADE가 없다).
- 웹: 인용 목록 편집기(`widgets/evidence` — 서고 검색·새 출처·위치·근거 구절) · 출처 모달 · 정당의 모든 기록 행에 '출처 N' 단추(정당 하나의 인용을 한 번에 받아 행마다 개수) · 기본 정보(창당·해산·종류·스펙트럼) 출처 줄 · 「수치」(지표별·시점 순, 채택/대안·산출 방식·단서·출처 미검증 표시) + 측정값 모달.
- 실데이터: 출처 「국가 파시스트당 — 나무위키」(웹·3차·열람 2026-11-22)를 나무위키에서 온 기록 28곳에 인용(기본 정보·이름 4·이념 13·산하 조직 7·표어·당가·당사) · 당원 수 6,000,000(1939, 인포박스 값 — 산출 방식은 문서에 없음). 법적 지위 3건은 나무위키 밖 내용이라 출처 미검증으로 남김.
- 남김: 인물 삭제(당원 소속 CASCADE) 경로의 PARTY_MEMBERSHIP 인용 정리 · 1차·2차 출처 보강.
- 검증: 실API 11/11(새 출처·재사용·남의 대상 404·정당 밖 대상 400·잘못된 출처 400·통화 필수·행 삭제/정당 삭제 시 인용·측정값 정리) · API 스펙 44 · 웹 스펙 64 · tsc 기준선 동일 · 신규 lint 0 · 1440px 화면.
