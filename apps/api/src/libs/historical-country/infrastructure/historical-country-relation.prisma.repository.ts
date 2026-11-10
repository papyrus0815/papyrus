import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IHistoricalCountryRelationRepository,
  HistoricalCountryRelationRecord,
  CreateRelationData,
  UpdateRelationData,
} from '../domain/historical-country-relation.repository'

@Injectable()
export class HistoricalCountryRelationPrismaRepository
  implements IHistoricalCountryRelationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private assertValidRelationPeriod(
    startDate?: Date | null,
    endDate?: Date | null,
  ): void {
    if (
      startDate &&
      endDate &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      startDate.getTime() > endDate.getTime()
    ) {
      throw new BadRequestException(
        '관계 종료일이 관계 시작일보다 앞설 수 없습니다.',
      )
    }
  }

  async findManyByHistoricalCountryId(
    historicalCountryId: string,
  ): Promise<HistoricalCountryRelationRecord[]> {
    return this.findManyByHistoricalCountryIds([historicalCountryId])
  }

  async findManyByHistoricalCountryIds(
    historicalCountryIds: string[],
  ): Promise<HistoricalCountryRelationRecord[]> {
    if (historicalCountryIds.length === 0) return []
    const rows = await this.prisma.historicalCountryRelation.findMany({
      where: {
        OR: [
          { subjectCountryId: { in: historicalCountryIds } },
          { objectCountryId: { in: historicalCountryIds } },
        ],
      },
      include: {
        subjectCountry: { select: { id: true, name: true } },
        objectCountry: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toRecord(r))
  }

  async findById(id: string): Promise<HistoricalCountryRelationRecord | null> {
    const row = await this.prisma.historicalCountryRelation.findUnique({
      where: { id },
      include: {
        subjectCountry: { select: { id: true, name: true } },
        objectCountry: { select: { id: true, name: true } },
      },
    })
    return row ? this.toRecord(row) : null
  }

  async create(data: CreateRelationData): Promise<HistoricalCountryRelationRecord> {
    this.assertValidRelationPeriod(data.startDate, data.endDate)
    if (this.prisma.historicalCountryRelation?.findFirst) {
      const duplicate = await this.prisma.historicalCountryRelation.findFirst({
        where: {
          subjectCountryId: data.subjectCountryId,
          objectCountryId: data.objectCountryId,
          relationType: data.relationType,
        },
        select: { id: true },
      })
      if (duplicate) {
        throw new ConflictException(
          '이미 동일한 국가 간 수평 관계가 등록되어 있습니다.',
        )
      }
    }
    const row = await this.prisma.historicalCountryRelation.create({
      data: {
        subjectCountryId: data.subjectCountryId,
        objectCountryId: data.objectCountryId,
        relationType: data.relationType,
        startDate: data.startDate ?? undefined,
        endDate: data.endDate ?? undefined,
      },
      include: {
        subjectCountry: { select: { id: true, name: true } },
        objectCountry: { select: { id: true, name: true } },
      },
    })
    return this.toRecord(row)
  }

  async update(
    id: string,
    data: UpdateRelationData,
  ): Promise<HistoricalCountryRelationRecord> {
    if (data.startDate !== undefined || data.endDate !== undefined) {
      const existing = await this.findById(id)
      const nextStart =
        data.startDate !== undefined ? data.startDate : existing?.startDate
      const nextEnd =
        data.endDate !== undefined ? data.endDate : existing?.endDate
      this.assertValidRelationPeriod(nextStart, nextEnd)
    }
    const row = await this.prisma.historicalCountryRelation.update({
      where: { id },
      data: {
        ...(data.relationType !== undefined && { relationType: data.relationType }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
      include: {
        subjectCountry: { select: { id: true, name: true } },
        objectCountry: { select: { id: true, name: true } },
      },
    })
    return this.toRecord(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalCountryRelation.delete({ where: { id } })
  }

  private toRecord(row: {
    id: string
    subjectCountryId: string
    objectCountryId: string
    relationType: string
    startDate: Date | null
    endDate: Date | null
    subjectCountry: { name: string }
    objectCountry: { name: string }
    createdAt: Date
    updatedAt: Date
  }): HistoricalCountryRelationRecord {
    return {
      id: row.id,
      subjectCountryId: row.subjectCountryId,
      objectCountryId: row.objectCountryId,
      relationType: row.relationType as HistoricalCountryRelationRecord['relationType'],
      startDate: row.startDate,
      endDate: row.endDate,
      subjectCountryName: row.subjectCountry.name,
      objectCountryName: row.objectCountry.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
