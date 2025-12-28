import { HistoricalCountrySimple } from './country.repository'

export class Country {
  id!: string
  name!: string
  localName?: string | null
  flagEmoji?: string | null
  isoCode?: string | null
  population?: bigint | null
  areaSqKm?: number | null
  thumbnailUrl?: string | null
  capital?: string | null
  latitude?: number | null
  longitude?: number | null
  currencyId?: string | null
  languageId?: string | null
  continentId?: string | null
  historicalCountries?: HistoricalCountrySimple[]

  constructor(data: Country) {
    Object.assign(this, data)
  }
}
