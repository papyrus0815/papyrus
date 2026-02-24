# 관직 정의(GovernmentPositionDefinition) 데이터 가이드

**단일 레벨**: 관직 정의는 **직함**(대통령, 총리, 국왕 등)만 등록하며, **분류는 직위 유형(enum)** 으로만 합니다. 1차/2차 계층은 없습니다.

- **관계/테이블 개요**: [government-position-tables-relation.md](./design/government-position-tables-relation.md) 참고.
- **정의는 국가 무관 전역 목록**이며, 재임(Tenure)을 등록할 때만 현대 국가/역사적 국가를 지정합니다.

---

## 1. 구조 요약

| 구분 | 설명 |
|------|------|
| **직위 유형(positionType)** | enum. "국가 원수", "정부 수반" 등 **분류** (코드). 카테고리 역할. |
| **직함(Definition 행)** | 테이블에 등록하는 **직함명** (대통령, 총리, 국왕 등). 각 행에 positionType(enum) 부여. |

- **재임(Tenure)** 은 직함 정의 행을 참조합니다. 역대 수반 등록 시 목록에서 선택하는 것이 이 직함입니다.
- UI에서는 직위 유형(enum)별로 그룹 지어 표시합니다.

---

## 2. 필드별 입력 가이드

### 2.1 필드 목록

| 필드 | 필수 | 설명 | 예시 |
|------|------|------|------|
| **title** | ✅ | 직함 표시명 (한글) | `대통령`, `총리`, `국왕` |
| **positionType** | ✅ | 직위 유형(enum). 아래 §3 참고 | `HEAD_OF_STATE`, `HEAD_OF_GOVERNMENT` |
| **titleEn** | ❌ | 영문명 | `President`, `Prime Minister` |
| **titleLocal** | ❌ | 현지어 표기 | `天皇`, `将軍`, `总理` |
| **rank** | ❌ | 표시 순서(숫자 작을수록 먼저). 기본 999 | `1`, `2` |
| **description** | ❌ | 설명 | 직위에 대한 짧은 설명 |
| **departmentName** | ❌ | 부서/부처명 (표시용) | `외교부`, `이조` |
| **organizationId** | ❌ | 소속 행정기구 ID (선택) | 조직(Organization) id |
| **establishedDate** | ❌ | 직위 설치일 (ISO 8601) | `1990-01-01` |
| **abolishedDate** | ❌ | 직위 폐지일 (ISO 8601) | `1910-01-01` |

**문자 길이 제한**

- `title`, `titleEn`, `titleLocal`, `departmentName`: 최대 **100자** (VarChar 100).
- `description`: 텍스트(길이 제한 없음).
- `rank`: 0 이상 정수 (API 검증 `@Min(0)`). 미입력 시 기본값 999.

### 2.2 ID 정책

- **API로 생성 시**: `id`는 서버에서 **UUID** 자동 부여. 요청 body에 id를 넣지 않음.
- **시드 스크립트**: 고정 id 사용 가능 (예: `gov-pos-president`, `gov-pos-pm`). 동일 id로 upsert 시 업데이트됨.

---

## 3. 직위 유형(positionType) enum

| 값 | 한글 라벨 | 용도 예 |
|----|-----------|--------|
| `HEAD_OF_STATE` | 국가 원수 | 대통령, 국왕, 황제, 천황, 칸, 술탄 |
| `HEAD_OF_GOVERNMENT` | 정부 수반 | 총리, 영의정, 국무총리, 연방총리 |
| `HEIR_APPARENT` | 왕세자·세자 | 왕세자, 황태자, Crown Prince |
| `REGENT` | 섭정 | 섭정, 대리청정 |
| `CABINET_MINISTER` | 각료/장관 | 외교부 장관, 6조 판서 |
| `VICE_MINISTER` | 차관 | 차관, 차관보 |
| `LEGISLATOR` | 의회의원 | 국회의원, 상원의원 |
| `JUDICIARY` | 사법부 | 대법원장, 헌법재판소장 |
| `LOCAL_GOVERNMENT` | 지방정부 | 도지사, 시장, 군수 |
| `SPECIAL_POSITION` | 특별직 | 감사원장, 중앙선거관리위원장 |
| `MILITARY_COMMANDER` | 군 지휘관 | (국군통수권자는 HEAD_OF_STATE) |
| `ROYAL_NOBLE_TITLE` | 왕족/귀족 | 공작, 후작, 백작, 대군 |
| `OTHER` | 기타 | 위에 해당하지 않는 직위 |

---

## 4. 시드/CRUD 입력 예시

### 4.1 직함 예시 — 국가 원수(HEAD_OF_STATE)

| title | titleEn | titleLocal | positionType | rank |
|-------|---------|------------|--------------|------|
| 국왕 | King | | HEAD_OF_STATE | 1 |
| 여왕 | Queen | | HEAD_OF_STATE | 1 |
| 황제 | Emperor | | HEAD_OF_STATE | 1 |
| 천황 | Emperor | 天皇 | HEAD_OF_STATE | 1 |
| 대통령 | President | | HEAD_OF_STATE | 1 |
| 칸 | Khagan | | HEAD_OF_STATE | 1 |
| 술탄 | Sultan | | HEAD_OF_STATE | 1 |
| 쇼군 | Shogun | 将軍 | HEAD_OF_STATE | 2 |

### 4.2 직함 예시 — 정부 수반(HEAD_OF_GOVERNMENT)

| title | titleEn | titleLocal | positionType | rank |
|-------|---------|------------|--------------|------|
| 총리 | Prime Minister | | HEAD_OF_GOVERNMENT | 1 |
| 영의정 | Chief State Councillor | | HEAD_OF_GOVERNMENT | 1 |
| 국무총리 | Prime Minister | | HEAD_OF_GOVERNMENT | 2 |
| 내각총리대신 | Prime Minister | 内閣総理大臣 | HEAD_OF_GOVERNMENT | 2 |
| 연방총리 | Chancellor | | HEAD_OF_GOVERNMENT | 2 |

---

## 5. UI에서 넣을 때 (관직 정의 관리 모달)

- **연대표 → 국가 상세 → 인물 탭 → 통계·최근 인물** 영역 상단 **톱니바퀴** → **관직 정의 관리**.

**모달에서 입력 가능한 필드**: 직함명(title), 직위 유형(positionType), 표시 순서(rank)만 있습니다.  
`titleEn`, `titleLocal`, `description`, `departmentName`, `organizationId`, `establishedDate`, `abolishedDate`는 **API**(POST/PUT) 또는 **시드 스크립트**로만 넣을 수 있습니다.

- **직함 추가**: 「직함 추가」 클릭 → 직함명, 직위 유형(enum 선택), 표시 순서(선택) 입력 후 등록.
- 목록은 **직위 유형별**로 그룹되어 표시됩니다.

---

## 6. 시드 스크립트

- **파일**: `apps/api/prisma/seeds/governmentPositionDefinition.seed.ts`
- **실행**: 시드 시 기존 1차 카테고리 행(legacy)을 삭제한 뒤, 직함 목록(DEFINITIONS)을 upsert합니다.
- **확인**: `npx prisma db seed` 또는 프로젝트 시드 실행 방식에 따라 실행.

---

## 7. API 엔드포인트 (참고)

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/government-positions/definitions` | 목록 조회. 전역 단일 레벨 전체 반환. |
| GET | `/government-positions/definitions/:id` | 단건 조회. |
| POST | `/government-positions/definitions` | 생성. body: CreateGovernmentPositionDefinitionDto (id 제외). |
| PUT | `/government-positions/definitions/:id` | 수정. body: UpdateGovernmentPositionDefinitionDto (부분 가능). |
| DELETE | `/government-positions/definitions/:id` | 삭제. |

---

## 8. 주의사항 및 삭제 동작

- 재임(역대 수반)은 **직함 정의 행**을 참조합니다. “대통령”, “총리” 등은 이 테이블에 직함으로 등록하면 됩니다.
- **직함 삭제**: 해당 정의를 참조하는 **재임(Tenure)** 이 있으면, 재임의 `positionDefinitionId`만 **SetNull** 됩니다. 재임 건은 남고, 직함 정의 연결만 해제됩니다.
- **동일 표시명**: 같은 positionType 아래에 같은 `title`을 둘 수 있습니다. DB에 (positionType, title) 유니크 제약은 없습니다.
- **organizationId**: 소속 행정기구를 넣을 때는 유효한 **Organization** 테이블의 UUID를 사용하세요. 선택 항목이며, 정의는 전역이므로 국가와 무관하게 조직을 지정할 수 있습니다.

---

## 9. 한눈에 보는 체크리스트

| 넣을 데이터 | 비고 |
|-------------|------|
| title | ✅ 필수, 직함명, 100자 이내 |
| positionType | ✅ 필수, §3 enum |
| rank | 선택, 0 이상, 기본 999 |
| titleEn / titleLocal | 선택, API·시드에서만 입력 가능 |
| description, departmentName, organizationId | 선택, API·시드에서만 |
| establishedDate / abolishedDate | 선택, ISO 날짜, API·시드에서만 |
