import type { EventKind } from './event-kind'
import type { EventDomainValue } from './event-domain'
import type { EventTypeValue } from './event-type'

/** 날짜를 적은 역법 — 원문 날짜(startDateOriginal)가 어느 달력의 날인가. 구조화 날짜는 늘 그레고리력 환산 */
export type CalendarSystemValue =
  | 'GREGORIAN'
  | 'JULIAN'
  | 'KOREAN_LUNAR'
  | 'CHINESE_LUNAR'
  | 'JAPANESE_LUNAR'
  | 'ISLAMIC'
  | 'OTHER'

export class Event {
  id!: string
  title!: string
  /** 원어 사건명 — Siebenjähriger Krieg · 壬辰倭亂 */
  originalTitle?: string | null
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
  /** 원 사료의 역법과 그 역법대로 적은 날짜(자유 텍스트 — '선조 25년 4월 13일') */
  startCalendar?: CalendarSystemValue | null
  startDateOriginal?: string | null
  endCalendar?: CalendarSystemValue | null
  endDateOriginal?: string | null
  location?: string | null
  /** 분야 — 무엇에 관한 일인가(domain/event-domain.ts) */
  domain?: EventDomainValue
  background?: string | null
  aftermath?: string | null
  parentEventId?: string | null
  /** 사건 종류 — 단일(하위 없음)/묶음(전개=하위 사건). 규칙은 domain/event-kind.ts */
  kind?: EventKind
  /** 세부 분야(선택) — 분야의 2단계이자 붙는 기록을 정한다(domain/event-type.ts). 분야는 domain */
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
