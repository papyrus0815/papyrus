import { formatDateRange, formatYearLabel } from './iso-date'

/** 날짜 라벨에 필요한 사건 필드 — 목록 응답·연결 후보 어느 쪽이든 받는다. */
export interface EventDateFields {
  startDate?: string | null
  startDatePrecision?: string | null
  endDate?: string | null
  endDatePrecision?: string | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}

/**
 * 사건 기간 한 줄 — startDate가 있으면 정밀도 포맷, BC·고대(DATETIME 저장 불가라
 * startDate가 null)는 구조화 연도(startEra/startYear)로 표기. 둘 다 없으면 null.
 *
 * `startDate.slice(0, 10)`처럼 ISO를 잘라 쓰면 BC 사건은 날짜가 아예 안 나오고,
 * 연도만 아는 사건은 '1914-01-01'로 둔갑한다 — 피커는 이 함수를 쓴다.
 */
export function eventDateLabel(event: EventDateFields): string | null {
  if (event.startDate) {
    return formatDateRange(
      event.startDate,
      event.endDate ?? undefined,
      event.startDatePrecision,
      event.endDatePrecision,
    )
  }
  if (event.startYear != null) {
    // BC는 부호 연도로 접어 shared 포매터 단일출처로 표기(수제 '기원전' 조립 금지).
    const start = formatYearLabel(
      event.startEra === 'BC' ? -event.startYear : event.startYear,
    )
    if (event.endYear != null) {
      const end = formatYearLabel(event.endEra === 'BC' ? -event.endYear : event.endYear)
      if (end !== start) return `${start} ~ ${end}`
    }
    return start
  }
  return null
}
