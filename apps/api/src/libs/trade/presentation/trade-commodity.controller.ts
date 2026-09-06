import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common'
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import {
  CATEGORY_INCLUDE,
  COMMODITY_INCLUDE,
  serializeCategory,
  serializeCommodity,
  serializeCommodityFlowRow,
  slugify,
  splitAliases,
} from '../application/trade.serializer'

import type {
  CommodityTradeFlowRow,
  TradeCommodityCategoryResponse,
  TradeCommodityResponse,
  UpsertTradeCommodityCategoryDto,
  UpsertTradeCommodityDto,
} from './dto/trade.dto'

export interface CommodityListQuery {
  /** 이름·영문명·별칭·HS 코드를 함께 훑는 검색어 */
  q?: string
  /** 이 분류(하위 분류 포함)에 속한 품목만 */
  categoryId?: string
  /** 서비스 교역만/상품만 */
  isService?: boolean
  /** 이 해에 존재한 품목만 — 부호 있는 연도(음수는 기원전) */
  yearSigned?: number
  limit?: number
}

export interface CommodityFlowQuery {
  direction?: 'EXPORT' | 'IMPORT'
  limit?: number
}

/**
 * 교역 품목 카탈로그 — 분류(계층)와 품목.
 *
 * 품목을 나라·연도마다 문자열로 다시 치면 "1913년에 강철을 수출한 나라"를 물을 수 없다.
 * 이 카탈로그가 그 가로줄을 만든다. 카탈로그에 없는 품목도 흐름에 자유 입력으로 적을 수
 * 있고(분류만 걸 수 있다), 나중에 카탈로그로 승격하면 된다.
 */
@ApiTags('trade')
@Controller('trade')
@UseGuards(AuthGuard('jwt'))
export class TradeCommodityController {
  constructor(private readonly prisma: PrismaService) {}

  // ── 분류 ───────────────────────────────────────────────────

  /**
   * 품목 분류 목록 (대분류 → 중분류 순, 계층 그대로 평면 배열).
   * @tag trade
   */
  @TypedRoute.Get('commodity-categories')
  async listCategories(): Promise<TradeCommodityCategoryResponse[]> {
    const rows = await this.prisma.tradeCommodityCategory.findMany({
      ...CATEGORY_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return rows.map(serializeCategory)
  }

  /**
   * 품목 분류 생성.
   * @tag trade
   */
  @TypedRoute.Post('commodity-categories')
  async createCategory(
    @TypedBody() dto: UpsertTradeCommodityCategoryDto,
  ): Promise<TradeCommodityCategoryResponse> {
    const slug = dto.slug?.trim() || slugify(dto.name)
    if (!slug) {
      throw new BadRequestException(
        '분류 키(slug)를 만들 수 없습니다 — 영문 키를 직접 입력하세요.',
      )
    }
    const row = await this.prisma.tradeCommodityCategory.create({
      data: {
        name: dto.name.trim(),
        enName: dto.enName?.trim() || null,
        slug,
        parentId: dto.parentId || null,
        hsSection: dto.hsSection ?? null,
        description: dto.description ?? null,
        colorKey: dto.colorKey?.trim() || null,
        emoji: dto.emoji?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      ...CATEGORY_INCLUDE,
    })
    return serializeCategory(row)
  }

  /**
   * 품목 분류 수정.
   * @tag trade
   */
  @TypedRoute.Put('commodity-categories/:id')
  async updateCategory(
    @TypedParam('id') id: string,
    @TypedBody() dto: UpsertTradeCommodityCategoryDto,
  ): Promise<TradeCommodityCategoryResponse> {
    if (dto.parentId === id) {
      throw new BadRequestException('분류가 자기 자신의 상위일 수 없습니다.')
    }
    const row = await this.prisma.tradeCommodityCategory.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        enName: dto.enName?.trim() || null,
        ...(dto.slug ? { slug: dto.slug.trim() } : {}),
        parentId: dto.parentId || null,
        hsSection: dto.hsSection ?? null,
        description: dto.description ?? null,
        colorKey: dto.colorKey?.trim() || null,
        emoji: dto.emoji?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      ...CATEGORY_INCLUDE,
    })
    return serializeCategory(row)
  }

  /**
   * 품목 분류 삭제. 품목이 붙어 있으면 막는다(품목이 분류 없이 떠돌면 안 된다).
   * @tag trade
   */
  @TypedRoute.Delete('commodity-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@TypedParam('id') id: string): Promise<void> {
    const [commodityCount, childCount] = await Promise.all([
      this.prisma.tradeCommodity.count({ where: { categoryId: id } }),
      this.prisma.tradeCommodityCategory.count({ where: { parentId: id } }),
    ])
    if (commodityCount > 0) {
      throw new BadRequestException(
        `이 분류에 품목 ${commodityCount}개가 남아 있습니다. 먼저 옮기거나 지우세요.`,
      )
    }
    if (childCount > 0) {
      throw new BadRequestException(
        `하위 분류 ${childCount}개가 남아 있습니다. 먼저 옮기거나 지우세요.`,
      )
    }
    await this.prisma.tradeCommodityCategory.delete({ where: { id } })
  }

  // ── 품목 ───────────────────────────────────────────────────

  /**
   * 품목 검색·목록.
   *
   * `q`는 이름·영문명·별칭·HS 코드를 함께 훑는다 — 자료마다 표기가 갈리므로(석유/원유/
   * crude oil) 별칭까지 걸리지 않으면 같은 품목을 두 번 만들게 된다.
   *
   * @tag trade
   */
  @TypedRoute.Get('commodities')
  async listCommodities(
    @TypedQuery() query: CommodityListQuery,
  ): Promise<TradeCommodityResponse[]> {
    const where: Prisma.TradeCommodityWhereInput = {}

    const keyword = query.q?.trim()
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { enName: { contains: keyword } },
        { aliases: { contains: keyword } },
        { hsCode: { startsWith: keyword } },
      ]
    }

    if (query.categoryId) {
      /* 하위 분류까지 포함 — "운송장비"를 고르면 자동차·선박이 모두 걸려야 한다 */
      const descendants = await this.collectCategoryDescendants(query.categoryId)
      where.categoryId = { in: descendants }
    }

    if (query.isService != null) where.isService = query.isService

    if (query.yearSigned != null) {
      const year = query.yearSigned
      /* 존재 구간을 모르는 품목(null)은 배제하지 않는다 — 모른다는 것이 없다는 뜻은 아니다 */
      where.AND = [
        { OR: [{ firstYearSigned: null }, { firstYearSigned: { lte: year } }] },
        { OR: [{ lastYearSigned: null }, { lastYearSigned: { gte: year } }] },
      ]
    }

    const rows = await this.prisma.tradeCommodity.findMany({
      where,
      ...COMMODITY_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: query.limit ?? 500,
    })
    return rows.map(serializeCommodity)
  }

  /**
   * 품목 단건.
   * @tag trade
   */
  @TypedRoute.Get('commodities/:id')
  async getCommodity(
    @TypedParam('id') id: string,
  ): Promise<TradeCommodityResponse> {
    const row = await this.prisma.tradeCommodity.findUnique({
      where: { id },
      ...COMMODITY_INCLUDE,
    })
    if (!row) throw new NotFoundException('교역 품목을 찾을 수 없습니다.')
    return serializeCommodity(row)
  }

  /**
   * 품목 생성.
   * @tag trade
   */
  @TypedRoute.Post('commodities')
  async createCommodity(
    @TypedBody() dto: UpsertTradeCommodityDto,
    @Request() req: any,
  ): Promise<TradeCommodityResponse> {
    const accountId = req.user?.id ?? req.user?.sub ?? null
    const row = await this.prisma.tradeCommodity.create({
      data: {
        ...this.commodityWritable(dto),
        slug: dto.slug?.trim() || slugify(dto.name),
        accountId,
      },
      ...COMMODITY_INCLUDE,
    })
    return serializeCommodity(row)
  }

  /**
   * 품목 수정.
   * @tag trade
   */
  @TypedRoute.Put('commodities/:id')
  async updateCommodity(
    @TypedParam('id') id: string,
    @TypedBody() dto: UpsertTradeCommodityDto,
  ): Promise<TradeCommodityResponse> {
    const row = await this.prisma.tradeCommodity.update({
      where: { id },
      data: {
        ...this.commodityWritable(dto),
        ...(dto.slug !== undefined ? { slug: dto.slug?.trim() || null } : {}),
      },
      ...COMMODITY_INCLUDE,
    })
    return serializeCommodity(row)
  }

  /**
   * 품목 삭제. 이미 교역 기록에 쓰였으면 막는다 —
   * 지우면 그 흐름들이 분류를 잃고 이름만 남은 문자열로 주저앉는다.
   * @tag trade
   */
  @TypedRoute.Delete('commodities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCommodity(@TypedParam('id') id: string): Promise<void> {
    const usage = await this.prisma.exportImportItem.count({
      where: { commodityId: id },
    })
    if (usage > 0) {
      throw new BadRequestException(
        `교역 기록 ${usage}건이 이 품목을 쓰고 있어 삭제할 수 없습니다.`,
      )
    }
    await this.prisma.tradeCommodity.delete({ where: { id } })
  }

  /**
   * **품목으로 가로줄 읽기** — 이 품목을 누가·언제·누구와 주고받았나.
   *
   * 카탈로그를 둔 이유가 이 조회다. 품목을 문자열로만 적었다면 나라마다 표기가 갈려
   * 이 질문 자체가 성립하지 않는다.
   *
   * @tag trade
   */
  @TypedRoute.Get('commodities/:id/flows')
  async getCommodityFlows(
    @TypedParam('id') id: string,
    @TypedQuery() query: CommodityFlowQuery,
  ): Promise<CommodityTradeFlowRow[]> {
    const rows = await this.prisma.exportImportItem.findMany({
      where: {
        commodityId: id,
        ...(query.direction ? { direction: query.direction } : {}),
      },
      include: {
        partnerCountry: { select: { name: true } },
        partnerHistoricalCountry: { select: { name: true } },
        partnerOrganization: { select: { name: true } },
        exportImport: {
          include: {
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
      },
      take: query.limit ?? 300,
    })
    return rows
      .map((row) => serializeCommodityFlowRow(row as never))
      .sort((left, right) => left.signedYear - right.signedYear)
  }

  /** 분류 id와 그 모든 하위 분류 id (자기 자신 포함). */
  private async collectCategoryDescendants(rootId: string): Promise<string[]> {
    const all = await this.prisma.tradeCommodityCategory.findMany({
      select: { id: true, parentId: true },
    })
    const childrenByParent = new Map<string, string[]>()
    for (const row of all) {
      if (!row.parentId) continue
      const list = childrenByParent.get(row.parentId) ?? []
      list.push(row.id)
      childrenByParent.set(row.parentId, list)
    }
    const collected: string[] = []
    const queue = [rootId]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (collected.includes(current)) continue
      collected.push(current)
      queue.push(...(childrenByParent.get(current) ?? []))
    }
    return collected
  }

  private commodityWritable(dto: UpsertTradeCommodityDto) {
    return {
      name: dto.name.trim(),
      enName: dto.enName?.trim() || null,
      aliases:
        dto.aliases && dto.aliases.length > 0
          ? splitAliases(dto.aliases.join(',')).join(',')
          : null,
      categoryId: dto.categoryId,
      hsCode: dto.hsCode?.trim() || null,
      sitcCode: dto.sitcCode?.trim() || null,
      defaultUnit: dto.defaultUnit?.trim() || null,
      firstYearSigned: dto.firstYearSigned ?? null,
      lastYearSigned: dto.lastYearSigned ?? null,
      isService: dto.isService ?? false,
      description: dto.description ?? null,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
    }
  }
}
