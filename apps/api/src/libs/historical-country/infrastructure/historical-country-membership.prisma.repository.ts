import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type {
  IHistoricalCountryMembershipRepository,
  HistoricalCountryMembershipRecord,
  CreateMembershipData,
  UpdateMembershipData,
} from '../domain/historical-country-membership.repository'

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
        membershipStartDate: data.membershipStartDate ?? undefined,
        membershipEndDate: data.membershipEndDate ?? undefined,
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
        ...(data.membershipStartDate !== undefined && {
          membershipStartDate: data.membershipStartDate,
        }),
        ...(data.membershipEndDate !== undefined && {
          membershipEndDate: data.membershipEndDate,
        }),
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
      membershipStartDate: row.membershipStartDate,
      membershipEndDate: row.membershipEndDate,
      parentName: row.historicalCountry.name,
      memberName: row.memberCountry.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
