# 관직 1차·2차 카테고리 설계 검토

## 1. 현재 구조 요약

| 구분 | 테이블 | 역할 | 예시 |
|------|--------|------|------|
| 1차 | GovernmentPositionCategory | 관직 **유형** | 국가원수, 정부수반, 왕위 계승자, 섭정, 기타 |
| 2차 | GovernmentPositionDefinition | 1차 아래 **직함** | 국왕, 황제, 대통령, 총리, 영의정, 천황, 쇼군 |
| 재임 | GovernmentPositionTenure | 실제 재임 기록 | personId + positionDefinitionId(또는 기타 title) + 기간 |

- 2차는 `countryId` / `historicalCountryId`로 **국가별** 소속 가능.
- Tenure는 정의 선택 시 `positionDefinitionId`만 저장하고, 표시 시 2차의 `title` 사용(중복 저장 안 함).

---

## 2. 현재 방식의 장단점

### 장점
- 1차(유형) / 2차(직함)가 명확히 분리되어 있어 의미가 분명함.
- 1차를 테이블로 두어 **다국어(이름)** 관리 가능(국가원수, Head of State 등).
- 국가별로 다른 2차 목록을 줄 수 있어, “조선에서는 영의정, 영국에서는 총리” 같은 차이 반영 가능.

### 단점
- **동일 직함의 중복 행**: "국왕"이 조선·고려·고구려·백제·신라·대영제국·영국 등 여러 행으로 존재함.
- **데이터 정규화 부족**: "국왕"이라는 개념은 하나인데, 국가 수만큼 행이 늘어남.
- 시드/관리 시 동일 title을 여러 국가에 반복 입력해야 함.

---

## 3. 대안 설계

### 대안 A: **전역(Global) 2차 + 국가 한정 2차**

**아이디어**: 공통 직함은 **국가 무관(global)** 2차 한 행으로 두고, 국가 전용 직함만 국가 소속으로 둠.

- **전역 2차**: `countryId`, `historicalCountryId` 모두 `NULL`  
  예: 국왕, 여왕, 황제, 대통령, 총리, 칸, 술탄, 국무총리, 연방총리 등 → 각각 **1행**.
- **국가 한정 2차**: 특정 국가에서만 쓰는 직함만 국가 연결  
  예: 영의정(조선), 천황·쇼군·내각총리대신(일본), 국가주석·总理(중국), 최고지도자(이란).

**API 조회 로직**  
`getPositionDefinitions(countryId, historicalCountryId)` 시:

- `(countryId IS NULL AND historicalCountryId IS NULL)` 인 **전역** 2차 전부
- **그리고** `countryId = ? OR historicalCountryId = ?` 인 **해당 국가** 2차

→ 한 국가 화면에서는 “공통 직함 + 그 국가 전용 직함”만 보이게 할 수 있음.

**장점**
- "국왕", "대통령" 등은 DB에 한 번만 존재 → 정규화·단일 출처.
- 시드/운영 시 공통 직함 추가·수정 시 한 곳만 건드리면 됨.
- 행 수 감소, 중복 제거.

**단점**
- 조회 시 조건이 “전역 OR 해당 국가”로 바뀌어야 함(구현 부담 작음).
- “같은 국왕이라도 국가별로 rank/설명을 다르게” 하려면, 국가별 2차를 추가하는 식으로 확장 가능(현 구조 유지).

---

### 대안 B: **1차를 테이블이 아닌 Enum만 사용**

- 2차(Definition)에만 `positionType`(enum)을 두고, 1차 테이블(GovernmentPositionCategory) 제거.
- "국가원수", "정부수반" 같은 **1차 이름**은 프론트/코드에서 enum → 라벨 매핑.

**장점**: 스키마 단순, 테이블·시드 하나 감소.

**단점**: 1차 이름 다국어·추가 유형을 DB로 관리하기 어렵고, 코드/프론트에 하드코딩이 생김.  
→ 1차 이름을 DB로 관리하려면 현재처럼 1차 테이블 유지가 유리.

---

### 대안 C: **Tenure에 표시용 title 스냅샷 저장**

- 정의 선택 시에도 Tenure에 `title`(및 필요 시 `titleEn`)을 **쓰기 시점**에 Definition에서 복사해 저장.
- 조회 시에는 Tenure의 title을 우선 사용(Definition 조인 없이도 표시 가능).

**장점**: 과거 재임 기록이 “당시 직함명”으로 고정됨(Definition 나중에 수정해도 재임 표시는 그대로).

**단점**: 같은 “국왕”이 Tenure 행마다 중복 저장됨. 단일 출처는 Definition만 두는 현재 방식이 더 깔끔함.

**정리**: “역사적 스냅샷”이 중요하면 선택지로 고려 가능. 지금은 정의 기준 단일 출처가 더 나은 trade-off로 보임.

---

## 4. 권장 방향: **대안 A(전역 2차 + 국가 한정 2차)**

- **1차**: 현재처럼 **GovernmentPositionCategory 테이블 유지** (1차 이름·다국어·유형 관리).
- **2차**:  
  - **공통 직함** → `countryId`, `historicalCountryId` 모두 `NULL`인 **전역 2차** 1행씩.  
  - **국가 전용 직함**만 `countryId` / `historicalCountryId` 설정.
- **API**:  
  - “해당 국가용 정의 목록” = `(전역 2차) ∪ (해당 국가 2차)`.
- **Tenure**:  
  - 계속 `positionDefinitionId`만 저장(정의 선택 시), 표시 시 Definition의 `title` 사용 유지 권장.  
  - 필요 시 나중에 “쓰기 시 스냅샷” 옵션만 추가 가능(대안 C).

이렇게 하면:
- “국왕” 등을 한 곳에서만 관리할 수 있고,
- 현재의 1차·2차·Tenure 역할 구분은 그대로 유지하면서,
- 시드/데이터 중복만 크게 줄일 수 있어 **더 나은 방법**으로 볼 수 있음.

---

## 5. 적용 시 변경 사항 요약

| 항목 | 내용 |
|------|------|
| 스키마 | 변경 없음. 2차의 `countryId`/`historicalCountryId`가 이미 nullable. |
| 시드 | 공통 직함은 전역 2차 1행씩, 국가 전용만 국가 연결. |
| API `findPositionDefinitions` | `where`: (countryId IS NULL AND historicalCountryId IS NULL) OR countryId = ? OR historicalCountryId = ? (현대/역사적 국가 연결된 것 포함). |
| 프론트 | 변경 없음. 국가별로 내려주는 정의 목록만 “전역 + 해당국”으로 바뀐 것. |

이 검토를 바탕으로, “더 좋은 방법”은 **전역 2차 도입(대안 A)** 이며, 위와 같이 적용하는 것을 권장함.
