/**
 * 인물 목록 필터 술어(predicate) 정본.
 *
 * 우측 인포그래픽(infographic-content)과 좌측 인물 목록 사이드바(person-list)가 **같은 집합**을
 * 보여야 하므로 필터 규칙을 한 곳에 둔다. 검색어는 호출부가 넘긴다 — 인포그래픽은 입력 디바운스된
 * 값을, 사이드바는 store 값을 쓰기 때문(둘 다 결국 store.query로 수렴).
 */
import { matchesScopes, type AliveFilter, type MultiScopes } from './filter.store'
import type { AdaptedPerson } from './types'

export interface PersonFilterCriteria {
  scopes: MultiScopes
  minInfluence: number
  aliveFilter: AliveFilter
  /** 검색어 (trim 전 원문 허용) */
  query: string
}

export function filterPersons(
  all: AdaptedPerson[],
  { scopes, minInfluence, aliveFilter, query }: PersonFilterCriteria,
): AdaptedPerson[] {
  // scope 매칭 정본은 filter.store의 matchesScopes (era.key 주입) — 인라인 재구현 금지.
  let arr = all.filter((person) =>
    matchesScopes(person, scopes, (candidate) => candidate.era.key),
  )
  if (minInfluence > 0) arr = arr.filter((p) => p.influence >= minInfluence)
  if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
  else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
  const trimmed = query.trim().toLowerCase()
  if (trimmed) arr = arr.filter((p) => p.searchText.includes(trimmed))
  return arr
}
