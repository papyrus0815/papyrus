import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IHistoricalCountryTransitionRepository,
  HistoricalCountryTransitionRecord,
  CreateTransitionData,
  UpdateTransitionData,
} from '../domain/historical-country-transition.repository'

@Injectable()
export class HistoricalCountryTransitionPrismaRepository
  implements IHistoricalCountryTransitionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findManyByHistoricalCountryId(
    historicalCountryId: string,
  ): Promise<HistoricalCountryTransitionRecord[]> {
    const rows = await this.prisma.historicalCountryTransition.findMany({
      where: {
        OR: [
          { predecessorId: historicalCountryId },
          { successorId: historicalCountryId },
        ],
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } },
      },
      orderBy: { eventDate: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      predecessorId: r.predecessorId,
      successorId: r.successorId,
      eventType: r.eventType,
      eventDate: r.eventDate,
      predecessorName: r.predecessor.name,
      successorName: r.successor.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  }

  async findById(id: string): Promise<HistoricalCountryTransitionRecord | null> {
    const row = await this.prisma.historicalCountryTransition.findUnique({
      where: { id },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } },
      },
    })
    if (!row) return null
    return {
      id: row.id,
      predecessorId: row.predecessorId,
      successorId: row.successorId,
      eventType: row.eventType,
      eventDate: row.eventDate,
      predecessorName: row.predecessor.name,
      successorName: row.successor.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async create(data: CreateTransitionData): Promise<HistoricalCountryTransitionRecord> {
    const row = await this.prisma.historicalCountryTransition.create({
      data: {
        predecessorId: data.predecessorId,
        successorId: data.successorId,
        eventType: data.eventType,
        eventDate: data.eventDate,
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } },
      },
    })
    return {
      id: row.id,
      predecessorId: row.predecessorId,
      successorId: row.successorId,
      eventType: row.eventType,
      eventDate: row.eventDate,
      predecessorName: row.predecessor.name,
      successorName: row.successor.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async update(
    id: string,
    data: UpdateTransitionData,
  ): Promise<HistoricalCountryTransitionRecord> {
    const row = await this.prisma.historicalCountryTransition.update({
      where: { id },
      data: {
        ...(data.eventType != null && { eventType: data.eventType }),
        ...(data.eventDate != null && { eventDate: data.eventDate }),
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } },
      },
    })
    return {
      id: row.id,
      predecessorId: row.predecessorId,
      successorId: row.successorId,
      eventType: row.eventType,
      eventDate: row.eventDate,
      predecessorName: row.predecessor.name,
      successorName: row.successor.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalCountryTransition.delete({
      where: { id },
    })
  }
}
