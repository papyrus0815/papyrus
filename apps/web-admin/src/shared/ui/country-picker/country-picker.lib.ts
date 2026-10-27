/**
 * 국가 피커 공용 타입·정렬 (피커 통합 1단계).
 *
 * 예전엔 CountrySelectModal / CountrySearchModal / AdvancedCountrySelectModal이 같은 정렬을
 * 각자 복사해 들고 있었다(BC 부호 연도·시작 미상 뒤로 같은 수정이 파일마다 따로 들어갔다).
 * 검색은 `@/shared/lib/country-picker-filter`, 정렬은 여기가 단일 출처다.
 */
import { toSignedYear } from '@/shared/lib/country-period'
import type { CountrySearchShape } from '@/shared/lib/country-picker-filter'

/** 현대 국가 옵션 — DTO 전체가 아니어도 된다(id·name만 필수, 나머지는 표시·정렬 보강). */
export interface CountryPickerModernOption extends CountrySearchShape {
  id: string
  flagEmoji?: string | null
  capital?: string | null
  population?: string | null
  areaSqKm?: number | null
}

/** 역사국가 옵션 — 존속기간(CountryPeriodShape)·국가 형태로 동명 구별 */
export interface CountryPickerHistoricalOption extends CountrySearchShape {
  id: string
  stateType?: string | null
}

export type CountryPickerKind = 'modern' | 'historical'

/** 피커가 호출부에 돌려주는 값 — 세 피커가 원래 쓰던 모양 그대로 */
export interface CountryPickerPick {
  id: string
  name: string
  isHistorical: boolean
}

export type CountryPickerSortField =
  | 'name'
  | 'isoCode'
  | 'continent'
  | 'startYear'
  | 'population'
  | 'areaSqKm'

const MODERN_SORT_FIELDS: CountryPickerSortField[] = [
  'name',
  'isoCode',
  'continent',
  'population',
  'areaSqKm',
]
const HISTORICAL_SORT_FIELDS: CountryPickerSortField[] = ['name', 'startYear']

/** 탭이 바뀌어 그 탭에 없는 정렬 기준이 남으면 이름순으로 되돌린다 */
export function coerceSortField(
  kind: CountryPickerKind,
  sortBy: CountryPickerSortField,
): CountryPickerSortField {
  const allowed = kind === 'modern' ? MODERN_SORT_FIELDS : HISTORICAL_SORT_FIELDS
  return allowed.includes(sortBy) ? sortBy : 'name'
}

/** 인구는 문자열(BigInt 규약)로 온다 — 숫자 아닌 값·빈 값은 맨 끝(-1) */
function parsePopulation(raw: string | null | undefined): number {
  if (raw == null || raw === '') return -1
  const numeric = Number(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : -1
}

export function sortModernCountries<T extends CountryPickerModernOption>(
  countries: T[],
  sortBy: CountryPickerSortField,
  sortOrder: 'asc' | 'desc',
  continentNameById: Map<string, string>,
): T[] {
  const direction = sortOrder === 'asc' ? 1 : -1
  const byName = (left: T, right: T) => direction * left.name.localeCompare(right.name, 'ko')
  return [...countries].sort((left, right) => {
    if (sortBy === 'isoCode') {
      return direction * (left.isoCode ?? '').localeCompare(right.isoCode ?? '')
    }
    if (sortBy === 'continent') {
      const leftContinent = (left.continentId && continentNameById.get(left.continentId)) || ''
      const rightContinent = (right.continentId && continentNameById.get(right.continentId)) || ''
      return direction * leftContinent.localeCompare(rightContinent, 'ko') || byName(left, right)
    }
    if (sortBy === 'population') {
      return (
        direction * (parsePopulation(left.population) - parsePopulation(right.population)) ||
        byName(left, right)
      )
    }
    if (sortBy === 'areaSqKm') {
      return direction * ((left.areaSqKm ?? -1) - (right.areaSqKm ?? -1)) || byName(left, right)
    }
    return byName(left, right)
  })
}

export function sortHistoricalCountries<T extends CountryPickerHistoricalOption>(
  countries: T[],
  sortBy: CountryPickerSortField,
  sortOrder: 'asc' | 'desc',
): T[] {
  const direction = sortOrder === 'asc' ? 1 : -1
  const byName = (left: T, right: T) => direction * left.name.localeCompare(right.name, 'ko')
  return [...countries].sort((left, right) => {
    if (sortBy !== 'startYear') return byName(left, right)
    // BC는 부호 연도(음수)로 — raw startYear는 기원전 753년을 AD 753으로 취급했다
    const leftYear = toSignedYear(left.startEra, left.startYear)
    const rightYear = toSignedYear(right.startEra, right.startYear)
    // 시작 미상은 정렬 방향과 무관하게 항상 뒤로 (0 폴백 금지)
    if (leftYear == null && rightYear == null) return byName(left, right)
    if (leftYear == null) return 1
    if (rightYear == null) return -1
    return direction * (leftYear - rightYear) || byName(left, right)
  })
}

/** add 모드 — 이미 담긴 항목을 아래로(새로 더할 후보가 위). 각 묶음 안의 순서는 유지한다 */
export function moveAddedLast<T extends { id: string }>(countries: T[], addedIds: Set<string>): T[] {
  if (addedIds.size === 0) return countries
  return [
    ...countries.filter((country) => !addedIds.has(country.id)),
    ...countries.filter((country) => addedIds.has(country.id)),
  ]
}
