import { Injectable } from '@nestjs/common'
import { Era } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IHistoricalCountryTransitionRepository,
  HistoricalCountryTransitionRecord,
  CreateTransitionData,
  UpdateTransitionData,
} from '../domain/historical-country-transition.repository'

const successorSelect = {
  id: true,
  name: true,
  startEra: true,
  startYear: true,
  startMonth: true,
  startDay: true,
} as const

/**
 * 후임 국가의 존속 시작 시점 표시 문자열.
 *
 * era 접두(BC)는 월·일 유무와 무관하게 **항상 먼저** 붙인다.
 * (과거에는 월이 있으면 조기 반환해 'BC 44년 3월'이 '0044.03'으로 나가 AD로 오독됐다.)
 * 연도는 zero-pad 하지 않는다 — '0044' 단독 노출은 연대가 아니라 코드처럼 읽힌다.
 */
function formatSuccessorStartDate(
  startEra: Era | null,
  startYear: number | null,
  startMonth: number | null,
  startDay: number | null,
): string | null {
  if (startYear == null) return null
  const prefix = startEra === 'BC' ? 'BC ' : ''
  const year = String(Math.abs(startYear))
  if (startMonth != null && startDay != null)
    return `${prefix}${year}.${String(startMonth).padStart(2, '0')}.${String(startDay).padStart(2, '0')}`
  if (startMonth != null) return `${prefix}${year}.${String(startMonth).padStart(2, '0')}`
  return `${prefix}${year}`
}

function toRecord(row: {
  id: string
  predecessorId: string
  successorId: string
  eventType: string
  transitionScope: string | null
  predecessor: { name: string }
  successor: { name: string; startEra: Era | null; startYear: number | null; startMonth: number | null; startDay: number | null }
  createdAt: Date
  updatedAt: Date
}): HistoricalCountryTransitionRecord {
  return {
    id: row.id,
    predecessorId: row.predecessorId,
    successorId: row.successorId,
    eventType: row.eventType as HistoricalCountryTransitionRecord['eventType'],
    transitionScope: row.transitionScope as HistoricalCountryTransitionRecord['transitionScope'],
    successorStartDate: formatSuccessorStartDate(
      row.successor.startEra,
      row.successor.startYear,
      row.successor.startMonth,
      row.successor.startDay,
    ),
    predecessorName: row.predecessor.name,
    successorName: row.successor.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

@Injectable()
export class HistoricalCountryTransitionPrismaRepository
  implements IHistoricalCountryTransitionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findManyByHistoricalCountryId(
    historicalCountryId: string,
  ): Promise<HistoricalCountryTransitionRecord[]> {
    return this.findManyByHistoricalCountryIds([historicalCountryId])
  }

  async findManyByHistoricalCountryIds(
    historicalCountryIds: string[],
  ): Promise<HistoricalCountryTransitionRecord[]> {
    if (historicalCountryIds.length === 0) return []
    const rows = await this.prisma.historicalCountryTransition.findMany({
      where: {
        OR: [
          { predecessorId: { in: historicalCountryIds } },
          { successorId: { in: historicalCountryIds } },
        ],
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: successorSelect },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toRecord)
  }

  async findById(id: string): Promise<HistoricalCountryTransitionRecord | null> {
    const row = await this.prisma.historicalCountryTransition.findUnique({
      where: { id },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: successorSelect },
      },
    })
    if (!row) return null
    return toRecord(row)
  }

  async create(data: CreateTransitionData): Promise<HistoricalCountryTransitionRecord> {
    const row = await this.prisma.historicalCountryTransition.create({
      data: {
        predecessorId: data.predecessorId,
        successorId: data.successorId,
        eventType: data.eventType,
        transitionScope: data.transitionScope ?? undefined,
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: successorSelect },
      },
    })
    return toRecord(row)
  }

  async update(
    id: string,
    data: UpdateTransitionData,
  ): Promise<HistoricalCountryTransitionRecord> {
    const row = await this.prisma.historicalCountryTransition.update({
      where: { id },
      data: {
        ...(data.eventType !== undefined && { eventType: data.eventType }),
        ...(data.transitionScope !== undefined && { transitionScope: data.transitionScope }),
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: successorSelect },
      },
    })
    return toRecord(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalCountryTransition.delete({
      where: { id },
    })
  }
}
