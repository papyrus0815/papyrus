import type { AdaptedPerson } from './types'
import { yearOfEra } from './adapt'
import type { MultiScopes, PersonSortKey } from './filter.store'

export const SORT_OPTIONS: Array<[PersonSortKey, string]> = [
  ['influence', '영향력'],
  ['name', '이름'],
  ['year', '출생연도'],
  ['deathYear', '사망연도'],
]

function compareBy(sort: PersonSortKey, a: AdaptedPerson, b: AdaptedPerson) {
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'year') return a.born - b.born
  if (sort === 'deathYear') return b.died - a.died
  return b.influence - a.influence
}

/** 핀 된 인물을 항상 위로 올리는 정렬 비교 함수 생성기. */
export function makeSortFnWithPinned(
  pinned: Set<string>,
  sort: PersonSortKey,
): (a: AdaptedPerson, b: AdaptedPerson) => number {
  return (a, b) => {
    const pa = pinned.has(a.id)
    const pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    return compareBy(sort, a, b)
  }
}

/**
 * scope(era/region/field/country) 필터에 인물이 부합하는지 검사.
 * matrix·galaxy 등 "활성/비활성" 시각화에서 강조 대상 판별에 공통 사용.
 */
export function isPersonInScopes(
  p: AdaptedPerson,
  scopes: MultiScopes,
): boolean {
  if (scopes.era.length > 0) {
    const eraKey = yearOfEra(p.activityYear).key
    if (!scopes.era.includes(eraKey)) return false
  }
  if (scopes.region.length > 0 && !scopes.region.includes(p.region)) return false
  if (scopes.field.length > 0 && !scopes.field.includes(p.field)) return false
  if (scopes.country.length > 0 && !scopes.country.includes(p.country)) return false
  return true
}

export function hasAnyActiveScope(scopes: MultiScopes): boolean {
  return (
    scopes.era.length +
      scopes.region.length +
      scopes.field.length +
      scopes.country.length >
    0
  )
}
