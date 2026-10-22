import type { EventKind } from './event-kind'
import type { EventTypeValue } from './event-type'

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
  /** 사건 종류 — 단일(하위 없음)/묶음(전개=하위 사건). 규칙은 domain/event-kind.ts */
  kind?: EventKind
  /** 세부 분야(선택) — 분야의 2단계이자 붙는 기록을 정한다(domain/event-type.ts). 분야는 categoryId */
  type?: EventTypeValue | null
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
