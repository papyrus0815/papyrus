# 인물 상세 군주 재위 '즉위 상세' 기록 기능 검토

> 2026-07-16. 요청: "인물 상세 군주 재위 등록에서 즉위 상세 내용을 기록할 수 있는 기능 검토."
> 방법: 5개 서브시스템 병렬 정독(API 계약·인물상세 등록 UI·기타 진입점·표시 지면·인접 패턴) → 5렌즈 설계 검토(데이터모델·역사도메인·UX폼·표시가치·계약호환) 발견 47건 → **전건 적대 검증**(워크플로 검증 28건 + 세션 한도로 미실행된 19건은 근거 코드를 직접 열어 인라인 재검증). **반박 0 — CONFIRMED 41 + PARTIAL 6(정정 반영)**. 미구현.

## 1. 요약

"즉위 상세를 기록할 수 없다"의 실체는 **시작/종료 비대칭**이다. 재위·재임 양 테이블 모두 종료(퇴위)는 `endReason`(enum 11값) + `endReasonDetail`(Text) **쌍**인데, 시작(즉위)은 `appointmentMethod`(enum 7값) **단독**이고 상세 텍스트 반쪽이 없다(`government.prisma:319-321`, `:437-443`). 이 비대칭은 DTO(`create-career.dto.ts:764-829`)와 폼(퇴위 사유+상세 2행 vs 즉위 방식 1행, `sovereign-reign-register-panel.tsx:566-611`)과 읽기 카드(`퇴위: {사유} — {상세}` vs `즉위: {방식}`, `tenure-reign-list.tsx:166-193`)까지 전 층에 그대로 재현된다. 출생 검토(2026-07-03)가 확정한 '사망 대비 비대칭'과 정확히 동형의 구조다.

**정본 권고**: `appointmentDetail`(가칭) nullable Text 1컬럼을 **SovereignReign·GovernmentPositionTenure 양 테이블에 동시 additive** — 기존 'enum + 상세 텍스트' 쌍 문법(endReason/endReasonDetail, deathType/deathCause/deathNote)의 정확한 완성이며, birthNote 계보('억지대칭이 아닌 올바른 최소 대칭')와 동형이다. 대관식 날짜·장소는 컬럼을 만들지 않고 1차는 서사에 흡수, 정본 승격이 필요하면 Event 링크(BC 구조화 완비)로 간다.

표시 비용은 극히 낮다: 재위 카드 SubRow에 '즉위: {방식}' 칩이 이미 있고, endReasonDetail 전례가 "기록하면 보인다"를 실증한다. 반면 배선 함정은 명확하다 — 편집 hydrate는 include+스프레드라 자동 왕복되지만 **카드 표시는 인물 상세의 명시 select 2곳에 걸려 있어**, 누락하면 "모달에선 보이는데 카드엔 영영 안 뜨는" 반쪽 배선이 조용히 성립한다(응답이 `any[]`라 tsc도 못 잡음).

**전 배치 합계 마이그 1회(additive nullable TEXT 2컬럼)**. 병렬 스키마 WIP 없음 실측(libs/db/prisma 클린) — 대기 중인 판단성 마이그 큐(rank·입양 등)와 분리해 단독 진행 가능.

---

## 2. 진단 (실태조사)

### 2.1 계약 레이어 커버리지 매트릭스

| 항목 | 시작(즉위) | 종료(퇴위) | 근거 |
|---|---|---|---|
| 분류 enum | `appointmentMethod` 7값 O | `endReason` 11값 O | `government.prisma:79-94,96-120` |
| 상세 텍스트 | **전무 (스키마부터 없음)** | `endReasonDetail` Text O | `government.prisma:320-321,442-443` |
| DTO 수용 | enum만 | enum+상세 | `create-career.dto.ts:764-829` |
| 폼 입력 | '즉위 방식' 셀렉트 1행 | '퇴위 사유'+'퇴위 사유 상세' 2행 | `sovereign-reign-register-panel.tsx:566-611` |
| 카드 표시 | `즉위: {방식}` 칩 | `퇴위: {사유} — {상세}` | `tenure-reign-list.tsx:171-190` |
| 연보 표시 | **전무** | enum 라벨만(상세 누락) | `person-life-timeline-infographic.tsx:465-471` |

즉위 관련 기존 자산: `regnalName`(왕명 정식 컬럼), `RegnalEra`(연호, changeReason에 '즉위' 예시), `SovereignReignAchievement.eventId`(사건 링크), 즉위 시 나이(파생 배지). 결핍은 정확히 **경위 서사 한 칸**이다.

### 2.2 저작 UI 진입점 커버리지 (5곳)

| 진입점 | 쓰는 테이블 | appointmentMethod | endReasonDetail | 비고 |
|---|---|---|---|---|
| sovereign-reign-register-panel (인물 상세) | SovereignReign | O | O | 평면 12행, 공용 모달 토대 미이관 |
| register-monarch-modal (국가 상세 군주 등록) | SovereignReign | O | O | 군주 최대 커버리지 폼(연호 동시 등록) |
| tenure-register-panel (재임 등록/수정) | 생성=Tenure, 수정=recordKind 분기 | O | O | `editingIsSovereign` 분기로 재위도 수정(`:703-720`) |
| heads-of-state-section (국가 상세 역대수장) | 양쪽 | **X** | **X** | notes를 `왕명: X`로 **통째 대체**(`:823-825,853,879`) |
| global-heads-section (전역 수장) | 양쪽 | X | X | 위와 동형 |

군주 재위 데이터는 SovereignReign 단독이 아니다 — tenure-register-panel은 생성 시 항상 GovernmentPositionTenure에 쓰고, 병합 조회(`findTenuresByPersonId`)가 두 테이블을 `recordKind`로 합쳐 같은 카드 지면에 흘린다(`person.prisma.repository.ts:4148-4179`).

### 2.3 왕복(hydrate)·표시 데이터 경로 — 비대칭 주의

- **편집 hydrate**: `getTenuresByPersonId` → include + `...sr` 스프레드 → **새 스칼라 자동 왕복**(`person.prisma.repository.ts:4148-4171`). 수정도 진짜 `prisma.update`(delete-recreate 아님, `:4246-4257`) — 닉네임 reason 같은 hydrate 유실 위험 없음.
- **카드·연보 표시**: 인물 상세 `findByIdWithRelations`의 **명시 select** — governmentTenures(`:1611-1656`)·sovereignReigns(`:1661-1683`) 모두 컬럼 열거식이라 **새 컬럼은 명시 추가 전까지 절대 안 온다**. `showPositionInfo`·`regnalEras`가 이미 이 select에서 빠져 상세에 안 흐르는 실증 전례가 같은 블록에 있다.
- **응답 계약**: `PersonResponseDto.sovereignReigns?: any[]`(`person.response.ts:115-116`) — 어느 층에도 컴파일타임 강제 없음.

### 2.4 notes는 우회 저장처로 부적합 (실증된 유실 경로)

- heads-of-state-section은 저장 시 notes를 사용자 입력 없이 `왕명: X`(regnalName 없으면 undefined)로 재구성해 create/update 양쪽에 전송(`heads-of-state-section.widget.tsx:823-825,853,887`) — notes에 둔 즉위 서사는 이 위젯 경유 수정 한 번에 소리 없이 사라진다.
- notes는 백엔드 2곳 + 프론트 2곳이 `/왕명\s*:\s*(.+)/` 정규식으로 기계 파싱하는 레거시 인코딩 채널(`person.prisma.repository.ts:485-490`, 위젯 `:1081-1087`, 패널 `:262-266`).
- 반대로 **전용 컬럼**이면 update 계약(키 없음=유지, `person-career.ts:308` 주석 명문)과 repo undefined-가드(`:4230-4244`) 덕분에, 새 필드를 모르는 구 진입점의 수정 저장이 값을 건드리지 않는다 — **진입점 5곳을 한 번에 안 고쳐도 안전한 최소 슬라이스가 성립하는 근거가 곧 전용 컬럼**이다.

### 2.5 보안 현황 (교차 확인)

sovereign-reigns 계열 POST/PUT/DELETE/GET 전부 무가드(`government-position.controller.ts:474-501`, cabinets 계열의 `@UseGuards(AuthGuard('jwt'))`와 대조), update/delete는 accountId조차 안 받아 소유권 검사 전무(`person.service.ts:764-786`) — 2차 리뷰 P1 '서브리소스 소유권 전무' 패턴과 동일 계열. 즉위 상세 추가는 이 무소유권 쓰기 표면을 한 필드 넓히므로, 가드 작업(별도 배치)과의 합류를 §9에 명기.

---

## 3. 설계 결정 (배치 0 — 이 검토서로 확정 제안)

### D-1. 그릇 = 서사 Textarea, Text 컬럼 1개 (R20·R30, P1)

'즉위 상세'는 (a) endReasonDetail형 한 줄 부속구와 (b) 다문장 경위 서사의 두 물건을 한 이름으로 부르고 있다. 과제 정의(승계 경위·대관식·선왕 관계 "무엇을 어디까지")와 서사 스키마 선호를 보면 **(b)가 본질** — (a)만 넣으면 서사가 notes로 넘쳐 '왕명:' 인코딩 전철을 밟는다. 컬럼은 관행대로 `@db.Text` 1개(endReasonDetail·notes도 이미 Text), 폼은 notes형 Textarea, 표시는 '즉위: {방식}' 칩 유지 + **UnifiedNote형 자체 행**(개행 보존, `person-detail-panel.styles.ts:1233-1238`) 이원 렌더 — 짧게 쓰면 한 줄, 길게 쓰면 블록으로 두 사용 패턴을 모두 흡수한다. 2필드 동시 신설(부속구+서사)은 과설계.

### D-2. 스코프 = 양 테이블 동시 additive (R2·R41 채택, R24 소수의견 기각)

렌즈 간 유일한 실질 충돌 지점. UX 렌즈(R24)는 "재임 쪽은 mandateSource·electionCandidacyId가 취임 경위 정본이므로 SovereignReign 전용"을 주장했으나, 데이터모델(R2)·계약(R41) 두 렌즈가 독립적으로 양 테이블 동시를 권고했고 이를 채택한다. 결정적 근거:

1. **'억지대칭 금지'의 본뜻**은 'UNKNOWN/OTHER만 채워질 죽은 enum 신설 금지'이지 텍스트 컬럼 대칭 반대가 아니다 — `endReasonDetail`은 이미 양 테이블에 대칭 실존하고, 이번 컬럼은 그 쌍의 시작측 반쪽이다.
2. **공용 편집 채널의 구조**: tenure-register-panel은 `editingIsSovereign` 분기로 재위 수정을 담당하며 appointmentMethod·endReasonDetail 입력을 양 kind 공용으로 이미 보유(`:693-695,703-720`) — 스키마가 대칭이면 입력 1행 추가로 양 kind가 커버되지만, reign 단독이면 kind 조건부 분기가 생기고 **Tenure로 기록된 군주**(생성이 항상 Tenure 경유)는 즉위 상세를 구조적으로 기록 불가한 부분 커버리지(연호 전철)가 재생산된다.
3. 대통령·총리의 취임 경위 서사(승계 취임·권한대행·불신임 후 재집권)는 실수요다. mandateSource는 분류 enum이지 서사가 아니다.
4. 비용 차이는 같은 마이그 안의 한 줄이다.

**컬럼명은 `appointmentDetail`**(`appointment_detail`) 권장 — `appointmentMethod`와 쌍임이 드러나고 양 테이블에서 자연스럽다(reign 전용명 accessionDetail은 재임 테이블에서 어색). UI 라벨은 recordKind 분기('즉위 상세'/'취임 상세')로 기존 '즉위:/취임:' 접두 선례를 따른다.

### D-3. 대관식 = Event 링크 정본, 1차는 서사에 흡수 (R5·R8·R11·R31)

즉위일과 대관식일은 별개 사실이다(엘리자베스 2세 1952 즉위/1953 대관; 시드 실데이터에서도 카를 5세 1519 선출/1520·1530 이중 대관 등 반복 실증). 그러나 대관식일을 DateTime 컬럼으로 만들면 startDate의 결함 3종(BC 400 거부·MySQL DATETIME AD1000 하한·정밀도 부재)을 그대로 재생산하고, 소비할 표시 지면도 0에서 시작한다. 반면 **Event 경로는 이미 완비**: era+Int 구조화 날짜, `SovereignReignAchievement.eventId` 링크 문법, heads-of-state 타임라인의 `/선거|투표|취임|즉위|대관/` 색상 regex(`event-color.ts:45`), 퀵뷰 통합 기록의 EVENT 소스. **1차는 대관식 일시·장소를 서사 텍스트에 흡수**(placeholder로 유도)하고, 타임라인 노드 승격 수요가 실증되면 `accessionEventId` FK(SetNull, 양 테이블) additive를 2단계로. 부수: `startDate`='법적 재위 개시일' 주석 명문화(무마이그), 대관일을 startDate로 겸용한 기존 시드들은 전용 경로 도입 시 재분류 대상.

### D-4. 선왕(전임자) FK·섭정 FK 신설하지 않음 (R9·R14·R18)

- 같은 나라의 직전 재위는 countryId+regnalNumber 유니크·startDate 인덱스로 **질의 파생 가능** — 저장하면 stale FK 정합성 부채만 생긴다.
- 혈연은 가계도(fatherId/motherId)가 정본, 즉위 전 신분은 `preEnthronementTitle`이 정본, 섭정의 존재는 `GovernmentPositionType.REGENT` 재임으로 이미 구조화 가능 — 재위 레벨 관계 정본을 하나 더 만들면 정본 이원화 + cross-account 링크 문제(가계도 #5 전철)를 재생산한다.
- 전임 퇴위 사유(endReason)와 후임 즉위 경위는 같은 사건의 양면이라 텍스트 이중 기술이 구조적으로 예정되어 있으나, 각 재위가 자기 관점을 서술하는 것은 사료 기록 관행과 부합 — placeholder로 관점 구분만 유도('본인의 승계 경위를 여기에').

### D-5. AppointmentMethod enum 값 확장은 후속 분리 (R4·R12)

7값 어휘로는 정복(정복왕 윌리엄)·복위(restoration)·선거군주제(신성로마·폴란드)가 전부 HEREDITARY/COUP/OTHER로 뭉개진다 — 국가 계승 어휘(TransitionEventType)에는 있는 CONQUEST가 왕위 계승엔 없다. 그러나 enum **축 신설은 금지**(appointmentMethod·mandateSource와 3중 축이 됨)하고, **값 추가**(CONQUEST·RESTORATION·ELECTIVE_MONARCHY 2~3개)는 상세 텍스트와 직교하므로 1차에서 제외, 수요 확인 후 별도 additive 마이그로. 라벨은 `shared/lib/tenure-labels.ts` 단일 출처라 폼 2곳 자동 전파.

### D-6. 복위(2차 재위) 표현 명세 동반 결정 (R13)

`@@unique([countryId, regnalNumber])`가 같은 대수의 두 행을 금지해 복위 행은 regnalNumber NULL 강제(대수 표시 소실). 즉위 상세가 RESTORATION 서사를 받기 시작하면 이 케이스가 첫 충돌 지점 — **최소안**(복위 행은 regnalNumber NULL+subTermNumber 회차가 정본임을 문서화, 마이그 0)을 이번에 채택하고, 유니크 재구성(최대안)은 수요 시 별도.

---

## 4. 발견사항 전체 (47건)

렌즈: DM=데이터모델, HD=역사도메인, UX=폼, DV=표시가치, CC=계약호환. 판정: ✅=CONFIRMED, ◐=PARTIAL(정정 반영). 세션 한도로 워크플로 검증이 미실행된 19건(R25, R28, R31~R47)은 인라인 재검증으로 전건 확정.

| ID | 렌즈 | P | 제목 | 판정 |
|---|---|---|---|---|
| R1 | DM | P1 | 정본 권고: 시작측 상세 텍스트 1컬럼 additive — enum+상세 쌍 문법의 완성 | ✅ |
| R2 | DM | P1 | GovernmentPositionTenure 동시 대칭 — 공용 편집 채널의 요구 | ✅ |
| R3 | DM | P1 | notes 우회 수용은 실증된 유실 경로 — 전용 컬럼 필수 근거 | ✅ |
| R4 | DM | P2 | startReason enum 신설 기각 — 결핍은 '값'이지 '축'이 아님 | ◐ |
| R5 | DM | P2 | 대관식 날짜/장소 필드 1차 제외 — 도입 시 DateTime 금지, Int 구조화 | ◐ |
| R6 | DM | P2 | 별도 AccessionRecord 테이블 기각 — 1:1 부속은 배선·보안 표면만 늘림 | ✅ |
| R7 | DM | P2 | SovereignReignAchievement 재사용 기각 — 의미론 위반·관례 파싱 부채 재생산 | ✅ |
| R8 | DM | P3 | accessionEventId FK — 서사 컬럼과 직교, 2단계 additive 보류 | ✅ |
| R9 | DM | P2 | 선왕 FK 신설 반대 — 파생 가능·혈연 정본 중복·계정스코프 재생산 | ✅ |
| R10 | DM | P3 | 새 필드가 재위 패널의 null-해제 불가 결함을 상속 | ✅ |
| R11 | HD | P1 | 즉위일≠대관식일 — 대관식은 스칼라 날짜가 아니라 Event 링크가 정본 | ✅ |
| R12 | HD | P2 | appointmentMethod 어휘로 즉위 경위 표현 불가(정복·복위·선거군주 뭉개짐) | ✅ |
| R13 | HD | P2 | 복위가 regnalNumber 유니크 제약과 정면 충돌 — 복위 행은 대수를 잃음 | ✅ |
| R14 | HD | P2 | 전임 퇴위와 후임 즉위는 같은 사건의 양면 — 모순 기입 가능, 연결 어휘 부재 | ✅ |
| R15 | HD | P2 | 즉위 연도만 앎 — startDate 정밀도 부재로 01-01 둔갑 + 나이 파생 오염 | ✅ |
| R16 | HD | P3 | 연호 개원(changeReason)과 즉위 상세의 관할 경계 명문화 필요 | ✅ |
| R17 | HD | P3 | 동아시아 칭원법 1년 차의 수용처는 즉위 상세 텍스트뿐 | ◐ |
| R18 | HD | P3 | 섭정·수렴청정·공동통치 개시는 서사 텍스트가 정당한 수용처 | ◐ |
| R19 | HD | P3 | BC·AD1000 미만 군주는 원천 배제 — 새 날짜 필드 DateTime 금지 | ◐ |
| R20 | UX | P1 | 입력 그릇 결정 선행 — 한 줄 Input이냐 서사 Textarea냐가 전 층을 좌우 | ✅ |
| R21 | UX | P1 | 표시와 hydrate의 데이터 경로 분열 — 폼엔 자동, 카드엔 영영 안 뜸 | ✅ |
| R22 | UX | P2 | 수정 모드 빈 값 해제 불가(`\|\| undefined`) 함정을 새 필드가 상속 | ✅ |
| R23 | UX | P2 | 삽입 위치 = '즉위 방식' 직하 상시 노출 1행, enum 조건부 노출 부적합 | ✅ |
| R24 | UX | P2 | (소수의견) SovereignReign 전용 한정 — D-2에서 R2·R41로 기각 | ✅* |
| R25 | UX | P2 | tenure-register-panel에 editingIsSovereign 조건부 행(왕조 서수 선례) | ✅ |
| R26 | UX | P2 | 1차 쓰기 범위 = 패널+monarch-modal+tenure-panel 3곳, 거대 위젯 2곳 제외 | ✅ |
| R27 | UX | P2 | 서사 필드 도입으로 dirty-guard 없는 오버레이 닫힘의 유실 비용 질적 증가 | ✅ |
| R28 | UX | P3 | 대관식 구조화 1차 보류 — 서사 포함 + Event 링크 우회로 충분 | ✅ |
| R29 | UX | P3 | 나이 배지 'N세에 취임' 고정 — 재위 용어 미분기(동반 한 줄 수정) | ✅ |
| R30 | DV | P1 | 필드 성격이 표시 그릇 결정 — SubRow 칩 vs UnifiedNote 블록 | ◐ |
| R31 | DV | P1 | 대관식은 Event 링크가 표시 지면 최다 — 전용 컬럼은 노출 0에서 시작 | ✅ |
| R32 | DV | P2 | 연보 reign 노드 시작측 서사 0, endReasonDetail도 원래 누락(동반 교정) | ✅ |
| R33 | DV | P2 | 표시 관문이 인물 상세 select 하나로 수렴 — 누락 시 죽은 필드 즉시 실현 | ✅ |
| R34 | DV | P2 | 1순위 지면(재위 카드 SubRow) 즉시 안착 — endReasonDetail 전례 실증 | ✅ |
| R35 | DV | P2 | compare REIGN 레코드 summary null 고정 — 배선 시 시대비교가 공짜 서사 획득 | ✅ |
| R36 | DV | P2 | 방문자 지면 노출 경로 0(리스크 0) — 단 무가드 GET로 API 노출은 됨 | ✅ |
| R37 | DV | P3 | 밀집 메타 지면(역대수장·전역·스트립·퀵뷰 헤더)은 의도적 비노출 | ✅ |
| R38 | DV | P3 | '즉위 시 나이'는 파생 배지 기해결 — 저장 필드 검토 대상 제거 | ✅ |
| R39 | CC | P1 | 유실 지점은 컨트롤러가 아니라 '명시 매핑 4곳' — 반쪽 배선이 최위험 | ✅ |
| R40 | CC | P1 | notes 우회는 heads-of-state 수정 저장에서 통째 파괴 — 전용 컬럼이 유일 안전 | ✅ |
| R41 | CC | P1 | 이중 모델: SovereignReign에만 넣으면 Tenure 군주 기록과 계약 분열 | ✅ |
| R42 | CC | P2 | 두 편집 지면의 클리어 의미론 상반 — 새 필드는 null-clear 패턴 채택 | ✅ |
| R43 | CC | P2 | 쓰기 계약 정본은 person-career.ts 수동 인터페이스 — regnalName 드리프트 기존재, SDK 재생성 불요 | ✅ |
| R44 | CC | P2 | additive 2컬럼은 마이그 대기열과 분리해 단독 실행 가능(소스 클린 실측) | ✅ |
| R45 | CC | P3 | 편집 저장은 진짜 update + include hydrate — delete-recreate 유실 없음(긍정) | ✅ |
| R46 | CC | P3 | 응답 `any[]` — 컴파일타임 강제 전무(반쪽 배선이 조용한 근본 조건) | ✅ |
| R47 | CC | P3 | 동시대 수장 API도 select 기반 — 기본 범위 무수정 무해, 확장 시 명시 추가 | ✅ |

\* R24는 주장 자체(라벨 안전성·mandateSource 존재)는 사실로 확인되나 결론은 D-2에서 기각 — R2·R41이 반대 결론을 더 강한 근거(공용 편집 채널 구조·endReasonDetail 선례)로 확정.

---

## 5. 주요 발견 상세 (P1 중심)

### 5.1 스키마 — 무엇을 만들 것인가

- **R1 (P1)**: 확립 문법은 '분류 enum + 상세 텍스트' 쌍(endReason+endReasonDetail, deathType+deathCause+deathNote). 시작측은 enum(appointmentMethod)이 이미 있으므로 결핍은 정확히 '상세 텍스트 반쪽'. 즉위 경위 서사·대관식 언급·선왕 관계·즉위 시 상황이 전부 한 필드에 수용 가능. `appointmentDetail String? @map("appointment_detail") @db.Text`.
- **R3+R40 (P1)**: 마이그 0을 노린 notes 우회는 heads-of-state-section의 `notes: '왕명: X'` 통째 대체(`:823-825,853,887`)에 의해 **수정 한 번에 유실**되는 실증 경로. 전용 컬럼의 '키 없음=유지' 계약이 곧 최소 슬라이스 안전성의 근거. 기존 notes 속 즉위성 서술은 파싱 마커가 없어 기계 이행 불가 — 백필 금지 원칙대로 새 컬럼은 빈 채로 시작, notes는 그대로 둔다.
- **기각 옵션들**: startReason enum 신설(R4, 축 3중화), 대관식 DateTime 컬럼(R5·R19, BC 제약 재생산), AccessionRecord 별도 테이블(R6, 1:1 부속은 정보량 동일에 CRUD·보안 표면만 증가 — RegnalEra는 1:N이라 정당화된 경우), 업적 행 재사용(R7, '찬탈'이 업적으로 분류되는 의미론 왜곡 + showOnEventsPage 기본 true로 사건 페이지 오염 + title 문자열 관례 의존), 선왕 FK(R9).

### 5.2 역사 도메인 — 무엇을 담아야 하는가

- **R11 (P1)**: 즉위일(법적 개시)과 대관식일은 별개 사실인데 현 모델은 startDate 단일 개념. 대관식은 장소·집전자가 있는 전형적 '사건' — Event 정본+링크가 옳다(D-3).
- **R12·R13·R14**: enum 어휘 빈곤(정복·복위·선거군주), 복위의 유니크 충돌, 전임-후임 양면성 — 각각 D-5·D-6·D-4로 처리. 방향 공통점: **구조화는 최소, 서사가 수용처**.
- **R15**: startDate는 정밀도 필드 없는 NOT NULL DateTime — '연도만 앎' 군주는 01-01 날조 등록이 강제되고, 이미 표시 중인 '즉위 시 나이' 파생 배지가 오염된다. person(`birthDatePrecision`)·Event(`startDatePrecision`) 선례 동형의 `startDatePrecision` additive를 후속 배치로 명기(§7 배치 4).
- **R16·R17·R18**: 연호 개원과의 관할 경계(RegnalEra=기년 정본, appointmentDetail=경위 서사), 유년칭원의 1년 차 맥락, 섭정·수렴청정·공동통치 — 전부 서사 텍스트가 정당한 수용처이며 placeholder 예시로 유도.
- **R19**: BC 재위는 행 자체가 생성 불가(assertNoBcTenureDates)라 이 기능의 수혜 대상 외 — 'era 마이그 전까지 대상 외, AD<1000은 비보장'을 기대치로 고정.

### 5.3 폼 — 어디에 어떻게 넣는가

- **R20 (P1)**: 그릇 결정이 배선보다 선행(D-1). **R23**: 삽입 위치는 '즉위 방식' 직하 상시 노출 1행 — 기존 상세 필드 규약이 '항상 노출'(퇴위 사유 상세는 enum 미선택에도 표시)이고, 사망유형 점진노출 canon은 'enum 선택 시'가 아니라 '사실 존재 시'라 재위 모달 안에서는 상시 노출과 등가. enum 조건부 노출은 enum에 없는 경위(정복 등)의 입력을 차단하므로 부적합.
- **R22+R10+R42 (P2, 함정)**: 재위 패널은 수정 모드에서도 `|| undefined` 전송이라 'null=해제' 계약이 작동 안 함(지워도 안 지워짐) — 서사 필드는 '썼다 지우는' 편집이 잦아 체감 결함이 질적으로 커진다. 참조 구현은 바로 옆 tenure-register-panel의 `emptyAs = isEdit ? null : undefined` 패턴(`:668-669`). 래퍼 `UpdateSovereignReignDto`는 Omit+null 유니온 구조라 새 필드를 양쪽에 추가해야 null 전송이 타입상 가능해진다(`person-career.ts:308-332`).
- **R25·R26**: 1차 쓰기 범위 3곳 — sovereign-reign-register-panel, register-monarch-modal(군주 최대 커버리지 폼이라 빠지면 반쪽 기능), tenure-register-panel 행 1개(양 kind 자동 커버, 왕조 서수 조건부 행 선례 `:1071-1085`, '취임 방식'과 '퇴임 사유' 사이 배치). 거대 위젯 2곳은 전용 컬럼 전제 하에 안전 제외.
- **R27 (P2)**: 패널은 오버레이 클릭 즉시 닫힘 + dirty 추적 전무(`:392-403`) — 문단 서사가 한 클릭에 날아간다. 공용 confirm-dialog로 최소 dirty-guard를 **동반 필수**(완전한 모달 토대 이관은 분리 가능).
- **R29 (P3)**: 나이 배지가 재위에도 'N세에 취임' 고정 — `isReign` 분기 한 줄 동반 수정.

### 5.4 표시 — 기록하면 보이는가

- **R34+R30 (P1)**: 정본 노출 지면 = 재위 카드 SubRow. 게이트 조건(`appointmentMethod || endReason || endReasonDetail || notes`)에 필드 1개 추가 + '즉위: {방식}' 칩 아래 UnifiedNote형 자체 행. endReasonDetail이 읽기 지면 단 1곳(이 카드)만으로도 죽은 필드가 아닌 이유는 그곳이 인물 상세 개요 탭이기 때문 — 같은 보장을 최저 비용으로 얻는다.
- **R21+R33+R39 (P1, 최위험 함정)**: 컨트롤러는 dto 통짜 전달이라 illegitimate형 유실은 없다. 대신 **명시 매핑 지점**에서 반쪽 배선이 성립한다: ① repo add 매핑(`:4186-4207`) ② repo update undefined-가드(`:4230-4244`) ③ **인물 상세 select 2곳**(governmentTenures `:1611`·sovereignReigns `:1661`) ④ 프론트 표준 레이어(normalize.ts `:163-166`+types.ts `:67-70`) + 래퍼 DTO 2종. hydrate는 include+스프레드라 자동 통과하므로 ③④를 빠뜨리면 "모달 재열기는 멀쩡한데 카드에 영영 안 뜨는" 상태가 조용히 성립하고 `any[]`(R46)라 tsc도 못 잡는다. **검증은 반드시 '카드 표시'로**(모달 재열기는 다른 경로라 통과해도 무의미).
- **R32 (P2)**: 연보 reign 노드 description은 `[notes, endReason 라벨]`뿐 — 시작측 전무에 endReasonDetail조차 누락. `[즉위: {방식} — {상세}, notes, 종료: {사유} — {상세}]`로 시작·종료 대칭 확장(무마이그 프론트, 기존 누락 동반 교정). 즉위 point 노드 신설은 기간 노드와 중복이라 보류.
- **R35 (P2)**: compare API의 REIGN 레코드 `summary: null` 고정(`person-records.service.ts:254`) — `summary = toPlainSummary(appointmentDetail)` 배선 한 줄로 시대비교·'그 해 한 일'이 공짜로 서사 획득(같은 함수의 ACHIEVEMENT 선례 `:278`). 퀵뷰 레코드 소스는 '재임/재위 자체 제외' 주석 의도 존중해 불변.
- **R36·R37·R38**: 방문자 방 지면은 노출 경로 0(Phase B 인물 상세 읽기전용 설계 시 화이트리스트 결정으로 이관), 밀집 메타 지면 3종은 의도적 비노출 명기(공간 없음 — 클릭 후 상세 위임이 기존 위계), 나이는 파생 기해결이라 저장 제외.

### 5.5 계약 — 무엇이 부러지는가

- **R43 (P2)**: 실질 쓰기 계약은 nestia SDK가 아니라 `person-career.ts` 수동 인터페이스(axios 래퍼) — **SDK 재생성 불요**(build:nestia 우회 실행도 불필요). 단 이미 드리프트가 있다: Create DTO에 `regnalName` 선언이 없는데 패널은 보내고 있음(변수 경유라 excess property check 미발동) — 같은 diff에서 1줄 수복.
- **R44 (P2)**: libs/db/prisma 소스 클린 실측 + 최근 3주 동종 additive 3건 무사 통과(alias_reason 20260711, widen_section 20260716 등) — **마이그 대기열(rank·입양·dynastyOrdinal 등 판단성)과 합류 금지**, 합치면 단순 건이 인질로 잡힌다. `ts-node libs/db/prisma/run-migrate.ts add_appointment_detail` 단독 실행.
- **R45 (P3, 긍정)**: 재위 수정은 진짜 update라 hydrate 유실 구조 없음 — 과잉 방어(전용 상세 GET 신설 등) 불요.
- **R46·R47 (P3)**: 응답 타이핑(sovereignReigns 항목 shape만이라도 인터페이스화)은 선택 동반, contemporaries select는 기본 범위 무수정 무해.

---

## 6. 구현 배치 (레버리지순)

**배치 1 — 수직 슬라이스: 마이그+백엔드+정본 표시** (마이그 1회, 이 배치만으로 기능 성립)
1. `libs/db/prisma/government.prisma` 양 테이블에 `appointmentDetail String? @map("appointment_detail") @db.Text` + startDate 주석 '법적 재위 개시일' 명문화 → `run-migrate.ts add_appointment_detail`
2. `CreateSovereignReignDto`·`GovernmentPositionTenureDto`(create-career.dto.ts) 필드 추가 — update는 Partial 재사용이라 자동
3. repo 명시 매핑 4곳: addSovereignReign·updateSovereignReign + tenure측 add/update 대응 매핑
4. **인물 상세 select 2곳**(governmentTenures `:1611`·sovereignReigns `:1661`) 명시 추가 — 최위험 항목, 체크리스트 1급
5. `person-career.ts` Create/Update 2종 갱신(+regnalName 드리프트 수복) / `normalize.ts`+`types.ts` 명시 매핑
6. 읽기: tenure-reign-list SubRow 게이트+UnifiedNote형 행(recordKind 라벨 분기 '즉위 상세'/'취임 상세') + 나이 배지 용어 분기(R29)
7. 검증: 폼 저장 → **카드 표시** → 수정 모달 재진입 3점 왕복 라이브 확인

**배치 2 — 저작 3곳** (무마이그)
- sovereign-reign-register-panel: '즉위 방식' 직하 Textarea 상시 노출 1행 + **emptyAs(null-clear) 패턴**(신규 필드 필수, endReasonDetail·notes 소급 권장) + **dirty-guard**(공용 confirm-dialog)
- register-monarch-modal: 동형 행(즉위 방식 `:614-629` 아래)
- tenure-register-panel: 행 1개(양 kind 공용, '취임 방식'과 '퇴임 사유' 사이) — 이 패널은 emptyAs 기구현이라 해제 계약 공짜

**배치 3 — 표시 확장** (무마이그)
- 연보 reign 노드 description 시작·종료 대칭 확장(endReasonDetail 기존 누락 동반 교정)
- compare REIGN.summary 배선(시대비교·그 해 한 일 서사 획득)

**배치 4 — 후속 백로그** (각각 독립)
- AppointmentMethod 값 확장(CONQUEST·RESTORATION·ELECTIVE_MONARCHY, additive enum 마이그) — D-5
- `accessionEventId` FK(SetNull, 양 테이블) + 대관식 Event 안내 — D-3 2단계
- `startDatePrecision`(Event·Person 선례 동형) + 나이 배지 'N세경' 완화 — R15
- 업적 인라인 폼 eventId 저작 배선(표시 배지만 있고 저작 불가 — R7·R28·R31 교차 확인)
- 응답 타이핑(sovereignReigns shape 인터페이스) — R46
- heads-of-state/global-heads의 notes 통째 대체 패턴 근치(splitLegacyRegnalNote 재결합 선례) — R3 독립 후속
- 재위 패널 공용 모달 토대(RegisterModal/useModalBehavior) 완전 이관 — 알려진 잔여

## 7. 함정 체크리스트 (구현 시 필독)

1. **명시 매핑 전수**: 스키마 → DTO → repo add/update(×2 테이블) → **인물 상세 select 2곳** → 래퍼 2종 → normalize+types. ③④는 tsc가 못 잡음(any) — 라이브 왕복 검증 필수.
2. **검증은 카드 표시로**: 모달 재열기는 include 경로라 select 누락을 못 잡는다.
3. **null-clear**: 새 필드는 `isEdit ? null : undefined` 전송 + 래퍼 Update DTO의 Omit 목록·null 유니온 양쪽 추가.
4. **notes 우회 금지**: 파싱 채널이자 통째 대체 대상. 백필·이행 스크립트도 금지(마커 부재).
5. **dirty-guard 동반**: 서사 Textarea를 오버레이 즉시 닫힘 모달에 넣지 말 것.
6. **SDK 재생성 불요**: 래퍼 fetch 경로 — build:nestia 우회 실행하지 말 것.
7. **마이그 단독 실행**: 판단성 마이그 대기열과 합류 금지. 커밋 시 병렬 시드 WIP와 엉키지 않게 스키마·마이그 파일만 선별 stage.

## 8. 의도적 비범위

- 밀집 메타 지면 3종(국가 역대수장 격자·전역 수장·동시대 스트립·퀵뷰 헤더) 비노출 — 공간 구조상 서사 수용 불가, 클릭 후 상세 위임 (R37)
- '즉위 시 나이' 저장 — 파생 배지 기해결 (R38)
- 선왕·섭정 FK, 공동통치 그룹 — 서사 수용 + 기존 정본(가계도·REGENT 재임·PersonEvent) (R9·R18)
- BC 군주 재위 — era 마이그 전까지 행 생성 자체 불가, 본 기능 대상 외 (R19)
- heads-of-state/global-heads 위젯 저작 — 전용 컬럼의 '키 없음=유지' 계약으로 값 보존되므로 안전 제외 (R26)

## 9. 이관·연계 항목

- **소유권/가드**: sovereign-reigns 계열 전체 무가드+무소유권 실측(§2.5) — 2차 리뷰 P1 '서브리소스 소유권 전무' 배치와 합류해 일괄 처리(이 기능 범위 아님, 그러나 새 필드가 무가드 GET로 API 노출됨은 인지).
- **방문자(타계정 방) 노출**: Phase B 인물 상세 읽기전용 설계 시 '방문자에게 보여줄 서사 필드' 화이트리스트에 appointmentDetail 포함 여부 결정 (R36).
- **복위 유니크 재구성**(최대안)·**'재위 N년' 파생 표시**(칭원법 1년 차 선결) — 수요 실증 시 (R13·R17).
- **기존 데이터 실태 1회 조회**: 업적 title LIKE '%즉위%' 우회 저장분 파악(있어도 기계 이행 금지, 수동 재배치 안내) (R7).
