/**
 * 지도 및 지역 — 행정구역 전용 뷰.
 *
 * 표시 모드 (mode):
 *  - search: admin_q가 있으면 → 서버 측 평탄 검색 (모든 깊이) + 부모 경로
 *  - level:  레벨 KPI 칩으로 단일 레벨만 (트리 flatten)
 *  - drill:  기본 — admin_path로 임의 깊이 drill
 *
 * 좌표가 있는 division은 선택 시 지도가 그쪽으로 이동.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useSearchParams } from 'react-router-dom'

import {
  type AdminDivisionConfig,
  type AdminDivisionScheme,
  type AdministrativeDivision,
  type DivisionOwner,
  useAdminDivisionConfigs,
  useAdminDivisionSchemes,
  useAdministrativeDivisionSearch,
  useAdministrativeDivisions,
  useDeleteAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  AdminDivisionFormModal,
  KpiChip,
  KpiStrip,
  ListEmptyState,
  MapCard,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  RegisterButton,
  SearchInput,
  SortSelect,
  useListKeyboard,
  useRegionPalette,
} from './map-region'
import {
  DivisionDetailFields,
  DivisionDetailHeaderInline,
} from './map-region/division-detail-fields'
import { AdminDivisionBulkImportModal } from './map-region/admin-division-bulk-import-modal'
import { AdminDivisionSchemeModal } from './map-region/admin-division-scheme-modal'
import { SchemeComparePanel } from './map-region/scheme-compare-panel'
import {
  countDescendants,
  findInTree,
  formatYearRange,
  isAbolished,
  resolvePath,
  sumSubtree,
} from './map-region/tree-utils'

type AdminSort = 'name' | 'children'

const SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'children' as const, label: '하위 구역 많은 순' },
]
const SORT_VALUES = ['name', 'children'] as const

interface MapRegionAdministrativeViewProps {
  country: {
    id: string
    name: string
    flagEmoji?: string | null
    latitude?: number | null
    longitude?: number | null
  }
  /**
   * 행정구역 소속 — 생략하면 현대 국가({ countryId: country.id })로 간주.
   * 역사적 국가 상세에서는 { historicalCountryId: country.id }를 전달한다.
   */
  owner?: DivisionOwner
  mapLocation?: { latitude: number; longitude: number; name: string } | null
  onCityClick: (city: {
    id: string
    name: string
    population: string
    latitude: number
    longitude: number
    area?: string
    gdp?: string
    industry?: string
  }) => void
}

interface FlatRow {
  id: string
  name: string
  localName: string | null
  divisionLevel: number
  divisionLabel: string
  parentPath: string[]
  childrenCount: number
  abolished: boolean
  schemeId?: string | null
  centerLat?: number | null
  centerLng?: number | null
}

/** 트리 전체 leaf-first 평탄 + 레벨/부모경로 병합 */
function flattenTree(
  roots: AdministrativeDivision[],
  configs: Map<string, AdminDivisionConfig>,
): FlatRow[] {
  const out: FlatRow[] = []
  const walk = (
    nodes: AdministrativeDivision[],
    path: string[],
  ) => {
    for (const n of nodes) {
      const cfg = configs.get(n.adminDivisionId)
      out.push({
        id: n.id,
        name: n.name,
        localName: n.localName ?? null,
        divisionLevel: cfg?.divisionLevel ?? path.length + 1,
        divisionLabel: cfg?.divisionLabel ?? '',
        parentPath: path,
        childrenCount: n.children?.length ?? 0,
        abolished: isAbolished(n),
        schemeId: n.schemeId ?? null,
        centerLat: n.centerLat ?? null,
        centerLng: n.centerLng ?? null,
      })
      if (n.children?.length) walk(n.children, [...path, n.name])
    }
  }
  walk(roots, [])
  return out
}

export function MapRegionAdministrativeView({
  country,
  owner: ownerProp,
  mapLocation: externalMapLocation,
  onCityClick,
}: MapRegionAdministrativeViewProps) {
  const owner: DivisionOwner = ownerProp ?? { countryId: country.id }
  const palette = useRegionPalette()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdministrativeDivision | null>(null)
  const [pendingDelete, setPendingDelete] =
    useState<AdministrativeDivision | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [schemeModalOpen, setSchemeModalOpen] = useState(false)
  const [schemeEditing, setSchemeEditing] =
    useState<AdminDivisionScheme | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // URL 동기화
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('admin_q') ?? ''
  const sort = ((): AdminSort => {
    const raw = searchParams.get('admin_sort')
    return raw && (SORT_VALUES as readonly string[]).includes(raw)
      ? (raw as AdminSort)
      : 'name'
  })()
  const pathRaw = searchParams.get('admin_path') ?? ''
  const pathIds = useMemo(
    () => (pathRaw ? pathRaw.split(',').filter(Boolean) : []),
    [pathRaw],
  )
  const selectedId = searchParams.get('admin_id')
  const levelFilter = ((): number | null => {
    const raw = searchParams.get('admin_level')
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  })()
  /** 활성 체계 ID — null이면 전체(체계 미지정 포함) 보기 */
  const activeSchemeId = searchParams.get('admin_scheme')

  // ===== 데이터 (체계 필터 반영)
  const { data: divisions = [], isLoading } = useAdministrativeDivisions(
    owner,
    activeSchemeId,
  )
  const { data: configs = [] } = useAdminDivisionConfigs(owner, activeSchemeId)
  const { data: schemes = [], isSuccess: schemesLoaded } =
    useAdminDivisionSchemes(owner)
  const deleteMut = useDeleteAdministrativeDivision(owner)

  // 여러 파라미터를 한 번의 setSearchParams로 적용한다.
  // react-router의 setSearchParams는 함수형 업데이터라도 "현재 렌더의 searchParams"를
  // 기준으로 동작해(nextInit(new URLSearchParams(searchParams))), 한 핸들러에서 여러 번
  // 동기 호출하면 서로의 변경을 못 보고 마지막 navigate만 살아남는다. 그래서 복합 동작
  // (선택+드릴, 검색해제+경로이동 등)은 반드시 이 함수로 한 번에 묶어야 한다.
  const updateParams = useCallback(
    (
      updates: Array<{
        key: string
        value: string | null
        defaultValue?: string
      }>,
    ) => {
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
    (v: string) => updateParam('admin_q', v),
    [updateParam],
  )
  const setSort = useCallback(
    (v: AdminSort) => updateParam('admin_sort', v, 'name'),
    [updateParam],
  )
  const setPath = useCallback(
    (ids: string[]) => updateParam('admin_path', ids.join(',')),
    [updateParam],
  )
  const setSelectedId = useCallback(
    (v: string | null) => updateParam('admin_id', v),
    [updateParam],
  )
  const setLevelFilter = useCallback(
    (n: number | null) => updateParam('admin_level', n == null ? null : String(n)),
    [updateParam],
  )
  /** 체계 전환 — 드릴 경로·선택은 새 체계 트리와 무관하므로 함께 초기화 */
  const setActiveScheme = useCallback(
    (id: string | null) =>
      updateParams([
        { key: 'admin_scheme', value: id },
        { key: 'admin_path', value: null },
        { key: 'admin_id', value: null },
      ]),
    [updateParams],
  )

  // 삭제 등으로 사라진 체계가 URL에 남아 있으면 정리.
  // 로딩/오류 중(빈 placeholder)에는 판단 보류 — 단, 조회가 성공했는데 목록이
  // 비어 있으면(마지막 체계 삭제) 그것도 stale이므로 함께 정리한다.
  useEffect(() => {
    if (!activeSchemeId || !schemesLoaded) return
    if (!schemes.some((s) => s.id === activeSchemeId)) {
      setActiveScheme(null)
    }
  }, [activeSchemeId, schemes, schemesLoaded, setActiveScheme])

  const activeScheme =
    schemes.find((s) => s.id === activeSchemeId) ?? null

  // ===== 모드 결정
  const mode: 'search' | 'level' | 'drill' =
    search.trim() !== ''
      ? 'search'
      : levelFilter != null
      ? 'level'
      : 'drill'

  // 검색/레벨 모드일 땐 path는 무시하지만 URL 보존
  const breadcrumb = useMemo(
    () => resolvePath(divisions, pathIds),
    [divisions, pathIds],
  )
  const currentParent =
    breadcrumb.length === 0 ? null : breadcrumb[breadcrumb.length - 1] ?? null
  const drillItems: AdministrativeDivision[] =
    breadcrumb.length === 0
      ? divisions
      : breadcrumb[breadcrumb.length - 1]!.children ?? []
  const drillLevel = breadcrumb.length + 1

  // 데이터 — 모드별
  const configsById = useMemo(() => {
    const m = new Map<string, AdminDivisionConfig>()
    for (const c of configs) m.set(c.id, c)
    return m
  }, [configs])

  const flat = useMemo(
    () => flattenTree(divisions, configsById),
    [divisions, configsById],
  )

  const debouncedSearch = useDebouncedValue(search, 250, country.id)
  const [searchLimit, setSearchLimit] = useState(50)
  // 검색어/국가가 바뀌면 limit 리셋
  useEffect(() => {
    setSearchLimit(50)
  }, [debouncedSearch, country.id])
  const searchQuery = useAdministrativeDivisionSearch(
    mode === 'search' ? debouncedSearch : '',
    owner,
    searchLimit,
    activeSchemeId,
  )
  const hasMoreSearchResults =
    mode === 'search' &&
    !searchQuery.isLoading &&
    (searchQuery.data?.length ?? 0) === searchLimit &&
    searchLimit < 200

  const rowsForMode: FlatRow[] = useMemo(() => {
    if (mode === 'search') {
      return (searchQuery.data ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        localName: h.localName ?? null,
        divisionLevel: h.divisionLevel,
        divisionLabel: h.divisionLabel,
        parentPath: h.parentPath,
        childrenCount: 0, // 검색 결과엔 children count 없음
        abolished: h.abolished,
        schemeId: h.schemeId ?? null,
        centerLat: h.centerLat ?? null,
        centerLng: h.centerLng ?? null,
      }))
    }
    if (mode === 'level') {
      return flat.filter((r) => r.divisionLevel === levelFilter)
    }
    // drill
    return drillItems.map<FlatRow>((n) => {
      const cfg = configsById.get(n.adminDivisionId)
      return {
        id: n.id,
        name: n.name,
        localName: n.localName ?? null,
        divisionLevel: cfg?.divisionLevel ?? drillLevel,
        divisionLabel: cfg?.divisionLabel ?? '',
        parentPath: breadcrumb.map((b) => b.name),
        childrenCount: n.children?.length ?? 0,
        abolished: isAbolished(n),
        schemeId: n.schemeId ?? null,
        centerLat: n.centerLat ?? null,
        centerLng: n.centerLng ?? null,
      }
    })
  }, [
    mode,
    searchQuery.data,
    flat,
    levelFilter,
    drillItems,
    configsById,
    drillLevel,
    breadcrumb,
  ])

  const sortedRows = useMemo(() => {
    const list = [...rowsForMode]
    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else {
      list.sort((a, b) => b.childrenCount - a.childrenCount)
    }
    return list
  }, [rowsForMode, sort])

  // path가 데이터와 어긋나면 잘라낸다 (drill 모드 전용)
  useEffect(() => {
    if (mode !== 'drill') return
    if (pathIds.length > breadcrumb.length) {
      setPath(breadcrumb.map((d) => d.id))
    }
  }, [mode, pathIds.length, breadcrumb, setPath])

  const selectedDivision = useMemo(
    () => (selectedId ? findInTree(divisions, selectedId) : null),
    [divisions, selectedId],
  )

  useEffect(() => {
    // 로딩 중에는 트리가 비어 있으므로 건드리지 않는다 —
    // 딥링크/새로고침으로 admin_id가 URL에 있을 때, 데이터가 도착하기 전에
    // 선택을 지워버리면 상세 패널이 빈 상태로 남는다.
    if (isLoading) return
    if (selectedId && !findInTree(divisions, selectedId)) {
      setSelectedId(null)
    }
  }, [isLoading, divisions, selectedId, setSelectedId])

  // 키보드/외부 nav 후 viewport에서 선택 항목 보이게
  useEffect(() => {
    if (!selectedId) return
    const el = document.querySelector(
      `[data-admin-row="${selectedId}"]`,
    ) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedId])

  // ===== 레벨 KPI
  const levelCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const r of flat) {
      counts.set(r.divisionLevel, (counts.get(r.divisionLevel) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([level, count]) => {
        const cfg = configs.find((c) => c.divisionLevel === level)
        return {
          level,
          count,
          label: cfg?.divisionLabel ?? `${level}차`,
        }
      })
      .sort((a, b) => a.level - b.level)
  }, [flat, configs])

  const reportLocation = (division: AdministrativeDivision | null) => {
    onCityClick({
      id: division?.id ?? '',
      name: division?.name ?? '',
      population: '',
      latitude:
        division?.centerLat != null
          ? Number(division.centerLat)
          : country.latitude ?? 0,
      longitude:
        division?.centerLng != null
          ? Number(division.centerLng)
          : country.longitude ?? 0,
    })
  }

  const handleItemClick = (row: FlatRow) => {
    const node = findInTree(divisions, row.id)
    // 자식이 있으면 드릴(경로 push) + 선택을 한 번에 — 분리 호출 시 admin_id가 덮어써짐
    const drilling = mode === 'drill' && (node?.children ?? []).length > 0
    updateParams([
      { key: 'admin_id', value: row.id },
      ...(drilling
        ? [{ key: 'admin_path', value: [...pathIds, row.id].join(',') }]
        : []),
    ])
    reportLocation(node)
  }

  const handleBreadcrumbClick = (index: number) => {
    updateParams([
      {
        key: 'admin_path',
        value: (index < 0 ? [] : pathIds.slice(0, index + 1)).join(','),
      },
      { key: 'admin_id', value: null },
    ])
    reportLocation(null)
  }

  // 키보드 네비
  useListKeyboard({
    items: sortedRows,
    selectedId,
    onSelect: (id) => {
      if (id === null) {
        setSelectedId(null)
        return
      }
      const row = sortedRows.find((d) => d.id === id)
      if (!row) return
      handleItemClick(row)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (item: AdministrativeDivision) => {
    setEditing(item)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMut.mutateAsync(pendingDelete.id)
      notify.success('행정구역을 삭제했습니다')
      const updates: Array<{ key: string; value: string | null }> = []
      const idx = pathIds.indexOf(pendingDelete.id)
      if (idx >= 0)
        updates.push({ key: 'admin_path', value: pathIds.slice(0, idx).join(',') })
      if (selectedId === pendingDelete.id)
        updates.push({ key: 'admin_id', value: null })
      if (updates.length) updateParams(updates)
      setPendingDelete(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const mapLocation = useMemo(() => {
    if (
      selectedDivision?.centerLat != null &&
      selectedDivision?.centerLng != null
    ) {
      return {
        latitude: Number(selectedDivision.centerLat),
        longitude: Number(selectedDivision.centerLng),
        name: selectedDivision.name,
      }
    }
    return externalMapLocation ?? null
  }, [selectedDivision, externalMapLocation])

  // 현재 리스트에 좌표 있는 항목들을 다중 핀으로 표시
  const mapMarkers = useMemo(
    () =>
      sortedRows
        .filter((r) => r.centerLat != null && r.centerLng != null)
        .map((r) => ({
          id: r.id,
          latitude: Number(r.centerLat),
          longitude: Number(r.centerLng),
          name: r.name,
        })),
    [sortedRows],
  )

  // ===== 디테일 패널 부모 체인
  const selectedParentChain = useMemo(() => {
    if (!selectedDivision) return [] as Array<{ id: string; name: string }>
    const chain: Array<{ id: string; name: string }> = []
    let cursor: AdministrativeDivision | null = selectedDivision.parentId
      ? findInTree(divisions, selectedDivision.parentId)
      : null
    while (cursor) {
      chain.unshift({ id: cursor.id, name: cursor.name })
      cursor = cursor.parentId ? findInTree(divisions, cursor.parentId) : null
    }
    return chain
  }, [selectedDivision, divisions])

  /** 디테일 → breadcrumb 클릭 시 그 노드까지 drill */
  const drillToNode = (id: string) => {
    const chain: string[] = []
    const targetParents: string[] = []
    let cursor: AdministrativeDivision | null = findInTree(divisions, id)
    while (cursor) {
      targetParents.unshift(cursor.id)
      cursor = cursor.parentId ? findInTree(divisions, cursor.parentId) : null
    }
    chain.push(...targetParents)
    updateParams([
      { key: 'admin_q', value: null },
      { key: 'admin_level', value: null },
      { key: 'admin_path', value: chain.join(',') },
      { key: 'admin_id', value: id },
    ])
    const node = findInTree(divisions, id)
    reportLocation(node)
  }

  // ===== 체계(시기별 편제) 선택 바
  const schemeBar = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '10px 14px',
        marginBottom: 10,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: palette.textSecondary,
          marginRight: 4,
          letterSpacing: '0.04em',
        }}
      >
        체계
      </span>
      <SchemeChip
        palette={palette}
        active={!activeSchemeId}
        onClick={() => setActiveScheme(null)}
      >
        전체
      </SchemeChip>
      {schemes.map((s) => (
        <SchemeChip
          key={s.id}
          palette={palette}
          active={activeSchemeId === s.id}
          onClick={() => setActiveScheme(s.id)}
          onEdit={
            activeSchemeId === s.id
              ? () => {
                  setSchemeEditing(s)
                  setSchemeModalOpen(true)
                }
              : undefined
          }
        >
          {s.name}
          <span
            style={{
              marginLeft: 5,
              fontWeight: 500,
              opacity: 0.75,
              fontSize: 11,
            }}
          >
            {formatYearRange(s.startDate, s.endDate)} · {s.divisionCount}
          </span>
        </SchemeChip>
      ))}
      <button
        type="button"
        onClick={() => {
          setSchemeEditing(null)
          setSchemeModalOpen(true)
        }}
        style={{
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 600,
          border: `1px dashed ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 9,
          cursor: 'pointer',
        }}
      >
        + 체계 등록
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => setCompareOpen(true)}
        style={{
          padding: '5px 11px',
          fontSize: 12,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          color: palette.primary,
          borderRadius: 9,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ⇄ 체계 비교
      </button>
    </div>
  )

  // KPI strip
  const kpiStrip =
    levelCounts.length > 0 ? (
      <KpiStrip palette={palette} totalCount={flat.length}>
        {levelCounts.map((lc) => (
          <KpiChip
            key={lc.level}
            palette={palette}
            filterValue={String(lc.level)}
            currentFilter={levelFilter == null ? 'all' : String(levelFilter)}
            onFilterChange={(v) =>
              setLevelFilter(v === 'all' ? null : Number(v))
            }
            label={`${lc.level}차 ${lc.label ? `· ${lc.label}` : ''}`}
            count={lc.count}
          />
        ))}
      </KpiStrip>
    ) : null

  // 컨텍스트 행 — 모드별로 다르게 (한 행으로 합침)
  const contextBar = (() => {
    if (mode === 'search') {
      return (
        <ContextRow
          palette={palette}
          left={
            <span style={{ fontSize: 12, fontWeight: 600, color: palette.primary }}>
              "{search}" 전체 검색
            </span>
          }
          right={
            <>
              <CountBadge palette={palette}>{sortedRows.length}개</CountBadge>
              <ClearLink palette={palette} onClick={() => setSearch('')}>
                해제
              </ClearLink>
            </>
          }
        />
      )
    }
    if (mode === 'level') {
      const cfg = configs.find((c) => c.divisionLevel === levelFilter)
      return (
        <ContextRow
          palette={palette}
          left={
            <span style={{ fontSize: 12, fontWeight: 600, color: palette.primary }}>
              {levelFilter}차{cfg ? ` · ${cfg.divisionLabel}` : ''} 전체
            </span>
          }
          right={
            <>
              <CountBadge palette={palette}>{sortedRows.length}개</CountBadge>
              <ClearLink palette={palette} onClick={() => setLevelFilter(null)}>
                해제
              </ClearLink>
            </>
          }
        />
      )
    }
    // drill 모드 — breadcrumb (← 버튼 없이, 클릭으로 점프) + 카운트
    // 깊이 > 3이면 첫 단계 + ... + 마지막 2단계만 (모바일·좁은 패널에서 wrap 방지)
    const compactBreadcrumb =
      breadcrumb.length > 3
        ? [
            { node: breadcrumb[0]!, idx: 0 },
            { node: null, idx: -2 } as const,
            { node: breadcrumb[breadcrumb.length - 2]!, idx: breadcrumb.length - 2 },
            { node: breadcrumb[breadcrumb.length - 1]!, idx: breadcrumb.length - 1 },
          ]
        : breadcrumb.map((node, idx) => ({ node, idx }))
    return (
      <ContextRow
        palette={palette}
        left={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'nowrap',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            <BreadcrumbBtn
              palette={palette}
              active={breadcrumb.length === 0}
              onClick={() => handleBreadcrumbClick(-1)}
            >
              {country.flagEmoji ? `${country.flagEmoji} ` : ''}
              {country.name}
            </BreadcrumbBtn>
            {compactBreadcrumb.map((entry) => (
              <span
                key={entry.node ? entry.node.id : 'ellipsis'}
                style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}
              >
                <span style={{ color: palette.textSecondary }}>›</span>
                {entry.node ? (
                  <BreadcrumbBtn
                    palette={palette}
                    active={entry.idx === breadcrumb.length - 1}
                    onClick={() => handleBreadcrumbClick(entry.idx)}
                  >
                    {entry.node.name}
                  </BreadcrumbBtn>
                ) : (
                  <span
                    style={{ color: palette.textSecondary, padding: '2px 4px' }}
                    title={breadcrumb
                      .slice(1, -2)
                      .map((n) => n.name)
                      .join(' › ')}
                  >
                    …
                  </span>
                )}
              </span>
            ))}
          </div>
        }
        right={
          <CountBadge palette={palette}>
            {drillLevel}차 · {sortedRows.length}개
          </CountBadge>
        }
      />
    )
  })()

  // 좁은 좌측 패널(360px)에 검색·정렬·버튼을 한 줄로 욱여넣으면 검색창이
  // 뭉개진다 — 검색은 첫 줄 전체, 정렬·등록 액션은 둘째 줄로 분리.
  const toolbar = (
    <>
      <div
        style={{
          padding: '12px 16px 8px',
          background: palette.bg,
          flexShrink: 0,
        }}
      >
        <SearchInput
          palette={palette}
          value={search}
          onChange={setSearch}
          placeholder="이름·현지어 검색"
        />
      </div>
      <div
        style={{
          padding: '0 16px 12px',
          borderBottom: `1px solid ${palette.border}`,
          background: palette.bg,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <SortSelect
          palette={palette}
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
        />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          style={{
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 600,
            border: `1px solid ${palette.border}`,
            background: palette.bg,
            color: palette.text,
            borderRadius: 10,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          일괄 등록
        </button>
        <RegisterButton palette={palette} onClick={openCreate} />
      </div>
      {contextBar}
    </>
  )

  // 가상화 — 큰 리스트(30+)에서 활성. 빈 상태/로딩은 일반 렌더.
  const showTypeBadge = mode !== 'drill'
  const isVirtualized = sortedRows.length > 30
  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  const schemeNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of schemes) m.set(s.id, s.name)
    return m
  }, [schemes])

  const renderRow = (row: FlatRow) => {
    const node = findInTree(divisions, row.id)
    const subtitleParts: string[] = []
    if (showTypeBadge && row.divisionLabel)
      subtitleParts.push(row.divisionLabel)
    if (row.localName) subtitleParts.push(row.localName)
    if (row.parentPath.length > 0)
      subtitleParts.push(row.parentPath.join(' › '))
    // "전체" 보기에서는 어느 체계 소속인지 구분이 안 되므로 체계명을 부제목에 병기
    if (!activeSchemeId && row.schemeId) {
      const schemeName = schemeNameById.get(row.schemeId)
      if (schemeName) subtitleParts.push(schemeName)
    }
    const subtitle = subtitleParts.join(' · ') || undefined
    return (
      <div
        data-admin-row={row.id}
        style={{
          position: 'relative',
          opacity: row.abolished ? 0.5 : 1,
          textDecoration: row.abolished ? 'line-through' : 'none',
        }}
      >
        <RegionListItem
          palette={palette}
          selected={selectedId === row.id}
          onSelect={() => handleItemClick(row)}
          title={row.name}
          subtitle={subtitle}
          onEdit={node ? () => openEdit(node) : undefined}
          onDelete={node ? () => setPendingDelete(node) : undefined}
          typeBadge={
            showTypeBadge && row.divisionLabel
              ? {
                  label: row.divisionLabel,
                  color: palette.primary,
                  bg: palette.badgeBg,
                }
              : null
          }
          trailing={
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {row.abolished && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.12)',
                    padding: '2px 6px',
                    borderRadius: 5,
                  }}
                >
                  폐지
                </span>
              )}
              {row.childrenCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: palette.textSecondary,
                    background: palette.bgSecondary,
                    padding: '2px 8px',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  {row.childrenCount}개
                </span>
              )}
            </span>
          }
        />
      </div>
    )
  }

  const listContent = (() => {
    if (mode === 'search' && searchQuery.isLoading) {
      return <ListEmptyState palette={palette} message="검색 중…" />
    }
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (mode === 'drill' && breadcrumb.length === 0 && divisions.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 행정구역이 없습니다"
          action={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              <RegisterButton
                palette={palette}
                onClick={openCreate}
                label="첫 행정구역 등록"
              />
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  background: 'transparent',
                  color: palette.textSecondary,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                또는 일괄 등록 (47개 도도부현·50개 주를 한 번에)
              </button>
            </div>
          }
        />
      )
    }
    if (sortedRows.length === 0) {
      const message =
        mode === 'search'
          ? `"${search}" 검색 결과가 없습니다`
          : mode === 'level'
          ? '이 레벨에는 항목이 없습니다'
          : '하위 구역이 없습니다'
      return <ListEmptyState palette={palette} message={message} />
    }
    if (isVirtualized) {
      return (
        <>
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => (
              <div
                key={vItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                {renderRow(sortedRows[vItem.index]!)}
              </div>
            ))}
          </div>
          {hasMoreSearchResults && (
            <button
              type="button"
              onClick={() => setSearchLimit((n) => Math.min(200, n + 50))}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                border: 'none',
                borderTop: `1px solid ${palette.border}`,
                background: 'transparent',
                color: palette.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              더 보기 (현재 {sortedRows.length}건 · 최대 200)
            </button>
          )}
        </>
      )
    }
    const items = sortedRows.map((row) => (
      <div key={row.id}>{renderRow(row)}</div>
    ))
    if (hasMoreSearchResults) {
      items.push(
        <button
          key="__more__"
          type="button"
          onClick={() => setSearchLimit((n) => Math.min(200, n + 50))}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px',
            border: 'none',
            borderTop: `1px solid ${palette.border}`,
            background: 'transparent',
            color: palette.primary,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          더 보기 (현재 {sortedRows.length}건 · 최대 200)
        </button>,
      )
    }
    return items
  })()

  // ===== 등록 모달 컨텍스트
  const formDefaultLevel = editing
    ? 1
    : mode === 'drill'
    ? drillLevel
    : 1
  const formDefaultParent =
    editing || mode !== 'drill' || !currentParent
      ? null
      : { id: currentParent.id, name: currentParent.name }

  const detailUnitLabel = selectedDivision
    ? configsById.get(selectedDivision.adminDivisionId)?.divisionLabel ?? null
    : null

  if (compareOpen) {
    return (
      <SchemeComparePanel
        palette={palette}
        initialLeftSchemeId={activeSchemeId}
        onClose={() => setCompareOpen(false)}
      />
    )
  }

  return (
    <>
      <MapCard
        palette={palette}
        country={country}
        mapLocation={mapLocation}
        markers={mapMarkers}
        selectedMarkerId={selectedId}
        onMarkerClick={(id) => {
          const row = sortedRows.find((r) => r.id === id)
          if (row) handleItemClick(row)
        }}
      />

      <RegionSplitLayout
        ariaLabel="행정구역"
        kpiStrip={
          <>
            {schemeBar}
            {kpiStrip}
          </>
        }
        maxHeight="calc(100vh - 380px)"
        left={
          <RegionListPanel
            palette={palette}
            toolbar={toolbar}
            scrollRef={scrollRef}
          >
            {listContent}
          </RegionListPanel>
        }
        right={
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedDivision}
            emptyTitle={
              divisions.length === 0
                ? '등록된 행정구역이 없습니다'
                : '좌측 목록에서 지역을 선택하세요'
            }
            emptyDescription={
              divisions.length === 0
                ? '이 국가에는 아직 행정구역 데이터가 등록되지 않았습니다'
                : '↑↓로 이동, Esc로 선택 해제'
            }
            header={
              selectedDivision ? (
                <DivisionDetailHeaderInline
                  palette={palette}
                  owner={owner}
                  division={selectedDivision}
                  countryName={country.name}
                  unitLabel={detailUnitLabel}
                />
              ) : null
            }
          >
            {selectedParentChain.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: palette.textSecondary,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600 }}>경로:</span>
                <BreadcrumbBtn
                  palette={palette}
                  active={false}
                  onClick={() => {
                    updateParams([
                      { key: 'admin_q', value: null },
                      { key: 'admin_level', value: null },
                      { key: 'admin_path', value: null },
                      { key: 'admin_id', value: null },
                    ])
                    reportLocation(null)
                  }}
                >
                  {country.name}
                </BreadcrumbBtn>
                {selectedParentChain.map((p) => (
                  <span
                    key={p.id}
                    style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
                  >
                    <span style={{ color: palette.textSecondary }}>›</span>
                    <BreadcrumbBtn
                      palette={palette}
                      active={false}
                      onClick={() => drillToNode(p.id)}
                    >
                      {p.name}
                    </BreadcrumbBtn>
                  </span>
                ))}
              </div>
            )}
            {selectedDivision && (
              <DivisionDetailFields
                // 구역이 바뀌면 리마운트 — 이전 구역의 서술 draft 상태가 새 구역으로
                // 새어 들어가 전체 배열 PATCH로 엉뚱한 구역에 저장되는 사고 방지
                key={selectedDivision.id}
                palette={palette}
                owner={owner}
                division={selectedDivision}
                divisions={divisions}
              />
            )}
          </RegionDetailPanel>
        }
      />

      <AdminDivisionFormModal
        isOpen={formOpen}
        owner={owner}
        schemeId={activeSchemeId}
        schemeName={activeScheme?.name ?? null}
        countryDisplay={{
          name: country.name,
          latitude: country.latitude ?? null,
          longitude: country.longitude ?? null,
        }}
        editing={editing}
        defaultLevel={formDefaultLevel}
        defaultParent={formDefaultParent}
        onClose={closeForm}
      />

      <AdminDivisionSchemeModal
        isOpen={schemeModalOpen}
        owner={owner}
        editing={schemeEditing}
        onClose={() => {
          setSchemeModalOpen(false)
          setSchemeEditing(null)
        }}
        onCreated={(id) => setActiveScheme(id)}
      />

      <AdminDivisionBulkImportModal
        isOpen={bulkOpen}
        owner={owner}
        schemeId={activeSchemeId}
        defaultLevel={mode === 'drill' ? drillLevel : 1}
        defaultParent={
          mode === 'drill' && currentParent
            ? { id: currentParent.id, name: currentParent.name }
            : null
        }
        onClose={() => setBulkOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="행정구역 삭제"
        message={(() => {
          if (!pendingDelete) return ''
          const desc = countDescendants(pendingDelete)
          const cities = sumSubtree(pendingDelete, (n) => n.cityCount ?? 0)
          const successors = sumSubtree(
            pendingDelete,
            (n) => n.successorCount ?? 0,
          )
          const parts: string[] = []
          parts.push(
            desc === 0
              ? `"${pendingDelete.name}"을(를) 삭제합니다.`
              : `"${pendingDelete.name}"과 하위 ${desc}개 구역(총 ${desc + 1}개)이 함께 삭제됩니다.`,
          )
          if (cities > 0) {
            parts.push(
              `연결된 도시 ${cities}개의 행정구역 연결이 해제됩니다.`,
            )
          }
          if (successors > 0) {
            parts.push(
              `이 구역을 전신(前身)으로 지정한 ${successors}개 구역의 연결도 함께 해제됩니다.`,
            )
          }
          parts.push('이 작업은 되돌릴 수 없습니다.')
          return parts.join(' ')
        })()}
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

interface SchemeChipProps {
  palette: ReturnType<typeof useRegionPalette>
  active: boolean
  onClick: () => void
  /** 활성 칩에만 노출되는 편집 트리거 */
  onEdit?: () => void
  children: React.ReactNode
}

/** 체계 선택 칩 — 활성 칩은 강조 + ✎ 편집 버튼 */
function SchemeChip({
  palette,
  active,
  onClick,
  onEdit,
  children,
}: SchemeChipProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={{
          padding: '5px 11px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 9,
          border: `1px solid ${active ? palette.primary : palette.border}`,
          background: active ? palette.badgeBg : 'transparent',
          color: active ? palette.primary : palette.text,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="체계 편집"
          title="체계 편집"
          style={{
            width: 22,
            height: 22,
            padding: 0,
            border: 'none',
            borderRadius: 5,
            background: 'transparent',
            color: palette.textSecondary,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ✎
        </button>
      )}
    </span>
  )
}

interface BreadcrumbBtnProps {
  palette: ReturnType<typeof useRegionPalette>
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function BreadcrumbBtn({
  palette,
  active,
  onClick,
  children,
}: BreadcrumbBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '2px 6px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        color: active ? palette.text : palette.textSecondary,
        cursor: active ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = palette.bgSecondary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

interface ContextRowProps {
  palette: ReturnType<typeof useRegionPalette>
  left: React.ReactNode
  right: React.ReactNode
}

function ContextRow({ palette, left, right }: ContextRowProps) {
  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {right}
      </div>
    </div>
  )
}

function CountBadge({
  palette,
  children,
}: {
  palette: ReturnType<typeof useRegionPalette>
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: palette.primary,
        background: palette.badgeBg,
        padding: '3px 8px',
        borderRadius: 6,
      }}
    >
      {children}
    </span>
  )
}

function ClearLink({
  palette,
  onClick,
  children,
}: {
  palette: ReturnType<typeof useRegionPalette>
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        border: 'none',
        background: 'transparent',
        color: palette.primary,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
