export class Event {
  id!: string
  title!: string
  description?: string | null
  startDate?: Date | null
  /** year | month | day. null이면 day로 간주 */
  startDatePrecision?: string | null
  endDate?: Date | null
  endDatePrecision?: string | null
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
  /** 키워드 (동일 사건 매핑용) */
  keywords?: string[] | null
  createdById!: string

  constructor(data: Event) {
    Object.assign(this, data)
  }
}
