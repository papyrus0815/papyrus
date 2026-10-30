import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CitationTargetType, ObservationSubjectType, Prisma, SourceKind, SourceTier } from '@prisma/client'
import { PrismaService } from '../../../../prisma/prisma.service'

import type { CreateSourceDto, UpdateSourceDto } from '../presentation/dto/evidence.dto'
import { findOrCreateSource, SOURCE_VIEW_SELECT, type SourceView } from './citation.service'
import type { MetricView } from './observation.service'

/** 출처 서고 한 줄 — 출처 + 인용 횟수 */
export interface SourceLibraryEntry extends SourceView {
  citationCount: number
  /** 이 출처를 인용한 사건 수(측정값 경유) */
  eventCount: number
  /** 시스템 출처(등록자 없음)는 수정 불가 */
  editable: boolean
}

/** 출처가 쓰인 곳 — 측정값 한 줄 */
export interface SourceUsage {
  citationId: string
  locator: string | null
  observationId: string
  metricName: string
  value: string | null
  eventId: string | null
  eventTitle: string | null
  /** 사건 자체·진영·참여국 */
  subjectType: ObservationSubjectType
  subjectLabel: string | null
}

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
    if (dto.writtenYear !== undefined) patch.writtenYear = dto.writtenYear
    if (dto.tier !== undefined) patch.tier = dto.tier as SourceTier | null
    for (const key of ['perspective', 'language', 'originalTitle'] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key]?.trim() || null
    }
    return this.prisma.source.update({ where: { id }, data: patch, select: SOURCE_VIEW_SELECT })
  }

  /**
   * 출처 서고 — 검색 + 등급 필터, 인용 많은 순. 출처를 한곳에서 보고 고치는 화면용.
   */
  async library(
    actorId: string,
    options: { query?: string; tier?: string; kind?: string },
  ): Promise<SourceLibraryEntry[]> {
    const keyword = options.query?.trim()
    const where: Prisma.SourceWhereInput = {
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { originalTitle: { contains: keyword } },
              { authors: { contains: keyword } },
              { publisher: { contains: keyword } },
              { identifier: { contains: keyword } },
            ],
          }
        : {}),
      ...(options.tier === 'NONE'
        ? { tier: null }
        : options.tier && options.tier in SourceTier
          ? { tier: options.tier as SourceTier }
          : {}),
      ...(options.kind && options.kind in SourceKind ? { kind: options.kind as SourceKind } : {}),
    }
    const sources = await this.prisma.source.findMany({
      where,
      select: { ...SOURCE_VIEW_SELECT, createdById: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
    const ids = sources.map((source) => source.id)
    const citations = ids.length
      ? await this.prisma.citation.findMany({
          where: { sourceId: { in: ids } },
          select: { sourceId: true, targetType: true, targetId: true },
        })
      : []
    const eventByObservation = await this.eventIdsOfObservations(
      citations
        .filter((citation) => citation.targetType === CitationTargetType.OBSERVATION)
        .map((citation) => citation.targetId),
    )
    const counts = new Map<string, { citations: number; events: Set<string> }>()
    for (const citation of citations) {
      const entry = counts.get(citation.sourceId) ?? { citations: 0, events: new Set<string>() }
      entry.citations += 1
      const eventId = eventByObservation.get(citation.targetId)
      if (eventId) entry.events.add(eventId)
      counts.set(citation.sourceId, entry)
    }
    return sources
      .map(({ createdById, ...source }) => ({
        ...source,
        citationCount: counts.get(source.id)?.citations ?? 0,
        eventCount: counts.get(source.id)?.events.size ?? 0,
        editable: createdById !== null && createdById === actorId,
      }))
      .sort((left, right) => right.citationCount - left.citationCount)
  }

  /** 출처가 쓰인 곳 — 측정값 인용을 사건까지 거슬러 올라간다 */
  async usages(id: string): Promise<SourceUsage[]> {
    const found = await this.prisma.source.findUnique({ where: { id }, select: { id: true } })
    if (!found) throw new NotFoundException('출처를 찾을 수 없습니다')
    const citations = await this.prisma.citation.findMany({
      where: { sourceId: id, targetType: CitationTargetType.OBSERVATION },
      select: { id: true, locator: true, targetId: true },
      take: 300,
    })
    const observations = await this.prisma.observation.findMany({
      where: { id: { in: citations.map((citation) => citation.targetId) } },
      select: {
        id: true,
        subjectType: true,
        subjectId: true,
        value: true,
        metric: { select: { name: true } },
      },
    })
    const observationById = new Map(observations.map((row) => [row.id, row]))
    const sideIds = observations
      .filter((row) => row.subjectType === ObservationSubjectType.EVENT_SIDE)
      .map((row) => row.subjectId)
    const participantIds = observations
      .filter((row) => row.subjectType === ObservationSubjectType.EVENT_PARTICIPANT)
      .map((row) => row.subjectId)
    const [sides, participants] = await Promise.all([
      this.prisma.eventSide.findMany({
        where: { id: { in: sideIds } },
        select: { id: true, name: true, eventId: true },
      }),
      this.prisma.eventCountryRelation.findMany({
        where: { id: { in: participantIds } },
        select: {
          id: true,
          eventId: true,
          country: { select: { name: true } },
          historicalCountry: { select: { name: true } },
        },
      }),
    ])
    const subjectOf = new Map<string, { eventId: string; label: string | null }>()
    for (const side of sides) subjectOf.set(side.id, { eventId: side.eventId, label: side.name })
    for (const participant of participants) {
      subjectOf.set(participant.id, {
        eventId: participant.eventId,
        label: participant.historicalCountry?.name ?? participant.country?.name ?? null,
      })
    }
    for (const row of observations) {
      if (row.subjectType === ObservationSubjectType.EVENT) {
        subjectOf.set(row.subjectId, { eventId: row.subjectId, label: null })
      }
    }
    const eventIds = [...new Set([...subjectOf.values()].map((entry) => entry.eventId))]
    const events = await this.prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true },
    })
    const titleById = new Map(events.map((event) => [event.id, event.title]))
    return citations.flatMap((citation) => {
      const observation = observationById.get(citation.targetId)
      if (!observation) return []
      const subject = subjectOf.get(observation.subjectId) ?? null
      return [
        {
          citationId: citation.id,
          locator: citation.locator,
          observationId: observation.id,
          metricName: observation.metric.name,
          value: observation.value?.toString() ?? null,
          eventId: subject?.eventId ?? null,
          eventTitle: subject ? (titleById.get(subject.eventId) ?? null) : null,
          subjectType: observation.subjectType,
          subjectLabel: subject?.label ?? null,
        },
      ]
    })
  }

  /** 측정값 id → 사건 id (사건·진영·참여국 경유) */
  private async eventIdsOfObservations(observationIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    if (observationIds.length === 0) return result
    const observations = await this.prisma.observation.findMany({
      where: { id: { in: observationIds } },
      select: { id: true, subjectType: true, subjectId: true },
    })
    const [sides, participants] = await Promise.all([
      this.prisma.eventSide.findMany({
        where: {
          id: {
            in: observations
              .filter((row) => row.subjectType === ObservationSubjectType.EVENT_SIDE)
              .map((row) => row.subjectId),
          },
        },
        select: { id: true, eventId: true },
      }),
      this.prisma.eventCountryRelation.findMany({
        where: {
          id: {
            in: observations
              .filter((row) => row.subjectType === ObservationSubjectType.EVENT_PARTICIPANT)
              .map((row) => row.subjectId),
          },
        },
        select: { id: true, eventId: true },
      }),
    ])
    const eventBySubject = new Map<string, string>([
      ...sides.map((row) => [row.id, row.eventId] as [string, string]),
      ...participants.map((row) => [row.id, row.eventId] as [string, string]),
    ])
    for (const row of observations) {
      const eventId =
        row.subjectType === ObservationSubjectType.EVENT
          ? row.subjectId
          : eventBySubject.get(row.subjectId)
      if (eventId) result.set(row.id, eventId)
    }
    return result
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
