/**
 * 인물 목록 필터 술어(predicate) 정본.
 *
 * 우측 인포그래픽(infographic-content)과 좌측 인물 목록 사이드바(person-list)가 **같은 집합**을
 * 보여야 하므로 필터 규칙을 한 곳에 둔다. 검색어는 호출부가 넘긴다 — 인포그래픽은 입력 디바운스된
 * 값을, 사이드바는 store 값을 쓰기 때문(둘 다 결국 store.query로 수렴).
 */
import {
  matchesScopes,
  type AliveFilter,
  type MultiScopes,
  type ScopeKind,
} from './filter.store'
import type { AdaptedPerson } from './types'

export interface PersonFilterCriteria {
  scopes: MultiScopes
  minInfluence: number
  aliveFilter: AliveFilter
  /** 검색어 (trim 전 원문 허용) */
  query: string
}

export interface PersonFacetCounts {
  era: Record<string, number>
  region: Record<string, number>
  field: Record<string, number>
  country: Record<string, number>
  globalRegion: Record<string, number>
  globalField: Record<string, number>
  total: number
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

/**
 * 상단 드롭다운과 상세 필터 시트가 공유하는 패싯 카운트 정본.
 * 각 카테고리 옵션 수는 자기 카테고리를 제외한 나머지 활성 필터(검색어·영향력·생존·타 스코프)를 반영한다.
 */
export function computePersonFacetCounts(
  all: AdaptedPerson[],
  { scopes, minInfluence, aliveFilter, query }: PersonFilterCriteria,
): PersonFacetCounts {
  const trimmed = query.trim().toLowerCase()
  const passNonScope = (p: AdaptedPerson) =>
    (!trimmed || p.searchText.includes(trimmed)) &&
    (minInfluence <= 0 || (p.influence ?? 0) >= minInfluence) &&
    (aliveFilter === 'all' ||
      (aliveFilter === 'alive' ? p.isAlive : !p.isAlive))

  const tallyExcluding = (
    exclude: ScopeKind,
    keyFn: (p: AdaptedPerson) => string,
  ): Record<string, number> => {
    const sc = { ...scopes, [exclude]: [] }
    const m: Record<string, number> = {}
    for (const p of all) {
      if (!passNonScope(p)) continue
      if (!matchesScopes(p, sc, (x) => x.era.key)) continue
      const k = keyFn(p)
      m[k] = (m[k] || 0) + 1
    }
    return m
  }

  const globalRegion: Record<string, number> = {}
  const globalField: Record<string, number> = {}
  for (const p of all) {
    globalRegion[p.region] = (globalRegion[p.region] || 0) + 1
    globalField[p.field] = (globalField[p.field] || 0) + 1
  }

  return {
    era: tallyExcluding('era', (p) => p.era.key),
    region: tallyExcluding('region', (p) => p.region),
    field: tallyExcluding('field', (p) => p.field),
    country: tallyExcluding('country', (p) => p.country),
    globalRegion,
    globalField,
    total: all.length,
  }
}
