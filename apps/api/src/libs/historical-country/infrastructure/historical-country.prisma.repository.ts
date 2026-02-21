import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'

@Injectable()
export class HistoricalCountryPrismaRepository
  implements IHistoricalCountryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<HistoricalCountry[]> {
    const countries = await this.prisma.historicalCountry.findMany({
      orderBy: [
        { startYear: 'desc' },
        { startMonth: 'desc' },
        { startDay: 'desc' },
        { name: 'asc' },
      ],
    })

    return countries.map((country) => this.toEntity(country as any))
  }

  async findById(id: string): Promise<HistoricalCountry | null> {
    const country = await this.prisma.historicalCountry.findUnique({
      where: { id },
    })

    return country ? this.toEntity(country as any) : null
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

  async create(data: CreateHistoricalCountryData): Promise<HistoricalCountry> {
    const country = await this.prisma.historicalCountry.create({
      data: {
        name: data.name,
        enName: data.enName,
        description: data.description,
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

    // 국가 정보 업데이트
    const country = await this.prisma.historicalCountry.update({
      where: { id },
      data: {
        name: data.name,
        enName: data.enName,
        description: data.description,
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
      description: data.description,
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
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
