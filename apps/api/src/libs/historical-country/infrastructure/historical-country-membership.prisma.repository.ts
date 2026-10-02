import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IHistoricalCountryMembershipRepository,
  HistoricalCountryMembershipRecord,
  CreateMembershipData,
  UpdateMembershipData,
} from '../domain/historical-country-membership.repository'
import {
  columnsToPoint,
  pointToColumns,
  pointToLegacyDateTime,
  type StructuredPoint,
} from '../../shared/structured-point'

@Injectable()
export class HistoricalCountryMembershipPrismaRepository
  implements IHistoricalCountryMembershipRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findManyByHistoricalCountryId(
    historicalCountryId: string,
  ): Promise<HistoricalCountryMembershipRecord[]> {
    return this.findManyByHistoricalCountryIds([historicalCountryId])
  }

  async findManyByHistoricalCountryIds(
    historicalCountryIds: string[],
  ): Promise<HistoricalCountryMembershipRecord[]> {
    if (historicalCountryIds.length === 0) return []
    const rows = await this.prisma.historicalCountryMembership.findMany({
      where: {
        OR: [
          { historicalCountryId: { in: historicalCountryIds } },
          { memberCountryId: { in: historicalCountryIds } },
        ],
      },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        memberCountry: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toRecord(r))
  }

  async findManyByMemberCountryId(
    memberCountryId: string,
  ): Promise<HistoricalCountryMembershipRecord[]> {
    const rows = await this.prisma.historicalCountryMembership.findMany({
      where: { memberCountryId },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        memberCountry: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toRecord(r))
  }

  async findById(id: string): Promise<HistoricalCountryMembershipRecord | null> {
    const row = await this.prisma.historicalCountryMembership.findUnique({
      where: { id },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        memberCountry: { select: { id: true, name: true } },
      },
    })
    return row ? this.toRecord(row) : null
  }

  async create(data: CreateMembershipData): Promise<HistoricalCountryMembershipRecord> {
    const row = await this.prisma.historicalCountryMembership.create({
      data: {
        historicalCountryId: data.historicalCountryId,
        memberCountryId: data.memberCountryId,
        role: data.role,
        isLeadingMember: data.isLeadingMember ?? undefined,
        ...pointColumns('start', data.start ?? null),
        ...pointColumns('end', data.end ?? null),
      },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        memberCountry: { select: { id: true, name: true } },
      },
    })
    return this.toRecord(row)
  }

  async update(
    id: string,
    data: UpdateMembershipData,
  ): Promise<HistoricalCountryMembershipRecord> {
    const row = await this.prisma.historicalCountryMembership.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isLeadingMember !== undefined && { isLeadingMember: data.isLeadingMember }),
        ...(data.start !== undefined && pointColumns('start', data.start)),
        ...(data.end !== undefined && pointColumns('end', data.end)),
      },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        memberCountry: { select: { id: true, name: true } },
      },
    })
    return this.toRecord(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalCountryMembership.delete({ where: { id } })
  }

  private toRecord(row: {
    id: string
    historicalCountryId: string
    memberCountryId: string
    role: string
    isLeadingMember: boolean | null
    membershipStartDate: Date | null
    membershipEndDate: Date | null
    startEra: 'BC' | 'AD' | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    endEra: 'BC' | 'AD' | null
    endYear: number | null
    endMonth: number | null
    endDay: number | null
    historicalCountry: { name: string }
    memberCountry: { name: string }
    createdAt: Date
    updatedAt: Date
  }): HistoricalCountryMembershipRecord {
    return {
      id: row.id,
      historicalCountryId: row.historicalCountryId,
      memberCountryId: row.memberCountryId,
      role: row.role as HistoricalCountryMembershipRecord['role'],
      isLeadingMember: row.isLeadingMember,
      start: columnsToPoint({
        era: row.startEra,
        year: row.startYear,
        month: row.startMonth,
        day: row.startDay,
      }),
      end: columnsToPoint({
        era: row.endEra,
        year: row.endYear,
        month: row.endMonth,
        day: row.endDay,
      }),
      membershipStartDate: row.membershipStartDate,
      membershipEndDate: row.membershipEndDate,
      parentName: row.historicalCountry.name,
      memberName: row.memberCountry.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}

/**
 * 시점 → 저장 칼럼. 구조화 5칸 + 하위 호환 DATETIME 사본(AD 1000+ 완전 날짜만, 그 밖은 NULL).
 */
function pointColumns(prefix: 'start' | 'end', point: StructuredPoint | null) {
  const columns = pointToColumns(point)
  const legacy = pointToLegacyDateTime(point)
  return prefix === 'start'
    ? {
        startEra: columns.era,
        startYear: columns.year,
        startMonth: columns.month,
        startDay: columns.day,
        startPrecision: columns.precision,
        membershipStartDate: legacy,
      }
    : {
        endEra: columns.era,
        endYear: columns.year,
        endMonth: columns.month,
        endDay: columns.day,
        endPrecision: columns.precision,
        membershipEndDate: legacy,
      }
}
