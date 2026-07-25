# 사건 다중 상위(여러 부모) 지원 검토 — 주 상위 존치형 `EventParentLink` 설계

> **검토 주제**: 하나의 사건이 여러 상위 사건을 가질 수 있게 한다. 예: '얄타 회담'이 '제2차 세계대전'과 '냉전의 서막' 둘 다의 하위.
> **방법**: 6면 판독(DB 스키마·API 쓰기·API 읽기/DTO·상세 UI·목록/트리·기타 소비처)으로 단일부모 전제 약 125건 수집 → 설계안 3개 작성 → 3렌즈(무결성·UX·비용) 교차 심사 → 당선안에 적대 검증 7관점(전원 NEEDS_CHANGES: P1 3계열·P2 9건·P3 다수) → 검증 수정을 병합한 최종 설계 확정. 검증 이슈는 **전건** 본문 반영 또는 배치 계획에 배치했고, §6.4 반영 대장으로 추적 가능하다.
> **상태**: 검토만 — 코드 변경 0. 작성일 2026-07-24.

---

## 1. 요약

**채택: 안A — 주 상위 존치형 다중 상위.** 기존 `parentEventId` FK를 '주(primary) 상위'로 그대로 두고, 추가 상위는 신설 조인테이블 `event_parent_link`에만 담는다. 트리·breadcrumb·형제 네비·루트 판정·댓글 게이트·카운트는 전부 주 상위 기준 **0변경**(회귀 0 지향)이며, 추가 상위는 상세 지면의 칩 행으로 노출·편집한다. 서버 불변식 "추가 상위는 주 상위가 있을 때만, 주 상위와 중복 금지"가 `parentEventId IS NULL ⇔ 부모 전무` 계약을 보존해 raw SQL(`event.controller.ts:739`)을 포함한 루트 판정 5곳이 무수정 생존한다.

핵심 트레이드오프 3줄:

1. **회귀 반경 최소 vs 발견성 부채** — 목록/트리/카운트 지면 0변경(백필 0·additive 마이그 1회·롤백=DROP TABLE)을 얻는 대신, 카탈로그 트리와 검색에서 '얄타'는 주 계보(WWII) 아래에만 보인다. 발견은 상세의 양방향 칩 + breadcrumb '+N' 배지로 우회하고, 트리 행 배지는 배치4(PD3)로 미룬다.
2. **불변식이 앱 레이어 전용** — DB가 "extras는 주 상위 필수"를 표현하지 못하므로, 이 하중벽을 3중 방어(전 쓰기 경로 가드 §4.2 + 하드삭제 트랜잭션 §4.6 + 감사 헬스체크·응답 격리 §4.8)로 지탱한다. 적대 검증이 찾은 우회로(childEventIds detach/attach·완전삭제·유령 주 상위)는 전부 §4.2·§4.5·§4.6에 봉합했다.
3. **주/부 비대칭은 의도** — 두 상위는 대등하지 않다(대표 경로=주 상위). '대표로 승격' swap patch로 격 전환이 가능하며, 훗날 대등한 DAG 정본화가 정말 필요해지면 이 엣지 테이블 위에서 안B식 이관 경로가 열려 있다(§7 부록).

적대 검증으로 원안에서 달라진 주요 결정: **fail-open 순환 캡 → fail-closed 409**, **`sortOrder`·`note` 컬럼 v1 제외**, **childEventIds detach 409·attach 자동 collapse 신설(P1 봉합)**, **`permanentlyDeleteEvent` 트랜잭션 승격 처리 필수화(P1)**, **LISTING_FIELDS에 신규 키 추가(원안 '무변경' 번복)**, **유령 주 상위 시 신규 extras 409 + 승격 강등은 생존 객체 기준**, **해제 버튼 가로채기 다이얼로그**.

---

## 2. 현행 구조와 단일부모 전제 지점

현행: `libs/db/prisma/event.prisma`의 `Event.parentEventId`(단일 nullable FK, `event.prisma:286`) + self-relation `"ParentChildEvent"`(`parentEvent` 단수 / `childEvents` 복수, `:296-297`)로 구현된 순수 트리. DB FK는 `ON DELETE SET NULL ON UPDATE CASCADE`(`20260106192301_init/migration.sql:2101`), 소프트삭제는 Event 본체에만 있고 이벤트 도메인 조인테이블(PersonEvent·EventRelation 등)은 전부 deletedAt 없음+Cascade 관례다.

전 구간을 관통하는 **핵심 4전제**: ① 부모 = 단일 스칼라 FK ② 최상위 = `parentEventId IS NULL` ③ 조상 경로 유일(선형 체인) ④ 트리 출현 = 사건 id로 유일(React key·펼침 상태·카운트가 id 기반).

6면 판독에서 수집한 단일부모 전제(총 ~125건) 중 하중이 큰 지점:

### 2.1 DB 스키마·마이그레이션

| 지점 | 내용 | 다중 상위 시 파급 |
|---|---|---|
| `event.prisma:286` | `parentEventId String?` 단일 FK 컬럼 | 다중 부모의 근본 차단 지점 — 본 설계는 '주 상위'로 존치 |
| `event.prisma:296-297` | `parentEvent` 단수 / `childEvents` 배열, onDelete 미명시(암묵 SetNull) | 생성 클라이언트 타입이 단수 — 존치로 파급 0. SetNull은 §4.6 하드삭제 구멍의 원천이라 명시 문서화 |
| `init/migration.sql:2101` | 실물 FK `ON DELETE SET NULL` | 완전삭제 시 자식 FK 무통보 NULL — 잔존 엣지와 조합되면 불변식 파괴(§4.6에서 봉합) |
| `event.prisma:367-368` | 명시 인덱스는 createdBy·deletedAt뿐 — 부모 조회는 InnoDB 암묵 FK 인덱스 의존 | 신설 테이블은 명시 인덱스 선언(§4.1) |
| `event.prisma:16, 29-32` | 도메인 헤더가 단일 계보 트리 서사 | DAG 도입 명시로 갱신 대상 |
| `event.prisma:225, 228-229` | `EventCategory.parentId` 동형 트리 | 의도적 비대칭(카테고리=트리 유지) 주석 필요 |
| `organization.prisma:356-386` / `event.prisma:585-610` | 다대다 선례 OrganizationHierarchy(`@@unique([parent,child])`)·도메인 내 선례 EventRelation(양측 Cascade·명시 인덱스) | 신설 테이블의 네이밍·인덱스·Cascade 관례 원천 |

### 2.2 API 쓰기 경로

| 지점 | 내용 | 파급 |
|---|---|---|
| `event.service.ts:596-626` | 순환검출이 단일 커서 부모 체인 워크(3상 `effectiveParentId` 시작, childSet 치환 `:609`, 체인 절단 `:620`, 노드당 findUnique N+1 `:614`, visited>100 캡 `:607`) | 다중 부모에선 한 경로만 검사 — 타 부모 엣지 경유 순환 미탐. §4.4 오버레이 BFS로 전면 교체 |
| `event.service.ts:119-126, 631-658` | create 가드는 순환 워크 생략('새 사건은 순환 불가' 전제) | `parentEventId=P + childEventIds=[C]`에서 P가 C의 자손이면 생성 즉시 순환 — 현행 잠복 구멍. §4.4로 자연 봉합 |
| `event.service.ts:500-513` | detach=`updateMany(parentEventId:id, deletedAt:null → null)`, relink=FK 덮어쓰기 강탈 | 이 두 연산이 신설 불변식의 우회로(적대 검증 P1) — §4.2 규칙 3으로 봉합 |
| `event.service.ts:280-287` / `:520` | create는 비트랜잭션 Promise.all, update는 자식 tx와 본체 쓰기 분리(비원자) | extras diff와 함께 단일 $transaction으로 수렴(§4.2) |
| `event.service.ts:584` | 소프트삭제 예외 판정이 자식의 단일 FK 비교 | 엣지 존재 검사로 치환(§4.5) |
| `event.service.ts:746-764` | `permanentlyDeleteEvent` — 실사용 하드삭제 경로(라우트 `:1246-1254`) | SetNull과 조합 시 불변식 DB 레벨 파괴 — §4.6 신설 |
| `create/update-event.dto.ts:86`, `update:261` | `parentEventId?: string`(update는 null이 @IsOptional로 밀입국하는 3상) · `childEventIds?: string[]` 전체목록 덮어쓰기 | 기존 계약 무변경 + `extraParentEventIds` additive(§4.9) |

### 2.3 API 읽기 경로·DTO

| 지점 | 내용 | 파급 |
|---|---|---|
| `event.response.ts:52-59` / `event.controller.ts:207-215` | `parentEventId`·`parentEvent`(단수 재귀)·`childEvents` + 유령부모 응답 게이트(`:211-214`) | 단수 필드 존치, `extraParents/extraChildren` additive. 게이트 정책 승계(§4.5) |
| `event.controller.ts:844-852` | breadcrumb용 parentEvent 4단 중첩 include(선형 체인 전제) | 주 상위 유일 경로라 무변경 — extras는 평면 1단만(k^4 팽창 원천 차단) |
| `event.controller.ts:438·609·950` + `comment.service.ts:146` | 루트 판정 `parentEventId: null` 4곳 | **의도적 0변경** — 불변식 INV-2가 보장 |
| `event.controller.ts:739` | on-this-day raw SQL `parent_event_id IS NULL` — 컴파일러·camelCase grep 모두 못 잡는 유일 지점 | 0변경 + 불변식 의존 주석 필수(§7 리스크) |
| `event.controller.ts:679-701` / `event.response.ts:343-347` | link-candidates 후보당 부모 0..1 단수 쌍(`liveParent` 게이트) | `extraParents` 배열 additive + 동일 소프트삭제 게이트(§4.9) |
| `event.prisma.repository.ts:63` / `event.entity.ts:23` | `findByParentEventId` 스칼라 동등 비교·엔티티 스칼라 하나 | '주 상위의 자식들' 의미 유지 — 무변경 |
| `event.controller.ts:1089-1090, 1182-1183` | 쓰기 응답=`loadEventDetail` 재조회 — 프론트가 그걸로 다음 PUT 전체목록 재구성하는 왕복 루프 | 응답에 extras 실려야 낙관→정본 교체 성립(§4.10) |

### 2.4 web-admin 사건 상세

| 지점 | 내용 | 파급 |
|---|---|---|
| `use-event-detail.ts:92-94` | `EventDetail.parentEventId/parentEvent(단수 재귀)/childEvents` 정본 타입 | `extraParents/extraChildren` additive |
| `detail-hero.tsx:54-64, 95-97` | 체인 워크 + `PARENT_CHAIN_CAP=3` + '…' | 무변경 + '+N' 배지만 추가(§5) |
| `detail-network.tsx:277-305` | 상위 단일 슬롯 행(지정/변경/해제) | 아래에 '추가 상위' 칩 행 신설 |
| `detail-network.tsx:148-161` | 재부모화 '끊고 옮길까요' confirm(이동 의미론) — 근거는 후보의 단수 `parentEventId/parentEventTitle`(`shared/api/events.ts:184-186`) | 주 트리 의미라 존치 + 대안 경로 안내 문구(§5·PD1) |
| `detail-network.tsx:134-141` | 순환 필터가 직계만 제외(깊은 순환은 서버 409 위임) | 제외 집합을 주+extras로 확장 |
| `detail-network.tsx:196-218` | 형제 = `getEventsByParentId(event.parentEventId)` 단일 쿼리·BC-safe 정렬(`:528-554`) | 무변경(주 상위 기준 확정) |
| `detail-network.tsx:223` | relationSummary `'상위 1'` 하드코딩 | `'상위 1+N'`(유령 시 `'상위 0+N'`) |
| `event-detail.page.tsx:296-309, 219-221` | 댓글 게이트 = `parentEventId` 유무·rail memo deps 스칼라 | 무변경(주 상위 딥링크 유지, PD4) |
| `use-event-mutation.ts:128, 146-157` | 계층 무효화·목록 무효화가 `'parentEventId' in patch` 문자열 게이트 — 컴파일러 사각 | `'extraParentEventIds'` 키를 두 게이트 모두에 추가(§4.10) |
| `use-event-mutation.ts:316-333, 422-431` | 낙관 재구성 '항상 재구성' 규약·`resolveParentEvent`의 prevParent 폴백 | extras 분기 신설 + swap cross-slot 해소(§4.10) |
| `use-undoable-patch.tsx:285-289` | buildInverse가 스칼라/배열 역직렬화 | `extraParentEventIds` case 추가 — swap 원자 복원 |
| `use-event-mutation.spec.ts:20, 63-73` | 단일 부모 계약 고정 스펙(10케이스 실행 PASS 확인) | 기존 무수정 + 신규 3케이스(§6 배치3) |

### 2.5 web-admin 목록·트리 (전부 0변경 확인 지점)

| 지점 | 내용 | 본 설계에서 |
|---|---|---|
| `eventTransformers.ts:40-53, 131` | childMap = FK 역참조+childEvents 직참조 합집합, 평탄 모델에 부모 1개 | extras는 목록 응답에 안 실림 — 무변경 |
| `useEventFilters.ts:98-107, 157-165, 164` | childrenByParent 단수 키·루트 `!parentEventId`·visited 없는 재귀 | 무변경. 단 검색이 주 계보만 워크하는 발견성 부채는 리스크 명기(§7) |
| `useEventHierarchy.ts:22, 100-122, 137-169, 145` | flatten 행당 parentEvent 1개·id 키 펼침·출현 복제 | 무변경(중복 출현 자체가 발생하지 않음) |
| `event-compact-list.tsx:141-152, 301-303, 411-461` / `event-timeline.tsx:528-593, 3087` / `event-grid-view.tsx:73, 90` / `event-dashboard-view.tsx:86, 221` / `events.page.tsx:422-434, 549` / `use-catalog-event-index.ts:39` / `useEvents.ts:5` | 연도버킷·세기카운트·React key·막대·heat·통계·부분로드 배너·내보내기·페이징 전부 id/depth/FK 기반 | **전부 무변경** — dedup by design이라 이중집계 축이 생기지 않음 |

### 2.6 web-admin 폼·기타

| 지점 | 내용 | 파급 |
|---|---|---|
| `event-create.page.refactored.tsx:342, 357, 371` / `event-create-form-dashboard.tsx:697, 812, 828` | 두 제출부 모두 `as Parameters<typeof updateEvent>[1]` 캐스트로 DTO 표류 은폐 + 대시보드 폼만 계층 실편집 | **satisfies 전환을 배치0 선행 조건으로 격상**. v1 폼은 extras 미전송=undefined=유지라 소실 없음 |
| `useRelationshipsForm.ts:17, 62` | 단일 parentEventId state·excludeIds 스칼라 | v1 미개조 안전 — 후속 phase |
| `event-data-builder.ts:141, 208` | `parentEventId: string` 필수·`'' → undefined` 센티널 | 무변경 |
| `shared/api/events.ts:17, 173-187, 275-286` | SDK 파생 타입 + **raw fetch 수동 인터페이스**(getAllEvents·count·link-candidates) | build:nestia만으로 안 됨 — 수동 동기화 필수(§4.9) |
| `validation.pipe.ts:18-22` | `forbidNonWhitelisted: true` | 신 web→구 API는 400 경질 실패 — 배포 순서 제약(§6 배치3 선행조건) |
| `country-detail/mock/history-types.ts:44` 외 | mock의 단수 부모 사본 | 오염원 경고 주석만(배치4) |

---

## 3. 설계안 비교

**안A — 주 상위 존치형**: `parentEventId`(주) 유지 + `EventParentLink`(추가 상위 엣지) 가산. 루트 판정·트리·카운트 0변경, 불변식으로 계약 보존.
**안B — EventHierarchy DAG 정본화**: 조인테이블을 정본으로, `parentEventId`는 '대표부모' 파생 캐시로 강등. 트리는 출현(occurrence) 복제, `@@unique([childEventId, isPrimary])` Boolean? NULL 트릭으로 대표 유일성 DB 강제.
**안C — EventHierarchyLink**: relationType(PART_OF/PHASE_OF/CONTEXT_OF) 있는 엣지 + isPrimary, dual-write 후 컬럼 드롭 2단 전환.

### 3.1 채점표 (3렌즈 × 3안)

| 렌즈 | 안A 주상위존치 | 안B DAG정본화 | 안C 타입엣지 | 렌즈 승자 |
|---|:---:|:---:|:---:|---|
| 데이터 무결성·마이그레이션 안전 | **8** | 7 | 5 | A — 백필 0·롤백=DROP TABLE·'주 상위 최대 1'이 스칼라 FK 표현 자체로 강제 |
| 제품·UX 일관성 | 7 | **8** | 6 | B — 요구('양쪽 트리에 보인다')를 주 지면에서 전달, 뷰별 카디널리티 정책 유일 완결 |
| 구현 비용·회귀 반경 | **9** | 5 | 4 | A — 전제 125건의 절대다수를 '여전히 참'으로 유지 |
| **합계** | **24 (채택)** | 20 | 15 | |

### 3.2 탈락 사유

- **안B**: 같은 사실(주 상위)을 FK와 isPrimary 엣지 두 곳에 영구 저장 — 캐시 드리프트가 신규 1급 고장모드(깨지면 raw SQL 포함 루트 판정 5곳이 무성 오동작)이고 Writer 단일화는 코드리뷰 규율일 뿐 DB가 담보 못 함. ~50파일·6배치·1.5~2주의 전면 개편은 "여러 상위" 요구 하나 대비 과투자. 실패 모드 비대칭이 결정적: A의 최악은 감사 쿼리 한 방에 검출·수리되는 고아 엣지, B의 최악은 조용하고 광범위한 정본-캐시 드리프트.
- **안C**: 'MariaDB partial unique 불가'라며 isPrimary DB 강제를 포기했으나 라이브 테스트로 반증됨(B의 NULL 트릭이 같은 서버에서 성립). relationType은 v1에서 '표시 메타 전용'이라 자백하는 과설계 — 요구에 없는 축을 스키마에 영구화하며 CONTEXT_OF↔EventRelation 경계 혼란을 스스로 생성. 루트 판정 5곳(raw SQL 포함) 원자 교체+후속 컬럼 드롭으로 롤백성 3안 중 최악.

### 3.3 패자 이식(graft) — 최종안에 병합된 것

| # | 출처 | 이식 내용 | 반영 위치 |
|---|---|---|---|
| G1 | B | 순환 캡 fail-closed(초과 시 409) — 원안 A의 fail-open을 번복 | §4.4 |
| G2 | B | 감사 쿼리 상시 헬스체크 격상 + 읽기 시 위반 검출(응답 격리) | §4.8 |
| G3 | B/C | 409 메시지에 검출 경로 사건 제목 최대 3개 동봉 | §4.4 |
| G4 | B | 결정적 승격 규칙(연결 오래된 순 최소 엣지) — 서버 기본 제안 | §4.6·§5.1 |
| G5 | C+B | 백필/시드 방어깊이(자기참조 가드·카운트 대조)를 마이그 주석·시드 문서에 정식 포함 | §4.3 |
| G6 | C | `as Parameters<>` 캐스트 → satisfies 전환을 '권장'에서 배치0 선행 조건으로 격상 | §6 배치0 |
| G7 | C | 피커에서 이미 연결된 후보는 숨김 대신 체크 표시+재클릭 해제 토글 | §5.1 |
| G8 | B | `isRootEvent` 헬퍼 수렴(4곳) — 훗날 정본화 이관 시 단일 교체점 보험 | §6 배치4 |
| G9 | B | `@@unique([childEventId, isPrimary])` Boolean? NULL 트릭 기록 — 후속 승격 개념 DB 강제 수단 | §7 부록 |
| G10 | C | 댓글 자격 상실 대표안(댓글 보유 사건 게이트 예외 / 이관 안내) | PD4 |
| G11 | (A-UX렌즈) | 엣지 note 컬럼 — **적대 검증(V5-2·V7-4)으로 v1 제외로 번복**, 도입 시점은 PD5 | §4.1·PD5 |

---

## 4. 채택 설계 상세 (검증 수정 병합 최종본)

### 4.1 데이터 모델 — `libs/db/prisma/event.prisma`만 수정

`apps/api/prisma/schema.prisma`는 머지 산출물 — 직접 수정 금지, `npm run db:build`로 머지.

```prisma
// ========================
// 사건 추가 상위 링크 (다중 부모 DAG 엣지)
// ========================

/// Event.parentEventId(주 상위)를 보완하는 '추가 상위' 엣지.
/// 불변식(앱 레이어 강제 — §감사 쿼리로 상시 검증):
///  INV-1  주 상위(parentEventId)와 중복되는 엣지 금지
///  INV-2  추가 상위는 주 상위가 있는 사건에만 존재 (루트판정 = parentEventId IS NULL 유지)
///  INV-3  자기참조 금지 (childEventId <> parentEventId)
/// 예: '얄타 회담' — 주 상위 '제2차 세계대전', 추가 상위 '냉전의 서막'
/// EventRelation(무방향 '관련 사건')과 별개 — 이건 방향성 있는 계보 소속.
model EventParentLink {
  /// PK
  id String @id @default(uuid()) @db.Char(36)

  /// 하위 사건 FK
  childEventId String @map("child_event_id") @db.Char(36)

  /// 추가 상위 사건 FK
  parentEventId String @map("parent_event_id") @db.Char(36)

  //--- 관계 필드
  childEvent  Event @relation("EventParentLinkChild", fields: [childEventId], references: [id], onDelete: Cascade)
  parentEvent Event @relation("EventParentLinkParent", fields: [parentEventId], references: [id], onDelete: Cascade)

  //--- 메타데이터 필드
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // childEventId 조회는 @@unique 선두 컬럼이 커버 — 별도 인덱스 의도적 생략
  // (EventRelation의 양측 명시 인덱스 관례와 다른 점: 중복 인덱스 쓰기 비용 회피)
  @@unique([childEventId, parentEventId], name: "uniq_event_parent_link_pair")
  @@index([parentEventId], name: "idx_event_parent_link_parentId")
  @@map("event_parent_link")
}
```

Event 모델에 역방향 관계 2개 additive(기존 `parentEvent`/`childEvents` 그대로):

```prisma
  /// 추가 상위 엣지 (이 사건이 자식인 링크)
  extraParentLinks EventParentLink[] @relation("EventParentLinkChild")
  /// 추가 하위 엣지 (이 사건이 부모인 링크)
  extraChildLinks  EventParentLink[] @relation("EventParentLinkParent")
```

부수 결정:

- **`sortOrder`·`note` 제외(원안 번복)** — 쓰기 채널이 `extraParentEventIds: string[]` delete-recreate diff라 sortOrder는 영원히 0(전원 동률 무정렬), note는 제거→undo 사이클에서 무성 소실되는 구조 충돌(검증 V5-2·V7-4). 칩 정렬 결정성은 `orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]` 2키로 확보. 도입 시점·형태는 PD5.
- `parentEvent` self-relation(`event.prisma:296`)에 `onDelete: SetNull` **명시**(현행 암묵 기본값과 동일 — 생성 SQL 무변경, §4.6 구멍의 원천임을 스키마에 문서화. 검증 V2-1).
- 도메인 헤더 주석(`event.prisma:16, 29-32`)을 "주 상위 트리 + 추가 상위(DAG 엣지)"로 갱신, `EventCategory.parentId`(`:225`)는 의도적 비대칭(트리 유지) 명시.
- relationType enum 없음(부모-자식 단일 의미 — 안C 탈락 사유 참조), deletedAt 없음(이벤트 도메인 조인테이블 관례), 양측 Cascade(EventRelation·OrganizationHierarchy 선례).

### 4.2 불변식 강제 — 쓰기 경로 전수 매트릭스 (적대 검증 P1 봉합의 핵심)

원안의 가드는 '자식 본인 patch'만 커버해 3개 검증(V1·V4·V6)이 동일 P1을 지적했다: **childEventIds(부모 쪽 쓰기)와 완전삭제가 불변식을 우회한다.** 최종 규칙은 계층을 쓰는 6개 경로 전부를 커버한다. 공통 원칙: **effective 값 기준 통일** — 가드가 평가하는 extras는 `제출값 ?? DB의 살아있는-부모 엣지`(제출값·DB값 비대칭 명세 결함 해소, V1-3).

| # | 경로 | 위협 | 확정 규칙 |
|---|---|---|---|
| W1 | `updateEvent` — patch `{extraParentEventIds}` (자식 본인) | 자기참조·주 상위 중복·고아 extras | (a-1) 배열에 자기 자신 또는 effective 주 상위 포함 → **409**(명시적 사용자 오류는 fail-loud). (b) effective 주 상위 null인데 배열 비어있지 않음 → **409**. 유령 주 상위(소프트삭제) 상태에서 '신규' 엣지 추가 → **409**(기존 엣지 재전송은 통과 — §4.5). diff는 `deleteMany({childEventId:id, parentEventId:{notIn:new}, parentEvent:{deletedAt:null}})` + `createMany({skipDuplicates})` |
| W2 | `updateEvent` — patch `{parentEventId}` (자식 본인, 3상 유지) | 승격 중복·고아 extras | (a-2) 새 주 상위가 effective extras에 포함 → **자동 collapse**(해당 엣지 deleteMany를 FK 쓰기와 같은 트랜잭션 — 승격 의미론, 정보 손실 없이 격만 상승. 레거시 폼이 extras를 새 주 상위로 골라도 409 벽 없이 해소, V4-6ⓐ). null 해제인데 live extras 존재 → **409**(방향별 문구 — §4.9 메시지 사전). (b) 통과 시(live extras 0) 소프트삭제-부모 엣지도 같은 트랜잭션에서 삭제(V1-7 — '주 상위 없이 존속 불가' 계약이 부활 권리에 우선) |
| W3 | `updateEvent` — patch `{childEventIds}` (부모 쪽) — **P1 봉합** | detach가 자식의 주 상위를 몰래 비움 / attach가 자식의 기존 엣지와 중복 | detach 대상 자식 중 `event_parent_link` 보유자 존재 → **409**(자식 제목 동봉 — 몰래 승격·무성 엣지 삭제 금지 원칙, 자식 본인의 주 상위 해제 409와 대칭. V1-1·V4-1·V6-1). attach(주 상위가 이 사건이 되는) 자식에 대해 `deleteMany({childEventId:{in:attached}, parentEventId:id})`로 **자동 collapse**(엣지 축소라 auto-heal 안전. V1-2·V4-1) |
| W4 | `createEvent` | extras 영속화 미배선·순환 | DTO 수령만 하고 버리는 '계약 거짓말' 금지(V4-5) — ① 트랜잭션에 extras `createMany` ② 컨트롤러 위치기반 인자 배선(`event.controller.ts:1021-1059`) ③ `parentEventId` 부재+extras 존재 → **409**. childEventIds attach collapse는 W3과 동일 헬퍼. 신규 사건은 detach가 없어 W3-(i) 불필요(명기, V6-1). 기존 비트랜잭션 Promise.all(`:280-287`)을 update와 같은 엣지-쓰기 헬퍼·$transaction으로 수렴 |
| W5 | `permanentlyDeleteEvent`(`:746-764`) — **P1 봉합** | FK SetNull + 엣지 잔존 = DB 레벨 고아 | §4.6 |
| W6 | softDelete / restore | — | 엣지 보존, 무변경(§4.5). restore 성공 시 프론트 event-detail 루트 무효화 완화 옵션(V6-5) |

**가드 스코프(V2-1)**: (b) 계열 '유효 상태' 검증은 **patch에 `parentEventId` 또는 `extraParentEventIds` 키가 있을 때만** 평가한다. 기존/레이스 유입 고아 행이 제목 자동저장 같은 무관 편집을 409로 잠그는 인라인 편집 먹통을 방지 — 고아 행 자체는 §4.8 헬스체크+응답 격리가 담당.

**원자화**: W1~W3의 엣지 diff·FK 쓰기·본체 update를 단일 `$transaction`으로 — 현행 '자식 tx(`:500-513`) vs 본체 쓰기(`:520`)' 비원자 부채를 함께 해소.

### 4.3 마이그레이션 계획 — 백필 0, additive 1회

이 설계의 핵심 이득: 기존 주 상위 엣지는 FK에 그대로 남고 조인테이블은 빈 상태로 시작하므로 **데이터 백필이 없다**. 롤백 = DROP TABLE 완결.

1. `libs/db/prisma/event.prisma` 수정(§4.1) → `npm run db:build`로 머지 확인(DB 미접촉).
2. **커맨드 교정(V3-3)** — `run-migrate.ts`는 `--create-only` 플래그 패스스루가 없다(`libs/db/prisma/run-migrate.ts:50-53`, migrate dev 즉시 적용).
   - 검수 경로(권장): `npm run db:build && npx prisma migrate dev --create-only --name add_event_parent_link` → 생성 SQL 검수(CREATE TABLE + `uniq_event_parent_link_pair` + `idx_event_parent_link_parentId` + FK 2개 양측 Cascade만이어야 함, 백필 INSERT/UPDATE 없음) → `npx prisma migrate dev` → `npx prisma generate`. (`prisma.config.ts`가 schema·shadowDatabaseUrl을 배선하므로 bare npx 호출에 `--schema` 불요 — 확인됨.)
   - 무검수 경로: `ts-node libs/db/prisma/run-migrate.ts add_event_parent_link` 단일 실행.
3. 마이그 파일 상단 주석에 명기: "기존 parent_event_id는 주 상위로 존치 — 이 테이블은 추가 상위 전용, 초기 데이터 없음". **훗날 시드/수동 INSERT 함정(G5)**: Prisma DDL의 `updated_at DATETIME(3) NOT NULL`은 DEFAULT 없음 → `NOW(3)` 명시 공급, id는 `UUID()`, `child_event_id <> parent_event_id` 가드, 삽입 후 카운트 대조 검증 — 이 패턴을 마이그 주석과 시드 워크플로 문서에 정식 포함(백필이 없어 이 근육이 문서화되지 않는 것이 오히려 잠복 리스크).
4. `event.parent_event_id` 쪽 무변경(FK·암묵 인덱스·named constraint 존치) — raw SQL(`:739`) 유효 유지. `onDelete: SetNull` 명시는 no-op diff 확인.
5. 감사 쿼리(§4.8)를 배치1에서 함께 등록.
6. 환경 함정 플레이북(기존 전력): SHADOW_URL sslmode·db:build 레이스·적용된 마이그 수정 시 `_prisma_migrations.checksum` sha256 UPDATE 복구(mysql2, localhost:3307).

### 4.4 순환 규칙 — 오버레이 BFS, fail-closed (원안 fail-open 번복)

그래프 = 주 상위 FK 엣지 ∪ `event_parent_link` 엣지의 합집합(자식→부모 방향). `assertHierarchyLinkable`(`event.service.ts:545-629`)의 단일 커서 체인워크를 '반영 후 상태' 오버레이를 얹은 상향 BFS 도달성 검사로 교체한다(create·update 공용).

- **입력**: `id`(대상, create면 센티널), `parentEventId?`(3상), `childEventIds?`, `extraParentEventIds?`(전체목록).
- **오버레이** — 노드 x 확장 시 반영 후 부모 집합 P'(x): x ∈ childSet이면 `{id} ∪ extras(x)`(도달 즉시 순환 확정), x가 현행 주-자식인데 새 목록에 없으면 `extras(x)`만(W3의 detach 409가 extras 보유 자식을 선차단하므로 실질 빈 집합이지만 오버레이는 일반형 유지 — 가드 순서 변경에 견고), 그 외 `{fk(x)} ∪ extras(x)`.
- **알고리즘**: frontier₀ = effective 주 상위 ∪ effective extras(각각 undefined=현행 유지). 레벨 단위 배치 로드 — `findMany(event, where id in frontier, select {id, parentEventId})` 1회 + `findMany(event_parent_link, where childEventId in frontier)` 1회 = 스텝당 정확히 2쿼리(현행 노드당 findUnique N+1 제거). id 도달 시 409.
- **fail-closed(G1, V1-4)**: visited > 500 또는 depth > 50 초과 시 **409** "계층이 너무 깊어 순환 검사를 완료할 수 없습니다" — 통과(fail-open)는 순환 유입 통로라 금지. visited 재방문은 '해당 노드 확장 생략'(다이아몬드 dedup·기존 데이터의 선재 순환 방어)으로, '기존 데이터의 죄'와 '검사 미완'을 구분. 캡 상수는 코드 상수가 아닌 **명시 정책으로 문서화**하고 오탐(합법 초대형 계보) warn 텔레메트리 병행.
- **진단성(G3)**: 409 메시지에 prev 포인터 역추적으로 검출 경로의 사건 제목 최대 3개 동봉.
- **create 통합**: 신설 사건도 센티널 id로 동일 함수 통과 — `parentEventId=P + childEventIds=[C]`에서 P가 C의 자손이면 상향 BFS가 childSet에 도달해 409. 현행 '새 사건은 순환 불가' 잠복 구멍(`:631-634` 전제가 이 조합에서 거짓) 봉합.
- **소프트삭제 무시**: 워크는 deletedAt 관계없이 전 엣지를 걷는다 — 삭제된 중간 조상 복구 순간 순환이 성립하는 상태를 애초에 차단.
- **검증-쓰기 레이스(V1-5)**: 가드 실행(`:369-370`)과 쓰기(`:500-520`) 사이 동시 요청 2건의 교차 커밋으로 순환이 성립할 수 있다(트리 FK에서도 선재하는 비회귀 결함이나 엣지 N개로 표면 확대). v1 = **순환 감사 재귀 CTE를 헬스체크에 등록해 사후 검출**(1인 어드민 실사용 발생 확률 낮음을 명시 수용, §7 리스크 등재). 정공법 옵션(백로그) = interactive `$transaction` 안에서 BFS 재실행 후 위반 시 롤백(레벨당 2쿼리라 비용 소액).

### 4.5 소프트삭제·유령·복구 규칙

엣지 행에 deletedAt 없음(도메인 관례). 규칙:

1. **링크는 남기고 응답에서 거른다** — 어느 한쪽 사건이 소프트삭제돼도 엣지 보존, 응답 매핑(`extraParents/extraChildren`)에서 deletedAt 게이트로 숨김(현행 유령 주 상위 게이트 `event.controller.ts:211-214` 정책 승계). 복구 시 관계 자동 부활 — 단 부활 약속은 "**주 상위가 존속하는 동안**"으로 한정(W2-(b) 통과 시 소프트삭제-부모 엣지 동반 삭제, V1-7).
2. **전체목록 diff의 삭제는 살아있는 부모의 엣지에만** — `deleteMany`에 `parentEvent:{deletedAt:null}` 가드. 프론트 전체목록은 필터된 `extraParents`에서 재구성되므로 이 가드가 없으면 소프트삭제 부모의 엣지가 재저장 때마다 무성 소실(childEventIds detach의 `deletedAt:null` 정책 `event.service.ts:493-498`의 정확한 거울).
3. **검증 예외 승계** — extras 목록 속 소프트삭제 사건은 '기존 엣지가 이미 존재하면' 통과(현행 `:584`의 FK 비교를 엣지 존재 검사로 치환) — 무관한 편집이 404로 막히는 회귀 방지.
4. **유령 주 상위 정책(V3-2·V6-3·V7-5 통합)** — effective 주 상위가 소프트삭제 상태면:
   - '신규' extras 추가 → **409** "현재 상위 사건이 삭제 상태입니다…"(기존 엣지 재전송은 규칙 3으로 통과). UI는 '주 상위 없음'으로 보이는데 extras만 자라는 모순 차단.
   - **승격 swap의 강등 대상 산출은 '유령 게이트를 통과한 `parentEvent` 객체(=생존)' 기준** — 유령이면 강등 목록에서 자연 탈락(FK만 교체). 스칼라(`parentEventId` — toResponseDto가 원값 유지 `:207`) 기준으로 조립하면 죽은 id가 extras에 들어가 규칙 3의 404에 걸리는 영구 데드락(V6-3) — 클라 탈락을 정본 규칙으로 확정.
   - UI: 살아있는 `parentEvent` 객체가 없으면(부재·유령 공통) extras '추가' 버튼 **비활성**+헬퍼 텍스트("먼저 상위 사건을 지정하세요"), relationSummary는 `'상위 0+N'` 표기(V7-5).
   - 소프트삭제 부모는 승격 후보에서 제외(원안 유지).
5. **복구-창 lost-update 수용(V6-5)** — 부모 P 소프트삭제→복구 사이의 stale 전체목록 저장이 규칙 2의 가드를 통과해(P가 살아났으므로) P 엣지를 무성 삭제할 수 있다. childEventIds detach와 동급의 기존 수용 리스크로 명기(§7), 완화로 restore 성공 시 event-detail 루트 무효화.
6. `EventLinkCandidateDto.extraParents`도 **liveParent와 동일 소프트삭제 게이트**로 카운트·목록 산출(V6-4) — 상세 칩(필터됨)과 배지 '(+N)' 카운트 불일치·죽은 사건명 노출 방지.

### 4.6 하드삭제 규칙 (신설 — P1: V1-6·V3-1·V4-2·V6-2 통합)

`permanentlyDeleteEvent`(`event.service.ts:746-764`, 라우트 `DELETE /events/:id/permanent` `:1246-1254`)는 휴지통 UI에서 도달하는 **실사용 경로**다. `ParentChildEvent` FK가 SetNull이라 주 상위 P 하드삭제 시 자식 FK는 NULL이 되는데, 자식의 타 사건행 `event_parent_link`는 Cascade 대상이 아니라 생존 — 앱 코드가 개입할 수 없는 지점에서 INV-2가 붕괴한다(원안 본문이 침묵했던 구멍).

확정 규칙 — `permanentlyDeleteEvent`를 `$transaction`으로:

1. 삭제 전 주-자식들(`parentEventId = 삭제대상`)의 extras 보유자 조회.
2. 보유 자식마다 **최소 엣지(createdAt asc → id asc)를 주 상위로 자동 승격**(자식 FK 갱신 + 해당 엣지 삭제) — G4의 결정 규칙. 근거: 완전삭제는 이미 파괴적 confirm을 거친 맥락이고, 남은 상위 연결은 사용자가 기록한 정보라 보존 우선(전부 삭제 대안 대비).
3. 이후 본체 delete — SetNull은 extras 없는 자식(정상 루트 승격)에만 발화, 삭제 대상을 부모로 갖는 엣지 행은 Cascade로 동반 소멸.
4. 감사 헬스체크(§4.8)가 이 경로의 잔여 누수를 이중 방어.

### 4.7 소유권

- 엣지 쓰기 소유권은 현행 승계 — 양단 사건이 같은 `createdById`일 때만 연결(`assertLinkTargetsOwnedBy` `:636-658`의 존재·소유권·미삭제 배치검사에 `extraParentEventIds`를 linkedIds 합집합으로 합류).
- 엣지 전용 신규 라우트 없음(전체목록 덮어쓰기 규약으로 API 표면 최소화) — 컨트롤러 소유권 게이트(`:1112-1123`)가 그대로 문지기.
- 읽기: `extraParents/extraChildren`은 본인 소유 상세 응답에만 실림(loadEventDetail 경유) — 방문 뷰(by-account `:950`)는 무변경이라 노출 없음.

### 4.8 감사·자기치유 (G2 — '이식 후보'에서 배치1 필수로 격상)

불변식이 앱 레이어 전용이라는 최대 약점의 상시 방어. **1회성 체크리스트가 아니라 등록된 헬스체크 스크립트**로 운영한다(배치1 산출물).

```sql
-- [필수 0행] 불변식 위반 (INV-1·2·3 — V3-4의 자기참조 절 포함)
SELECT l.id, l.child_event_id, l.parent_event_id
FROM event_parent_link l
JOIN event e ON e.id = l.child_event_id
WHERE e.parent_event_id IS NULL              -- INV-2: 주 상위 없는 자식의 엣지
   OR e.parent_event_id = l.parent_event_id  -- INV-1: 주 상위 중복 엣지
   OR l.child_event_id  = l.parent_event_id; -- INV-3: 자기참조

-- [정보성] 유령 주 상위(소프트삭제)인데 살아있는 추가 상위 보유 (V3-2)
SELECT e.id, COUNT(*) AS live_extras
FROM event e
JOIN event p ON p.id = e.parent_event_id AND p.deleted_at IS NOT NULL
JOIN event_parent_link l ON l.child_event_id = e.id
JOIN event x ON x.id = l.parent_event_id AND x.deleted_at IS NULL
GROUP BY e.id;

-- [필수 0행] 순환 검출 — FK ∪ 엣지 합집합 그래프 재귀 CTE (V1-5 레이스 사후 검출, depth 캡 50)
WITH RECURSIVE edges AS (
  SELECT id AS child_id, parent_event_id AS parent_id FROM event WHERE parent_event_id IS NOT NULL
  UNION ALL
  SELECT child_event_id, parent_event_id FROM event_parent_link
), walk (start_id, node_id, depth) AS (
  SELECT child_id, parent_id, 1 FROM edges
  UNION ALL
  SELECT w.start_id, e.parent_id, w.depth + 1
  FROM walk w JOIN edges e ON e.child_id = w.node_id
  WHERE w.depth < 50 AND w.node_id <> w.start_id
)
SELECT DISTINCT start_id FROM walk WHERE node_id = start_id;
```

**읽기 자기치유(응답 격리형)**: loadEventDetail이 '주 상위 NULL + 엣지 존재'를 발견하면 해당 extras를 응답에서 격리(미노출)하고 warn 로그 — 읽기 경로에서 DB 쓰기는 하지 않는다(수리는 감사 스크립트 실행으로). 루트 판정은 FK 기준으로 계속 정확하므로 위반의 blast는 '숨은 고아 엣지' 수준에 갇힌다.

### 4.9 API 계약·SDK

- **쓰기 DTO**: `create-event.dto.ts`·`update-event.dto.ts`에 `extraParentEventIds?: string[]` additive — childEventIds와 동형의 전체목록 규약(**undefined=변경 없음, []=전부 해제**). 기존 `parentEventId` 3상(undefined/null/string) 무변경. 구 클라이언트는 키 미전송=유지라 추가 상위가 절대 소실되지 않음(두 제출부의 as 캐스트 은폐 하에서도 안전).
- **응답 DTO**: `EventResponseDto`에 `extraParents?: Array<{id, title}>`·`extraChildren?: Array<{id, title}>` additive. `toResponseDto` 매핑은 **conditional**(`extraParentLinks ? map : undefined` — childEvents `:215` 패턴 준수, V2-2: 목록·상세가 공유하는 단일 매퍼라 무조건 `?? []`는 목록 payload를 오염). deletedAt 게이트 + `orderBy [createdAt asc, id asc]`.
- **loadEventDetail include**: `extraParentLinks`/`extraChildLinks`를 평면 1단 요약만(`parentEvent/childEvent: {select: {id, title, deletedAt}}`) — 주 상위 4단 include(`:844-852`)는 무변경, k^4 팽창 원천 차단.
- **link-candidates**: `EventLinkCandidateDto`에 `extraParents?: Array<{id, title}>` — '(+N)' 배지 근거, liveParent 동일 게이트(§4.5-6). 정렬·캡 규약(기본 30/최대 100, `[startDate desc, id desc]`) 유지.
- **루트 스코프 5곳 0변경 확인 지점**: `getAllEvents :438`·`count :609`·on-this-day raw `:739`·by-account `:950`·`comment.service.ts:146` — 각 지점에 "INV-2 의존" 주석 필수(특히 raw SQL은 컴파일 타임 검출 불가).
- **409 메시지 사전(한국어 확정 — V4-6·V7-2)**: `friendlyErrorMessage`(`use-event-mutation.ts:168`) 경유 토스트와 레거시 폼 setFormError 모두 서버 message를 그대로 표기하므로, 문구가 곧 해소 안내다.
  - (a-1) "이미 대표 상위 사건입니다 — 추가 상위로 중복 연결할 수 없습니다."
  - (b-추가 방향) "주 상위가 없는 사건에는 추가 상위를 연결할 수 없습니다 — 먼저 상위 사건을 지정하세요."
  - (b-해제 방향) "추가 상위 N개가 연결되어 있어 상위를 해제할 수 없습니다 — 추가 상위를 대표로 승격하거나 함께 해제하세요."
  - (유령) "현재 상위 사건이 삭제 상태입니다 — 복구하거나 상위를 정리한 뒤 추가 상위를 연결하세요."
  - (detach) "'{자식 제목}'에 추가 상위가 연결되어 있어 하위에서 분리할 수 없습니다 — 해당 사건에서 추가 상위를 정리하세요."
  - (순환) "순환 계층은 만들 수 없습니다: {경로 제목 최대 3개} — 지정한 상위가 이 사건의 하위 계보에 있습니다."
  - (검사 미완) "계층이 너무 깊어 순환 검사를 완료할 수 없습니다."
- **SDK**: `npm run build:nestia`(컨트롤러 변경 후) + `swagger.json` + **raw fetch 수동 인터페이스**(`shared/api/events.ts`의 EventLinkCandidate 등 — SDK 미경유라 손 동기화 필수).
- **배포 순서 제약(V4-3)**: `forbidNonWhitelisted: true`(`validation.pipe.ts:18-22`)라 신 web→구 API는 `extraParentEventIds` 포함 PUT/POST 전부가 400 경질 실패. **배치3(web)은 배치2(API) 배포·기동 확인이 하드 선행조건**. 로컬 함정: API는 watch 아님 — build:api 후 main.js 재시작.

### 4.10 캐시·낙관·undo 규약

- **무효화 게이트**: 계층 게이트(`use-event-mutation.ts:128`)에 `'extraParentEventIds'` 추가(상대 부모 상세의 '추가 하위' stale 방지). **LISTING_FIELDS(`:146-157`)에도 추가(원안 '무변경' 번복 — V4-4)**: link-candidates 캐시 키가 lists() 프리픽스 하위라 이것이 '(+N)' 배지·`extraParents` 신선도를 담보한다. extras patch는 키스트로크성 빈도가 아니라 비용 논거와 일관(V7-6의 배지 stale도 함께 해소).
- **낙관(buildOptimisticEvent)**: extras 분기 신설 — '항상 재구성' 규약(유지분은 `prev.extraParents` 재사용, 신규만 link-candidates 캐시 stub, 실패 시에도 stub 강제. childIdsRef stale 무성 유실 전례의 규약 승계).
- **승격 swap의 cross-slot 해소(V5-1·V7-3)**: 승격은 모달 없는 칩 액션이라 후보 캐시가 cold한 것이 기본 상태 — `resolveParentEvent`(`:422-431`)의 prevParent 폴백은 id 불일치 시 **금지**. 새 `parentEvent`는 ① `prev.extraParents`에서 id 매칭 `{id, title}` 승격(최우선 — 항상 히트) ② 후보 캐시 ③ 최후 빈 stub 순. 새 extras 중 직전 주 상위 id는 `prev.parentEvent`에서 `{id, title}` 승계(생존 객체 기준 — 유령이면 강등 목록에서 이미 제외, §4.5-4).
- **undo(buildInverse)**: `case 'extraParentEventIds': inv.extraParentEventIds = (event.extraParents ?? []).map(p => p.id)`. 승격 swap은 `{parentEventId, extraParentEventIds}` 동시 스냅샷 patch라 undo가 주·부 양쪽을 원자 복원(buildInverse가 patch 키 순회 구조임을 코드로 확인 — `use-undoable-patch.tsx:210-297`).
- **undo 409 표현형(V5-4)**: 불변식 도입으로 inverse가 409를 맞을 수 있는 신규 표현형 — 검증 결과 단일 토스트 구조(`:134-137`)가 단일 지면 내에서는 차단함을 확인(extras-only inverse는 주 상위 불변, `{parentEventId: null}` inverse는 불변식상 extras 빈 상태에서만 생성). 남는 경로는 멀티탭 5초 창뿐이며 '무성 덮어쓰기' 대신 '실패 토스트'라 오히려 안전 — 리스크 한 줄 등재(§7), 신규 코드 불필요.
- **`extraIdsRef` 미러(V5-3)**: detail-network의 extras patch 조립에 childIdsRef(`detail-network.tsx:110-115`)와 동일한 ref 미러를 처음부터 배선(3줄) — 승격/추가에 confirm await가 붙는 순간 재발할 stale 캡처 구조 선제 차단.
- **스펙**: 기존 10케이스(실행 PASS 확인) 무수정 원칙 + 신규 필수 케이스 3 — ① extras 연속 추가 누적(`[P2]` 다음 `[P2,P3]` — `spec:63-73`의 거울) ② 승격 swap cold-cache(새 parentEvent.id 일치 + 옛 주 상위 title이 extras에 보존) ③ extras-only patch에서 낙관 분기 존재(next ≠ null). 배치3의 완료 조건.

---

## 5. UX 결정

### 5.1 확정

| # | 지면 | 결정 |
|---|---|---|
| U1 | breadcrumb | 주 상위 체인만 — CAP(3)·'…' 시맨틱 무변경. 추가 상위가 있으면 **크럼 마지막 뒤 별도 시각 그룹(구분점 뒤)**에 '+N' 배지 — 직계 크럼에 흡착돼 'WWII의 다른 상위'로 오독되지 않게(V7-7). `title`·`aria-label`("이 사건의 다른 상위 사건 N개 — 클릭해 연관 섹션으로") 필수, 클릭=네트워크 섹션 앵커. '…'(더 위 있음)과 '+N'(다른 상위 있음)을 별도 시그널로 분리 |
| U2 | 트리·목록·카운트 | dedup by design — 다중부모 자식은 주 상위 아래 정확히 1회 출현. 연/세기 카운트·heat·통계·displayedCount·부분로드 배너·내보내기 전부 무변경·정확. 발견은 상세 양방향 칩 + U1 배지(트리 행 배지는 PD3) |
| U3 | 연결 모달 이원화 | ① 주 상위 지정/변경: 단일선택 SelectModal + 이동 confirm 유지하되 **문구에 대안 경로 안내 추가**("양쪽 모두 유지하려면 '{자식}' 상세의 추가 상위에서 연결하세요" — V7-1 v1 최소안). 기존 extras인 후보는 **비활성+사유 표기**("추가 상위 — 대표 승격은 칩에서"). ② 추가 상위: 같은 SelectModal 재사용, 선택 즉시 추가·닫힘, confirm 없음(엣지 추가는 아무것도 끊지 않음). 이미 연결된 후보는 **체크 표시+재클릭 시 해제 토글**(G7). 후보 배지 "현재 'X'의 하위 (+N)" |
| U4 | extras 추가 버튼 게이트 | 살아있는 `parentEvent` 객체가 있을 때만 활성 — 부재·유령 공통 비활성+헬퍼 텍스트("먼저 상위 사건을 지정하세요"). 409를 사전 차단(V7-5) |
| U5 | 주 상위 해제 | extras 존재 시 해제 클릭을 **patch 발사 전 가로채** 선택 다이얼로그: 승격 대상 선택(기본 제안=연결 오래된 순 첫 번째, G4) / 모든 상위 해제("추가 상위 N개 연결도 함께 해제됩니다" — `{parentEventId: null, extraParentEventIds: []}` 원자 patch) / 취소. **낙관 갱신은 확정 후에만**(깜빡임→409 스냅백 방지, V7-2). 세부 카피·픽커 UI는 PD2 |
| U6 | 승격 | 칩의 명시 액션 '대표로 승격' — `{parentEventId, extraParentEventIds}` 단일 swap patch(undo 원자 복원). 서버는 몰래 승격하지 않는 문지기(단, W2-(a-2)의 스칼라 경유 승격 collapse는 허용 — 결정적·정보 무손실) |
| U7 | 형제 네비 | 주 상위의 자식 집합만 — 쿼리·BC-safe 정렬·이전/다음 무변경. 합집합 형제 배제(의미 붕괴) |
| U8 | relationSummary | `'상위 1'` → `'상위 1+N'`, 주 상위 부재/유령+extras 조합은 `'상위 0+N'` |
| U9 | '추가 하위' 행 | 부모 상세에 읽기전용 칩 행(냉전의 서막 상세에서 얄타가 보이게) — 편집은 자식 쪽 단일화. cap·어포던스 힌트는 PD6 |
| U10 | extras 모달 배선 | `extrasModalOpen`을 후보 쿼리 enabled 게이트(`detail-network.tsx:96`)와 디바운스 리셋 키(`:79-83`)에 합류 — 미적재·검색어 잔상 방지(V7-6, 배치3 체크리스트) |
| U11 | 댓글 | v1 현행 유지 — 주 상위 스레드 딥링크(`event-detail.page.tsx:296-309`) 무변경. 정책 확정은 PD4 |

### 5.2 제품 결정 대기 (PD)

| # | 결정 사항 | 선택지·비고 |
|---|---|---|
| PD1 | 부모쪽 additive 연결 | v1은 U3-①의 안내 문구로 대응(확정). 정식안 = 강탈 confirm 3택(이동/추가 상위로 연결/취소) — '추가 상위로 연결'은 타 사건 mutation(`updateEvent(childId, {extraParentEventIds})`) 신설 필요, undo 토스트는 대상 사건 스코프라 미지원 명시(V7-1) |
| PD2 | 해제 다이얼로그 세부 | 다중 extras 승격 픽커 UI(라디오 목록 vs 기본 제안+변경), '모든 상위 해제' 노출 여부·카피 확정 |
| PD3 | 트리/목록 발견성 | '+N 상위' 미니 배지를 배치4로 유예할지 선행할지. v1 수용 시 제품 문서에 "**트리·검색은 주 계보 기준**" 명기(검색 비대칭 — `useEventFilters.ts:98-107`가 주 계보만 워크, V2-3) |
| PD4 | 댓글 정책 | 주 상위 스레드 단독 유지의 공식 확정 + 최상위 사건이 부모를 얻는 순간 기존 댓글 자격 상실(read까지 404) 문제 — 대표안(G10): 댓글 보유 사건은 게이트 예외(스레드 유지) 또는 이관 안내 배너. 다중부모로 발생 빈도 증가하므로 v1 배포 전 결정 권장 |
| PD5 | 엣지 부가정보 | `note`(관계 서술)·`sortOrder`(수동 정렬) — v1 스키마 제외는 확정(V5-2·V7-4). 도입한다면 후속 phase에서 **쓰기 채널(객체 배열 DTO)·undo 보존·재정렬 UI를 한 세트로** |
| PD6 | '추가 하위' 행 | 표시 상한(cap)·'외 N개'·"편집은 해당 사건에서" 어포던스 힌트 문구 |

---

## 6. 구현 배치 계획

규모: 배치0(선행)+본 배치 4개, 마이그레이션 1회(백필 0), 터치 약 24~30파일. 각 배치는 성격별 분리 커밋, 게이트 = `NODE_OPTIONS=--max-old-space-size=12288 npx tsc`(exit code 확인, 첫 stale 재실행) · 변경 파일 단독 lint(한 글자 변수 금지) · jest spec · DB 라운드트립 라이브(admin/1234 :8000, API는 build 후 재시작) · 감사 쿼리 0행.

### 배치0 — 선행 조건 (독립 커밋, G6 격상)

| 항목 | 파일 | 우선순위 |
|---|---|---|
| `as Parameters<typeof updateEvent>[1]` 캐스트 2곳 satisfies 전환 — DTO 표류를 tsc 가시권으로 | `event-create.page.refactored.tsx:371` · `event-create-form-dashboard.tsx:828` | P2 |

### 배치1 — DB + 서비스 코어 (API, 리스크 최고 — P1 전부 여기서 봉합)

| 항목 | 근거 | 우선순위 |
|---|---|---|
| `event.prisma` — EventParentLink(§4.1, sortOrder·note 제외)·역관계 2개·헤더 주석·onDelete SetNull 명시 | 설계 | P1 |
| 마이그 1회(§4.3 — 커맨드 교정 경로·주석 방어깊이 포함) | V3-3·G5 | P1 |
| 오버레이 BFS 가드 교체(create 포함·fail-closed·경로 제목 409) | V1-4·G1·G3 | P1 |
| 불변식 가드 — W1(a-1·b·유령 신규 409)·W2(a-2 collapse·해제 409·소프트삭제-부모 엣지 정리)·가드 스코프 한정 | V1-3·V1-7·V2-1·V3-2 | P1 |
| **childEventIds 경로 봉합** — detach 409 + attach collapse(update·create 공용 엣지-쓰기 헬퍼, 단일 $transaction) | V1-1·V1-2·V4-1·V6-1 | **P1** |
| **`permanentlyDeleteEvent` $transaction 승격 처리**(§4.6) | V1-6·V3-1·V4-2·V6-2 | **P1** |
| create 배선 3항목 — extras createMany·컨트롤러 인자·create 409(계약 거짓말 방지) | V4-5 | P2 |
| 409 메시지 사전 확정(§4.9 — 방향별 2종·detach·유령·순환) | V4-6·V7-2 | P2 |
| 감사 쿼리 3종 스크립트 + 헬스체크 등록 + 읽기 응답 격리 | G2·V3-4·V1-5 | P2 |
| 서비스 유닛테스트 — detach 409·attach collapse·스칼라 승격 collapse·하드삭제 승격·유령 신규 409·해제 409·순환 fail-closed·create 순환 | 검증 전반 | P1 |

파일(±): `libs/db/prisma/event.prisma`, migrations 1건, `event.service.ts`, `event.controller.ts`(create 인자), `event.prisma.repository.ts`, 감사 스크립트, 서비스 spec ≈ 7~8개.

### 배치2 — API 계약 (선행: 배치1)

| 항목 | 근거 | 우선순위 |
|---|---|---|
| DTO 2종에 `extraParentEventIds?: string[]` | 설계 | P2 |
| `EventResponseDto.extraParents/extraChildren` — **conditional 매핑(:215 패턴)**·deletedAt 게이트·orderBy 2키 | V2-2 | P2 |
| loadEventDetail include 평면 1단 | 설계 | P2 |
| `EventLinkCandidateDto.extraParents` — liveParent 동일 게이트 | V6-4 | P2 |
| 루트 스코프 5곳에 INV-2 의존 주석(raw `:739` 필수) | 리스크 | P3 |
| build:nestia + swagger + **raw fetch 수동 인터페이스 손 동기화** | 설계 | P2 |
| 라이브 라운드트립: extras 저장→응답→재저장 왕복·구 클라 키 미전송=유지 확인 | V4-3 | P2 |

파일 ≈ 5~6개.

### 배치3 — web 상세 (하드 선행조건: **배치2 API 배포·기동 확인** — forbidNonWhitelisted 400, V4-3)

| 항목 | 근거 | 우선순위 |
|---|---|---|
| `shared/api/events.ts`·`use-event-detail.ts` 타입 | 설계 | P2 |
| detail-network — extras 칩 행·추가 모달(**enabled 게이트·디바운스 리셋 키 합류**)·승격 액션·**해제 가로채기 다이얼로그**·childOptions 필터 확장(주+extras)·relationSummary `1+N`/`0+N`·강탈 confirm 대안 문구·extras 버튼 게이트·**extraIdsRef 미러** | V7-2·V7-5·V7-6·V5-3·U3~U9 | P2 |
| detail-hero — '+N' 배지(별도 그룹·aria·앵커) | V7-7 | P3 |
| use-event-mutation — 낙관 extras 분기(**항상 재구성·swap cross-slot**), 게이트 `:128`+**LISTING_FIELDS**에 키 추가 | V5-1·V7-3·V4-4 | P2 |
| use-undoable-patch — buildInverse case(swap 원자 복원) | 설계 | P2 |
| restore 성공 시 event-detail 루트 무효화(완화) | V6-5 | P3 |
| 스펙 — 기존 10 무수정 + 신규 3케이스(연속 누적·swap cold-cache·분기 존재) = 완료 조건 | V5-3·V5-5 | P2 |

파일 ≈ 7~8개.

### 배치4 — 발견성·폴리시 (선택 출하, PD 결정 후)

| 항목 | 근거 | 우선순위 |
|---|---|---|
| 트리/목록 행 '+N 상위' 배지(PD3) + "트리·검색은 주 계보 기준" 제품 문서 | V2-3 | P3 |
| `isRootEvent` 헬퍼 수렴(useEventFilters `:164`·grid `:73`·dashboard `:221`·events.page) | G8 | P3 |
| 대시보드 임베드 폼 extras 행(childEventIds Chip UI `:1602-1622` 거울)·`useRelationshipsForm` excludeIds 합류 | 설계 | P3 |
| mock 오염원 경고 주석(`history-types.ts:44` 외) | 판독 | P3 |
| 감사 스크립트 운영 문서·캡 상수 정책 문서화·warn 텔레메트리 | G1 | P3 |

백로그(비배치): interactive $transaction 내 순환 재검(V1-5 정공법) · PD1 3택 confirm+크로스 사건 mutation · PD5 note/sortOrder 세트 · relatedEventIds 죽은 계약 정리.

### 6.4 검증 이슈 반영 대장 (유실 0 확인)

| ID | 요지 | 처분 |
|---|---|---|
| V1-1 (P1) | childEventIds detach가 불변식 측면 붕괴 | §4.2 W3 detach 409 — 배치1 |
| V1-2 (P2) | childEventIds attach 중복 엣지 | §4.2 W3 attach collapse — 배치1 |
| V1-3 (P2) | 주 상위 단독 patch 중복·가드 기준 비대칭 | §4.2 effective 통일 + W2-(a-2) collapse + U3-① 비활성 — 배치1·3 |
| V1-4 (P2) | fail-open 안전밸브 | §4.4 fail-closed 확정 — 배치1 |
| V1-5 (P2) | 검증-쓰기 레이스 | §4.4·§4.8 순환 CTE 사후 검출 + §7 리스크 + 백로그(tx 재검) |
| V1-6 (P2) | 하드삭제 우회 | §4.6 — 배치1 P1 |
| V1-7 (P3) | 소프트삭제 부모 엣지 × 해제 가드 | §4.2 W2-(b)·§4.5-1 — 배치1 |
| V2-1 (P2) | 가드가 무관 편집 잠금·SetNull 미문서화 | §4.2 가드 스코프·§4.1 onDelete 명시 — 배치1 |
| V2-2 (P3) | toResponseDto conditional | §4.9 — 배치2 |
| V2-3 (P3) | 검색·필터 발견성 확장 | PD3·§7 리스크·배치4 |
| V3-1 (P1) | 하드삭제(중복) | §4.6 — 배치1 |
| V3-2 (P2) | 유령 주 상위 사각 | §4.5-4 신규 409 + 감사 정보성 절 — 배치1 |
| V3-3 (P3) | --create-only 커맨드 | §4.3-2 — 배치1 |
| V3-4 (P3) | 감사 자기참조 절 | §4.8 — 배치1 |
| V4-1 (P1) | childEventIds 우회(중복) | §4.2 W3 — 배치1 |
| V4-2 (P2) | 하드삭제(중복) | §4.6 — 배치1 |
| V4-3 (P3) | 역방향 하위호환·배포 순서 | §4.9·배치3 선행조건 |
| V4-4 (P3) | LISTING_FIELDS·후보 신선도 | §4.10 키 추가 — 배치3 |
| V4-5 (P3) | create 배선 부재 | §4.2 W4 — 배치1 |
| V4-6 (P3) | 레거시 폼 409 해소 | §4.9 메시지 사전 + W2-(a-2) collapse — 배치1 |
| V5-1 (P2) | swap 낙관 소스 결함 | §4.10 cross-slot — 배치3 |
| V5-2 (P2) | note·sortOrder 구조 충돌 | §4.1 v1 제외 + PD5 |
| V5-3 (P3) | 낙관 분기 누락 반경 | §4.10 spec 완료조건 + extraIdsRef — 배치3 |
| V5-4 (P3) | undo 409 표현형 | §4.10·§7 리스크 한 줄(코드 불필요) |
| V5-5 (P3) | 기존 spec 무충돌(정보성) | §4.10 무수정 원칙 — 배치3 |
| V6-1 (P1) | childEventIds 우회(중복) | §4.2 W3·W4 — 배치1 |
| V6-2 (P2) | 하드삭제(중복) | §4.6 — 배치1 |
| V6-3 (P2) | 유령+승격 데드락 | §4.5-4 생존 객체 기준 강등 — 배치3 |
| V6-4 (P3) | 후보 extraParents 게이트 | §4.5-6 — 배치2 |
| V6-5 (P3) | 복구-창 lost-update | §4.5-5·§7 리스크 + restore 무효화 — 배치3 |
| V7-1 (P2) | 부모쪽 플로우 모순 | U3-① 안내 문구(v1) + PD1 |
| V7-2 (P2) | 해제 플로우 미완 | U5 가로채기 + 409 방향별 문구 + PD2 — 배치1·3 |
| V7-3 (P3) | 승격 낙관 프레임(중복) | §4.10 — 배치3 |
| V7-4 (P3) | 칩 순서 비결정 | §4.1 orderBy 2키·컬럼 제외 — 배치1·2 |
| V7-5 (P3) | 부재·유령 UI 게이트 | U4·U8·§4.5-4 — 배치3 |
| V7-6 (P3) | 모달 배선·배지 stale | U10 + LISTING_FIELDS — 배치3 |
| V7-7 (P3) | '+N' 배지 모호 | U1 — 배치3 |

---

## 7. 리스크와 명시적 비범위

### 리스크 (완화 포함)

1. **불변식이 앱 레이어 전용(하중벽)** — DB가 INV-1·2를 표현 못 함. 완화: §4.2 전 경로 가드 + §4.6 하드삭제 트랜잭션 + §4.8 상시 헬스체크·응답 격리의 3중 방어. 위반 blast는 '숨은 고아 엣지' 수준(루트 판정은 FK 기준 계속 정확) — 안B·C의 정본-캐시 드리프트와 격이 다름. 최우선 테스트 대상.
2. **검증-쓰기 레이스 수용(V1-5)** — 동시 요청 교차로 순환 성립 가능(트리에서도 선재하던 비회귀 결함). 순환 감사 CTE로 사후 검출, 1인 어드민 실사용 확률 낮음을 명시 수용. 정공법(tx 내 재검)은 백로그.
3. **raw SQL 암묵 의존** — on-this-day `parent_event_id IS NULL`(`:739`)은 컴파일러·grep이 못 잡는 유일 지점. INV-2 덕에 지금은 옳지만 훗날 '주 상위 없는 extras 허용'으로 정책이 바뀌면 조용히 틀린다 — 주석 + 본 문서 명시.
4. **발견성 부채(트리+검색)** — 얄타가 냉전의 서막 서브트리·검색 결과(추가 상위 경유)에 안 나타나는 v1 의도적 트레이드오프. 완화: 상세 양방향 칩·'+N' 배지·PD3.
5. **undo lost-update + 409 표현형** — 전체목록 스냅샷 undo가 창 사이 추가분을 덮는 기존 수용 클래스의 부모축 확장 + 불변식 위반 undo는 무성 손실 대신 실패 토스트로 표면화(오히려 안전).
6. **복구-창 lost-update(V6-5)** — 소프트삭제 부모 복구 직후 stale 목록 저장이 부활 엣지를 삭제할 수 있음 — childEventIds와 동급 수용, restore 무효화로 완화.
7. **EventRelation과 의미 경계** — '추가 상위'(수직 계보)와 '관련 사건'(수평) + 죽은 계약 relatedEventIds(검사만 하고 저장 안 함, `event.service.ts:129-133`)의 3중 공존 — 제품 문서로 경계 정의 없으면 이중 등록 유발. 정리는 백로그.
8. **SDK 이중 동기화** — build:nestia + raw fetch 수동 인터페이스 손 동기화, 한쪽만 하면 타입 통과·런타임 필드 누락.
9. **fail-closed 캡 오탐** — 합법 초대형 계보 409 가능 — 캡 상수 정책 문서화·warn 텔레메트리로 튜닝.
10. **마이그 환경 함정 전력** — SHADOW_URL sslmode·db:build 레이스·checksum 드리프트 복구 절차 사전 숙지.

### 명시적 비범위 (non-goals)

- **트리 occurrence 복제(안B식)** — 다중부모 자식을 여러 서브트리에 중복 렌더하지 않는다. pathKey·distinct 집계·타임라인 dedup 등 B의 목록 개편 전체가 범위 밖.
- **`parentEventId` 컬럼 드롭·정본 이관** — 하지 않는다. 루트 판정 5곳·raw SQL·서버 페이징(`useEvents.ts:5`)·루트 정의 전부 무변경.
- **relationType enum** — 도입하지 않음(안C 탈락 사유).
- **`note`·`sortOrder`** — v1 제외 확정(PD5).
- **형제 합집합·기준 부모 전환** — v1 배제(후속 옵션).
- **부모쪽 additive 연결(크로스 사건 mutation)** — PD1 결정 대기, v1은 안내 문구.
- **댓글 정책 변경** — v1 현행 유지, PD4 결정 대기.
- **EventCategory 계층** — 트리 유지(의도적 비대칭).
- **relatedEventIds 죽은 계약 정리** — 별도 작업.
- **BC 날짜 잠복(`event-timeline.tsx:541-546`의 native `new Date`)** — 본 작업과 무관한 기존 규약 위반, 범위 외로 명기만.

### 부록 — 후속 진화 경로 (G9)

훗날 '대등한 다중 부모(대표 개념의 DB 강제)'가 필요해지면: MariaDB에서 `@@unique([childEventId, isPrimary])` + `isPrimary Boolean?`(true=대표, null=일반 — unique가 NULL 중복은 허용하고 TRUE 중복은 ER_DUP_ENTRY로 차단, 라이브 검증됨) 트릭으로 'child당 대표 최대 1'을 스키마 수준에서 강제할 수 있다. 본 설계의 `event_parent_link` 위에 isPrimary 컬럼 추가 + 주 상위 FK 백필(`INSERT ... SELECT UUID(), id, parent_event_id, 1, NOW(3), NOW(3) FROM event WHERE parent_event_id IS NOT NULL AND parent_event_id <> id`) → 안B식 정본화로 점진 이관하는 경로가 열려 있으며, `isRootEvent` 헬퍼 수렴(배치4)이 그때의 단일 교체점이 된다.