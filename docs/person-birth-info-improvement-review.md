# 인물 출생 정보 기입 개선 리뷰 (사망 대비 비대칭)

> 2026-07-03. 불만: "사망 관련 정보는 기입할 수 있는데 출생 관련 정보는 기입하지 못한다."
> 5개 지면 실태조사(백엔드 계약·등록모달·상세지면·소비처·도메인 완전성) → 3렌즈 개선안 → 항목별 적대 검증(갭 실재 + 설계 적합) → 완전성 비판. 제안 15건 전원 검증 통과(기각 0), 판정 수정(MODIFY 10건) 반영 후 circa 경합 2안을 병합해 최종 **14건 + 보강 6건**.
>
> **구현 현황(2026-07-04, 미커밋):** 배치 1(1-1은 병렬 WIP가 선반영, 1-2·1-3·1-4 완료)·배치 2-1(출생지 이동·adminDivisionId 잔존 결함)·배치 2-2(a)(카드 미상·서출 배지) 구현. API 빌드 성공·web tsc 0·변경 파일 lint 0. 배치 3(마이그레이션)은 방침대로 트리 정리 후로 보류, 배치 2-2(b~d)·2-3·2-4·배치 4 미착수.

## 1. 요약

"출생 정보를 기입하지 못한다"는 체감의 실체는 **세 층의 복합**이다.

1. **스키마**: 사망은 서사 3종(`deathType` enum 9값·`deathCause` varchar300·`deathNote` text)이 스키마→DTO→컨트롤러→응답 전 구간을 통과하는데, 출생 서사를 담을 컬럼이 **하나도 없다**(`person.prisma:158-164` vs `140-146`). era·날짜·미상토글·장소(city/행정구역/자유텍스트)는 완전 대칭 — 비대칭은 정확히 '상황·서사' 계열에 집중돼 있다.
2. **버그**: 출생 상황을 담는 유일한 필드 `illegitimate`(사생아)가 DTO·도메인 인터페이스·응답 매핑까지 완비돼 있는데 **컨트롤러 create/update 화이트리스트에서만 탈락**해(`person.controller.ts:795-841,902-952` 내 grep 0건), 가계도 배치2에서 출시한 저작 체크박스 값이 서버에서 조용히 버려진다. 로컬 DB 실측 `illegitimate=true` **0행**이 실증.
3. **UI**: 출생지 3필드는 기입 가능한데 '더 입력' 토글 뒤 '소속·가문' 섹션에 은닉돼(생애 섹션의 출생 열은 날짜뿐) 발견성이 죽어 있고, 표시도 출생 카드 2요소 vs 사망 카드 6요소(향년 배지 포함)·연보 출생 노드는 출생지조차 미소비 — **"기입해도 안 보이니 기입할 게 없다"**는 되먹임.

구조 전체가 사망 편향임도 실측으로 확인됐다: 사망 서사 70~81% 채움율은 모달 저작이 아니라 **사망 전용 백필 스크립트**(`apps/api/prisma/scripts/patch-death-info-batch1.ts` 등 4종)의 산물이고, 품질 감사 스크립트(`audit-person-quality.ts`)도 사망 필드만 감사한다. 출생판 파이프라인은 없다.

방향 원칙: **억지 대칭 금지**. '어떻게 죽었는가'(암살·처형·전사)는 역사적 분류 축이지만 출생에는 대응 축이 없다 — 출생 유형 enum을 만들면 UNKNOWN/OTHER만 채워지는 죽은 필드가 된다. 올바른 대칭은 **birthNote 하나**이고, 나머지는 대칭이 아니라 직교 확장(추정연도 circa, 적서 세분, 출생 서열)이다.

---

## 2. 진단 (실태조사)

### 2.1 계약 레이어 커버리지 매트릭스

| 항목 | 출생 | 사망 | 근거 |
|---|---|---|---|
| era (BC/AD) | 생성O·수정O·상세O·목록O | 동일 | `person.response.ts:16,20` |
| 날짜 (구조화+파생 연월일) | 전 구간 O | 동일 | `person.controller.ts:761-793,861-889` |
| 장소 3필드 (city/adminDiv/text) | 전 구간 O | 동일 | `person.prisma:215-225` 완전 대칭 |
| 미상 플래그 | 저장O·**응답은 /:id/detail만** | 목록까지 O | `person.response.ts:73`(사망만)·`repository:458` |
| 유형/원인/메모 | **전무 (스키마부터 없음)** | 전 구간 O | `person.prisma:45-56,158-164` |
| 상태 축 | (불필요 — 정상 비대칭) | isAlive 3-way O | `life-section.tsx:67` |
| 출생 상황 (illegitimate) | **컨트롤러에서 유실** | — | `controller:795-841,902-952` 부재 |

부수 결함: `deathCause`에 `@MaxLength(300)` 부재(300자 초과 시 400 대신 Prisma 500), 변경 알림 요약 '생몰년' 그룹에 `isBirthDateUnknown`·`illegitimate` 누락(`person.service.ts:148-152`), GET `/:id/detail` 인라인 타입과 `PersonResponseDto`의 계약 드리프트 기존재.

### 2.2 저작 UI (등록/수정 모달)

- 생애 섹션 출생 열 = 날짜+미상 토글만(`life-section.tsx:161-204`) vs 사망 열 = 3-way 라디오+날짜+향년+유형 칩 그리드+원인+메모(`:207-353`). 사망 유형은 essentials(코어)로 조건부 승격까지 돼 있다(`:294-296`).
- 출생지·사망지는 기입 가능하나 `moreOpen` 토글 뒤 AffiliationSection에 격리(`person-register-view.tsx:2303-2314`). '더 입력' 토글 desc 자체가 '사망 상세'만 명기해 출생 비대칭의 일부.
- 수정 프리필은 양쪽 완전(존재하는 출생 필드가 날짜·장소뿐이라서). 연도만 입력·BC 지원, **추정(circa) 표기는 양쪽 모두 불가**.
- 공통 결함: 수정 payload가 `adminDivisionId`를 명시 null로 안 덮어 행정구역 기반 장소를 비워도 서버에 잔존(`view:1529-1530,1622-1637`).
- 잔 비대칭: 출생·사망 오류 메시지가 `errors.birth || errors.death` 하나로 병합 렌더(`life-section.tsx:278-283`), 날짜 피커 자동 오픈·'출생지와 동일' 복사 버튼은 사망에만.

### 2.3 표시 지면

- 개요 출생 카드 2행(일자·장소) vs 사망 카드 최대 6요소(`birth-death-cards.tsx:60-80` vs `:82-117`). 미상 플래그는 양쪽 다 무언 생략(미입력과 구분 불가).
- 연보 출생 노드는 제목+날짜뿐 — props에 출생지 자체가 없어 **이미 있는 데이터도 미소비**(`person-life-timeline-infographic.tsx:432-441` vs 사망 `:669-686`).
- `illegitimate` 표시는 가계도 별표(*) 하나(`card.tsx:128,366`) — 상세 개요 미노출 dead-end.
- family-tree 노드에 `birthEra` 미포함 → BC 인물 연도가 AD처럼 읽힘(`repository:4752-4753`).
- 향년 계산 3중 구현(detail-panel 연도 뺄셈 era 미보정 / 연보 ageAt / tenure-person-utils) — 값 불일치 가능, native Date 기반(BC-unsafe).

### 2.4 데이터 실태 (로컬 DB 352명, 2026-07-03 실측)

| | 출생 | 사망 |
|---|---|---|
| 날짜 | 100% | 93% |
| 장소 | 46% | 74% |
| 유형/원인/메모 | (필드 없음) | 74% / 81% / 70% |
| 미상·illegitimate | 0명 / **0명** | — |

사망 채움율은 전용 스크립트 큐레이션 산물. **birthNote를 신설해도 감사·백필 파이프라인 없이는 352명의 출생 카드가 빈 채로 남아 체감 비대칭이 유지된다**(§4-D).

---

## 3. 개선안 (검증 통과 14건, 레버리지順 4배치)

모든 안은 적대 검증(갭 실재 반증 시도 + 설계 심판)을 통과했고, MODIFY 판정의 수정안을 반영한 최종형이다.

### 배치 1 — 선결 버그·계약 위생 (전부 S, 스키마 0, 즉시 가능)

**1-1. `illegitimate` 쓰기 유실 수정** (선결 키스톤)
`person.controller.ts` create(795-841)·update(902-952) 호출 객체에 `illegitimate: dto.illegitimate` 추가 — 나머지 레이어는 완비라 컨트롤러 두 줄이 전부. 기존 옵셔널 boolean(isAlive/deathType, `:917-923`) 패턴 그대로. 변경요약 그룹에도 추가(심판 의견: '생몰년'보다 fatherId/motherId가 있는 '관계' 그룹이 문구상 정확). 컨트롤러 매핑이 유일한 화이트리스트 깔때기임을 주석으로 명시. **후속 출생 필드 전부가 이 깔때기를 지나므로 §4-B 회귀 테스트와 짝**.

**1-2. `isBirthDateUnknown` 응답·변경요약 대칭**
`PersonResponseDto`(`:73` 옆)+repository 매퍼(`:458` 대칭 위치)+변경요약 키 추가, SDK 재생성(build:nestia noop — main() 직접 호출 우회). 매퍼와 요약 키는 순서 의존(매퍼 없이 키만 넣으면 normField 정규화 차이로 false-positive '생몰년 수정' 발생) — 반드시 한 묶음. 표시 지면 안(2-2)의 선행 계약.

**1-3. `deathCause @MaxLength(300)` + placeText `@MaxLength(255)`**
DB varchar와 DTO 검증 일치(현재 초과 입력 시 Prisma 500). class-validator 전역 파이프 활성 확인됨, SDK 재생성 불필요. 출생 필드 신설 시 반복하지 않을 기준 패턴 선행.

**1-4. 출생·사망 오류 표시 열 분리**
`errors.birth || errors.death` 단일 FieldError(`life-section.tsx:278-283`)를 각 열 개별 렌더로(role="alert" 유지). `computeBirthDeathErrors`는 이미 분리 반환·역전 오류는 `errs.death` 키잉이라 로직 변경 0. 원안의 '출생 열 전용 힌트'는 기각 — 연도만 입력은 양쪽 다 이미 지원되므로 출생에만 달면 새 비대칭.

### 배치 2 — 발견성·표시 대칭 (스키마 0)

**2-1. 출생지·사망지를 '생애 상세' 섹션으로 이동** (M)
AffiliationSection에 격리된 PlaceAutocomplete 2조+'출생지와 동일' 버튼을 details 모드 '생애 상세'로 이관(순서: 장소 → 사망 유형·원인·메모 → 군주 호칭). essentials 승격은 기각 — 비동기 검색 컴포넌트의 코어 승격은 점진노출 canon 위배. 필수 동반 3건: ① '더 입력' 토글 desc 갱신(현재 '사망 상세'만 명기 — 발견성의 나머지 절반), ② props가 실측 8개+라 처음부터 `sections/place-fields.tsx` 분리 추출, ③ 수정 payload에 `birthAdminDivisionId/deathAdminDivisionId: ... || null` 추가(잔존 결함 동시 수정, `view:1625-1637`).

**2-2. 출생 데이터 읽기 지면 대칭화** (M, 독립 배포 가능한 4조각)
(a) 개요 카드: 미상 시 '일자 미상' 명기(양쪽), illegitimate '서출' 배지 — 단 **detail 응답에 illegitimate가 현재 없어** 컨트롤러 getDetailById 반환 필드+`types.ts` 추가 필요(여전히 스키마 0). (b) 연보 출생 노드 subtitle=출생지(기존 응답 필드 폴백 로직 재사용, props 옵셔널). (c) family-tree 노드 `birthEra/deathEra` 추가 — BC 왜곡 수정. 렌더러 좌표는 `person-genealogy-infographic/utils.ts:27-45`+`card.tsx:355-356`+`genealogy.page.tsx:445-446`. **FamilyTreeResponseDto 계약 변경이므로 가계도 배치4(시각)와 묶어 SDK 재생성 1회**. (d) 공개 프로필 인물관 카드 '(1732–1799)' 생몰 서브라벨 — 순수 프론트 즉시 가능. birthNote 표시 슬롯 선제 구축은 기각(dead slot) — 3-1과 동일 PR로.

**2-3. 출생지↔BIRTH_PLACE 국가소속 표시 수렴** (원안 M→축소 S)
개요 출생 카드에 BIRTH_PLACE 소속 국가(historicalCountry 우선) 병기 + life-section 출생지 피커 옆 국가소속 섹션 크로스 링크. 원안의 도시→국가 원클릭 제안 배너는 **기각**: `City.countryId`는 현대 국가 FK라 전근대 인물 다수 케이스에서 틀린 제안(개성→대한민국)을 반복 노출하고, 올바른 값(historicalCountryId)은 자동 해석 불가. 두 시스템의 정본 분담(장소=지리, 링크=국가 서사)을 스키마 주석으로 명문화해 후속 통합 마이그 시도 차단.

**2-4. 출생 정보 기입 배치 원칙(canon) 확정** (S, 문서+주석)
3층 규칙: 등록 모달 essentials=신원 확정 최소 사실(era·연월일·미상·장소) / 서사 필드 저작 정본=[현행] 모달 details 모드, [목표] 상세 개요 인라인 편집(배치4-1 채택 시 발효하는 조건부 조항) / 가계도 저작=관계 파생 사실만, 등록 모달과 **동일 컬럼**(이중 정본 금지). + 섹션 확장은 `sections/` 신설 파일로만, `person-register-view.tsx`(2459줄)에는 state 배선만 추가하는 성장 억제 조항. 기록 위치는 메모리 항목 확장+컴포넌트 주석 헤더(docs에 canon 문서 없음 확인). 단독 효과 없음 — 구현 안들의 레퍼런스로 같은 배치에서.

### 배치 3 — 마이그레이션 배치 (트리 정리 후, 가계도 보류분과 함께 **1회 migrate**)

> 병렬 스키마 WIP 드리프트 회피 방침에 따라 아래 4건 + 가계도 보류 항목(#7 rank·#19 결합상태·#2 입양·#31 dynastyOrdinal)을 additive 마이그레이션 한 번에 합류. 소스는 `libs/db/prisma/person.prisma` — `apps/api/prisma/schema.prisma` 직접 수정 금지.

**3-1. `birthNote`(출생 메모, text) 신설** — 유일하게 올바른 최소 대칭 (M)
`deathNote:164`의 정확한 1행 미러. 유형·원인 enum은 의도적으로 만들지 않는다(§5). 자유 텍스트 하나가 탄생설화(주몽·박혁거세·견훤)·칠삭둥이(한명회)·유복자(뉴턴·무함마드)를 전용 Boolean 없이 전부 흡수. 배선 5구간 체크리스트: DTO 2종 → 컨트롤러 create/update+detail 인라인 타입 → ResponseDto+repository 매퍼 → 변경요약 → life-section 출생 열 Textarea('출생 배경·설화·비고') 프리필·payload. 생존 시 nullify 불필요(출생은 상태 무관). **최대 함정 = 1-1과 동일한 컨트롤러 유실 재발** — 저장→상세 재조회 왕복 검증 필수.

**3-2. 추정(circa)+정밀도 — 경합 2안 병합 확정판** (M)
두 심판 판정이 상충했던 지점(완전판 "Boolean 단독안 기각·흡수" vs 최소판 "직교라 택일 아님")을 본 검토서에서 병합 확정한다:
- **컬럼 4개**: `isBirthDateApproximate`/`isDeathDateApproximate` Boolean + `birthDatePrecision`/`deathDatePrecision` — precision은 **enum 신설 금지**, `PersonLifeEvent.startDatePrecision` 기존 패턴 그대로 `String? @db.VarChar(10)`('year'|'month'|'day').
- **precision은 사용자 노출 없이 서버 파생**: 컨트롤러가 dto의 month/day 존재 여부로 자동 산출(현재 `buildUtcDateFromParts`가 month||1/day||1로 뭉개 연도만 입력이 01-01로 저장되는 **진행형 정밀도 손실**을 차단 — 지연될수록 백필 불가 행 누적).
- **신규 UI는 '추정' 토글 1개**: '미상' 토글의 형제 자리(segmentToggleMixin), 미상↔추정 **양방향 배타** + 서버 정규화(날짜 없는 approximate=false, isAlive면 death 측 클리어).
- **표기 규약**: 'c. 1500년경'은 circa 마커 중복 — 한국어 단일 규약 **'1500년경'**(연도만)/'1500. 3. 2.경'. 기존 행은 precision NULL=출처불명으로 현행 표시 유지(소급 주장 금지).
- **1차 표시 범위**: 인물 상세 헤더+등록/수정 모달 요약으로 한정. 전 소비처 롤아웃은 §4-C(단일 lifespan 포맷터)가 선결. 향년 계산은 v1에서 추정 여부 무시(표기만).

**3-3. 적서(嫡庶) 세분 — `birthLegitimacy` enum** (L, 마이그 안 중 후순위)
`LEGITIMATE/SEOJA/EOLJA/ILLEGITIMATE/UNKNOWN`(UNKNOWN='사료상 불명/논쟁', NULL='미기입' 구분 주석). 서구식 이진값은 조선 신분제를 못 담는다 — 광해군(서자)·영조(무수리 소생)에 illegitimate=true는 부정확, 서얼금고·왕위계승 서사와 직결된 백과 필수 정보. 심판 수정 3건 반영: ① 기입 UI는 InlineSelect가 아니라 **deathType 선례의 segmentToggleMixin 칩 행**(family-section 체크박스 자리 교체, 서구 인물엔 LEGITIMATE/ILLEGITIMATE만 노출), ② Boolean 동기화는 쓰기 파생이 아니라 **읽기 시 파생**(`illegitimate = legacyBool || enum∈{SEOJA,EOLJA,ILLEGITIMATE}`, Boolean 쓰기 동결 → FamilyTreeResponseDto·별표 무변경 하위호환+모순 데이터 원천 차단), ③ **백필 금지**(true→ILLEGITIMATE는 서자를 혼외자로 오분류 영구화 — NULL로 두고 큐레이션). 선결: 1-1.

**3-4. `birthOrder`(출생 서열, Int?) 보조 필드** (M)
가계도 파생(형제 전원+생일 확정)이 정확히 이 서비스의 주 대상(BC·고대·중세)에서 무너진다 — 생일 미상이어도 사서엔 '이성계 5남'이 명기. 심판 수정: 교차검증 힌트 배지 기각(과잉) — 대신 가계도 형제 정렬을 `birthOrder(1차)→birthYear(2차)` 복합 키로 바꿔 명시값 우선을 구조적으로 달성(`person-genealogy-infographic.tsx:158-162`, 필드가 표시 전용을 넘어 기능값). gender nullable이라 '3남'은 성별 있을 때만, 미상은 '셋째' 폴백. 배선은 illegitimate 선례 경로 복제.

### 배치 4 — 별도 트랙 (독립 계획)

**4-1. 개요 출생/사망 카드 click-to-edit 인라인 편집** (L)
기업 상세에서 확립한 shared/ui/inline-edit 키트 적용(InlineText: placeText·cause, textarea: note, InlineSelect: deathType). 구조화 날짜(era+연월일)는 v1 제외 — BC 날짜는 연보 리뷰에서 확인된 사고 지대, 모달 딥링크 유지. 심판이 찾은 필수 공백 2건: ① **빈 상태 렌더 반전** — 현재 `hasBirth/hasDeath` 모두 false면 카드 자체가 안 떠서(=사용자 불만의 핵심 케이스) 편집 진입점이 없음, 항상 렌더+placeholder 행으로 반전. ② **placeText↔FK 충돌 규칙 확정** — FK 유래 장소 행은 편집 비활성+모달 딥링크만(텍스트 저장이 FK에 가려 무효처럼 보이는 함정 차단). **3-1(birthNote)과 같은 배치 필수** — 단독 시행하면 출생 측 대상이 placeText 1개뿐이라 사실상 사망 카드 개선안이 됨. 서버 크로스 밸리데이션(§4-A) 선결.

**4-2. 아명·출생명 = PersonNickname.type 정식화** (원안 S→실측 M)
birthName 컬럼 신설 기각(휘는 name/originalName 담당, 억지 대칭 회피)은 유지하되, 심판이 원안의 허위 전제를 적발: **닉네임 저작 UI·쓰기 API가 리포에 없다**(표시 칩뿐, NicknameDto는 참조 0건 고아, 데이터는 시드 전용). 실제 scope = 닉네임 쓰기 배선(고아 DTO 편입 또는 서브리소스 CRUD)+저작 UI 신설+type 프리셋(아호/자/아명/출생명/필명)+상세 type별 그룹 표시. '닉네임 CRUD 신설'이라는 상위 작업의 일부로 별도 계획.

---

## 4. 완전성 비판 보강 (개선안에 없던 6건)

**A. 생몰 역전 검증이 클라이언트 전용 — 서버 가드 신설** (배치 1~2 사이 권장)
출생≤사망 검증은 등록 모달 `computeBirthDeathErrors`에만 있고(BC 부호연도 비교까지 올바름, `view:1376-1383`) 서버에 0건. 문제는 개선안들이 **모달을 우회하는 쓰기 경로를 늘린다**는 것(4-1 인라인 PUT 부분 페이로드, 가계도 퀵 저작 FK write). 자기부모 가드(`service.ts:326-328`)·임기 순서 가드(`:740`) 선례 있어 비용 낮음. BC 비교는 모달의 부호연도 합성키 로직 이식(native Date 금지).

**B. 컨트롤러 깔때기 회귀 테스트 — person API 테스트 0개**
1-1이 고치는 버그의 근본 원인(수동 필드 화이트리스트가 유일 깔때기)으로 신규 필드 ~8개가 통과할 예정 — 각각이 illegitimate와 똑같이 조용히 유실될 후보. DTO 필드→서비스 페이로드 왕복 자동 테스트 1개(또는 키 diff 검사)를 **마이그 배치(배치 3)의 선결 항목**으로.

**C. 단일 lifespan 포맷터 — circa 표기의 선결**
생몰연도 렌더 지면은 계획된 3면 외에도 person-select-modal·person-group-detail·same-dynasty-members·heads-of-state-timeline 등 6곳+. 포맷터 없이 3-2를 표시하면 나머지 지면은 추정 연도를 확정처럼 계속 표기. 향년 계산 3중복 수렴과 같은 자리에 `lifespanText` 유틸 신설이 3-2 표시 확장의 선결.

**D. 출생판 감사·백필 파이프라인**
`audit-person-quality.ts`에 출생 항목(출생지 46%·birthNote) 추가 + 사망 백필 스크립트에 대응하는 출생 큐레이션 배치. 없으면 3-1을 만들어도 352명의 출생 카드가 빈 채로 남아 체감 비대칭 유지.

**E. 모바일(Expo WebView)·터치 도달성**
2-2(a)의 illegitimate 배지를 1차에 '가계도 hover 확장'으로 한정하면 **터치·키보드 사용자는 서출 정보에 도달 불가**(title 폴백 무용) — 1차 지면 재고 또는 비-hover 표기 병행. 모달 확장안(2-1, 3-3 칩 행)은 폰 폭(~390px)에서 2열 LifeCol 레이아웃 검증 필요(768px 분기 1곳뿐).

**F. 부수 발견 — `showLifespanOnEventList` 死필드**
스키마→컨트롤러 매핑(`:928`)까지 배선됐으나 소비 0건. illegitimate와 동일한 '반쪽 배선' 사례 — 사건 목록 인물 생몰 표시라는 원래 의도 지면이 미구현임을 시사. 정리 또는 구현 결정 대상.

허위 경보 방지 확인: class-validator 전역 파이프 활성(1-3 유효), 서버 날짜 헬퍼는 BC 규약 준수(circa 안의 서버측 BC 회귀 위험 낮음), a11y는 기존 칩 패턴(role=group/aria-pressed) 미러링으로 충분, 시드는 prisma 직접 쓰기라 컨트롤러 화이트리스트 무관.

---

## 5. 기각 항목 (도메인 근거 — 재제안 방지)

| 후보 | 판정 | 근거 |
|---|---|---|
| 출생 유형 enum (deathType 대응) | **기각** | 출생엔 역사적 분류 축이 없음 — UNKNOWN/OTHER만 채워지는 죽은 enum. 범주화 수요(적서·유복자·설화)는 각각 3-3·파생·3-1이 정확한 자리 |
| birthCause (deathCause 대응) | **기각** | 동일 — birthNote 하나가 올바른 대칭 |
| 세례일 컬럼 (Wikidata P1636) | **기각(현 단계)** | 동아시아·BC 주 대상에 대응 개념 없음, 소수 유럽 인물은 birthNote 서술로 충분 |
| 유복자·쌍둥이 Boolean | **기각** | 유복자는 부친 deathDate<본인 birthDate로 파생 가능, 쌍둥이는 극희소 — 99.9% false 죽은 컬럼, birthNote가 흡수 |
| 간지·연호 저장 | **기각** | 간지는 연도의 결정론적 파생값(표시 계층 문제), 연호는 날짜 렌더링 공통 장기과제 |
| 출생 시 국적 시점모델 | **기각(현행 유지)** | PersonCountryLink BIRTH_PLACE가 정확히 이 용도(스키마 주석의 비스마르크·아인슈타인 예시) — 동선 연결(2-3)만 |
| birthName 전용 컬럼 | **기각** | PersonNickname이 담당(4-2), 휘는 name/originalName과 중복 |

---

## 6. 시행 순서·의존성

```
배치1 (즉시·S×4) ── 1-1 illegitimate 유실수정 ──┬─→ 3-3 birthLegitimacy (선결)
                    1-2 unknown 계약대칭 ────────┼─→ 2-2(a) 카드 '미상' 명기
                    1-3 MaxLength / 1-4 오류분리 │
배치2 (스키마 0) ── 2-1 출생지 이동(+adminDiv null) / 2-2(b,d) 즉시, (c)는 가계도 배치4와 SDK 1회
                    2-3 표시수렴 / 2-4 canon(구현 안들과 동반)
  §4-A 서버 역전검증 · §4-B 깔때기 테스트 ← 마이그 배치 선결
배치3 (마이그 1회 합류: 가계도 rank·결합상태·입양·dynastyOrdinal과 함께)
                    3-1 birthNote ═ 3-2 circa+precision ═ 3-4 birthOrder ═ 3-3 적서(후순위)
  §4-C lifespan 포맷터 ← 3-2 표시 확장 선결 · §4-D 출생 감사·백필 ← 3-1 실효성
배치4 (별도 트랙) ─ 4-1 인라인 편집(3-1과 동일 배치, §4-A 선결) / 4-2 닉네임 CRUD
```
