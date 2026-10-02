import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, SourceKind } from '@prisma/client'
import { PrismaService } from '../../../../prisma/prisma.service'

import type { CreateSourceDto, UpdateSourceDto } from '../presentation/dto/evidence.dto'
import { findOrCreateSource, SOURCE_VIEW_SELECT, type SourceView } from './citation.service'
import type { MetricView } from './observation.service'

/**
 * 출처·지표 카탈로그 — 측정값이 고르는 두 목록.
 */
@Injectable()
export class SourceService {
  constructor(private readonly prisma: PrismaService) {}

  /** 출처 검색 — 제목·저자·발행처·식별자 부분 일치 */
  async search(query: string | undefined, limit = 20): Promise<SourceView[]> {
    const keyword = query?.trim()
    const where: Prisma.SourceWhereInput = keyword
      ? {
          OR: [
            { title: { contains: keyword } },
            { authors: { contains: keyword } },
            { publisher: { contains: keyword } },
            { identifier: { contains: keyword } },
          ],
        }
      : {}
    return this.prisma.source.findMany({
      where,
      select: SOURCE_VIEW_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    })
  }

  /** 출처 등록 — 식별자·URL이 같은 출처가 있으면 그것을 돌려준다 */
  async create(actorId: string, dto: CreateSourceDto): Promise<SourceView> {
    const id = await findOrCreateSource(this.prisma, dto, actorId)
    return this.prisma.source.findUniqueOrThrow({ where: { id }, select: SOURCE_VIEW_SELECT })
  }

  /** 출처 수정 — 등록자만. 시스템 출처(등록자 없음)는 잠긴다 */
  async update(actorId: string, id: string, dto: UpdateSourceDto): Promise<SourceView> {
    const current = await this.prisma.source.findUnique({
      where: { id },
      select: { createdById: true },
    })
    if (!current) throw new NotFoundException('출처를 찾을 수 없습니다')
    if (current.createdById !== actorId) {
      throw new ForbiddenException('본인이 등록한 출처만 수정할 수 있습니다')
    }
    const patch: Prisma.SourceUpdateInput = {}
    if (dto.kind !== undefined) patch.kind = dto.kind as SourceKind
    if (dto.title !== undefined) patch.title = dto.title.trim()
    for (const key of [
      'authors',
      'publisher',
      'url',
      'identifier',
      'accessedOn',
      'note',
    ] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key]?.trim() || null
    }
    if (dto.publishedYear !== undefined) patch.publishedYear = dto.publishedYear
    return this.prisma.source.update({ where: { id }, data: patch, select: SOURCE_VIEW_SELECT })
  }

  /** 지표 카탈로그 — 묶음·순서대로 */
  async listMetrics(domain?: string): Promise<MetricView[]> {
    return this.prisma.metricDefinition.findMany({
      where: domain ? { domain } : {},
      select: {
        key: true,
        name: true,
        domain: true,
        valueKind: true,
        aggregation: true,
        unit: true,
        definition: true,
      },
      orderBy: [{ domain: 'asc' }, { sortOrder: 'asc' }],
    })
  }
}
