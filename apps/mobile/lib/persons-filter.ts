import { signedYear } from './age-utils'
import { centuryOf } from './century'
import { displayName } from './format'
import type { PersonListItem } from './dto'
import type {
  CenturyFacet,
  CountryFacet,
  DynastyFacet,
  EvalFilter,
  GenderKey,
  SortMode,
} from '@/components/persons/types'

export type PersonFilters = {
  query: string
  genders: Set<GenderKey>
  evalFilter: EvalFilter
  countryIds: Set<string>
  dynastyIds: Set<string>
  centuries: Set<number | null>
}

export function buildFacets(items: PersonListItem[]): {
  countries: CountryFacet[]
  dynasties: DynastyFacet[]
  centuries: CenturyFacet[]
} {
  const cMap = new Map<string, CountryFacet>()
  const dMap = new Map<string, DynastyFacet>()
  const centMap = new Map<number | null, number>()
  for (const p of items) {
    if (p.country) {
      const ex = cMap.get(p.country.id)
      if (ex) ex.count++
      else cMap.set(p.country.id, { ...p.country, count: 1 })
    }
    if (p.dynasty) {
      const ex = dMap.get(p.dynasty.id)
      if (ex) ex.count++
      else dMap.set(p.dynasty.id, { ...p.dynasty, count: 1 })
    }
    const c = centuryOf(p)
    centMap.set(c, (centMap.get(c) ?? 0) + 1)
  }
  return {
    countries: [...cMap.values()].sort((a, b) => b.count - a.count),
    dynasties: [...dMap.values()].sort((a, b) => b.count - a.count),
    centuries: [...centMap.entries()]
      .sort(([a], [b]) => {
        if (a == null) return 1
        if (b == null) return -1
        return b - a
      })
      .map(([c, count]) => ({ century: c, count })),
  }
}

export function applyFilters(items: PersonListItem[], f: PersonFilters): PersonListItem[] {
  const q = f.query.trim().toLowerCase()
  return items.filter((p) => {
    if (q) {
      const haystack =
        `${p.name ?? ''} ${p.surname ?? ''} ${p.regnalName ?? ''} ${p.dynasty?.name ?? ''} ${p.country?.name ?? ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (f.genders.size > 0) {
      const g = (p.gender ?? '').toUpperCase()
      const norm: GenderKey | null =
        g === 'MALE' || g === 'M' ? 'MALE' : g === 'FEMALE' || g === 'F' ? 'FEMALE' : null
      if (!norm || !f.genders.has(norm)) return false
    }
    if (f.evalFilter !== 'all') {
      const has = p.influence != null && p.influence > 0
      if (f.evalFilter === 'evaluated' && !has) return false
      if (f.evalFilter === 'unevaluated' && has) return false
    }
    if (f.countryIds.size > 0) {
      if (!p.country?.id || !f.countryIds.has(p.country.id)) return false
    }
    if (f.dynastyIds.size > 0) {
      if (!p.dynasty?.id || !f.dynastyIds.has(p.dynasty.id)) return false
    }
    if (f.centuries.size > 0) {
      if (!f.centuries.has(centuryOf(p))) return false
    }
    return true
  })
}

export function applySort(
  items: PersonListItem[],
  sort: SortMode,
  statsAverages: Map<string, number>,
): PersonListItem[] {
  const arr = [...items]
  switch (sort) {
    case 'recent':
      arr.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      break
    case 'influence-desc':
      arr.sort((a, b) => (b.influence ?? -1) - (a.influence ?? -1))
      break
    case 'statsAvg-desc':
      arr.sort((a, b) => {
        const sa = statsAverages.get(a.id) ?? -1
        const sb = statsAverages.get(b.id) ?? -1
        return sb - sa
      })
      break
    case 'name-asc':
      arr.sort((a, b) => displayName(a).localeCompare(displayName(b), 'ko'))
      break
    case 'birth-asc':
      arr.sort((a, b) => {
        const ya =
          a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.POSITIVE_INFINITY
        const yb =
          b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.POSITIVE_INFINITY
        return ya - yb
      })
      break
    case 'birth-desc':
      arr.sort((a, b) => {
        const ya =
          a.birthYear != null ? signedYear(a.birthEra, a.birthYear) : Number.NEGATIVE_INFINITY
        const yb =
          b.birthYear != null ? signedYear(b.birthEra, b.birthYear) : Number.NEGATIVE_INFINITY
        return yb - ya
      })
      break
  }
  return arr
}

export type PersonSection = { century: number | null; data: PersonListItem[] }

export function groupByCentury(items: PersonListItem[]): PersonSection[] {
  const map = new Map<string, PersonSection>()
  for (const p of items) {
    const c = centuryOf(p)
    const key = c === null ? 'unknown' : String(c)
    let sec = map.get(key)
    if (!sec) {
      sec = { century: c, data: [] }
      map.set(key, sec)
    }
    sec.data.push(p)
  }
  return [...map.values()].sort((a, b) => {
    if (a.century === null) return 1
    if (b.century === null) return -1
    return b.century - a.century
  })
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export function isRecentlyRegistered(createdAt?: string | null): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return Number.isFinite(t) && Date.now() - t < TWENTY_FOUR_HOURS_MS
}
