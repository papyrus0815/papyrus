import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ItemCategory } from '@prisma/client'
import {
  EquippedCosmeticView,
  GrantResult,
  PromoCodeView,
  PurchaseResult,
  ShopItemView,
  UserItemView,
  WalletService,
  WalletView,
} from '../application/wallet.service'

/** 포인트→파피 환전 요청 */
export interface ExchangePapyDto {
  /** 환전할 파피 수량 (1 이상 정수) */
  papy: number
  /** 멱등 키(중복 제출 방지). 클라이언트가 액션마다 새 UUID 권장 */
  requestId: string
}

/** 프로모 코드 교환 요청 */
export interface RedeemPromoDto {
  /** 프로모 코드 */
  code: string
}

/** 상품 구매 요청 */
export interface PurchaseItemDto {
  /** 구매할 ShopItem ID */
  itemId: string
  /** 멱등 키(중복 차감 방지) */
  requestId: string
}

/** 아이템 장착/해제 요청 */
export interface EquipItemDto {
  /** 대상 UserItem ID */
  userItemId: string
  /** true=장착(같은 카테고리 자동 해제) / false=해제 */
  equipped: boolean
}

/** 운영자: 파피 수동 지급 요청 */
export interface GrantPapyDto {
  /** 지급 대상 계정 ID */
  targetAccountId: string
  /** 지급할 파피 (1 이상 정수) */
  papy: number
  /** 멱등 키(중복 지급 방지) */
  requestId: string
}

/** 운영자: 프로모 코드 생성 요청 */
export interface CreatePromoDto {
  /** 코드(대문자로 정규화) */
  code: string
  /** 지급 파피 (1 이상 정수) */
  papyAmount: number
  /** 전체 교환 한도 (미지정=무제한) */
  maxRedemptions?: number | null
  /** 만료 ISO 일시 (미지정=무기한) */
  expiresAt?: string | null
}

/** 운영자: 구매 환불 요청 */
export interface RefundPurchaseDto {
  /** 환불할 UserItem ID */
  userItemId: string
}

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  private actorId(req: any): string {
    return req.user?.userId ?? req.user?.id
  }

  @Get('me')
  @ApiOperation({ summary: '내 지갑 요약 (잔액·환전 가능량·최근 거래)' })
  async me(@Req() req: any): Promise<WalletView> {
    return this.walletService.getWallet(this.actorId(req))
  }

  @Post('exchange')
  @ApiOperation({ summary: '포인트→파피 환전 (소각 없이 기여 비례 상한 + 일일 한도)' })
  async exchange(@Req() req: any, @Body() body: ExchangePapyDto): Promise<WalletView> {
    return this.walletService.exchangePoints(this.actorId(req), body.papy, body.requestId)
  }

  @Post('redeem')
  @ApiOperation({ summary: '프로모 코드 교환 (계정당 1회)' })
  async redeem(@Req() req: any, @Body() body: RedeemPromoDto): Promise<WalletView> {
    return this.walletService.redeemPromo(this.actorId(req), body.code)
  }

  @Get('shop')
  @ApiOperation({ summary: '상점 상품 목록 (보유·장착 플래그 포함)' })
  async shop(@Req() req: any, @Query('category') category?: string): Promise<ShopItemView[]> {
    const cat = isItemCategory(category) ? category : undefined
    return this.walletService.listShopItems(this.actorId(req), cat)
  }

  @Post('shop/purchase')
  @ApiOperation({ summary: '상품 구매 (파피 소비, race-safe)' })
  async purchase(@Req() req: any, @Body() body: PurchaseItemDto): Promise<PurchaseResult> {
    return this.walletService.purchaseItem(this.actorId(req), body.itemId, body.requestId)
  }

  @Get('items')
  @ApiOperation({ summary: '내 보유 아이템 (인벤토리)' })
  async items(@Req() req: any): Promise<UserItemView[]> {
    return this.walletService.listMyItems(this.actorId(req))
  }

  @Get('equipped/:accountId')
  @ApiOperation({ summary: '방문: 타 계정 장착 코스메틱(스킨, 읽기전용)' })
  async equippedOf(@Param('accountId') accountId: string): Promise<EquippedCosmeticView[]> {
    return this.walletService.getEquippedCosmetics(accountId)
  }

  @Post('items/equip')
  @ApiOperation({ summary: '아이템 장착/해제 (카테고리당 1개)' })
  async equip(@Req() req: any, @Body() body: EquipItemDto): Promise<UserItemView> {
    return this.walletService.setEquip(this.actorId(req), body.userItemId, body.equipped)
  }

  // ── 운영자 전용 (OPERATOR_USERNAMES) ──────────────────────────────────────

  @Post('grant')
  @ApiOperation({ summary: '[운영자] 파피 수동 지급' })
  async grant(@Req() req: any, @Body() body: GrantPapyDto): Promise<GrantResult> {
    return this.walletService.grantPapy(this.actorId(req), body.targetAccountId, body.papy, body.requestId)
  }

  @Post('promo')
  @ApiOperation({ summary: '[운영자] 프로모 코드 생성' })
  async createPromo(@Req() req: any, @Body() body: CreatePromoDto): Promise<PromoCodeView> {
    return this.walletService.createPromoCode(this.actorId(req), body)
  }

  @Post('refund')
  @ApiOperation({ summary: '[운영자] 구매 환불 (역분개 + 보유 회수)' })
  async refund(@Req() req: any, @Body() body: RefundPurchaseDto): Promise<GrantResult> {
    return this.walletService.refundPurchase(this.actorId(req), body.userItemId)
  }
}

/** 문자열이 유효한 ItemCategory인지 */
function isItemCategory(value: string | undefined): value is ItemCategory {
  return value != null && (Object.values(ItemCategory) as string[]).includes(value)
}
