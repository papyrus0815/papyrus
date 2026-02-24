# 관직(Government) 도메인 테이블 관계

역대 수반·관직 체계를 다루는 테이블들이 어떻게 연결되는지 정리한 문서입니다.

---

## 1. 테이블 개요

| 테이블 | 역할 | 비고 |
|--------|------|------|
| **government_position_definition** | 관직 정의 (직함 단일 레벨) | 직함명 + positionType(enum). 전역 목록. 계층 없음. |
| **government_position_tenure** | 재임 기록 (역대 수반) | “누가, 어느 국가에서, 어떤 직함으로, 언제” |
| **regnal_era** | 연호 | 동아시아 군주 연호 (康熙, 乾隆 등) — Tenure에 1:N |

외부 참조: **Person**, **Country**, **HistoricalCountry**, **Organization**.

---

## 2. 관계 다이어그램

```
┌─────────────────────────────┐      ┌──────────────────────┐
│ GovernmentPositionDefinition│      │ Organization          │
│ (직함 단일 레벨)             │──N:1─│ (선택)                │
├─────────────────────────────┤      └──────────────────────┘
│ id (PK)                     │  organizationId (nullable)
│ positionType (enum)         │
│ title, titleEn, titleLocal  │
│ rank, departmentName        │
└──────────────┬──────────────┘
               │
               │ positionDefinitionId (nullable)
               │
               ▼ N
┌─────────────────────────────┐
│ GovernmentPositionTenure    │  재임 기록 (역대 수반)
├─────────────────────────────┤
│ id (PK)                     │
│ personId (FK → Person)      │───────► Person (재임자)
│ positionDefinitionId (FK, optional) → Definition
│ positionType (enum)         │
│ title, titleEn (nullable, 기타용) │
│ countryId (FK, optional)   │───────► Country (현대 국가)
│ historicalCountryId (FK, optional) │──► HistoricalCountry
│ termNumber, regnalNumber    │
│ startDate, endDate          │
│ appointmentMethod, endReason│
│ notes                       │
└──────────────┬──────────────┘
               │ 1
               │
               │ tenureId
               ▼ N
┌─────────────────────────────┐
│ RegnalEra                   │  연호 (동아시아 군주)
├─────────────────────────────┤
│ id (PK)                     │
│ tenureId (FK → Tenure)      │
│ eraName, eraNameEn          │
│ startYear/Month/Day         │
│ endYear/Month/Day           │
│ changeReason                │
└─────────────────────────────┘
```

---

## 3. 관계 설명

### 3.1 관직 정의 (Definition, 단일 레벨)

- **GovernmentPositionDefinition** 은 **직함**(대통령, 총리, 국왕 등) 단일 레벨만 가집니다.
- **positionType**(enum)으로 분류(국가 원수, 정부 수반 등). 계층(parentId) 없음.
- 전역 목록, 국가 컬럼 없음.

### 3.2 Definition → Tenure

- **GovernmentPositionDefinition** 1건당 **GovernmentPositionTenure** N건.
- **Tenure.positionDefinitionId** → **Definition.id** (선택, SetNull).
- 정의를 선택한 재임만 FK로 연결. “기타” 직접 입력 재임은 `positionDefinitionId = null`, `title`/`titleEn` 사용.

### 3.3 재임(Tenure)이 참조하는 외부 테이블

| FK | 참조 테이블 | 설명 |
|----|-------------|------|
| **personId** | Person | 재임자(인물). 필수, Cascade 삭제. |
| **countryId** | Country | 현대 국가 소속. 선택(역사적 국가만 쓰면 null). |
| **historicalCountryId** | HistoricalCountry | 역사적 국가 소속. 선택(현대 국가만 쓰면 null). |

- 한 건의 재임은 **현대 국가** 또는 **역사적 국가** 중 하나(또는 둘 다 null은 비권장)로 소속.

### 3.4 Definition이 참조하는 외부 테이블

| FK | 참조 테이블 | 설명 |
|----|-------------|------|
| **organizationId** | Organization | 소속 행정기구. 선택. |

- **Definition**에는 `countryId`/`historicalCountryId` 없음(전역 목록).

### 3.5 재임 → 연호 (Tenure → RegnalEra)

- **GovernmentPositionTenure** 1건당 **RegnalEra** N건.
- **RegnalEra.tenureId** → **Tenure.id** (필수, Cascade 삭제).
- 한 재임(군주)이 여러 연호를 가질 수 있음 (康熙, 乾隆 등).

---

## 4. 역방향 관계 (다른 도메인에서 바라본 경우)

| 테이블 | Government 도메인과의 관계 |
|--------|----------------------------|
| **Person** | `GovernmentTenures` → 해당 인물의 재임 기록 목록 (GovernmentPositionTenure[]). |
| **Country** | `governmentTenures` → 해당 현대 국가의 재임 기록 목록. |
| **HistoricalCountry** | `governmentTenures` → 해당 역사적 국가의 재임 기록 목록. |
| **Organization** | `governmentPositionDefinitions` → 해당 조직에 소속된 직함 정의 목록. |

---

## 5. Enum (공통 코드)

- **GovernmentPositionType**: HEAD_OF_STATE, HEAD_OF_GOVERNMENT, HEIR_APPARENT, REGENT, … (1차 Category와 Tenure에서 사용).
- **AppointmentMethod**: DIRECT_ELECTION, HEREDITARY, COUP 등 (Tenure에서 사용).
- **TenureEndReason**: TERM_COMPLETED, RESIGNATION, DEATH_IN_OFFICE 등 (Tenure에서 사용).

---

## 6. 요약

- **1차(Category)** → **2차(Definition)** → **재임(Tenure)** 순으로 “유형 → 직함 → 실제 재임”이 연결됨.
- **재임(Tenure)**은 **Person**(누가), **Country/HistoricalCountry**(어느 국가), **Definition**(어떤 직함, 선택)과 연결됨.
- **연호(RegnalEra)**는 **Tenure**에만 연결되며, 동아시아 군주 재임별 연호를 1:N으로 관리함.
- 2차(Definition)는 국가와 무관한 **전역 목록**이며, 새 국가를 등록해도 이 테이블에 행을 추가하지 않음.

---

## 7. 역대 수반 페이지 ↔ 인물(Person) 연결

역대 수반 화면에서 **인물**과의 연결은 **재임(Tenure)** 테이블의 **personId** 한 개로 이뤄집니다.

### 7.1 DB 연결

```
Person (인물)  ←── personId ──  GovernmentPositionTenure (재임)
     │                                    │
     │ 1                                 N │
     └────────────────────────────────────┘
```

- **GovernmentPositionTenure.personId** (필수) → **Person.id**
- 한 건의 재임 = “한 명의 인물이, 한 직함으로, 한 국가에서, 기간 동안 재임한 기록”
- 한 인물은 여러 재임을 가질 수 있음 (다른 국가·다른 직함·다른 시기) → Person : Tenure = 1 : N

### 7.2 API에서의 연결

- **역대 수반 목록 조회** (`getTenuresByCountry` / `findTenuresByCountry`):
  - 조건: `countryId` 또는 `historicalCountryId`로 해당 국가(또는 연결된 역사적 국가)의 재임만 조회
  - 각 재임 레코드에 **person**을 `include`해서 함께 반환  
    → 응답에 `tenure.person` (id, name, surname, profileImageUrl, fatherId, motherId 등) 포함
- **재임 등록/수정** 시:
  - 요청 body에 **personId** 필수 → “이 재임의 재임자”로 그 인물을 지정

그래서 “역대 수반 페이지에서 인물과 어떻게 연결되나?”에 대한 답은  
**“재임(GovernmentPositionTenure)의 personId가 인물(Person)을 가리키고, API는 재임 조회 시 person을 붙여서 내려준다”**입니다.

### 7.3 프론트에서의 사용

- **목록/계보도**: API가 준 `tenure.person`으로 이름·사진·가족 관계(fatherId/motherId) 표시
- **등록/수정 폼**: 인물 선택 모달에서 선택한 인물의 id를 **personId**로 넘겨 재임 생성/수정 API 호출

정리하면, **역대 수반 ↔ 인물**은 별도 매핑 테이블 없이 **Tenure.personId → Person** 한 경로로만 연결됩니다.

---

## 8. 1차/2차 테이블 분리 — 좋은 방법인가?

현재 구조(1차 = Category 테이블, 2차 = Definition 테이블)가 적절한지 검토한 내용입니다.

### 8.1 현재 구조 요약

- **1차 테이블 (GovernmentPositionCategory)**: 유형 — 국가원수, 정부수반, 왕위 계승자, 섭정, 기타. 각 행이 `positionType`(enum)과 이름(name/nameEn)을 가짐.
- **2차 테이블 (GovernmentPositionDefinition)**: 직함 — 국왕, 황제, 대통령, 총리 등. `categoryId`로 1차에 반드시 소속.

### 8.2 현재 방식의 장점

| 항목 | 설명 |
|------|------|
| **역할 분리** | “유형(분류)”과 “직함(선택지)”이 테이블 단위로 명확히 구분됨. |
| **1차 이름을 DB에서 관리** | “국가원수”, “Head of State” 등을 코드가 아닌 DB에서 관리할 수 있어, 다국어·추가 유형을 데이터만으로 처리 가능. |
| **참조 무결성** | 2차는 항상 `categoryId`(FK)를 가지므로 “소속 없는 직함”이 생기지 않음. |
| **UI/비즈니스와의 대응** | “1차로 필터 → 2차 목록” 같은 흐름이 그대로 “Category 조회 → Definition 조회”로 매핑됨. |

### 8.3 현재 방식의 단점·트레이드오프

| 항목 | 설명 |
|------|------|
| **테이블·조인 증가** | 테이블이 두 개라 조회 시 항상 Category–Definition join 필요. |
| **1차와 enum의 중복** | 1차 행이 사실상 `GovernmentPositionType` enum과 1:1에 가까워, “유형을 테이블로 둘 필요가 있나?”라는 질문이 나올 수 있음. |

### 8.4 대안과 비교

**대안 A: 2차 테이블만 두고, 1차는 enum만 사용**

- **Definition**에 `positionType`(enum)만 두고, **Category 테이블 제거**.
- 1차 표시 이름(국가원수, 정부수반 등)은 프론트/코드에서 enum → 라벨 매핑.

| 구분 | 평가 |
|------|------|
| 장점 | 스키마 단순, 조인 감소. |
| 단점 | 1차 이름 다국어·추가 시 코드 수정 필요. 1차를 “데이터”로 관리하기 어려움. |

→ **1차 이름을 DB/다국어로 관리하려면** 지금처럼 1차 테이블을 두는 편이 유리함.

---

**대안 B: 1차·2차를 한 테이블에 (parentId 자기 참조)**

- 한 테이블에 `parentId`(nullable). `parentId = null` → 1차, `parentId = 1차 id` → 2차.
- 필요하면 3단계 이상도 같은 테이블로 확장 가능.

| 구분 | 평가 |
|------|------|
| 장점 | 테이블 하나로 유연한 계층 구조. |
| 단점 | “유형”과 “직함”이라는 **의미가 다른 두 종류의 행**이 한 테이블에 섞여, 스키마만 봐서는 구분이 어렵고, 1차용 컬럼(name/positionType)과 2차용 컬럼(title 등)이 한 테이블에 공존해야 함. |

→ **역할이 다르면 테이블을 나누는 편**이 이해와 유지보수에 유리한 경우가 많음.

### 8.4.1 한 테이블로 묶어도 되는가?

**가능하다.** 한 테이블로 묶을 때는 보통 아래처럼 **자기 참조(parentId)** 로 1차/2차를 구분한다.

```text
GovernmentPositionDefinition (단일 테이블)
├── id (PK)
├── parentId (FK → self, NULL이면 1차, 있으면 2차)
├── positionType (enum)        ← 1차·2차 공통 (2차는 부모에서 상속해 써도 됨)
├── name / nameEn              ← 1차일 때 사용 (2차는 NULL)
├── title / titleEn / titleLocal ← 2차일 때 사용 (1차는 NULL)
├── rank
├── organizationId (optional)
└── ...
```

- **1차**: `parentId = NULL`, `name`/`nameEn`/`positionType` 사용, `title`은 NULL.
- **2차**: `parentId = 1차 id`, `title`/`titleEn`/`titleLocal` 사용. `positionType`은 조회 시 부모(1차)에서 가져와도 됨.

**한 테이블로 묶었을 때**
- **장점**: 테이블·마이그레이션·조인 감소, 3단계 이상 확장도 같은 테이블로 가능.
- **단점**: 1차용 컬럼(name)과 2차용 컬럼(title)이 한 테이블에 공존해, 행 종류에 따라 NULL이 많아지고 스키마만 보면 의미가 다소 섞여 보일 수 있음.

**정리**: 1차 개수가 많지 않고, “유형+직함을 하나의 계층”으로 다루고 싶다면 **한 테이블로 묶어도 된다**. 지금처럼 1차/2차 역할을 아주 엄격히 나누고 싶거나, 1차 전용·2차 전용 API/권한을 나누고 싶다면 두 테이블이 더 맞다.

---

**대안 C: 2차만 테이블, 1차는 “뷰/그룹핑”**

- **Definition**만 테이블로 두고, `positionType`으로 그룹핑해 1차처럼 보여줌. 1차 “이름”은 enum 매핑 또는 작은 코드 테이블.

→ 대안 A와 비슷. 1차를 “데이터”로 관리할지 여부에 따라 현재 2테이블이 나음.

### 8.5 결론

- **1차 이름(국가원수, 정부수반 등)을 DB에서 관리·다국어 대응하고, 2차는 반드시 어떤 1차에 속하게 하고 싶다면**  
  → **지금처럼 1차 테이블(Category)과 2차 테이블(Definition)을 나누는 방식이 좋은 방법**에 해당함.
- 1차가 거의 고정이고, 이름을 코드에 두어도 괜찮다면 “2차 테이블 + enum만”으로 단순화할 수는 있으나, 그 경우 1차 라벨 변경·다국어는 코드 변경이 필요함.
- **역할(유형 vs 직함)이 다르고, 참조 무결성과 “1차를 데이터로 관리”를 중시한다면** 현재의 1차/2차 테이블 분리는 타당한 선택으로 볼 수 있음.

