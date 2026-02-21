# 알림(Notification) 적용 CRUD 범위

`Notification` 모델은 **전체 도메인 CRUD**에 대해 헤더 알림을 남기기 위한 스키마입니다.  
**"수정되었다 / 삭제되었다"보다 "무엇이" 수정·삭제됐는지 특정값으로 알리도록** 설계합니다.

---

## 1. 표시 원칙: 특정값으로 CRUD 대상 명시

### 문제
- "인물이 수정되었습니다" → **어떤 인물인지** 모름
- "재임 기록이 삭제되었습니다" → **누구의 어떤 직책인지** 모름

### 해결: `entityLabel`(필수) + `method`
- **entityLabel**: CRUD된 대상을 식별하는 **이름/라벨 하나** (필수)
  - 인물: 인물 표시명 (예: `홍길동`, `이순신`)
  - 국가: 국가명 (예: `한국`, `미국`)
  - 사건: 사건명 (예: `임진왜란`, `광복절`)
  - 재임: "인물명 - 직책명" (예: `세종대왕 - 대통령`)
  - 조직/직업/종교/왕조/군부대: 해당 엔티티의 대표 이름
- **method**: CREATE / UPDATE / DELETE

### 클라이언트 표시 규칙 (권장)
1. **title이 있으면** → 그대로 표시 (서버가 완성 문장을 준 경우)
2. **title이 없으면** → 아래 규칙으로 조합:
   - CREATE: `"{entityLabel}"이(가) 등록되었습니다`
   - UPDATE: `"{entityLabel}"이(가) 수정되었습니다`
   - DELETE: `"{entityLabel}"이(가) 삭제되었습니다`
3. **ownerType**으로 리소스 타입 문구를 넣고 싶으면:  
   `"{리소스타입} '{entityLabel}'이(가) {동작}되었습니다"`  
   예: `인물 '홍길동'이(가) 등록되었습니다`

### preview 용도
- **부가 정보만** 넣을 때 사용 (문장의 주어는 entityLabel이 담당)
- 예: 재임 알림에서 entityLabel=`세종대왕 - 대통령`, preview=`2020~2024`
- 예: 인물 알림에서 entityLabel=`홍길동`, preview=`생몰: 1392~1450`

---

## 2. 스키마 요약

| 필드 | 필수 | 설명 |
|------|------|------|
| **entityLabel** | ✅ | CRUD된 대상의 이름/라벨 (무엇이 바뀌었는지) |
| **method** | ✅ | CREATE / UPDATE / DELETE |
| **ownerType** | | 리소스 타입 (필터·딥링크·문장 조합) |
| **recordId** | | 상세 페이지 이동용 ID |
| **preview** | | 부가 설명 (기간, 하위 항목 등) |
| **title** | | 서버가 완성 문장을 줄 때만 사용 (없으면 클라이언트가 entityLabel+method로 조합) |

---

## 3. 도메인별 entityLabel 예시

| 도메인 | CREATE | UPDATE | DELETE | preview 예시 |
|--------|--------|--------|--------|--------------|
| 인물 | 인물 표시명 | 인물 표시명 | 인물 표시명 | 생몰, 국적 등 |
| 국가 | 국가명 | 국가명 | 국가명 | 수도, 대륙 |
| 역사적 국가 | 국가명 | 국가명 | 국가명 | 존속 기간 |
| 사건 | 사건명 | 사건명 | 사건명 | 일자, 지역 |
| 재임 | "인물명 - 직책명" | "인물명 - 직책명" | "인물명 - 직책명" | 취임~퇴임 기간 |
| 관직 정의 | 직책명(정의) | 직책명(정의) | 직책명(정의) | 국가/역사국가 |
| 조직 | 조직명 | 조직명 | 조직명 | 유형 |
| 직업 | 직업명 | 직업명 | 직업명 | 카테고리 |
| 종교 | 종교명 | 종교명 | 종교명 | — |
| 왕조 | 왕조/가문명 | 왕조/가문명 | 왕조/가문명 | — |
| 군부대 | 부대명 | 부대명 | 부대명 | — |
| 대륙 | 대륙명 | 대륙명 | 대륙명 | — |

---

## 4. 알림 발생 API/서비스 목록

### 1. 인물 (PERSON)

| 동작 | 서비스 메서드 | ownerType | 비고 |
|------|----------------|-----------|------|
| 생성 | `PersonService.create` | PERSON | |
| 수정 | `PersonService.update` | PERSON | |
| 삭제 | `PersonService.delete` | PERSON | |

### 2. 역대 수반 / 관직 (재임·정의)

| 동작 | 서비스 메서드 | ownerType | 비고 |
|------|----------------|-----------|------|
| 재임 추가 | `PersonService.addGovernmentPositionTenure` | PERSON | title 예: "재임 기록이 추가되었습니다" |
| 재임 수정 | `PersonService.updateGovernmentPositionTenure` | PERSON | |
| 재임 삭제 | `PersonService.deleteGovernmentPositionTenure` | PERSON | |
| 관직 정의 생성 | `PersonService.createPositionDefinition` | (또는 별도 타입) | |
| 관직 정의 수정 | `PersonService.updatePositionDefinition` | | |
| 관직 정의 삭제 | `PersonService.deletePositionDefinition` | | |

### 3. 국가 (COUNTRY)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `CountryService.create` | COUNTRY |
| 수정 | `CountryService.update` | COUNTRY |
| 삭제 | `CountryService.delete` | COUNTRY |

### 4. 역사적 국가 (HISTORICAL_COUNTRY)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `HistoricalCountryService.create` | HISTORICAL_COUNTRY |
| 수정 | `HistoricalCountryService.update` | HISTORICAL_COUNTRY |
| 삭제 | `HistoricalCountryService.delete` | HISTORICAL_COUNTRY |

### 5. 대륙 (CONTINENT)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `ContinentService.create` | CONTINENT |
| 수정 | `ContinentService.update` | CONTINENT |
| 삭제 | `ContinentService.delete` | CONTINENT |

### 6. 사건 (EVENT)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `EventService.create` | EVENT |
| 수정 | `EventService.update` | EVENT |
| 삭제(소프트) | `EventService.delete` | EVENT |
| 복원 | `EventService.restore` | EVENT (method는 UPDATE 등으로 통일 가능) |
| 영구 삭제 | (permanent delete) | EVENT |

### 7. 조직 (ORGANIZATION)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `OrganizationService.create` | ORGANIZATION |
| 수정 | `OrganizationService.update` | ORGANIZATION |
| 삭제 | `OrganizationService.delete` | ORGANIZATION |
| 계층 추가/삭제 | hierarchy API | ORGANIZATION (선택) |

### 8. 직업 (JOB)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `JobService.create` | JOB |
| 수정 | `JobService.update` | JOB |
| 삭제 | `JobService.delete` | JOB |

### 9. 직업 카테고리 (JOB_CATEGORY)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `JobCategoryService.create` | JOB_CATEGORY |
| 수정 | `JobCategoryService.update` | JOB_CATEGORY |
| 삭제 | `JobCategoryService.delete` | JOB_CATEGORY |

### 10. 종교 (RELIGION)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `ReligionService.create` | RELIGION |
| 수정 | `ReligionService.update` | RELIGION |
| 삭제 | `ReligionService.delete` | RELIGION |

### 11. 왕조 (DYNASTY)

- `AggregateType`에 `DYNASTY` 없으면 추가 필요. 있으면:
| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `DynastyService.create` | (해당 enum 값) |
| 수정 | `DynastyService.update` | |
| 삭제 | `DynastyService.delete` | |

### 12. 군부대 (MILITARY_UNIT)

| 동작 | 서비스 메서드 | ownerType |
|------|----------------|-----------|
| 생성 | `MilitaryUnitService.create` | MILITARY_UNIT |
| 수정 | `MilitaryUnitService.update` | MILITARY_UNIT |
| 삭제 | `MilitaryUnitService.delete` | MILITARY_UNIT |

### 13. 인물 경력·학력·수상 등 (선택)

- 군인/비즈니스/학술/스포츠/종교/예술/미디어/법조/의료 경력, 학력, 수상 추가·수정·삭제
- 필요 시 `PERSON` + recordId=인물 ID로 통일하거나, 서브타입은 title/preview로만 구분

### 제외 권장

- **Auth**: 로그인/리프레시 토큰 (알림 불필요)
- **User**: 회원가입/비밀번호 변경/회원 탈퇴 (정책에 따라 제외 가능)
- **Social (팔로우/좋아요/댓글)**: 필요 시 별도 정책으로 추가
- **Curation**: 서비스 범위에 따라 포함 여부 결정
- **Upload**: 파일 업로드 단독은 제외, “인물 수정 시 사진 추가” 등은 인물 수정 알림으로 처리 가능

---

## 5. 구현 시 공통 규칙

1. **서버**: 각 CRUD 성공 직후  
   `NotificationService.create({ entityLabel, method, ownerType?, recordId?, preview?, title? })`  
   호출. **entityLabel은 반드시** 해당 엔티티의 표시 이름(특정값)으로 설정.
2. **entityLabel**: "어떤 것이" 바뀌었는지 한 줄로 구분 가능한 이름. (위 도메인별 예시 표 참고)
3. **title**: 서버에서 완성 문장을 넘기고 싶을 때만 사용. 비우면 클라이언트가 `entityLabel` + `method`로 문장 조합.
4. **preview**: 기간, 하위 항목 등 부가 정보만. 문장의 주어는 entityLabel이 담당.
5. **recordId**: 상세 페이지가 있으면 해당 ID 저장 (헤더 클릭 시 이동용).
