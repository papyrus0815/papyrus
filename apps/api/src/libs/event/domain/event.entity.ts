export class Event {
  id!: string
  title!: string
  description?: string | null
  startDate?: Date | null
  /** year | month | day. null이면 day로 간주 */
  startDatePrecision?: string | null
  /** 시작일 구조화 표현 (BC/고대 지원). 'BC' | 'AD'. */
  startEra?: 'BC' | 'AD' | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endDate?: Date | null
  endDatePrecision?: string | null
  endEra?: 'BC' | 'AD' | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  location?: string | null
  categoryId?: string | null
  background?: string | null
  aftermath?: string | null
  parentEventId?: string | null
  /** '최상위(앵커) 사건' 판정 오버라이드 — null이면 파생(자손 ≥ 1) 자동 판정 */
  anchorOverride?: 'ANCHOR' | 'PLAIN' | null
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
