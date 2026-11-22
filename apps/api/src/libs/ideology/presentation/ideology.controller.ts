/**
 * 이념 카탈로그 — 정당·조직·인물 공용 정본(B2, docs/political-party-model-review.md §4.3).
 * 계정 소유 없는 공유 카탈로그(JWT만 요구). 쓰이는 이념은 지울 수 없다(연결을 먼저 푼다).
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { IdeologyCategory, Prisma } from '@prisma/client'

import { PrismaService } from '@prisma/prisma.service'

import { refreshPartyIdeologyCache } from '../../election/domain/party-ideology.util'

const CATEGORY_VALUES = new Set<string>(Object.values(IdeologyCategory))
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

export interface IdeologyAliasInput {
  name: string
  languageCode?: string | null
}

export interface CreateIdeologyBody {
  name: string
  englishName?: string | null
  /** IDEOLOGY(기본)·POLICY·INTEREST·OTHER */
  category?: string
  parentId?: string | null
  description?: string | null
  /** 다른 표기 — 주면 통째로 바꾼다 */
  aliases?: IdeologyAliasInput[]
}

export type UpdateIdeologyBody = Partial<CreateIdeologyBody>

const ideologyInclude = {
  parent: { select: { id: true, name: true } },
  aliases: { select: { id: true, name: true, languageCode: true }, orderBy: { name: 'asc' as const } },
  _count: { select: { partyLinks: true, children: true } },
} satisfies Prisma.IdeologyInclude

@ApiTags('ideologies')
@Controller('ideologies')
@UseGuards(AuthGuard('jwt'))
export class IdeologyController {
  constructor(private readonly prisma: PrismaService) {}

  /** 목록 — q는 이름·영문·별칭 부분 일치, category로 거른다 */
  @Get()
  async list(@Query('q') rawQuery?: string, @Query('category') category?: string): Promise<any> {
    const query = rawQuery?.trim()
    const where: Prisma.IdeologyWhereInput = {}
    if (category) where.category = this.parseCategory(category)
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { englishName: { contains: query } },
        { aliases: { some: { name: { contains: query } } } },
      ]
    }
    return this.prisma.ideology.findMany({
      where,
      include: ideologyInclude,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    const row = await this.prisma.ideology.findUnique({
      where: { id },
      include: {
        ...ideologyInclude,
        children: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
        partyLinks: {
          select: { party: { select: { id: true, name: true, shortName: true, countryId: true, historicalCountryId: true } } },
          orderBy: { party: { name: 'asc' } },
        },
      },
    })
    if (!row) throw new NotFoundException('이념을 찾을 수 없습니다.')
    return row
  }

  @Post()
  async create(@Body() body: CreateIdeologyBody): Promise<any> {
    const name = this.requireName(body.name)
    const aliases = this.parseAliases(body.aliases, name)
    if (body.parentId) await this.ensureExists(body.parentId, '상위 이념')
    await this.assertLabelsFree([name, ...aliases.map((alias) => alias.name)], null)
    try {
      return await this.prisma.ideology.create({
        data: {
          name,
          englishName: body.englishName?.trim() || null,
          category: body.category ? this.parseCategory(body.category) : IdeologyCategory.IDEOLOGY,
          parentId: body.parentId || null,
          description: body.description?.trim() || null,
          aliases: { create: aliases },
        },
        include: ideologyInclude,
      })
    } catch (error) {
      this.rethrowConflict(error)
      throw error
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateIdeologyBody): Promise<any> {
    const existing = await this.prisma.ideology.findUnique({ where: { id }, select: { id: true, name: true } })
    if (!existing) throw new NotFoundException('이념을 찾을 수 없습니다.')
    const data: Prisma.IdeologyUncheckedUpdateInput = {}
    const name = body.name !== undefined ? this.requireName(body.name) : existing.name
    if (body.name !== undefined) data.name = name
    if (body.englishName !== undefined) data.englishName = body.englishName?.trim() || null
    if (body.category !== undefined) data.category = this.parseCategory(body.category)
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.parentId !== undefined) {
      if (body.parentId) {
        await this.ensureExists(body.parentId, '상위 이념')
        await this.assertNoCycle(id, body.parentId)
      }
      data.parentId = body.parentId || null
    }
    const aliases = body.aliases !== undefined ? this.parseAliases(body.aliases, name) : null
    await this.assertLabelsFree([name, ...(aliases ?? []).map((alias) => alias.name)], id)
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (aliases) {
          await tx.ideologyAlias.deleteMany({ where: { ideologyId: id } })
          if (aliases.length > 0) {
            await tx.ideologyAlias.createMany({ data: aliases.map((alias) => ({ ...alias, ideologyId: id })) })
          }
        }
        const row = await tx.ideology.update({ where: { id }, data, include: ideologyInclude })
        /* 이름이 바뀌면 이 이념을 쓰는 정당의 표시 캐시도 바꾼다 */
        if (body.name !== undefined && name !== existing.name) {
          const links = await tx.politicalPartyIdeology.findMany({ where: { ideologyId: id }, select: { partyId: true } })
          for (const link of links) await refreshPartyIdeologyCache(tx, link.partyId)
        }
        return row
      })
    } catch (error) {
      this.rethrowConflict(error)
      throw error
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    const row = await this.prisma.ideology.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { partyLinks: true } } },
    })
    if (!row) throw new NotFoundException('이념을 찾을 수 없습니다.')
    if (row._count.partyLinks > 0) {
      throw new ConflictException(`「${row.name}」을 쓰는 정당이 ${row._count.partyLinks}곳 있습니다. 연결을 먼저 푸세요.`)
    }
    /* 하위 이념은 FK SetNull로 최상위가 된다 */
    await this.prisma.ideology.delete({ where: { id } })
  }

  // ── 내부 ──

  private requireName(raw: string | undefined): string {
    const name = raw?.trim() ?? ''
    if (!name) throw new BadRequestException('이념 이름을 입력하세요.')
    if (name.length > 120) throw new BadRequestException('이념 이름은 120자 이하여야 합니다.')
    return name
  }

  private parseCategory(raw: string): IdeologyCategory {
    if (!CATEGORY_VALUES.has(raw)) throw new BadRequestException(`이념 범주가 올바르지 않습니다: ${raw}`)
    return raw as IdeologyCategory
  }

  private parseAliases(raw: IdeologyAliasInput[] | undefined, ownName: string): Array<{ name: string; languageCode: string | null }> {
    if (raw === undefined) return []
    if (!Array.isArray(raw)) throw new BadRequestException('aliases는 배열이어야 합니다.')
    const seen = new Set<string>()
    const result: Array<{ name: string; languageCode: string | null }> = []
    for (const alias of raw) {
      const name = alias?.name?.trim() ?? ''
      if (!name || name === ownName || seen.has(name)) continue
      if (name.length > 150) throw new BadRequestException('별칭은 150자 이하여야 합니다.')
      const code = alias.languageCode?.trim() || null
      if (code && !LANGUAGE_CODE_PATTERN.test(code)) {
        throw new BadRequestException('언어 코드는 ISO 639 형식이어야 합니다(예: ko, en, it).')
      }
      seen.add(name)
      result.push({ name, languageCode: code })
    }
    return result
  }

  /** 이름·별칭은 카탈로그 전체에서 한 개념만 가리킨다 — 다른 이념의 이름이나 별칭과 겹치면 409 */
  private async assertLabelsFree(labels: string[], selfId: string | null): Promise<void> {
    const notSelf = selfId ? { not: selfId } : undefined
    const nameHit = await this.prisma.ideology.findFirst({
      where: { name: { in: labels }, ...(notSelf ? { id: notSelf } : {}) },
      select: { name: true },
    })
    if (nameHit) throw new ConflictException(`「${nameHit.name}」은 이미 다른 이념의 이름입니다.`)
    const aliasHit = await this.prisma.ideologyAlias.findFirst({
      where: { name: { in: labels }, ...(notSelf ? { ideologyId: notSelf } : {}) },
      select: { name: true, ideology: { select: { name: true } } },
    })
    if (aliasHit) {
      throw new ConflictException(`「${aliasHit.name}」은 이미 「${aliasHit.ideology.name}」의 다른 표기입니다.`)
    }
  }

  private async ensureExists(id: string, label: string): Promise<void> {
    const row = await this.prisma.ideology.findUnique({ where: { id }, select: { id: true } })
    if (!row) throw new BadRequestException(`${label}을 찾을 수 없습니다.`)
  }

  /** 부모로 고른 이념의 조상 사슬에 자기 자신이 있으면 순환 */
  private async assertNoCycle(selfId: string, parentId: string): Promise<void> {
    let cursor: string | null = parentId
    for (let depth = 0; cursor && depth < 50; depth += 1) {
      if (cursor === selfId) throw new BadRequestException('자기 자신이나 하위 이념을 상위로 둘 수 없습니다.')
      const next: { parentId: string | null } | null = await this.prisma.ideology.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      cursor = next?.parentId ?? null
    }
  }

  private rethrowConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('같은 이름이나 표기가 이미 있습니다.')
    }
  }
}
