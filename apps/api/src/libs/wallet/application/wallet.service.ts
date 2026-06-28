import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ItemCategory, Prisma, WalletReason } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import {
  DAILY_EXCHANGE_LIMIT_PAPY,
  MAX_PAPY_AMOUNT,
  OPERATOR_USERNAMES,
  POINTS_PER_PAPY,
  exchangeCapFromPoints,
} from '../domain/wallet.policy'

type Tx = Prisma.TransactionClient

/** 원장 한 줄(최근 거래 표시용) */
export interface WalletLedgerView {
  id: string
  /** 증감 파피 (+충전/환불 / -소비) */
  amount: number
  /** 사유 코드 (PURCHASE_TOPUP/ADMIN_GRANT/PROMO_CODE/POINT_EXCHANGE/CONSUME/REFUND_REVERSAL/ADMIN_ADJUST) */
  reason: string
  /** 발생 시각 ISO */
  createdAt: string
}

/** 내 지갑 요약 */
export interface WalletView {
  /** 현재 파피 잔액 */
  balance: number
  /** 포인트→파피 환전 비율 (N 포인트당 1 파피) */
  pointsPerPapy: number
  /** 지금 추가로 환전 가능한 파피 (보유 점수 상한 − 기존 환전분) */
  exchangeableNow: number
  /** 오늘 남은 일일 환전 한도(파피) */
  dailyExchangeRemaining: number
  /** 최근 거래(내림차순) */
  recent: WalletLedgerView[]
}

/** 상점 상품 한 개 (보유/장착 플래그 포함) */
export interface ShopItemView {
  id: string
  category: string
  code: string
  name: string
  pricePapy: number
  /** 카테고리별 외형 정의(JSON) */
  payload: unknown
  thumbnailUrl: string | null
  /** 요청 계정이 이미 보유했는지 */
  owned: boolean
  /** 요청 계정이 현재 장착했는지 */
  equipped: boolean
}

/** 보유 아이템 한 개 (인벤토리) */
export interface UserItemView {
  /** UserItem PK (장착/환불 대상 식별자) */
  id: string
  itemId: string
  category: string
  name: string
  pricePapy: number
  payload: unknown
  thumbnailUrl: string | null
  equipped: boolean
  purchasedAt: string
}

/**
 * 방문(놀러가기)용 장착 코스메틱(스킨) — 잔액·구매이력·UserItem PK 등 민감/불필요 필드 제외.
 * 방문자가 방 주인의 외형(프레임·닉네임색·프로필배경 등)을 렌더하는 데 필요한 최소 필드만.
 */
export interface EquippedCosmeticView {
  category: string
  name: string
  payload: unknown
  thumbnailUrl: string | null
}

/** 구매 결과 */
export interface PurchaseResult {
  item: UserItemView
  /** 차감 후 잔액 */
  balance: number
}

/** 파피 지급 결과 */
export interface GrantResult {
  targetAccountId: string
  /** 지급 후 대상 잔액 */
  balance: number
}

/** 프로모 코드 */
export interface PromoCodeView {
  id: string
  code: string
  papyAmount: number
  maxRedemptions: number | null
  redeemedCount: number
  expiresAt: string | null
  isActive: boolean
}

/**
 * 파피(구매형 가상화폐) 서비스.
 *
 * 설계 원칙(docs/papy-virtual-currency-design.md):
 * - 모든 입출은 WalletLedger(원장)에 1행씩 기록(append-only). Account.papyBalance는
 *   원장 합계의 비정규화 캐시로 매 거래마다 재계산(드리프트 없음 — PointService 패턴 차용).
 * - 멱등성: 거래마다 idempotencyKey unique로 이중과금/이중차감/이중환불 차단(P2002 흡수).
 * - 음수 방지: 소비는 조건부 UPDATE(`papyBalance >= price`)로 원자적 차감(race-safe).
 * - 환불/취소: 행 삭제가 아니라 반대부호 역분개(REFUND_REVERSAL)행으로 처리(감사 무결성).
 * - 점수(PointEntry)는 건드리지 않는다(점수=명예 불변). 환전은 소각 없이 기여 비례 상한제.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 조회
  // ──────────────────────────────────────────────────────────────────────────

  /** 내 지갑 요약(잔액 + 환전 가능량 + 최근 거래) */
  async getWallet(accountId: string): Promise<WalletView> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { totalPoints: true, papyBalance: true },
    })
    if (!account) throw new NotFoundException('계정을 찾을 수 없습니다')

    const [exchangedTotal, exchangedToday, recent] = await Promise.all([
      this.sumLedger(this.prisma, accountId, WalletReason.POINT_EXCHANGE),
      this.sumLedger(this.prisma, accountId, WalletReason.POINT_EXCHANGE, startOfToday()),
      this.prisma.walletLedger.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, amount: true, reason: true, createdAt: true },
      }),
    ])

    const exchangeableNow = Math.max(0, exchangeCapFromPoints(account.totalPoints) - exchangedTotal)
    const dailyExchangeRemaining = Math.max(0, DAILY_EXCHANGE_LIMIT_PAPY - exchangedToday)

    return {
      balance: account.papyBalance,
      pointsPerPapy: POINTS_PER_PAPY,
      exchangeableNow,
      dailyExchangeRemaining,
      recent: recent.map((r) => ({
        id: r.id,
        amount: r.amount,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  /** 상점 상품 목록(활성 상품 + 요청 계정의 보유/장착 플래그) */
  async listShopItems(accountId: string, category?: ItemCategory): Promise<ShopItemView[]> {
    const [items, owned] = await Promise.all([
      this.prisma.shopItem.findMany({
        where: { isActive: true, ...(category ? { category } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.userItem.findMany({
        where: { accountId },
        select: { itemId: true, equipped: true },
      }),
    ])
    const ownedMap = new Map(owned.map((o) => [o.itemId, o.equipped]))
    return items.map((it) => ({
      id: it.id,
      category: it.category,
      code: it.code,
      name: it.name,
      pricePapy: it.pricePapy,
      payload: it.payload ?? null,
      thumbnailUrl: it.thumbnailUrl,
      owned: ownedMap.has(it.id),
      equipped: ownedMap.get(it.id) ?? false,
    }))
  }

  /** 내 보유 아이템(인벤토리) */
  async listMyItems(accountId: string): Promise<UserItemView[]> {
    const rows = await this.prisma.userItem.findMany({
      where: { accountId },
      include: { item: true },
      orderBy: { purchasedAt: 'desc' },
    })
    return rows.map((r) => this.toUserItemView(r))
  }

  /**
   * 방문(놀러가기): 타 계정의 장착 코스메틱(스킨)만 읽기전용 노출.
   * 잔액·구매이력·미장착 보유분은 일절 노출하지 않음 — equipped=true 행만, 축약 projection.
   */
  async getEquippedCosmetics(accountId: string): Promise<EquippedCosmeticView[]> {
    const rows = await this.prisma.userItem.findMany({
      where: { accountId, equipped: true },
      include: {
        item: { select: { category: true, name: true, payload: true, thumbnailUrl: true } },
      },
    })
    return rows.map((r) => ({
      category: r.item.category,
      name: r.item.name,
      payload: r.item.payload ?? null,
      thumbnailUrl: r.item.thumbnailUrl,
    }))
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 충전(획득) — 환전 / 프로모 / 운영 지급
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 포인트→파피 환전. 포인트는 소각하지 않으며(점수 원장 불변),
   * `floor(보유 totalPoints / POINTS_PER_PAPY)`를 누적 상한으로 + 일일 한도 내에서만 지급.
   * @param requestId 멱등 키(중복 제출 방지). 미지정 시 서버 생성(멱등 보호 없음).
   */
  async exchangePoints(accountId: string, papy: number, requestId?: string): Promise<WalletView> {
    const amount = this.assertPositiveInt(papy, '환전할 파피')
    const key = `EXCHANGE:${this.normalizeRequestId(requestId)}`
    try {
      await this.prisma.$transaction(async (tx) => {
        // 같은 계정의 동시 환전을 직렬화(누적 상한·일일 한도 race 방지): account 행 X-lock 선점
        await tx.$queryRaw`SELECT id FROM account WHERE id = ${accountId} FOR UPDATE`
        const account = await tx.account.findUnique({
          where: { id: accountId },
          select: { totalPoints: true },
        })
        if (!account) throw new NotFoundException('계정을 찾을 수 없습니다')
        const exchangedTotal = await this.sumLedger(tx, accountId, WalletReason.POINT_EXCHANGE)
        const exchangedToday = await this.sumLedger(
          tx,
          accountId,
          WalletReason.POINT_EXCHANGE,
          startOfToday(),
        )
        const exchangeableNow = Math.max(0, exchangeCapFromPoints(account.totalPoints) - exchangedTotal)
        const dailyRemaining = Math.max(0, DAILY_EXCHANGE_LIMIT_PAPY - exchangedToday)
        if (amount > exchangeableNow) {
          throw new BadRequestException(
            `환전 가능한 파피는 최대 ${exchangeableNow}개입니다 (보유 포인트 기준)`,
          )
        }
        if (amount > dailyRemaining) {
          throw new BadRequestException(`오늘 환전 가능한 파피는 ${dailyRemaining}개 남았습니다`)
        }
        await tx.walletLedger.create({
          data: { accountId, amount, reason: WalletReason.POINT_EXCHANGE, idempotencyKey: key },
        })
        await this.recalcBalance(tx, accountId)
      })
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error
      // 동일 requestId 재시도 — 이미 처리됨(멱등). 무시하고 현재 상태 반환.
    }
    return this.getWallet(accountId)
  }

  /**
   * 프로모 코드 교환. 계정당 1회(idempotencyKey=PROMO:{code}:{accountId} unique).
   * 코드는 대문자로 정규화해 매칭한다.
   */
  async redeemPromo(accountId: string, codeRaw: string): Promise<WalletView> {
    const code = (codeRaw ?? '').trim().toUpperCase()
    if (!code) throw new BadRequestException('프로모 코드를 입력하세요')
    // 계정별 멱등(uniq([accountId, idempotencyKey])) — 계정당 코드 1회
    const key = `PROMO:${code}`
    try {
      await this.prisma.$transaction(async (tx) => {
        const promo = await tx.promoCode.findUnique({ where: { code } })
        if (!promo || !promo.isActive) throw new NotFoundException('유효하지 않은 프로모 코드입니다')
        if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
          throw new BadRequestException('만료된 프로모 코드입니다')
        }
        // 전역 한도: 검사+증가를 조건부 UPDATE로 원자화(race-safe). count=0이면 소진.
        if (promo.maxRedemptions != null) {
          const bumped = await tx.promoCode.updateMany({
            where: { id: promo.id, redeemedCount: { lt: promo.maxRedemptions } },
            data: { redeemedCount: { increment: 1 } },
          })
          if (bumped.count === 0) throw new BadRequestException('소진된 프로모 코드입니다')
        } else {
          await tx.promoCode.update({
            where: { id: promo.id },
            data: { redeemedCount: { increment: 1 } },
          })
        }
        await tx.walletLedger.create({
          data: { accountId, amount: promo.papyAmount, reason: WalletReason.PROMO_CODE, idempotencyKey: key },
        })
        await this.recalcBalance(tx, accountId)
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('이미 사용한 프로모 코드입니다')
      throw error
    }
    return this.getWallet(accountId)
  }

  /**
   * 운영자 수동 지급(ADMIN_GRANT). 운영자(OPERATOR_USERNAMES)만 호출 가능.
   * @param requestId 멱등 키(중복 지급 방지)
   */
  async grantPapy(
    operatorAccountId: string,
    targetAccountId: string,
    papy: number,
    requestId?: string,
  ): Promise<GrantResult> {
    await this.assertOperator(operatorAccountId)
    if (operatorAccountId === targetAccountId) {
      throw new BadRequestException('자기 자신에게는 지급할 수 없습니다')
    }
    const amount = this.assertPositiveInt(papy, '지급할 파피')
    const target = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
      select: { id: true },
    })
    if (!target) throw new NotFoundException('대상 계정을 찾을 수 없습니다')
    const key = `GRANT:${this.normalizeRequestId(requestId)}`
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.walletLedger.create({
          data: {
            accountId: targetAccountId,
            amount,
            reason: WalletReason.ADMIN_GRANT,
            idempotencyKey: key,
            actorAccountId: operatorAccountId,
          },
        })
        await this.recalcBalance(tx, targetAccountId)
      })
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error
      // 동일 requestId 재시도 — 멱등 무시.
    }
    const after = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
      select: { papyBalance: true },
    })
    return { targetAccountId, balance: after?.papyBalance ?? 0 }
  }

  /** 프로모 코드 생성(운영자 전용) */
  async createPromoCode(
    operatorAccountId: string,
    input: { code: string; papyAmount: number; maxRedemptions?: number | null; expiresAt?: string | null },
  ): Promise<PromoCodeView> {
    await this.assertOperator(operatorAccountId)
    const code = (input.code ?? '').trim().toUpperCase()
    if (!code) throw new BadRequestException('프로모 코드를 입력하세요')
    const papyAmount = this.assertPositiveInt(input.papyAmount, '지급 파피')
    let maxRedemptions: number | null = null
    if (input.maxRedemptions != null) {
      maxRedemptions = this.assertPositiveInt(input.maxRedemptions, '최대 교환 횟수')
    }
    let expiresAt: Date | null = null
    if (input.expiresAt) {
      const d = new Date(input.expiresAt)
      if (Number.isNaN(d.getTime())) throw new BadRequestException('만료일 형식이 올바르지 않습니다')
      expiresAt = d
    }
    try {
      const promo = await this.prisma.promoCode.create({
        data: { code, papyAmount, maxRedemptions, expiresAt },
      })
      return this.toPromoView(promo)
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('이미 존재하는 코드입니다')
      throw error
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 소비 / 장착 / 환불
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 상품 구매(파피 소비). race-safe 조건부 차감으로 음수/동시구매를 차단하고,
   * CONSUME 원장 + UserItem(소유)을 한 트랜잭션에 기록. 멱등(같은 requestId·이미 보유는 흡수).
   * @param requestId 멱등 키(중복 차감 방지)
   */
  async purchaseItem(accountId: string, itemId: string, requestId?: string): Promise<PurchaseResult> {
    const item = await this.prisma.shopItem.findUnique({ where: { id: itemId } })
    if (!item || !item.isActive) throw new NotFoundException('판매 중인 상품이 아닙니다')
    // 안정 멱등키(itemId 포함): 같은 상품·같은 requestId 재시도는 같은 키 → 멱등 흡수
    const key = `CONSUME:${itemId}:${this.normalizeRequestId(requestId)}`
    try {
      await this.prisma.$transaction(async (tx) => {
        const ledgerId = await this.spend(tx, accountId, item.pricePapy, key, itemId)
        await tx.userItem.create({ data: { accountId, itemId, ledgerId } })
      })
    } catch (error) {
      // P2002: 같은 requestId 재시도 또는 이미 보유 — 멱등 처리(차감은 트랜잭션 롤백으로 무효).
      if (!this.isUniqueViolation(error)) throw error
    }

    const owned = await this.prisma.userItem.findUnique({
      where: { uniq_user_item: { accountId, itemId } },
      include: { item: true },
    })
    // P2002 흡수 후에도 보유분이 안 보이면 = 경쟁 거래 미커밋(드문 동시성). 영구 실패 아님.
    if (!owned) throw new ConflictException('구매 처리가 진행 중입니다. 잠시 후 다시 시도하세요')
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { papyBalance: true },
    })
    return { item: this.toUserItemView(owned), balance: account?.papyBalance ?? 0 }
  }

  /**
   * 아이템 장착/해제. 장착 시 같은 카테고리의 다른 보유 아이템은 자동 해제(카테고리당 1개).
   */
  async setEquip(accountId: string, userItemId: string, equipped: boolean): Promise<UserItemView> {
    const ui = await this.prisma.userItem.findFirst({
      where: { id: userItemId, accountId },
      include: { item: { select: { category: true } } },
    })
    if (!ui) throw new NotFoundException('보유하지 않은 아이템입니다')

    await this.prisma.$transaction(async (tx) => {
      if (equipped) {
        const siblings = await tx.userItem.findMany({
          where: {
            accountId,
            equipped: true,
            id: { not: userItemId },
            item: { category: ui.item.category },
          },
          select: { id: true },
        })
        if (siblings.length > 0) {
          await tx.userItem.updateMany({
            where: { id: { in: siblings.map((s) => s.id) } },
            data: { equipped: false },
          })
        }
      }
      await tx.userItem.update({ where: { id: userItemId }, data: { equipped } })
    })

    const updated = await this.prisma.userItem.findUnique({
      where: { id: userItemId },
      include: { item: true },
    })
    return this.toUserItemView(updated!)
  }

  /**
   * 구매 환불(운영자 전용). 삭제가 아니라 반대부호 역분개(REFUND_REVERSAL)행으로 파피를 복원하고,
   * 보유(UserItem)를 제거한다. 동일 구매 이중환불은 idempotencyKey=REVERSAL:{consumeLedgerId}로 차단.
   */
  async refundPurchase(operatorAccountId: string, userItemId: string): Promise<GrantResult> {
    await this.assertOperator(operatorAccountId)
    const ui = await this.prisma.userItem.findUnique({
      where: { id: userItemId },
      select: { id: true, accountId: true, itemId: true, ledgerId: true },
    })
    if (!ui) throw new NotFoundException('환불할 구매 내역을 찾을 수 없습니다')

    // 환불 금액: 원 소비 원장(절대값) 우선, 없으면 현재 상품 가격으로 폴백.
    let refundAmount = 0
    if (ui.ledgerId) {
      const consume = await this.prisma.walletLedger.findUnique({
        where: { id: ui.ledgerId },
        select: { amount: true },
      })
      if (consume) refundAmount = Math.abs(consume.amount)
    }
    if (refundAmount <= 0) {
      const item = await this.prisma.shopItem.findUnique({
        where: { id: ui.itemId },
        select: { pricePapy: true },
      })
      refundAmount = item?.pricePapy ?? 0
    }

    // 안정 키(itemId·계정별): 환불→재구매→재환불 무한증폭 차단(같은 상품은 1회만 환불 가능).
    const key = `REVERSAL:${ui.itemId}`
    try {
      await this.prisma.$transaction(async (tx) => {
        if (refundAmount > 0) {
          await tx.walletLedger.create({
            data: {
              accountId: ui.accountId,
              amount: refundAmount,
              reason: WalletReason.REFUND_REVERSAL,
              idempotencyKey: key,
              reversalOfId: ui.ledgerId ?? null,
              relatedItemId: ui.itemId,
              actorAccountId: operatorAccountId,
            },
          })
        }
        await tx.userItem.delete({ where: { id: userItemId } })
        await this.recalcBalance(tx, ui.accountId)
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('이미 환불된 구매입니다')
      throw error
    }
    const after = await this.prisma.account.findUnique({
      where: { id: ui.accountId },
      select: { papyBalance: true },
    })
    return { targetAccountId: ui.accountId, balance: after?.papyBalance ?? 0 }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 내부 헬퍼
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 파피 소비 원자 프리미티브 (도메인 무관) — 코스메틱·유물 구매가 공유.
   * 조건부 차감(papyBalance >= amount)으로 음수·동시구매를 막고, CONSUME 원장 1행 + 잔액 재계산.
   * 호출자가 자신의 $transaction(tx)과 멱등키를 넘긴다(P2002 멱등 흡수는 호출자 책임).
   * @returns 생성된 CONSUME WalletLedger.id
   */
  async spend(
    tx: Tx,
    accountId: string,
    amount: number,
    idempotencyKey: string,
    relatedItemId?: string | null,
  ): Promise<string> {
    // 동일 계정 동시 소비를 직렬화 — recalcBalance의 SUM 스냅샷(REPEATABLE READ) race로
    // 잔액이 과다 복원(under-charge)되는 것을 차단. exchangePoints와 동일하게 account 행 X-lock 선점.
    await tx.$queryRaw`SELECT id FROM account WHERE id = ${accountId} FOR UPDATE`
    const dec = await tx.account.updateMany({
      where: { id: accountId, papyBalance: { gte: amount } },
      data: { papyBalance: { decrement: amount } },
    })
    if (dec.count === 0) throw new BadRequestException('파피가 부족합니다')
    const ledger = await tx.walletLedger.create({
      data: {
        accountId,
        amount: -amount,
        reason: WalletReason.CONSUME,
        idempotencyKey,
        relatedItemId: relatedItemId ?? null,
      },
    })
    await this.recalcBalance(tx, accountId)
    return ledger.id
  }

  /** Account.papyBalance를 원장 합계로 재계산(캐시 정합) */
  private async recalcBalance(tx: Tx, accountId: string): Promise<number> {
    const agg = await tx.walletLedger.aggregate({ where: { accountId }, _sum: { amount: true } })
    const total = agg._sum.amount ?? 0
    if (total < 0) {
      // 원장 합계 음수 = 불변식 위반(버그). 캐시에 쓰지 않고 트랜잭션 롤백.
      this.logger.error(`파피 원장 합계 음수 (account=${accountId}, total=${total}) — 거래 거부`)
      throw new ConflictException('잔액 무결성 오류로 거래가 거부되었습니다')
    }
    await tx.account.update({ where: { id: accountId }, data: { papyBalance: total } })
    return total
  }

  /** 특정 사유의 원장 합계(since 지정 시 그 시각 이후) */
  private async sumLedger(
    client: Tx,
    accountId: string,
    reason: WalletReason,
    since?: Date,
  ): Promise<number> {
    const agg = await client.walletLedger.aggregate({
      where: { accountId, reason, ...(since ? { createdAt: { gte: since } } : {}) },
      _sum: { amount: true },
    })
    return agg._sum.amount ?? 0
  }

  private async assertOperator(accountId: string): Promise<void> {
    const acc = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { username: true },
    })
    if (!acc || !OPERATOR_USERNAMES.includes(acc.username)) {
      throw new ForbiddenException('운영자 권한이 필요합니다')
    }
  }

  private assertPositiveInt(value: number, label: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${label}는 1 이상의 정수여야 합니다`)
    }
    if (value > MAX_PAPY_AMOUNT) {
      throw new BadRequestException(`${label}가 허용 범위를 초과했습니다 (최대 ${MAX_PAPY_AMOUNT})`)
    }
    return value
  }

  private normalizeRequestId(requestId?: string): string {
    const trimmed = (requestId ?? '').trim()
    if (!trimmed) throw new BadRequestException('requestId(멱등 키)가 필요합니다')
    return trimmed
  }

  private toUserItemView(ui: { id: string; itemId: string; equipped: boolean; purchasedAt: Date; item: { category: ItemCategory; name: string; pricePapy: number; payload: Prisma.JsonValue; thumbnailUrl: string | null } }): UserItemView {
    return {
      id: ui.id,
      itemId: ui.itemId,
      category: ui.item.category,
      name: ui.item.name,
      pricePapy: ui.item.pricePapy,
      payload: ui.item.payload ?? null,
      thumbnailUrl: ui.item.thumbnailUrl,
      equipped: ui.equipped,
      purchasedAt: ui.purchasedAt.toISOString(),
    }
  }

  private toPromoView(p: {
    id: string
    code: string
    papyAmount: number
    maxRedemptions: number | null
    redeemedCount: number
    expiresAt: Date | null
    isActive: boolean
  }): PromoCodeView {
    return {
      id: p.id,
      code: p.code,
      papyAmount: p.papyAmount,
      maxRedemptions: p.maxRedemptions,
      redeemedCount: p.redeemedCount,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      isActive: p.isActive,
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}

/** 오늘 0시(서버 로컬) */
function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
