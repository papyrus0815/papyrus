export class Continent {
  id!: string
  name!: string
  enName?: string | null
  isoCode?: string | null
  areaSqKm?: number | null
  population?: bigint | null
  countryCount?: number | null
  timeZones?: any | null
  parentId?: string | null

  constructor(data: Continent) {
    Object.assign(this, data)
  }
}
