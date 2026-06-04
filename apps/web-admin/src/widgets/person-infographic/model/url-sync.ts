/**
 * 인포그래픽 store ↔ URL 쿼리 양방향 동기화.
 *
 * 지원 파라미터:
 *   view, q, era, region, field, countries, alive, minInf, sort
 *
 * 동작:
 *  - 마운트 시: URL → store (한 번)
 *  - store 변경 시: store → URL (replaceState)
 *  - URL이 외부에서 바뀌면 (브라우저 뒤로가기 등) → store에 반영
 */
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import type {
  AliveFilter,
  MultiScopes,
  PersonInfographicView,
  PersonSortKey,
} from './filter.store'
import { usePersonInfographicFilterStore } from './filter.store'

const VIEWS: PersonInfographicView[] = [
  'cards',
  'matrix',
  'galaxy',
  'story',
  'dynasty',
  'stats',
]
const ALIVES: AliveFilter[] = ['all', 'alive', 'dead']
const SORTS: PersonSortKey[] = ['influence', 'name', 'year', 'deathYear']

function parseList(v: string | null): string[] {
  if (!v) return []
  return v.split(',').filter(Boolean)
}

function eqList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function useFilterUrlSync(): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const setMany = usePersonInfographicFilterStore((s) => s.setMany)
  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const view = usePersonInfographicFilterStore((s) => s.view)
  const query = usePersonInfographicFilterStore((s) => s.query)
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const sort = usePersonInfographicFilterStore((s) => s.sort)

  const initializedRef = useRef(false)

  // URL → store : URL에 "존재하는" 파라미터만 store에 반영(adopt).
  //
  // 핵심: 파라미터가 URL에 **없다고 해서 store 값을 비우지 않는다.**
  //   인앱 네비게이션(카드→상세→뒤로)은 쿼리 없는 경로(/persons-timeline/)로 돌아오므로,
  //   "없으면 비움"으로 처리하면 store→URL(값 있음)와 서로를 덮어쓰며 무한 루프가 난다.
  //   존재 파라미터만 채택하면 축소된 URL은 store가 이기고 store→URL이 다시 채워 수렴한다.
  //   (필터 해제는 store(필터 UI/resetFilters)를 통해서만 일어나고 그때 store→URL이 파라미터를 지운다.)
  useEffect(() => {
    const patch: Parameters<typeof setMany>[0] = {}

    const v = searchParams.get('view')
    if (v && (VIEWS as string[]).includes(v) && v !== view) {
      patch.view = v as PersonInfographicView
    }
    const q = searchParams.get('q')
    if (q != null && q !== query) patch.query = q

    const a = searchParams.get('alive')
    if (a && (ALIVES as string[]).includes(a) && a !== aliveFilter) {
      patch.aliveFilter = a as AliveFilter
    }

    const infRaw = searchParams.get('minInf')
    if (infRaw != null) {
      const inf = Number(infRaw)
      if (Number.isFinite(inf) && inf >= 0 && inf <= 100 && inf !== minInfluence) {
        patch.minInfluence = inf
      }
    }

    const s = searchParams.get('sort')
    if (s && (SORTS as string[]).includes(s) && s !== sort) {
      patch.sort = s as PersonSortKey
    }

    // scope(era/region/field/countries)는 하나라도 URL에 있을 때만 채택 — 전부 없으면 store 유지
    const hasScopeParam =
      searchParams.get('era') != null ||
      searchParams.get('region') != null ||
      searchParams.get('field') != null ||
      searchParams.get('countries') != null
    if (hasScopeParam) {
      const era = parseList(searchParams.get('era'))
      const region = parseList(searchParams.get('region'))
      const field = parseList(searchParams.get('field'))
      const country = parseList(searchParams.get('countries'))
      if (
        !eqList(era, scopes.era) ||
        !eqList(region, scopes.region) ||
        !eqList(field, scopes.field) ||
        !eqList(country, scopes.country)
      ) {
        const next: MultiScopes = { era, region, field, country }
        patch.scopes = next
      }
    }

    if (Object.keys(patch).length > 0) setMany(patch)
    initializedRef.current = true
  }, [searchParams, setMany])

  // store → URL : 값 변경 시 replaceState
  useEffect(() => {
    if (!initializedRef.current) return
    const next = new URLSearchParams(searchParams)

    const setOrDel = (k: string, v: string) => {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setOrDel('view', view !== 'cards' ? view : '')
    setOrDel('q', query)
    setOrDel('alive', aliveFilter !== 'all' ? aliveFilter : '')
    setOrDel('minInf', minInfluence > 0 ? String(minInfluence) : '')
    setOrDel('sort', sort !== 'influence' ? sort : '')
    setOrDel('era', scopes.era.join(','))
    setOrDel('region', scopes.region.join(','))
    setOrDel('field', scopes.field.join(','))
    setOrDel('countries', scopes.country.join(','))

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [
    view,
    query,
    aliveFilter,
    minInfluence,
    sort,
    scopes,
    searchParams,
    setSearchParams,
  ])
}
