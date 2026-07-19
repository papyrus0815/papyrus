import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { TransitionEventType } from '@prisma/client'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
  HistoricalCountryListFilter,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'

@Injectable()
export class HistoricalCountryPrismaRepository
  implements IHistoricalCountryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId?: string,
    filter?: HistoricalCountryListFilter,
  ): Promise<HistoricalCountry[]> {
    const where: any = accountId != null ? { accountId } : {}
    if (filter?.entityKind !== undefined && filter?.entityKind !== null) {
      where.entityKind = filter.entityKind
    } else if (filter?.entityKind === null) {
      where.entityKind = null
    }
    if (filter?.stateType !== undefined && filter?.stateType !== null) {
      where.stateType = filter.stateType
    }
    const countries = await this.prisma.historicalCountry.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [
        { startYear: 'desc' },
        { startMonth: 'desc' },
        { startDay: 'desc' },
        { name: 'asc' },
      ],
      include: {
        modernConnections: { select: { modernCountryId: true } },
      },
    })

    return countries.map((country) => this.toEntity(country as any))
  }

  async findById(id: string, accountId?: string): Promise<HistoricalCountry | null> {
    const country =
      accountId != null
        ? await this.prisma.historicalCountry.findFirst({
            where: { id, accountId },
          })
        : await this.prisma.historicalCountry.findUnique({
            where: { id },
          })

    return country ? this.toEntity(country as any) : null
  }

  async findManyByIdsWithAccount(
    ids: string[],
    accountId: string,
  ): Promise<HistoricalCountry[]> {
    if (ids.length === 0) return []
    const countries = await this.prisma.historicalCountry.findMany({
      where: { id: { in: ids }, accountId },
    })
    return countries.map((c) => this.toEntity(c as any))
  }

  async findModernCountryIdsByHistoricalCountryId(
    id: string,
  ): Promise<string[]> {
    const rows =
      await this.prisma.historicalCountryModernCountry.findMany({
        where: { historicalCountryId: id },
        select: { modernCountryId: true },
      })
    return rows.map((r) => r.modernCountryId)
  }

  /** 이 국가(전임)의 후임 국가 ID 목록. Transition에서만 조회 (Membership은 소속·구성 전용) */
  async findParentHistoricalCountryIdsByMemberId(
    memberCountryId: string,
  ): Promise<string[]> {
    const rows =
      await this.prisma.historicalCountryTransition.findMany({
        where: { predecessorId: memberCountryId },
        select: { successorId: true },
      })
    return rows.map((r) => r.successorId)
  }

  async findTransitionEventTypeByPredecessorId(
    predecessorId: string,
  ): Promise<TransitionEventType | null> {
    const row =
      await this.prisma.historicalCountryTransition.findFirst({
        where: { predecessorId },
        select: { eventType: true },
      })
    return row?.eventType ?? null
  }

  async create(data: CreateHistoricalCountryData): Promise<HistoricalCountry> {
    const country = await this.prisma.historicalCountry.create({
      data: {
        name: data.name,
        enName: data.enName,
        nameOrigin: data.nameOrigin,
        description: data.description,
        history: data.history,
        thumbnailUrl: data.thumbnailUrl,
        startEra: data.startEra,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endEra: data.endEra,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        stateType: data.stateType,
        entityKind: data.entityKind ?? undefined,
        accountId: data.accountId ?? undefined,
        // 현대 국가 연결 생성 (다대다)
        modernConnections: data.parentModernCountryIds
          ? {
              create: data.parentModernCountryIds.map((modernCountryId) => ({
                modernCountryId,
              })),
            }
          : undefined,
      },
    })

    // 상위 역사적 국가 = 후임. Transition만 생성 (Membership은 소속·구성 탭 전용)
    if (
      data.parentHistoricalCountryIds &&
      data.parentHistoricalCountryIds.length > 0 &&
      data.transitionEventType
    ) {
      await this.prisma.historicalCountryTransition.createMany({
        data: data.parentHistoricalCountryIds.map((successorId) => ({
          predecessorId: country.id,
          successorId,
          eventType: data.transitionEventType!,
          transitionScope: data.transitionScope ?? undefined,
        })),
      })
    }

    return this.toEntity(country as any)
  }

  async update(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    // 현대 국가 연결 업데이트가 필요한 경우 기존 연결 삭제 후 새로 생성
    if (data.parentModernCountryIds !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        // 1. 기존 연결 모두 삭제
        await tx.historicalCountryModernCountry.deleteMany({
          where: { historicalCountryId: id },
        })

        // 2. 새 연결 생성
        if (
          data.parentModernCountryIds &&
          data.parentModernCountryIds.length > 0
        ) {
          await tx.historicalCountryModernCountry.createMany({
            data: data.parentModernCountryIds.map((modernCountryId) => ({
              historicalCountryId: id,
              modernCountryId,
            })),
          })
        }
      })
    }

    // 상위(후임) Transition만 업데이트 (Membership은 소속·구성 탭 전용)
    if (data.parentHistoricalCountryIds !== undefined) {
      await this.prisma.historicalCountryTransition.deleteMany({
        where: { predecessorId: id },
      })
      if (
        data.parentHistoricalCountryIds &&
        data.parentHistoricalCountryIds.length > 0 &&
        data.transitionEventType
      ) {
        await this.prisma.historicalCountryTransition.createMany({
          data: data.parentHistoricalCountryIds.map((successorId) => ({
            predecessorId: id,
            successorId,
            eventType: data.transitionEventType!,
            transitionScope: data.transitionScope ?? undefined,
          })),
        })
      }
    }

    // 국가 정보 업데이트
    const country = await this.prisma.historicalCountry.update({
      where: { id },
      data: {
        name: data.name,
        enName: data.enName,
        nameOrigin: data.nameOrigin,
        description: data.description,
        history: data.history,
        thumbnailUrl: data.thumbnailUrl,
        startEra: data.startEra,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endEra: data.endEra,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        stateType: data.stateType,
        ...(data.entityKind !== undefined && { entityKind: data.entityKind }),
      },
    })

    return this.toEntity(country as any)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalCountry.delete({
      where: { id },
    })
  }

  private toEntity(data: any): HistoricalCountry {
    return new HistoricalCountry({
      id: data.id,
      name: data.name,
      enName: data.enName,
      nameOrigin: data.nameOrigin,
      description: data.description,
      history: data.history,
      thumbnailUrl: data.thumbnailUrl,
      startEra: data.startEra,
      startYear: data.startYear,
      startMonth: data.startMonth,
      startDay: data.startDay,
      endEra: data.endEra,
      endYear: data.endYear,
      endMonth: data.endMonth,
      endDay: data.endDay,
      stateType: data.stateType,
      entityKind: data.entityKind ?? null,
      parentModernCountryIds: data.modernConnections
        ? (data.modernConnections as Array<{ modernCountryId: string }>).map((c) => c.modernCountryId)
        : undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
