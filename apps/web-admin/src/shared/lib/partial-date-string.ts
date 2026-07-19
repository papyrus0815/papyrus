/**
 * 부분 정밀 부호 날짜 문자열 — 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD', BC는 '-' 접두(예: '-0044-03-15').
 * 배우자 혼인일처럼 "연도만 앎·BC" 를 한 문자열 필드로 왕복하기 위한 공용 파서/빌더.
 * 네이티브 Date 파싱 금지(BC 둔갑) — 문자열 직접 파싱만 사용(iso-date.ts·백엔드 parsePersonDateString과 동일 접근).
 */

export interface PartialDateParts {
  era: 'BC' | 'AD'
  /** 폼 입력용 문자열 — 미입력은 '' */
  year: string
  month: string
  day: string
}

const EMPTY_PARTS: PartialDateParts = { era: 'AD', year: '', month: '', day: '' }

/** 빈 폼 파트 팩토리 */
export function emptyPartialDateParts(): PartialDateParts {
  return { ...EMPTY_PARTS }
}

/** 파트에 입력값이 하나라도 있는가 (미완성 상태 포함 — 월만 쳐둔 행도 내용으로 취급) */
export function hasAnyPartialDateInput(parts: PartialDateParts): boolean {
  return Boolean(parts.year.trim() || parts.month.trim() || parts.day.trim())
}

/** 'YYYY[-MM[-DD]]'(BC '-' 접두, ISO datetime 꼬리 허용) → 폼 파트. 빈/파싱불가 값은 AD 공백 파트 */
export function parsePartialDateString(value?: string | null): PartialDateParts {
  if (!value) return { ...EMPTY_PARTS }
  const neg = value.startsWith('-')
  const match = (neg ? value.slice(1) : value).match(/^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!match || !parseInt(match[1], 10)) return { ...EMPTY_PARTS }
  return {
    era: neg ? 'BC' : 'AD',
    year: String(parseInt(match[1], 10)),
    month: match[2] ? String(parseInt(match[2], 10)) : '',
    day: match[3] ? String(parseInt(match[3], 10)) : '',
  }
}

/** 폼 파트 → 부분 정밀 문자열. 연도 없으면 ''. 월 없이 일만 있으면 일은 버린다(정밀도 사다리) */
export function buildPartialDateString(parts: PartialDateParts): string {
  const year = parseInt(parts.year, 10)
  if (!parts.year.trim() || isNaN(year) || year < 1) return ''
  const sign = parts.era === 'BC' ? '-' : ''
  const yyyy = String(year).padStart(4, '0')
  const month = parseInt(parts.month, 10)
  if (!parts.month.trim() || isNaN(month) || month < 1 || month > 12) return `${sign}${yyyy}`
  const mm = String(month).padStart(2, '0')
  const day = parseInt(parts.day, 10)
  if (!parts.day.trim() || isNaN(day) || day < 1 || day > 31) return `${sign}${yyyy}-${mm}`
  return `${sign}${yyyy}-${mm}-${String(day).padStart(2, '0')}`
}

/**
 * 정렬·비교 키 — 부호연도×10000 + 월×100 + 일 (iso-date.ts dateSortKey와 동일 규약:
 * 부호는 연도에만 적용해야 같은 BC 연도 안에서 월·일 순서가 안 뒤집힌다). 값 없음 = null.
 * 미상 월/일은 01로 채우므로 "역전 판정"에는 쓰지 말 것 — isPartialRangeInverted 사용.
 */
export function partialDateSortKey(value?: string | null): number | null {
  return partialPartsSortKey(parsePartialDateString(value))
}

/** 폼 파트 → 정렬 키 (partialDateSortKey와 동일 규약) */
export function partialPartsSortKey(parts: PartialDateParts): number | null {
  const info = partialPartsToDateInfo(parts)
  if (!info) return null
  return (
    (info.era === 'BC' ? -info.year : info.year) * 10000 +
    (info.month ?? 1) * 100 +
    (info.day ?? 1)
  )
}

/** 부분 정밀 문자열 → 서버 DateInfoDto 구조화 입력({era, year, month?, day?}). 값 없으면 undefined */
export function partialDateToDateInfo(
  value?: string | null,
): { era: 'BC' | 'AD'; year: number; month?: number; day?: number } | undefined {
  const parts = parsePartialDateString(value)
  return partialPartsToDateInfo(parts)
}

/**
 * 폼 파트 → 서버 DateInfoDto 구조화 입력. 연도 없으면 undefined(값 없음).
 * 정밀도 사다리: 월이 유효하지 않으면 일은 보내지 않는다(연 정밀). 범위 밖 값은 절사.
 */
export function partialPartsToDateInfo(
  parts: PartialDateParts,
): { era: 'BC' | 'AD'; year: number; month?: number; day?: number } | undefined {
  const year = parseInt(parts.year, 10)
  if (!parts.year.trim() || isNaN(year) || year < 1 || year > 9999) return undefined
  const month = parseInt(parts.month, 10)
  const monthOk = parts.month.trim() && !isNaN(month) && month >= 1 && month <= 12
  const day = parseInt(parts.day, 10)
  const dayOk = monthOk && parts.day.trim() && !isNaN(day) && day >= 1 && day <= 31
  return {
    era: parts.era,
    year,
    month: monthOk ? month : undefined,
    day: dayOk ? day : undefined,
  }
}

/**
 * 혼인 기간 역전(종료 < 시작) 보수 판정 — 공통 정밀도까지만 비교해
 * 미상 월/일을 01로 날조해 생기는 오탐('1526-03-15' 시작 + '1526' 종료)을 막는다.
 * 어느 한쪽 연도가 없으면 판정하지 않는다(기록 부재 ≠ 모순).
 */
export function isPartialRangeInverted(
  start: PartialDateParts,
  end: PartialDateParts,
): boolean {
  const startInfo = partialPartsToDateInfo(start)
  const endInfo = partialPartsToDateInfo(end)
  if (!startInfo || !endInfo) return false
  const signedStartYear = (startInfo.era === 'BC' ? -1 : 1) * startInfo.year
  const signedEndYear = (endInfo.era === 'BC' ? -1 : 1) * endInfo.year
  if (signedEndYear !== signedStartYear) return signedEndYear < signedStartYear
  if (startInfo.month == null || endInfo.month == null) return false
  if (endInfo.month !== startInfo.month) return endInfo.month < startInfo.month
  if (startInfo.day == null || endInfo.day == null) return false
  return endInfo.day < startInfo.day
}

/** 서버 응답 구조화 필드(크기값 연/월/일 + era) → 부분 정밀 문자열. 연도 없으면 '' */
export function partialDateFromStructured(
  year?: number | null,
  month?: number | null,
  day?: number | null,
  era?: string | null,
): string {
  if (year == null || year < 1) return ''
  return buildPartialDateString({
    era: era === 'BC' ? 'BC' : 'AD',
    year: String(year),
    month: month != null ? String(month) : '',
    day: day != null ? String(day) : '',
  })
}

/**
 * 서버 응답(ISO datetime + era + precision) → 부분 정밀 문자열 (구조화 필드 없는 레거시 폴백).
 * DATETIME은 크기값 저장·01-01 채움이라 era로 부호를, precision으로 노출 자릿수를 복원한다.
 */
export function partialDateFromResponse(
  iso?: string | null,
  era?: string | null,
  precision?: string | null,
): string {
  if (!iso) return ''
  const yyyy = iso.slice(0, 4)
  if (!/^\d{4}$/.test(yyyy)) return ''
  const sign = era === 'BC' ? '-' : ''
  if (precision === 'year') return `${sign}${yyyy}`
  if (precision === 'month') return `${sign}${yyyy}-${iso.slice(5, 7)}`
  // 'day' 또는 null(레거시 완전일자)
  return `${sign}${yyyy}-${iso.slice(5, 7)}-${iso.slice(8, 10)}`
}

/** 표시용 한국어 라벨 — '기원전 44년 3월', '1526년' 등 정밀도 따라 */
export function formatPartialDateKo(value?: string | null): string {
  const parts = parsePartialDateString(value)
  if (!parts.year) return ''
  const prefix = parts.era === 'BC' ? '기원전 ' : ''
  let label = `${prefix}${parts.year}년`
  if (parts.month) label += ` ${parts.month}월`
  if (parts.day) label += ` ${parts.day}일`
  return label
}
