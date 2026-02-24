import { Era } from '@prisma/client'
import { Country } from './country.entity'

export interface HistoricalCountrySimple {
  id: string
  name: string
  enName: string | null
  thumbnailUrl: string | null
  stateType: string
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  latitude: number | null
  longitude: number | null
}

export interface CountryRepository {
  findAll(accountId?: string): Promise<Country[]>
  findById(id: string, accountId?: string): Promise<Country | null>
  findByName(name: string, accountId?: string): Promise<Country | null>
  findHistoricalCountriesByModernCountryId(
    countryId: string,
  ): Promise<HistoricalCountrySimple[]>
  create(data: Omit<Country, 'id'>): Promise<Country>
  update(id: string, data: Partial<Omit<Country, 'id'>>): Promise<Country>
  delete(id: string): Promise<void>
}
