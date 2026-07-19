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

/**
 * ISO 유사 날짜 문자열 → 부호 연도. 앞의 `-`는 BC(음수)로 해석한다(사건 startDate가
 * `-0753-01-01`처럼 BC를 담는 관례). `1392-07-17`처럼 접두가 없으면 양수(AD).
 * 값이 없거나 연도 자리를 못 찾으면 null.
 *
 * @example signedYearFromIsoLike('1950-01-01') // → 1950
 * @example signedYearFromIsoLike('-0753-01-01') // → -753
 */
export function signedYearFromIsoLike(dateString: string | null | undefined): number | null {
  if (!dateString) return null
  const negative = dateString.startsWith('-')
  const body = negative ? dateString.slice(1) : dateString
  const match = body.match(/^(\d{1,6})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  if (!Number.isFinite(year)) return null
  return negative ? -year : year
}

export interface LifespanCheckOptions {
  /**
   * 기록 시점 필드가 BC를 표현할 수 있는가 — BC/AD 비대칭을 안전하게 다루는 스위치.
   *
   * - `false`(기본): 재위·재임처럼 시점이 DATETIME(AD 1000+ 만 신뢰, 폼에서 `blockBc`)이라
   *   **BC 경계와는 비교 자체가 불가능**하다. 이때 BC 국가(경계가 음수)는 어떤 AD 기록을
   *   넣어도 항상 '밖'이 되어 고칠 수 없는 소음이므로, **AD 경계(양수) 위반만** 경고한다.
   *   즉 BC 전용 국가(예: 로마 공화국 BC509–BC27)에는 경고를 띄우지 않는다.
   * - `true`: 사건처럼 startDate가 `-YYYY`로 BC를 담을 수 있어 **부호 연도 전 구간**을
   *   그대로 비교한다(BC 사건 ↔ BC 국가 경계도 유의미).
   */
  recordSupportsBc?: boolean
}

/**
 * 역사국가 존속기간 vs 기록 시점 **소프트 경고** 판정 (국가-역사 연결 리뷰 F33).
 *
 * 선택된 역사국가의 존속기간과 재위·재임·사건의 입력 연도(부호 환산)를 대조해,
 * 존속 **밖**이면 한국어 경고 문구를, 안(또는 판정 불가)이면 null을 반환한다.
 * **하드 거부가 아니다** — 망명·추존·소급 등 정당한 경계 사례를 위해 저장은 언제나 허용하고,
 * 이 함수의 반환값은 인라인 경고 표시에만 쓴다.
 *
 * BC/AD 비대칭 처리는 {@link LifespanCheckOptions.recordSupportsBc} 참고.
 *
 * @param period 선택된 역사국가의 존속기간(startEra/Year·endEra/Year를 가진 구조체)
 * @param recordSignedYear 기록의 입력 연도(부호 연도, AD 양수·BC 음수). null이면 판정 안 함.
 * @returns 존속 밖일 때 `'존속 기간(1392년 – 1897년) 밖입니다'` 형태 문구, 아니면 null.
 *
 * @example
 * // 조선(1392–1897)에 1950년 재위 → 경고
 * describeLifespanMismatch({ startEra:'AD', startYear:1392, endEra:'AD', endYear:1897 }, 1950)
 * // → '존속 기간(1392년 – 1897년) 밖입니다'
 */
export function describeLifespanMismatch(
  period: CountryPeriodShape,
  recordSignedYear: number | null | undefined,
  options: LifespanCheckOptions = {},
): string | null {
  if (recordSignedYear == null) return null
  const { recordSupportsBc = false } = options
  const { start, end } = getCountryYearRange(period)
  // 경계가 비교 가능한지: BC를 담을 수 있는 기록이면 모든 경계, 아니면 AD 경계(양수)만.
  const isComparable = (bound: number | null): bound is number =>
    bound != null && (recordSupportsBc || bound > 0)
  const before = isComparable(start) && recordSignedYear < start
  const after = isComparable(end) && recordSignedYear > end
  if (!before && !after) return null
  const rangeText = formatCountryPeriod(period, { unknownText: '미상' })
  if (!rangeText) return null
  return `존속 기간(${rangeText}) 밖입니다`
}
