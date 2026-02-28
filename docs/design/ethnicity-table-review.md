# 민족(Ethnicity) 테이블 설계 검토

## 1. 현재 설계 요약

| 항목 | 내용 |
|------|------|
| 테이블명 | `ethnicity` |
| 위치 | `libs/db/prisma/society.prisma` |
| 용도 | 민족적 정체성·구성 민족 (슬라브족, 게르만족 등) |

### 현재 컬럼

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | String (UUID) | PK | |
| name | String | unique, VarChar(100) | 민족명 (한글/표준명) |
| description | String? | Text | 설명 |
| thumbnailUrl | String? | VarChar(255) | 썸네일 |
| created_at, updated_at | DateTime | | |

### 현재 관계

- **Country** (현대 국가) ↔ Ethnicity: 다대다
- **HistoricalCountry** (역사적 국가) ↔ Ethnicity: 다대다

---

## 2. 잘 된 점

- **name unique**: 민족명 중복 방지, “슬라브족” 등 한 건만 등록 가능.
- **description**: 지리적 분포·이주·문화 등 긴 설명에 적합.
- **썸네일**: 시각 자료 연동 가능.
- **현대·역사적 국가 모두 연결**: 같은 민족 풀로 양쪽에서 “구성 민족” 표현 가능.
- **단순한 구조**: 참조 데이터로 쓰기 좋고, API·UI 부담 적음.

---

## 3. 다른 참조 모델과 비교

| 항목 | HistoricalCountry | Country | Language | **Ethnicity(현재)** |
|------|-------------------|---------|----------|---------------------|
| 명칭 (기본) | name | name | name | name ✓ |
| 영문/로컬명 | **enName** | localName | **originalName** | **없음** |
| 설명 | description | - | - | description ✓ |
| 썸네일 | thumbnailUrl | thumbnailUrl | - | thumbnailUrl ✓ |

- **역사적 국가**는 `enName`(영문명)을 둠.
- **언어**는 `originalName`(원어명)을 둠.
- **민족**은 한글/표준명(`name`)만 있고, **영문명·원어명이 없음**.

---

## 4. 보완 검토 항목

### 4.1 영문명(enName) — 권장

- **이유**: 슬라브족→Slavs, 게르만족→Germanic peoples 등 표기 통일·다국어·검색에 유리.
- **비교**: HistoricalCountry, Government 직함 등은 `enName`/`titleEn` 사용.
- **제안**: `enName String? @map("en_name") @db.VarChar(100)` 추가. unique는 불필요(한글 name이 이미 unique).

### 4.2 원어/현지명(nameLocal) — 선택

- **이유**: 자족명(엔도님) 보존. 예: Slavs → Славяне, Germanic → Germanen.
- **제안**: 필요하면 `nameLocal String? @map("name_local") @db.VarChar(100)` 추가.

### 4.3 상위 민족(계층) — 선택

- **이유**: 동슬라브족·서슬라브족 → 슬라브족처럼 계층이 필요할 수 있음.
- **제안**: 나중에 필요 시 `parentId String? @map("parent_id")` + `parent Ethnicity?`, `children Ethnicity[]` 추가.  
  지금은 “구성 민족”만 나열하면 되면 **미추가**로도 충분.

### 4.4 언어(Language)와 연결 — 선택

- **이유**: 민족과 언어는 다대다에 가깝고, Country는 이미 Language와 연결됨.
- **제안**: “민족별 대표 언어”나 “언어별 주요 민족”이 서비스 요구사항이면, Ethnicity ↔ Language 다대다 추가 검토.  
  구성 민족만 쓰는 단계면 **미추가**로도 됨.

### 4.5 accountId — 미추가 유지

- **이유**: 민족은 공용 참조 데이터에 가깝고, HistoricalCountry처럼 “본인만 수정”이 필요하지 않다면 accountId는 두지 않는 편이 맞음.

---

## 5. 정리

| 질문 | 결론 |
|------|------|
| 지금 설계만으로 “구성 민족” 쓰기에 충분한가? | **예.** name + description + Country/HistoricalCountry 관계만으로 슬라브족·게르만족 등록 및 연결 가능. |
| 반드시 넣는 게 좋은 건? | **enName(영문명)**. 다른 참조 모델과 맞추고, 다국어·검색을 위해 권장. |
| 나중에 검토해볼 만한 건? | nameLocal(원어/현지명), 상위 민족(parentId), Language와의 관계. |

**최종**:  
- **현재 설계만으로도 “민족 테이블이 이거면 돼?”에 대한 답은 “구성 민족 용도로는 된다”.**  
- **다만 영문명(enName)을 추가하면** 다른 엔티티와 일관되고, 이후 확장에 유리함.
