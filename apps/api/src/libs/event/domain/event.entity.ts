export class Event {
  id!: string
  title!: string
  description?: string | null
  startDate?: Date | null
  endDate?: Date | null
  location?: string | null
  categoryId?: string | null
  background?: string | null
  aftermath?: string | null
  parentEventId?: string | null
  cityId?: string | null
  administrativeDivisionId?: string | null
  historicalCountryId?: string | null
  belligerents?: any | null
  casualties?: any | null
  militaryDetails?: any | null
  warCost?: string | null

  constructor(data: Event) {
    Object.assign(this, data)
  }
}
