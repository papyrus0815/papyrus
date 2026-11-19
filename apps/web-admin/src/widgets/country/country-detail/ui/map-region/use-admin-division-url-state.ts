/**
 * 행정구역 뷰 URL 쿼리 상태 관리 훅.
 * 검색어·정렬·드릴 경로·선택 구역·레벨/단위 필터·활성 체계를 URL 파라미터와 동기화한다.
 */
import { useCallback, useMemo } from 'react'

import { useSearchParams } from 'react-router-dom'

export type AdminSort = 'name' | 'children' | 'established'

export const ADMIN_SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'children' as const, label: '하위 구역 많은 순' },
  { value: 'established' as const, label: '설립 연도순' },
]

const ADMIN_SORT_VALUES = ['name', 'children', 'established'] as const

export interface ParamUpdate {
  key: string
  value: string | null
  defaultValue?: string
}

export function useAdminDivisionUrlState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('division_q') ?? ''
  const sort = ((): AdminSort => {
    const raw = searchParams.get('division_sort')
    return raw && (ADMIN_SORT_VALUES as readonly string[]).includes(raw)
      ? (raw as AdminSort)
      : 'name'
  })()

  const pathRaw = searchParams.get('division_path') ?? ''
  const pathIds = useMemo(
    () => (pathRaw ? pathRaw.split(',').filter(Boolean) : []),
    [pathRaw],
  )
  const selectedId = searchParams.get('division_id')

  const { levelFilter, unitLabelFilter } = ((): {
    levelFilter: number | null
    unitLabelFilter: string | null
  } => {
    const raw = searchParams.get('division_level')
    if (!raw) return { levelFilter: null, unitLabelFilter: null }
    const sep = raw.indexOf(':')
    const lvlRaw = sep >= 0 ? raw.slice(0, sep) : raw
    const label = sep >= 0 ? raw.slice(sep + 1) : ''
    const parsedLevel = Number(lvlRaw)
    if (!Number.isFinite(parsedLevel) || parsedLevel <= 0) {
      return { levelFilter: null, unitLabelFilter: null }
    }
    return { levelFilter: parsedLevel, unitLabelFilter: label || null }
  })()

  const activeSchemeId = searchParams.get('division_scheme')

  const updateParams = useCallback(
    (updates: ParamUpdate[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const { key, value, defaultValue } of updates) {
            if (
              value == null ||
              value === '' ||
              (defaultValue != null && value === defaultValue)
            ) {
              next.delete(key)
            } else {
              next.set(key, value)
            }
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const updateParam = useCallback(
    (key: string, value: string | null, defaultValue?: string) => {
      updateParams([{ key, value, defaultValue }])
    },
    [updateParams],
  )

  const setSearch = useCallback(
    (value: string) => updateParam('division_q', value),
    [updateParam],
  )
  const setSort = useCallback(
    (value: AdminSort) => updateParam('division_sort', value, 'name'),
    [updateParam],
  )
  const setPath = useCallback(
    (ids: string[]) => updateParam('division_path', ids.join(',')),
    [updateParam],
  )
  const setSelectedId = useCallback(
    (value: string | null) => updateParam('division_id', value),
    [updateParam],
  )
  const setUnitFilter = useCallback(
    (raw: string | null) => updateParam('division_level', raw),
    [updateParam],
  )
  const setActiveScheme = useCallback(
    (id: string | null) =>
      updateParams([
        { key: 'division_scheme', value: id },
        { key: 'division_path', value: null },
        { key: 'division_id', value: null },
      ]),
    [updateParams],
  )

  return {
    search,
    sort,
    pathIds,
    selectedId,
    levelFilter,
    unitLabelFilter,
    activeSchemeId,
    updateParams,
    setSearch,
    setSort,
    setPath,
    setSelectedId,
    setUnitFilter,
    setActiveScheme,
  }
}
