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

function formatSuccessorStartDate(
  startEra: Era | null,
  startYear: number | null,
  startMonth: number | null,
  startDay: number | null,
): string | null {
  if (startYear == null) return null
  const yy = String(Math.abs(startYear)).padStart(4, '0')
  if (startMonth != null && startDay != null) return `${yy}.${String(startMonth).padStart(2, '0')}.${String(startDay).padStart(2, '0')}`
  if (startMonth != null) return `${yy}.${String(startMonth).padStart(2, '0')}`
  return startEra === 'BC' ? `BC ${startYear}` : yy
}

function toRecord(row: {
  id: string
  predecessorId: string
  successorId: string
  eventType: string
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
