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

    return connections.map((conn) => ({
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
  }

  async create(data: Omit<Country, 'id'>): Promise<Country> {
    const country = await this.prisma.country.create({
      data: {
        name: data.name,
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
        accountId: (data as any).accountId ?? undefined,
      },
    })
    return this.toEntity(country)
  }

  async update(
    id: string,
    data: Partial<Omit<Country, 'id'>>,
  ): Promise<Country> {
    const country = await this.prisma.country.update({
      where: { id },
      data: {
        name: data.name,
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
    const historicalCountries = data.historicalConnections?.map(
      (conn: any) => ({
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
      }),
    )

    return new Country({
      id: data.id,
      name: data.name,
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
      historicalCountries: historicalCountries || [],
      accountId: data.accountId ?? undefined,
    })
  }
}
