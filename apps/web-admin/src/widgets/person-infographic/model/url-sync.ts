/**
 * 인포그래픽 store ↔ URL 쿼리 양방향 동기화.
 *
 * 지원 파라미터:
 *   view, q, era, region, field, countries, alive, minInf, sort, order,
 *   recordPersonIds, fromYear, toYear (기록 비교 뷰 — 부호 연도, toYear 배타)
 *
 * 동작:
 *  - 마운트 시: URL → store (한 번)
 *  - store 변경 시: store → URL (replaceState)
 *  - URL이 외부에서 바뀌면 (브라우저 뒤로가기 등) → store에 반영
 */
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'

import type {
  AliveFilter,
  EraGroupOrder,
  MultiScopes,
  PersonInfographicView,
  PersonSortKey,
} from './filter.store'
import { usePersonInfographicFilterStore } from './filter.store'
import { MAX_RECORD_PERSONS } from './records-compare'

const VIEWS: PersonInfographicView[] = [
  'cards',
  'matrix',
  'galaxy',
  'story',
  'dynasty',
  'stats',
  'records',
]
const ALIVES: AliveFilter[] = ['all', 'alive', 'dead']
const SORTS: PersonSortKey[] = ['influence', 'name', 'year', 'deathYear']
const ORDERS: EraGroupOrder[] = ['asc', 'desc']

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
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const recordPersonIds = usePersonInfographicFilterStore(
    (state) => state.recordPersonIds,
  )
  const recordFromYear = usePersonInfographicFilterStore(
    (state) => state.recordFromYear,
  )
  const recordToYear = usePersonInfographicFilterStore(
    (state) => state.recordToYear,
  )

  // 국가 scope 식별자 정규화용 id→이름 맵.
  // 외부 진입(국가 상세 "이 나라 인물 보기" 등)은 ?countries=<국가UUID>로 들어오는데,
  // 실제 필터/패널은 국가 "이름"을 키로 쓴다(경량 인물 DTO에 country.id가 없음).
  // 두 목록 모두 ContentShell이 이미 로드(react-query 캐시)하므로 추가 요청 없음.
  const { data: countries } = useCountries()
  const { data: historicalCountries } = useHistoricalCountries()
  const idToCountryName = useMemo(() => {
    const map = new Map<string, string>()
    for (const country of countries ?? [])
      if (country?.id && country?.name) map.set(country.id, country.name)
    for (const country of historicalCountries ?? [])
      if (country?.id && country?.name) map.set(country.id, country.name)
    return map
  }, [countries, historicalCountries])

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

    const order = searchParams.get('order')
    if (order && (ORDERS as string[]).includes(order) && order !== eraGroupOrder) {
      patch.eraGroupOrder = order as EraGroupOrder
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
      // 외부 진입의 국가 UUID는 이름으로 정규화(맵 미로드 시 원값 유지 → 로드 후 재수렴).
      const country = parseList(searchParams.get('countries')).map(
        (value) => idToCountryName.get(value) ?? value,
      )
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

    // 기록 비교 뷰 — recordPersonIds(콤마 목록) / fromYear(포함) / toYear(배타), 부호 연도
    const recordIdsRaw = searchParams.get('recordPersonIds')
    if (recordIdsRaw != null) {
      const ids = parseList(recordIdsRaw).slice(0, MAX_RECORD_PERSONS)
      if (!eqList(ids, recordPersonIds)) patch.recordPersonIds = ids
    }
    const fromYearRaw = searchParams.get('fromYear')
    if (fromYearRaw != null) {
      const fromYear = Number(fromYearRaw)
      if (Number.isInteger(fromYear) && fromYear !== recordFromYear) {
        patch.recordFromYear = fromYear
      }
    }
    const toYearRaw = searchParams.get('toYear')
    if (toYearRaw != null) {
      const toYear = Number(toYearRaw)
      if (Number.isInteger(toYear) && toYear !== recordToYear) {
        patch.recordToYear = toYear
      }
    }

    if (Object.keys(patch).length > 0) setMany(patch)
    initializedRef.current = true
  }, [searchParams, setMany, idToCountryName])

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
    // sort/order는 실제로 소비하는 뷰에서만 URL에 노출 — matrix·galaxy·stats·records엔
    // inert 파라미터를 남기지 않는다(값은 store·persist에 유지되어 뷰 복귀 시 재노출).
    const effectiveView = view === 'cards' ? 'story' : view
    const sortConsumed = effectiveView === 'story' || effectiveView === 'dynasty'
    const orderConsumed = effectiveView === 'story'
    setOrDel('sort', sortConsumed && sort !== 'influence' ? sort : '')
    setOrDel('order', orderConsumed && eraGroupOrder !== 'desc' ? eraGroupOrder : '')
    setOrDel('era', scopes.era.join(','))
    setOrDel('region', scopes.region.join(','))
    setOrDel('field', scopes.field.join(','))
    setOrDel('countries', scopes.country.join(','))
    setOrDel('recordPersonIds', recordPersonIds.join(','))
    setOrDel('fromYear', recordFromYear != null ? String(recordFromYear) : '')
    setOrDel('toYear', recordToYear != null ? String(recordToYear) : '')

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [
    view,
    query,
    aliveFilter,
    minInfluence,
    sort,
    eraGroupOrder,
    scopes,
    recordPersonIds,
    recordFromYear,
    recordToYear,
    searchParams,
    setSearchParams,
  ])
}
