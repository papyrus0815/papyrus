# 인물 별칭 '이유' 등록 & 생몰년 미상 처리 검토

작성일 2026-07-11 · 대상 요구 2건 · 다각도(4렌즈 조사 + 적대적 검증) · **미구현(검토서)**

> (1) **"인물 별칭 이유가 등록할 수 있어야 한다"** — 별칭(별명·호·필명 등)마다 그 별칭이 붙은 **이유/유래**를 함께 기록·표시.
> (2) **"생몰 년도를 모를 수 있지 않은가, 그럴 때 어떻게 할지 검토"** — 출생/사망 연도를 완전·부분적으로 모르는 경우의 표현·입력·표시.

관련 선행 검토: [`docs/person-birth-info-improvement-review.md`](person-birth-info-improvement-review.md)(2026-07-03, 미구현). **본 검토는 그 문서를 재발명하지 않고 계승·정합**한다.

---

## 0. 한눈에

| 요구 | 진단 | 핵심 결론 |
|---|---|---|
| ① 별칭 이유 | **저장 그릇 자체가 없음**(PersonNickname = nickname/type/priority만). `type`(분류)·`birthNote`(출생 1:1)·`nameMeaning`(글자뜻 1:1)은 별칭 '행별 유래'를 담을 수 없음 | `PersonNickname.reason` 신규 컬럼 = **유일한 그릇**(net-new). 단 저장이 delete-recreate라 **프론트 hydrate 동시 배포 없으면 저장 때마다 이유 소실** |
| ② 생몰 미상 | circa·완전미상·한쪽미상·BC·생존은 이미 표현 가능. **'연도만 앎(월/일 미상)'이 지금도 01-01로 날조 저장되는 진행형 무결성 손상**. '세기/활동시기(floruit)'는 구조 전무 | **선행 검토 §3-2가 이미 `birthDatePrecision` 설계 완료** → 계승 구현. floruit는 net-new라 별도 소배치 유보 |

---

## 1. 현행 구조 (코드 기준)

### 1-1. 별칭 = `PersonNickname` (1:N 자식)
- 스키마 `libs/db/prisma/person.prisma:650-675` — `nickname`(VarChar100) / `type`(VarChar50?) / `priority`(Int?) + 메타. **이유 컬럼 없음.**
- DTO `NicknameDto`(`create-person.dto.ts:146-159`) 3필드 → 도메인 `person.repository.ts:118,202` 3필드 → 저장 `person.prisma.repository.ts` create(`:1871`)·**update = deleteMany+createMany**(`:2054-2067`).
- 응답: `PersonResponseDto`엔 nicknames 자체가 **없고**, 상세 `getDetailById` 인라인 반환 타입(`person.controller.ts:428`, 매핑 `:572-577`)으로만 노출. 상세 include는 `nicknames:true`(raw 전 컬럼)라 **신규 컬럼은 조회엔 자동 포함, 매핑에선 버려짐**.
- 저작 UI `nickname-section.tsx` — 행마다 [유형 datalist] + [별칭] 2필드. 편집 로드(`person-register-view.tsx:748-755`)는 `{nickname,type}`만 복원(**priority조차 미복원**).
- 표시: `person-detail-panel.tsx:1291-1305` — priority 오름차순 칩(type 라벨 + 값). 이유를 붙일 자리 없음.

### 1-2. 생몰 = Person 스칼라
- `person.prisma:139-198` — `birthEra`(BC/AD) · `birthDate`(DateTime?) · `isBirthDateUnknown` · `isBirthDateApproximate`(circa, 미상과 배타) · `birthNote`(Text) + 사망 대칭 + `isAlive` + `birthOrder`(Int?).
- **정밀도 컬럼 없음. floruit/세기 표현 없음.** (정밀도 선례는 `PersonLifeEvent.startDatePrecision` = `String? VarChar(10)` 'year'|'month'|'day'.)
- 저작 UI `life-section.tsx` — 연/월/일 인라인 + `출생일 미상`·`추정` 형제 토글(배타) + 사망 3-way(생존중/사망/일자미상). **월/일을 비운 채 연도만 입력 가능**하나 그 의도를 담을 컬럼이 없음.
- 표시: `birth-death-cards.tsx` — 값 있으면 `+경`(circa), 없고 미상 플래그면 `미상`; **둘 다 없으면 카드 통째 미렌더**. 공용 포맷터 `shared/lib/lifespan-text.ts`는 부호연도 기반(`1500–1558`/`BC 100–BC 44`/`약 1500`/`1500–?`/`1950–`), **연(年) 해상도**.

---

## 2. 요구① — 별칭 '이유' 등록

### 진단
- **G1(blocker)** 저장 컬럼 부재. 저장 map이 3필드 하드코딩이라 스키마만 늘려도 자동 반영 안 됨.
- **G2(medium)** `type`(아명/자/시호 = 분류)과 `reason`(왜 붙었나 = 유래)은 직교. 혼용하면 프리셋·검색 오염 → 별도 컬럼.
- **G3(high)** delete-recreate 함정: reason 컬럼만 추가하고 편집 폼이 hydrate 안 하면, **무관 필드만 수정→저장 시 전 별칭 이유가 조용히 삭제**(배우자가 겪어 id보존 upsert로 고친 churn과 동형).
- 검증: birthNote/nameMeaning/type 재사용은 **중복 아님(refuted)** — 셋 다 별칭 행별 유래를 담을 구조가 아님. 선행 검토 §4-2도 `type` 정식화 얘기지 reason이 아니므로 **net-new**.

### 설계 — `PersonNickname.reason`
```prisma
// person.prisma PersonNickname 내
/// 이 별칭이 붙은 이유·유래·일화 (예: '피와 철 연설에서 유래')
reason String? @map("reason") @db.VarChar(300)
```
**배선 체크리스트**(누락하면 조용히 유실):
1. 스키마 소스 편집 → `npm run db:build` → `run-migrate.ts add_person_nickname_reason`(nullable = additive, 백필 없음).
2. `NicknameDto` + `@IsOptional @IsString @MaxLength(300) reason?`(`forbidNonWhitelisted=true`라 **DTO 선언 필수**, 안 하면 클라 전송 시 400).
3. 도메인 nicknames 타입 2곳(`person.repository.ts:118,202`)에 `reason?: string`.
4. repo create map(`:1874`)·update map(`:2058`) 둘 다 `reason: nick.reason?.trim() || null`(한쪽만 하면 동작 불일치).
5. 컨트롤러 상세 반환 타입(`:428`)·매핑(`:572-577`)에 `reason`.
6. `build:nestia`(무동작 우회) → `web-admin/src/shared/api/person/` 래퍼 갱신.
7. **★ 유실 방지(G3)** 폼 로드(`:748-755`)에 `reason` 복원 + 제출 빌드(`:1590`)에 포함을 **컬럼과 원자적으로 동시 배포**. (여력 시 nickname 저장을 배우자식 id보존 upsert로 전환.)
8. UI: `nickname-section.tsx` 행에 이유 입력 추가(권고 = 하단 풀폭 짧은 input/2행 textarea — 유래는 산문이라 132px 3분할보다 가독) + 상세 칩에 `title` 툴팁/보조 캡션.

효과: **M**(마이그 1 + 배선). UI만 = 마이그 없음.

---

## 3. 요구② — 생몰년 미상·부분지식

### 지식 상태별 표현 가능성

| 상태 | 지금 표현되나 | 근거/결함 |
|---|---|---|
| (a) 정확한 날짜 | ✅ | — |
| (c) 대략(circa) | ✅ | `isBirthDateApproximate` + 표시 `경`/`약` |
| (d) 완전 미상 | △ | `isBirthDateUnknown`로 저장O, 그러나 **둘 다 없으면 카드 미렌더**(표시 사각) |
| (f) 출생만/사망만 미상 | ✅ | 두 플래그 독립 |
| (g) BC/고대 | ✅ | `birthEra` + 부호연도 포맷터 |
| (h) 생존 중 | ✅ | `isAlive` → `1950–` |
| **(b) 연도만 앎, 월/일 미상** | ❌ | **`buildUtcDateFromParts`가 `month\|\|1/day\|\|1`로 01-01 저장**(`controller.ts:69`), 응답이 UTC getter로 월/일 항상 산출 → **'연도만'이 '1월 1일 확정'으로 왕복 날조. 진행형 무결성 손상**(지연될수록 백필 불가 행 누적) |
| **(e) 세기/활동시기(floruit)** | ❌ | 구조 전무. `birthNote` 자유텍스트만 → 정렬·질의·타임라인 배치 불가 |

부수 결함:
- **G4** circa(연도 부정확)와 precision(월/일 미상)은 직교인데 UI 어포던스가 `추정` 토글 하나뿐 → 연도만 아는 큐레이터가 잘못 `추정`을 눌러 의미 오염.
- **birthOrder 死필드** — 스키마 주석은 '형제 정렬 1차 키'인데 web-admin 정렬부에서 **한 번도 안 읽음**(grep 0). 생년 미상 형제 다수 케이스에서 정렬 붕괴 방지가 미작동.
- **circa 표기 이원화** — 정본 `lifespan-text.ts`는 `약 1500`(접두), `birth-death-cards`는 `1500년경`(접미). **선행 검토 §3-2 확정 canon = '1500년경'(접미)이라 커밋된 코드가 문서 결정과 모순.**
- **native Date BC 재발 진입점** — `genealogy utils.yearOf`가 `new Date().getUTCFullYear()`(BC 부호 소실). 새 표현을 합성 DateTime으로 흘리면 재발 → **반드시 정수 부호연도로만** 다루고 `parseIsoDateParts`로 치환.

### 옵션

- **옵션A — `birthDatePrecision`/`deathDatePrecision`(year|month|day)** · 마이그 O · **선행 검토 §3-2가 이미 설계 완료**
  `String? @db.VarChar(10)`(enum 금지, PersonLifeEvent 선례). **사용자 미노출·서버 파생**(month 없음→year, day 없음→month). 응답 매퍼가 `precision<DAY면 birthDay=null` 게이팅 → 01-01 날조 차단. circa Boolean과 **직교**(연도 확실+월/일만 모름 표현 가능). (b)+(d)+발견성 해결. **레거시 NULL=출처불명, 소급 판정 금지**(백필금지).
- **옵션B — floruit 전용 컬럼(`floruitStartYear/EndYear`+era)** · 마이그 O · **net-new**
  생몰이 아예 없고 활동시기만 아는 고대·중세 인물용. 생몰과 배타 아닌 **폴백**(생몰 있으면 미표시). `lifespan-text`에 `fl. 15세기`/`활동 1200–1250` 브랜치. 대상 극소수 → **UI 항상 노출 금지, '양쪽 미상 시'만 점진 노출**. 선행 검토 §5 기각 철학(극희소=死컬럼)이 압력 → 데이터 수요 확인 후 승격.
- **옵션C — 스키마 무변경(발견성만)** · 마이그 X
  빈 카드 반전 + 미상 어포던스 대칭. **한계: (b) 무결성 손상을 못 멈춤**(buildUtcDateFromParts는 여전히 01-01). A의 대체 아님 — A 착수 전 임시 완충이거나 마이그 유보 시 최소 조치.

---

## 4. 선행 검토와의 정합 (`person-birth-info-improvement-review.md`)

| 항목 | 상태 |
|---|---|
| 별칭 reason(유래) 컬럼 | **net-new** (§4-2는 `type` 정식화·CRUD 배선이지 reason 아님) |
| §4-2 전제('닉네임 쓰기 API·UI 없음, DTO 고아') | **stale** — 현재 nickname-section·NicknameDto·create/update 매핑 모두 배선 완료(그 사이 구현됨) |
| `birthDatePrecision/deathDatePrecision` | **overlaps** — §3-2가 컬럼·서버파생·circa 직교·표기규약까지 확정. **계승, 포크 금지** |
| circa Boolean·서버 배타 정규화·표시 | **overlaps** — 이미 구현됨 |
| circa 표기 `약`(코드) vs `1500년경`(§3-2) | **contradicts** — 코드가 문서 확정안과 어긋남 |
| floruit/세기 | **net-new** — 본문·기각표 §5 어디에도 없음 |
| `birthOrder` 정렬 1차 키 배선 | **overlaps** — §3-4가 복합키 계획, 현재 死필드 |
| 응답 매퍼 month/day null 게이팅 | **net-new 보강** — §3-2는 '서버 파생'만 명시, 읽기측 null화·하류(isoDateSortKey) 영향은 미명문 |
| 빈 카드 반전 | **overlaps** — §4-1 계획 |

---

## 5. 횡단 리스크 (요구①②·구현 시 공통)

1. **화이트리스트 깔때기** — 컨트롤러가 dto→service를 필드별 수동 나열(create `:824`, update `:941`). 선행 검토 §1-1이 `illegitimate`가 정확히 이 깔때기에서 탈락해 DB 0행이던 버그를 지적. **reason·precision도 매핑 한 곳만 누락하면 동일하게 유실** → 저장→상세 재조회 왕복 검증 필수.
2. **delete-recreate churn** — nickname은 여전히 delete-recreate(id 매번 재발급). reason 같은 콘텐츠 컬럼 얹으면 손실 위험 증폭 → 프론트 hydrate 원자 배포 or upsert 전환.
3. **native Date BC** — 위 §3 참조. 정수 부호연도만.
4. **배포 순서** — `forbidNonWhitelisted=true` → 새 DTO 필드는 **API 선(또는 동시) 배포** 없으면 프리플라이트 400. `build:nestia` 무동작 우회 + 래퍼 수동 갱신 한 세트.
5. **마이그 합류** — reason·precision·birthOrder배선 전부 additive nullable(백필 없음). 병렬 스키마 WIP 드리프트 회피상 **단독 migrate 금지** → 선행 검토가 계획한 배치(가계도 rank·결합상태·입양 등)에 합류해 1회 migrate 권고.

---

## 6. 결정 사항 (추천안)

| # | 결정 | 추천 | 근거 |
|---|---|---|---|
| D1 | 별칭 이유 저장 위치·타입 | **`PersonNickname.reason` VarChar(300)** (수요 확인 시 Text 승격) | 재사용 불가(코드 확인). 300이면 DTO MaxLength로 400 유도 → 500 롤백 회피 |
| D2 | reason delete-recreate 유실 방지 | **프론트 hydrate를 컬럼과 원자 동시 배포** (+여력 시 upsert 전환) | 백엔드 단독 선배포 = 데이터 유실 회귀(금지) |
| D3 | (b) 연도만/월일 미상 표현 | **옵션A(§3-2 계승)** | 진행형 무결성 손상 차단. C는 발견성만·부채 증가 |
| D4 | floruit/세기 | **precision 먼저, floruit는 별도 소배치 유보** | net-new·극소수, §5 기각 압력. CENTURY 흡수는 '출생≈세기' 오의미 |
| D5 | circa 표기 통일 | **`1500년경`(접미, §3-2 canon)** — `lifespan-text.ts`를 문서에 맞춤 | 코드가 팀 결정과 모순 상태, 드리프트 최소화 |
| D6 | 마이그 시점 | **선행 검토 배치에 additive 1회 합류** (+§4-B 깔때기 회귀 테스트 선결) | 백필 없음, 단독 migrate = WIP 드리프트 |

---

## 7. 권고 구현 순서

- **배치1 (마이그 X, 즉시)** — 요구① UI 골격 준비 + §3 표시 정합: circa 표기 통일(D5), 빈 카드 반전(옵션C), `lifespan-text` floruit/세기 브랜치는 필드 생기기 전까진 死코드라 **보류**, 재구현 5벌→정본 수렴은 별도 대작업.
- **배치2 (마이그 O, 선행 검토 배치 합류)** — 요구① `reason` 컬럼 + 요구② `birthDatePrecision`(옵션A) + `birthOrder` 정렬 배선. **컨트롤러 깔때기 회귀 테스트 선결**, reason·precision 각각 저장→재조회 왕복 검증.
- **배치3 (유보)** — floruit(옵션B), nickname upsert 전환.

> 미해결 = §6 결정 6건. 특히 D3/D4/D6은 선행 검토 배치와 엮이므로 그 배치 착수 시점과 함께 확정.
