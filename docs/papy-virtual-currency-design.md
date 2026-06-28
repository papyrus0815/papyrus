# 파피(구매형 가상재화) 도입 설계 검토서

> 대상: Papyrus (NestJS + Prisma API / React+Vite web-admin)
> 범위: Cyworld 파피식 **구매형 가상재화**의 데이터 모델·플로우·리스크·로드맵
> 근거: 코드베이스 4개 영역 매핑 결과 + 직접 확인한 스키마 소스(`libs/db/prisma/gamification.prisma`, `common.prisma`)
> 작성 원칙: 추측은 "(추측)"으로 명시. 인용은 실제 파일 경로/모델명 기준.

---

## 결정 반영 (2026-06-24)

이 문서의 일반 설계 위에, 실제 구현은 다음 결정을 따른다:

- **화폐명 = 파피(Papy)** — Papyrus 마스코트형 고유명사(도토리 대체). 스키마 식별자: `Account.papyBalance` / `ShopItem.pricePapy` / `PromoCode.papyAmount`.
- **실결제 PG는 지금 보류** — Phase 1(아래 3·8장)로 연기(영구 제거 아님). Phase 0는 **결제 0원 폐쇄경제**. `WalletReason.PURCHASE_TOPUP`은 미사용 예약값으로만 존재, `TopupOrder`/웹훅/PG 컬럼은 미생성.
- **Phase 0 화폐 획득 경로 = ① 포인트→파피 단방향 환전(`POINT_EXCHANGE`, 한도제) ON + ② 운영 수동지급(`ADMIN_GRANT`) + ③ 프로모코드(`PROMO_CODE`).** 기여로 쌓은 점수가 파피로 환전돼 화폐가 organically 유통됨.
- **실제 스키마 = `libs/db/prisma/wallet.prisma`** (Phase 0: `WalletLedger`/`ShopItem`/`UserItem`/`PromoCode` + enum `WalletReason`/`ItemCategory`). 본문 2.3의 스키마 스케치와 차이: Phase 0에서 `TopupOrder`(PG)는 제외, `PromoCode` 포함. 마이그레이션 `add_wallet` + `rename_wallet_currency_papy` 적용 완료.

---

## 0. 한 줄 결론

기존 적립형 점수(`PointEntry`)와 **파피는 절대 합치지 말고 이원 통화로 분리**한다. 파피는 별도 원장(`WalletLedger`) + 서버 권위 잔액 캐시(`Account.papyBalance`)로 두되, **PointEntry의 검증된 원장 패턴(트랜잭션 원자성·멱등 unique·재계산 캐시)은 그대로 차용**한다. 실결제 PG는 현재 코드에 전무하므로 **Phase 0(수동충전/프로모코드/포인트 환전, 결제 0원)** 으로 먼저 내부 폐쇄경제를 검증하고, PG는 Phase 1로 미룬다.

---

## 1. 핵심 결정: 적립형 포인트 vs 구매형 재화

### 1.1 두 통화의 본질 차이

| 항목 | 기존 점수 (earned / soft) | 파피 (paid / hard) |
|---|---|---|
| 모델 | `PointEntry` (`gamification.prisma`) | 신규 `WalletLedger` (제안) |
| 획득 경로 | 콘텐츠 등록·완성도 보너스 (`awardForCreate`) | **현금 결제 / 운영 지급 / 포인트 환전** |
| 성격 | 기여도·명예 지표 (랭킹/등급/뱃지) | **실금전 가치**(선불전자지급수단에 준함) |
| 소멸/회수 | 콘텐츠 삭제 시 음수 회수행 | 환불은 역분개, **임의 삭감 불가**(분쟁 리스크) |
| 법적 함의 | 없음 | 전자금융거래법·청약철회·세무 (7장) |
| 인플레이션 통제 | 점수는 인플레여도 무해 | **현금성 → 발행량 통제 필수** |

핵심: **점수는 "명예", 파피는 "돈"이다.** 회계 무결성·법규·환불 책임의 수준이 근본적으로 다르므로 같은 원장에 섞으면 안 된다.

### 1.2 단일 통화 vs 이원 통화 — 권장: **이원 통화 분리**

게임/SNS 업계 표준은 **dual-currency**다 (예: 소프트=골드/경험치, 하드=캐시/젬). Cyworld 자체도 "파피(현금성)"와 별개의 활동성 지표를 운영했다.

**이 프로젝트 맥락의 권장 근거:**

1. **회계 분리** — 파피는 미실현 매출(선수금) 성격. 점수 합계(`Account.totalPoints`)에 섞으면 재무 마감·환불 정산이 불가능.
2. **삭감 정책 충돌** — 점수는 콘텐츠 삭제 시 `revokeForRecord`로 음수 회수가 정당하지만(`point.service.ts`), 파피를 같은 로직으로 회수하면 **사용자 돈을 임의로 깎는 것**이 되어 분쟁·법적 리스크.
3. **리더보드 공정성** — 파피를 점수에 합산하면 "돈으로 산 랭킹"이 되어 게이미피케이션의 기여 측정 의미가 붕괴. `getLeaderboard`(`point.service.ts`)는 순수 기여만 반영해야 한다.
4. **인플레이션 격벽** — 포인트→파피 환전을 허용하더라도(Phase 0), **환전 게이트를 단방향·한도제로 둬야** 통제 가능. 통화가 합쳐지면 통제점이 사라진다.

> **결정: earned(점수) / paid(파피) 이원 분리. 두 통화 간 이동은 오직 "포인트→파피 환전"이라는 명시적·단방향·한도제 게이트로만 허용(Phase 0 옵션). 파피→포인트 역환전은 금지.**

---

## 2. 데이터 모델 설계

### 2.1 잔액: Account 캐시 필드 + 별도 원장 (둘 다)

`PointEntry`가 이미 검증한 패턴 — **원장(진실의 원천) + Account 비정규화 캐시(`totalPoints`/`gradeCode`)** — 을 그대로 복제한다.

- **진실의 원천**: `WalletLedger` (모든 입출 1건=1행, append-only)
- **빠른 조회 캐시**: `Account.papyBalance` (= `SUM(WalletLedger.amount)`, 트랜잭션마다 재계산)

이유: 매 화면(헤더/프로필/상점)에서 잔액을 보여줘야 하는데 매번 원장 SUM은 비효율. `point.service.ts`의 `recalcAccount(tx, accountId)` 패턴을 그대로 차용.

### 2.2 기존 PointEntry 원장 재사용 — 가능성과 한계

**재사용 가능한 패턴 (그대로 차용):**
- 트랜잭션 원자성: `prisma.$transaction(async tx => { ledger.create + recalcAccount })`
- 멱등 unique 제약: `PointEntry @@unique([accountId, ownerType, recordId, reason])` → `WalletLedger @@unique([idempotencyKey])`
- 캐시 재계산: `recalcAccount` = `aggregate(SUM) → Account.update`

**한계 — PointEntry를 직접 확장하면 안 되는 이유:**

| 한계 | 설명 |
|---|---|
| `amount Int` 단위 | 점수는 정수 OK. 파피도 정수(1파피=정수)는 가능하나, **실결제 금액(KRW)**은 별도 필드 필요(부가세·환불 부분취소). |
| reason enum 오염 | `PointReason`에 `PURCHASE`/`REFUND`를 넣으면 리더보드 집계(`groupBy`)가 파피 거래를 오염. **enum 공유 금지.** |
| 세기/국가 컬럼 | `contentCentury`/`contentCountryId`는 파피에 무의미. 스키마 군더더기. |
| 삭제 회수 의미 | `CONTENT_DELETED` 음수행은 콘텐츠 라이프사이클 종속. 파피는 콘텐츠와 무관. |

> **결론: 패턴은 차용, 테이블은 분리.** `WalletLedger`를 신규 생성한다. (매핑이 제안한 "PointEntry를 LedgerEntry로 rename + type 컬럼" 방식은 마이그레이션 위험·집계 오염 때문에 비권장.)

### 2.3 새 .prisma 파일 초안 (필드 수준 스케치)

> ⚠️ **절차 준수**: `apps/api/prisma/schema.prisma`는 머지 결과물(직접 수정 금지). **반드시 `libs/db/prisma/wallet.prisma`(신규)에 작성** → `npm run db:build` → `ts-node libs/db/prisma/run-migrate.ts add_wallet`. (CLAUDE.md 규칙)
>
> ⚠️ 아래는 **초안 스케치**이며 필드명/타입은 리뷰 대상(추측 포함).

**신규 파일: `libs/db/prisma/wallet.prisma`**

```prisma
/// 파피(구매형 가상재화) 잔액 원장. 1건 = 1입출. append-only.
/// PointEntry(점수)와 의도적으로 분리 — 회계/법규/삭감정책이 다름.
model WalletLedger {
  id            String          @id @default(uuid()) @db.Char(36)
  accountId     String          @map("account_id") @db.Char(36)

  /// 증감 파피 (+충전/환불 / -소비). 정수.
  amount        Int

  /// 거래 사유 — PointReason과 별개 enum
  reason        WalletReason    @map("reason")

  /// 역분개(reversal) 시 원거래를 가리킴. 환불/취소 추적.
  reversalOfId  String?         @map("reversal_of_id") @db.Char(36)

  /// 멱등성 키 — 충전 재시도/네트워크 중복 방어. PG주문ID·프로모코드·소비요청ID.
  idempotencyKey String         @map("idempotency_key") @db.VarChar(120)

  /// 거래 시점 비정규화 스냅샷 (PointEntry.contentCentury 패턴 차용)
  relatedOrderId   String?      @map("related_order_id") @db.Char(36)  // 충전 주문
  relatedItemId    String?      @map("related_item_id") @db.Char(36)   // 소비 상품
  /// 운영자 추적(ADMIN_GRANT/조정 시) — actor-context의 accountId
  actorAccountId   String?      @map("actor_account_id") @db.Char(36)

  createdAt     DateTime        @default(now()) @map("created_at")

  account       Account         @relation(fields: [accountId], references: [id])

  /// 동일 거래 중복 차단 — 이중충전/이중과금 1차 방어선 (PointEntry uniq 패턴)
  @@unique([idempotencyKey], name: "uniq_wallet_idem")
  @@index([accountId], name: "idx_wallet_account")
  @@index([reason], name: "idx_wallet_reason")
  @@map("wallet_ledger")
}

enum WalletReason {
  PURCHASE_TOPUP    // 실결제 충전 (Phase 1)
  ADMIN_GRANT       // 운영 수동 지급 (Phase 0)
  PROMO_CODE        // 프로모션 코드 (Phase 0)
  POINT_EXCHANGE    // 적립 포인트 환전 (Phase 0, 단방향)
  CONSUME           // 상품 구매 소비 (음수)
  REFUND_REVERSAL   // 환불 역분개
  ADMIN_ADJUST      // 운영 보정 (역분개 권장)
}

/// 충전 주문 (Phase 0=수동/프로모, Phase 1=PG)
model TopupOrder {
  id              String        @id @default(uuid()) @db.Char(36)
  accountId       String        @map("account_id") @db.Char(36)
  papyAmount    Int           @map("papy_amount")     // 지급 파피
  priceKrw        Int           @default(0) @map("price_krw") // 실결제 원화 (Phase0=0)
  status          TopupStatus   @default(PENDING)
  /// PG 연동 필드 (Phase 1) — 현재 미사용
  pgProvider      String?       @map("pg_provider") @db.VarChar(40)  // "toss" | "iamport" (추측)
  pgPaymentKey    String?       @map("pg_payment_key") @db.VarChar(200)
  pgOrderId       String?       @map("pg_order_id") @db.VarChar(120)
  idempotencyKey  String        @map("idempotency_key") @db.VarChar(120)
  createdAt       DateTime      @default(now()) @map("created_at")
  paidAt          DateTime?     @map("paid_at")
  account         Account       @relation(fields: [accountId], references: [id])
  @@unique([idempotencyKey], name: "uniq_topup_idem")
  @@unique([pgOrderId], name: "uniq_topup_pg_order")
  @@index([accountId])
  @@map("topup_order")
}

enum TopupStatus { PENDING PAID FAILED CANCELED REFUNDED }

/// 상품 카탈로그 (코스메틱 SKU). cosmetic-sellables 후보 반영.
model ShopItem {
  id            String      @id @default(uuid()) @db.Char(36)
  category      ItemCategory
  code          String      @unique @db.VarChar(80)   // SKU
  name          String      @db.VarChar(120)
  pricePapy   Int         @map("price_papy")
  /// 카테고리별 표현 메타 (JSON) — 프레임 색/그라데이션/배경 등
  payload       Json?
  thumbnailUrl  String?     @map("thumbnail_url") @db.VarChar(500)
  isActive      Boolean     @default(true) @map("is_active")
  sortOrder     Int         @default(0) @map("sort_order")
  createdAt     DateTime    @default(now()) @map("created_at")
  ownerships    UserItem[]
  @@map("shop_item")
}

enum ItemCategory {
  AVATAR_FRAME      // 아바타 프레임
  NICKNAME_COLOR    // 닉네임 색상
  GRADE_THEME       // 등급 칩 테마
  BADGE_FRAME       // 뱃지 테두리
  PROFILE_THEME     // 프로필 배경/테마
}

/// 인벤토리/소유 — 구매한 코스메틱.
model UserItem {
  id           String     @id @default(uuid()) @db.Char(36)
  accountId    String     @map("account_id") @db.Char(36)
  itemId       String     @map("item_id") @db.Char(36)
  ledgerId     String?    @map("ledger_id") @db.Char(36) // 소비 WalletLedger 행
  equipped     Boolean    @default(false)  // 현재 적용 여부
  purchasedAt  DateTime   @default(now()) @map("purchased_at")
  account      Account    @relation(fields: [accountId], references: [id])
  item         ShopItem   @relation(fields: [itemId], references: [id])
  /// 동일 코스메틱 중복 구매 차단
  @@unique([accountId, itemId], name: "uniq_user_item")
  @@index([accountId])
  @@map("user_item")
}
```

**`Account` 확장 (`libs/db/prisma/common.prisma` 소스 수정):**

```prisma
// model Account 내 추가 (totalPoints/gradeCode 캐시 패턴 차용)
papyBalance   Int            @default(0) @map("papy_balance")  // WalletLedger SUM 캐시
walletLedger    WalletLedger[]
topupOrders     TopupOrder[]
userItems       UserItem[]
// 코스메틱 "현재 장착" 캐시 (선택) — 렌더 시 N+1 회피
equippedFrameId      String?   @map("equipped_frame_id") @db.Char(36)
equippedNameColorId  String?   @map("equipped_name_color_id") @db.Char(36)
equippedProfileThemeId String? @map("equipped_profile_theme_id") @db.Char(36)
```

### 2.4 멱등성 키 전략

| 시나리오 | 멱등 키 | 방어 대상 |
|---|---|---|
| 충전(수동/프로모) | `PROMO:{code}:{accountId}` 또는 `ADMIN:{orderId}` | 프로모 중복 사용 |
| 충전(PG, Phase 1) | PG `paymentKey` / `pgOrderId` | 웹훅 중복 수신·재시도 이중과금 |
| 소비 | 클라이언트 생성 `requestId`(UUID) | 더블클릭·네트워크 재시도 이중차감 |
| 환불 | `REVERSAL:{originalLedgerId}` | 이중환불 |

`WalletLedger @@unique([idempotencyKey])` + P2002 예외 처리(`point.service.ts`의 `skipDuplicates`/P2002 패턴 차용)로 1차 방어.

---

## 3. 충전(구매) 플로우

### 3.1 현재 상태 명시

- **실결제 PG 연동 코드는 현재 전무함** (Toss/아임포트/Stripe 클라이언트, 웹훅 핸들러, `Payment`/`Order`/`Refund` 모델 모두 없음 — 매핑 확인).
- `references.prisma`의 `Currency` 모델은 **역사 데이터 참조용**(화폐 코드/심볼)이며 실결제와 무관.
- 인증/행위자 컨텍스트는 존재: `apps/api/src/libs/shared/actor-context.ts`(ALS `getActorAccountId`), `actor-context.interceptor.ts` → 충전 행위자 자동 추적에 재사용 가능.

### 3.2 단계적 접근

**Phase 0 — 결제 없는 폐쇄경제 (PG 미연동):**

```
1. 운영 수동 충전:  admin → POST /wallet/admin/grant { accountId, amount }
   → $transaction { WalletLedger.create(reason=ADMIN_GRANT, idem=ADMIN:{uuid})
                    + recalcAccount(papyBalance) }
2. 프로모 코드:     POST /wallet/redeem { code }
   → idem=PROMO:{code}:{accountId} → unique 위반 시 "이미 사용" 반환(멱등)
3. 포인트 환전:     POST /wallet/exchange { points }
   → 한도/환율 검증 → $transaction {
        PointEntry.create(reason=ADMIN_ADJUST, amount=-points)   // 포인트 차감
        + WalletLedger.create(reason=POINT_EXCHANGE, amount=papy) // 파피 적립
        + recalcAccount(totalPoints, papyBalance) }   // 두 캐시 동시 갱신
```

> 환전은 **단방향(포인트→파피만)·일일한도·고정환율**. 역환전 금지(인플레 차단, 7장).

**Phase 1 — 실결제 PG 연동 (국내: 토스페이먼츠 또는 아임포트) (추측: PG 선택은 비즈/정산 조건에 따름):**

```
1. POST /wallet/topup/initiate { papyAmount }
   → TopupOrder.create(status=PENDING, priceKrw, idem)
   → PG 결제창 파라미터 반환
2. 클라이언트 결제창 → PG 승인
3. PG 웹훅 수신: POST /wallet/topup/webhook
   → 서명검증 → pgPaymentKey로 멱등(unique) → PG 승인 재검증(서버→PG 조회)
   → $transaction { TopupOrder.status=PAID
                    + WalletLedger.create(reason=PURCHASE_TOPUP, idem=paymentKey)
                    + recalcAccount }
   → NotificationService로 "충전 완료" 알림 (기존 공유피드 구조 재사용)
```

### 3.3 불변 규칙

1. **서버 권위 잔액** — 클라이언트가 보낸 잔액·가격 절대 신뢰 금지. 가격은 `ShopItem.pricePapy`를 서버에서 조회. 파피 지급량은 서버가 `TopupOrder`/PG 승인액 기준으로 산정.
2. **멱등 충전** — 모든 충전은 `idempotencyKey` unique. PG 웹훅은 본질적으로 중복 수신되므로 필수.
3. **음수 방지** — 잔액 캐시(`papyBalance`)는 절대 음수 불가. 소비는 4장의 원자적 차감으로 강제.

---

## 4. 소비(구매 사용) 플로우

### 4.1 무엇을 살 수 있나 (cosmetic-sellables 후보 정리)

| 카테고리 (`ItemCategory`) | 표시 위치 (코드 근거) | DB payload 예 |
|---|---|---|
| **AVATAR_FRAME** 아바타 프레임 | `profile.page.tsx` 라인 111-118, `leaderboard.page.tsx` 라인 42-56, `user-menu.ui.tsx` 라인 97-107 | `{ borderColor, borderWidth, shadowColor, shadowBlur }` |
| **NICKNAME_COLOR** 닉네임 색 | `profile.page.tsx` 라인 120(HeroName), `user-menu.ui.tsx` 라인 100, `public-profile.page.tsx` 라인 43 | `{ lightValue, darkValue }` (라/다크 대비) |
| **GRADE_THEME** 등급 칩 테마 | `entities/gamification/grade-badge.ui.tsx` 라인 55-72 (`$bg`/`$color`) | `{ bgGradient, fgColor, borderColor }` |
| **BADGE_FRAME** 뱃지 테두리 | `entities/gamification/badge-list.ui.tsx` 라인 62-74 (`IconWrap $color`) | `{ borderStyle, shadowEffect, animationName }` |
| **PROFILE_THEME** 프로필 배경 | `profile.page.tsx` 라인 707-723 (Hero `background`) | `{ bgImageUrl, bgGradient, bgSolidColor }` |

이들은 **순수 코스메틱(능력치·랭킹 영향 없음)** 이라 게임 밸런스 리스크가 낮아 MVP 판매 품목으로 적합. (P2W 논란 회피.)

### 4.2 차감 트랜잭션 — 동시성·멱등·원자성

더블클릭/동시요청으로 인한 **마이너스 잔액**이 최대 리스크. 단순 "읽고→검사→쓰기"는 race condition에 취약.

**권장: 조건부 UPDATE로 원자적 차감 (애플리케이션 락 불요):**

```sql
-- 잔액이 충분할 때만 차감 (원자적, race-safe)
UPDATE account SET papy_balance = papy_balance - :price
 WHERE id = :accountId AND papy_balance >= :price;
-- affectedRows == 0 이면 잔액 부족 → 트랜잭션 롤백
```

전체 소비 트랜잭션:
```
POST /wallet/purchase { itemId, requestId }
$transaction(SERIALIZABLE 또는 위 조건부 UPDATE) {
  1. price = ShopItem.pricePapy (서버 조회)
  2. 조건부 UPDATE account ... WHERE papy_balance >= price  // 음수 방지+동시성
     → affected=0 → throw "잔액 부족"
  3. WalletLedger.create(reason=CONSUME, amount=-price, idem=requestId)
       → unique(idempotencyKey) 위반 = 이미 처리됨(멱등) → 기존 결과 반환
  4. UserItem.create(@@unique[accountId,itemId])  // 중복구매 차단
}
notify.success('아이템을 구매했습니다.')  // 기존 @/shared/ui/toast 재사용
```

- **원자성**: 잔액차감·원장기록·소유생성이 한 트랜잭션.
- **멱등성**: `requestId` unique → 재시도해도 1회만 차감.
- **동시성**: 조건부 UPDATE의 `WHERE balance >= price`가 race를 DB 레벨에서 차단.
- **캐시 일관성**: `papyBalance` 캐시를 직접 갱신하므로 원장 SUM과 주기적 정합성 검증(reconcile) 배치 권장(추측).

---

## 5. 환불·회수·감사

### 5.1 기존 "회수행 삭제" 복구 패턴과의 정합성

기존 점수 시스템의 복구는 **행 삭제**다:
- `restoreForRecord` → `deleteMany(reason=CONTENT_DELETED)` (소프트삭제 콘텐츠 복구 시 회수행 자체를 삭제 → 점수 원복) — `point.service.ts`.

이 패턴은 **점수에서는 정당**하다. 점수는 돈이 아니고, 콘텐츠 라이프사이클에 종속된 "파생 명예"이기 때문에 회수행을 지워 상태를 되돌려도 회계적 문제가 없다.

### 5.2 구매형 재화는 왜 "삭제"가 아니라 "역분개(reversal entry)"여야 하나

| 이유 | 설명 |
|---|---|
| **감사 무결성** | 파피=현금성. 거래행을 삭제하면 "결제가 있었다가 없어진" 상태가 되어 PG 정산·세무·분쟁 대응이 불가능. 원장은 **append-only(불변)** 여야 한다. |
| **부분 환불** | 충전 1건을 부분 취소할 수 있어야 함. 삭제는 전부/전무만 가능, 역분개는 금액 단위 보정 가능. |
| **법적 추적** | 청약철회·환불은 "언제 누가 얼마를 되돌렸는지" 증빙 필요. `reversalOfId`로 원거래를 가리켜야 함. |
| **이중환불 방지** | `idem=REVERSAL:{originalLedgerId}` unique로 같은 거래 두 번 환불 차단. 삭제 방식엔 이 안전장치가 없음. |

**환불/회수 플로우:**
```
POST /wallet/refund { ledgerId }   // 원거래 지정
→ 이미 역분개됐는지 확인 (reversalOfId 역참조)
→ $transaction {
     WalletLedger.create(reason=REFUND_REVERSAL,
                         amount = -original.amount,   // 부호 반전
                         reversalOfId = ledgerId,
                         idem = REVERSAL:{ledgerId})
     + recalcAccount(papyBalance)
     + (PG 환불 API 호출, Phase 1)
     + ActionLog 기록 (ownerType=WALLET, method=...)  // 감사
   }
```

> **원칙: 파피 원장은 절대 행을 삭제하지 않는다. 모든 취소는 반대부호 역분개행으로 처리.** (점수 시스템의 "삭제 복구"와 의도적으로 다르게 설계.)

### 5.3 감사(Audit)

- 모든 파피 거래에 `actorAccountId`(ALS의 `getActorAccountId`) 기록 → 운영자 지급·보정 추적.
- `ActionLog`(`common.prisma`) 재사용: `ownerType=WALLET/ORDER`, `method=CREATE/DELETE`로 거래 감사 로그 적재.
- (추측) 부정결제·자동화 공격 대비 레이트리밋·이상거래 탐지는 Phase 2 이후 별도 과제.

---

## 6. 변경 절차 & 작업 범위

### 6.1 스키마 (CLAUDE.md 규칙 엄수)

```
1. libs/db/prisma/wallet.prisma  신규 작성 (2.3 초안)
2. libs/db/prisma/common.prisma  Account에 papyBalance 등 추가 (소스 직접 수정)
3. npm run db:build               # → apps/api/prisma/schema.prisma 머지 (직접수정 금지)
4. ts-node libs/db/prisma/run-migrate.ts add_wallet   # 빌드+migrate dev+generate
```
> ⚠️ `apps/api/prisma/schema.prisma`만 고치면 `db:build`가 덮어써 사라짐 — **반드시 소스 파일부터.**

### 6.2 API 모듈/DTO

`apps/api/src/libs/wallet/` 신규 (도메인 표준 레이어 따름):
- `domain/` — `wallet.policy.ts`(환율/한도/가격 상수, `point.policy.ts` 대응)
- `application/wallet.service.ts` — `topup`/`consume`/`refund`/`getBalance`/`recalcAccount`. **`point.service.ts`의 `$transaction`+멱등+`recalcAccount` 패턴 차용**
- `presentation/wallet.controller.ts` + `dto/` — `gamification.controller.ts` 패턴
- `wallet.module.ts` — `@Global()` 불요(게이미피케이션과 달리 주입 전파 적음, 추측)

### 6.3 nestia SDK 재생성

- `npm run build:nestia`. **단, 무동작 우회 알려짐**(MEMORY: build-nestia-noop-workaround) → main() 직접 호출 또는 `nestia all` 수동 실행.
- 생성물: `apps/api/src/api/functional/wallets/` (또는 `wallet/`).
- 프론트는 직접 import 금지 → `apps/web-admin/src/shared/api/wallet.ts` 래퍼 신규(`persons.ts` 패턴: SDK import + `getConnection()` + Relaxed 타입 완화).

### 6.4 web-admin

| 레이어 | 산출물 | 재사용 |
|---|---|---|
| shared/api | `wallet.ts` 래퍼 | `api.service.ts`(401 refresh), `persons.ts` 패턴 |
| shared/router | `shop()`/`shopDetail()`/`wallet()` pathKeys | 기존 동적경로 함수 패턴 |
| entities | `entities/wallet`(잔액 모델), `entities/shop` | `entities/country` 구조 |
| features | `features/shop/api`·`ui`(ItemCard) | FSD 표준 |
| widgets | `widgets/shop`(상점패널), 헤더 잔액칩 | `user-menu.ui.tsx` |
| pages | `pages/shop/shop.page.tsx`, `wallet.page.tsx` | lazy route |
| 공용 UI | 구매 확인 `confirm()`, 결과 `notify()`, 충전 `Modal` | `@/shared/ui/{modal,toast,confirm-dialog}` (MEMORY: toast/confirm 통일) |
| 적용(장착) | `AccountMeResponseDto`에 `equippedFrameId` 등 추가 → 프로필/리더보드/헤더 렌더 분기 | styled-components `$frameId`/`$customColor` props |

> 타입체크: web-admin은 `NODE_OPTIONS=--max-old-space-size=12288` + exit code 확인 필수 (MEMORY: web-admin-typecheck). 새 코드 ESLint 한 글자 변수 금지.

---

## 7. 리스크

### 7.1 법규 (실결제 = Phase 1 한정, 매우 중요)

| 리스크 | 대응 |
|---|---|
| **전자금융거래법** — 파피는 "선불전자지급수단" 해당 가능. 발행 규모에 따라 등록·이용자보호 의무. | (추측) 법무 검토 필수. 발행한도·미상환잔액 관리. |
| **청약철회/환불** — 전자상거래법: 미사용 유료재화 환불 의무. | 미사용 파피 환불 정책 + 부분환불(역분개) 지원. |
| **표시·약관** — 유효기간·환불기준·소비자분쟁해결기준 고지. | 충전 화면 약관 동의 플로우. |
| **세무/회계** — 선수금 인식·매출 시점·부가세. | `priceKrw` 원장 분리(2.3)로 회계 추출 가능하게. |

> Phase 0(결제 0원, 폐쇄경제)는 위 법규 대부분을 회피한다. **실결제 전 법무 검토는 게이트.**

### 7.2 보안

- 서버 권위 잔액(가격/지급량 서버 산정), 음수 방지(조건부 UPDATE), 멱등키(이중과금), **PG 웹훅 서명검증+서버→PG 재조회**(재생공격·위조 방어).

### 7.3 회계 무결성

- 원장 append-only, 역분개만 허용(5장). `papyBalance` 캐시 ↔ 원장 SUM **정합성 reconcile 배치**(추측, Phase 2).

### 7.4 게임 밸런스 (인플레이션)

- 포인트→파피 환전을 열면 **점수가 곧 돈**이 됨 → 콘텐츠 어뷰징으로 점수 양산 → 파피 인플레.
- 대응: 환전 **단방향·일일한도·낮은 환율·관리자 토글**. 처음엔 환전을 끄고(`POINT_EXCHANGE` 비활성) 운영 데이터 확인 후 개방 권장.

---

## 8. 권장 MVP 범위와 로드맵

### Phase 0 — 폐쇄경제 MVP (결제 없음) ⭐ 먼저 출시

**목표: 파피 경제·소비·코스메틱을 결제/법규 리스크 없이 검증.**

| 만든다 | 미룬다 |
|---|---|
| `wallet.prisma`(`WalletLedger`/`ShopItem`/`UserItem`), `Account.papyBalance` | PG·`TopupOrder.pg*`·웹훅 |
| 운영 수동 충전(`ADMIN_GRANT`) + 프로모코드(`PROMO_CODE`) | 실결제 충전 |
| 소비 트랜잭션(조건부 UPDATE 음수방지+멱등) | 부분환불 자동화 |
| 코스메틱 5종(아바타프레임/닉네임색/등급테마/뱃지프레임/프로필테마) 카탈로그 + 장착 | 애니메이션·홀로그램 등 고급 표현 |
| 상점 페이지·헤더 잔액칩·구매 confirm/notify | 결제 화면 |
| (옵션, 토글 OFF로 시작) 포인트→파피 단방향 환전 | 역환전(영구 금지) |

**최소 산출물**: 운영자가 파피를 지급/프로모 발급 → 사용자가 상점에서 코스메틱 구매 → 프로필/리더보드/헤더에 장착 반영. 환불은 운영자 수동 역분개.

### Phase 1 — 실결제 PG 연동

**전제: 법무 검토 통과(7.1).**
- `TopupOrder` PG 필드 활성, 토스/아임포트(추측) 연동, 웹훅(서명검증+재조회), 충전 화면, 셀프 환불(역분개+PG환불 API), 충전/환불 알림(`NotificationService` 재사용).
- **최소 산출물**: 사용자가 카드로 파피 충전 → 웹훅 멱등 처리 → 잔액 반영 → 환불 정책 동작.

### Phase 2 — 운영·확장

- 이상거래 탐지·레이트리밋, 정산/리포팅 대시보드(유입/유출/소비분포 — `getLeaderboard` `groupBy` 패턴 차용), 잔액 reconcile 배치, 선물하기, 한정판/기간상품, (검토 후) 환전 개방.

---

### 부록: 핵심 인용 경로

- 원장 패턴 원천: `libs/db/prisma/gamification.prisma`(`PointEntry`, `@@unique([accountId, ownerType, recordId, reason])`), `apps/api/src/libs/gamification/application/point.service.ts`(`$transaction`+`recalcAccount`+P2002)
- Account 캐시 패턴: `libs/db/prisma/common.prisma`(`totalPoints`/`gradeCode`)
- 행위자 컨텍스트: `apps/api/src/libs/shared/actor-context.ts`
- 코스메틱 표시 지점: `apps/web-admin/src/pages/profile/profile.page.tsx`(라인 111-120, 707-723), `entities/gamification/grade-badge.ui.tsx`(55-72), `entities/gamification/badge-list.ui.tsx`(62-74), `widgets/header/user-menu.ui.tsx`(97-107)
- 공용 UI: `apps/web-admin/src/shared/ui/{modal,toast/notify.tsx,confirm-dialog/confirm.tsx}`
- 스키마 절차: `libs/db/prisma/wallet.prisma`(신규) → `npm run db:build` → `ts-node libs/db/prisma/run-migrate.ts add_wallet` (CLAUDE.md)

**추측으로 표시한 항목 요약**: PG 사업자 선택(토스/아임포트), `@Global()` 불요 판단, reconcile 배치 도입 시점, 환전 개방 시점, 이상거래 탐지 구현 시점 — 모두 비즈니스/법무 입력 필요.
