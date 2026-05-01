import { useCallback, useMemo } from 'react'

import { useSearchParams } from 'react-router-dom'

interface UseRegionUrlStateOptions<F extends string, S extends string> {
  /** URL 파라미터 prefix — 자연 vs 인프라 충돌 방지 (예: 'nature', 'infra') */
  prefix: string
  /** 유효한 필터 값 (검증용) */
  filterValues: ReadonlyArray<F>
  /** 유효한 정렬 값 */
  sortValues: ReadonlyArray<S>
  defaultFilter: F
  defaultSort: S
}

interface RegionUrlState<F extends string, S extends string> {
  filter: F
  sort: S
  search: string
  selectedId: string | null
  setFilter: (value: F) => void
  setSort: (value: S) => void
  setSearch: (value: string) => void
  setSelectedId: (id: string | null) => void
}

/**
 * map-region 뷰의 상태(필터·정렬·검색·선택)를 URL 쿼리에 동기화.
 *
 * 쿼리 키: `<prefix>_filter`, `<prefix>_sort`, `<prefix>_q`, `<prefix>_id`
 * 기본값과 같으면 쿼리에서 제거해 URL을 깔끔하게 유지.
 */
export function useRegionUrlState<F extends string, S extends string>({
  prefix,
  filterValues,
  sortValues,
  defaultFilter,
  defaultSort,
}: UseRegionUrlStateOptions<F, S>): RegionUrlState<F, S> {
  const [searchParams, setSearchParams] = useSearchParams()

  const keyFilter = `${prefix}_filter`
  const keySort = `${prefix}_sort`
  const keySearch = `${prefix}_q`
  const keyId = `${prefix}_id`

  const filter: F = useMemo(() => {
    const raw = searchParams.get(keyFilter)
    return raw && (filterValues as readonly string[]).includes(raw)
      ? (raw as F)
      : defaultFilter
  }, [searchParams, keyFilter, filterValues, defaultFilter])

  const sort: S = useMemo(() => {
    const raw = searchParams.get(keySort)
    return raw && (sortValues as readonly string[]).includes(raw)
      ? (raw as S)
      : defaultSort
  }, [searchParams, keySort, sortValues, defaultSort])

  const search = searchParams.get(keySearch) ?? ''
  const selectedId = searchParams.get(keyId)

  const update = useCallback(
    (key: string, value: string | null, defaultValue?: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (
            value == null ||
            value === '' ||
            (defaultValue != null && value === defaultValue)
          ) {
            next.delete(key)
          } else {
            next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return {
    filter,
    sort,
    search,
    selectedId,
    setFilter: useCallback(
      (value) => update(keyFilter, value, defaultFilter),
      [update, keyFilter, defaultFilter],
    ),
    setSort: useCallback(
      (value) => update(keySort, value, defaultSort),
      [update, keySort, defaultSort],
    ),
    setSearch: useCallback((value) => update(keySearch, value), [update, keySearch]),
    setSelectedId: useCallback(
      (id) => update(keyId, id),
      [update, keyId],
    ),
  }
}
