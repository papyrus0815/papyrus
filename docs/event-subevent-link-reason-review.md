# 검토 보고서 — 하위 사건 등록 시 "연결 사유(link reason)" 기능

대상 시나리오: 보스니아 위기(1908–09) 아래 하위 사건 12개를 연결하며, 링크마다 "왜 이 사건이 상위와 연결되는가" 한두 문장을 기록. 사건 본문(배경/여파)과 별개인 **관계 단위 주석**.

> 생성: 16-에이전트 워크플로(정찰 5 · 설계 3 · 심사 3 · 적대검증 4 · 종합 1). 심사 합산 안1=19.5 · 안2=24.5 · 안3=22.2 → 승자 = 안2(쌍 사이드카). 검증 판정 3×NEEDS_CHANGES + 1×SOUND, 지적 전량 본문 반영.

> **구현 완료 (2026-07-26, 미커밋)** — 승자 설계 그대로 전 레이어 배선:
> - 스키마·마이그: `event_hierarchy_reason` 신설(마이그 `20260726050443_add_event_hierarchy_reason`, 순수 additive CREATE TABLE + 양방향 Cascade FK), Prisma Client v7.3.0 재생성.
> - API: 중첩 DTO(`HierarchyReasonEntryDto`/`ChildReasonEntryDto`, `EVENT_LINK_REASON_MAX=500`, `@ValidateIf` null 허용) + `UpdateEventDto.parentLinkReasons`/`childLinkReasons` + 컨트롤러 PUT 배선 + `applyHierarchyReasons`(반영 후 유효쌍 검증·유령 허용·delete-then-create) + `assertNoDuplicateKey`(400) + `toResponseDto` 쌍 사유 맵 부착(`parentLinkReason`·`extraParents[].reason`·`childEvents[].reason`·`extraChildren[].reason`) + `loadEventDetail` include 2관계. `build:nestia` 재생성.
> - web-admin: `InlineText` maxLength/showCount 확장 + detail-network 3지면(주 상위 행 사유 라인·추가 상위 칩 사유 토글·하위 카드 사유 형제 행, `ChildCardWrap &:hover > button`로 셀렉터 스코프 축소) + `use-event-mutation` 무효화 predicate·낙관 재구성(`normalizeReason`)·부활 토스트(`detectReasonRevival`, 승격 오탐 가드).
> - 검증: API spec 26/26(신규 8)·web spec 13/13(신규 3)·web tsc 0·변경파일 신규 lint 0·API tsc(변경파일 0). **라이브 라운드트립 전 항목 통과**: 양면 사유 기입·승격 시 쌍 사유 자동 추종(이관 코드 0)·해제→재연결 부활·비연결 400·501자 400·중복 400·빈값/null 삭제·500자 경계 200. 테스트 사건 하드삭제로 Cascade 정리 확인(404).
> - 제품 결정 3건은 문서 v1 권고 그대로 채택: 유령 쌍은 기존 엣지 존재 시 사유 허용 / orphan 방치+감사 / 부활 토스트는 응답에 revived 사유 실릴 때. **잔여(v2)**: §4 그대로(CreateEventDto 필드·타임라인·목록/사이드패널·relationType enum).

---

## 1. 요약·권고

**쌍(pair) 자연키 사이드카 테이블 `event_hierarchy_reason`을 신설**하는 설계안 2를 채택 권고한다. 핵심 근거: 사유는 (자식, 상위) **쌍**에 종속되지, 그 쌍이 주 상위 슬롯(`Event.parentEventId` bare FK)에 있는지 추가 상위 엣지(`event_parent_link`)에 있는지에는 종속되지 않는다. 현행 코드의 엣지 삭제 지점 3곳 — 승격 swap(event.service.ts:846-852 + :609-615), attach collapse(:596-598), 하드삭제 승격(:1148-1153) — 은 전부 슬롯만 바꾸고 쌍은 못 바꾸므로, 쌍 키 저장이면 **사유 이관 코드가 0줄**이고 무손실이 코드가 아니라 구조로 보장된다. 기존 인접(멤버십) DTO 계약·가드 W1~W6·§4.8 감사 SQL·루트 판정 5곳은 전부 0변경. PD5(엣지 note v1 제외 결정, event.prisma:633)는 이 설계가 처방 조건(객체 배열 채널 + undo 보존)을 충족하며 해소된다. 규모 M(4~5.5 dev-day), 순수 additive 마이그레이션 1건, 롤백은 DROP TABLE 1건.

---

## 2. 확정 설계

### 2.1 데이터 모델

`libs/db/prisma/event.prisma`에 신설 (**schema.prisma 직접 수정 금지 — 머지 산출물**, CLAUDE.md):

```prisma
model EventHierarchyReason {
  id            String @id @default(uuid()) @db.Char(36)
  childEventId  String @map("child_event_id") @db.Char(36)
  parentEventId String @map("parent_event_id") @db.Char(36)
  /// 한두 문장 요약 — 서사는 사건 본문(background/aftermath)에. 행 존재 = 사유 존재(NOT NULL).
  reason        String @db.VarChar(500)

  childEvent  Event @relation("EventHierarchyReasonChild",  fields: [childEventId],  references: [id], onDelete: Cascade)
  parentEvent Event @relation("EventHierarchyReasonParent", fields: [parentEventId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([childEventId, parentEventId], name: "uniq_event_hierarchy_reason_pair")
  @@index([parentEventId], name: "idx_event_hierarchy_reason_parentId")
  @@map("event_hierarchy_reason")
}
```

- **주/부 무관 단일 정본**: 주 상위(FK)든 추가 상위(엣지)든 같은 쌍이면 같은 행. 승격/강등/재부모화/하드삭제 승격 시 이관 코드 불필요.
- **R-1 잔존 정책**: 링크 해제 시에도 행 보존(deletedAt 없음 — 이벤트 도메인 조인테이블 관례 §4.5 상속). 같은 쌍 재연결 시 사유 자동 부활 → V5-2·V7-4가 지적한 "제거→undo 무성 소실"을 저장층에서 해소. 어느 쪽 사건이든 하드삭제되면 양방향 Cascade로 소멸.
- **비우기 = 행 삭제**(reason NOT NULL). 서버는 trim 후 빈 문자열을 null(삭제)로 정규화 — `''` 행 생성 불가 [검증 반영].
- **길이 500**: 단문 큐레이션 선례(PersonNickname.reason VarChar(300), DynastyRule start_reason VarChar(200)) 계열. `@db.Text` 미채택은 의도 — 칩/카드 표시용 요약임을 타입으로 강제. 공유 상수 `EVENT_LINK_REASON_MAX = 500` 1개가 Prisma 주석·DTO·프론트 input을 전부 급양.
- **불변식·감사 영향 0**: INV-1/2/3, 루트 판정(`parentEventId IS NULL`, raw SQL 포함 5곳), §4.8 감사 ①②③, 순환 BFS, 읽기 자기치유 전부 event/event_parent_link만 보므로 무변경.
- **감사 신설 2건** [검증 반영 — 기존 안의 단일 정보성 감사를 2계층으로 교정]:
  - **[필수 0행]** `SELECT id FROM event_hierarchy_reason WHERE child_event_id = parent_event_id OR reason = ''` — INV-3 거울 + 빈 행 방지(raw write 드리프트 감시).
  - **[정보성]** 살아있는 주 상위 FK 쌍에도, event_parent_link 행에도 안 걸리는 잔존(orphan) 사유 행 카운트 — **R-1 정책상 0행 요건 아님**, 추세만 모니터링.
- `event.prisma:633`의 PD5 주석 갱신: "note는 쌍 사이드카(EventHierarchyReason)로 도입, sortOrder는 계속 유예".

### 2.2 API 변경

**인접 채널 0변경**: `parentEventId` / `childEventIds` / `extraParentEventIds`의 3상 계약(undefined=변경 없음, []=전부 해제, 전체목록)과 `ExtraParentEdgePlan`(event.service.ts:22-25), 가드 W1~W6 전부 그대로. 구 클라이언트 무영향.

**신규 DTO 필드 — `UpdateEventDto`에만 (v1)** [검증 반영: create 페이지는 BASIC 전용·parentEventId 미배선(event-create.page.refactored.tsx:1-10)이라 CreateEventDto 필드는 커버 UI 없는 죽은 표면 — create-with-parent 플로우 도래 시 무마이그레이션 추가]:

```ts
// 부분 업서트(partial upsert) — 전체목록 아님. undefined=변경 없음, 나열된 쌍만 터치.
// reason 문자열=업서트, null=행 삭제(비우기).
parentLinkReasons?: HierarchyReasonEntryDto[];  // 이 사건이 자식인 쌍 — 주 상위·추가 상위 대칭
childLinkReasons?:  ChildReasonEntryDto[];      // 이 사건이 부모인 쌍(주 상위 FK 자식) — 보스니아 플로우용
```

- **검증 클래스 필수** [검증 반영 — V2 P2]: 기존 인라인 객체배열(relatedPersons 등)은 `@IsOptional`만 있고 내용 무검증. 반드시 별도 nested DTO 클래스(`@IsUUID` id, reason은 `@IsString`+`@MaxLength(EVENT_LINK_REASON_MAX)`+명시적 null 허용)를 만들어 `@ValidateNested({ each: true })`+`@Type(...)`으로 부착(militaryEvent 선례, create-event.dto.ts:256-259 계열). 이거 없으면 501자가 DTO를 통과해 Prisma P2000 → 500 에러.
- **한 배열 내 같은 쌍 중복 → 400** ("같은 상위 사건에 대한 사유가 중복 제출되었습니다") — 비결정 동작 차단 [검증 반영].
- 부분 업서트인 이유: R-1 하에서 전체목록 계약이면 계층 patch마다 사유 전량 재전송 필요 → V5-2 무성 소실 채널 부활. 부분 업서트는 사유 편집을 delete-recreate diff에서 완전 분리 — skipDuplicates(:622) 문제 자체가 소멸.

**서비스 (event.service.ts)**:

- **hierarchyTouched 게이트(:439-442)에 신규 키 등록 금지** [검증 반영 — V1 P2]: 등록하면 reason-only patch가 사이클 BFS(:855-862, fail-closed 캡 500/50)를 태워 무관한 주석 편집이 409로 막힐 수 있음. 분기 명시:
  - **reason-only patch**: 자체 소형 tx + 경량 로더 `validateReasonPatch` — 대상 사건의 `parentEventId` + eventParentLink(라이브+유령) 로드, 쌍이 유효 집합 밖이면 400 ("연결되지 않은 상위 사건에는 연결 사유를 기록할 수 없습니다"). 사이클 BFS·엣지 plan 미실행.
  - **계층 키 동반 patch**: 기존 계층 $transaction(:580-627) 안에서 인접 쓰기 **후**, events.update(:626) 전에 사유 upsert/delete 합류. 유효 집합은 patch 적용 후(effective) 기준. "명시 DTO 값 우선" 규칙 고정.
- **유효 쌍 집합**: {effective parentEventId} ∪ finalExtras ∪ **유령 엣지 상위**(§4.5 부활 약속 상속). `reason:null`(삭제)은 링크 상태 무관 허용(정리 어포던스). childLinkReasons는 effective 자식 집합(주 상위 FK 기준)만 — 편집 자식 쪽 단일화(U9) 유지.
- **소유권 — assertLinkTargetsOwnedBy(:995-1017) 그대로 재사용 금지** [검증 반영 — V1 P2]: 이 함수는 소프트삭제 대상에 무조건 NotFound(:1008)를 던져 유령 쌍 사유 편집이 불가능해짐. assertHierarchyLinkable의 keptExtra 예외 패턴(:770-780)을 따를 것: 소프트삭제 상대는 **해당 쌍의 엣지 행이 이미 존재할 때만** 허용, createdById 일치 검사는 동일.
- **양 시그니처·양 콜사이트 동시 배선** [검증 반영 — V2 P2]: updateEvent 서비스 시그니처와 PUT 컨트롤러 콜사이트(:1193-1230)를 같은 커밋에서 배선. relatedPersons가 updateEvent에서 누락돼 200을 반환하며 조용히 버려졌던 전례(:546-548 주석)가 정확히 이 결함 클래스. 회귀 spec 양방향: (a) reason만 실은 PUT이 사이드카 행을 쓰고/지운다, (b) 인접만 실은 patch는 event_hierarchy_reason 행을 절대 안 건드린다(no-clobber).
- **승격 swap·attach collapse·하드삭제 승격·clearAll: 사유 코드 0줄.** 수용 spec: 승격 전후 `SELECT reason WHERE child=X AND parent=Y` 완전 동일(쌍 스코프 오라클).

**응답 (event.response.ts / event.controller.ts)**:

- 매핑 지점은 **공용 재귀 toResponseDto(:215-235)이지 loadEventDetail이 아님** [검증 반영 — V2 P2]. loadEventDetail include에 `hierarchyReasonsAsChild`/`hierarchyReasonsAsParent` 관계를 추가하고, toResponseDto는 **관계가 실제 로드됐을 때만**(Array.isArray 게이트, extraParentLinks와 동일) 매핑 — conditional 계약(undefined=미로드 vs []=없음, :216-219) 보존. bare fallback(:1145, :1239)·중첩 parentEvent 체인은 reason undefined(절대 null 아님).
- 형태: `extraParents[]`·`extraChildren[]`·`childEvents[]` 원소에 `reason?: string | null`, 톱레벨 `parentLinkReason?: string | null`(주 상위 쌍, detail 전용).
- **사유는 실제로 방출되는 링크 객체에만 부착** — 독립 쌍 맵 형태 금지. 읽기 자기치유가 격리한 링크의 사유가 새는 것을 구조적으로 차단 [검증 반영 — V1 P3].
- 목록(getAllEvents)·on-this-day·getEventsByParentId·link-candidates·수동 동기화 인터페이스 `EventLinkCandidate`(shared/api/events.ts:173-194): **v1 전부 무변경**. spec: getAllEvents 페이로드에 reason 필드 부재 확인.

### 2.3 UX 플로 (입력 지점별)

원칙: **U3 확정 규약("추가 상위 선택 즉시 추가·닫힘·confirm 없음") 불변, SelectModal 무수정**(입력 슬롯 없음 — select-modal.tsx:10-15·287). 사유는 연결 직후 **후행 인라인 편집**. 모든 편집은 기존 onPatch 단일 채널(useUndoablePatch, event-detail.page.tsx:88).

**보스니아 워크스루**: 부모 상세 → '하위 사건 추가' SelectModal에서 12건 연속 토글(기존 즉시커밋 그대로) → 모달 닫힘 → 각 하위 카드의 상시 노출 '사유 추가 +'로 제자리 기입. 자식 페이지 12회 방문 불요, 이탈 0. 연결 직후 `showAllChildren=true` 자동 세팅 + 방금 연결된 카드 하이라이트 — CHILD_CARD_CAP=24 접힘(:583-591)·연대순 산개(:47-55)로 인한 카드 사냥 방지 [검증 반영 — V3 P3].

1. **하위 사건 카드(부모 페이지, detail-network.tsx:543-581)** — **어포던스·textarea는 ChildCard(Link) 내부 중첩 금지** [검증 반영 — V3 P2]: ChildCard는 `styled(Link)`(:1013)라 `<a>` 안 `<button>/<textarea>`는 무효 HTML. RemoveChildBtn 선례(:571-577, :978-1011)대로 **ChildCardWrap 안 형제 행**으로 배치, 편집 모드에 그 행이 InlineText(multiline)로 전환. 읽기 전용 사유 라인만 Link 본문 안 허용. 저장 = `onPatch({ childLinkReasons: [{ childEventId, reason }] })` — 자기 사건 채널이라 undo 토스트 탑승. ChildCardWrap의 `&:hover button` 셀렉터(:969-976)는 제거 버튼 전용으로 스코프 축소 — 사유 버튼은 **상시 노출**(hover-only 금지, 터치 불가+발견성) [검증 반영 — V3·V4 P2. EventRelation.relationDescription이 스키마만 있고 UI 0인 채 방치된 반면교사].
2. **추가 상위 칩(자식 페이지, :458-505)** — 칩 단일라인 pill 유지. **툴팁 단독 금지** [검증 반영 — V3 P2]: 칩의 '사유' TextBtn이 ExtraParentsRow 아래 HelperNote 스타일(11.5px, :892-895) 보조 라인을 토글 — 읽기·편집 겸용, 한 번에 하나. 사유 텍스트를 칩 링크 aria-describedby로 병기. title 툴팁은 마우스 fast-path로만. 저장 = `onPatch({ parentLinkReasons: [{ parentEventId, reason }] })`. 칩 내부 4번째 액션 추가 금지(과밀).
3. **주 상위 행(자식 페이지, :424-454)** — 행 아래 사유 보조 라인 + '사유' TextBtn(상시 노출) → 인라인 편집 → 같은 parentLinkReasons 필드. 주/부가 사용자에게 단일 개념으로 보임 — "대표 관계엔 이유를 못 적는" 비대칭 해소.
4. **승격/해제/재부모화** — patch 형태 무변경. 승격 시 사유는 쌍을 따라 자동으로 주 상위 행 아래로 이동(서버 코드 0줄). 해제/재부모화 confirm에 **"사유도 삭제됩니다" 카피 금지**(R-1 하에서 거짓) [검증 반영 — V1·V4]: "이 상위와의 연결 사유는 더 이상 표시되지 않습니다. 다시 연결하면 복원됩니다." 재연결로 사유가 부활하면 **토스트 필수**: "이전에 기록한 연결 사유가 복원되었습니다" [검증 반영 — 무성 부활 차단, v1 바인딩].
5. **입력기** — shared/ui/inline-edit `InlineText`에 `maxLength`·`showCount` props **선행 확장 필요**(현재 미지원, inline-text.tsx:22-31) [검증 반영]. 카운터 경고색은 theme 토큰(하드코딩 hex 금지). placeholder: "이 사건이 상위와 어떻게 이어지는지 한두 문장 (예: 병합을 서두르게 만든 직접적 계기)". 삭제 = 비우고 저장(null 전송), 단독 confirm 없음(P3-15 — 제거 confirm 정책 전반과 함께 갈 사안).

**낙관·undo·캐시 배선 (use-event-mutation.ts)**:
- buildInverse에 2케이스: 캐시된 detail의 parentLinkReason / extraParents[].reason / childEvents[].reason에서 이전 값을 읽어 부분 업서트 inverse 구성. 링크 해제 undo는 R-1 덕에 inverse가 사유를 안 실어도 부활(이중 안전). 한계: 캐시 미보유 쌍의 "사유 편집" undo는 원복 불가(문서화).
- buildOptimisticEvent "항상 재구성" 규약대로 신규 키 분기, resolveExtraParents/resolveChildEvents/candidateToEventStub(:410-489)에 reason 통과(신규 스텁은 null).
- **크로스 상세 무효화 predicate(:128-137)에 `parentLinkReasons`/`childLinkReasons` 등록 필수** [검증 반영 — V3·V4 P2]: 미등록 시 쌍의 반대면(자식 페이지 상위 행 ↔ 부모 페이지 하위 카드)이 stale. patch가 상대 id를 명시하므로 해당 event-detail 키만 표적 무효화(블랭킷보다 저렴). **LISTING_FIELDS(:150-164)에는 미등록이 정답** — 목록에 사유가 없으니 lists() 무효화 낭비 금지.

### 2.4 표시 지면별 방식 (v1 = detail-network 패널 단독)

| 지면 | 방식 |
|---|---|
| 주 상위 행 | 행 아래 HelperNote 톤 사유 라인 + 편집 |
| 추가 상위 칩 | aria-describedby + 토글식 보조 라인(읽기·편집) + 마우스 title 툴팁 |
| 하위 사건 카드 | ChildDesc 아래 1줄 clamp 사유 라인(Link 본문 내) + 형제 행 편집 |
| 추가 하위 읽기전용 칩(:599-629) | title 툴팁만. :627 안내 문구에 "사유 포함" 추가: "연결 편집·사유는 해당 사건의 추가 상위에서" |

쌍 자연키라 양면이 자동 일치 — 이중 저장·동기화 없음.

---

## 3. 구현 순서

1. **스키마**: `libs/db/prisma/event.prisma`에 모델 + Event 관계 리스트 2개(`hierarchyReasonsAsChild`/`AsParent`) + PD5 주석 갱신. ⚠️ apps/api/prisma/schema.prisma 직접 수정 금지 — db:build가 소스로 덮어써 유실됨.
2. `npm run db:build` → `ts-node libs/db/prisma/run-migrate.ts add_event_hierarchy_reason` (검수 원하면 `--create-only`, 손 SQL 추가 금지). 순수 additive CREATE TABLE, 백필 없음. DDL 주의: updated_at DATETIME(3) NOT NULL 무기본값 — 시드/수동 INSERT는 `NOW(3)`+UUID 명시 필수.
3. **API**: nested DTO 클래스 → UpdateEventDto → 컨트롤러 PUT 콜사이트 → 서비스(validateReasonPatch·tx 합류·소유권 예외 패턴) → toResponseDto·include → spec(§2.2 회귀 + §2.4 오라클). 같은 커밋에서 시그니처·콜사이트 동시 배선.
4. `npm run build:nestia` (⚠️ **build:api는 SDK 재생성 안 함** — 순서 필수). web 래퍼(shared/api/events.ts)는 SDK 파생이라 0수정, 자동 전파 확인만. API는 watch 아님 — build:api 후 dist kill+재기동(:8000, admin/1234).
5. **web-admin**: InlineText maxLength/showCount 확장 → detail-network 3지면 + 카드 형제 행 → use-event-mutation 배선(무효화 predicate·buildInverse·낙관 재구성 — 개별 invalidateQueries 신설 금지) → 부활 토스트. 타입체크는 `NODE_OPTIONS=--max-old-space-size=12288 npx tsc` + exit code 확인(vite build는 타입 안 잡음), 변경 파일 단독 lint(한 글자 변수명 error).
6. **배포 하드 게이트**: API 선배포·기동 확인 후 web — forbidNonWhitelisted라 신 web→구 API는 신규 키 400 (V4-3 선례).
7. **검증**: §4.8 감사 ①②③ 0행 재확인 + 신설 2건 편입. 라이브 라운드트립: 하위 연결→사유 기입→승격 swap(쌍 사유 동일 확인)→undo→해제→재연결(부활+토스트)→하드삭제 승격(승격 쌍 보존·삭제 사건 사유 Cascade 소멸)→비연결 쌍 400→사유 단독 patch가 인접 무변경.
8. 롤백: 쓰기 중단만으로 무해, 포기 시 DROP TABLE 1건.

규모: **M (4~5.5 dev-day)** — 스키마 0.5 / API 1.5~2 / web 1.5~2 / 검증 1.

---

## 4. 명시적 보류(v2)

- **CreateEventDto 필드**: create-with-parent 플로우 부재(생성 페이지 BASIC 전용·parentEventId:'' 하드코딩)라 커버 UI 없는 죽은 표면 — 플로우가 생기면 무마이그레이션 추가. 인라인 childEvents 벌크 생성 경로는 구조적으로 사유 탑재 불가(요청 시점에 자식 id 미존재) — PUT 후행 기입으로 커버, 스코프 아웃 명기.
- **link-candidates / hero '+N' 툴팁**: '+N' 칩 자체가 미출하 WIP. 후보 픽커엔 아직 사유가 없고, EventLinkCandidate는 손 동기화 인터페이스라 확장 시 누락 함정 — '+N' 출하와 함께 결정.
- **타임라인**: 시각 규약(16px 균일 막대·라벨 막대 밖) + TOOLTIP_W/H 280×70 고정 clamp(event-timeline.tsx:1248-1271) + BarData에 링크 메타 부재 + 다중 상위 중 어느 사유인지 모호 — 비노출이 옳음.
- **목록/트리/사이드패널**: getAllEvents가 링크 메타 미포함·transformEventsFromApi가 드랍 — 페이로드 비용 대비 가치 낮음. 사이드패널만 백로그.
- **sortOrder**: PD5 잔여 그대로 유예.
- **relationType enum**: non-goal 유지(안C 탈락 — 과설계). 훗날 번복돼도 이 테이블에 nullable 컬럼 1개로 끝.

---

## 5. 기각한 대안

- **EventParentLink 미러 행(주 상위도 엣지 보유)**: INV-1 감사 "필수 0행" 계약 파괴 + attach collapse 의미 반전 + 7개 쓰기 경로 FK↔미러 이중 동기화 — 출하된 배치0~3 사실상 재작성. 주석 기능 대비 blast 비대칭.
- **설계안 1 (엣지 reason 컬럼 + Event.parentLinkReason + 객체배열 전체목록 채널)**: 멤버십 채널이 신·구 상호배타로 이원화되어 INV-1..3 강제 코드 한복판에 churn. 사유 편집마다 전체 자식 목록 재단언 — stale ref 하나로 링크가 무성 해제될 수 있음.
- **설계안 3 (엣지 컬럼 + 대칭 슬롯 + 손 이관)**: 슬롯 이동 경로 3~4곳 전부에 read-before-delete 이관 코드 — 한 곳 누락이면 오귀속·무성 소실. 미래의 모든 쓰기 경로(PD1 크로스 사건 등)가 독립적으로 지켜야 하는 영구 규율세. 채택안은 이 결함 클래스 자체가 없음.
- **연결 시점 사유 입력 스텝**: U3 확정 규약 위반 + SelectModal 입력 슬롯 부재 + 12건 연속 시나리오에서 모달 12회 중단이 오히려 느림.

---

## 6. 리스크·미해결 질문

**리스크**
- **DB가 사유 행↔실제 링크 대응을 FK로 강제 못 함**(주 상위 쌍은 event_parent_link에 행이 없어 참조 불가) — 앱 검증+방출 링크 한정 매핑으로만 보장. 가드 우회 raw write 시 유령 사유 가능 → 필수 0행 감사 + 정보성 orphan 카운트로 감시.
- **제3의 DTO 계약**(부분 업서트)이 기존 3상 전체목록과 다름 — DTO 주석·§4.9 문서에 `reason:null=행 삭제` 의미까지 명기 안 하면 혼동.
- **사유 편집 undo의 캐시 의존**: 캐시 미보유 쌍의 편집 undo는 원복 불가(링크 해제 undo는 R-1로 커버). 수용·문서화.
- **R-1 부활의 양날**: 토스트로 완화하지만, 수개월 뒤 재연결 시 낡은 사유가 현재형으로 보이는 문맥 오염 가능성은 잔존 — orphan 정보성 감사로 추세 관찰.
- **선례 이탈**: 쌍 사이드카는 이 코드베이스 첫 패턴(기존은 relation row 직부착). 리뷰 반발 시 fallback = 설계안 3 + 이관 경로별 spec 강제.

**미해결 질문 (구현 전 확정 필요)**
1. 유령(소프트삭제 상위) 쌍의 **신규** 사유 작성 허용 범위 — 본 설계는 §4.5 부활 약속 근거로 "기존 엣지 존재 시 허용" 권고. 편집만 허용하고 신규 작성은 라이브 쌍 한정으로 좁힐지 제품 결정.
2. orphan 사유 행 위생 — 방치(현안)·주기 정리 배치·사용자 노출 정리 UI 중 택1. v1은 방치+정보성 카운트 권고.
3. 부활 토스트의 노출 조건 세부 — 링크 patch 응답에 부활 사유가 실려오는 모든 경우 vs 사용자가 직전에 해제했던 세션 내 쌍 한정.
