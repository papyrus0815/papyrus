/**
 * 국가 피커 공용 검색·시대힌트 유틸 (국가-역사 연결 리뷰 F19②·F42).
 *
 * 피커 3종(CountrySelectModal / CountrySearchModal / AdvancedCountrySelectModal)이
 * 각자 다른 검색 필드를 쓰던 파편화를 없애기 위한 단일 출처.
 * - CountrySelectModal: name·localName·isoCode·대륙명·enName
 * - CountrySearchModal: name only
 * - AdvancedCountrySelectModal: name only
 * → 'Holy Roman Empire'·'Prussia' 같은 영문 검색이 폼에 따라 0건이던 문제.
 *   역사국가는 한글 표기 흔들림이 커서 enName 검색이 특히 중요하다.
 *
 * 시대 힌트(F42)는 **정렬 부스트일 뿐 필터가 아니다**. 망명·유년기·사후 추존처럼
 * 존속기간 밖에 놓이는 정당한 경계 사례를 지워버리면 안 되므로 제외는 절대 금지.
 */
import {
  formatCountryYearShort,
  getCountryYearRange,
  type CountryPeriodShape,
} from './country-period'

/** 피커 카드가 검색 대상으로 삼는 필드들. 전부 옵셔널(name만 필수) — 경량 옵션 타입도 수용. */
export interface CountrySearchShape extends CountryPeriodShape {
  name: string
  enName?: string | null
  localName?: string | null
  isoCode?: string | null
  continentId?: string | null
}

/** 검색어 정규화 — 공백 제거 + 소문자. 빈 문자열이면 '검색 안 함'. */
export function normalizeCountryQuery(rawQuery: string): string {
  return rawQuery.trim().toLowerCase()
}

/**
 * 최소 공통 검색 스펙 — name + enName + localName + isoCode (+ 호출부가 준 대륙명).
 * `normalizedQuery`는 {@link normalizeCountryQuery}를 통과한 값이어야 한다(빈 값이면 항상 true).
 */
export function matchesCountryQuery(
  country: CountrySearchShape,
  normalizedQuery: string,
  continentName?: string | null,
): boolean {
  if (!normalizedQuery) return true
  const candidates = [
    country.name,
    country.enName,
    country.localName,
    country.isoCode,
    continentName,
  ]
  return candidates.some((value) => {
    if (value == null || value === '') return false
    return String(value).toLowerCase().includes(normalizedQuery)
  })
}

/**
 * 목록 필터 — 검색어가 비면 원본 배열을 그대로 돌려준다(참조 유지).
 * 대륙명은 피커마다 매핑 방법이 달라(continentId → 이름 Map) 콜백으로 받는다.
 */
export function filterCountriesByQuery<T extends CountrySearchShape>(
  countries: T[],
  rawQuery: string,
  getContinentName?: (country: T) => string | null | undefined,
): T[] {
  const normalizedQuery = normalizeCountryQuery(rawQuery)
  if (!normalizedQuery) return countries
  return countries.filter((country) =>
    matchesCountryQuery(country, normalizedQuery, getContinentName?.(country)),
  )
}

// ─── 시대 힌트 (F42) ────────────────────────────────────────────────────────

/**
 * 저작 중인 대상의 시간 범위(부호 연도 — BC 음수).
 * 인물 폼이라면 생몰년, 사건 폼이라면 사건 연도를 그대로 넣으면 된다.
 */
export interface CountryHintYearRange {
  /** 하한 부호 연도(예: 출생년). 미상이면 null/undefined. */
  startYear?: number | null
  /** 상한 부호 연도(예: 사망년). 미상이면 null/undefined. */
  endYear?: number | null
}

/**
 * 한쪽 경계만 아는 힌트를 열린 무한대로 두면 사실상 전부가 '겹침'이 되어 부스트가 무의미해진다.
 * 사람 수명 상한을 넉넉히 잡아 반대쪽을 보정한다(정렬에만 쓰이므로 과감해도 안전).
 */
const HINT_OPEN_SPAN_YEARS = 120

/** 힌트에 쓸 만한 경계가 하나라도 있는지. 없으면 부스트를 적용하지 않는다. */
export function isHintYearRangeUsable(
  hint: CountryHintYearRange | null | undefined,
): hint is CountryHintYearRange {
  if (!hint) return false
  return hint.startYear != null || hint.endYear != null
}

function resolveHintBounds(
  hint: CountryHintYearRange,
): { start: number; end: number } | null {
  const { startYear, endYear } = hint
  if (startYear != null && endYear != null) {
    return startYear <= endYear
      ? { start: startYear, end: endYear }
      : { start: endYear, end: startYear }
  }
  if (startYear != null) {
    return { start: startYear, end: startYear + HINT_OPEN_SPAN_YEARS }
  }
  if (endYear != null) {
    return { start: endYear - HINT_OPEN_SPAN_YEARS, end: endYear }
  }
  return null
}

/**
 * 국가 존속기간이 힌트 범위와 겹치는가.
 * - 국가 쪽 미상 경계는 열린 구간으로 본다(시작 미상 = 아주 오래전, 종료 미상 = 아주 나중).
 * - 존속기간 정보가 **전혀** 없는 국가는 false(부스트 대상 아님) — 다만 목록에서 빠지지는 않는다.
 */
export function matchesHintYearRange(
  country: CountryPeriodShape,
  hint: CountryHintYearRange | null | undefined,
): boolean {
  if (!isHintYearRangeUsable(hint)) return false
  const bounds = resolveHintBounds(hint)
  if (!bounds) return false
  const { start: countryStart, end: countryEnd } = getCountryYearRange(country)
  if (countryStart == null && countryEnd == null) return false
  const lower = countryStart ?? Number.NEGATIVE_INFINITY
  const upper = countryEnd ?? Number.POSITIVE_INFINITY
  return lower <= bounds.end && bounds.start <= upper
}

/**
 * 힌트와 겹치는 국가를 **앞으로 끌어올리기만** 한다(제외 없음).
 * 각 그룹 내부 순서는 입력 순서를 그대로 보존하므로 호출부의 정렬(이름·시작년도 등)이 살아 있다.
 */
export function boostByHintYearRange<T extends CountryPeriodShape>(
  countries: T[],
  hint: CountryHintYearRange | null | undefined,
): T[] {
  if (!isHintYearRangeUsable(hint)) return countries
  const matched: T[] = []
  const rest: T[] = []
  countries.forEach((country) => {
    if (matchesHintYearRange(country, hint)) matched.push(country)
    else rest.push(country)
  })
  if (matched.length === 0) return countries
  return [...matched, ...rest]
}

/**
 * 힌트 범위 사람이 읽는 표기 — 'BC 100–BC 44' / '1550년 이후' / '1610년 이전'.
 * 힌트가 적용됐음을 사용자에게 알리는 배지·안내문에 쓴다.
 */
export function formatHintYearRange(
  hint: CountryHintYearRange | null | undefined,
): string {
  if (!isHintYearRangeUsable(hint)) return ''
  const startLabel = formatCountryYearShort(hint?.startYear)
  const endLabel = formatCountryYearShort(hint?.endYear)
  if (startLabel && endLabel) return `${startLabel}–${endLabel}`
  if (startLabel) return `${startLabel} 이후`
  return `${endLabel} 이전`
}
