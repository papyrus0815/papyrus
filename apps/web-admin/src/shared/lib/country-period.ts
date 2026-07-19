/**
 * 역사국가 존속기간 단일 포맷터·비교기 (국가-역사 연결 리뷰 F7).
 *
 * era 플래그(`'BC' | 'AD' | null`) + 연도 숫자 하이브리드가 지면마다 제각각 해석돼
 * BC 국가가 AD 하강 연대로 오독되거나(로마 계보 역순 화살표) 종료 미상이 '현재'로
 * 표시되는 문제가 만연했다. 새 지면은 반드시 이 모듈을 쓰고, 기존 지면은 점진 합류한다.
 *
 * 설계 원칙:
 * - **부호 연도(signed year)가 진실**. BC는 음수, AD는 양수. 정렬·비교는 전부 부호 연도로.
 * - **폴백 0 금지**. 0은 BC 1년과 구분이 불가능하다. 미상은 언제나 `null`로 다루고
 *   정렬에서는 명시적으로 뒤로 보낸다.
 * - **종료 미상 ≠ 현재**. 고대 국가에 '현재'는 치명적 오독이므로 '미상'으로 표기한다.
 * - 입력은 느슨한 구조적 타입 — DTO 전체/경량/이미 정규화된 형태 모두 받는다.
 *
 * @example
 * formatCountryPeriod({ startEra: 'BC', startYear: 753, endEra: 'BC', endYear: 509 })
 * // → '기원전 753년 – 기원전 509년'
 * [...countries].sort(compareByCountryStart)
 */

/** era 플래그. 서버는 'BC' | 'AD'를 보내지만 문자열 전반을 허용(‘BC’ 외는 AD 취급). */
export type CountryEra = string | null | undefined

/** 존속기간 필드를 가진 모든 형태(전체/경량 DTO, UnifiedCountry 등)를 받는 느슨한 구조적 타입. */
export interface CountryPeriodShape {
  startEra?: CountryEra
  startYear?: number | null
  endEra?: CountryEra
  endYear?: number | null
}

/** 부호 연도 범위. 미상은 null (0으로 폴백하지 않는다). */
export interface CountryYearRange {
  start: number | null
  end: number | null
}

/**
 * era + 연도 → 부호 연도(BC 음수). 값이 없거나 숫자가 아니면 null.
 *
 * @example toSignedYear('BC', 753) // → -753
 * @example toSignedYear(null, 1392) // → 1392
 */
export function toSignedYear(era: CountryEra, year: number | null | undefined): number | null {
  if (year == null) return null
  const numeric = typeof year === 'number' ? year : Number(year)
  if (!Number.isFinite(numeric)) return null
  return era === 'BC' ? -Math.abs(numeric) : Math.abs(numeric)
}

/**
 * 존속기간을 부호 연도 범위로 정규화. 양쪽 모두 미상이면 `{ start: null, end: null }`.
 * 한쪽만 있어도 다른 쪽을 보정하지 않는다(0폭 보정이 필요한 흐름도는 호출부에서 처리).
 */
export function getCountryYearRange(input: CountryPeriodShape): CountryYearRange {
  return {
    start: toSignedYear(input.startEra, input.startYear),
    end: toSignedYear(input.endEra, input.endYear),
  }
}

/**
 * 부호 연도 → 한국어 연도 표기. '기원전 753년' | '1392년'.
 * null이면 null (호출부가 미상 표기를 결정).
 */
export function formatCountryYear(signedYear: number | null | undefined): string | null {
  if (signedYear == null) return null
  return signedYear < 0 ? `기원전 ${-signedYear}년` : `${signedYear}년`
}

/** 부호 연도 → 짧은 표기. 'BC 753' | '1392'. 칩·행처럼 폭이 좁은 지면용. */
export function formatCountryYearShort(signedYear: number | null | undefined): string | null {
  if (signedYear == null) return null
  return signedYear < 0 ? `BC ${-signedYear}` : String(signedYear)
}

export interface FormatCountryPeriodOptions {
  /** 'long'(기본) = '기원전 753년 – 기원전 509년', 'short' = 'BC 753–BC 509'. */
  variant?: 'long' | 'short'
  /** 양쪽 모두 미상일 때 반환값. 기본 '' (호출부가 렌더 생략을 결정). */
  emptyText?: string
  /** 미상 연도 자리에 넣을 문자열. 기본 '미상' — **'현재'로 바꾸지 말 것**(고대 국가 오독). */
  unknownText?: string
}

/**
 * 존속기간 한 줄 표기.
 * - 둘 다: '기원전 753년 – 기원전 509년' / '1392년 – 1897년'
 * - 시작만: '기원전 100년 – 미상' (종료를 '현재'로 쓰지 않는다)
 * - 종료만: '미상 – 476년'
 * - 둘 다 미상: `emptyText`(기본 '')
 */
export function formatCountryPeriod(
  input: CountryPeriodShape,
  options: FormatCountryPeriodOptions = {},
): string {
  const { variant = 'long', emptyText = '', unknownText = '미상' } = options
  const { start, end } = getCountryYearRange(input)
  if (start == null && end == null) return emptyText
  const format = variant === 'short' ? formatCountryYearShort : formatCountryYear
  const separator = variant === 'short' ? '–' : ' – '
  return `${format(start) ?? unknownText}${separator}${format(end) ?? unknownText}`
}

/**
 * 존속 연수. 시작·종료가 모두 있고 양수일 때만 반환, 아니면 null.
 * 부호 연도 기준이라 BC→AD 횡단(예: 로마 제국 BC27–AD395)도 정확하다.
 */
export function getCountryDurationYears(input: CountryPeriodShape): number | null {
  const { start, end } = getCountryYearRange(input)
  if (start == null || end == null) return null
  const diff = end - start
  return diff > 0 ? diff : null
}

/**
 * 시간순(오름차순) 비교기 — `Array.prototype.sort`에 그대로 넘긴다.
 * 시작 연도 미상은 **항상 뒤로**(0 폴백 금지). 시작이 같으면 종료 연도로 tie-break하고,
 * 종료도 같거나 미상이면 0(안정 정렬이 입력 순서를 보존).
 *
 * @example [...historicalCountries].sort(compareByCountryStart)
 */
export function compareByCountryStart(
  left: CountryPeriodShape,
  right: CountryPeriodShape,
): number {
  const leftRange = getCountryYearRange(left)
  const rightRange = getCountryYearRange(right)
  const leftStart = leftRange.start
  const rightStart = rightRange.start
  if (leftStart == null && rightStart == null) return 0
  if (leftStart == null) return 1
  if (rightStart == null) return -1
  if (leftStart !== rightStart) return leftStart - rightStart
  const leftEnd = leftRange.end
  const rightEnd = rightRange.end
  if (leftEnd == null || rightEnd == null) return 0
  return leftEnd - rightEnd
}
