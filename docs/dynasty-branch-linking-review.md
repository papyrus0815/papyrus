# 가문(Dynasty) 직계·방계 분가 연결 검토서

> 2026-07-02 · 다각도 검토(현황 조사 4방향 + 독립 설계 3안 + 적대 검증 3건) 종합
>
> **2026-07-02 완전성 감사 반영**: 6관점 수색 → 3렌즈 적대검증(후보 38건 → 확정 17건)을 통과한 발견 전건을 본문에 정정·보강 — 내역과 기각 목록은 §7
>
> 질문: "한 가문에서 파생되는 가문이 많다(직계·방계). 발루아 → 발루아-오를레앙처럼 나뉘는데, 이렇게 연결시켜야 하지 않는가?"

## 결론 (TL;DR)

**연결이 필요한 것은 맞다. 현재 스키마로는 표현이 불가능하고, 시드 데이터가 이미 이름 문자열로 분가를 인코딩하며 우회 중이라 수요는 실증돼 있다.** 다만 세 가지 판단이 검토에서 수렴했다:

1. **단일 `parentDynastyId` 컬럼은 부적합** — 합스부르크+로트링겐 → 합스부르크-로트링겐(부모 가문 2개)에서 파산한다. 최소형은 **M:N 엣지 테이블 1개 + 유형 enum**이다.
2. **왕조 교체(고려→조선)는 가문 엣지가 아니다** — 혈통 파생이 아니라 국가별 통치 교체이며, 기존 `DynastyRule`(endReason)의 영역. enum에 교체용 값을 의도적으로 두지 않아 오염을 저작 단계에서 차단한다.
3. **표시 지면이 선행 조건** — 가문 상세 페이지가 없고(`/dynasties/:id` 딥링크는 목록 redirect로 소실), `DynastyRule`이 이미 "시드 12파일 분량이 렌더 화면 0곳"인 write-only 전례다. 분가 엣지를 지금 붙이면 두 번째 write-only 테이블이 된다. **가문 상세 페이지 신설 → 엣지 테이블 + 저작 UI + 표시를 한 배치로** 순서가 맞다.

## 1. 현황 (전부 코드 검증 완료)

| 사실 | 근거 |
|---|---|
| `Dynasty`는 완전 플랫 — self-relation·가문 간 관계 필드 0건, 전 코드베이스에 branch/cadet/parentDynasty 개념 0건 | `libs/db/prisma/dynasty.prisma:35-85`, 전역 grep 검증 |
| 분가는 **이름 문자열로만 인코딩 중**: '부르봉-스파냐/프랑스/양시칠리아', '합스부르크-오스트리아 가문 (라이너 분가)' 등 — 본가와의 연결·분기 시점·사유는 표현 불가 | `apps/api/prisma/seeds/dynasty.savoy.seed.ts:229-244` 등 시드 20파일, 고유 가문명 ~56개 |
| `Person.dynastyId`는 단일 nullable FK — 인물은 가문 하나에만 소속, 발루아-오를레앙 인물을 발루아로 조회하는 롤업은 어떤 경로로도 불가 | `libs/db/prisma/person.prisma:206,228`, `person.prisma.repository.ts:797-801`(정확일치) |
| family-tree 응답·가계도 카드는 `dynasty {id,name}`을 **이미 포함·렌더** — 분가명이 자기서술적이면 배지가 곧 분가 표시가 됨 | `person.response.ts:151`, `card.tsx:143,423`(NodeDynasty), `genealogy.page.tsx:519` |
| `dynastyOrdinal`(왕조 서수)은 **SovereignReign** 필드(GovernmentPositionTenure 아님) — Dynasty FK 없는 자유 정수, 준거는 표시 시점의 `Person.dynastyId`. 가문 삭제 시 서수만 고아로 잔존 | `government.prisma:310-314`, 마이그레이션 `20260701044247`, `tenure-reign-list.tsx:138-142` |
| 가문 상세 페이지 부재 — `/dynasty` 목록 단일, 구 `/dynasties/:id`는 목록 redirect(딥링크 소실). 인물 상세의 가문 칩 클릭도 목록으로만 이동 | `legacy-redirects.tsx:53`, `pathKeys.dynasty()` |
| `DynastyRule`(가문↔국가 통치기록)은 write-only — 백엔드 `:id/detail`이 내려주지만 프론트 래퍼가 detail 미노출, 렌더 화면 0곳 | `shared/api/dynasty/index.ts`, web-admin에 'historicalRules' 0회 |
| `Dynasty.name` 전역 `@unique`. SCG 계열 3행 공존('작센-코부르크-고타 가문' / '작센코부르크고타 왕가' / '벨기에 왕가 (작센-코부르크-고타)') — **정정(§7 A2): 표기 변형 중복이 아니라 각각 전체 가문 · 영국 분가(영국 1901-1917 DynastyRule 보유) · 벨기에 분가(시드 서술 "1831 레오폴트 1세 즉위로 창설")로 별개 노드가 맞음 — 병합 금지, 오히려 링크 그래프의 1차 시드 케이스**. 일본이 제네릭 명칭 '황실' 선점 문제는 유효 | `dynasty.wives.seed.ts:33`, `person.britain-monarchs.seed.ts:30`, `dynasty.savoy.seed.ts:264-266` |
| 기타 기존 부채: Dynasty CRUD 전 엔드포인트 무인증, DTO class-validator 부재, create P2002 미매핑, 폼에 founderId 피커 없음(founderText만), `Dynasty.startDate`가 era 없는 DATETIME이라 BC 가문 기간 표현 불가 | `dynasty.controller.ts:55-137`, `dynasty-form.tsx:37-47` |

## 2. 역사 테스트 케이스 — 설계가 감당해야 하는 표현력

1. **카페 → 발루아 → 발루아-오를레앙/앙굴렘/부르고뉴**: 다단계 방계, 방계가 본가 왕위를 재계승(루이 12세·프랑수아 1세)
2. **카페 → 부르봉**: 같은 부모에서 형제 분가 여러 개
3. **합스부르크 + 로트링겐 → 합스부르크-로트링겐**: 혼인 결합으로 **부모 가문이 둘** — 단일 parentId 컬럼을 기각시키는 결정적 케이스
4. **작센-코부르크-고타(영국 분가) → 윈저** *(§7 A2 정정)*: 1917-07-17 조지 5세 칙령은 **영국 왕실 분가만** 윈저로 개명 — 독일 본가(1918-11까지)·벨기에 왕가(1920까지 SCG 가명 유지)·불가리아 왕가(현재까지)는 SCG로 존속했다. 따라서 RENAME 엣지는 전체 가문 행이 아니라 **영국 분가 엔티티**('작센코부르크고타 왕가' 시드 행이 사실상 그것)에 붙는다. 진짜 전(全)가문 개명 전례는 작센-코부르크-**잘펠트** → 작센-코부르크-고타(1826)로 양쪽 노드가 시드에 실존. **주의**: 1826 개명의 부착 노드는 **전체 가문 행**('작센-코부르크-고타 가문')이고 1917 개명의 주체는 **영국 분가 행**이므로, 잘펠트에서 윈저까지의 경로는 RENAME→CADET→RENAME **혼합 경로**다 — 순수 RENAME 다단 체인이 현행 데이터에 있는 것은 아니며, 체인(다단 개명) 시맨틱은 향후 대비 방어 규칙으로 §4.3에 정의
5. **김해 김씨 → 삼현파/경파**: 한국 본관-파 체계, 분파 수십 개·깊이 2~3
6. **고려 왕씨 → 조선 이씨**: 왕조 **교체**는 혈통 파생이 아님 — 가문 엣지로 오염 금지(`DynastyRule` 영역)
7. **후지와라 → 고노에·구조 등 고셋케**: 분가 시조(cadet founder)가 명확한 케이스

## 3. 설계 대안 비교 (독립 설계 3안)

| | 1안: 인접리스트 (parent + coParent 듀얼 포인터) | 2안: DynastyLink 엣지 테이블 | 3안: 무변경 우선 + 게이트 후 엣지 테이블 |
|---|---|---|---|
| 형태 | Dynasty에 FK 2개 + branchType/Era/Year/Note 컬럼 | 별도 `dynasty_link` 테이블(linkType·매개인물 FK·BC-safe 분기시점) | Phase 0: 스키마 0건, Phase 1: `dynasty_derivation` M:N |
| 케이스 3(부모 둘) | coParent 확장으로 조건부 통과 — '2번째 부모=혼인결합 전용'이라는 이중 의미를 한 컬럼에 부담 | **자연 커버** — 같은 child로 엣지 2개, 부모별 매개 인물(마리아 테레지아/프란츠 1세) 분리 기록 가능 | Phase 1 테이블이 2안과 사실상 동일 |
| 케이스 4(개명) | RENAME enum으로 커버 | RENAMED + child당 1개 앱 검증 | RENAME — Phase 0에서는 영원히 표현 불가(혈통 유도 불가) |
| 판정 | 조건부 — 최소 비용이지만 표현력 상한이 낮음 | 조건부 — 표시 지면을 같은 배치에 넣는 것이 조건 | 조건부 — "지금은 만들지 말라", 선행 부채 5건 먼저 |

세 안 모두에서 수렴한 공통 결론:

- **Person.dynastyId는 단일 FK 유지, 항상 가장 구체적인(leaf) 가문을 가리킴** — 인물 **DB 컬럼** 무접촉 *(§7 A7 정정: "인물 스키마 무접촉"은 부정확 — named relation 반대편 필드 1개가 person.prisma에 필요, §4.1)*
- **롤업은 저장이 아니라 조회 시점 폐포(closure)**: `GET /persons/by-dynasty/:id?includeBranches=true` 옵트인 — 기본값이 현행 정확일치라 회귀 0. 가문 수십 규모라 재귀 CTE 없이 Prisma BFS로 충분
- **순환 가드는 앱 레벨**: 가계도 배치1에서 이미 구현한 자기부모/순환 서버 가드 패턴을 그대로 이식 (자기참조 400·상향 BFS·visited Set·깊이 캡)
- **자동 백필 금지**: 이름의 하이픈은 분가 마커가 아니다('작센-코부르크-고타' 자체가 한 이름) — 시드에 명시 목록으로만 연결
- **분기 시점은 `Era? + Int?` 규약**(DynastyRule 전례) — `Dynasty.startDate`의 DATETIME BC 불가 문제를 답습하지 않음

## 4. 권고안

### 4.1 표준 스키마 (Phase 1에서 추가)

```prisma
// libs/db/prisma/dynasty.prisma — DB 컬럼은 additive·기존 컬럼 무접촉.
// 단 Prisma named relation 검증 때문에 수정 파일은 2개: dynasty.prisma + person.prisma (하단 back-relation).
// 머지 산출물(apps/api/prisma/schema.prisma)이 아니라 소스 파일을 고칠 것 — CLAUDE.md 상시 함정. (§7 A7)

/// 가문 파생 엣지 유형.
/// 왕조 '교체'(고려→조선)는 혈통 파생이 아니므로 값을 두지 않는다 — DynastyRule의 영역.
enum DynastyLinkType {
  CADET_BRANCH    /// 방계 분가 (카페→발루아, 발루아→발루아-오를레앙, 고셋케, SCG→벨기에 왕가)
  MARRIAGE_UNION  /// 혼인 결합 신설 (합스부르크+로트링겐) — child에 부모 엣지 2개
  RENAME          /// 동일 가문 개명 (SCG 영국 분가→윈저) — child당 1개 & parent당 1개(1:1 연속체), 다단 체인 허용(방어적 — 현행 데이터의 RENAME은 전부 1단, §2 케이스 4 주의 참조)
  CLAN_SUBLINEAGE /// 본관-분파 (김해 김씨→삼현파) — CADET와 시맨틱 구분
}

model DynastyLink {
  id              String  @id @default(uuid()) @db.Char(36)
  parentDynastyId String  @map("parent_dynasty_id") @db.Char(36)
  childDynastyId  String  @map("child_dynasty_id") @db.Char(36)
  linkType        DynastyLinkType @default(CADET_BRANCH) @map("link_type")
  /// 이 부모 쪽에서 파생을 매개한 인물 — 엣지별로 다름(합스부르크 쪽=마리아 테레지아, 로트링겐 쪽=프란츠 1세)
  branchPersonId  String? @map("branch_person_id") @db.Char(36)
  /// 분기/개명/결합 시점 — BC-safe (DynastyRule 규약)
  splitEra        Era?    @map("split_era")
  splitYear       Int?    @map("split_year")
  note            String? @db.VarChar(500)

  /// 계보 엣지는 '생존 노드에 대한 정보' — 허브 가문(카페) 삭제로 발루아·부르봉이 형제 분가였다는
  /// 사실까지 조용히 소실되면 안 되므로 Cascade가 아닌 Restrict. (§7 A1)
  /// 삭제는 서비스 선행검사(링크 존재 시 409 + 안내)로 명시적 unlink를 강제.
  /// PersonSpouse류 엣지의 Cascade 관례는 계정 종속 자기 데이터라 전역 공유 정본인 Dynasty와 성격이 다르고,
  /// §1의 '가문 삭제 시 서수 고아' 진단과도 이 선택이 일관.
  parentDynasty Dynasty @relation("DynastyLinkParent", fields: [parentDynastyId], references: [id], onDelete: Restrict)
  childDynasty  Dynasty @relation("DynastyLinkChild", fields: [childDynastyId], references: [id], onDelete: Restrict)
  branchPerson  Person? @relation("DynastyLinkBranchPerson", fields: [branchPersonId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([parentDynastyId, childDynastyId], name: "uq_dynasty_link_pair")
  @@index([childDynastyId], name: "idx_dynasty_link_child")
  @@map("dynasty_link")
}

// ─── named relation 반대편(back-relation) 필드 — 이것 없이는 prisma validate 불통과 (§7 A7) ───
// dynasty.prisma Dynasty 관계 블록(persons·historicalCountryRules 옆)에 추가:
//   linksAsParent DynastyLink[] @relation("DynastyLinkParent")
//   linksAsChild  DynastyLink[] @relation("DynastyLinkChild")
// person.prisma Person 관계 블록(foundedDynasties 옆)에 추가:
//   dynastyLinksAsBranchPerson DynastyLink[] @relation("DynastyLinkBranchPerson")
// (Era enum은 historical.prisma 정의를 dynasty.prisma가 이미 크로스파일 사용 중 — 문제없음)
```

1안(듀얼 포인터)이 아닌 엣지 테이블을 표준으로 삼는 이유: 케이스 3에서 부모별 매개 인물을 기록할 곳이 엣지에만 있고, coParent의 이중 의미(2번째 부모 = 혼인결합 전용)라는 스키마 스멜이 없으며, 향후 MERGED_INTO 등 additive enum 확장이 열려 있다. 비용 차이는 마이그레이션 1건 대 1건으로 동일하다.

서버 가드(같은 PR 필수): 자기링크 400 · 상향 BFS 순환 400(가계도 배치1 `assertNoParentCycle` 이식 — RENAME 왕복 A→B→A도 이 가드가 차단) · RENAME child당 1개 **및 parent당 1개**(1:1 연속체 — 한 가문이 두 가문으로 동시 '개명'하는 모순 입력 차단, §7 A8) · 양쪽 존재검증 · P2002→409 · **가문 delete에 링크 존재 선행검사**(선행검사가 없으면 Restrict 위반 P2003이 글로벌 필터의 제네릭 400 "Invalid reference to related record"로 떨어져 사용자가 링크가 막고 있다는 원인을 알 수 없음 — company.service `mapWriteError`의 P2003→409 전례대로 409 + "분가 연결을 먼저 해제하세요"). **신규 write 엔드포인트에는 JWT 가드** — 무인증 표면을 늘리지 않는다.

**페이로드 검증(§7 A5, 빠지기 쉬운 함정)**: 이 도메인 기존 DTO는 전부 plain interface라 런타임 metatype이 Object로 소거되어 `GlobalValidationPipe.toValidate()`가 검증을 통째로 스킵한다(`dynasty/presentation/dto/index.ts`, `shared/pipes/validation.pipe.ts:35-38`). 신규 DTO를 관례대로 interface로 만들면 linkType 오타 문자열·splitYear 비정수·note 500자 초과가 무검증 통과 후 Prisma 레이어에서 터지는데, `PrismaClientValidationError`(enum 불일치)·P2000(길이 초과)은 글로벌 필터 매핑(P2002/P2025/P2003/P2004)에 없어 500으로 떨어진다. **DynastyLink DTO는 class + class-validator 데코레이터**가 배치 1 수용 기준.

**가드 테스트(§7 A15, 수용 기준)**: 순환 BFS·RENAME 1:1·MARRIAGE_UNION 이중 부모 허용·자기링크 거부를 순수 함수로 추출해 spec 동반 — apps/api의 유일한 테스트 전례(`gamification/domain/point.policy.spec.ts` 순수 policy spec)와 같은 형태이고, §2 역사 케이스 7건이 그대로 픽스처다(카페→발루아 다단계 통과·합스부르크+로트링겐 이중 부모 허용·고려→조선 표현 불가 확인). 이식 원본 `assertNoParentCycle`(person.service.ts) 자체도 spec이 없으므로 이식하면서 함께 커버.

### 4.2 서수 준거 핀 (분가 그래프와 독립, 즉시 가치)

`SovereignReign.dynastyOrdinal`이 Dynasty FK 없는 자유 정수라, 인물의 가문이 분가로 재배정되면 "어느 가문 기준 몇 대"인지가 조용히 바뀌고, 가문 삭제 시 서수가 고아로 잔존한다. 루이 12세(소속: 발루아-오를레앙, 표기: 발루아 계보 통산)가 정확히 이 케이스다.

```prisma
// government.prisma SovereignReign에 추가 — 맨 Char(36)가 아니라 정식 relation. (§7 A6)
// relation이 없으면 ① 가문 삭제 시 dangling ID로 §1이 진단한 '서수 고아'를 준거 핀에서 재생산하고
// (폴백 표시라 dangling이어도 조용히 넘어가 오류가 안 보임) ② include 대상이 없어 아래 표시 처방
// (ordinalDynasty?.name) 자체가 성립 불가. 같은 모델의 country·historicalCountry·positionDefinition
// 참조가 전부 relation + SetNull 관례.
  /// 서수의 준거 왕조 (미지정 시 Person.dynastyId로 폴백 — 기존 시맨틱 보존)
  ordinalDynastyId String?  @map("ordinal_dynasty_id") @db.Char(36)
  ordinalDynasty   Dynasty? @relation("SovereignReignOrdinalDynasty", fields: [ordinalDynastyId], references: [id], onDelete: SetNull)
  // + @@index([ordinalDynastyId])
  // + dynasty.prisma Dynasty에 back-relation: ordinalPinnedReigns SovereignReign[] @relation("SovereignReignOrdinalDynasty")
```

표시는 `ordinalDynasty?.name ?? person.dynasty?.name ?? '왕조'` 우선순위. 단 **전체 범위는 '한 줄 수정'이 아니다(§7 A3)**: 플럼빙이 최소 7파일(create-career DTO → person.prisma.repository 저장 2곳·select 3곳 → person-career 래퍼 → government-position normalize/types → tenure-reign-list 표시)이고, `dynastyOrdinal` 저작 진입점이 이미 3곳(tenure-register-panel · sovereign-reign-register-panel · register-monarch-modal)이다. **준거 왕조 저작 경로 없이 컬럼만 추가하면 이 문서가 배치 0의 존재 이유로 삼은 write-only 전례를 배치 2가 그대로 반복**하므로, 서수 입력란이 있는 3곳에 '준거 왕조' 옵셔널 피커(서수 입력 시에만 노출)를 동반하는 것이 수용 기준.

마이그레이션 경로 **정정(§7 A4)**: ~~미커밋 마이그레이션 `20260701044247`에 합류~~ — 게이트는 커밋 여부가 아니라 **적용 여부**다. 해당 마이그레이션은 커밋만 안 됐을 뿐 로컬 dev DB에 이미 적용된 상태(`_prisma_migrations.finished_at` 확인, `dynasty_ordinal`을 tenure-reign-list가 이미 렌더 중). 적용된 SQL을 편집하면 체크섬 불일치로 migrate dev가 DB 리셋을 요구하고(이 리포가 이미 겪고 `migrations/repair-checksum.sql`을 남긴 사고), 체크섬을 수동 복구해도 추가된 ALTER는 로컬에서 영영 실행되지 않아 컬럼이 조용히 누락된다. **`run-migrate.ts` 경유 별도 additive 마이그레이션이 유일하게 안전한 경로**(1컬럼이라 비용 동일).

### 4.3 롤업 시맨틱

- 기본: 현행 정확일치(회귀 0). `includeBranches=true` 옵트인 시:
  - **RENAME은 identity 엣지(§7 A8)** — 양방향·전이로 묶어 하나의 '동일가문 그룹'으로 취급. 전이는 향후 다단 개명 대비 **방어 불변식**이다: 현행 데이터의 RENAME 그룹은 전부 1단(잘펠트→전체 가문 1826, 영국 분가→윈저 1917[윈저 행 신설 시])이고, 잘펠트→윈저 전체 경로는 RENAME→CADET→RENAME 혼합이라(§2 케이스 4) 아래 직교 원칙상 전이 그룹핑이 이 경로를 통과하지 않는다. 그룹 내 어느 이름에 붙은 CADET/CLAN 하위든 그룹 폐포에 포함. 단 케이스 4 정정(§2)에 따라 윈저의 RENAME 상대는 SCG **영국 분가** 엔티티이므로, 벨기에·불가리아 분가(SCG 전체 가문의 CADET 자식)가 윈저 폐포에 딸려 오지 않는다 — RENAME 그룹핑은 CADET/CLAN의 하향 단방향 원칙과 직교.
  - CADET/CLAN은 하향 단방향, MARRIAGE_UNION 하위 인물은 부모 양쪽 롤업에 등장(표시 전용 — 집계·리더보드에 쓰면 이중집계 함정).
- **계정 경계(§7 A16, 결정)**: Dynasty는 accountId 없는 전역 공유 테이블이지만 Person은 계정 종속이고, person 도메인 조회는 전부 actor 계정 필터가 관례(findAll·findById). 그런데 롤업 기반인 `GET /persons/by-dynasty`는 JWT만 있고 **계정 필터가 없어 모든 계정의 인물 풀 DTO를 반환**한다(`person-by-dynasty.controller.ts` → repository `where:{dynastyId}`만). 가문 상세 페이지가 이 엔드포인트를 1차 항해 지면으로 승격시키므로 방치하면 계정 게이팅 우회 + 멤버 카드 클릭 시 owner-gated findById 404(가계도 배치1이 isOwned 게이팅으로 풀었던 바로 그 문제)가 재발한다. **배치 0-①에서 리포지토리에 actor 계정 필터 추가**가 결정 — 서버에서 걸러야 PII 자체가 응답에 안 실린다(클라이언트 isOwned 게이팅은 차선). 멤버 목록·`branchMemberCount` 전부 계정 스코프. founderId·branchPersonId 피커는 계정 스코프 인물 목록이므로 타 계정 인물 매개는 v1에서 표현 불가(수용, 필요 시 founderText 병용).
- 목록 `memberCount`는 정확일치 유지, 롤업 카운트는 detail에서 `branchMemberCount` 별도 필드(계정 스코프).

## 5. 배치 계획 (레버리지 순)

| 배치 | 내용 | 스키마 |
|---|---|---|
| **0. 선행 부채** | ① 가문 상세 페이지 신설 — detail API는 생성 SDK에 이미 존재(`api/functional/dynasties`), 래퍼 노출만 필요. **진입 동선 인벤토리(§7 A9)**: `pathKeys.dynasty()` detail pathKey 신설 + 콜사이트 일괄 · 목록 행 진입 UI(행 클릭은 인라인 확장 `onToggleExpand`에 이미 배정 — 이름 클릭/별도 액션으로 충돌 회피) · 리치텍스트 멘션·엔티티링크(`data-type="dynasty"`) 클릭 라우팅(최대 유입 지면, 현재 툴팁만) · 유물 칩 `linkedEntityPath` DYNASTY 라우팅(현재 null 반환 비클릭) · 같은가문 섹션 헤더 링크 · 가계도/계보 카드의 가문 배지(NodeDynasty — 현재 onClick 없는 styled.div)는 카드 자체 클릭과의 이벤트 충돌 검토가 필요해 **배치 3으로 명시 이관**. **`GET /persons/by-dynasty` actor 계정 필터(§4.3)** ② 폼 founderId 인물 피커(현재 founderText만) ③ create P2002→409 ④ Dynasty CRUD AuthGuard ⑤ **중복 병합 — 재정의(§7 A2·A10·A14)**: SCG 3행은 병합 금지(별개 노드, 그래프 1차 시드 케이스). **현재 확정 병합 대상 0건** — 남은 이름 변형 후보(예: '헤센 가문 (헤센-다름슈타트)' vs '헤센-다름슈타트 대공 가문')는 구현 시 A2 기준(별개 통치 실체인가, 아니면 같은 실체의 표기 변형인가)으로 ~56개 가문명을 재감사해 판정 — 판정 결과 진짜 중복만 병합하되 **repoint 체크리스트 5종 필수** — Person.dynastyId(SetNull이라 삭제 시 조용히 소속 소실)·DynastyRule/ModernRule·attachment(ownerType=DYNASTY)·유물 링크·리치텍스트 본문 임베드 ID(멘션 data-id — 404를 catch가 삼켜 무증상 파손) + **시드 이름 리터럴 동기 수정**(시드는 이름 find-or-create라 안 고치면 재실행 시 삭제 행 부활) | 0건 |
| **1. 분가 엣지** | `DynastyLink` 테이블 + 서버 가드·DTO class 검증·가드 spec(§4.1) + 저작 UI(가문 수정 모달 '가문 관계' 섹션: 본가 InlineSearchSelect·유형·분기연도 Era+Year·매개인물 PersonSelectModal) + **표시(가문 상세 '본가↑/분가↓' 계보 블록)를 같은 배치로** + **nestia SDK 재생성(§7 A12)** — `npm run build:nestia`는 noop, main() 직접 호출/수동 실행 우회 필수 + **`invalidateDynastyQueries` 중앙 헬퍼(§7 A13)** — 링크 1건이 `['dynasties']` 목록·부모/자식 `['dynasty', id]` 양쪽·`['persons-by-dynasty']` prefix·(배치 3 이후) family-tree dynastyGroups를 동시에 stale로 만듦. invalidateTenureQueries 전례를 따르고 개별 invalidateQueries 금지, "저장 직후 양쪽 가문 화면 갱신"이 수용 기준 + **알림 emit(§7 A17, 결정)** — 전역 공유 정본 write이므로 person·country 등 8개 도메인 관례대로 전역 피드 편입. **포인트 원장은 의도적 무편입** — 공유 정본 편집에 계정별 점수를 붙이면 어뷰징 표면이 생김. "링크가 화면에 보인다"가 수용 기준 | 1건 (additive) |
| **2. 서수 핀** | `ordinalDynastyId` 정식 relation + 인덱스(§4.2) + 플럼빙 7파일 + 저작 피커 3곳(서수 입력 시에만 노출) — **별도 additive 마이그레이션**(기존 마이그레이션 합류 금지, §4.2 정정) | 1컬럼+FK |
| **3. 롤업·시각** | `includeBranches` 옵트인(§4.3 폐포 규칙) → 같은가문 섹션 토글, family-tree `dynastyGroups` optional 메타 → 가계도/계보 페이지 본가 기준 그룹 색 + **가계도/계보 카드 NodeDynasty 배지 → 가문 상세 링크화**(배치 0-①에서 명시 이관 — stopPropagation으로 카드 클릭과 분리). **가문 그룹핑 지면 2곳 추가(§7 A11)**: 대시보드 인포그래픽 '왕조별' 뷰(DynastyView — 가문명 정확일치 그룹핑이라 family-tree만 바꾸면 지면 간 불일치)와 국가 상세 heads-of-state/lineage-tree의 가문명 표시(군주 계보를 가문 단위로 시각 구분하는 1순위 수혜처)를 같은 기준으로. **raw fetch 수동 대칭 주의 대상은 2곳(§7 A12)** — family-tree 외에 by-dynasty 래퍼(`person/index.ts` 수동 fetch + `as Person[]` 단언)도 includeBranches 파라미터·branchMemberCount가 컴파일 신호 없이 어긋날 수 있음 | 0건 |
| 시드 | `dynasty.links.seed.ts` — 확실한 케이스만 명시 등록: 부르봉 3분가 · 라이너 분가 · SCG 계열(전체 가문→영국 분가·벨기에 왕가 CADET 2건 + 잘펠트→전체 가문 RENAME — 전부 시드 실존 노드). **영국 분가→윈저 RENAME은 '윈저 왕가' Dynasty 행이 시드에 없어(설명 문자열에만 등장, `name: 윈저` 행 0건) 행 신설이 선행 조건** — 신설 없이 등록하면 아래 throw 규칙에 걸림. 이름 파싱 자동 백필 금지. **이름 해석 miss 시 throw(§7 A14)** — warn-skip이면 병합 후 리터럴 불일치가 조용히 삼켜지거나 부활한 중복 노드에 링크가 붙음 | — |

## 6. 명시적 스코프 아웃

- **인물 복수 가문 소속**(외가·양자 입적·개창 전후 이동): `PersonDynastyMembership` 조인 테이블 문제로, 가문-가문 엣지와 직교. 소비 화면이 생기기 전까지 보류.
- **name 전역 @unique·동명 가문**(일본 '황실' 선점): 별칭(alias) 테이블 또는 병합 도구의 별도 과제. 단 배치 0-⑤(진짜 중복만 병합 + repoint 체크리스트)는 엣지를 중복 노드 위에 그리지 않기 위한 최소 선행 — SCG 3행은 중복이 아니므로 병합 대상 아님(§7 A2).
- **`Dynasty.startDate` BC 불가**: 가문 자체 존속기간의 Era 구조화는 별도 과제(분기 시점은 엣지의 Era+Int로 이미 BC-safe).
- **왕조 교체 표현**: `DynastyRule`이 정본 — 다만 이 테이블 자체의 저작 API·렌더 화면이 없다는 것은 별도 부채.

## 7. 보완 검토 (2026-07-02 완전성 감사)

방법: 6관점 병렬 수색(스키마 표현력·코드베이스 통합·역사 케이스·롤아웃 공학·UX/표시·문서 사실검증) → 중복 병합 → 후보별 3렌즈 적대검증(문서 커버리지·사실성·중대성 — 각 렌즈가 반박을 시도, 2/3 이상 생존만 확정) → 완전성 비평 1라운드. **후보 38건 → 확정 17건, 기각 18건.** 확정 전건을 위 본문에 반영 완료.

### 7.1 확정 17건 → 반영 위치

| # | 심각도 | 발견 | 반영 |
|---|---|---|---|
| A1 | high | DynastyLink 양측 `onDelete: Cascade` 미검토 — 허브 가문 삭제 시 생존 분가들의 계보 이력 무경고 소실 | §4.1 Restrict + delete 선행검사 가드 |
| A2 | high | 케이스 4는 전가문 개명이 아닌 '영국 분가의 개명' — 0-⑤ 병합 목록과 상호 모순(병합+RENAME이면 벨기에·불가리아 왕가가 윈저 연속체로 오접힘) | §1 표 · §2 케이스 4 · §5 배치 0-⑤ 정정 |
| A3 | high | 배치 2에 저작 경로 부재 — 문서 자신의 write-only 기준 위반, '한 줄'이 아니라 7파일 플럼빙 + 저작 진입점 3곳 | §4.2 범위 정정 |
| A4 | high | '미커밋 마이그레이션 합류' 권고가 체크섬 드리프트 유발 — 게이트는 커밋이 아니라 적용 여부, 해당 마이그레이션은 로컬 DB 적용 완료 | §4.2 권고 철회 → 별도 마이그레이션 |
| A5 | high | 이 도메인 DTO는 전부 plain interface라 GlobalValidationPipe가 검증을 통째로 스킵 — Prisma 에러도 미매핑이라 500 | §4.1 DTO class + class-validator 수용 기준 |
| A6 | medium | `ordinalDynastyId`가 relation 없는 맨 Char(36) — '서수 고아' 결함 재생산 + 표시 처방(`ordinalDynasty?.name`)과 내적 모순 | §4.2 스니펫 정정(relation + SetNull + 인덱스) |
| A7 | medium | 4.1 스니펫 back-relation 누락으로 `prisma validate` 불통과 — '인물 스키마 무접촉' 주장 부정확 | §3 · §4.1 back-relation 명시 |
| A8 | medium | RENAME 체인 폐포 방향·전이·parent측 제약 미정의 — 개명 실데이터(잘펠트→전체 가문 1826, 영국 분가→윈저 1917)가 규칙 정의를 요구(단 순수 다단 체인은 아님 — §2 정정, 전이는 방어 불변식) | §4.1 parent당 1개 제약 · §4.3 identity 그룹 규칙 |
| A9 | medium | 상세 페이지 진입 동선 인벤토리 누락 — 리치텍스트 멘션/엔티티링크·유물 칩·목록 행·가계도 배지 전부 미설계 dead-end | §5 배치 0-① (가계도 배지는 이벤트 충돌 검토를 위해 배치 3으로 명시 이관) |
| A10 | medium | 0-⑤ 병합에 repoint 대상 인벤토리 없음 — 리치텍스트 임베드 ID가 무증상 고아화 | §5 배치 0-⑤ 체크리스트 5종 |
| A11 | medium | 배치 3 그룹핑 지면 2곳 누락 — 대시보드 '왕조별' 뷰(DynastyView)·국가 상세 계보도 가문명 | §5 배치 3 |
| A12 | medium | nestia SDK 재생성 단계 누락(build:nestia noop) + raw fetch 대칭 대상이 1곳 아닌 2곳(by-dynasty 래퍼 포함) | §5 배치 1·3 |
| A13 | medium | 링크 mutation의 react-query 캐시 무효화 설계 전무 — 최소 4계열 쿼리키 stale | §5 배치 1 `invalidateDynastyQueries` |
| A14 | medium | 수동 병합이 시드 find-or-create와 충돌 — 재실행 시 삭제 행이 옛 이름으로 부활 | §5 배치 0-⑤ 시드 리터럴 동기 · 시드 miss 시 throw |
| A15 | low | 테스트 전략 부재 — 가드가 유일한 테스트 전례(순수 policy spec)에 부합, §2 케이스 7건이 그대로 픽스처 | §4.1 가드 테스트 수용 기준 |
| A16 | high | 계정 경계(멀티테넌시) 시맨틱 무언급 — `GET /persons/by-dynasty`가 계정 무필터로 타 계정 인물 풀 DTO 반환, 상세 페이지 승격 시 게이팅 우회·클릭 404 재발 | §4.3 계정 경계 결정(서버 필터) · §5 배치 0-① |
| A17 | low | 알림 피드·포인트 원장 편입 여부 미결정 — 유사 공유 도메인 8곳은 전부 notify, dynasty만 0건 | §5 배치 1 결정(알림 편입 · 포인트 의도적 무편입) |

### 7.2 기각 18건 중 참고 가치가 있는 것

- **'분열 후 직계(본가) 지위를 어느 분가가 승계했는가' 마커 부재**(플랜태저넷→랭커스터/요크, 남북조): 왕위·통치의 승계는 `SovereignReign`·`DynastyRule`이 정본이라는 본문 논리에 흡수되어 기각 — 가문 엣지에 '정통성' 축을 넣지 않는 것이 §2 케이스 6(교체 배제)과 일관. 다만 표시 지면에서 "본가 단절 후 누가 이었나"는 통치기록 데이터로 답해야 함을 구현 시 유의.
- **재합류(merge-back)·동명 라인 분열**(합스부르크 스페인계/오스트리아계 — 새 이름 없는 라인 분열): 표현력 상한의 실재하는 한계지만 v1 스코프에서 additive enum 확장 여지(MERGED_INTO 등)로 수용 가능 판정. `@@unique(parent,child)`가 같은 쌍의 이질 링크 2개를 막는다는 지적은 그 확장 시점에 재평가.
- **저작 UI 저장 모델(행별 즉시 저장 vs delete-recreate diff)·빈 상태·a11y·형제 분가 정렬 축**: 구현 중 흡수 가능한 수준으로 판정(중대성 렌즈 기각) — 구현 체크리스트로만 참고.
- **A1(Cascade) 반대 의견 기록**: 중대성 렌즈는 "PersonSpouse류 엣지 테이블은 양측 Cascade가 리포 관례이고 Restrict 전환은 두 줄 수정"이라며 기각표(2/3 통과) — Restrict 채택 시 이 반론(관례 비대칭)을 인지하고 갈 것.

전체 판정 로그(후보 38건 원문·렌즈별 반박 사유)는 감사 워크플로 산출물에 보존.
