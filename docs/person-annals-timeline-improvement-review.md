# 인물 상세 연보(통합 타임라인) 개선 리뷰

> 2026-07-01. 7관점(날짜/BC 정확성·타임라인 병합·폼 모달·a11y·아키텍처·백엔드 계약·상태/성능) 병렬 리뷰 → 의미 병합 → 발견별 적대 검증(반박 시도 2렌즈) → 누락 보완 비판자 1라운드.
> 원시 68건 → 병합 54건 → **확정 58건 + 개연 1건**(기각 2건). P1 6 · P2 18 · P3 35. 검증 과정에서 라인 번호·과장 서술은 보정됨(아래 표기는 보정 후 기준).

## 1. 요약

연보 탭은 재위·재임·경력·사건·연보·가족 6개 소스를 하나의 시간축으로 병합하는 **읽기 경험은 풍부**하지만(검색·필터·내보내기·딥링크·정밀도 라벨까지), 그 시간축의 **토대가 전부 native `Date`** 위에 서 있다. 이 표면은 신설 3파일(인포그래픽 2,077줄·폼모달 1,577줄·API 래퍼)이 BC-안전 헬퍼(`helpers.ts`의 `parseIsoDateParts`/`isoDateSortKey`/`getAgeAtDate`)와 표준 레이어(`normalizeTenure`)를 **하나도 import하지 않고 재구현**하면서 생긴 결함 군집이 핵심이다.

큰 방향 다섯 가지:

- **(A) 보안·소유권 구멍 봉합** — 목록 GET 무인증(+작성 계정 UUID 노출), 수정·삭제의 소유권 폴백 역전. 전부 effort S.
- **(B) 무성(silent) 데이터 소실 차단** — 이 표면 최다 패턴. 저장 성공 토스트 뒤에 카드가 안 보이는 경로가 6개 이상(창 필터 드랍, BC 둔갑 저장, 이미지만 설명 null화, 팬텀 필드로 죽은 경고, cascade 근거 소멸, 에러를 빈 타임라인으로 위장).
- **(C) BC/시간축 정합화(키스톤)** — 날짜 파싱·정렬·창 필터·라벨·검증을 `isoDateSortKey`/`parseIsoDateParts` 체계로 재기초. 이게 되면 B의 절반과 표기 결함이 함께 풀린다. 종착점은 PersonLifeEvent era 스키마(additive).
- **(D) 계약·표준 레이어 수렴** — DTO `any[]` → `as any[]` ×6 → `(t:any)` 매핑으로 이어지는 무계약 파이프라인 타입화, normalizeTenure/쿼리키 팩토리/requestJson·serializeBigInt 공용화.
- **(E) a11y·성능·분해 마감** — 버튼 중첩 invalid HTML, ConfirmDialog 포커스 트랩 감금(공용 파급), 행 memo 부재, god 분해.

가계도·개요 리뷰와 달리 **P1이 6건 실재**한다(무인증 GET, BC 타임라인 붕괴, BC 둔갑 저장, 무일자 레코드 UI 유실, 죽은 경고 배선). 다만 다수가 S~M이라 배치 1~2로 빠르게 제거 가능.

---

## 2. 보안·소유권 (백엔드 P1/P2)

### 2.1 연보 목록 GET 무인증 + accountId 노출 — F1 [P1/S]
- `person-life-event.controller.ts:49` `@Get('by-person/:personId')`만 가드가 없다(create/update/delete는 개별 `@UseGuards(AuthGuard('jwt'))`, `person.controller.ts:99`는 클래스 레벨 가드). 인물 상세는 로그인 필수인데 그 연보 전체는 토큰 없이 열람 가능하고, 응답에 작성 계정 UUID(`accountId`, dto:169)까지 실린다. 전역 `APP_GUARD` 없음 확인. repository는 select 없이 전 컬럼 반환(`person.prisma.repository.ts:4037-4045`).
- **제안**: GET에도 가드 부착(또는 클래스 레벨 승격). 방(공개 프로필) 노출이 필요해지면 by-account 계열처럼 명시적 공개 엔드포인트로 분리하고 accountId는 응답에서 제거.

### 2.2 수정·삭제 소유권 폴백 역전 — G1 [P2/S]
- 생성은 `person.accountId`로 인물 소유권을 검사하지만(`person.service.ts:756-762`), 수정·삭제는 연보 행 자체의 accountId만, 그것도 `existing.accountId != null`일 때만 검사(`:776-782, 807-813`). 작성자 탈퇴(SetNull)·시드 행은 accountId가 null → **로그인한 임의 계정이 타인 인물의 연보를 수정·삭제 가능**. 부모 인물 소유자는 update/delete 경로에서 한 번도 확인되지 않는다.
- **제안**: update/delete도 personId로 부모 인물을 조회해 person.accountId 기준 검사. null-accountId 행은 '아무나 허용'이 아니라 인물 소유자만 허용으로 폴백을 뒤집기.
- (기각된 F50의 정제판: "전원 수정 가능"은 JWT 필요라 과장이지만, 본질인 부모 소유자 미검증은 실재.)

### 2.3 DTO 방어 공백 — F49·F53 [P3/S]
- **F49**: `@IsOptional()`은 null도 스킵하므로 PUT `title:null`이 검증을 통과 → repository `dto.title !== undefined` 가드(:4011)를 지나 Prisma 검증 에러 500. category/precision `@IsIn` 배열의 null 엔트리(121·135·149)도 같은 이유로 죽은 코드. → `@ValidateIf` 패턴으로 null 명시 거부.
- **F53**: description `@MaxLength` 없음 — `@db.Text`(64KB) 초과 시 500. 폼 soft limit(5000자)과 정합시켜 서버 상한 추가.

---

## 3. BC/시간축 정합성 (P1 군집 — 이 리뷰의 중심)

### 3.1 날짜 코어가 전부 native Date 재구현 (키스톤) — F3 [P1/M]
- 인포그래픽의 모든 날짜 처리(`parseDate/yearOf/isoDayKey/formatWithPrecision/ageAt`, 163~228행)가 `new Date(iso)` + **로컬** getter다. 백엔드는 UTC 자정으로 저장하므로 **음수 오프셋 타임존에서 모든 카드의 연·월·일이 하루 전으로 밀린다**(실측: `new Date('1820-01-01T00:00:00.000Z')` → LA에서 1819-12-31 — 연 단위 이벤트의 연도 라벨이 1년 틀림). BC 음수 연도는 date-only면 부호 탈락(AD 오파싱), 시간부 포함이면 NaN→노드 무성 탈락. 같은 위젯군 `helpers.ts`에 BC-안전 `parseIsoDateParts`/`isoDateSortKey`/`getAgeAtDate`/`DEATH_TYPE_LABELS`(209~219행에 완전 동일 사본까지)가 있는데 하나도 쓰지 않았다.
- **제안**: 날짜 유틸 5종을 helpers.ts 기반으로 재작성, `TimelineNode`에 Date 객체 대신 `{era,year,month,day}` 파트 보관, 정렬 키는 `isoDateSortKey`로 통일. **배치 2 전체의 전제조건.**

### 3.2 BC 인물 타임라인 붕괴 — F2 [P1/M]
- 패널이 birthDate/deathDate를 `String(p.birthYear).padStart(4,'0')`로 조립하며 era를 버리고(패널 2394~2405행 — era는 별도 prop으로만), 인포그래픽은 이를 native 타임스탬프로 정렬·창 필터한다(701~712행). BC 384~322 인물이면 birthTs>deathTs → **사망 카드가 출생 위에 렌더 + 출생/사망 필터를 동시에 만족하는 노드가 없어 생애 중간 기록(재위·연보·사건) 전멸**. BC 출생·AD 사망 교차 인물은 AD 기록 전멸. 같은 파일 개요 탭은 `isoDateSortKey`를 쓰면서(563~564행 'BC·고대 안전 정렬' 주석) 연보 탭 입력만 우회 — 이중 잣대.
- **제안**: sortKey를 era 인지형 체계(BC=음수)로, 출생/사망 경계 비교도 같은 키로. 최소 응급처치는 era=BC면 창 필터 스킵.

### 3.3 무일자 레코드가 UI에서 유실 — F5 [P1/S]
- start 없는 노드는 `sortKey=POSITIVE_INFINITY`(426행)인데 사망 창 필터 `sortKey <= deathTs`(708~713행)가 무조건 제거. 고인 인물에 날짜 없는 연보를 저장하면 성공 토스트 후 어디에도 안 보이고, **카드 클릭이 유일한 편집/삭제 진입로라 레코드가 UI에서 사실상 유실**(생존 인물이면 맨 끝 '—'로 뜨는 것과 비대칭). 연도만 아는 사망(01-01 패딩)이면 사망 연도 내 실제 기록(2~12월)까지 '사망 이후'로 오판 은닉.
- **제안**: 무일자 노드는 사망 필터 예외 처리해 말미 '날짜 미정' 그룹으로. 연 정밀도 사망은 12-31을 상한으로.

### 3.4 BC 둔갑 저장 — F4 [P1/S]
- 연보 모달만 `DateRangeField`에 `blockBc` 미전달 — DatePickerModal의 기원전 토글로 "-0490-09-12"가 반환되고, repository `new Date(dto.startDate)`가 부호를 떼 **무경고로 AD 490년으로 저장**. `date-range-field.tsx:86~88` 주석이 정확히 이 함정을 문서화했고 tenure/sovereign-reign 폼은 켰는데 이 모달만 빠짐. `@IsDateString`(isISO8601)은 ±연도를 통과시켜 서버도 못 막는다.
- **제안**: 단기 blockBc 1줄(배치 1). 장기는 3.8 era 스키마.

### 3.5 죽은 범위 경고 — 팬텀 필드 배선 — F6 [P1/S]
- 모달에 `birthDate={person.birthDate ?? null}`(패널 2454~2455행)을 넘기지만 상세 응답에는 birthDate/deathDate 키가 **아예 없다**(birthYear/Month/Day만, controller 569~575행). `types.ts:76`의 팬텀 선언 때문에 tsc도 못 잡음. 결과: 모달의 '출생 이전/사망 이후 — 타임라인에 표시되지 않을 수 있습니다' 경고(form-modal 438~455행)가 **어떤 입력에도 절대 발화하지 않는다** — 정확히 무성 소실(3.2~3.3)을 막으려 만든 가드가 죽어 있다. 60줄 위에서는 타임라인용으로 birthYear를 padStart 조립하는, 같은 파일 내 계약 불일치.
- **제안**: 타임라인과 동일한 조립식을 공용 헬퍼로 추출해 모달에도 전달(era-aware 비교로 — 아니면 BC에서 경고가 반대로 발화). 팬텀 선언 제거.

### 3.6 창 필터의 겹침·과잉 억제 잔여 — F10 [P2/S] · F34 [P3/S]
- **F10**: 출생 창 필터가 start만 검사 — 출생 이전 시작·생애와 겹치는 장기 사건(전쟁 등)이 통째 드랍. `end >= birth`면 통과시키고 시작일 클램프 또는 '출생 이전 시작' 배지.
- **F34**: 가족 출생/사망/혼인 자동 노드가 '같은 날짜의 아무 연보'와 겹치면 내용 무관 무조건 억제(586·606·654행) — 무관한 연보가 아버지 사망 노드를 숨김. FAMILY 카테고리/이름 매칭까지 확인하거나 병합 표시로.

### 3.7 정밀도·표기 잔여 — F8 [P2/M] · F9 [P3/M] · F7 [P2/S]
- **F8**: 연도만 아는 생몰일이 01-01 패딩 저장 → 출생/사망 카드가 `formatWithPrecision(birth,'day')` 강제로 '1900년 1월 1일'을 사실처럼 표기, 나이·향년도 가짜 1/1 기준(최대 1세 부풀림). 연보 항목은 precision으로 해결해 놓고 축 기준점만 미적용. 근본은 Person 정밀도 필드(스키마)라 표면 땜질보다 DTO 레벨 접근 권장.
- **F9**: YearLabel '기원전' 판정이 노드 자신이 아닌 ego 출생 era를 전 노드에 일괄 적용(981~986행) — 현재는 창 필터 버그에 가려져 있고, 당장 재현되는 건 AD 인물의 BC 가족 노드가 '기원전' 없이 표기되는 케이스. F2 수정 시 함께 노드 단위 era로.
- **F7**: 인물 상세 PersonEvent select(repo 1407·1412행)에 `startDatePrecision`·구조화 era 필드(startEra/startYear/…) 누락 — 연 단위 사건이 '1월 1일'로 단정 표기되고, **BC/고대 사건(startDate null)은 sortKey=∞로 맨 끝 또는 사망 필터로 은닉**. select 확장 + 구조화 필드로 재구성.

### 3.8 종착점: era 스키마 — F33 [P2/L]
- `PersonLifeEvent.startDate/endDate`는 era 없는 DateTime뿐(person.prisma:391·396). 인물(birthEra)·사건(startEra/…)은 BC를 지원하는데 연보만 AD 전용 — '기원전 X년 아테네 유학'은 **기록되되 조용히 틀린 연대로 둔갑**(3.4). Event의 검증된 additive 패턴(era+구조화 연월일 병행) 그대로 적용.

### 3.9 검증·내보내기의 native Date 잔재 — F32 [P3/S] · F51 [P3/S] · F31 [P3/S]
- **F32**: 폼 dateError(432)·범위경고(438~455)·겹침경고(474~494)와 백엔드 `assertLifeEventDateRange`(service:739)가 전부 native Date 비교. blockBc 이전엔 지금도 BC 입력 시 오판(BC는 큰 연도가 과거). `slice(0,10)` 같은-날 키도 음수 연도에서 잘림. → `parseIsoDateParts` 튜플 비교로.
- **F51**: 범위 검증이 precision 무시 — 시작 1820-06-15(day) + 종료 '1820년'(year, 01-01 앵커)이 유효한데 거부. year면 연말로 확장 후 비교(프론트 dateError 동일).
- **F31**: export 정렬이 `new Date ?? 0` — 무일자 항목이 1970 위치에 삽입돼 화면(맨 뒤)·백엔드(nulls last)와 반대. `isoDateSortKey`로 교체(BC 규약 위반 주장은 이 필드에 한해 발생 불가로 보정됨 — DATETIME이라 BC 저장 자체가 안 됨).

---

## 4. 계약·표준 레이어 수렴

### 4.1 무계약 any 파이프라인 (키스톤) — F20 [P2/M]
- 백엔드 DTO `sovereignReigns?: any[]`·`lifeEvents?: any[]`(person.response.ts:87·89) → 패널 `as any[]` ×6(469·479·493·503·511·527행) → `(t:any)/(r:any)` 매핑(2457~2465행). 인포그래픽이 `ReignInput/TenureInput`을 정의해 놓고 **export하지 않아** 패널이 타입을 참조할 수 없다. 필드명 오타·응답 shape 변경을 컴파일러가 전혀 못 잡는 구간이 이 표면의 중심 경로. 게다가 ad-hoc 매핑이 normalize.ts(135~136행)의 `regnalName ?? regnalNameFromNotes(notes)` 폴백을 누락해 레거시 재위에서 왕명 대신 직책명 노출.
- **제안**: 입력 타입 export(또는 표준 Tenure로 대체), timeline* memo를 그 타입으로 선언, 모달 참조는 normalizeTenure 통과 후 프로젝션. **배치 3의 전제조건**(가계도 리뷰의 FamilyTreeResponseDto와 같은 역할).

### 4.2 표준 레이어 우회 — F13 [P2/M]
- 인포그래픽이 자체 `ReignInput/TenureInput`(68~93행)으로 raw 매핑 — regnalName 필드 자체가 없어 **군주 재위 카드에 왕명 미표시**, description에 r.notes 원문이 들어가(462~467행) 레거시 '왕명: 세종' 인코딩 문자열이 카드 본문에 노출. 같은 패널이 모달용으로는 regnalName을 쓰므로(2463~2466행) 데이터는 있다. → normalizeTenure 결과를 입력으로, 제목에 `regnalName ?? regnalNameFromNotes(notes)`, notes는 왕명 줄 제거 후 표시.

### 4.3 쿼리 키·헬퍼 산재 — F45 [P3/S]
- 폼 모달 invalidate가 `['person-detail', personId]` 리터럴 하드코딩(personKeys.detailFull과 '우연히' 일치), `['person-life-events', personId]`도 패널(437)·폼모달(527)·인간관계 근거 피커(2079·2085)에 산재. 재임 계열 invalidateTenureQueries와 대조적. → `personLifeEventKeys.byPerson()` 팩토리 신설 + personKeys 사용.

### 4.4 복붙 유틸 — F44 [P3/S] · F46 [P3/S] · F15 [P3/S]
- **F44**: `requestJson`이 shared/api 래퍼 **7곳** 복붙(political-party 포함; entity-link-search 사본은 Content-Type·204 처리 다른 변형 — 공용화 시 시그니처로 흡수). client.ts로 승격.
- **F15**: 그 requestJson이 실패 시 **GlobalExceptionFilter JSON 봉투 전체를 Error.message로 던져** 서버의 정성스런 한국어 메시지('본인이 등록한 인물에만…')가 토스트에 raw JSON 블롭으로 노출. `parsed.error?.message ?? parsed.message`(배열 join) 추출로. F44와 한 몸.
- **F46**: serializeBigInt가 person 도메인 컨트롤러 3파일 4곳 복붙 — 이미 person.controller:520 사본만 Invalid Date 가드가 있어 **드리프트가 현실화**됨. NaN 가드 버전을 정본으로 공용 추출.

### 4.5 백엔드 페이로드·죽은 계약 — F26 [P2/S] · F52 [P3/S]
- **F26**: 상세 쿼리는 '연보 제외' 트림을 했는데(1522행 주석) 요약용 findById의 personInclude에 lifeEvents 전체(대용량 HTML description 포함)가 잔존(1025~1031행) — 존재/소유 확인용으로만 **10곳 이상** 호출돼 관계 추가 한 번에 두 인물의 연보 전체를 끌어옴. include 제거 + 경량 exists 메서드 분리.
- **F52**: GET `limit`이 죽은 계약(유일 소비자가 미사용) + DB take 없이 전 행 로드 후 인메모리 slice. take로 내리거나 제거.

### 4.6 의존 방향·소소한 이중화 — F43 [P3/S] · F47 [P3/S]
- **F43**: CATEGORY_ICON만 폼 모달에 정의 — 읽기 위젯→폼 위젯 역수입(카테고리 상수 3종이 두 레이어로 분열). 번들 영향은 현재 없음(패널이 모달을 정적 import)이지만 향후 lazy 분리를 막음. shared/entities 레이어로 이동.
- **F47**: `renderedNodes = visibleNodes` 무의미 별칭 + FILTER_COLORS(241~248)와 kindColorMap(1524~1535) 같은 값 이중 정의(단, filter→kind 키 매핑 한 줄 필요 — family→'family-birth').

---

## 5. UX 흐름 (저작·탐색·상태)

### 5.1 딥링크·저장 직후 스크롤 레이스 — F11 [P2/S]
- `?life=` 진입 효과(패널 364~377행)가 **activeTab을 'events'로 전환하지 않아** ?tab= 없는 URL(수기 편집·임베드 복사)은 완전 무동작. tab이 있어도 인포그래픽 스크롤 effect가 deps `[highlightedLifeEventId]` + 60ms 1회 타이머라, 신규 생성 흐름(invalidate await 없음 → 즉시 onSuccess)에서 refetch 완료 전 만료 → **rowRefs에 새 행이 없고 재시도도 없어 scrollIntoView 영구 스킵**. 연보 수백 건 인물에서 방금 등록한 항목을 못 찾는다.
- **제안**: ?life 존재 시 handleTabChange('events') 동반 호출, effect deps에 nodes 추가 + '스크롤 완료 id' ref 가드, 또는 패널에서 invalidate await 후 onSuccess.

### 5.2 하이라이트 타이머 경합 — F54 [P3/S]
- onSuccess마다 rAF+setTimeout(1600ms)을 추적 없이 신규 — '저장 후 추가' 연속 저장 시 이전 타이머가 새 하이라이트를 조기 해제, 언마운트 후 setState 잔존. functional set(`cur === savedId ? null : cur`) + cleanup. (여담: 패널 361행 주석 '0.8초'는 코드 1600ms와 오기.)

### 5.3 URL 상태 이원화 — F48 [P3/S]
- ?tab=은 useSearchParams + embedInModal 가드(317~349행)인데 ?life=는 `window.location.search` 직접 읽기(365~377행), 임베드 가드 없음, 소비 후 미제거. 같은 경로로 통일.

### 5.4 임베드 비일관 — F35 [P3/S]
- 모달 임베드에서 '연보 추가'(2379~2391)·빈 상태 CTA(2428~2436)는 숨기고 onStartEditLife(2421~2424)는 항상 전달 — **추가만 막고 편집·삭제는 허용**할 근거 없음. 링크 복사(인포그래픽 1091~1093)는 embed를 몰라 호스트 페이지 URL에 ?life만 붙인 **죽은 링크** 생성(?tab 동기화도 없음 — early return 333행). 표준 경로(`/persons/:id?tab=events&life=`)를 조립해 복사.

### 5.5 폼 모달 저작 결함 — F16 [P2/S] · F17 [P2/S] · F18 [P3/S] · F36 [P3/S] · G5 [P3/S]
- **F16**: `getVisibleTextLength > 0`만으로 description 판정 — `<img>`는 textContent 미기여라 **이미지만 넣은 설명이 무경고 null 저장**(수정 모드에서 텍스트 지우면 이미지째 소실). 빈 판정에 `querySelector('img,figure,iframe,table')` 추가.
- **F17**: placeholder는 "종료 (단일 시점이면 비움)"인데 `clearableEnd` 미전달로 **종료일을 지울 방법이 없음**(update 경로는 `endDate || null`로 이미 지원 — UI 어포던스만 부재). 1줄.
- **F18**: DraftPayload에 sortOrder 없음 — 드래프트 복구 후 저장하면 자동 분배 로직이 기존 정렬 값을 무단 재배정.
- **F36**: '저장 후 추가' 버튼은 수정 모드에서 숨기는데 Ctrl+Shift+Enter는 isEdit 검사 없이 실행 — 수정 후 폼이 예기치 않게 빈 신규 모드로 리셋. `&& !isEdit`.
- **G5**: Alt+1~9 카테고리 단축키가 `e.key` 판정이라 **macOS에서 동작 불능**(Option+숫자=합성 문자, UI가 명시 안내 중). `e.code === 'Digit1'…`로.

### 5.6 드래프트 안전망의 구조 결함 — G3 [P2/M]
- 드래프트 키에 sessionStorage 기반 tabId 포함 + 본체는 localStorage(영구) — 새 탭으로 다시 열면 다른 tabId라 복구 불가(브라우저 탭 복원 경로는 sessionStorage도 복원돼 예외), **고아 드래프트(수천 자 리치텍스트)는 어떤 코드도 안 지워 무한 누적**(정리 스윕 0건). 키에서 tabId 제거(savedAt 최신 복구) 또는 최소 7일 경과 스윕 + tabId 무관 폴백.

### 5.7 삭제의 연쇄 손실 — F28 [P2/M]
- `PersonHumanRelationshipSource.lifeEventId`가 onDelete: Cascade(person.prisma:550) — 연보 삭제 시 **그 연보를 근거로 한 인간관계 근거 행이 소리 없이 전멸**. 서비스(service:802-815)·프론트 confirm('되돌릴 수 없습니다'만) 모두 무경고. delete 전 count 조회 → confirm 문구에 '근거 연결 N건도 함께 삭제됩니다' 포함.

### 5.8 상태 표시 — F12 [P2/S] · G4 [P3/S]
- **F12**: 연보 쿼리(패널 436~443행)가 isLoading/isError 미사용 — **요청 실패가 '기록 없음' 빈 타임라인으로 위장**. 전역 `retry:false`라 세션 내내 고정. 스켈레톤/재시도 UI. (429~434의 family-tree 쿼리도 동일 패턴 — 함께.)
- **G4**: enabled가 `!!personId`뿐이라 개요만 보고 나가는 진입에도 연보 전체(리치텍스트 포함) fetch. `activeTab === 'events' || !!highlightedLifeEventId` 게이트.

### 5.9 알림 피드 — G2 [P3/S]
- 경력 9종·학력·수상(notifyPersonSection)·재임·재위(notifyTenure)는 알림을 발행하는데 연보 3 mutation은 훅 없음. (보정: 재임업적·내각·연호·인간관계도 미커버라 "유일 누락"은 아님 — 미커버 하위 기록군 일괄 편입 시 함께.)

### 5.10 내보내기 품질 — G6 [P3/S]
- Markdown 내보내기 htmlToPlainText가 태그만 제거, 엔티티 미디코드 — 'R&D'가 `R&amp;D`로 출력. 같은 파일 visibleLengthOf는 textContent 방식을 이미 씀(자체 불일치). DOM 경로로 통일.

---

## 6. 접근성 (a11y)

- **ConfirmDialog가 부모 포커스 트랩에 감금 — F19 [P2/M]**: ConfirmDialog는 body 포탈 + 자체 포커스 관리 없음, 부모 Modal 트랩(use-modal-behavior:116~136)이 Tab을 폼 안에 가둠 — dirty-close/삭제 확인의 버튼에 **키보드로 절대 도달 불가**, Esc는 Modal이 선점. 저장하지 않고 나가는 경로가 키보드로 차단(저장-후-닫기는 가능해 완전 감금은 아님 — 보정). **ConfirmDialog에 useModalBehavior 적용은 공용이라 전 모달 수혜.**
- **버튼 중첩 invalid HTML — F14 [P3/M]**: 클릭형 카드가 `as='button'`인데 내부에 링크복사 버튼(1084)·'더 보기'(1856)·라이트박스 이미지 중첩. (보정: 내부 버튼도 Tab 도달·동작은 함 — 실손상은 명세 위반 + role=button의 presentational children 규칙으로 SR이 내부 컨트롤을 안정 인지 못함.) 카드 오버레이 패턴 또는 형제 분리로.
- **aria-label이 본문을 가림 — F21 [P3/S]**: 카드 button `aria-label={title — date}` 고정 — 종류 배지·부제·설명·동작 맥락(편집인지 이동인지)이 SR에 전달 안 됨. label 제거(콘텐츠 노출) 또는 동작 포함 label + describedby.
- **폼 오류가 SR에 침묵 — F25 [P2/S]**: FieldError/dateError/경고들이 aria-describedby·role=alert 0건(파일 전체 grep). 저장 비활성 사유(title 속성)도 미노출.
- **내보내기 드롭다운 :hover 전용 — F22 [P3/M]**: onClick 없는 CSS disclosure — aria-haspopup/expanded 부재, Esc 닫기 없음. (보정: focus-within으로 키보드 노출은 됨 — '영구 은닉'은 과장.) 항목 2개뿐이라 버튼 2개 병렬 노출이 간단한 대안.
- **복사 무피드백 — F23 [P2/S]**: 클립보드 복사 성공/실패 모두 무반응, notify 미사용(import 자체 없음) — 규약 위반 겸. 1줄.
- **탭 패턴 미완 — F24 [P3/S]**: role=tab 선언에 화살표 이동·roving tabindex·aria-controls 없음(tablist 1269행; panel→tab 역방향은 4곳 존재). 모달 카테고리 radiogroup에 같은 패턴 구현 있어 재사용 가능.
- **선택 상태 시각 전용 — F37 [P3/S]**: 정밀도 SegmentedBtn·자주 쓰는 카테고리 칩이 $active만, aria-pressed 없음(본 카테고리 그리드는 radio 잘 구현 — 같은 모달 내 비일관).
- **모션 — F38·F39 [P3/S]**: 하이라이트 scrollIntoView smooth 고정(reduced-motion 우회) + 포커스 미이동; 탭 전환 framer-motion 슬라이드(events 패널 2370~2374행)도 useReducedMotion 없음(companies-list는 사용 중). `<MotionConfig reducedMotion="user">` 전역이 근본.
- **검색 결과 안내 부재 — F40 [P3/S]**: 비매칭 카드 opacity 0.28 dim만 — 포커스는 그대로 순회, 매칭 건수 status 없음.
- **리스트 시맨틱 부재 — F41 [P3/S]**: TimelineList/Row 전부 div — 'N개 중 M번째' 구조 정보 없음. `as="ol"/"li"` + 나이 라벨 보강. (보정: 날짜는 aria-label로 이미 읽힘.)

---

## 7. 성능·구조

- **행 memo 전무 + 렌더 단계 DOM 파싱 — F30 [P3/M]**: 2077줄 단일 컴포넌트에 React.memo 0건 — 검색 키스트로크·하이라이트 set/clear마다 전 노드 재렌더, 그때마다 CardDescBlock이 `document.createElement + innerHTML` 파싱(visibleLengthOf), matchesQuery가 장문 HTML 정규식 strip. 노드 조립 시 searchText/visibleLength 사전 계산 + TimelineRow memo 추출 + 검색 디바운스. (memo 유효성 위해 패널의 인라인 onStartEditLife(2421~2424)도 안정화 — 보정.)
- **god 컴포넌트 — F42 [P3/L]**: 노드 조립 순수 로직 330줄(423~749행)이 렌더와 한 몸 — 정렬 tie-break·가족 dedup 정책에 단위테스트 0(같은 레포 normalize.spec.ts와 대조). `buildTimelineNodes()`를 model.ts로, export 유틸은 lib로, styled ~880줄은 .styles.ts로. 폼모달도 useLifeEventDraft/useLifeEventWarnings 훅 경계.
- **한 글자 변수 — F27 [P2·개연/M]**: 신설 3파일에 232건(인포그래픽 192·모달 34·래퍼 6). (반박 렌즈: web-admin 전체 7,447건이라 3파일 리네임으로 '단독 lint 유효화'는 미달성, 레거시 구분 워크플로도 확립 — **선택 항목**. 다만 이 표면을 앞으로 자주 만질 예정이면 기계적 리네임 가치 있음.)
- **다크테마 반쪽 적용 — G7 [P3/S]**: FilterAllOffNote(인포그래픽 1246~1257)와 모달의 FieldWarning(1220~1231, 텍스트 #b45309)·DescHint가 amber 라이트 전용 하드코딩 — 같은 모달의 DraftBanner·CategoryHintBox는 theme.mode 분기 완비(신규 표면 안에서도 반쪽).

---

## 8. 기각·보정 기록 (적대 검증 결과)

- **기각 F29** (고대 날짜 DB 쓰기 500): 코드 인용은 정확하나 실패 양상이 다름 — `new Date`가 AD로 변환해 **쓰기는 성공하고 조용히 둔갑**(F4·F33이 정본).
- **기각 F50** (null accountId 전원 수정 가능): JWT 가드가 있어 "전원"은 과장 — 본질(부모 인물 소유자 미검증)은 G1로 정제 확정.
- 굵직한 보정: F2·F6·F35 등 라인 드리프트 다수(위 본문은 보정 후), F14 "키보드 완전 차단"·F22 "영구 은닉"·G3 "크래시 복구 절대 불가" 과장 완화, F27 P2→개연 강등, F24 P2→P3, F31 BC 위반 주장 축소.

---

## 9. 추천 실행 순서 (레버리지順 배치)

### 배치 1 — "보안 + 무성 소실 차단" (S 위주, 즉효)
F1 GET 가드, G1 소유권 폴백 역전, **F4 blockBc(1줄)**, F6 팬텀 birthDate 배선(경고 부활), F16 이미지만 설명 보존, F17 clearableEnd(1줄), F49+F53 DTO 방어, F15 에러 메시지 파싱(래퍼 1곳 선행), F23 복사 notify, F12 로딩·에러 상태, F54 타이머 정리, F36+G5 단축키 2건.
- *왜 먼저*: P1 6건 중 4건이 여기서 제거되고 전부 S. 사용자가 겪는 "저장했는데 사라짐"의 절반이 멈춘다.

### 배치 2 — "시간축 정합화" (M, 키스톤 = F3)
**F3 날짜 코어 helpers 위임(전제)** → F2 era 인지 sortKey·창 필터, F5 무일자 예외, F10 겹침 통과, F34 가족 dedup 정밀화, F9 노드 단위 era 라벨, F7 PersonEvent select 확장, F8 생몰 정밀도 표기, F31 export 정렬, F32+F51 검증 파트 비교. 마지막으로 **F33 era 스키마(additive, L)** — 여기까지 되면 BC 인물 연보가 정식 지원된다.
- *왜*: 전부 같은 코드 지점(노드 조립 useMemo + 날짜 유틸)이라 따로 하면 같은 곳을 두 번 판다. TZ 하루 밀림(F3)은 배포 지역 무관 correctness.

### 배치 3 — "계약·표준 수렴" (M)
**F20 타입 파이프라인(키스톤)** → F13 normalizeTenure 위임(왕명 표시), F45 쿼리키 팩토리, F44+F15 requestJson 공용화 완성, F46 serializeBigInt 공용(NaN 가드 정본), F26 findById 트림+exists 분리, F52 limit 정리, F43 CATEGORY_ICON 이동, F47 별칭·색상 단일화.
- *왜*: F20이 이후 모든 필드 추가(era 등)를 컴파일타임에 강제 — 가계도 리뷰의 DTO 계약화와 같은 키스톤 역할.

### 배치 4 — "UX 흐름 완성" (S~M)
F11 딥링크·스크롤 레이스, F48 ?life URL 통일, F35 임베드 일관화+링크 복사 경로, G3 드래프트 키 재설계, F18 드래프트 sortOrder, F28 cascade 근거 경고, G4 fetch 게이트, G6 MD 엔티티, G2 알림 편입(미커버군 일괄 시).
- *왜*: 배치 1~2로 데이터가 안 사라지게 된 뒤의 동선 품질. F11은 배치 2의 nodes 재작성과 접점이 있어 그 직후가 효율적.

### 배치 5 — "a11y·성능·분해 마감" (S 다수 + L 2)
**F19 ConfirmDialog useModalBehavior(공용 파급 — 앞당겨도 좋음)**, F14 버튼 중첩, F21+F25 SR 전달, F22 내보내기 disclosure, F24 탭 패턴, F37~F41 상태·모션·시맨틱, F30 행 memo+디바운스, G7 다크 하드코딩, F42 god 분해(+spec), F27 리네임(선택).
- *왜 마지막*: 규약·품질 마감이나, F19는 공용 컴포넌트 수정이라 다른 모달 전부가 수혜 — 독립 선행 가치 있음.

---

**참고 파일 경로**:
- 인포그래픽(본체): `apps/web-admin/src/widgets/person/person-life-timeline-infographic/person-life-timeline-infographic.tsx` (날짜 유틸 163~228, 노드 조립 423~749, 창 필터 701~713, export 296~363)
- 폼 모달: `apps/web-admin/src/widgets/person/person-life-event-form-modal/person-life-event-form-modal.tsx` (드래프트 147~207, 경고 431~502, 저장 545~648)
- 패널 wiring: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx` (쿼리 436~443, 조립 501~560, ?life 365~377, 탭 2364~2444, 모달 props 2446~2482)
- BC-안전 헬퍼(정본): `apps/web-admin/src/widgets/person/person-detail-panel/helpers.ts`, `shared/lib/iso-date.ts`
- API 래퍼: `apps/web-admin/src/shared/api/person-life-events.ts`
- 백엔드: `apps/api/src/libs/person/presentation/person-life-event.controller.ts`, `dto/person-life-event.dto.ts`, `application/person.service.ts:734~819`, `infrastructure/person.prisma.repository.ts:4000~4046`
- 스키마 소스: `libs/db/prisma/person.prisma:369~410(PersonLifeEvent)·537~555(HumanRelationshipSource)` — 수정 시 `db:build` 규약
