/**
 * 역대 수장 비교 타임라인 도메인 타입.
 *
 * Row(행) 안에 여러 Segment를 시간순으로 이어 붙일 수 있다 — "고려 → 조선 → 대한제국 → 대한민국".
 * MVP에서는 한 행에 1개 segment만 있어도 정상 동작하고, 6단계에서 계승 묶기로 확장한다.
 */

export type CountryKind = 'COUNTRY' | 'HISTORICAL'

/** 한 행 안에서 시간축 한 구간을 차지하는 국가 — 현대 국가 또는 역사적 국가 */
export interface PinnedSegment {
  segmentId: string
  kind: CountryKind
  /** Country.id 또는 HistoricalCountry.id */
  countryId: string
  /** 표시명 (사이드바·라벨 띠에 사용) */
  name: string
  /** 국기 이모지 (현대 국가만 — 역사 국가는 null) */
  flagEmoji: string | null
  /** 존속 시작 연도 (역사 국가만 채워짐. BC는 음수) — 자동 줌·정렬에 사용 */
  lifespanStartYear: number | null
  /** 존속 종료 연도 (역사 국가만 채워짐. 미상이면 null) */
  lifespanEndYear: number | null
}

/** 사이드바에서 한 줄을 차지하는 비교 단위 (1개 이상 segment) */
export interface PinnedRow {
  rowId: string
  segments: PinnedSegment[]
}

/** 시간축 표시 범위 (정수 연도. 음수 = 기원전) */
export interface YearRange {
  startYear: number
  endYear: number
}
