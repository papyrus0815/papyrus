# 가문(Dynasty) 시작/종료 사유 기록 기능 — 필요성·데이터모델·구현 검토서

작성일: 2026-07-22 · 브랜치: feature/service-manager-v2
검토 요청: "가문에 시작일에 사유, 종료일 사유 기록 기능 필요 검토"
방법: 4개 렌즈(필요성·데이터모델·구현면적·전례정합) 분석 + 적대검증, 실제 파일·라인 대조

---

## 1. 배경·현황

가문(Dynasty)은 역사 인물·국가·사건을 카탈로그화하는 Papyrus의 세습집단 도메인이다. 현재 흥망 시점은 저장하지만 **왜 시작/종료했는지**를 담을 전용 필드가 없다.

### 1.1 스키마 (libs/db/prisma/dynasty.prisma — schema.prisma는 머지 결과물, 소스는 여기)
- `model Dynasty`(line 35): `startDate DateTime?`(line 46, 주석 "최초 등장 또는 중요 인물의 시작") / `endDate DateTime?`(line 49, "멸문 또는 권력 상실"). **사유 필드 없음.** 산문 필드는 `description String? @db.Text`(line 43) 하나뿐이고 `notes`는 아예 없음.
- `model DynastyRule`(line 97, 역사국가 통치기록) / `model DynastyModernRule`(현대국가): 날짜가 **구조화**(`startEra Era?`+`startYear/Month/Day Int?`+동일 end)라 **BC 표현 가능**하고, **`endReason String? @db.VarChar(200)`**(line 132, "왕조 교체, 멸망, 혁명 등")를 이미 보유. 단 **startReason은 없음**(end-only 비대칭).
- 즉 부모 Dynasty는 DateTime(BC 불가)+사유無, 자식 Rule은 구조화날짜(BC 가능)+endReason有 — **부모/자식 비대칭**이 이미 존재.

### 1.2 표시 공백
`apps/web-admin/src/widgets/dynasty/ui/dynasty-row.tsx`의 ExpandInner(221-252)에는 motto·description·구성원·수정/삭제만 있고, MetaEra(113)는 "startYear–endYear/현재"만 표시 — **사유를 담을 지면이 현재 없음**(코드 대조 확인).

### 1.3 기존 endReason은 유령 필드
DynastyRule/ModernRule의 `endReason`은 **생성/편집 UI가 전무**(시드 전용, detail 응답에 read-only 노출). 즉 사용자가 못 넣는 사문(死文)이다. 새 Dynasty 사유도 컨트롤러·shared/api 래퍼·폼 3단을 다 배선하지 않으면 같은 유령 필드가 된다.

---

## 2. 판정: 필요 = partial (yes지만 저우선)

**필요하다. 단 저우선 additive 개선이며, 시작·종료 사유의 가치는 비대칭이다.**

| | 판정 | 근거 |
|---|---|---|
| **종료 사유(endReason)** | 진짜 니즈 | 서사가 일관되게 명확(조선=1910 경술국치, 로마노프=1917 2월혁명 폐위, 명·청 왕조교체). description 산문에 파묻히는 '왜 끝났나'를 목록/상세 1줄로 구조화 노출·입력 유도 |
| **시작 사유(startReason)** | 포함하되 부차 | 정의 모호(합스부르크 '백작 서임'vs'왕조 승격', 후지와라 고대 씨족)·도메인 무전례. **포함 근거는 '대칭'이 아니라 '사용자 명시 요청'** |
| **다중종료 전용 테이블** | 반대(과설계) | 복위·재멸망은 이미 endReason을 가진 per-국가 DynastyRule 행 여러 개로 자연 표현 |

### 2.1 적대검증이 뒤집은 3가지
1. **필드 형태**: 1차 분석의 'label+detail 2필드쌍'(tenure/reign 전례, 4컬럼)은 **과설계로 기각**. 그 패턴은 enum 라벨을 서사로 보완하는 구조인데 가문엔 enum이 없어 분리 이유가 소멸하고, 형제모델 DynastyRule(단일 String)과 어긋나 도메인 내부 비대칭을 새로 만든다. → **단일 VarChar(200) × 2**.
2. **startReason 정당화**: '대칭'은 역효과. DynastyRule이 end-only라 startReason을 넣으면 부모가 자식보다 더 대칭이 되는 설계 역전. → 근거를 **'사용자 명시 요청'**으로 교체(결론=포함은 유지).
3. **'필터·집계' 세일즈 제외**: 실사용 미검증 투기라 needed 근거에서 제거. needed는 (a)명시 요청 (b)산문에 파묻히는 사유의 구조화 노출 (c)입력 유도로 재정렬.

### 2.2 기각된 저비용 대안
- **"description으로 충분"**: 부분 성립하나 최종 기각. description은 단일 블롭이라 시작/종료 사유를 **구조적으로 분리 저장 불가**, notes 필드도 없음. 재사용 대안이 물리적으로 없어 신규 컬럼이 정당(비용≈0).
- **"DynastyRule.endReason으로 커버되니 중복"**: 기각. Rule은 `historicalCountryId` 필수라 통치국가 없는 순수 가문(로스차일드·메디치를 '가문'으로만 등록)은 Rule 행이 없어 사유를 걸 자리가 없음. 게다가 Rule은 편집 UI 부재라 Dynasty가 **유일한 실입력 지점**. 의미도 다름(혈통 자체 종료 vs 국가별 통치 종료).

---

## 3. 권고 데이터모델 — 안1 채택

`libs/db/prisma/dynasty.prisma`의 model Dynasty, `endDate`(line 49) 직후 삽입:

```prisma
/// 가문 시작(성립) 사유 (시조 즉위·분가 독립·최초 문헌 등장 등)
startReason String? @map("start_reason") @db.VarChar(200)

/// 가문 종료(단절) 사유 (멸문·권력 상실·개명·타가문 병합 등)
/// DynastyRule.endReason(특정 국가 통치 종료)과 층위가 다름 — 여기는 혈통집단 자체의 종료
endReason String? @map("end_reason") @db.VarChar(200)
```

- **enum 불채택**: 가문 흥망(역성혁명/서임/혼인동군/폐위/멸문/개명)은 시대·문화별로 이질·비배타라 유계 enum 불가. 형제 DynastyRule.endReason도 자유 String(200).
- **label+detail 2필드쌍 불채택**: §2.1-1 참조.
- **VarChar(200)**: DynastyRule·ModernRule.endReason과 교차모델 일관. 긴 서사는 description(Text)가 흡수. 서사형 UX 확정 원하면 @db.Text 승격 여지만 열어둠.
- **명명**: startReason/endReason(startDateReason은 date-precision 근거로 오독). @map은 Rule과 어휘 일치.

### 3.1 왜 안1(사유만)이고 안2(날짜 구조화)는 분리인가 — DateTime 결함의 정직한 처리

부모 Dynasty의 `startDate/endDate`는 DateTime이고 **MariaDB DATETIME은 AD1000+만 안전·BC 불가**(프로젝트 확립 지뢰). 정작 스키마 도메인 주석이 든 활용사례(dynasty.prisma:21-22 **로마 율리우스·일본 후지와라**)는 고대라 이 날짜모델로 표현 불가. 자식 Rule은 startEra/startYear 구조화라 BC 가능한데 부모만 DateTime인 근본 비대칭이다.

**사유 컬럼은 이 날짜 결함과 직교한다.** reason은 독립 String 스칼라로 controller의 `new Date()`/`toISOString()`·deriveOne의 `getFullYear`·타임라인/KPI 어느 것도 참조하지 않는다(controller/service 대조 확인). 훗날 DateTime→startEra/startYear 재구조화(안2)해도 reason 컬럼은 손대지 않아 **재작업 0**. 따라서 안1을 선행해도 안2가 낭비되지 않는다.

**정직한 한계**: 그럼에도 고대 가문은 날짜를 못 담아 사유가 '날짜 없이' 고아가 된다. 이는 `<100` 연도를 특정 경로로 저장할 때만 2044로 손상되는 것이지 nullable이라 자동 손상은 아니다 — 정확히는 **'BC/고대 날짜 미지원'**. 안2(날짜 구조화)는 이번 요청과 별건인 **선재 잠복버그**로 P2 등록하되, 사유만 먼저 얹으면 Dynasty 날짜를 나중에 또 마이그(두 번)한다는 커플링을 §7 미결정으로 남긴다.

---

## 4. 구현면적 — 파일 11개·전 계층·대략 M(반나절)

순서: 스키마→마이그→서버(dto/repository/service/controller)→nestia 수동→프론트(래퍼→폼→widget→row).

| # | 파일 | 작업 | 규모 |
|---|---|---|---|
| 1 | libs/db/prisma/dynasty.prisma | model Dynasty에 nullable 2컬럼 | S |
| 2 | migrations/(도구생성) | run-migrate.ts add_dynasty_reasons, additive·백필 불필요 | S |
| 3 | presentation/dto/index.ts | Create(1)/Update(20)/Response(45) 3인터페이스, Detail은 extends 자동 | S |
| 4 | infrastructure/dynasty.repository.ts | **DynastyRowWithThumbnail(9-31)+attachThumbnails 제네릭(45-67) 2곳** | S |
| 5 | application/dynasty.service.ts | create(35-47)/update(73-88) inline 타입 2곳 | S |
| 6 | presentation/dynasty.controller.ts | toResponseDto(25-55)·create(98-109)·update(118-140) 3곳 passthrough | S |
| 7 | (nestia 수동 재생성) | build:nestia noop이라 수동 | S |
| 8 | shared/api/dynasty/index.ts | DynastyMutationBody +2(string\|null), Dynasty 타입 자동 전파 | S |
| 9 | widgets/dynasty/ui/dynasty-form.tsx | Payload·useState·hydrate/reset 양분기·JSX 입력 2개 | **M** |
| 10 | dynasty-section.widget.tsx | handleSubmit에 emptyToNullOrUndefined 매핑 | S |
| 11 | dynasty-row.tsx | ExpandInner 표시 신설 | S |

### 4.1 브리핑 정정(코드 대조 확인)
- **서비스는 '무작업' 아님**: 본문은 `...fields` 스프레드라 무변경이지만, 컨트롤러가 리터럴로 호출하므로 create/update inline 타입에 startReason/endReason 안 넣으면 excess-property TS 에러.
- **repository가 11번째 파일**: 쓰기경로는 service가 `tx.dynasty` 직접 사용(repository.create/update는 死코드)이라 손 안 대도 되지만, **읽기경로 findById→attachThumbnails→DynastyRowWithThumbnail**가 controller `toResponseDto`로 흐른다. 타입 2곳에 필드 없으면 `d.startReason` 접근 시 **컴파일 실패**. findMany는 select 없이 전 스칼라 반환하므로 쿼리 변경은 불필요, 타입만.
- **컨트롤러는 스프레드 아닌 hand-map 3곳**: toResponseDto·create·update. getDetail은 toResponseDto(d) 재사용이라 별도 매핑 불필요 → 정확히 3곳. 하나 누락 시 무성 드롭. reason은 문자열이라 date의 null/문자열/undefined 3분기 Date 변환은 불필요, 단순 passthrough(undefined=유지/null=클리어/string=값, Prisma 자동).

---

## 5. 지뢰 (반드시 피할 것)

1. **서비스 타입 확장 필수** — 안 하면 컨트롤러 리터럴 excess-property TS 에러.
2. **repository 타입 2곳** — 안 하면 toResponseDto 컴파일 실패(11번째 파일).
3. **interface DTO + ValidationPipe 미적용** — 200자 초과가 raw 500. service/controller에서 수동 `.trim().slice(0,200)` 방어.
4. **컨트롤러 hand-map 3곳** — 하나 누락 시 무성 드롭.
5. **null/undefined clear 일관성** — 프론트 emptyToNullOrUndefined(빈값→편집null/신규undefined)와 서버 passthrough 양쪽 안 맞추면 편집 '지우기' 미동작.
6. **폼 hydrate/reset 양분기** — editing useEffect의 두 분기 모두, 한쪽 누락 시 잔상/유실.
7. **nestia 수동 재생성**(build:nestia noop) 누락 시 프론트 타입 미반영.
8. **schema.prisma 직접수정 금지** — dynasty.prisma 소스 먼저, 그 후 db:build. 반대면 소스가 덮어써 소멸.
9. **endReason 표면 3개**(Dynasty 신설 + DynastyRule + DynastyModernRule) — 상세 인접노출 시 혼선. 표시지면·문구 분리('가문 존속 사유' vs '통치 종료 사유'), doc 주석에 층위 명시(안 하면 후임이 병합 시도).
10. **ongoing 가문 optional** — 윈저·일본 천황가·사우드는 endDate/endReason NULL. required 금지.
11. **고대 가문 날짜 미지원** — 사유는 텍스트라 담기나 날짜가 고아. '자동 손상' 과장 금지, 'BC/고대 미지원'.
12. **마이그 함정** — checksum drift, SHADOW_URL sslmode, db:build 레이스. 실패 시 checksum을 파일 sha256으로 UPDATE 복구.

### 5.1 표시·라벨(전례정합)
- 폼: 날짜 FormRow(dynasty-form.tsx 177-196, flexDirection:row) 바로 아래 **'성립 사유 · 단절 사유'** flex 2열 미러링(좌=성립/밑 시작일, 우=단절/밑 종료일). placeholder 예시형(기존 관행): 성립='예: 역성혁명 건국, 초대 백작 서임', 단절='예: 경술국치 병합, 2월혁명 폐위, 후사 단절'.
- 상세: ExpandInner에 라벨쌍 **가시** 노출(tooltip-only 금지=키보드/터치/SR a11y 실패). ongoing이면 단절사유 숨김.
- 라벨 '성립/단절'은 Rule의 '통치 종료 사유'와 어휘 겹치지 않게 하여 층위 혼동 방지.

---

## 6. 배치 계획 요약

- **B0 제품결정(게이트)**: §7 확인 — 코드 변경 없음. [S]
- **B1 스키마+마이그**: dynasty.prisma 2컬럼 → db:build → run-migrate. [S]
- **B2 서버 전계층**: dto 3 + repository 2곳 + service 2곳 + controller 3곳 + 200자 가드 + nestia 수동. [M]
- **B3 프론트 입력**: 래퍼 + dynasty-form(Payload/useState/hydrate/reset/JSX) + widget handleSubmit. [M]
- **B4 표시**: dynasty-row ExpandInner + ongoing/고아 정책. [S]
- **B5 별건 백로그(미구현)**: Dynasty 날짜 구조화(안2) P2 + Rule endReason 편집 UI 부재 + endReason 3표면 규약. [L]

---

## 7. 사용자 결정 필요 (미결정)

1. **'시작일에 사유' 해석**: 가문이 시작/종료한 사유(도메인 전례와 일치·유력) vs 그 날짜로 잡은 근거(date precision) — 착수 전 1줄 확인.
2. **안2 커플링**: 날짜 구조화를 지금 함께 vs 사유만 선행(→ Dynasty 날짜 두 번 마이그). 렌즈간 견해차(datamodel=직교라 선행 OK / precedent=커플링이라 함께 권고).
3. **Dynasty.endReason vs DynastyRule.endReason** 표시 우선순위·중복입력 방지 규약.
4. **타입** VarChar(200) 유지 vs Text 승격.
5. **라벨** '성립 사유/단절 사유' 채택 여부.
6. **DynastyRule.endReason 편집 UI 부재(사문)**를 이번에 끌어들이지 않고 별건 백로그로 두는 것 확인(스코프 폭발 방지).

---

## 8. 결론

사용자가 명시 요청한 **저비용 additive 개선**이며 needed=partial(yes·저우선). **안1**(startReason/endReason 단일 VarChar(200) nullable 2컬럼, enum·2필드쌍 불채택)을 채택하고, DateTime 날짜모델 결함 해소(안2)는 커플링된 **별건 P2**로 분리한다. 구현은 파일 11개·전 계층·M 규모이며, 실패 지점은 코드가 아니라 **타입 3~4곳(service·repository)·컨트롤러 3곳·검증 부재·clear 일관성** 배선 누락이다 — 하나라도 빠지면 유령 필드(기존 Rule.endReason의 전철)가 된다.
