# 역사 유물 수집 (Papyrus 미니룸) 도입 설계 검토서

> 대상: Papyrus (NestJS + Prisma API / React+Vite web-admin)
> 범위: 싸이월드 미니룸식 "역사 유물 수집" 도메인의 데이터 모델·획득/진열 플로우·콘텐츠 링크·로드맵
> 전제: 파피(구매형 가상화폐) 경제는 이미 완성 — 본 문서는 그 위에 얹는 수집 도메인 설계. 함께 보기: `docs/papy-virtual-currency-design.md`
> 작성 원칙: 추측은 "(추측)"으로 명시. 인용은 실제 파일/모델/패턴 기준.

---

## 0. 한 줄 결론

유물 수집은 **강력 추천**. 단, 코스메틱(외형)과 **분리된 별도 `Artifact`/`UserArtifact` 도메인**으로 만들고, **파피 경제(WalletLedger CONSUME)를 재사용**한다. 핵심 차별점은 유물을 **실제 백과 엔티티에 폴리모픽 링크**(`AggregateType ownerType + recordId`, PointEntry/Attachment 패턴)해 **"수집 = 탐험 = 학습" 루프**를 만드는 것. 풀 "미니미" 아바타 재제작은 **보류**(현 대표인물+코스메틱 아바타로 충분). MVP = 카탈로그 + 파피 구매 + 프로필 유물 진열장 + 엔티티 링크 + 레어도.

---

## 1. 배경 & 비전

### 1.1 싸이월드 모델 → Papyrus 재해석
| 싸이월드 | Papyrus | 상태 |
|---|---|---|
| 도토리 | **파피** | ✅ 완성 (`libs/db/prisma/wallet.prisma`) |
| 미니미(아바타) | 대표인물 아바타 + 코스메틱(프레임/색/등급/뱃지) | ✅ 기반 있음 (`entities/wallet/cosmetics.ts`) |
| 미니룸(꾸미기 공간) | **유물 진열장 / 전시실**(개인 수집 공간) | 🆕 신규 |
| 가구/아이템 구매 | 유물 구매(파피 소비) | ♻️ `WalletLedger` CONSUME 재사용 |

### 1.2 Papyrus만의 무기 — 콘텐츠 링크
싸이월드 미니룸 아이템은 순수 "꾸미기"였다. Papyrus 유물은 **실제 역사 콘텐츠에 연결**된다:
- 거북선(유물) → `NAVAL_VESSEL`/`EVENT`(임진왜란)/`PERSON`(이순신) 백과로 딥링크
- 훈민정음 → `EVENT`/`HISTORICAL_COUNTRY`(조선) 연결
- 수집하면 그 역사를 **읽게 되는** 학습 게이미피케이션 루프 → 싸이월드가 못 가진 차별점이자 "사고싶게"의 끝판왕(컴플리트 욕구 + 호기심).

### 1.3 재사용 가능한 기존 자산
- **파피 경제**: `WalletService`(조건부 차감 + CONSUME 원장 + 멱등 + 역분개), 계정격리 멱등키
- **게이미피케이션**: `PointEntry`(점수), 뱃지, 세기·국가 슬라이스(`contentCentury`/`contentCountryId`) → 세트 완성 보상·시대별 컬렉션에 연동
- **폴리모픽 링크 패턴**: `PointEntry`/`ActionLog`/`Attachment`의 `ownerType(AggregateType) + recordId` (`libs/db/prisma/base.prisma`에 54종 enum)
- **이미지**: `Attachment`/`AttachmentOwner` 시스템 (`libs/db/prisma/common.prisma`)
- **web-admin FSD**: `entities/wallet` 패턴, react-query, `glassCardMixin`, `notify`/`confirm`, 고정헤더 padding 컨벤션

---

## 2. 코스메틱 vs 유물 — 왜 분리하나

| 항목 | 코스메틱 (ShopItem/UserItem) | 유물 (Artifact/UserArtifact, 신규) |
|---|---|---|
| 성격 | 외형(아바타 프레임·닉네임색·배경 등) | **수집물**(소장·진열·콘텐츠 링크) |
| 사용 | "장착"(카테고리당 1개) | "진열"(여러 개, 세트) |
| 메타 | payload(JSON 스타일 정의) | era·국가·연결엔티티·레어도·세트·설명·이미지 |
| 욕구 | 자기표현(예뻐서) | **컴플리트**(세트 7개 중 5개), 희귀, 학습 호기심 |
| 콘텐츠 링크 | 없음 | **있음(핵심)** |

→ 성격이 근본적으로 달라 `ShopItem`에 욱여넣지 않는다. **단 구매 흐름(파피 차감)은 공유** — 아래 4장의 `spend()` 프리미티브로 통합.

---

## 3. 데이터 모델 설계

> ⚠️ 절차: `apps/api/prisma/schema.prisma`는 머지 결과물(직접수정 금지). **`libs/db/prisma/artifact.prisma`(신규)** 에 작성 → `npm run db:build` → 마이그레이션. (CLAUDE.md)
> ⚠️ 아래는 초안 스케치(추측 포함). 필드/타입 리뷰 대상.

### 3.1 신규 파일 `libs/db/prisma/artifact.prisma`

```prisma
/// 역사 유물 카탈로그 (수집 대상). 코스메틱(ShopItem)과 분리 — 수집물·콘텐츠 링크가 본질.
model Artifact {
  id            String          @id @default(uuid()) @db.Char(36)
  /// 유물명 (예: "거북선", "훈민정음 해례본")
  name          String          @db.VarChar(150)
  /// 시대 라벨 (예: "조선 16세기"). 세기 정수는 contentCentury로 별도 비정규화
  era           String?         @db.VarChar(60)
  /// 세기 스냅샷 (세기별 컬렉션/필터용, PointEntry.contentCentury 패턴: AD+/BC-/null)
  contentCentury Int?           @map("content_century")

  /// 연결된 실제 백과 엔티티 (폴리모픽 — PointEntry/Attachment 패턴)
  /// 클릭 시 해당 백과 상세로 딥링크 → "수집=탐험" 루프
  linkedType    AggregateType?  @map("linked_type")   // PERSON/EVENT/HISTORICAL_COUNTRY/NAVAL_VESSEL/WEAPON/DYNASTY/CURRENCY/RESOURCE ...
  linkedId      String?         @map("linked_id") @db.Char(36)

  /// 희귀도 (전설=국보급 / 보물 / 일반)
  rarity        ArtifactRarity  @default(COMMON)
  /// 가격 (파피)
  pricePapy     Int             @map("price_papy")
  /// 대표 이미지
  imageUrl      String?         @map("image_url") @db.VarChar(500)
  /// 설명/유래
  description   String?         @db.Text

  /// 세트 묶음 (예: "JOSEON_ROYAL"). 같은 setKey 유물을 다 모으면 완성 보상.
  setKey        String?         @map("set_key") @db.VarChar(80)

  isActive      Boolean         @default(true) @map("is_active")
  sortOrder     Int             @default(0) @map("sort_order")
  createdAt     DateTime        @default(now()) @map("created_at")

  owners        UserArtifact[]

  @@index([setKey], name: "idx_artifact_set")
  @@index([rarity], name: "idx_artifact_rarity")
  @@index([linkedType, linkedId], name: "idx_artifact_linked")
  @@index([contentCentury], name: "idx_artifact_century")
  @@map("artifact")
}

enum ArtifactRarity {
  COMMON      // 일반
  RARE        // 보물
  LEGENDARY   // 국보급
}

/// 사용자 보유 유물 (수집/진열). 유물 1종은 계정당 1개(컬렉션).
model UserArtifact {
  id           String     @id @default(uuid()) @db.Char(36)
  accountId    String     @map("account_id") @db.Char(36)
  artifactId   String     @map("artifact_id") @db.Char(36)
  /// 구매 시 차감(CONSUME) WalletLedger 행 (느슨한 참조 — 감사용)
  ledgerId     String?    @map("ledger_id") @db.Char(36)
  /// 진열장 노출 여부 + 순서 (미니룸 배치는 Phase B)
  displayed    Boolean    @default(true)
  displayOrder Int        @default(0) @map("display_order")
  acquiredAt   DateTime   @default(now()) @map("acquired_at")

  account      Account    @relation(fields: [accountId], references: [id])
  artifact     Artifact   @relation(fields: [artifactId], references: [id])

  /// 동일 유물 중복 보유 차단 (수집물 = 1종 1개)
  @@unique([accountId, artifactId], name: "uniq_user_artifact")
  @@index([accountId], name: "idx_user_artifact_account")
  @@map("user_artifact")
}
```

**`Account` 확장 (`libs/db/prisma/common.prisma` 소스 수정):**
```prisma
/// 수집한 역사 유물
userArtifacts UserArtifact[]
```

> 세트(`ArtifactSet`)는 MVP에선 `Artifact.setKey` 문자열로 충분. 세트 메타(이름·완성보상)를 DB로 관리하려면 Phase B에서 `ArtifactSet` 테이블 추가(추측).

### 3.2 콘텐츠 링크 (차별점 핵심)
- `linkedType(AggregateType) + linkedId`로 PERSON/EVENT/HISTORICAL_COUNTRY/NAVAL_VESSEL/WEAPON/DYNASTY/CURRENCY/RESOURCE 등 **실제 백과 엔티티**에 연결.
- 프론트는 `pathKeys`로 해당 상세 페이지 딥링크(예: `pathKeys.events.detail(id)`, `pathKeys.personsTimelineDetail(id)` 등 타입별 분기).
- `contentCentury`는 게이미피케이션과 동일 컨벤션 → 세기별 컬렉션·리더보드 연동 여지.

---

## 4. 획득(구매) 플로우 — 파피 경제 재사용

### 4.1 핵심 권고: `WalletService.spend()` 프리미티브 추출
현재 `WalletService.purchaseItem`은 코스메틱(ShopItem) 전용으로 차감+CONSUME+UserItem을 한 트랜잭션에 묶는다. 유물도 같은 **조건부 차감 + CONSUME 원장 + 멱등**이 필요하므로, 재사용 가능한 프리미티브를 빼는 것을 권장:

```ts
// WalletService (제안): 도메인 무관 "파피 소비" 원자 프리미티브
async spend(tx, accountId, amount, { requestId, relatedId }): Promise<{ ledgerId }> {
  // 1) 조건부 updateMany(papyBalance >= amount) 차감 (음수/동시성 게이트)
  // 2) WalletLedger.create(reason=CONSUME, amount=-amount, idempotencyKey=`CONSUME:${requestId}`, relatedItemId=relatedId)
  // 3) recalcBalance
  // → ledgerId 반환. 멱등(P2002) 흡수.
}
```
- 코스메틱 구매·유물 구매가 이 프리미티브를 공유 → 음수방지·멱등·역분개 안전성을 그대로 상속.
- `WalletLedger.relatedItemId`는 "무엇을 샀는지"의 범용 포인터로 의미 확장(코스메틱 itemId 또는 artifactId). (추측: 분석 시 종류 구분이 필요하면 `relatedKind` 컬럼 추가 검토 — MVP 불요.)

### 4.2 유물 구매 (ArtifactService)
```
POST /artifacts/:id/purchase { requestId }
$transaction {
  artifact = 조회(isActive)
  이미 보유? → ConflictException('이미 소장한 유물입니다')   // uniq_user_artifact 사전체크
  ledgerId = walletService.spend(tx, accountId, artifact.pricePapy, { requestId, relatedId: artifactId })
  UserArtifact.create({ accountId, artifactId, ledgerId })
  // 세트 완성 체크 → 보상(아래 4.4)
}
```
- 멱등: `CONSUME:${requestId}` (계정격리 복합 unique). 중복 보유는 `uniq_user_artifact`가 2차 방어.
- 환불(운영자): 기존 `refundPurchase` 역분개 패턴 차용(REVERSAL 원장 + UserArtifact 삭제).

### 4.3 욕구 메커니즘
- **세트 컬렉션**: 같은 `setKey` 유물 진행도("조선 유물 5/7") + 완성 보상.
- **레어도**: COMMON/RARE/LEGENDARY — 색·테두리 차등, 희귀할수록 고가/한정.
- **시대·국가 컬렉션**: `contentCentury`/연결국가로 슬라이스(리더보드 패턴 재사용).
- (선택, Phase C) **가챠/뽑기**: 풀에서 랜덤 획득 — 욕구 강하나 확률표시·밸런스 필요.

### 4.4 세트 완성 보상 (게이미피케이션 연동)
- `setKey` 유물을 전부 보유하면: 뱃지 부여(`AccountBadge`) 또는 파피 환급/칭호.
- `PointService.evaluateBadges` 또는 신규 보상 훅 — 점수 원장 오염 없이 뱃지/칭호로 보상 권장(점수=명예 불변 원칙 유지).

---

## 5. 진열 (미니룸) 플로우

### 5.1 MVP — 프로필 "유물 진열장"
- 프로필(`profile.page.tsx`)에 **유물 진열장 그리드** 섹션: 보유 유물 카드(이미지·이름·레어도·시대), `displayed` 토글.
- 세트 진행바("조선 유물 5/7").
- **유물 클릭 → 연결 백과 엔티티로 딥링크**(차별점 체감 지점).
- 빈 상태: "상점에서 첫 유물을 모아보세요" → `/shop`(또는 신규 `/collection`) 유도.

### 5.2 Phase B — 배치형 미니룸 + 공개 전시실
- 선반/룸에 드래그 배치(좌표 저장: `UserArtifact.x/y` 추가).
- **공개 전시실**: 타 사용자의 진열장 관람(공개프로필 확장 — 백엔드 DTO에 유물 노출 필요, 코스메틱 타사용자 반영과 동일 과제).

---

## 6. 아바타(미니미) 결정

풀 "미니미"(캐릭터 커스터마이징)는 **에셋·디자인 비용이 크고** Papyrus 차별점과 거리가 있다. 현재 아바타(대표인물 + 코스메틱 프레임/색/등급/뱃지, 5종 본인 화면 반영 완료)가 이미 "미니미" 역할을 충분히 한다.
→ **미니미 재제작 보류**, 유물 수집(콘텐츠 링크라는 고유 가치)에 집중 권장.

---

## 7. 변경 절차 & 작업 범위

### 7.1 스키마
```
1. libs/db/prisma/artifact.prisma  신규(3.1)
2. libs/db/prisma/common.prisma    Account.userArtifacts 추가
3. npm run db:build → ts-node libs/db/prisma/run-migrate.ts add_artifact
```
> ⚠️ **이번 세션 확립한 함정**: 비대화형 환경에서 `prisma migrate dev`는 unique 추가/데이터손실 경고로 거부됨(`--create-only`도). → `prisma migrate diff --from-config-datasource --to-schema ... --script`로 SQL 생성 후 마이그레이션 폴더에 넣고 `prisma migrate deploy`로 적용. (메모리 [[papy-virtual-currency-wallet]] 참고)

### 7.2 API
- `apps/api/src/libs/artifact/`(도메인 표준: domain/application/presentation/module)
- `ArtifactService`: list(필터: setKey/rarity/century/linked) · getCollection(내 보유) · purchase(4.2) · setDisplay · (운영자)createArtifact·refund
- 구매는 `WalletService.spend()` 프리미티브 주입(4.1) — wallet 모듈 export 확장
- nestia SDK 재생성(⚠️ `build:nestia` noop → `node -e "import('./scripts/build/nestia.js').then(m=>m.default())"` 우회)

### 7.3 web-admin
- `entities/artifact`(쿼리·뮤테이션·타입, `api.functional.artifacts` 직접 호출 — gamification/wallet 패턴)
- `pages/collection`(유물 진열장 페이지) 또는 상점에 "유물" 탭 + 프로필 진열장 섹션
- 공용 `glassCardMixin`·`notify`·`confirm`, 고정헤더 padding(`calc(var(--header-height,64px)+20px)`)
- 유물 카드 = 이미지 + 레어도 리본 + 연결엔티티 칩(클릭 딥링크)

### 7.4 이미지
- MVP: `Artifact.imageUrl` 직접(외부/업로드 URL). 또는 기존 `Attachment`(ownerType 확장) 재사용.

---

## 8. 리스크

| 리스크 | 대응 |
|---|---|
| **콘텐츠·이미지 제작** — 유물 데이터(이름·이미지·링크·설명)는 사람이 만들어야 함 | MVP는 시드 한 묶음(제작 가능). 장기적으로 **유물 카탈로그 관리 admin 화면** 필요(코스메틱과 동일 미해결 과제). |
| **경제 밸런스** — 유물 가격 vs 파피 획득량(환전 일일100) | 레어도별 가격대 정책 + 신상/한정으로 조절. 가챠 도입 시 확률·천장 설계. |
| **링크 무결성** — linkedId가 가리키는 엔티티 삭제 시 | 느슨한 참조(FK 아님) + 프론트에서 없는 링크는 비활성 표시. |
| **타 사용자 진열 노출** — 공개 전시실은 공개프로필 DTO 확장 필요 | Phase B로 분리(코스메틱 타사용자 반영과 함께 처리). |
| **스코프** — 신규 도메인 | Phase A로 좁혀 출시(카탈로그+구매+진열장+링크). |

---

## 9. 권장 MVP & 로드맵

### Phase A — 수집 MVP ⭐ 먼저
| 만든다 | 미룬다 |
|---|---|
| `artifact.prisma`(Artifact/UserArtifact + ArtifactRarity), Account 관계 | ArtifactSet 테이블, 좌표 배치 |
| `WalletService.spend()` 추출 + 코스메틱 구매 이관 | 가챠/뽑기 |
| `ArtifactService`(목록·구매·진열토글) + 시드 한 묶음(예: 조선 유물 6~8종, 실제 엔티티 링크) | 운영자 카탈로그 관리 화면 |
| 프로필 유물 진열장 그리드 + 세트 진행바 + **연결 엔티티 딥링크** | 공개 전시실(타 사용자) |
| 레어도(색/리본), 부족 파피→환전 유도(상점 패턴 재사용) | 세트 완성 보상 자동화 |

**최소 산출물**: 파피로 유물 구매 → 프로필 진열장에 진열 → 유물 클릭 시 백과로 이동. 세트 진행도 표시.

### Phase B — 컬렉션 깊이
세트 완성 보상(뱃지/칭호), 미니룸식 배치, 공개 전시실, 신상·한정, 카탈로그 관리 admin.

### Phase C — 욕구 가속
가챠/뽑기(확률·천장), 유물 선물/거래, 시즌·이벤트 컬렉션.

---

### 부록: 핵심 인용 & 추측 표기
- 폴리모픽 링크: `libs/db/prisma/base.prisma`(AggregateType 54종), `PointEntry`/`Attachment`(ownerType+recordId)
- 파피 구매 재사용: `apps/api/src/libs/wallet/application/wallet.service.ts`(조건부 차감+CONSUME+멱등+역분개), `WalletLedger @@unique([accountId, idempotencyKey])`
- 진열/링크 프론트: `apps/web-admin/src/pages/profile/profile.page.tsx`, `entities/wallet`(쿼리·뮤테이션 패턴), `shared/router.ts`(pathKeys 딥링크)
- 마이그레이션 우회: `prisma migrate diff … --script` → `migrate deploy` (papy 세션 확립)
- **추측 표기**: `relatedKind` 컬럼 필요성, ArtifactSet 테이블 도입 시점, 가챠 도입, 이미지 Attachment 재사용 vs imageUrl — 모두 제품·콘텐츠 입력 필요.
