# 사건(Event) 댓글 기능 도입 설계 검토서

> 대상: Papyrus (NestJS + Prisma API / React+Vite web-admin)
> 범위: 사건 콘텐츠에 대한 댓글(토론) 기능 — 단, **진짜 결정은 "사건 가시성"**. 데이터모델·알림 연동·로드맵·열린 결정
> 작성 원칙: 추측은 "(추측)"으로 명시. 인용은 실제 파일:라인이며 본 검토 중 코드로 확인함.
> 함께 보기: `docs/cyworld-room-visiting-design.md`(방 놀러가기), 메모리 `notification-shared-feed-per-account-read`

---

## 0. 한 줄 결론

**댓글 기능 자체는 저비용**이다 — 알림(Notification)·액터 컨텍스트(ALS)·폴리모픽(`AggregateType`) 인프라가 이미 있어 `Comment` 모델 하나 + 서비스/컨트롤러/UI만 만들면 된다. **진짜 비용·진짜 결정은 "사건 가시성"**이다. 사건은 지금 **등록자 본인만** 보므로(상세는 남이 열면 예외까지 던짐), 댓글이 *사회적*이려면 **"누가 그 사건을 보고 다느냐"를 먼저 정해야** 한다. 따라서 본 검토의 1번 산출물은 댓글 스키마가 아니라 **가시성 모델 선택(§3)**이다.

---

## 1. 핵심 발견 — 댓글은 쉽고, 막힌 건 가시성

| 축 | 현황 | 함의 |
|---|---|---|
| 기존 댓글 인프라 | **전무**(comment/reply/thread/reaction 모델 0건) | 신규 `Comment` 도메인 구축 필요 |
| 알림 시스템 | **있음**(재사용 가능) | 댓글 알림 거의 공짜 (단, 전역피드 한계 §5) |
| 폴리모픽 패턴 | **있음**(`AggregateType` 54종, EVENT 포함) | 댓글을 폴리모픽으로 설계 가능 |
| **사건 가시성** | **소유자 only**(상세는 비소유자 차단·예외 throw) | **댓글의 사회성을 막는 진짜 게이트** |

→ 즉 "사건 댓글"을 만들기 전에 **사건이 남에게 보이게 하는 선행 작업**이 본체다.

---

## 2. 검증된 현재 사실

### 2.1 사건은 등록자 전용 (남이 못 봄)
- 목록: `where: { createdById: userId, deletedAt: null }` (`event.controller.ts:379-383`)
- 상세: `if (loaded.event.createdById !== userId) throw '본인이 등록한 사건만 조회할 수 있습니다'` (`event.controller.ts:757-758`) — 인물보다 강함(인물 findById는 null, 사건은 예외)
- `on-this-day`·`parent/:id`도 동일 게이트
- **유일한 cross-account 노출**: `entity-link-search`가 사건을 제목/날짜만 검색 노출(`entity-link-search.controller.ts:111-119`) — 상세는 여전히 차단. "구경"이 아니라 "링크 검색"용.
- **방(공개 프로필)에 사건관 없음**: `public-profile.page.tsx`는 인물관·유물·코스메틱만. `visitedEventsQueryOptions` 부재.

### 2.2 재사용 가능한 댓글 인프라
- **알림**: `Notification`(전역 공유피드: entityLabel·method·ownerType·recordId·actorAccountId·actorName·preview) + `NotificationRead`(계정별 읽음) (`common.prisma:149-182`). `NotificationService.create()`가 ALS로 actor 자동 채움(`notification.service.ts:19-52`), 헬퍼 `notifyEvent()` 존재.
- **액터 컨텍스트**: `getActorAccountId()`(ALS, `actor-context.ts`) — 인터셉터가 `req.user.id ?? sub` 주입. 댓글 작성자 식별에 그대로 사용.
- **폴리모픽**: `AggregateType`(EVENT 포함, `base.prisma:57-118`), `EventMethod`(CREATE/UPDATE/DELETE, `base.prisma:147-154`). `PointEntry`/`ActionLog`가 `ownerType+recordId`로 임의 엔티티에 부착(`gamification.prisma:27-73`).
- **작성자 표시**: `Account.displayName ?? username` + 대표인물 아바타(`representativePerson`) (`common.prisma:23-89`).

### 2.3 신규 구축 필요
`Comment` 모델 + `CommentService`(알림 발행 포함) + `CommentController` + DTO + 프론트 댓글 섹션/입력/삭제. (사건 상세 페이지 `pages/events/detail/event-detail.page.tsx`에 섹션 자리.)

---

## 3. ⭐ 가시성 모델 — 댓글의 의미가 갈리는 지점 (사용자 결정)

"댓글"은 "누가 그 사건을 보느냐"에 따라 완전히 달라진다.

### (A) 방문자 댓글 — 방 놀러가기 위에 얹기
- **의미**: 남의 방에서 그 사람 "사건관"을 보고 댓글을 단다. 방 놀러가기와 정합.
- **선행(필수)**: 방에 **사건관 노출** — `GET /events/by-account/:accountId`(읽기전용, `createdById` 필터, 카드 레벨) + 공개 프로필에 "등록 사건관" 섹션 + **읽기전용 사건 보기**(현재 `/events/:id`는 소유자만이라, 비소유자용 read 경로 신설). 인물관 Phase A와 동일 패턴.
- **비용**: 사건 가시성 작업(중) + 댓글(소). **방 놀러가기 로드맵의 자연스러운 다음 칸.**
- **권장도**: ⭐ 제품 방향(방 놀러가기)과 일관. 가장 응집적.

### (B) 공개 토론 — 사건을 모두에게 공개
- **의미**: 사건을 전역 공개하고 누구나 토론(위키 토론탭처럼).
- **선행**: 사건 계정종속 모델을 **여는** 대규모 변경(목록·상세 게이트 해제, 공개정책, `Event.isPublic` 등). 현재 "내 정보 공간" 철학과 충돌.
- **비용**: 큼. 가시성 정책·모더레이션 전면화.
- **권장도**: 지금 단계엔 과함.

### (C) 본인 메모/주석 — 사적 노트
- **의미**: 내 사건에 내가 남기는 사적 메모(타임스탬프 노트). *사회적 댓글 아님*.
- **선행**: 없음(가시성 변경 0). 가장 싸다.
- **비용**: 최소.
- **권장도**: "댓글"이 아니라 "주석"을 원하면 정답. 사회성 0.

> **반드시 (A)~(C) 중 하나를 먼저 골라야** 데이터모델·API가 정해진다. 추천: **(A)** — 방 놀러가기와 한 줄기.

---

## 4. 데이터 모델 (가시성 모델과 독립적으로 설계 가능)

> ⚠️ 절차: 소스 `libs/db/prisma/*.prisma` 수정 → `npm run db:build` → 마이그레이션(CLAUDE.md).

### 4.1 권장: 폴리모픽 `Comment` (지금 EVENT, 나중 인물·국가로 확장)
```prisma
/// 콘텐츠 댓글 (폴리모픽). 지금은 EVENT, 추후 PERSON/COUNTRY 등으로 무비용 확장.
model Comment {
  id              String        @id @default(uuid()) @db.Char(36)
  /// 대상 엔티티 종류 (PointEntry/ActionLog와 동일 패턴)
  ownerType       AggregateType @map("owner_type")   // 우선 EVENT
  recordId        String        @map("record_id") @db.Char(36)  // 대상 엔티티 PK (Event.id)
  authorAccountId String        @map("author_account_id") @db.Char(36)
  content         String        @db.Text
  /// 대댓글(선택) — 1depth만 권장
  parentCommentId String?       @map("parent_comment_id") @db.Char(36)
  deletedAt       DateTime?     @map("deleted_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  author          Account       @relation(fields: [authorAccountId], references: [id])

  @@index([ownerType, recordId], name: "idx_comment_target")
  @@index([authorAccountId], name: "idx_comment_author")
  @@map("comment")
}
```
- **장점**: 방이 이미 인물관·사건관을 보여주므로 **인물 댓글도 곧 원하게 됨** → 테이블 재사용. 알림이 이미 `ownerType+recordId`로 키잉돼 정합.
- **대안(단순)**: `EventComment { eventId FK }` 전용 — 초기 단순하나 인물 댓글 시 모델 추가. (조사 에이전트는 이 쪽을 초기 권장.)
- **권장**: 프로젝트의 폴리모픽 관성·방의 다엔티티 노출을 고려해 **폴리모픽 채택**.

### 4.2 소유 vs 작성 분리
- 사건 **소유자**(`Event.createdById`) ≠ 댓글 **작성자**(`Comment.authorAccountId`). 삭제 권한: 댓글 작성자 본인 + (선택) 사건 소유자(자기 방 모더레이션).

---

## 5. 알림 연동 — 재사용되지만 한계 있음

### 5.1 재사용 (거의 공짜)
```ts
await this.notificationService.create({
  entityLabel: `${event.title} - ${authorName}`,
  method: EventMethod.CREATE,
  ownerType: AggregateType.EVENT,
  recordId: event.id,            // 클릭 시 사건으로 딥링크
  preview: content.slice(0, 80),
  // actorAccountId/actorName은 ALS로 자동
})
```

### 5.2 ⚠️ 한계 — 전역 공유피드라 "타겟 알림"이 아님
현재 `Notification`은 **전역 공유피드 + 계정별 읽음**이다(메모리 `notification-shared-feed-per-account-read`). "당신 사건에 댓글 달림"을 **사건 소유자에게만** 보내는 개념이 없다 → 그대로 쓰면 **모두의 피드에 뜸**(노이즈). 선택지:
- (a) Phase A는 알림 없이 출시(댓글만).
- (b) 전역피드 그대로 사용(노이즈 감수).
- (c) `Notification`에 `recipientAccountId`(타겟) 도입 — 별도 작업(추측). → "내 콘텐츠에 댓글" 알림의 제대로 된 해법.

---

## 6. "방명록 빼라"와의 정합성

앞서 **방명록(홈피 잡담)·일촌은 영구 제외**로 결정했다. 사건 댓글은 **특정 콘텐츠(사건)에 대한 토픽 토론**이라 성격이 다르지만, **같은 "유저가 남기는 글" 메커니즘을 콘텐츠 축으로 되살리는** 것이다. → 모더레이션·스팸·신고 같은 *UGC 운영 부담*은 방명록과 동일하게 따라온다. 가시성 모델 (A)를 택하면 사실상 "방명록 대신 콘텐츠 댓글"이 되는 셈이라, **이 재도입이 의도된 것인지** 확인이 필요(§10).

---

## 7. 리스크

| 리스크 | 대응 |
|---|---|
| **가시성 개방이 본체** — 댓글보다 "사건을 남에게 보이기"가 큰 작업 | (A) 택해 방 사건관(읽기전용)부터. 댓글은 그 위 |
| **UGC 모더레이션·스팸·신고** — 방명록 빼며 피했던 부담 재유입 | 삭제(작성자+소유자)·신고·길이제한 최소셋. 공개범위 작게 시작 |
| **알림 전역피드** — 타겟 알림 불가 | §5.2: Phase A 무알림 or recipient 도입 결정 |
| **비소유자 사건 상세 노출 범위** — 현재 상세는 무거움(행위자·네트워크·부록) | 방문용 read는 카드/요약까지, 전체 상세 개방은 별도 결정 |
| **삭제·소프트삭제 정합** — 사건 삭제 시 댓글 | `deletedAt` 소프트삭제 + 사건 cascade 정책 |

---

## 8. 로드맵

### 선행 — 사건 가시성 (모델 A 채택 시)
1. `GET /events/by-account/:accountId`(읽기전용, `createdById` 필터, 카드 projection) — 인물 by-account 패턴 복제. 단, 사건은 컨트롤러가 prisma 직접 호출이라 **신규 핸들러**(무위임).
2. 공개 프로필에 "등록 사건관" 섹션(`visitedEventsQueryOptions`).
3. 비소유자용 **읽기전용 사건 보기** 경로(현 `/events/:id`는 소유자 전용).

### 본체 — 댓글
4. `Comment` 모델(§4) + `npm run db:build` + 마이그레이션.
5. `CommentService`(목록·작성·삭제 + 알림 발행) / `CommentController`(`GET·POST·DELETE /comments?ownerType=EVENT&recordId=`) / DTO.
6. 사건 상세(또는 방 사건 보기)에 **댓글 섹션**(목록·입력·삭제) — `notify`/`confirm`·시간포맷 재사용, 작성자=대표인물 아바타+displayName.
7. SDK 재생성(build:nestia 우회) + shared/api 래퍼 + 타입체크(힙) + 변경파일 단독 lint.

### 후속
대댓글(1depth), 신고/모더레이션, 타겟 알림(recipient), 인물·국가로 댓글 확장(폴리모픽이면 무비용).

---

## 9. 권장

**(A) 방문자 댓글**로 가되, **순서는 "방 사건관 노출(읽기전용) → 댓글"**. 댓글 모델은 **폴리모픽 `Comment`**(인물 댓글 무비용 확장). Phase A는 **알림 없이**(또는 전역피드) 최소셋으로 출시하고, 타겟 알림은 후속.

---

## 10. 열린 결정 (사용자 확정 필요)

1. **가시성 모델**: (A) 방문자 댓글 / (B) 공개 토론 / (C) 본인 메모 — **이게 정해져야 시작.** 추천 (A).
2. **댓글 모델**: 폴리모픽 `Comment`(추천) vs `EventComment` 전용 FK.
3. **알림**: Phase A 무알림 / 전역피드 / `recipientAccountId` 타겟 도입.
4. **모더레이션 범위**: 삭제 권한(작성자만 vs +사건소유자), 신고 도입 시점 — "방명록 빼라"와의 정합성 포함.
5. **비소유자 사건 노출 깊이**: 카드/요약까지 vs 전체 상세.

---

### 부록: 핵심 코드 인용
- 사건 게이트: `event.controller.ts:379-383`(목록), `:757-758`(상세 throw); 링크검색 노출 `entity-link-search.controller.ts:111-119`
- 알림: `common.prisma:149-182`(Notification/Read), `notification.service.ts:19-52`(create+ALS actor), notifyEvent 헬퍼
- 액터: `actor-context.ts`(getActorAccountId), 인터셉터 `req.user.id ?? sub`
- 폴리모픽: `base.prisma:57-118`(AggregateType, EVENT), `:147-154`(EventMethod); `gamification.prisma:27-73`(PointEntry ownerType+recordId)
- 작성자: `common.prisma:23-89`(Account displayName/representativePerson)
- 프론트: 사건 상세 `pages/events/detail/event-detail.page.tsx`; 방 `public-profile.page.tsx`(사건관 부재)
- **추측 표기**: recipient 타겟 알림, 폴리모픽 vs 전용FK, 대댓글 depth, 모더레이션 범위 — 모두 §10 결정 입력.
