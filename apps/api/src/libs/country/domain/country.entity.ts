import { HistoricalCountrySimple } from './country.repository'

export class Country {
  id!: string
  name!: string
  fullName?: string | null
  localName?: string | null
  flagEmoji?: string | null
  isoCode?: string | null
  population?: bigint | null
  areaSqKm?: number | null
  thumbnailUrl?: string | null
  capital?: string | null
  latitude?: number | null
  longitude?: number | null
  /** 인물 표시명 기본 순서. null이면 동양식(성+이름) */
  defaultNameDisplayOrder?: 'korean' | 'western' | null
  currencyId?: string | null
  languageId?: string | null
  continentId?: string | null
  historicalCountries?: HistoricalCountrySimple[]
  accountId?: string | null
  createdAt?: Date
  updatedAt?: Date

  constructor(data: Country) {
    Object.assign(this, data)
  }
}
