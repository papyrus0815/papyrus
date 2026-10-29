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
  PersonGroupBy,
  PersonInfographicView,
  PersonListLayout,
  PersonSortKey,
} from './filter.store'
import { usePersonInfographicFilterStore } from './filter.store'
import { MAX_RECORD_PERSONS } from './records-compare'

const VIEWS: PersonInfographicView[] = [
  'story',
  'matrix',
  'stats',
  'records',
]
const GROUPS: PersonGroupBy[] = [
  'century',
  'country',
  'field',
  'dynasty',
  'none',
]
const LAYOUTS: PersonListLayout[] = ['grid', 'row']
const ALIVES: AliveFilter[] = ['all', 'alive', 'dead']
const SORTS: PersonSortKey[] = [
  'influence',
  'name',
  'year',
  'deathYear',
  'lifespan',
]
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
  const groupBy = usePersonInfographicFilterStore((s) => s.groupBy)
  const listLayout = usePersonInfographicFilterStore((s) => s.listLayout)
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
  /**
   * URL→store가 이번 커밋에서 값을 채택했는지.
   *
   * 두 효과는 같은 커밋에서 연달아 돈다. 채택 직후의 store→URL은 아직 **이 렌더의 옛 store 값**을
   * 들고 있어서, 그대로 쓰면 방금 채택한 URL을 옛 값으로 되돌린다 → 다음 렌더에서 URL→store가
   * 그걸 다시 채택 → 무한 핑퐁(저장된 뷰≠?view= 로 진입하면 초당 수 회 replaceState).
   * 채택한 커밋의 store→URL은 한 번 건너뛰고, 새 store 값이 반영된 다음 렌더에서 수렴시킨다.
   */
  const adoptedThisCommitRef = useRef(false)
  const lastPushedSearchRef = useRef<string | null>(null)

  // URL → store : URL에 "존재하는" 파라미터만 store에 반영(adopt).
  //
  // 핵심: 마운트 시 파라미터가 URL에 없다고 해서 store 값을 비우지 않는다.
  //   인앱 네비게이션(카드→상세→뒤로)은 쿼리 없는 경로(/persons-timeline/)로 돌아오므로,
  //   마운트 시 "없으면 비움"으로 처리하면 상세 진입 전 필터가 증발한다.
  //   반면 이미 마운트된 상태에서 브라우저 뒤로가기/앞으로가기로 URL이 외부 변경된 경우에는
  //   빠진 파라미터도 기본값('story' 등)으로 복원하고, 비교 대상은 항상 최신 store 상태(getState)를 읽는다.
  useEffect(() => {
    const cur = usePersonInfographicFilterStore.getState()
    const currentSearch = searchParams.toString()
    const isExternalNavigation =
      initializedRef.current &&
      lastPushedSearchRef.current !== null &&
      currentSearch !== lastPushedSearchRef.current

    const patch: Parameters<typeof setMany>[0] = {}

    const v = searchParams.get('view')
    if (v === 'dynasty') {
      if (cur.view !== 'story') patch.view = 'story'
      if (cur.groupBy !== 'dynasty') patch.groupBy = 'dynasty'
    } else if (v === 'galaxy') {
      if (cur.view !== 'story') patch.view = 'story'
    } else if (v && (VIEWS as string[]).includes(v)) {
      if (v !== cur.view) patch.view = v as PersonInfographicView
    } else if (isExternalNavigation && cur.view !== 'story') {
      patch.view = 'story'
    }

    const g = searchParams.get('group')
    if (g && (GROUPS as string[]).includes(g)) {
      if (g !== cur.groupBy) patch.groupBy = g as PersonGroupBy
    } else if (
      v !== 'dynasty' &&
      isExternalNavigation &&
      cur.groupBy !== 'century'
    ) {
      patch.groupBy = 'century'
    }

    const l = searchParams.get('layout')
    if (l && (LAYOUTS as string[]).includes(l)) {
      if (l !== cur.listLayout) patch.listLayout = l as PersonListLayout
    } else if (isExternalNavigation && cur.listLayout !== 'grid') {
      patch.listLayout = 'grid'
    }

    const q = searchParams.get('q')
    if (q != null) {
      if (q !== cur.query) patch.query = q
    } else if (isExternalNavigation && cur.query !== '') {
      patch.query = ''
    }

    const a = searchParams.get('alive')
    if (a && (ALIVES as string[]).includes(a)) {
      if (a !== cur.aliveFilter) patch.aliveFilter = a as AliveFilter
    } else if (isExternalNavigation && cur.aliveFilter !== 'all') {
      patch.aliveFilter = 'all'
    }

    const infRaw = searchParams.get('minInf')
    if (infRaw != null) {
      const inf = Number(infRaw)
      if (
        Number.isFinite(inf) &&
        inf >= 0 &&
        inf <= 100 &&
        inf !== cur.minInfluence
      ) {
        patch.minInfluence = inf
      }
    } else if (isExternalNavigation && cur.minInfluence !== 0) {
      patch.minInfluence = 0
    }

    const s = searchParams.get('sort')
    if (s && (SORTS as string[]).includes(s)) {
      if (s !== cur.sort) patch.sort = s as PersonSortKey
    } else if (isExternalNavigation && cur.sort !== 'influence') {
      patch.sort = 'influence'
    }

    const order = searchParams.get('order')
    if (order && (ORDERS as string[]).includes(order)) {
      if (order !== cur.eraGroupOrder) patch.eraGroupOrder = order as EraGroupOrder
    } else if (isExternalNavigation && cur.eraGroupOrder !== 'desc') {
      patch.eraGroupOrder = 'desc'
    }

    // scope(era/region/field/countries)는 하나라도 URL에 있거나 외부 히스토리 이동일 때 채택
    const hasScopeParam =
      searchParams.get('era') != null ||
      searchParams.get('region') != null ||
      searchParams.get('field') != null ||
      searchParams.get('countries') != null
    if (hasScopeParam || isExternalNavigation) {
      const era = parseList(searchParams.get('era'))
      const region = parseList(searchParams.get('region'))
      const field = parseList(searchParams.get('field'))
      // 외부 진입의 국가 UUID는 이름으로 정규화(맵 미로드 시 원값 유지 → 로드 후 재수렴).
      const country = parseList(searchParams.get('countries')).map(
        (value) => idToCountryName.get(value) ?? value,
      )
      if (
        !eqList(era, cur.scopes.era) ||
        !eqList(region, cur.scopes.region) ||
        !eqList(field, cur.scopes.field) ||
        !eqList(country, cur.scopes.country)
      ) {
        const next: MultiScopes = { era, region, field, country }
        patch.scopes = next
      }
    } else if (
      idToCountryName.size > 0 &&
      cur.scopes.country.some((value) => idToCountryName.has(value))
    ) {
      // 마운트 직후 URL보다 store에 먼저 들어간 국가 UUID가 있으면 맵 로드 완료 시 한글 국가명으로 정규화
      const normalizedCountry = cur.scopes.country.map(
        (value) => idToCountryName.get(value) ?? value,
      )
      if (!eqList(normalizedCountry, cur.scopes.country)) {
        patch.scopes = { ...cur.scopes, country: normalizedCountry }
      }
    }

    // 기록 비교 뷰 — recordPersonIds(콤마 목록) / fromYear(포함) / toYear(배타), 부호 연도
    const recordIdsRaw = searchParams.get('recordPersonIds')
    if (recordIdsRaw != null) {
      const ids = parseList(recordIdsRaw).slice(0, MAX_RECORD_PERSONS)
      if (!eqList(ids, cur.recordPersonIds)) patch.recordPersonIds = ids
    }
    const fromYearRaw = searchParams.get('fromYear')
    if (fromYearRaw != null) {
      const fromYear = Number(fromYearRaw)
      if (Number.isInteger(fromYear) && fromYear !== cur.recordFromYear) {
        patch.recordFromYear = fromYear
      }
    }
    const toYearRaw = searchParams.get('toYear')
    if (toYearRaw != null) {
      const toYear = Number(toYearRaw)
      if (Number.isInteger(toYear) && toYear !== cur.recordToYear) {
        patch.recordToYear = toYear
      }
    }

    if (Object.keys(patch).length > 0) {
      adoptedThisCommitRef.current = true
      setMany(patch)
    }
    initializedRef.current = true
  }, [searchParams, setMany, idToCountryName])

  // store → URL : 값 변경 시 replaceState
  useEffect(() => {
    if (!initializedRef.current) return
    if (adoptedThisCommitRef.current) {
      adoptedThisCommitRef.current = false
      return
    }
    const next = new URLSearchParams(searchParams)

    const setOrDel = (k: string, v: string) => {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setOrDel('view', view !== 'story' ? view : '')
    setOrDel(
      'group',
      view === 'story' && groupBy !== 'century' ? groupBy : '',
    )
    setOrDel(
      'layout',
      view === 'story' && listLayout !== 'grid' ? listLayout : '',
    )
    setOrDel('q', query)
    setOrDel('alive', aliveFilter !== 'all' ? aliveFilter : '')
    setOrDel('minInf', minInfluence > 0 ? String(minInfluence) : '')
    // sort/order/group/layout은 목록(story) 뷰에서만 URL에 노출 — matrix·stats·records엔
    // inert 파라미터를 남기지 않는다(값은 store·persist에 유지되어 뷰 복귀 시 재노출).
    const sortConsumed = view === 'story'
    const orderConsumed = view === 'story' && groupBy === 'century'
    setOrDel('sort', sortConsumed && sort !== 'influence' ? sort : '')
    setOrDel('order', orderConsumed && eraGroupOrder !== 'desc' ? eraGroupOrder : '')
    setOrDel('era', scopes.era.join(','))
    setOrDel('region', scopes.region.join(','))
    setOrDel('field', scopes.field.join(','))
    setOrDel('countries', scopes.country.join(','))
    setOrDel('recordPersonIds', recordPersonIds.join(','))
    setOrDel('fromYear', recordFromYear != null ? String(recordFromYear) : '')
    setOrDel('toYear', recordToYear != null ? String(recordToYear) : '')

    const nextStr = next.toString()
    lastPushedSearchRef.current = nextStr
    if (nextStr !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [
    view,
    groupBy,
    listLayout,
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
