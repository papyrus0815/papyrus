import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  CitationTargetType,
  MetricAggregation,
  MetricValueKind,
  ObservationSubjectType,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../../../../prisma/prisma.service'

import { decimalToString, normalizeObservationValue } from '../domain/observation-value'
import {
  assertPointOrder,
  columnsToPoint,
  normalizePoint,
  pointToColumns,
  type StructuredPoint,
} from '../../shared/structured-point'
import type { CreateObservationDto, UpdateObservationDto } from '../presentation/dto/evidence.dto'
import { CitationService, type CitationView } from './citation.service'
import { SubjectAccessService } from './subject-access.service'

export interface MetricView {
  key: string
  name: string
  domain: string
  valueKind: MetricValueKind
  aggregation: MetricAggregation
  unit: string | null
  definition: string | null
}

export interface ObservationView {
  id: string
  subjectType: ObservationSubjectType
  subjectId: string
  metric: MetricView
  /** Decimal은 문자열 — 자릿수 보존 */
  value: string | null
  low: string | null
  high: string | null
  approx: boolean
  atLeast: boolean
  qualifier: string | null
  currency: { code: string; name: string; symbol: string } | null
  start: StructuredPoint | null
  end: StructuredPoint | null
  note: string | null
  sortOrder: number
  citations: CitationView[]
}

const METRIC_SELECT = {
  id: true,
  key: true,
  name: true,
  domain: true,
  valueKind: true,
  aggregation: true,
  unit: true,
  definition: true,
} as const

const OBSERVATION_INCLUDE = {
  metric: { select: METRIC_SELECT },
  currency: { select: { code: true, name: true, symbol: true } },
} as const

type ObservationRow = Prisma.ObservationGetPayload<{ include: typeof OBSERVATION_INCLUDE }>

/**
 * 측정값 — **쓰기 단일 통로**. 출처 1개 이상을 강제하는 곳이 여기 하나뿐이어야 한다.
 */
@Injectable()
export class ObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectAccess: SubjectAccessService,
    private readonly citations: CitationService,
  ) {}

  async listBySubject(
    subjectType: ObservationSubjectType,
    subjectId: string,
  ): Promise<ObservationView[]> {
    await this.subjectAccess.assertExists(subjectType, subjectId)
    const rows = await this.prisma.observation.findMany({
      where: { subjectType, subjectId },
      include: OBSERVATION_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return this.toViews(rows)
  }

  /**
   * 사건 단위 — 사건 자신 + 그 사건의 참여국 줄 + 진영에 달린 측정값 전부.
   * 상세 화면이 진영별 비교 차트를 그리려면 한 번에 받아야 한다.
   */
  async listForEvent(eventId: string): Promise<ObservationView[]> {
    await this.subjectAccess.assertExists(ObservationSubjectType.EVENT, eventId)
    const [participants, sides] = await Promise.all([
      this.prisma.eventCountryRelation.findMany({ where: { eventId }, select: { id: true } }),
      this.prisma.eventSide.findMany({ where: { eventId }, select: { id: true } }),
    ])
    const rows = await this.prisma.observation.findMany({
      where: {
        OR: [
          { subjectType: ObservationSubjectType.EVENT, subjectId: eventId },
          {
            subjectType: ObservationSubjectType.EVENT_PARTICIPANT,
            subjectId: { in: participants.map((row) => row.id) },
          },
          {
            subjectType: ObservationSubjectType.EVENT_SIDE,
            subjectId: { in: sides.map((row) => row.id) },
          },
        ],
      },
      include: OBSERVATION_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return this.toViews(rows)
  }

  async create(actorId: string, dto: CreateObservationDto): Promise<ObservationView> {
    const subjectType = dto.subjectType as ObservationSubjectType
    await this.subjectAccess.assertWritable(subjectType, dto.subjectId, actorId)

    const metric = await this.findMetric(dto.metricKey)
    const numbers = normalizeObservationValue(dto)
    const currencyId = await this.resolveCurrency(metric.valueKind, dto.currencyCode)
    const start = dto.start ? normalizePoint(dto.start, 'start') : null
    const end = dto.end ? normalizePoint(dto.end, 'end') : null
    assertPointOrder(start, end)

    const id = await this.prisma.$transaction(async (tx) => {
      const sortOrder =
        dto.sortOrder ??
        (await tx.observation.count({ where: { subjectType, subjectId: dto.subjectId } }))
      const created = await tx.observation.create({
        data: {
          subjectType,
          subjectId: dto.subjectId,
          metricId: metric.id,
          ...numbers,
          qualifier: dto.qualifier?.trim() || null,
          currencyId,
          ...prefixColumns('start', pointToColumns(start)),
          ...prefixColumns('end', pointToColumns(end)),
          note: dto.note ?? null,
          sortOrder,
          createdById: actorId,
        },
        select: { id: true },
      })
      await this.citations.sync(
        tx,
        CitationTargetType.OBSERVATION,
        created.id,
        dto.citations,
        actorId,
      )
      return created.id
    })
    return this.getView(id)
  }

  async update(actorId: string, id: string, dto: UpdateObservationDto): Promise<ObservationView> {
    const current = await this.prisma.observation.findUnique({
      where: { id },
      include: OBSERVATION_INCLUDE,
    })
    if (!current) throw new NotFoundException('측정값을 찾을 수 없습니다')
    await this.subjectAccess.assertWritable(current.subjectType, current.subjectId, actorId)

    const patch: Prisma.ObservationUncheckedUpdateInput = {}

    const metric =
      dto.metricKey !== undefined && dto.metricKey !== current.metric.key
        ? await this.findMetric(dto.metricKey)
        : { id: current.metricId, valueKind: current.metric.valueKind }
    if (metric.id !== current.metricId) patch.metricId = metric.id

    /* 수치 다섯 칸은 묶음 — 하나라도 오면 새 조합 전체를 다시 검증한다 */
    const touchesNumbers = (['value', 'low', 'high', 'approx', 'atLeast'] as const).some(
      (key) => dto[key] !== undefined,
    )
    if (touchesNumbers) {
      Object.assign(
        patch,
        normalizeObservationValue({
          value: dto.value !== undefined ? dto.value : decimalToString(current.value),
          low: dto.low !== undefined ? dto.low : decimalToString(current.low),
          high: dto.high !== undefined ? dto.high : decimalToString(current.high),
          approx: dto.approx ?? current.approx,
          atLeast: dto.atLeast ?? current.atLeast,
        }),
      )
    }

    /* 통화는 지표 성격에 묶인다 — 지표가 바뀌면 통화도 다시 판정한다 */
    if (dto.currencyCode !== undefined || patch.metricId !== undefined) {
      const code =
        dto.currencyCode !== undefined ? dto.currencyCode : current.currency?.code ?? null
      patch.currencyId = await this.resolveCurrency(metric.valueKind, code)
    }

    if (dto.start !== undefined || dto.end !== undefined) {
      const start =
        dto.start !== undefined
          ? dto.start
            ? normalizePoint(dto.start, 'start')
            : null
          : columnsToPoint(columnsOf(current, 'start'))
      const end =
        dto.end !== undefined
          ? dto.end
            ? normalizePoint(dto.end, 'end')
            : null
          : columnsToPoint(columnsOf(current, 'end'))
      assertPointOrder(start, end)
      Object.assign(
        patch,
        prefixColumns('start', pointToColumns(start)),
        prefixColumns('end', pointToColumns(end)),
      )
    }

    if (dto.qualifier !== undefined) patch.qualifier = dto.qualifier?.trim() || null
    if (dto.note !== undefined) patch.note = dto.note
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx.observation.update({ where: { id }, data: patch })
      }
      if (dto.citations !== undefined) {
        await this.citations.sync(tx, CitationTargetType.OBSERVATION, id, dto.citations, actorId)
      }
    })
    return this.getView(id)
  }

  async remove(actorId: string, id: string): Promise<void> {
    const current = await this.prisma.observation.findUnique({
      where: { id },
      select: { subjectType: true, subjectId: true },
    })
    if (!current) throw new NotFoundException('측정값을 찾을 수 없습니다')
    await this.subjectAccess.assertWritable(current.subjectType, current.subjectId, actorId)
    await this.prisma.$transaction(async (tx) => {
      await this.citations.removeForTargets(tx, CitationTargetType.OBSERVATION, [id])
      await tx.observation.delete({ where: { id } })
    })
  }

  private async getView(id: string): Promise<ObservationView> {
    const row = await this.prisma.observation.findUniqueOrThrow({
      where: { id },
      include: OBSERVATION_INCLUDE,
    })
    const [view] = await this.toViews([row])
    return view
  }

  private async toViews(rows: ObservationRow[]): Promise<ObservationView[]> {
    const citationsById = await this.citations.listForTargets(
      this.prisma,
      CitationTargetType.OBSERVATION,
      rows.map((row) => row.id),
    )
    return rows.map((row) => ({
      id: row.id,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      metric: {
        key: row.metric.key,
        name: row.metric.name,
        domain: row.metric.domain,
        valueKind: row.metric.valueKind,
        aggregation: row.metric.aggregation,
        unit: row.metric.unit,
        definition: row.metric.definition,
      },
      value: decimalToString(row.value),
      low: decimalToString(row.low),
      high: decimalToString(row.high),
      approx: row.approx,
      atLeast: row.atLeast,
      qualifier: row.qualifier,
      currency: row.currency,
      start: columnsToPoint(columnsOf(row, 'start')),
      end: columnsToPoint(columnsOf(row, 'end')),
      note: row.note,
      sortOrder: row.sortOrder,
      citations: citationsById.get(row.id) ?? [],
    }))
  }

  private async findMetric(key: string): Promise<{ id: string; valueKind: MetricValueKind }> {
    const metric = await this.prisma.metricDefinition.findUnique({
      where: { key },
      select: { id: true, valueKind: true },
    })
    if (!metric) throw new BadRequestException(`알 수 없는 지표입니다: ${key}`)
    return metric
  }

  /** MONEY 지표는 통화 필수, 그 밖의 지표는 통화 금지 — 단위가 두 곳에서 말하지 않게 */
  private async resolveCurrency(
    valueKind: MetricValueKind,
    code: string | null | undefined,
  ): Promise<string | null> {
    if (valueKind !== MetricValueKind.MONEY) {
      if (code) throw new BadRequestException('금액 지표가 아니면 통화를 지정할 수 없습니다')
      return null
    }
    if (!code) throw new BadRequestException('금액 지표에는 통화(currencyCode)가 필요합니다')
    const currency = await this.prisma.currency.findUnique({ where: { code }, select: { id: true } })
    if (!currency) throw new BadRequestException(`알 수 없는 통화 코드입니다: ${code}`)
    return currency.id
  }
}

function prefixColumns(
  prefix: 'start' | 'end',
  columns: ReturnType<typeof pointToColumns>,
): Record<string, unknown> {
  return {
    [`${prefix}Era`]: columns.era,
    [`${prefix}Year`]: columns.year,
    [`${prefix}Month`]: columns.month,
    [`${prefix}Day`]: columns.day,
    [`${prefix}Precision`]: columns.precision,
  }
}

function columnsOf(
  row: {
    startEra: 'BC' | 'AD' | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    endEra: 'BC' | 'AD' | null
    endYear: number | null
    endMonth: number | null
    endDay: number | null
  },
  prefix: 'start' | 'end',
) {
  return prefix === 'start'
    ? { era: row.startEra, year: row.startYear, month: row.startMonth, day: row.startDay }
    : { era: row.endEra, year: row.endYear, month: row.endMonth, day: row.endDay }
}
