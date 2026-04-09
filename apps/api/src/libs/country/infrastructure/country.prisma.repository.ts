import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { Country } from '../domain/country.entity'
import {
  CountryRepository,
  HistoricalCountrySimple,
} from '../domain/country.repository'

@Injectable()
export class CountryPrismaRepository implements CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId?: string): Promise<Country[]> {
    const countries = await this.prisma.country.findMany({
      where: accountId != null ? { accountId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        historicalConnections: {
          include: {
            historicalCountry: true,
          },
        },
      },
    })
    return countries.map((country) => this.toEntity(country))
  }

  async findById(id: string, accountId?: string): Promise<Country | null> {
    const country =
      accountId != null
        ? await this.prisma.country.findFirst({
            where: { id, accountId },
            include: {
              historicalConnections: {
                include: {
                  historicalCountry: true,
                },
              },
            },
          })
        : await this.prisma.country.findUnique({
            where: { id },
            include: {
              historicalConnections: {
                include: {
                  historicalCountry: true,
                },
              },
            },
          })
    return country ? this.toEntity(country) : null
  }

  async findByName(name: string, accountId?: string): Promise<Country | null> {
    const country =
      accountId != null
        ? await this.prisma.country.findFirst({
            where: { name, accountId },
          })
        : await this.prisma.country.findUnique({
            where: { name },
          })
    return country ? this.toEntity(country) : null
  }

  async findHistoricalCountriesByModernCountryId(
    countryId: string,
  ): Promise<HistoricalCountrySimple[]> {
    const connections =
      await this.prisma.historicalCountryModernCountry.findMany({
        where: {
          modernCountryId: countryId,
        },
        include: {
          historicalCountry: true,
        },
      })

    return connections
      .map((conn) => ({
        id: conn.historicalCountry.id,
        name: conn.historicalCountry.name,
        enName: conn.historicalCountry.enName,
        thumbnailUrl: conn.historicalCountry.thumbnailUrl,
        stateType: conn.historicalCountry.stateType,
        startEra: conn.historicalCountry.startEra,
        startYear: conn.historicalCountry.startYear,
        startMonth: conn.historicalCountry.startMonth,
        startDay: conn.historicalCountry.startDay,
        endEra: conn.historicalCountry.endEra,
        endYear: conn.historicalCountry.endYear,
        endMonth: conn.historicalCountry.endMonth,
        endDay: conn.historicalCountry.endDay,
        latitude: conn.historicalCountry.latitude
          ? Number(conn.historicalCountry.latitude)
          : null,
        longitude: conn.historicalCountry.longitude
          ? Number(conn.historicalCountry.longitude)
          : null,
      }))
      .sort((a, b) => {
        // 시작일이 최근일수록 위로 (BC는 아래, AD는 최근 연도가 위).
        // BC는 음수, AD는 양수로 환산해 비교.
        const toNum = (era: string | null, year: number | null) => {
          if (year == null) return Number.NEGATIVE_INFINITY
          return era === 'BC' ? -year : year
        }
        const av = toNum(a.startEra, a.startYear)
        const bv = toNum(b.startEra, b.startYear)
        if (av !== bv) return bv - av
        // 동률이면 월·일도 내림차순
        return (
          (b.startMonth ?? 0) - (a.startMonth ?? 0) ||
          (b.startDay ?? 0) - (a.startDay ?? 0)
        )
      })
  }

  async create(data: Omit<Country, 'id'>): Promise<Country> {
    const country = await this.prisma.country.create({
      data: {
        name: data.name,
        fullName: data.fullName,
        localName: data.localName,
        flagEmoji: data.flagEmoji,
        isoCode: data.isoCode,
        population: data.population,
        areaSqKm: data.areaSqKm,
        thumbnailUrl: data.thumbnailUrl,
        capital: data.capital,
        currencyId: data.currencyId,
        languageId: data.languageId,
        continentId: data.continentId,
        defaultNameDisplayOrder: data.defaultNameDisplayOrder ?? undefined,
        accountId: (data as any).accountId ?? undefined,
      },
    })
    return this.toEntity(country)
  }

  async update(
    id: string,
    data: Partial<Omit<Country, 'id'>>,
  ): Promise<Country> {
    // Prisma는 undefined를 무시하지만, 명시적으로 넘기면 버전/직렬화에 따라 섞일 수 있어
    // PATCH 의미로 `전달된 필드만` 갱신한다.
    const country = await this.prisma.country.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.localName !== undefined && { localName: data.localName }),
        ...(data.flagEmoji !== undefined && { flagEmoji: data.flagEmoji }),
        ...(data.isoCode !== undefined && { isoCode: data.isoCode }),
        ...(data.population !== undefined && { population: data.population }),
        ...(data.areaSqKm !== undefined && { areaSqKm: data.areaSqKm }),
        ...(data.thumbnailUrl !== undefined && {
          thumbnailUrl: data.thumbnailUrl,
        }),
        ...(data.capital !== undefined && { capital: data.capital }),
        ...(data.currencyId !== undefined && { currencyId: data.currencyId }),
        ...(data.languageId !== undefined && { languageId: data.languageId }),
        ...(data.continentId !== undefined && {
          continentId: data.continentId,
        }),
        ...(data.defaultNameDisplayOrder !== undefined && {
          defaultNameDisplayOrder: data.defaultNameDisplayOrder,
        }),
      },
    })
    return this.toEntity(country)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.country.delete({
      where: { id },
    })
  }

  private toEntity(data: any): Country {
    const historicalCountries = data.historicalConnections
      ?.map((conn: any) => ({
        id: conn.historicalCountry.id,
        name: conn.historicalCountry.name,
        enName: conn.historicalCountry.enName,
        thumbnailUrl: conn.historicalCountry.thumbnailUrl,
        stateType: conn.historicalCountry.stateType,
        startEra: conn.historicalCountry.startEra,
        startYear: conn.historicalCountry.startYear,
        startMonth: conn.historicalCountry.startMonth,
        startDay: conn.historicalCountry.startDay,
        endEra: conn.historicalCountry.endEra,
        endYear: conn.historicalCountry.endYear,
        endMonth: conn.historicalCountry.endMonth,
        endDay: conn.historicalCountry.endDay,
        latitude: conn.historicalCountry.latitude
          ? Number(conn.historicalCountry.latitude)
          : null,
        longitude: conn.historicalCountry.longitude
          ? Number(conn.historicalCountry.longitude)
          : null,
      }))
      .sort((a: any, b: any) => {
        // 시작일이 최근일수록 위로 (BC는 음수, AD는 양수로 환산해 비교)
        const toNum = (era: string | null, year: number | null) => {
          if (year == null) return Number.NEGATIVE_INFINITY
          return era === 'BC' ? -year : year
        }
        const av = toNum(a.startEra, a.startYear)
        const bv = toNum(b.startEra, b.startYear)
        if (av !== bv) return bv - av
        return (
          (b.startMonth ?? 0) - (a.startMonth ?? 0) ||
          (b.startDay ?? 0) - (a.startDay ?? 0)
        )
      })

    return new Country({
      id: data.id,
      name: data.name,
      fullName: data.fullName,
      localName: data.localName,
      flagEmoji: data.flagEmoji,
      isoCode: data.isoCode,
      population: data.population,
      areaSqKm: data.areaSqKm ? Number(data.areaSqKm) : null,
      thumbnailUrl: data.thumbnailUrl,
      capital: data.capital,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      currencyId: data.currencyId,
      languageId: data.languageId,
      continentId: data.continentId,
      defaultNameDisplayOrder: data.defaultNameDisplayOrder ?? null,
      historicalCountries: historicalCountries || [],
      accountId: data.accountId ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
