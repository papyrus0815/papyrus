# 가문 통치기록(DynastyRule / DynastyModernRule) 관리 기능 설계 검토서

작성일: 2026-07-23 · 상태: 검토(구현 후속) · 우선순위: LOW · 필요성 판정: partial

## 0. 요약(TL;DR)

- 출발점은 저비용 '가문 시작/종료일 사유'(안1)→'BC·고대 날짜'(안2)였고 **원 니즈는 이미 충족·커밋됨**. 그 P2 백로그 마지막 항목 'DynastyRule.endReason 편집 UI 부재(사문)'을 실측하니 endReason 단독 문제가 아니라 **통치기록 관리 기능이 통째로 부재**함이 드러났다.
- 그러나 4렌즈 + 적대검증 결과, **진짜 1차 격차는 '편집'이 아니라 '표시'다.** 시드에 쌓인 풍부한 통치기록(호엔촐레른 6개국 통치, 세르비아 두 가문 교대 등)이 `GET /dynasties/:id/detail`로 내려오지만 이를 소비하는 프론트가 0이고 가문 상세 뷰 자체가 없어 **사용자에게 완전 불가시**다. 보이지 않는 레코드의 필드를 고치는 최소안(endReason만 편집)은 표시 없이는 가치 0.
- **권고: 풀 CRUD L규모 신설은 보류.** 정직한 최소 완결은 별도 모달에 **통치기록 읽기 표시 + 각 rule의 endReason(+notes) 좁은 인라인 편집(Batch 0)** — 스키마·DTO 무변경으로 원 P2 항목을 비례적으로 닫는다. startReason 컬럼·precision·상세페이지·풀 저작은 제품이 '사용자 직접 저작'을 결정할 때만.

## 1. 배경·현황(실측)

### 1.1 스키마 (libs/db/prisma/dynasty.prisma)
- `model DynastyRule`(L119): dynastyId(FK Cascade), historicalCountryId(FK HistoricalCountry Cascade), 구조화 날짜 startEra/startYear/startMonth/startDay·endEra/…(전부 Int? nullable), **endReason String?@VarChar(200)**(L154), notes Text. **startReason 없음, precision 컬럼 없음, @@unique 없음.**
- `model DynastyModernRule`(L182): 동형이나 countryId(FK Country Cascade), **startEra/endEra @default(AD)**(L193/205), endReason(L217).
- 부모 `Dynasty`는 안1로 startReason(L67)/endReason(L71) 쌍 + 안2로 구조화 날짜·precision 완비. 주석(L70)이 **'DynastyRule.endReason(특정 국가 통치 종료)과 층위가 다름 — 여기는 혈통집단 자체의 종료'**를 명시.
- 부모는 AD1000+ 병행 DATETIME(startDate) 때문에 precision을 저장하지만, **Rule은 순수 Int축(DATETIME 없음)** — 이 비대칭은 의도된 것.

### 1.2 배선 상태
- **쓰기 API 전무**: `dynasty.controller`(@Controller('dynasties'), @UseGuards(AuthGuard('jwt')))는 가문 CRUD(GET/GET :id/GET :id/detail/POST/PUT :id/DELETE :id)만. service/repository에 rule create/update/delete 없음(findMany 읽기만). 현재 rule을 쓰는 주체는 **시드뿐**(prisma.dynastyRule.create 직접).
- **읽기 노출은 축약**: `findDetail`(dynasty.service.ts)이 historicalRules/modernRules 배열을 반환하나, 매퍼가 `{id, ...countryId/Name, startEra, startYear, endEra, endYear, endReason, notes}`로만 투영 — **startMonth/startDay/endMonth/endDay를 드롭**(findMany는 반환하나 map에서 탈락). DTO(dto/index.ts L114-136)도 동일 누락.
- **프론트 소비 0**: shared/api/dynasty 래퍼(getAll/getById/create/update/delete)에 **getDetail 없음**. 가문 상세 라우트·페이지 부재(dynasty.page.tsx는 DynastySection 하나만). UI는 목록 행확장(motto/성립·단절 사유/description/구성원버튼/수정·삭제) + 구성원 인포그래픽 모달뿐.

### 1.3 재사용 자산(확인)
- 컨트롤러에 `dateSlice()`(L32) — mapStructuredDateInput 위임, {date, precision, era, year, month, day} 반환.
- service에 `clampReason()`(L20, trim+200 clamp), `assertPersonExists()` 존재. interface DTO(ValidationPipe 없음)라 사유는 clampReason 경유가 필수.
- 프론트: 구성원 인포그래픽 모달(glass 셸), CountrySearchModal 이중피커, InlineDateField+DatePickerModal+partial-date-string(안2에서 가문 폼 적용), sovereign-reign-register-panel(구조화날짜+국가+endReason+notes 골격, 단 인물종속 필드 혼재).

## 2. 필요성·스코프 판정 (needed = partial)

### 2.1 데이터 가치는 실재
통치기록은 부모 Dynasty와 **층위가 다른 별개 관심사**다. '어느 가문이 어느 국가를 언제~언제, 왜 끝났나'는 혈통집단 자체의 흥망(안1/안2로 완비)이 대체하지 못한다. 시드에 교대통치·다국가통치까지 풍부.

### 2.2 그러나 1차 격차는 '표시'
편집 UI를 만들어도 사용자는 그 rule 행 자체를 볼 수 없다. **표시 먼저**가 순서.

### 2.3 '개방 쓰기표면' 차단논거는 과장(적대검증 정정)
필요성렌즈는 '소유권 없음→아무나 편집'을 보류 근거로 들었으나, **여기는 web-admin이고 Dynasty CRUD 자체가 이미 accountId 없는 로그인전용 개방 쓰기표면**이다. rule CRUD는 동일 자세를 상속할 뿐 신규 보안위험을 만들지 않는다. **보류의 정직한 근거는 보안이 아니라 스코프·우선순위.**

### 2.4 최소안의 가치는 '표시 이후'에만 발생(적대검증 정정)
'endReason만 편집 = 가치 0'은 **표시 이전 한정** 참이다. 리스트가 렌더된 뒤엔 한 필드 인라인 편집이 곧 원 P2 항목의 비례적 완결이 된다. display-only도 풀 CRUD도 아닌 **중간(표시 + endReason 좁은 편집)**이 정답.

### 2.5 P2 백로그 처리
'endReason 편집 UI 부재'는 독립 결함이 아니라 '통치기록 표시·관리 통째 부재'의 증상 → **사문 확정하고 닫되, 구체적 귀착지를 Batch 0에 명시 배정**(open-ended L 에픽으로 방치 금지).

## 3. 표시지면 결정 → 별도 '통치 기록' 모달 (선택지 2)

| 선택지 | 판정 | 근거 |
|---|---|---|
| (1) 행확장 인라인 CRUD | 기각 | 행은 getAll 페이로드로 렌더되는데 rules 미포함 → 전목록 N+1 또는 확장마다 지연페치 강요. ExpandInner가 이미 조밀(motto/사유/구성원/수정삭제)해 국가피커+날짜 CRUD 행 삽입 시 압축 디자인 붕괴 |
| (2) 별도 모달 | **채택** | 구성원 인포그래픽 모달의 완성된 전례를 셸로 포크. dynastyId 스코프, 열 때 getDetail 페치. dynasty-row ExpandInner에 '통치 기록' 버튼 하나만 추가 |
| (3) 상세페이지 신설 | 기각 | 가문 상세 라우트·IA 통째 부재. 기능 하나에 IA 발명은 과설계 |

- 역사/현대 rule은 **탭 분할 없이** toSignedYear 정렬 단일 연대순 리스트 + '역사국가/현대국가' 배지 + 국가명으로 통합(전형 <5건, 차이는 대상 엔티티뿐).
- 전 날짜 null인 미상 rule용 **'연도미상' 버킷 + 안정 2차정렬** 필수(toSignedYear가 null 예측불가 정렬).

## 4. API 설계(실제 파일 시그니처)

전제: `GET /dynasties/:id/detail`·SDK 스텁은 **이미 존재**. 누락은 래퍼 getDetail과 소비 프론트뿐.

### 4.1 Batch 0 (권고, 스키마·DTO 무변경)
- shared/api/dynasty: `getDetail(id)` 래퍼 추가.
- 컨트롤러 2엔드포인트(class 이미 JWT 가드):
  - `PATCH /dynasties/:id/historical-rules/:ruleId` body `{ endReason?: string|null; notes?: string|null }`
  - `PATCH /dynasties/:id/modern-rules/:ruleId` body 동일
- service: `updateHistoricalRuleEndReason`/`updateModernRuleEndReason` — `await this.findById(dynastyId)`(부모존재 가드) → `prisma.dynastyRule.updateMany({ where:{ id:ruleId, dynastyId }, data:{ endReason: clampReason(x), notes:… }})`. **교차가문 편집 차단은 {id,dynastyId} 스코프**로. **사유는 반드시 clampReason 경유**(raw 500 방지).
- endReason은 이미 findDetail 응답·DTO에 존재 → DTO widen·스키마 변경 불필요.

### 4.2 Batch 1 (게이트: 사용자 저작 결정 시) — 풀 create/delete + 날짜 저작
- `POST /dynasties/:id/historical-rules`, `DELETE …/:ruleId`, `/modern-rules` 동형 트리오. **2종 테이블 = 2경로쌍**(통합 /rules/:ruleId 금지 — UUID로 소유 테이블 판별 불가, 읽기측도 두 배열).
- DTO(interface): `CreateDynastyHistoricalRuleDto { historicalCountryId; startDateInfo?:DateInfo|null; endDateInfo?:DateInfo|null; endReason?; notes? }`, modern 트윈(countryId), Update 전필드 optional·null=clear. **DateInfo는 dto/index.ts에 이미 존재.**
- 쓰기경로: `dateSlice()` **재사용하되 prisma엔 era/year/month/day만** 전달(.date/.precision 드롭 — Rule엔 해당 컬럼 없음). **modern은 era=null 전달 금지 → AD coerce**(@default(AD) 덮어씀 방지).
- 선행: findDetail 매퍼 + 두 Rule DTO에 startMonth/startDay/endMonth/endDay 추가. **이 widen은 '날짜 편집'에만 필요**(endReason 편집엔 무관 — 오분류 주의). 현재 시드 rule은 연도 단위라 기존 데이터 무손실.
- build:nestia 재생성 후 래퍼 createRule/updateRule/deleteRule(역사·현대) + `useDynastyDetail` 훅.

### 4.3 컴포넌트 규약
sovereign-reign-register-panel은 **'재사용' 아닌 '골격 포크'만**(personId·SovereignReign API·enum endReason·EventPicker·regnalName·invalidateTenureQueries 오염). Rule 필드셋(국가+날짜×2+자유텍스트 사유+notes)이 작으므로 1054줄 패널 포크보다 **경량 전용 폼** 권장. **SelectModal은 enum 필드 0이라 불필요.**

## 5. 스키마 보강 판정

- **startReason 추가 = 보류/게이트(Batch 2).** 원 트리거는 endReason이지 startReason 아님. 부모·형제(SovereignReign)와의 '대칭'만으로 지금 마이그를 넣는 것은 과설계 가드가 겨냥한 symmetry-for-its-own-sake(적대검증 확인). 착수 시엔 dynasty_rule·dynasty_modern_rule 양쪽 + 시드 하이드레이션 + detail DTO를 **동시에** 손대야 함(부분배선 사문화 방지).
- **precision 컬럼 = 절대 추가 안 함.** Rule은 순수 Int축이라 month=null/day=null이 '연도만 앎'을 무손실 표현, mapStructuredDateInput이 파생. 추가 시 redundant-state 위험 재도입.
- **@@unique = 추가 안 함.** (dynastyId, historicalCountryId) 반복의 진짜 근거는 **re-rule/복위**(같은 가문이 같은 국가를 다른 시대에 재통치). 대신 쓰기경로가 정확중복 이중제출을 앱단 가드.

## 6. endReason 3표면 정리 규약

3표면: ①Dynasty.endReason(혈통집단 종료: 멸문/개명/병합) ②DynastyRule.endReason(역사국가 통치 종료) ③DynastyModernRule.endReason(현대국가 통치 종료).

1. **지면 층위 물리 분리** — 가문 사유는 가문 메타 지면(dynasty-row의 기존 '성립/단절' ReasonLabel 유지), Rule 사유는 각 통치기록 카드 '내부'. **세 사유 한 리스트 인접 렌더 금지**(단일국가 가문에서 '멸문'과 '통치 종료' 혼동 방지).
2. **국가명 = disambiguator** — Rule측 '{국가명} 통치 종료 사유'(예 '신성로마제국 통치 종료 사유'). **벌거벗은 '종료 사유' 단독 라벨 금지.** 가문측 완전라벨은 '가문 단절/성립 사유'.
3. **어휘 도메인 고정** — Rule 대상 '통치 국가', 섹션 '통치 기록'. SovereignReign '재위 국가'와 동일 화면 혼용 금지.
4. **Rule endReason은 자유텍스트 String(200)** — enum화 금지(인물-재임 냄새 어휘 침투 + delete-recreate 복잡화, 도메인 내부 일관성 우선).

## 7. 배치 계획

- **Batch 0 (M, 권고 최소 완결)**: 통치기록 읽기 표시(별도 모달, 연대순 단일 리스트+배지+연도미상 버킷) + endReason(+notes) 좁은 인라인 편집. 스키마·DTO 무변경. 파일: dynasty-rules-modal(신규)·shared/api/dynasty(getDetail+PATCH 래퍼)·dynasty.controller(PATCH×2)·dynasty.service(update×2, clampReason)·use-dynasties.hook(useDynastyDetail)·dynasty-row('통치 기록' 버튼).
- **Batch 1 (L, 게이트)**: 풀 create/delete + 날짜 저작. findDetail/DTO month/day widen 선행, 경량 전용 폼, modern era=AD coerce, 2경로쌍.
- **Batch 2 (M, 게이트)**: startReason additive 마이그(양 테이블 + 시드 하이드레이션 + DTO 동시). precision·@@unique 미추가.

## 8. 지뢰(landmines)

1. **findDetail 월/일 드롭**은 '날짜 편집' 착수 시에만 라운드트립 유실 — endReason 편집엔 무관(보편 전제조건으로 오분류 주의).
2. **clampReason 미경유** → VarChar(200) 초과 raw 500.
3. **DynastyModernRule @default(AD)** — 빈 날짜 era=null 전달이 default를 NULL로 덮어씀 → AD coerce.
4. **invalidateTenureQueries 재사용 금지**(person 키 전용) → 가문 detail stale. dynasty 전용 무효화 신설.
5. **['dynasty', id] 키는 getById 점유** → detail 훅은 ['dynasty-detail', id].
6. **sovereign 패널 import 함정** → 인물종속 필드 오염. 골격 포크/경량 폼만.
7. **삭제 confirm은 통합 @/shared/ui/confirm-dialog** — native window.confirm 재도입 금지.
8. **백엔드-우선 = UI 전엔 dead code** — 래퍼/훅만 선건설 금지.
9. **미상 rule** 연도미상 버킷 + 안정 2차정렬.
10. **BC/AD 역전검증**은 부호연도(toSignedYear) 필요, endYear null 관용.

## 9. 미결정(open decisions)

1. (핵심 게이트) 통치 국가를 최종사용자가 UI에서 직접 저작하게 할 것인가? 현재 저작 주체는 시드뿐. YES→Batch 1, NO→Batch 0 정지.
2. startReason 저작이 실제 필요한가? 확인 전 컬럼 보류.
3. 공유 카탈로그 동시편집 정책: 로그인 가드 + 단순 무효화로 확정할지.
4. 목록 행에 rule 개수/시대 티저를 곁들일지 vs 버튼만(권고: 버튼만).
5. P2 백로그 항목 최종 문구('사문 확정 + Batch 0 귀착 승계').