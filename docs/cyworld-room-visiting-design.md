# 싸이월드式 "방 놀러가기" (미니홈피 방문) 도입 설계 검토서

> 대상: Papyrus (NestJS + Prisma API / React+Vite web-admin)
> 범위: "유저 각자의 등록 정보 공간"을 싸이월드 미니홈피처럼 **남이 놀러와 구경하는 방**으로 확장. 데이터모델·방문(읽기전용) 플로우·프라이버시·로드맵
> 제품 방향(확정): 인물 등록 데이터는 **이미 계정 종속**. 여기에 **관계 없이 열린 읽기전용 방문**을 얹는다. **일촌(친구 그래프)·방명록(댓글)은 영구 제외.**
> 함께 보기: `docs/papy-virtual-currency-design.md`, `docs/historical-artifact-collection-design.md`
> 작성 원칙: 추측은 "(추측)"으로 명시. 인용은 실제 파일:라인 기준이며 본 검토 중 코드로 적대 검증함.

---

## 0. 한 줄 결론

**신규 도메인·스키마 0으로 시작 가능.** Papyrus는 이미 "계정별 개인 정보 공간"이고(인물·유물·코스메틱이 전부 `accountId`로 묶임), 기존 공개프로필(`/profile/:accountId`)은 친구게이트 없는 cross-account 읽기가 **이미 동작 중**이다. 따라서 "그 사람 방에 놀러가기"는 **공개프로필을 '방'으로 승격**하고, 그 위에 **cross-account 읽기전용 read 3개**(등록 인물관 · 유물 진열장 · 장착 코스메틱)만 더하면 성립한다. 투데이·방문수·파도타기·탭 구조는 데이터모델이 필요한 **선택 후속(Phase B)**. **일촌·방명록은 만들지 않는다.**

---

## 1. 배경 & 비전

### 1.1 싸이월드 미니홈피 → Papyrus 재해석

| 싸이월드 부품 | Papyrus | 상태 |
|---|---|---|
| 도토리(화폐) | **파피** 지갑 | ✅ 완성 (`wallet`) |
| 미니미(아바타) | **대표인물 + 코스메틱**(프레임·닉네임색·등급칩·뱃지) | ✅ 기반 있음 |
| 미니룸(꾸미기 공간) | **유물 진열장**(수집·진열·백과 딥링크) | ✅ 완성 (`artifact`/`/collection`) |
| 스킨/배경 | **프로필 배경 코스메틱** | ✅ 완성 |
| **그 사람 방 = 공개 프로필** | `/profile/:accountId` | 🟡 **이미 있음** (등급·점수·순위·뱃지·기여세기) |
| **놀러가기(방문)** | 인물관·유물진열장·코스메틱까지 보여주는 방 | 🆕 본 검토 대상 |
| 일촌(친구) | — | ❌ **영구 제외** |
| 방명록(댓글) | — | ❌ **영구 제외** |

### 1.2 핵심 통찰 — "방문"은 이미 깔린 배선의 작은 확장

미니홈피를 부품으로 쪼개면 Papyrus엔 대부분 이미 있고, **딱 "남의 것을 읽는 cross-account 경로"만** 비어 있다. 도토리·미니미·미니룸·스킨이 전부 구현돼 있으므로 본 작업의 본질은 **새 기능을 만드는 게 아니라 "본인 전용 읽기"를 "방문자 읽기"로 여는 것**이다.

---

## 2. 검증된 토대 — Papyrus는 이미 계정 종속이다

본 검토 중 직접 코드로 확인한 사실(이전에 "공유 백과 엔트리"로 오해했던 부분 정정):

- **로그인 필수 + 계정 스코핑**: `person.controller`는 클래스 레벨 `@UseGuards(AuthGuard('jwt'))`(`person.controller.ts:96-98`), 모든 읽기 라우트가 `const accountId = req.user?.id ?? req.user?.sub`를 뽑아 서비스에 주입.
- **인물 목록·상세는 소유자 스코프**: `findAll(accountId)` → `where: accountId != null ? { accountId } : undefined`(`person.prisma.repository.ts:745`). `findById(id, accountId)` → `findFirst({ where: { id, accountId } })`(`:998`). `findByIdWithRelations` → `where = { id, accountId }`(`:1040`). 즉 로그인해 인물 목록을 열면 **"내가 등록한 인물"만** 보인다.
- **쓰기는 소유자만**: `update`/`delete`는 `accountId` 불일치 시 차단. 모델 주석도 "본인만 수정/삭제"(`person.prisma:309`) — **write 한정** 제약.
- **이미 cross-account인 읽기 1개**: `getPublicProfile(accountId)`(`point.service.ts:713`)는 `account.findUnique({ where: { id: accountId } })`만 수행 — 요청자/친구 비교 전무. 등급·점수·순위·기여세기·뱃지·**대표인물(heroName/heroThumbnail)**까지 반환하며 `public-profile.page.tsx`가 이미 렌더 중.

> 결론: "지금까지 등록한 정보는 계정에 모두 종속되어야 한다"는 요구는 **이미 충족**돼 있다. 방문은 이 구조를 깨는 게 아니라 **읽기 방향으로 한 겹 더 여는 것**이다.

---

## 3. 무엇을 새로 만드나 — cross-account read 3개 (적대 검증으로 교정)

초기 설계는 "타인 코스메틱 반영이 **유일한** 신규작업"이라 봤으나, 코드 적대 검증 결과 **거짓**(`holds:false`). 방이 보여줘야 할 미니미·미니룸·스킨 중 cross-account가 안 되는 actor-scoped read가 복수 존재한다. 정확한 그림:

| 방 구성요소 | 현재 | 방문(cross-account) 가능? | Phase A 작업 |
|---|---|---|---|
| 미니미 아바타·등급·뱃지·순위·기여세기 | `getPublicProfile(accountId)` | ✅ **이미 cross-account** (`point.service.ts:713`) | **무변경 재사용** |
| 등록 인물관 (핵심 차별점) | `findAll(accountId)` 순수 필터지만 컨트롤러가 `req.user.id` owner-gate | ⚠️ 라우트만 막힘 | **신규 `GET /persons/by-account/:accountId`** |
| 유물 진열장 (미니룸) | `getMyCollection(actorId)` self-only, **숨김분까지 전량 반환** | ❌ | **신규 `GET /artifacts/collection/:accountId`** (서버 `displayed=true` 강제) |
| 장착 코스메틱 (스킨/프레임/닉네임색) | `useEquippedCosmetics`가 `GET /wallet/items` 본인전용에 하드와이어(`cosmetics.ts:50`), `wallet.controller` items/equip 전부 actorId 전용(`:75-125`) | ❌ | **신규 `GET /wallet/equipped/:accountId`** (equipped만 축약) |

→ **Phase A 신규 = 읽기전용 라우트 3개 + 프론트 방문 쿼리/섹션. 스키마 변경 0.**

> 참고: `GET /account/me`는 본인전용(`auth.controller.ts:132-152`)이고 `/account/:id`는 부재(grep 0건)지만, **방 헤더가 필요로 하는 대표인물 아바타는 `getPublicProfile`이 이미 내려주므로** 별도 account-by-id 엔드포인트는 Phase A에서 불필요.

---

## 4. 데이터 모델

> ⚠️ 절차: `apps/api/prisma/schema.prisma`는 머지 결과물(직접수정 금지). 소스 `libs/db/prisma/*.prisma` 수정 → `npm run db:build` → 마이그레이션. (CLAUDE.md)

### 4.1 Phase A — 스키마 변경 없음 ⭐

방문 읽기는 전부 기존 `accountId` 필터 재사용으로 충족된다. `Person.accountId`·`UserArtifact.accountId`·`UserItem.accountId`·`Account.representativePersonId`가 모두 이미 존재. **일촌/방명록 테이블은 명시적으로 만들지 않는다.** → 마이그레이션·롤백 부담 0.

### 4.2 Phase B — 선택(요구 확정 시에만)

```prisma
// (B-1) 방문 흔적 — 누적만 필요하면 카운터 하나로 충분
model Account {
  // ...
  roomVisitTotal Int @default(0) @map("room_visit_total")  // 누적 방문수
}

// (B-2) 투데이/유니크/중복제거가 실제로 필요할 때만 신설
model RoomVisit {
  id               String   @id @default(uuid()) @db.Char(36)
  visitorAccountId String   @map("visitor_account_id") @db.Char(36)
  ownerAccountId   String   @map("owner_account_id") @db.Char(36)
  visitedAt        DateTime @default(now()) @map("visited_at")
  // (일자 유니크로 중복 카운트 방지 — today 집계용)
  @@map("room_visit")
}

// (B-3) 인물관 공개정책을 per-record로 갈 때만 (openDecisions §10 참조)
model Person {
  // ...
  isPublic Boolean @default(true) @map("is_public")  // 현재 visibility 필드 전무
}
```

> `RoomVisit`은 today·중복제거 요구가 확정되기 전엔 **도입하지 않는다**(과설계 회피). 멱등 기록이 필요하면 wallet의 `requestId` 멱등 패턴을 차용.

---

## 5. 방문(놀러가기) 플로우

### 5.1 진입점 (대부분 이미 존재)

- **A (기존)**: 리더보드 행 클릭 → `openProfile(accountId)` → `pathKeys.publicProfile` → `/profile/:accountId` (`leaderboard.page.tsx:75`, `router.ts:28`, `public-profile.route.tsx`). "놀러가기"는 이 진입을 인물 카드·등록자 표기로 넓히는 정도.
- **B (접목)**: 헤더 `user-menu`에 "내 방" 추가 → `pathKeys.publicProfile(myAccountId)`. 본인 방은 읽기전용 뷰로 열되 "꾸미기" CTA로 `/profile` 설정 페이지 연결.
- **라우팅**: 라우트 신설 불필요 — `public-profile.route.tsx`(`profile/:accountId`)를 **섹션 추가로 승격**. `/room` 별도 경로·딥링크 리다이렉트 부담 회피.

### 5.2 방 로드 (4개 병렬 read)

```
(1) gamificationProfileQueryOptions(accountId)   [기존 무변경] — 미니미·등급·뱃지·기여
(2) visitedPersons(accountId)                    [신규] GET /persons/by-account/:accountId
(3) visitedCollection(accountId)                 [신규] GET /artifacts/collection/:accountId
(4) visitedCosmetics(accountId)                  [신규] GET /wallet/equipped/:accountId
```

- SDK 래퍼는 `gamificationProfileQueryOptions`·`walletItemsQueryOptions` 패턴을 그대로 복제.
- `useEquippedCosmetics(accountId?)` 한 함수만 분기 확장: 인자 없으면 기존 본인 경로, 있으면 `visitedCosmetics`.

### 5.3 읽기전용 강제 (이중 안전)

- **프론트**: `viewerIsOwner = (account.id === param accountId)`. `false`면 편집·구매·진열토글·평가 액션을 **일절 렌더하지 않음**. 본인 방이면 동일 페이지가 "내 방"이 되고 편집은 기존 `/profile` 설정 페이지로 분리 유지.
- **백엔드**: 신규 엔드포인트는 `@UseGuards(jwt)`로 로그인만 요구하고 `targetAccountId`는 route param에서 받되, **write 경로(create/update/setDisplay/equip/purchase)는 절대 노출하지 않음**. 기존 actorId 게이트가 그대로 차단하므로 이중 안전.

---

## 6. 안전·프라이버시 (적대 검증에서 도출된 함정)

본 작업의 진짜 리스크는 기능이 아니라 **"본인 전용"을 열 때의 과다 노출**이다. 검증으로 확인된 손볼 점:

1. **방문 전용 화이트리스트 DTO 필수** — `person.service.findById(id, accountId?)`는 `accountId`가 **옵셔널**이라 `undefined`를 넘기면 게이트가 풀려 인물 전체(가계도·경력·관계 등 무거운 PII)를 반환한다. 단순히 게이트를 완화하지 말고, 방문자에겐 화이트리스트 필드(표시명·대표인물·공개 유물·장착 코스메틱)만 내리는 **별도 visitor 엔드포인트/projection**을 둔다. Phase A는 인물 **목록**까지만, 상세는 후속.
2. **유물은 서버에서 `displayed=true` 강제** — `getMyCollection(accountId)`는 진열 여부 무관 **전량 반환**(`artifact.service.ts:122`)이고 진열 필터가 클라이언트에 있다(`profile.page.tsx:97`). 방문 라우트에 그대로 재사용하면 **숨긴 수집까지 유출**. owner 메서드를 오버로드하지 말고 `where: { accountId, displayed: true }`인 `getPublicCollection`을 신설. 공개 projection에서 `UserArtifact` PK·`ledgerId` 등 방문자 불필요 필드 제거.
3. **로그인 게이트는 유지됨** — `getPublicProfile`은 친구게이트는 없지만 클래스 레벨 `@UseGuards(jwt)`가 걸려 있어 **방문자도 로그인 필수**. 익명 방문을 의도하면 `@Public()`류 예외가 필요(현재는 401). → (추측) 초기엔 로그인 방문으로 충분.
4. **인물 공개는 all-or-nothing** — Person에 `isPublic`/`visibility` 필드가 **전무**(`accountId`가 유일한 경계). 읽기를 열면 그 계정의 **모든** 인물이 방문자에게 노출되고 개별 비공개가 불가 → §10 열린 결정.
5. **시드/null 소유자 주의** — `accountId=null`(시드) 인물은 `findAll(targetId)`에 안 잡히고, 반대로 무필터 호출은 전 계정 인물을 섞는다. by-account 경로는 **항상 `targetAccountId`를 명시 전달**.
6. **NestJS 라우트 순서** — 신규 정적 경로(`persons/by-account/:accountId`)는 `@Get(':id')`(`person.controller.ts:184`)보다 **위에 선언**해야 `:id`에 흡수되지 않음(기존 `infographic`·`my-evaluations`와 동일 패턴).
7. **actorId 키 혼재** — 컨트롤러마다 `req.user.userId ?? id`(wallet/artifact) vs `req.user.id ?? sub`(person)로 다름. 신규 방문 엔드포인트 작성 시 키 정합성 확인.

---

## 7. 방 구성 (roomComposition)

- **헤더(미니홈피 간판)**: 대표인물 미니미(`getPublicProfile`의 heroName/heroThumbnail) + 등급칩(`GradeChip`) + `displayName ?? username`. 여기에 방 주인 기준 **장착 코스메틱**(아바타프레임·닉네임색·프로필배경 스킨)을 적용 — `avatarFrameStyle`/`nicknameColor`/`profileBackground` 헬퍼 재사용(`cosmetics.ts`).
- **기여 요약 패널**: `PublicProfileResponseDto`(등급·점수·순위·등록건수·기여세기·뱃지) 그대로 — 추가 작업 0.
- **유물 진열장(미니룸 analog)**: 방 주인의 `displayed=true` 유물만. `rarityMeta`·`linkedEntityPath`·세트키·**백과 딥링크 유지**로 방문자에게도 "수집=탐험" 루프 노출. `profile.page.tsx`의 `ArtifactShelf` 마크업 이식.
- **등록 인물관(핵심 차별점)**: 방 주인이 등록한 Person 그리드(읽기전용). 클릭 시 편집·평가 진입점 없는 카드. 공개정책 확정 전엔 보수적 노출(§10).
- **읽기전용 강제**: §5.3.

---

## 8. 제외·전역 빈틈 처리

### 8.1 영구 제외 (제품 방향)

- **일촌(친구 그래프)**: Account↔Account 관계 테이블·요청/수락·상호팔로우 — 만들지 않음. 방문은 관계 없이 열린 읽기전용.
- **방명록·일촌평·댓글**: 모더레이션·스팸·알림 부담을 통째로 회피.

### 8.2 전역 창문 (기존에 계정 경계를 넘던 곳)

"내 방=내것만, 놀러가면 그 사람것만" 모델과 충돌하는 전역 노출 지점:

| 지점 | 현재 | 권장 |
|---|---|---|
| 국가별/왕조별 인물 리스트, 인포그래픽 국가 카운트 | `accountId 무관` 전역 집계 | **유지** — "백과/탐색" 축으로 두고, "방"과 별개 화면으로 분리(놀러가기는 방에서) |
| 리더보드·공개 프로필 | 의도적 cross-account | **유지** — 방의 진입점/코어 |
| 시드 인물(`accountId=null`) | 누구 방에도 안 뜸 | **공용 카탈로그**로 분류(방=개인 등록분, 시드=공용 배경) |

> 즉 전역 창문은 "탐색/백과" 정체성, 방은 "개인 미니홈피" 정체성으로 **양립**시킨다. 둘을 억지로 합치지 않는다.

---

## 9. 로드맵

### Phase A — 방 승격 + cross-account read 3개 (스키마 0) ⭐ 먼저

| 만든다 | 미룬다 |
|---|---|
| `GET /persons/by-account/:accountId` (findAll(targetId) 위임, **`:id` 위에 선언**) | 인물 **상세** 읽기전용(응답 무거움) |
| `GET /artifacts/collection/:accountId` (**서버 `displayed=true` 강제**, 신규 `getPublicCollection`) | 투데이/방문수/파도타기(데이터모델 필요) |
| `GET /wallet/equipped/:accountId` (equipped만 축약 projection) | 탭형 IA(초기엔 단일 스크롤) |
| 프론트: `visitedPersons`/`visitedCollection`/`visitedCosmetics` 쿼리 + `public-profile.page` 섹션 추가 + 방 주인 코스메틱 헤더 | `Person.isPublic` 공개정책 |
| `viewerIsOwner` 가드 + 헤더 user-menu "내 방" | 일촌·방명록(영구 제외) |
| SDK 재생성(build:nestia 우회) · 타입체크(NODE_OPTIONS 힙) · 변경파일 단독 lint | |

**최소 산출물**: 리더보드/링크에서 남의 방에 들어가면 그 사람의 **등록 인물 + 진열 유물 + 장착 코스메틱(스킨)**이 읽기전용으로 보인다. 본인 외 write 경로 없음.

### Phase B — 미니홈피 감성 소품 (선택)

- **방문 흔적**: `Account.roomVisitTotal` 카운터(누적). today·중복제거가 필요하면 `RoomVisit` 로그 + 멱등 기록.
- **파도타기**: `GET /room/random` — 콘텐츠 보유 공개계정 무작위 1건. 계정 수 증가 시 샘플링/인덱스 후속.
- **탭형 IA**: 섹션이 길어지면 인물관/유물관/코스메틱/기여 4탭으로 재편.
- **인물 상세 읽기전용 패널**: visitor projection 확정 후.

---

## 10. 열린 결정 (사용자 확정 필요)

1. **등록 인물관 공개정책** ← 프라이버시 영향 최대, Phase A 진입 전 확정:
   - (a) **전체공개** — 스키마 0, 단 개인이 등록한 민감 인물도 방문자에게 노출(all-or-nothing).
   - (b) **`Person.isPublic` 신설** — 개별 통제 가능, 폼·마이그레이션·기본값 백필 부담.
   - (c) **보수 시작** — Phase A는 "대표인물 + 명시 공개분"만, 정책은 후속.
2. **유물 기본 공개 범위** — `displayed @default(true)`(`artifact.prisma:84`)라 구매 즉시 진열(opt-out). 서버 `displayed=true` 필터는 맞지만 "안 숨긴 건 다 보임"이 기본 — 이대로 둘지.
3. **방문수/투데이를 Phase B에 넣을지** — 넣는다면 `roomVisitTotal` 카운터로 충분한지, today·중복제거를 위해 `RoomVisit` 로그가 필요한지(체류·바이럴 지표를 보고 싶은지).
4. **코스메틱 노출 범위** — equipped만 내릴지(권장), 미장착 보유분/잔액/구매이력은 전면 차단 확정.
5. **단일 스크롤 vs 탭** — Phase A 단일 스크롤 권장. 싸이월드 감성을 초기부터 강하게 원하면 탭.

---

## 11. 리스크

| 리스크 | 대응 |
|---|---|
| **과다 노출**(옵셔널 게이트 완화 시 전체 PII) | 방문 전용 화이트리스트 DTO/엔드포인트 신설. owner 메서드 오버로드 금지 |
| **숨긴 유물 유출** | cross-account 라우트에 서버측 `displayed=true` 강제(`getPublicCollection`) |
| **개별 비공개 불가**(Person에 visibility 부재) | §10-1 공개정책 결정. 보수 시작 권장 |
| **읽기 엔드포인트 분산**(person/artifact/wallet/gamification 4곳) | Phase A는 분산 유지(과설계 회피). 화면 쿼리 수가 부담되면 방 전용 BFF/aggregator 후속 |
| **라우트 흡수·키 혼재** | by-account 정적 경로를 `:id` 위에 선언, `req.user` 키 정합성 확인 |
| **방의 시각적 정체성 약함**(공개프로필+섹션) | Phase B 소품(투데이/파도타기/탭/스킨)으로 미니홈피 감성 보강 |

---

### 부록: 핵심 코드 인용 (적대 검증 기준)

- cross-account 코어: `point.service.ts:713` `getPublicProfile` (친구게이트 X, 로그인 게이트 O / 등급·점수·순위·뱃지·heroName/heroThumbnail)
- 인물 순수 필터: `person.prisma.repository.ts:745`(findAll)/`:998`(findById)/`:1040`(findByIdWithRelations); owner-gate 컨트롤러 `person.controller.ts:96-98, 184-187`
- 유물 전량 반환(클라 필터): `artifact.service.ts:122` `getMyCollection`, `profile.page.tsx:97` displayed 필터; self-only 라우트 `artifact.controller.ts:52-55`
- 코스메틱 self-only: `cosmetics.ts:50` `useEquippedCosmetics`→`/wallet/items`, `wallet.controller.ts:75-125` actorId 전용
- account self-only: `auth.controller.ts:132-152` `GET /account/me`; `/account/:id` 부재
- 스키마: `artifact.prisma:84` `displayed @default(true)`; `person.prisma` visibility 필드 부재, 주석 "본인만 수정/삭제"(write 한정)
- 진입/라우팅: `leaderboard.page.tsx:75` openProfile, `router.ts:28` `pathKeys.publicProfile`, `public-profile.route.tsx`, `browser-router.tsx:183`
- **추측 표기**: `RoomVisit` 도입 시점, `Person.isPublic` 채택, 익명 방문 허용, 방 전용 aggregator — 모두 제품 결정(§10) 입력 필요.
