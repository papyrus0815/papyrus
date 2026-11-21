/**
 * 국가 검색 드롭다운 옵션 — 주 국적 칸과 추가 국가 소속 행이 같이 쓴다(InlineSearchSelect).
 *
 * - 값은 'm:<현대 id>' / 'h:<역사 id>' — 현대·역사 두 FK를 한 칸에, 상호배타 그대로.
 * - 검색 키워드는 국가 피커와 같은 필드(이름·영문명·현지명·ISO).
 * - 역사국가는 존속기간을 옆에 적어 동명을 가른다('역사 · 1701–1918').
 * - 시기 힌트(생몰년, 소속 행이면 그 행의 기간)와 겹치는 역사국가를 앞으로 — **끌어올리기만, 제외 없음**
 *   (망명·유년기·사후 추존처럼 존속기간 밖 경계 사례가 정당하다).
 * - 힌트가 1945년 이전이면 역사 묶음을, 아니면 현대 묶음을 먼저(국가 피커의 첫 탭 규칙과 같다).
 */
import { formatCountryPeriod, toSignedYear } from '@/shared/lib/country-period'
import {
  boostByHintYearRange,
  type CountryHintYearRange,
  type CountrySearchShape,
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
      label: country.flagEmoji ? `${country.flagEmoji} ${country.name}` : country.name,
      meta: `현대${primaryTag(value)}`,
      keywords: keywordsOf(country),
    }
  })
  const historical: CountrySearchOption[] = boostByHintYearRange([...historicalCountries].sort(byName), hint).map(
    (country) => {
      const value = `h:${country.id}`
      const period = formatCountryPeriod(country, { variant: 'short' })
      return {
        value,
        id: country.id,
        name: country.name,
        isHistorical: true,
        label: country.name,
        meta: `${period ? `역사 · ${period}` : '역사'}${primaryTag(value)}`,
        keywords: keywordsOf(country),
      }
    },
  )
  const hintEnd = hint ? (hint.endYear ?? hint.startYear) : null
  return hintEnd != null && hintEnd < HISTORICAL_FIRST_BEFORE ? [...historical, ...modern] : [...modern, ...historical]
}

/** 드롭다운에 한 번에 그리는 국가 수 — 넘으면 '외 N개'(검색으로 좁힌다) */
export const COUNTRY_OPTION_LIMIT = 120
