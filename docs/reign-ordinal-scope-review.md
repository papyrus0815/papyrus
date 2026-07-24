# 군주 재위/재임 '즉위 순서(서수)' 스코프 검토

> 검토 대상: 인물 상세의 「군주 재위 등록 모달」·「재임 등록」에서 입력하는 즉위 순서/서수(제N대·N세·왕조 N대)가 **무엇을 기준으로 세는가(스코프)** 를 데이터모델·UI가 명시·검증·표시하는가.
> 근거는 file:line으로 표기. 적대검증에서 정정(PARTLY)된 항목은 correction을 반영했고, 검증되지 않은 주장은 "미확인"으로 표기했다.

---

## 0. 구현 현황 (2026-07-23) — 정본 P 채택 + 옵션 A 부분 구현

데이터 실사에서 기존 시드가 `regnalNumber`를 **두 의미로 혼용**함을 확인했다: 그레이트브리튼·도쿠가와 = **positional 제N대**(앤=1대, 조지1세=2대, 이에야스=1대), 러시아 황제 = **이름별**(Peter=1→표트르1세, Catherine=2→예카테리나2세, Ivan=6→이반6세). 즉 F1은 이론이 아니라 러시아 시드에서 이미 `@@unique`와 충돌한다(표트르1세=1·예카테리나1세=1이 같은 realm에 regnalNumber=1 둘).

다수 데이터(GB·도쿠가와·대통령)와 `@@unique`, 주 패널 라벨이 모두 positional을 전제하므로 **최소파괴·무마이그레이션 경로인 정본 P를 채택**한다:

> **정본 P** — `termNumber`/`regnalNumber` = **선택한 국가/정체 기준 통산 즉위 순서(제N대)**, 한 realm에 1대는 한 명(`@@unique` 유지). "루이 14세·이반 6세"式 **이름별 번호는 `regnalName` 문자열**에(GB가 이미 '조지 3세'로 이렇게 함). 왕조 서수=`dynastyOrdinal`, 본인 회차=`subTermNumber`. 재위(reign) 통산 축=`regnalNumber`, 재임(tenure) 통산 축=`termNumber`.

이로써 사용자 질문의 답이 명료해진다: **"제N대는 링크한 국가/정체 기준으로 센다"** — 푸앵카레를 제3공화국(하위 역사국가)에 링크→제3공화국 제N대, 현대 프랑스에 링크→프랑스 통산. 하인리히 4세의 '4'는 이름별이라 `regnalName`에.

**구현된 것 (옵션 A, 프론트 한정·무마이그레이션·미커밋)** — tsc 0·lint 순증 0:
| 파일 | 변경 | 해소 |
|---|---|---|
| `register-monarch-modal.tsx` | '대수/재위번호'→'즉위 순서(제N대)' 라벨·힌트, 이름별 번호는 왕명에 안내, 소속국가 힌트에 **스코프 설명**, `termNumber` 이중대입 제거(regnalNumber만) | F3·F2·F6(입력) |
| `tenure-register-panel.tsx` | 재위 수정 라벨 '재위번호/루이14→14'→'즉위 순서(제N대)/러시아 제국 제1대', 이름별은 재위명 | F4 |
| `sovereign-reign-register-panel.tsx` | 즉위 순서 힌트에 스코프 + 이름별→재위명 명시 | F4·F6(입력) |
| `heads-of-state-timeline/lib/normalize-tenures.ts` | `ordinalOf` kind-aware(재위=regnalNumber·재임=termNumber 우선)로 인물상세와 통일 | F7 |

**추가 구현 (2026-07-23, 미커밋)**:
- **✅ 러시아 황제 시드 정정** — `person.russia-emperors.seed.ts`의 `regnalNumber`를 이름별(표트르=1·예카테리나2세=2·이반6세=6…)에서 **positional 제1~14대**로 재분류(각 인물 설명의 "제N대 황제"가 정답). 유니크 가드(561-576행)가 이름별 중복(=1이 6명)을 "다른 인물 점유"로 걸러 **12명 재위가 실제로 SKIP되던 활성 버그** 해소 → 14명 전원 생성. 중복 0 확인. (`russia-tsardom.seed.ts`는 이미 positional 차르국 제N대라 무변경.) 이름별 번호를 카드 왕명으로 노출하려면 reign-level `regnalName` 세팅이 추가로 필요(현재 person-level만·영문 'Peter' — 별도 개선).

**남은 것 (미구현)**:
- **스키마 주석 동기화** — `government.prisma`의 `regnalNumber` 주석 3곳 상충(:318·:373-375·:455-458)을 정본 P로 통일(주석 전용, `db:build`만·마이그 불요). 병렬 세션 소스 드리프트 위험이 있어 단독 커밋 시 반영 권장.
- **옵션 B/C** — 이름별 번호를 **숫자 축으로도** 다루고 싶으면(정렬·질의) 그때 `@@unique` 재설계 + 데이터 재분류가 필요. 현재 정본 P에선 불요.

---

## 1. 문제 — 서수는 무엇을 기준으로 세는가

즉위 서수(제N대·N세·왕조 N대)는 항상 **"무엇에 대해 세는가"라는 암묵적 스코프**를 갖는다. 그러나 Papyrus에는 그 스코프를 명시하는 필드가 없고, 오직 세 겹의 암묵 규약으로만 결정된다.

1. **어느 FK에 매다는가** — `countryId`(현대국가 전체) vs `historicalCountryId`(정체 포함 역사국가).
2. **어느 서수 축에 값을 넣는가** — termNumber / subTermNumber / regnalNumber / dynastyOrdinal.
3. **`Person.dynastyId` 파생** — 왕조 스코프는 재위 행이 아니라 인물의 현재 소속에서 유도.

그 결과 큐레이터는 서수의 계수 기준을 의식적으로 선택할 수 없고, 시스템은 큐레이터가 의도한 스코프를 저장·검증·표시하지 못한다.

### 예1 (대통령 · 정체 스코프)

푸앵카레를 등록할 때 "제N대"를 **'프랑스 제3공화국'**(별도 `HistoricalCountry`로 시드됨) 기준으로 셀지, **'현대 프랑스 전체'** 기준으로 셀지가 `historicalCountryId`에 매느냐 `countryId`에 매느냐로 조용히 갈린다. 그러나 UI·DTO·응답 어디에도 그 인과를 설명·표시하는 텍스트가 없다. 프랑스는 정체별로 세고(제3·4·5공화국 비통산), 미국은 국가 통산인데, 어느 FK가 그 나라 관행에 맞는지 강제·검증하는 규칙이 없어 자유 오배치가 가능하다.

### 예2 (왕조·이름 · 복합 스코프)

하인리히 4세의 서수 4는 잘리어 왕조 시작이 아니라 **'독일왕 전통에서 하인리히라는 이름의 4번째'**(이름 × realm 복합 스코프)다. 그런데 스키마에는 realm(FK)만 있고 '이름' 축이 유니크 키에 포함되지 않아, `@@unique([countryId, regnalNumber])`가 하인리히4·오토1·콘라트2를 같은 realm에 regnalNumber로 저장하지 못하게 막는다. 반면 '부르봉 왕조 5대'식 왕조 스코프는 별도 축(`dynastyOrdinal`)으로 존재하나 `SovereignReign`에만 있고 `GovernmentPositionTenure`에는 없다.

---

## 2. 현재 상태 — 코드가 실제로 하는 것

### 2.1 서수 4축 (두 테이블 비대칭 분포)

| 축 | 의미 | SovereignReign | GovernmentPositionTenure | 유니크 제약 | 필드 주석 |
|---|---|---|---|---|---|
| `termNumber` | 국가 통산 대수(동양식 제N대) | 있음 (`government.prisma:312`) | 있음 (`:446-448`) | 없음 (비유니크 인덱스만 `:529`) | 없음 (`:312`) |
| `subTermNumber` | 기(같은 대 내 회차) | 있음 (`:313`) | 있음 (`:450-453`) | 없음 | 없음 (`:313`) |
| `regnalNumber` | **의미 상충** (아래) | 있음 (`:314`) | 있음 (`:455-458`) | **있음** (`@@unique` `:376-377`) | 없음 (`:314`) |
| `dynastyOrdinal` | 왕조 내 서수 | 있음 (`:316-320`) | **부재** | 없음 (자유 정수 `:319`) | 있음 (`:316-320`) |

**`regnalNumber` 의미 상충** — 한 컬럼이 세 곳에서 다르게 정의된다.
- `SovereignReign` `@@unique` 주석 (`:373-375`): "동양식 즉위 서수 n대 · 국가당 1대는 단 한 명 · start_date순 포지셔널 ordinal (예: 표트르 = 러시아 제국 1대)".
- 같은 모델 필드 설명 (`:318`): "이름별 재위번호(국가 스코프)" — **같은 테이블 안에서 자기모순**.
- `GovernmentPositionTenure` (`:455-458`): "루이 14세식 서양 이름별 · 서양 전용 · 동아시아는 termNumber", 유니크 없음.

> 검증 각주: `SovereignReign`에는 `regnalName VarChar(100)`이 `:354`에 실존하므로 "이름 축 필드가 전혀 없다"는 문자 그대로는 부정확하다. 그러나 `regnalName`이 유니크 키(`:376-377`)에 포함되지 않아 이름별 충돌을 해소하지 못하므로, 저장 실패라는 결론에는 영향이 없다.

### 2.2 스코프 결정 메커니즘

| 스코프 종류 | 결정 방식 | 문제 |
|---|---|---|
| 정체 vs 국가 전체 | `countryId`(`:303`) vs `historicalCountryId`(`:306`) 중 택1 | 둘 다 nullable, '정확히 하나' 제약 없음 → 둘 다 NULL(모호) 또는 둘 다 채움(두 유니크 동시 참여) 가능 |
| 왕조 | `Person.dynastyId` 파생 | 재위 행에 dynasty FK 없음 → 시점/다왕조 구분 불가 |
| 이름 축(유럽 regnal) | — | 유니크 키에 이름 미포함 → 저장 자체가 막힘 |

### 2.3 입력부 (진입점마다 규약이 다름)

| 진입점 | termNumber | regnalNumber | 비고 |
|---|---|---|---|
| person-detail 재위/재임 패널 | 재임 전용 | 재위 전용 | 교차 폴백 **명시적 금지** (`tenure-register-panel.tsx:645-648·710-711·733-734`) |
| country-detail 군주 모달 | 단일 state | 단일 state | 하나의 입력값을 **두 축에 동시 대입** (`register-monarch-modal.tsx:208·412-413`) |

- `dynastyOrdinal`만 스코프("소속 왕조 내 순번 · 별개 축")를 명시하나, 정작 **소속 왕조를 선택·표시하는 컨트롤은 어느 패널에도 없음**.

### 2.4 백엔드

- `person.prisma.repository.ts:4392-4395`(create)·`:4447-4450`(update): DTO 4축을 **원값 write**, 서수 연속성·중복·스코프 검증 콜 없음.
- 유일 date 가드는 `assertNoBcTenureDates`(BC 금지)뿐. 그 외는 소유권·cabinet 무결성 가드만 존재(`service.ts:845-900`).
- `resolveTenureCountryFields`: 두 FK 슬롯을 모두 받고 재라우팅까지 하지만 **스코프를 기록하지 않음**.

### 2.5 표시부

- 부모 `ordinalOf`(`person-detail-panel.tsx:678-681`): termNumber/regnalNumber를 **하나의 `ordinalNum`으로 병합** (재위 = regnalNumber 우선 `:680`, 재임 = termNumber 우선 `:681`) → 병합 시점에 어느 축이었는지 소실.
- `tenure-reign-list.tsx:145-154`: 재위 `N대` / 재임 `초대·제N대`로 렌더. `subTermNumber`는 ` M기`로 이어붙임(`:152`).
- 정체/국가명은 별도 메타칩(`:161`, 파생 `:101-102`)으로 분리 — **서수와 결합되지 않음**.
- `dynastyOrdinal`만 왕조명 접두(`:162-167`)하나, 그 왕조명은 `person.dynasty.name`(현재 소속, 주입 `:2147`)에서 옴.

---

## 3. 핵심 발견 (심각도 순)

### P1

#### F1 · regnalNumber 이중정의 + 유니크 오적용으로 유럽식 이름별 넘버링이 저장 불가 (CONFIRMED)

- **문제**: `@@unique`는 regnalNumber를 '국가당 1대는 단 한 명'(포지셔널 동양식 n대)으로 강제하지만, 같은 필드가 Tenure와 SovereignReign 자기 자신(`:318`)에서 '이름별 서양 재위번호(루이14)'로 정의된다. 유럽식은 이름 × realm 스코프라 앙리4·루이4가 같은 realm에 공존해야 하는데, `@@unique([countryId, regnalNumber])`/`([historicalCountryId, regnalNumber])`가 이를 막는다.
- **근거**: `government.prisma:373-377`(@@unique + 동양식 주석) vs `:318`(이름별·국가스코프) vs `:455-458`(Tenure 서양 이름별).
- **영향**: 프랑스 왕국(historicalCountry) 아래 앙리 4세를 regnalNumber=4로 등록한 뒤 (가상의) 루이 4세를 regnalNumber=4로 등록하면 `uq_sovereign_reign_histCountry_regnal` 위반으로 두 번째 재위 저장이 거부됨. 유럽 군주 데이터 입력이 근본적으로 막히거나, 이름을 무시하고 즉위순 ordinal로 오용하게 됨.

#### F2 · 스코프를 명시·강제하는 필드가 없고 FK 이중슬롯이 nullable·비배타라 '1대 단 한 명' 불변식이 무력화

> 이 항목은 제공된 적대검증 목록에 별도 verdict가 없음 — REFUTED가 아니므로 분석 원안대로 유지하되 "미검증" 표기.

- **문제**: 서수가 '프랑스 전체'인지 '제3공화국'인지 저장·조회 어디서도 구분되지 않는다. `countryId`·`historicalCountryId` 둘 다 옵셔널이고 '정확히 하나' CHECK가 없어, 둘 다 비면 모호, 둘 다 채우면 두 유니크에 동시 참여한다. 두 `@@unique`가 FK 슬롯별로 분리돼, 같은 France를 두고 어떤 재위는 `countryId=FR`에, 어떤 재위는 `historicalCountryId=제3공화국`에 매달리면 regnalNumber '1대'가 슬롯마다 각각 한 명씩 허용된다.
- **근거**: `government.prisma:303-307·438-441`(둘 다 nullable, 배타 제약 없음), `:376-377`(FK 슬롯별 분리 유니크); `repository.ts:4392-4395`(검증 없음). *(미검증)*
- **영향**: 대통령 재임을 현대 France에 매느냐 제3공화국에 매느냐로 '제N대' 계수 기준이 조용히 바뀌지만 어느 필드에도 기록되지 않아, 나중에 '이 20대는 무엇 기준인가'를 데이터만으로 복원할 수 없고, 정체를 혼용 입력하면 '한 국가 1대는 한 명' 규칙이 사실상 무력화됨.

#### F3 · country-detail 군주 모달의 단일 '대수/재위번호' 필드가 termNumber·regnalNumber에 같은 값을 동시 대입 (CONFIRMED)

- **문제**: `register-monarch-modal`은 regnalNumber state 하나를 받아 payload의 termNumber와 regnalNumber 두 축에 동일 값을 넣는다. 두 축 분리 입력이 UI적으로 불가능해, 하인리히 4세처럼 이름별 재위번호(4)와 국가 통산 대수가 달라야 하는 경우를 표현할 수 없다. person-detail 패널은 **정반대로** 교차 폴백을 명시적으로 금지한다 — 같은 컬럼이 진입점에 따라 오염 방식이 갈린다.
- **근거**: `register-monarch-modal.tsx:208`(단일 state, label `:613`)·`:395-398`(단일 num 파생)·`:412-413`(`termNumber: num, regnalNumber: num`) ↔ `tenure-register-panel.tsx:645-648·710-711·733-734`(교차 폴백 금지).
- **영향**: country 상세에서 등록한 군주는 termNumber와 regnalNumber가 항상 같은 값으로 오염되어, 동양식 통산 대수와 서양식 이름별 번호가 다른 군주(대부분의 유럽 군주)를 정확히 기록할 수 없고, 같은 인물이 진입점에 따라 다른 데이터 형태로 저장됨.

### P2

#### F4 · 동일 regnalNumber 컬럼을 두 패널이 정반대 라벨·규칙으로 노출 (CONFIRMED)

- **문제**: sovereign-reign 패널은 regnalNumber를 '즉위 순서(n대) · 표트르 = 러시아 1대 · 국가당 1대는 단 한 명(배타)'으로, tenure 패널은 같은 컬럼을 '재위번호 · 루이 14세 14 · 서양 이름별(비배타)'로 제시한다. 스키마 주석 상충이 UI로 그대로 전파됨.
- **근거**: `sovereign-reign-register-panel.tsx:771·778·780-782` vs `tenure-register-panel.tsx:1093·1100·1102-1104` (같은 컬럼: `:513` editingIsSovereign, `:734` parsedOrdinal→regnalNumber); 근원 `government.prisma:373-375` vs `455-458`.
- **영향**: 큐레이터가 어느 규칙으로 숫자를 넣을지 패널마다 다른 답을 얻어, 같은 컬럼에 포지셔널 값과 명목 값이 뒤섞여 축적됨. 이후 정렬·유니크·표시 로직이 어느 의미를 가정해도 일부 데이터가 틀림.

#### F5 · 재위 'N대' 글리프의 렌더 무차별성 + regnalNumber 주석 자기모순 (PARTLY — 정정 반영)

- **확정된 결함**:
  1. `ordinalOf`가 regnalNumber와 termNumber를 하나의 `ordinalNum`으로 병합해 **축 정체성을 소실**하고, 재위를 무조건 `N대`로 찍는 렌더 무차별성 (`person-detail-panel.tsx:678-681`, `tenure-reign-list.tsx:145-148`).
  2. regnalNumber 의미를 **SovereignReign 내부에서조차 모순 정의**한 주석 (`government.prisma:318` '이름별 재위번호' vs `:373-375` '동양식 통산 n대').
- **정정 (원안 과장 교정)**: 재위(SovereignReign) 경로에서 regnalNumber의 **정본 의미는 '국가 통산 대수(N대)'**이다(schema `@@unique` `:373-375` + 재위 모달 힌트 `:780-782` "표트르 대제 = 러시아 제국 1대"). 규약대로 입력된 루이 14세는 서수칩에 '14대'가 아니라 프랑스 통산 대수가 떠 regnalName의 14와 중복되지 않는다(`person.tokugawa-shogunate.seed.ts`도 regnalNumber=통산 대수, regnalName=숫자 없는 이름으로 이중인코딩 없음). 따라서 **'루이 14세 = 14대 오독/이중인코딩'은 렌더가 현재 강제하는 결함이 아니라**, 상충 주석(`:318`)을 따르는 큐레이터가 14를 저장하면 발생할 수 있는 **잠복 입력 위험**이다.
- **영향**: 상충 주석이 정리되지 않으면 같은 컬럼에 포지셔널 값과 명목 값이 섞이고, 병합 렌더가 그 축 차이를 표면에서 지워버림.

#### F6 · 서수와 정체명이 분리 렌더되어 '이 대수가 이 정체 안에서 센 값'이라는 결합 주장이 없음 (CONFIRMED)

- **문제**: 서수('제10대')는 타이틀 행에, 정체/국가명('프랑스 제3공화국')은 별도 메타칩에 렌더되어 문법적·시각적으로 묶이지 않는다. termNumber가 '정체 스코프'인지 '국가 전체 스코프'인지 라벨에 표기할 자리가 없다.
- **근거**: `tenure-reign-list.tsx:143-158`(서수=타이틀)·`161`(countryName=메타칩, 파생 `:101-102`).
- **검증 각주**: `dynastyOrdinal`은 `:162-167`에서 이미 왕조명 접두(`부르봉 왕조 5대`)로 스코프 라벨을 가지므로, 메타 행에 스코프 라벨을 붙일 자리는 존재한다("표기할 자리가 없다"는 termNumber/regnalNumber 축에 한정된 표현). 이 축들은 실제로 bare 렌더된다.
- **영향**: 독자가 '제10대'가 제3공화국 기준인지 프랑스 전체 기준인지 스스로 추론해야 하고, 정체별로 세는 프랑스식 대통령 대수가 국가 통산으로 오독될 수 있음.

#### F7 · precedence 불일치로 같은 재임이 화면마다 다른 서수를 표시 (PARTLY — 원인 경로 정정)

- **확정된 결함**: 재임에서 **화면 간 서수 precedence가 반대**라는 사실은 실재. 인물상세 `person-detail-panel.tsx:681`은 재임 = `termNumber ?? regnalNumber`(termNumber 우선), 「국가원수 타임라인」 페이지 `widgets/heads-of-state-timeline/lib/normalize-tenures.ts:117-120`은 재임 = regnalNumber 우선(종류 무관).
- **정정 (원인 경로 오귀속 교정)**: 원안이 지목한 `normalize.ts:142`는 라이브 경로가 **아니다** — 그 파일의 `normalizeTenure`(단수)는 프로덕션 호출자가 0개(자기 spec만)인 사실상 죽은 코드다. 또 원안의 "국가상세" 화면은 이 경로로 재임 대(ordinal)를 렌더하지 않으므로 부정확하다(country-detail의 ordinal 용례는 내각 강조색맵·선거 정렬 회차뿐). 실제 불일치가 노출되는 곳은 **heads-of-state 타임라인 페이지**다.
- **영향**: termNumber와 regnalNumber가 다르게 채워진 재임(예: F3로 오염된 레코드)에서 인물상세 ↔ 국가원수 타임라인 간 서수 불일치가 노출되어 데이터 신뢰도 훼손.

#### F8 · dynastyOrdinal 비대칭·파생 취약 — Tenure에 부재하고 행이 왕조를 직접 못 가리킴 (CONFIRMED)

- **문제**: `dynastyOrdinal`은 `SovereignReign`에만 있고(`:316-320`) `GovernmentPositionTenure`(`:418-537`)에는 없어, 모델 docstring(`:413-417`)이 예시로 든 군주(세종 제4대·루이14세)를 Tenure로 기록하면 왕조 서수를 표현할 방법이 사라진다. 또 SovereignReign 행에 dynasty FK가 없어(`:297-379`) 왕조 스코프가 `Person.dynastyId`(nullable SetNull, `person.prisma:251`)에서만 파생되므로, 부르봉(프랑스·스페인)처럼 다국가·다왕조 통치에서 어느 왕조 기준 서수인지 재위 행만으로 결정할 수 없다.
- **근거**: `government.prisma:316-320`·`418-537`·`297-379`; `create-career.dto.ts`의 `CreateGovernmentPositionTenureDto`(`671-781`)에 dynastyOrdinal 부재(있는 곳은 `CreateSovereignReignDto` `:814`).
- **영향**: 비군주 재임에 '보나파르트가 N대' 같은 왕조 서수를 못 부여하고, 재위 시점 왕조와 인물 현재 왕조가 다르면 파생 스코프가 어긋남.

#### F9 · dynastyOrdinal 접두 왕조명이 재위 record가 아닌 인물 현재 dynastyId에서 와 시점 불일치 (CONFIRMED)

- **문제**: `tenure-reign-list`는 dynastyOrdinal 앞에 왕조명을 붙여 '부르봉 왕조 5대'처럼 스코프를 명시하는 유일한 축이지만, 그 왕조명이 재위 레코드가 아니라 `person.dynasty.name`(현재 소속)에서 주입된다. 재위 record 타입 `TenureLikeRecord`(`types.ts:11-46`)에는 dynasty 필드가 아예 없어 재위 시점 추적이 구조적으로 불가능하고, 단일 prop이라 해당 인물의 **모든 재위 카드에 동일 왕조명**이 붙는다. 왕조가 없으면 bare '왕조 5대'로 강등된다.
- **근거**: `tenure-reign-list.tsx:162-167`(props 정의 `:50`); 주입 `person-detail-panel.tsx:2147`(`person.dynasty?.name ?? null`).
- **영향**: 왕조를 옮긴 인물(왕조 교체기)이나 다왕조 인물의 재위 카드에서 잘못된 왕조명이 접두되어 역사적 오정보를 표시.

### P3

#### F10 · subTermNumber '기'와 termNumber '대'가 붙어 렌더되어 같은 계수 축처럼 읽힘 (CONFIRMED)

- **문제**: 서로 다른 스코프(본인 회차 vs 국가 통산)인 두 숫자가 단일 `<UnifiedOrdinal>` span 안에서 '제10대 2기'로 공백 하나만 두고 이어붙는다(`:152`). 두 값을 시각적으로 구분하는 마크업/스타일이 없어(동일 font-size 11.5px·weight 600·tertiary 색, `person-detail-panel.styles.ts:1199-1204`) '기'가 '대'의 하위 분할처럼 읽힐 여지가 있다.
- **근거**: `tenure-reign-list.tsx:145-153`; 스코프 정의 `types.ts:21-23`.
- **영향**: 복위·다기 재임의 회차 의미가 통산 대수의 소수점처럼 오해될 여지.

#### F11 · 백엔드·스키마에 서수 검증 및 필드주석 부재 (PARTLY — 과장 교정)

- **확정된 결함**: create/update 어디에도 서수 연속성·중복·스코프 정합성 검증이 없고(유일 date 가드 = BC 금지, 그 외 소유권·cabinet 가드뿐, 서수 검증 0), `SovereignReign`의 termNumber/subTermNumber/regnalNumber는 필드레벨 `///` 주석이 전혀 없어 이 테이블만 보는 개발자·큐레이터가 축의 스코프를 알 수 없다.
- **근거**: `repository.ts:4392-4395`(create)·`4447-4450`(update, 원값 write); `government-position.controller.ts:477-484·496-499·440·455`(BC 가드만); `government.prisma:312-314`(주석 없음).
- **정정 (원안 과장 교정)**: 원안의 "중복 서수가 조용히 저장"은 regnalNumber에 대해 사실이 아니다 — `@@unique([countryId, regnalNumber])`·`@@unique([historicalCountryId, regnalNumber])`(`:376-377`)가 같은 국가/역사국가 스코프 내 regnalNumber 중복을 **DB에서 거부**한다(조용한 저장이 아니라 제약 위반 예외). 조용한 중복 저장 리스크는 유니크 제약이 없는 **termNumber·subTermNumber·dynastyOrdinal** 및 **스코프 간(정체/왕조/이름별) 정합성·서수 연속성**에 한정된다.
- **영향**: 유니크 없는 축의 오배치·중복·건너뛴 서수가 조용히 저장되고, 스키마를 읽는 사람이 의미를 `@@unique` 주석과 타 테이블에서 역추론해야 함.

#### F12 · dynastyOrdinal의 표준 서수 오인 위험 (PARTLY — 상당 부분 완화 확인)

- **확정된 사실**: `dynastyOrdinal`은 유니크 없는 자유 정수(`government.prisma:319`)이자 큐레이터 지정(`:316-317`) 개념이며, 입력 폼에서 상시 노출된다(`sovereign-reign-register-panel.tsx:800-815`).
- **정정 (원안 과장 교정)**: "공식 대수로 오인할 위험"은 과장이다. 입력 폼은 이미 구분 장치를 갖춘다 — (1) 라벨 "왕조 서수 (선택)"(`:802`), (2) 플레이스홀더 "예: 5 (부르봉 왕조 5대 국왕)"(`:809`), (3) FieldHint "국가 통산 대수·재위번호와 별개입니다"(`:811-813`). 표시 측(`tenure-reign-list.tsx:162-166`)도 dynastyOrdinal을 제목의 대수 옆이 아니라 **왕조명 접두가 붙은 별도 메타 칩**으로 렌더하며, 제목의 맨 'N대'는 regnalNumber다. 또한 이 패널에는 termNumber(국가 통산 대수) 필드 자체가 없어 "국가 통산 대수와 나란히 입력"은 부정확하다.
- **영향**: 라벨·힌트·왕조명 접두로 스코프가 이미 드러나 있어 혼란 위험은 상당 부분 완화되어 있음. 잔여 위험은 낮음.

---

## 4. 권고 (최소변경 → 정공법)

### 옵션 A — 라벨·도움말·표시 결합만 (스키마 무변경) · effort **S**

1. `register-monarch-modal`의 단일 '대수/재위번호' 필드를 termNumber/regnalNumber 두 입력으로 분리하고 person-detail 패널의 교차폴백 금지 규칙과 통일 **(F3)**.
2. 각 서수 필드에 "선택한 국가/정체 기준으로 셉니다 (현재: OO)" 동적 힌트 추가 — FK 선택이 계수 우주를 바꾼다는 인과 명시 **(F2·F6)**.
3. 표시부에서 서수와 정체명을 결합 렌더("프랑스 제3공화국 제10대"), 재위 이름별은 'N대' 대신 regnalName만, 통산은 별도 **(F5·F6)**.
4. regnalNumber 주석/라벨을 한 의미로 통일하고 self-contradiction(`:318` vs `:373`) 정리 **(F4·F5)**.
5. person-detail `ordinalOf`와 heads-of-state 타임라인 `normalize-tenures.ts`의 precedence 단일화 **(F7)**.

- **장점**: 마이그레이션·데이터 변경 없음, 즉시 배포 가능, 큐레이터 혼동과 표시 오독을 크게 줄임.
- **한계**: 근본 결함(유니크 오적용 = F1, FK 비배타 = F2, dynastyOrdinal 비대칭 = F8)은 남음. regnalNumber 유니크가 여전히 유럽식 이름별 넘버링을 막음.

### 옵션 B — 유니크 재설계 + FK 배타 + 축 대칭 (중간 마이그레이션) · effort **M**

1. regnalNumber 유니크를 이름 축 포함으로 재정의: `(countryId, regnalName, regnalNumber)` / `(historicalCountryId, regnalName, regnalNumber)` — 유럽식 이름별 공존 허용 **(F1)**. 동양식 포지셔널 대수는 termNumber로 이관하고 그쪽에 스코프 유니크.
2. `countryId` XOR `historicalCountryId` 애플리케이션 레벨 강제(정확히 하나) + 검증 추가 **(F2)**.
3. `dynastyOrdinal`을 `GovernmentPositionTenure`에도 추가해 대칭화 **(F8)**.
4. 백엔드 create/update에 서수 중복·스코프 검증 콜 삽입 **(F11)**.

- **장점**: F1·F2·F8·F11 실제 해소, 서양/동양/정체 데이터를 모두 정확히 저장, 표시부도 신뢰 가능한 데이터 위에서 동작.
- **한계**: 기존 regnalNumber 데이터(termNumber와 뒤섞여 오염된 레코드) 재분류 마이그레이션 필요, 유니크 변경은 기존 위반 데이터 정리 선행 필요.

### 옵션 C — 명시적 스코프 모델 도입 (정공법) · effort **L**

1. 서수마다 `ordinalScope` enum(`NATION_TOTAL` / `POLITY_REGIME` / `DYNASTY` / `NAME_REALM`)을 레코드에 기록해 '무엇에 대해 세는가'를 데이터로 남김.
2. `SovereignReign`에 `dynastyId` FK 추가해 왕조 스코프를 파생이 아닌 명시로 **(F8·F9)**.
3. regnalNumber를 (person × name × realm) 복합 서수로 정식 정의하고 동양식 termNumber와 축을 완전 분리, 두 테이블 서수 의미를 단일 진실화(공용 서수 서브모델 추출) **(F1·F4)**.
4. `HistoricalEntityKind`(REGIME/PERIOD)를 스코프 라벨 파생에 연결해 표시부가 '제3공화국 스코프'를 자동 명시 **(F6)**.
5. 복위·공위·대립교황을 위한 유니크 예외 정책 명문화.

- **장점**: 모든 스코프 축을 명시·검증·표시 가능, 나라별 대통령 관행·다realm 군주·왕조교체·복위를 모두 정확히 표현, 단일 진실 출처 확보.
- **한계**: 대규모 스키마 변경(신 enum·FK·서브모델) + 전량 백필 마이그레이션 + DTO/SDK/프론트 전 경로 개편, 회귀 위험 큼, 큐레이터에게 스코프 선택 부담 증가.

### 권고 경로

**A → B → C 순차**. A는 표시·라벨 오독(F3~F7·F10)을 낮은 비용으로 즉시 완화하고, B는 유럽식 저장 불가(F1)·FK 비배타(F2)라는 근본 결함을 해소하며, C는 스코프를 데이터로 정식화하는 정공법이되 제품 정책 결정(§5)이 선행되어야 한다.

---

## 5. 결정 필요 사항 (제품/정책 질문)

1. **regnalNumber 정본 의미**를 무엇으로 확정할 것인가 — 동양식 포지셔널 '제N대'(현 `@@unique` 전제)인가, 서양식 이름별 재위번호(현 Tenure·`:318` 주석)인가. 둘 다 필요하면 축을 분리해야 하며, 이 결정이 유니크·표시·검증 전부를 좌우한다.
2. **대통령 서수의 기본 스코프**를 정체(프랑스식: 제3공화국별)로 할지 국가 통산(미국식)으로 할지 — 나라별 관행이 다른데 큐레이터가 자유 선택하게 둘지, 국가별 정책을 시스템이 강제·기본값 제시할지.
3. **`countryId` XOR `historicalCountryId` 배타 강제** 여부 — 강제하면 기존 이중/공백 데이터 마이그레이션 비용이 발생하고, 현재 재라우팅 로직(구 클라이언트 호환)과의 관계 정리가 필요하다.
4. **`dynastyOrdinal`을 공식 역대 서수와 동급으로 계속 노출할지**, 비표준 큐레이션 배지로 시각적 위계를 낮출지. (F12 정정에 따르면 현행 라벨·힌트·접두가 이미 상당 부분 구분하므로, 잔여 위험은 낮음 — 우선순위 재평가 대상.)
5. **`SovereignReign`과 `GovernmentPositionTenure`의 재위/재임 기록 이중화**를 유지할지(서수 의미·유니크·왕조축 지원이 테이블마다 달라 단일 진실 출처가 없음), 공용 서수 서브모델로 통합할지.
6. **복위(찰스2세)·공위기(interregnum)·대립교황** 등 '같은 realm 내 카운트 불연속·중복' 사례에 대한 유니크 예외 정책을 어떻게 명문화할지.
