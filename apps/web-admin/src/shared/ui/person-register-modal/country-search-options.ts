/**
 * 국가 검색 드롭다운 옵션 — 주 국적 칸과 추가 국가 소속 행이 같이 쓴다(InlineSearchSelect).
 *
 * - 값은 'm:<현대 id>' / 'h:<역사 id>' — 현대·역사 두 FK를 한 칸에, 상호배타 그대로.
 * - 검색 키워드는 국가 피커와 같은 필드(이름·영문명·현지명·ISO).
 * - 역사국가는 존속기간을 옆에 적어 동명을 가른다('1701–1918', 미상이면 '존속기간 미상').
 * - 시기 힌트(생몰년, 소속 행이면 그 행의 기간)와 겹치는 역사국가를 앞으로 — **끌어올리기만, 제외 없음**
 *   (망명·유년기·사후 추존처럼 존속기간 밖 경계 사례가 정당하다).
 * - 힌트가 1945년 이전이면 역사 묶음을, 아니면 현대 묶음을 먼저(국가 피커의 첫 탭 규칙과 같다).
 * - 묶음 머리: '현대 국가' · '1815–1898 존속 역사 국가'(힌트와 겹치는 것) · '역사 국가'(나머지).
 * - 국기는 앞 칸(leading)으로 — 이름(label)에 섞지 않아 역사국가(국기 없음)와 이름 열이 맞는다.
 */
import { formatCountryPeriod, toSignedYear } from '@/shared/lib/country-period'
import {
  type CountryHintYearRange,
  type CountrySearchShape,
  formatHintYearRange,
  isHintYearRangeUsable,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'

import { type SearchOption } from './sections/inline-search-select'

export type CountryOptionSource = CountrySearchShape & { id: string; flagEmoji?: string | null }

export interface CountrySearchOption extends SearchOption {
  id: string
  /** 국기 없는 이름 — 저장·표시용 라벨 */
  name: string
  isHistorical: boolean
}

/** 행/폼 상태 → 드롭다운 값 */
export function encodeCountryValue(input: { countryId?: string | null; historicalCountryId?: string | null }): string {
  if (input.countryId) return `m:${input.countryId}`
  if (input.historicalCountryId) return `h:${input.historicalCountryId}`
  return ''
}

/** 연도 칸(문자열)·시대 → 부호 연도. 비었거나 숫자가 아니면 null */
export function signedYearOf(era: string, yearText: string): number | null {
  const trimmed = yearText.trim()
  const numeric = Number(trimmed)
  return trimmed && Number.isFinite(numeric) ? toSignedYear(era, numeric) : null
}

const HISTORICAL_FIRST_BEFORE = 1945

export function buildCountrySearchOptions(
  modernCountries: ReadonlyArray<CountryOptionSource>,
  historicalCountries: ReadonlyArray<CountryOptionSource>,
  hint: CountryHintYearRange | null,
  options: {
    /** 주 국적 값 — 소속 행 목록에서 '주 국적' 표지 */
    primaryValue?: string
  } = {},
): CountrySearchOption[] {
  const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name, 'ko')
  const keywordsOf = (country: CountrySearchShape) =>
    [country.enName, country.localName, country.isoCode].filter(Boolean).join(' ')
  const primaryTag = (value: string) => (options.primaryValue && value === options.primaryValue ? ' · 주 국적' : '')

  const modern: CountrySearchOption[] = [...modernCountries].sort(byName).map((country) => {
    const value = `m:${country.id}`
    return {
      value,
      id: country.id,
      name: country.name,
      isHistorical: false,
      label: country.name,
      leading: country.flagEmoji ?? undefined,
      group: '현대 국가',
      meta: primaryTag(value).replace(/^ · /, '') || undefined,
      keywords: `${keywordsOf(country)} 현대`,
    }
  })
  const hintUsable = isHintYearRangeUsable(hint)
  const eraGroup = hintUsable ? `${formatHintYearRange(hint)} 존속 역사 국가` : null
  const toHistorical = (country: CountryOptionSource, group: string): CountrySearchOption => {
    const value = `h:${country.id}`
    const period = formatCountryPeriod(country, { variant: 'short' })
    return {
      value,
      id: country.id,
      name: country.name,
      isHistorical: true,
      label: country.name,
      group,
      meta: `${period || '존속기간 미상'}${primaryTag(value)}`,
      keywords: `${keywordsOf(country)} 역사`,
    }
  }
  const sortedHistorical = [...historicalCountries].sort(byName)
  const inEra = hintUsable ? sortedHistorical.filter((country) => matchesHintYearRange(country, hint)) : []
  const inEraIds = new Set(inEra.map((country) => country.id))
  const historical: CountrySearchOption[] = [
    ...inEra.map((country) => toHistorical(country, eraGroup ?? '역사 국가')),
    ...sortedHistorical.filter((country) => !inEraIds.has(country.id)).map((country) => toHistorical(country, '역사 국가')),
  ]
  const hintEnd = hint ? (hint.endYear ?? hint.startYear) : null
  return hintEnd != null && hintEnd < HISTORICAL_FIRST_BEFORE ? [...historical, ...modern] : [...modern, ...historical]
}

/** 드롭다운에 한 번에 그리는 국가 수 — 넘으면 '외 N개'(검색으로 좁힌다) */
export const COUNTRY_OPTION_LIMIT = 120
