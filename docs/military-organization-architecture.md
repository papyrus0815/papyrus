# 군 조직·행정 부처 통합 설계 (역사 앱)

> 역사·국가 데이터를 다루는 앱에서는 **행정 부처(문서·정책)** 와 **군사 부대(작전·편성)** 가 서로 다른 도메인이면서도 **같은 국가·같은 시기**에 연결됩니다. 이 문서는 두 축을 어떻게 맞출지 정의합니다.

---

## 1. 도메인 두 축

| 축 | Prisma 모델 | 역할 | UI |
|----|-------------|------|-----|
| **행정 부처** | `AdministrationDepartment` | 국방부·합참·군 본부 등 **정부 조직도** (장관 재임, 기관 사건 개편) | 중앙부처 탭 — 목록·상세 |
| **군사 부대** | `MilitaryUnit` | 사단·여단·함대 등 **전투·편성 단위** (`MilitaryUnitType`, `MilitaryUnitCommander`, 참전) | 군사 도메인 화면 + 전쟁사 연동 |

**핵심**: `AdministrationDepartment`만으로 “국방부 → 육군본부 → 사단”을 **부처 트리**로 표현할 수 있지만, **부대 번호·군·사단·해역** 같은 군 전용 속성은 `MilitaryUnit`이 적합합니다.

---

## 2. 스키마 연결 (구현됨)

`MilitaryUnit`에 선택적 FK 추가:

- `administrationDepartmentId` → `AdministrationDepartment.id`
- 관계명: `DeptMilitaryUnits`

**의미**

- 한 **행정부처 노드**(예: 국방부 본부, 육군본부)에 **여러 군사 부대** 레코드가 매핑될 수 있음 (1:N).
- 국방부 산하 “제7기동군단” 등 **부대 트리**는 `MilitaryUnit.parentUnitId`로 유지하고, **동일 기관의 행정 표현**은 `administrationDepartmentId`로 연결.
- **참모총장·사단장** 등은 `GovernmentPositionTenure` + `AdministrationDepartment` 또는 `MilitaryUnitCommander` + `Person`으로 이중 표현 가능.

---

## 3. 데이터 입력 가이드 (역사 시점)

1. **시기 고정**: `establishedDate` / `disbandedDate`(부대) / `abolishedDate`(부처)로 **개편 전후**를 구분.
2. **개편 후속**: 부처는 `successorId`, 부대는 상위 변경 또는 신규 부대 + `WarHistory`·사건 연동.
3. **역사적 국가**: `historicalCountryId`가 있는 부처는 현대 `countryId`와 함께 두어 **지도·비교**에 사용.

---

## 4. 향후 확장 (선택)

| 항목 | 설명 |
|------|------|
| `MilitaryBranch` enum | 육·해·공·해병·국군기무사 등 — `MilitaryUnit`에 선택 필드로 추가 검토 |
| `MilitaryUnit` ↔ `AdministrationDepartment` 1:1 | 본부 단위에서만 강제할 때 `@@unique` on `administrationDepartmentId` |
| 전쟁사 | 기존 `WarHistoryMilitaryUnit` + `SideDeployedUnit` |

---

## 5. 마이그레이션

스키마 변경 후:

```bash
cd apps/api && npx prisma migrate dev --name military_unit_admin_dept_link
```

---

## 6. 관련 코드

- `libs/db/prisma/military.prisma` — `MilitaryUnit`, `MilitaryUnitType`
- `libs/db/prisma/country.prisma` — `AdministrationDepartment`
- 웹 관리: `ministry-department*.tsx`, `government-info-section.widget.tsx`

이전 짧은 메모는 본 문서로 대체됩니다.

---

## 7. 자주 생기는 혼란 (육군본부·육군성 아래 부대를 넣을 때)

### 7.1 두 개의 “나무”가 있다

| 나무 | 모델 | `parent` 필드 | UI 위치 | 비유 |
|------|------|----------------|---------|------|
| **행정 부처·기관** | `AdministrationDepartment` | `parentId` → 또 다른 `AdministrationDepartment` | 국가 상세 → **중앙부처** 탭 | 정부 조직도, 장관 재임, 기관 사건 |
| **군사 부대** | `MilitaryUnit` | `parentUnitId` → 또 다른 `MilitaryUnit` | **군부대** 메뉴(전용 화면) | 사단·여단·함대 편성, 지휘관 |

**부대는 `AdministrationDepartment`가 아닙니다.**  
다만 “국방부 본부”처럼 **같은 실체를 행정 이름과 군 편성 이름 둘 다** 쓰고 싶을 때, `MilitaryUnit.administrationDepartmentId`로 **링크만** 겁니다 (1:N, 선택).

### 7.2 “육군성 / 육군본부 밑에 사단을 달고 싶다”면

- **편성(작전·군)** 관점 → **군부대** 화면에서 육군본부에 해당하는 **부대 레코드**를 고른 뒤, 그 아래에 **하위 `MilitaryUnit`**(예: 사단)을 추가합니다. (`parentUnitId` 체인)
- **정부 조직도·장관 라인**만 필요하면 → **중앙부처**에서 “육군본부”를 `AdministrationDepartment`로 두고, 그 **아래에 추가하는 것은 또 다른 행정 노드**(청·실·국 등)입니다.  
  여기서 “하위 추가”는 **`MilitaryUnit`을 만들지 않습니다.**

### 7.3 UI에서 헷갈리던 이유 (과거)

중앙부처 상세에 **「하위 기관·부대 추가」** 같은 문구가 있으면, 사용자는 **군 부대**를 추가한다고 기대하기 쉽습니다.  
실제로는 **항상 `AdministrationDepartment` 자식**만 생성하는 폼이 열립니다.  
→ 버튼/도움말은 **「하위 행정 기관 추가」**처럼 구분하는 것이 맞습니다.

### 7.4 정리 한 줄

- **부처 트리** = 문민 정부 조직(및 그에 매핑되는 기관명).
- **부대 트리** = 군 전용 편성; 육군본부–사단–대대는 **여기서만** parent 체인으로 표현하는 것이 모델에 맞습니다.

