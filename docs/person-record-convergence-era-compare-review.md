# 인물 기록 채널 수렴 + 시대 비교(예: 16세기 각국 왕) 검토

- 작성일: 2026-07-05
- 상태: **0~3단계 + P1 + 수시(학력 UI) 구현 완료** (2026-07-05, 미커밋, tsc 0·신규 lint 0·jest 33 통과·API 런타임 검증). 4·5단계(인덱스·연보 era 마이그)는 계획대로 가계도 대기 마이그 배치에서 진행.
- 발단: "인물 상세에 전기·연보 등 기록 기능이 비슷한데 나뉘어 있는 것 같다. 인물이 몇년도에 뭘 했는지 등록하면 다른 인물과 비교할 수 있으면 좋겠다 — 예: 16세기 각국 왕 비교"
- 방법: 5축 병렬 탐색(스키마·인물상세 UI·기존 비교 지면·API·기존 검토문서) → 중복 매트릭스 분석 → 설계안 3안 경쟁·심사 → 하중 지지 주장 8건 적대 검증(CONFIRMED 7 / PARTIAL 1)

---

## 0. 결론 요약

1. **"나뉘어 있다"는 직감은 사실이다 — 그러나 수렴할 것은 채널(테이블)이 아니라 계약이다.** "인물이 시점 T에 X를 했다"를 담는 모델은 6계열 20여 개(전기·연보·사건참여·재임/재위/업적·경력 9종+학력/수상·관계/타도메인 파생)이고, 진짜 문제는 채널 수가 아니라 **채널마다 시간 표현 계약이 다른 것**이다(구조화 era 완비=Event 유일, 연보=DATETIME+precision(BC 불가), 전기=비구조 산문). 채널 통폐합은 기존 검토들이 확정한 "억지 수렴 금지" 경계(§4)에 걸린다.
2. **"16세기 각국 왕 비교"는 이미 있다 — `/heads-of-state`(헤더 "수장 비교").** 국가 여러 개를 핀해 가로 연도축에 재임/재위 막대를 나란히 그리고, 연도 클릭 시 그 시점 각국 수장을 동시대 패널로 비교하며, URL 공유·JSON 내보내기까지 지원한다. 요구와의 갭은 신규 기능이 아니라 **발견성·세기 프리셋 부재·"그 해 무엇을 했는가"(재임 막대가 아닌 기록 내용) 부재**다.
3. **권고: 스키마 0의 읽기모델 우선(안1 골격) + 비교 UX 장치 이식(안3) + 장기 시간 계약 로드맵(안2).** 신규 `GET /persons/records/compare` 통합 읽기 API(5소스 union)를 만들고 기존 지면(heads-of-state·persons-timeline)에 주입한다. 마이그레이션은 가계도 대기 마이그 큐와 동일 배치로 뒤로 뺀다(4·5단계).
4. **선행 결함 1건(P1)**: 연보 `GET /person-life-events/by-person/:personId`는 현재 **무인증·무계정스코프**다(person-life-event.controller.ts:49-61, 검증 CONFIRMED). 비교 API가 연보를 노출하기 전에 이 구멍을 닫고, v1 연보 스코프는 own-account-only로 고정한다.

---

## 1. 현황: "T에 X를 했다" 기록 채널 중복 매트릭스

| 채널 | 모델 | 시간 구조화 | BC | 계정 스코프 | 교차인물 질의 | 저작 위치 |
|---|---|---|---|---|---|---|
| 전기 | `Person.biography` Text + `PersonSection`(HTML 섹션 5종) — person.prisma:179,347-374 | **없음**(본문 텍스트) | — | Person 경유 | 불가 | 개요 탭 인라인, PUT /persons/:id delete-recreate |
| 연보 | `PersonLifeEvent` — person.prisma:387-431 | DATETIME+precision 문자열, **era 컬럼 없음** | ❌ (BC 입력 시 AD 둔갑 저장, 연보리뷰 F4) | ✅ 직접 accountId | 불가(by-person 단건, 기간 파라미터 없음) | 연보 탭 모달, 전용 REST |
| 사건 참여 | `Event`+`PersonEvent` 피벗 — event.prisma:242-366,473-499 | **era/year/month/day 구조화 — 전 스키마 유일 완전** | ✅ | createdById 필수 | 부분(GET /events?century 有, personId 필터 無) | **사건 상세에서만** 저작(인물 상세는 읽기 전용) |
| 재임/재위 | `GovernmentPositionTenure`·`SovereignReign` — government.prisma:388-496,291-349 | DATETIME 필수, era 없음 | ❌ (BC 재위 저장 불가) | ✅ 직접 accountId + startDate 인덱스 | **가능** — 국가별 tenures API 전역 반환 | 진입점 5곳 분산 |
| 업적 | `TenureAchievement`(:502-539)·`SovereignReignAchievement`(:352-373) | DATETIME 선택 | ❌ | 부모 경유 | 부분 | 재임 카드 인라인 폼. **eventId 정본 링크 보유** |
| 경력 9종 | Military/Business/…Career — person.prisma:795-1364 | DATETIME? | ❌ | 부모 경유 | 불가 | 경력 모달 |
| 학력·수상 | `PersonEducation`·`PersonAward` | DATETIME? | ❌ | 부모 경유 | 불가 | 수상=모달, **학력=추가 UI 자체 부재**(표시·삭제만) |
| 관계 시간축 | Spouse·HumanRelationship+Phase·CountryAffiliation | DATETIME | ❌ | 부모 경유 | 불가 | 관계 모달·가계도·등록 모달 |
| 타 도메인 | TreatySignatory·ElectionCandidacy·BelligerentSide.commander·Book.publishedYear(Int) | 부모 상속/자체 DATETIME/Int | Book만 이론상 음수 | 부모 경유 | 부분 | 각 도메인 지면(인물 상세엔 표시 전용) |

구조적 관찰 3가지:
- BC를 온전히 기록하는 통로는 **Event 하나뿐**. Person 생몰은 era 플래그+크기값 DATETIME 하이브리드(person.controller.ts:75,882-895 주석 규약)로 그 중간에 낀 상태.
- 교차 채널 dedup 장치는 없고, 방어는 연보 모달의 warning-only 3종뿐(동일 제목+일자·재임기간 겹침·직위성 카테고리 힌트 — person-life-event-form-modal.tsx:458-502, 전부 저장 허용).
- 유일하게 작동하는 "중복 대신 참조" 장치는 업적의 `eventId` 링크(government.prisma:509-510 · SovereignReignAchievement :357-358, 검증 PARTIAL — 실재 확인, 행번호만 정정).

### 실제 중복 시나리오 (요약)

- **A. "이순신 1592년 임진왜란 참전"** — 연보·사건+PersonEvent·전기 섹션·재임 업적·군사 경력 **5채널 동시 기입 가능**, 각각 다른 형태로 저장.
- **B. "카이사르 BC 44년 암살"** — Event=정상 저장 / 연보=**무경고 AD 44 둔갑** / Person.deathDate=저장은 되나 가계도에서 AD 둔갑 표기(G2) / SovereignReign.endDate=**표현 자체 불가** / 인물 타임라인=연결돼 있어도 era 필드 select 누락으로 은닉(F7). 같은 사실이 채널에 따라 정확/둔갑/불가/은닉 — **중복이 아니라 모순 데이터가 생산되는 구조**.
- **C. "루터 1517년 95개조"** — Book(Int 연도)·연보(DATETIME)·Event(구조화)·전기(산문), 같은 발표가 시간 타입 4종으로 병존.
- **D. 수상/학력** — 전용 테이블 vs 연보 AWARD/EDUCATION 카테고리 이중 정본. 특히 학력은 **전용 테이블의 추가 UI가 없어서**(addEducation 래퍼 미사용) 연보에 적는 게 오히려 자연스러운 상태 — UI 공백이 중복을 유도.
- **E. 파생 vs 저작** — 타임라인이 가족 생몰 파생 노드를 "같은 날짜의 연보 존재"라는 잘못된 키로 무조건 억제(F34).

---

## 2. "16세기 각국 왕 비교" — 이미 있는 것과 갭

### 이미 있는 것: `/heads-of-state` (헤더 "수장 비교")

- 국가(현대+역사) 무제한 핀 → 가로 연도축에 재임(TENURE)+재위(SOVEREIGN_REIGN) 막대 병렬, 계승국 한 행 묶기(고려→조선→대한제국→대한민국).
- 연도 클릭 → 우측 ContemporaryPanel에 그 시점 각국 수장 카드 + "그 해의 사건".
- 프론트 시간축은 BC 음수 연도 지원(time-scale.ts:14-30), URL 공유(?pins/range/year)·JSON·인쇄, 사건 상세에서 "{연도}년 동시대 수장 비교" 딥링크.
- 보조: `/persons-timeline` 인물 대시보드(매트릭스=국가×연도 lane, 시대 스토리=세기 그룹, 능력치 레이더 5명 비교) — 단 **본인 등록분만**(GET /persons/infographic 계정 스코프).

### 갭 (층위별, 전부 코드 검증 완료)

| 층위 | 결함 | 근거 |
|---|---|---|
| 스키마 | 재임·재위 startDate가 era 없는 필수 DATETIME → **BC 왕 비교는 저장부터 불가**(16세기 AD는 통과) | government.prisma:316,431 (CONFIRMED) |
| 스키마 | Person에 구조화 연도 컬럼 부재 — 고대·BC 인물 세기 null(세기 리더보드가 이미 결론) | person.prisma:140-155 |
| 인덱스 | Event 구조화 연도(startYear/startEra) 인덱스 없음 — 동시대 사건 패널·세기 질의 풀스캔 | event.prisma:363-364 (CONFIRMED) |
| 인덱스 | 재임·재위 endDate 인덱스 없음 — 기간 겹침(overlap) 질의 반쪽 | government.prisma 인덱스 전수 |
| API | 기간 파라미터 있는 재임 질의 부재 — 국가별 tenures가 **그 국가 전체 역사**를 내려주고 클라가 자름 | government-position.controller.ts:112-146 (CONFIRMED) |
| API | 통합 엔드포인트 부재 — 핀 세그먼트당 N회 병렬 GET("MVP에선 segment 수만큼 GET" 주석). "16세기에 재임 기록이 있는 국가"를 서버가 답할 수 없어 **사용자가 국가를 미리 알아서 핀해야** 비교 성립 | use-segment-tenures.ts:29-47 (CONFIRMED) |
| API | 노출 정책 3색 비대칭: 정부직=전역 무가드 / 인물 상세=계정 스코프 / 연보 GET=**무인증** | (CONFIRMED) |
| 프론트 | 세기 단위 프리셋 부재 — 고대/중세/근세(1500-1800)/근현대/현대 5개뿐, "16세기"는 수동 줌 | range-controls.tsx:31-35 (CONFIRMED) |
| 프론트 | HEAD_OF_STATE/HEAD_OF_GOVERNMENT만 표시(작위·섭정·공동통치 제외), 표시 내용이 재임 막대뿐 — **"그 왕이 뭘 했는지"(연보·업적·사건)는 안 나옴** | normalize-tenures.ts:82-87 |
| 데이터 | 빈 행 문제 — 미등록 국가·시기는 공백이고, 무엇이 비어 있는지도 서버가 답 못 함 | (전제) |

**핵심 재해석**: 사용자 요구의 "비교 지면"은 이미 있으므로, 진짜 없는 것은 ① 세기 내비게이션, ② **재임 막대 너머의 "그 해 한 일" 콘텐츠**(연보+업적+사건을 교차인물로 묶어 주는 읽기 경로), ③ 등록→비교로 이어지는 루프(빈 곳이 저작 유도로 보이는 것)다.

---

## 3. 수렴하면 안 되는 것 (기존 검토 확정 경계)

1. **전기(서사) ≠ 연보(연대기)** — PersonSection에 연도 컬럼을 붙여 타임라인과 강제 연동하지 말 것. 수렴 대상은 레거시 `Person.biography` 컬럼 vs PersonSection **이중 정본(NULL 수렴)** 뿐.
2. **사건(전역 공유 엔티티) ≠ 연보(계정별 개인 기록)** — 채널이 아니라 **시간 계약**을 수렴(연보에 Event식 additive era 이식 = 연보리뷰 F33 종착점).
3. **재임/재위 ≠ 연보 카테고리** — termNumber·승계·Cabinet 동반 생성·선거 1:1 등 직책 계보 도메인은 흡수 불가. 현행 warning-only 힌트가 올바른 방향.
4. **업적 eventId 링크는 확대할 패턴** — 연보↔사건, 수상↔연보에도 같은 참조를 심는 것이 통폐합보다 우선.
5. 출생지(지리) ≠ BIRTH_PLACE 국가소속(출생정보 리뷰 2-3), 경력 9종 분야 테이블 존치(sparse 컬럼 지옥 방지), PersonStats에 시점 억지 부여 금지, 간지·연호는 렌더 계층.

**수렴 원칙**: 채널은 서사/연대기/공유사건/직책계보/분야경력이라는 서로 다른 시맨틱으로 존치. 수렴할 것은 횡단 계약 3가지 — (a) 시간 표현 = Event식 era+구조화+precision(F33), (b) 부호 연도 = BC 음수 signed year(연보 F2·가계도 G2·세기 리더보드 3문서 독립 수렴), (c) 표시 = 단일 lifespanText 포맷터(출생정보 §4-C). 채널 간에는 dedup이 아닌 **참조(eventId류)**로 잇는다.

---

## 4. 설계안 심사 (3안 경쟁)

| 기준 | 안1 읽기모델+기존지면 | 안2 프로젝션 테이블 | 안3 Era Compare 신규지면 |
|---|:---:|:---:|:---:|
| (a) 요구 충족도 | B+ | A- | **A** |
| (b) 저장소 현실 정합 | **A** | C | B+ |
| (c) 단계적 실행 | **A** | C+ | B |
| (d) 잘못된 수렴 회피 | A | B+ | A |

- **안2 탈락 사유**: 마이그 2건+3도메인 6쓰기경로 이중쓰기를 **마이그 큐가 동결된 시점**(가계도 마이그 항목 대기 중)에 요구하고, 첫 비교 가치가 마이그 뒤에야 도착. 16세기(AD) 요구엔 era 컬럼도 프로젝션도 필요 없음 — 가치 증명 전 인프라 선투자.
- **안3의 최우수 자산**(승자에 이식): 공유 사건 커넥터(다인물이 같은 eventId 참조 시 가로 연결선 — 기존 '중복 대신 참조' 장치가 처음으로 사용자 가치를 내는 지점), 빈 열=저작 CTA(연보 딥링크+연도 프리필), 재사용 강제/금지 게이트 목록.
- **승자: 안1** — 세 안의 백엔드 계약은 사실상 동형(compare API·signed year·소스 union·eventId 그룹핑)이므로 승부처는 프론트 소비 전략·스코프 정책·타이밍. 스키마 0 + 기존 지면 편승 + 연보 own-only 보수 스코프(인물 공개 정책이 cyworld Phase B 미정인 상태에서 노출 정책 선점 안 함)가 결정적.

---

## 5. 최종 권고 로드맵 (각 단계 독립 인도·독립 가치)

| 단계 | 내용 | 공수 | 스키마 | 단독 가치 |
|---|---|---|---|---|
| **0** | lifespanText 단일 포맷터(출생정보 §4-C 합류) + **세기 스테퍼 공용 컴포넌트** → heads-of-state RangeControls 삽입 | S | 0 | "16세기" 프리셋 즉시 사용, 생몰 표기 3중 구현 수렴 |
| **1** | bc-date 공용 헬퍼 추출 + **`GET /persons/records/compare`** (JWT, 5소스 union: LIFE_EVENT[own]·TENURE/REIGN·ACHIEVEMENT·EVENT·AWARD, signed year, summary 200자 트림, linkEventId, meta.lifeEventScope) + axios 래퍼 | M | 0 | API 단독 검증 가능(admin/1234, build:api 후 재기동) |
| **2** | heads-of-state 주입: 동시대 패널 **"그 해 한 일"**(배치 1회 호출) + LeaderQuickView 통합 기록 + 캐시 무효화 `['person-records']` prefix(연보 모달 onSuccess + invalidateTenureQueries 1줄) | S~M | 0 | **루프 1차 완성**: 연보 등록 → 연도 클릭 → 각국 왕 "그 해 한 일" |
| **3** | 인물 축 비교 뷰: persons-timeline에 `records` 뷰(공유 연도축 × 인물 칼럼) + **공유 사건 커넥터** + **빈 열 저작 CTA** + 재임 배경 밴드 + 진입점 3곳(연보 탭 "다른 인물과 비교"·heads-of-state 단면 패널·URL 동기화) | M | 0 | 요구의 핵심 이미지 완성. 별도 /era-compare 승격은 사용 실측 후 |
| **4** | 인덱스 마이그: event `@@index([startEra, startYear])` (+필요 시 tenure/reign endDate) — **가계도 대기 마이그와 동일 배치, 별도 커밋** | S | additive | 동시대 사건·overlap 질의 풀스캔 해소 |
| **5** | F33 마이그: PersonLifeEvent era 8컬럼 + eventId 참조(additive) + 모달 era 저작 + bc-date 헬퍼 내부 전환(프론트 무수정) + 저작 허브 사건 연결 피커. **선행 필수: 연보 무인증 GET 폐쇄 + blockBc** | M | additive | "BC 1세기 각국 왕 비교"까지 확장 |
| 수시 | 학력 저작 UI 배선(미사용 addEducation 래퍼 활용) | S | 0 | 연보 EDUCATION 중복 유도 해소 |

프로젝션 테이블(PersonChronicleEntry)은 **도입하지 않되 보험으로 기록**: compare API 계약이 구현 은닉적이므로, read-union 성능이 실측으로 문제 될 때 응답 무변경으로 프로젝션 구현으로 교체 가능.

### 구현 규약 게이트

- **강제**: `shared/lib/iso-date`(parseIsoDateParts·getCentury)·`toJulianYear`·`getPersonDisplayName`·공용 Modal·notify/confirm 재사용, 무효화는 `['person-records']` prefix 단일.
- **금지**: 신규 파일 내 native `new Date()` 연도 파싱(연보 탭 근인 재발 방지), PersonSection 연도 컬럼(서사≠표), 채널 저장 데이터 dedup 쓰기(eventId 그룹핑 표시만), 내용/날짜 휴리스틱 자동 억제(F34 교훈), PersonStats 시점 부여, 연보 전역 노출 정책 선점.

### 최상위 리스크

연보 mutation 쿼리키 산재(연보리뷰 F45) 위에 신규 키를 얹으므로, **2단계 무효화 배선 누락 → 비교 지면 stale**이 가장 개연성 높은 회귀. 2단계 완료 조건에 "연보 등록 직후 동시대 패널 갱신" 수동 검증 포함.

---

## 6. 검증 부록 — 하중 지지 주장 8건

| # | 주장 | 판정 |
|---|---|---|
| 1 | PersonLifeEvent에 era 컬럼 없음 + accountId 직접 보유 (person.prisma:387-431) | CONFIRMED |
| 2 | 연보 GET by-person 무인증·무스코프 (person-life-event.controller.ts:49-61) | CONFIRMED |
| 3 | Event 구조화 era/year 완비 + startYear/startEra 인덱스 부재 (event.prisma:259-262,363-364) | CONFIRMED |
| 4 | 재임·재위 startDate = era 없는 필수 DATETIME (government.prisma:316,431) | CONFIRMED |
| 5 | 업적 eventId FK 실재 (TenureAchievement:509-510, SovereignReignAchievement:357-358) | PARTIAL(실재 확인, 행번호만 정정) |
| 6 | 국가별 tenures API 무가드·기간 파라미터 없음·tenure+reign 2소스 병합 (repository:4028-4056) | CONFIRMED |
| 7 | heads-of-state는 세그먼트당 N회 병렬 GET, 통합 배치 엔드포인트 부재 (use-segment-tenures.ts:29-47) | CONFIRMED |
| 8 | contemporary-panel·leader-quick-view·range-controls·toJulianYear 실존 + 세기 프리셋 부재 (range-controls.tsx:31-35) | CONFIRMED |
