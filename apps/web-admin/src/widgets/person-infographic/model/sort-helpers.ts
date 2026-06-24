import type { AdaptedPerson } from './types'
import type { MultiScopes, PersonSortKey } from './filter.store'

export const SORT_OPTIONS: Array<[PersonSortKey, string]> = [
  ['influence', '영향력'],
  ['name', '이름'],
  ['year', '출생연도'],
  ['deathYear', '사망연도'],
]

/** 연도 미상(null)은 방향과 무관하게 항상 뒤로 보낸다. */
function cmpYear(
  yearA: number | null,
  yearB: number | null,
  dir: 'asc' | 'desc',
) {
  if (yearA == null && yearB == null) return 0
  if (yearA == null) return 1
  if (yearB == null) return -1
  return dir === 'asc' ? yearA - yearB : yearB - yearA
}

function compareBy(sort: PersonSortKey, a: AdaptedPerson, b: AdaptedPerson) {
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'year') return cmpYear(a.born, b.born, 'asc')
  if (sort === 'deathYear') return cmpYear(a.died, b.died, 'desc')
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
  if (scopes.era.length > 0 && !scopes.era.includes(p.era.key)) return false
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
