/**
 * 지도 및 지역 — 행정구역 전용 뷰 (현대 국가 & 역사 국가 공용).
 *
 * 구성:
 *  1) 3열 Event-Ledger 벤토 인포그래픽 (계층·단위 분포 / 광역 구역 편제 Top 5 / 존속·좌표 매핑률)
 *  2) 시기별 행정구역 편제 체계 바 (전체 · 각 시대 체계 · 단위 관리 · 체계 비교)
 *  3) 좌우 병렬 아틀라스 데스크: 좌측 계층·검색 원장 목록 + 우측(인터랙티브 지도 + 상세/총람 패널)
 */
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'

import { FiInfo } from 'react-icons/fi'
import { useTheme } from 'styled-components'

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
import type { SegmentSlice } from '@/entities/event/ui/bento-primitives'
import type { City } from '@/shared/api/city'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { dateSortKey } from '@/shared/lib/iso-date'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  ADMIN_SORT_OPTIONS,
  AdminBentoInfographic,
  AdminDivisionConfigModal,
  AdminDivisionFormModal,
  type AdminInfographicData,
  AdminSchemeBar,
  AdminUnselectedOverview,
  FilterPill,
  ListEmptyState,
  MapCard,
  PillToolbar,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  RegisterButton,
  SearchInput,
  SortSelect,
  type StatusFilter,
  type TopRankMetric,
  useAdminDivisionUrlState,
  useListKeyboard,
  useRegionPalette,
} from './map-region'
import { AdminDivisionBulkImportModal } from './map-region/admin-division-bulk-import-modal'
import { AdminDivisionSchemeModal } from './map-region/admin-division-scheme-modal'
import {
  DivisionDetailFields,
  DivisionDetailHeaderInline,
} from './map-region/division-detail-fields'
import { SchemeComparePanel } from './map-region/scheme-compare-panel'
import {
  countDescendants,
  findInTree,
  formatYearRange,
  isAbolished,
  resolvePath,
  sumSubtree,
} from './map-region/tree-utils'

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
  descendantCount: number
  cityCount: number
  abolished: boolean
  establishedDate: string | null
  abolishedDate: string | null
  predecessorId: string | null
  successorCount: number
  schemeId?: string | null
  centerLat?: number | null
  centerLng?: number | null
}

function flattenTree(
  roots: AdministrativeDivision[],
  configs: Map<string, AdminDivisionConfig>,
): FlatRow[] {
  const out: FlatRow[] = []
  const walk = (nodes: AdministrativeDivision[], path: string[]) => {
    for (const node of nodes) {
      const cfg = configs.get(node.adminDivisionId)
      out.push({
        id: node.id,
        name: node.name,
        localName: node.localName ?? null,
        divisionLevel: cfg?.divisionLevel ?? path.length + 1,
        divisionLabel: cfg?.divisionLabel ?? '',
        parentPath: path,
        childrenCount: node.children?.length ?? 0,
        descendantCount: countDescendants(node),
        cityCount: node.cityCount ?? 0,
        abolished: isAbolished(node),
        establishedDate: node.establishedDate ?? null,
        abolishedDate: node.abolishedDate ?? null,
        predecessorId: node.predecessorId ?? null,
        successorCount: node.successorCount ?? 0,
        schemeId: node.schemeId ?? null,
        centerLat: node.centerLat ?? null,
        centerLng: node.centerLng ?? null,
      })
      if (node.children?.length) walk(node.children, [...path, node.name])
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
  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdministrativeDivision | null>(null)
  const [customCreateParent, setCustomCreateParent] = useState<{
    id: string
    name: string
    level: number
  } | null>(null)
  const [pendingDelete, setPendingDelete] =
    useState<AdministrativeDivision | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [schemeModalOpen, setSchemeModalOpen] = useState(false)
  const [schemeEditing, setSchemeEditing] =
    useState<AdminDivisionScheme | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [rankMetric, setRankMetric] = useState<TopRankMetric>('descendants')
  const [focusedCity, setFocusedCity] = useState<City | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
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
  } = useAdminDivisionUrlState()

  // 데이터
  const { data: divisions = [], isLoading } = useAdministrativeDivisions(
    owner,
    activeSchemeId,
  )
  const { data: configs = [] } = useAdminDivisionConfigs(owner, activeSchemeId)
  const { data: schemes = [], isSuccess: schemesLoaded } =
    useAdminDivisionSchemes(owner)
  const deleteMut = useDeleteAdministrativeDivision(owner)

  useEffect(() => {
    if (!activeSchemeId || !schemesLoaded) return
    if (!schemes.some((scheme) => scheme.id === activeSchemeId)) {
      setActiveScheme(null)
    }
  }, [activeSchemeId, schemes, schemesLoaded, setActiveScheme])

  // 선택 구역이 바뀌면 연결 도시 임시 포커스 해제
  useEffect(() => {
    setFocusedCity(null)
  }, [selectedId, activeSchemeId])

  const activeScheme =
    schemes.find((scheme) => scheme.id === activeSchemeId) ?? null

  // 모드 결정
  const mode: 'search' | 'level' | 'drill' =
    search.trim() !== '' ? 'search' : levelFilter != null ? 'level' : 'drill'

  const breadcrumb = useMemo(
    () => resolvePath(divisions, pathIds),
    [divisions, pathIds],
  )
  const currentParent =
    breadcrumb.length === 0 ? null : (breadcrumb[breadcrumb.length - 1] ?? null)
  const drillItems: AdministrativeDivision[] =
    breadcrumb.length === 0
      ? divisions
      : (breadcrumb[breadcrumb.length - 1]!.children ?? [])
  const drillLevel = breadcrumb.length + 1

  const configsById = useMemo(() => {
    const map = new Map<string, AdminDivisionConfig>()
    for (const config of configs) map.set(config.id, config)
    return map
  }, [configs])

  const flat = useMemo(
    () => flattenTree(divisions, configsById),
    [divisions, configsById],
  )

  const flatById = useMemo(() => {
    const map = new Map<string, FlatRow>()
    for (const row of flat) map.set(row.id, row)
    return map
  }, [flat])

  const debouncedSearch = useDebouncedValue(search, 250, country.id)
  const [searchLimit, setSearchLimit] = useState(50)
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
    let base: FlatRow[]
    if (mode === 'search') {
      base = (searchQuery.data ?? []).map((hit) => {
        const localFlat = flatById.get(hit.id)
        return {
          id: hit.id,
          name: hit.name,
          localName: hit.localName ?? null,
          divisionLevel: hit.divisionLevel,
          divisionLabel: hit.divisionLabel,
          parentPath: hit.parentPath,
          childrenCount: localFlat?.childrenCount ?? 0,
          descendantCount: localFlat?.descendantCount ?? 0,
          cityCount: localFlat?.cityCount ?? 0,
          abolished: hit.abolished,
          establishedDate: localFlat?.establishedDate ?? null,
          abolishedDate: localFlat?.abolishedDate ?? null,
          predecessorId: localFlat?.predecessorId ?? null,
          successorCount: localFlat?.successorCount ?? 0,
          schemeId: hit.schemeId ?? null,
          centerLat: hit.centerLat ?? null,
          centerLng: hit.centerLng ?? null,
        }
      })
    } else if (mode === 'level') {
      base = flat.filter(
        (row) =>
          row.divisionLevel === levelFilter &&
          (unitLabelFilter == null || row.divisionLabel === unitLabelFilter),
      )
    } else {
      base = drillItems.map<FlatRow>((node) => {
        const cfg = configsById.get(node.adminDivisionId)
        return {
          id: node.id,
          name: node.name,
          localName: node.localName ?? null,
          divisionLevel: cfg?.divisionLevel ?? drillLevel,
          divisionLabel: cfg?.divisionLabel ?? '',
          parentPath: breadcrumb.map((crumb) => crumb.name),
          childrenCount: node.children?.length ?? 0,
          descendantCount: countDescendants(node),
          cityCount: node.cityCount ?? 0,
          abolished: isAbolished(node),
          establishedDate: node.establishedDate ?? null,
          abolishedDate: node.abolishedDate ?? null,
          predecessorId: node.predecessorId ?? null,
          successorCount: node.successorCount ?? 0,
          schemeId: node.schemeId ?? null,
          centerLat: node.centerLat ?? null,
          centerLng: node.centerLng ?? null,
        }
      })
    }

    if (statusFilter === 'active') return base.filter((row) => !row.abolished)
    if (statusFilter === 'abolished') return base.filter((row) => row.abolished)
    return base
  }, [
    mode,
    searchQuery.data,
    flatById,
    flat,
    levelFilter,
    unitLabelFilter,
    drillItems,
    configsById,
    drillLevel,
    breadcrumb,
    statusFilter,
  ])

  const sortedRows = useMemo(() => {
    const list = [...rowsForMode]
    if (sort === 'name') {
      list.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    } else if (sort === 'children') {
      list.sort(
        (left, right) =>
          right.descendantCount - left.descendantCount ||
          right.childrenCount - left.childrenCount ||
          left.name.localeCompare(right.name, 'ko'),
      )
    } else {
      list.sort((left, right) => {
        const leftKey = dateSortKey(left.establishedDate)
        const rightKey = dateSortKey(right.establishedDate)
        if (leftKey == null && rightKey == null)
          return left.name.localeCompare(right.name, 'ko')
        if (leftKey == null) return 1
        if (rightKey == null) return -1
        return leftKey - rightKey || left.name.localeCompare(right.name, 'ko')
      })
    }
    return list
  }, [rowsForMode, sort])

  useEffect(() => {
    if (mode !== 'drill') return
    if (pathIds.length > breadcrumb.length) {
      setPath(breadcrumb.map((item) => item.id))
    }
  }, [mode, pathIds.length, breadcrumb, setPath])

  const selectedDivision = useMemo(
    () => (selectedId ? findInTree(divisions, selectedId) : null),
    [divisions, selectedId],
  )

  useEffect(() => {
    if (isLoading) return
    if (selectedId && !findInTree(divisions, selectedId)) {
      setSelectedId(null)
    }
  }, [isLoading, divisions, selectedId, setSelectedId])

  const isVirtualized = sortedRows.length > 35
  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  useEffect(() => {
    if (!selectedId) return
    if (isVirtualized) {
      const targetIndex = sortedRows.findIndex((row) => row.id === selectedId)
      if (targetIndex >= 0) {
        virtualizer.scrollToIndex(targetIndex, { align: 'auto' })
      }
      return
    }
    const element = document.querySelector(
      `[data-admin-row="${selectedId}"]`,
    ) as HTMLElement | null
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedId, isVirtualized, sortedRows, virtualizer])

  // ===== 인포그래픽 집계 (단위 분포 · 상위 구역 Top 5 · 존속/좌표 매핑) =====
  const levelCounts = useMemo(() => {
    const counts = new Map<
      string,
      { level: number; label: string; count: number }
    >()
    for (const row of flat) {
      const label = row.divisionLabel || `${row.divisionLevel}차`
      const key = `${row.divisionLevel}:${label}`
      const cur = counts.get(key)
      if (cur) cur.count += 1
      else counts.set(key, { level: row.divisionLevel, label, count: 1 })
    }
    return Array.from(counts.values()).sort(
      (left, right) => left.level - right.level || right.count - left.count,
    )
  }, [flat])

  const infographic = useMemo<AdminInfographicData>(() => {
    const tierColors = isDarkMode
      ? [
          '#a5b4fc',
          '#38bdf8',
          '#34d399',
          '#fbbf24',
          '#c084fc',
          '#fb7185',
          '#94a3b8',
        ]
      : [
          '#4f46e5',
          '#0284c7',
          '#059669',
          '#d97706',
          '#7c3aed',
          '#e11d48',
          '#64748b',
        ]

    const maxDepth = flat.reduce(
      (acc, row) => (row.divisionLevel > acc ? row.divisionLevel : acc),
      0,
    )

    const tierSlices: SegmentSlice[] = levelCounts.map((lc, idx) => ({
      key: `${lc.level}:${lc.label}`,
      label: `${lc.level}차 · ${lc.label}`,
      value: lc.count,
      color: tierColors[idx % tierColors.length]!,
      meta: `${lc.count.toLocaleString('ko-KR')}곳`,
    }))

    let pinnedCount = 0
    let abolishedCount = 0
    let lineageCount = 0
    let totalLinkedCities = 0
    for (const row of flat) {
      if (row.centerLat != null && row.centerLng != null) pinnedCount += 1
      if (row.abolished) abolishedCount += 1
      if (row.predecessorId || row.successorCount > 0) lineageCount += 1
      totalLinkedCities += row.cityCount
    }
    const activeCount = flat.length - abolishedCount
    const coordPct =
      flat.length > 0 ? Math.round((pinnedCount / flat.length) * 100) : 0

    const coordDonutSlices: SegmentSlice[] = [
      {
        key: 'pinned',
        label: '좌표 등록',
        value: pinnedCount,
        color: isDarkMode ? '#a5b4fc' : '#4f46e5',
      },
      {
        key: 'unpinned',
        label: '좌표 미등록',
        value: Math.max(0, flat.length - pinnedCount),
        color: isDarkMode ? 'rgba(148, 163, 184, 0.22)' : '#e2e8f0',
      },
    ]

    const statusSlices: SegmentSlice[] = [
      ...(activeCount > 0
        ? [
            {
              key: 'active',
              label: '현존·시행',
              value: activeCount,
              color: isDarkMode ? '#34d399' : '#059669',
              meta: `${activeCount}곳`,
            },
          ]
        : []),
      ...(abolishedCount > 0
        ? [
            {
              key: 'abolished',
              label: '폐지·구편제',
              value: abolishedCount,
              color: isDarkMode ? '#f87171' : '#dc2626',
              meta: `${abolishedCount}곳`,
            },
          ]
        : []),
    ]

    const targetNodes = drillItems.length > 0 ? drillItems : divisions
    const rankCandidates = targetNodes.map((node) => {
      const desc = countDescendants(node)
      const cities = sumSubtree(node, (item) => item.cityCount ?? 0)
      const cfg = configsById.get(node.adminDivisionId)
      return {
        id: node.id,
        name: node.name,
        unitLabel: cfg?.divisionLabel ?? '',
        descendants: desc,
        cities,
        hasCoords: node.centerLat != null && node.centerLng != null,
        period:
          node.establishedDate || node.abolishedDate
            ? formatYearRange(node.establishedDate, node.abolishedDate)
            : null,
      }
    })

    const hasCitiesMetric = totalLinkedCities > 0
    const effectiveMetric: TopRankMetric =
      rankMetric === 'cities' && hasCitiesMetric ? 'cities' : 'descendants'

    const sortedCandidates = [...rankCandidates].sort((left, right) => {
      const leftVal =
        effectiveMetric === 'cities' ? left.cities : left.descendants
      const rightVal =
        effectiveMetric === 'cities' ? right.cities : right.descendants
      if (rightVal !== leftVal) return rightVal - leftVal
      return left.name.localeCompare(right.name, 'ko')
    })

    const topFive = sortedCandidates.slice(0, 5)
    const maxMetricVal =
      topFive.length > 0
        ? effectiveMetric === 'cities'
          ? topFive[0]!.cities
          : topFive[0]!.descendants
        : 0

    return {
      maxDepth,
      tierSlices,
      pinnedCount,
      activeCount,
      abolishedCount,
      lineageCount,
      coordPct,
      coordDonutSlices,
      statusSlices,
      hasCitiesMetric,
      effectiveMetric,
      topFive,
      maxMetricVal,
    }
  }, [
    flat,
    levelCounts,
    isDarkMode,
    drillItems,
    divisions,
    configsById,
    rankMetric,
  ])

  /**
   * 구역 자체 좌표가 있을 때만 상위 지도 위치를 갱신하고,
   * 좌표가 없거나 선택 해제 시에는 상위 mapLocation을 비워 MapCard의 명칭 검색 폴백이 정상 작동하도록 한다.
   */
  const reportLocation = useCallback(
    (division: AdministrativeDivision | null) => {
      if (division?.centerLat != null && division?.centerLng != null) {
        onCityClick({
          id: division.id,
          name: division.name,
          population: '',
          latitude: Number(division.centerLat),
          longitude: Number(division.centerLng),
        })
        return
      }
      onCityClick({
        id: '',
        name: '',
        population: '',
        latitude: 0,
        longitude: 0,
      })
    },
    [onCityClick],
  )

  const handleSelectLinkedCity = useCallback(
    (city: City) => {
      setFocusedCity(city)
      if (city.latitude != null && city.longitude != null) {
        onCityClick({
          id: city.id,
          name: city.name,
          population: city.population != null ? String(city.population) : '',
          latitude: Number(city.latitude),
          longitude: Number(city.longitude),
        })
      } else {
        onCityClick({
          id: '',
          name: '',
          population: '',
          latitude: 0,
          longitude: 0,
        })
      }
    },
    [onCityClick],
  )

  const handleItemClick = useCallback(
    (row: FlatRow) => {
      const node = findInTree(divisions, row.id)
      const drilling = mode === 'drill' && (node?.children ?? []).length > 0
      updateParams([
        { key: 'division_id', value: row.id },
        ...(drilling
          ? [{ key: 'division_path', value: [...pathIds, row.id].join(',') }]
          : []),
      ])
      reportLocation(node)
    },
    [divisions, mode, pathIds, updateParams, reportLocation],
  )

  /** 키보드 ↑↓ 탐색은 하위 드릴다운 없이 형제 목록 내에서 선택만 이동한다 */
  const handleKeyboardSelect = useCallback(
    (row: FlatRow) => {
      const node = findInTree(divisions, row.id)
      setSelectedId(row.id)
      reportLocation(node)
    },
    [divisions, setSelectedId, reportLocation],
  )

  /** 특정 노드(전신·후계·하위 구역·Top5 막대)로 즉시 포커스 & 부모 경로 동기화 */
  const drillToNode = useCallback(
    (id: string) => {
      const target = findInTree(divisions, id)
      if (!target) return
      const parentChainIds: string[] = []
      let cursor: AdministrativeDivision | null = target.parentId
        ? findInTree(divisions, target.parentId)
        : null
      while (cursor) {
        parentChainIds.unshift(cursor.id)
        cursor = cursor.parentId ? findInTree(divisions, cursor.parentId) : null
      }
      const nextPath =
        (target.children?.length ?? 0) > 0
          ? [...parentChainIds, target.id]
          : parentChainIds
      updateParams([
        { key: 'division_q', value: null },
        { key: 'division_level', value: null },
        { key: 'division_path', value: nextPath.join(',') },
        { key: 'division_id', value: id },
      ])
      reportLocation(target)
    },
    [divisions, updateParams, reportLocation],
  )

  const handleBreadcrumbClick = (index: number) => {
    const nextPathIds = index < 0 ? [] : pathIds.slice(0, index + 1)
    const targetNode =
      index >= 0 && nextPathIds.length > 0
        ? findInTree(divisions, nextPathIds[nextPathIds.length - 1]!)
        : null
    updateParams([
      {
        key: 'division_path',
        value: nextPathIds.join(','),
      },
      { key: 'division_id', value: targetNode?.id ?? null },
    ])
    reportLocation(targetNode)
  }

  const hasOpenModal =
    formOpen ||
    schemeModalOpen ||
    configModalOpen ||
    bulkOpen ||
    !!pendingDelete ||
    compareOpen

  useListKeyboard({
    items: sortedRows,
    selectedId,
    enabled: !hasOpenModal,
    onSelect: (id) => {
      if (id === null) {
        setSelectedId(null)
        reportLocation(null)
        return
      }
      const row = sortedRows.find((item) => item.id === id)
      if (!row) return
      handleKeyboardSelect(row)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setCustomCreateParent(null)
    setFormOpen(true)
  }
  const openAddChildFor = (parentDiv: AdministrativeDivision) => {
    const parentCfg = configsById.get(parentDiv.adminDivisionId)
    const parentLvl = parentCfg?.divisionLevel ?? drillLevel
    setEditing(null)
    setCustomCreateParent({
      id: parentDiv.id,
      name: parentDiv.name,
      level: parentLvl + 1,
    })
    setFormOpen(true)
  }
  const openEdit = (item: AdministrativeDivision) => {
    setCustomCreateParent(null)
    setEditing(item)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setCustomCreateParent(null)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMut.mutateAsync(pendingDelete.id)
      notify.success('행정구역을 삭제했습니다')
      const updates: Array<{ key: string; value: string | null }> = []
      const idx = pathIds.indexOf(pendingDelete.id)
      if (idx >= 0) {
        updates.push({
          key: 'division_path',
          value: pathIds.slice(0, idx).join(','),
        })
      }
      if (selectedId === pendingDelete.id) {
        updates.push({ key: 'division_id', value: null })
        reportLocation(null)
      }
      if (updates.length) updateParams(updates)
      setPendingDelete(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const mapLocation = useMemo(() => {
    if (focusedCity) {
      if (focusedCity.latitude != null && focusedCity.longitude != null) {
        return {
          latitude: Number(focusedCity.latitude),
          longitude: Number(focusedCity.longitude),
          name: focusedCity.name,
        }
      }
      return null
    }
    if (selectedDivision) {
      if (
        selectedDivision.centerLat != null &&
        selectedDivision.centerLng != null
      ) {
        return {
          latitude: Number(selectedDivision.centerLat),
          longitude: Number(selectedDivision.centerLng),
          name: selectedDivision.name,
        }
      }
      // 선택된 구역에 좌표가 없으면 externalMapLocation(이전/국가 좌표)로 폴백하지 않고
      // null을 반환해 MapCard가 구글 지도 명칭 검색으로 자동 전환하도록 한다.
      return null
    }
    return externalMapLocation ?? null
  }, [focusedCity, selectedDivision, externalMapLocation])

  const mapMarkers = useMemo(
    () =>
      sortedRows
        .filter((row) => row.centerLat != null && row.centerLng != null)
        .map((row) => ({
          id: row.id,
          latitude: Number(row.centerLat),
          longitude: Number(row.centerLng),
          name: row.name,
        })),
    [sortedRows],
  )

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

  useEffect(() => {
    if (mode !== 'drill' || isLoading) return
    if (
      selectedDivision &&
      selectedParentChain.length > 0 &&
      pathIds.length === 0
    ) {
      setPath(selectedParentChain.map((item) => item.id))
    }
  }, [
    mode,
    isLoading,
    selectedDivision,
    selectedParentChain,
    pathIds.length,
    setPath,
  ])

  const selectedDivisionQuery = useMemo(() => {
    if (focusedCity) {
      return [selectedDivision?.name, focusedCity.name]
        .filter(Boolean)
        .join(' ')
    }
    if (!selectedDivision) return null
    return [
      ...selectedParentChain.map((item) => item.name),
      selectedDivision.name,
    ].join(' ')
  }, [focusedCity, selectedDivision, selectedParentChain])

  const selectedDivisionDisplayName = useMemo(() => {
    if (focusedCity) {
      return selectedDivision
        ? `${selectedDivision.name} › ${focusedCity.name}`
        : focusedCity.name
    }
    if (!selectedDivision) return null
    return [
      ...selectedParentChain.map((item) => item.name),
      selectedDivision.name,
    ].join(' › ')
  }, [focusedCity, selectedDivision, selectedParentChain])

  const activeLevelFilterKey =
    levelFilter == null ? null : `${levelFilter}:${unitLabelFilter ?? ''}`

  // 컨텍스트 행 (검색 / 단위 필터 / 드릴 브레드크럼)
  const contextBar = (() => {
    if (mode === 'search') {
      return (
        <ContextRow
          palette={palette}
          left={
            <span
              style={{ fontSize: 12, fontWeight: 700, color: palette.primary }}
            >
              "{search}" 전체 검색
            </span>
          }
          right={
            <>
              <CountBadge palette={palette}>{sortedRows.length}곳</CountBadge>
              <ClearLink palette={palette} onClick={() => setSearch('')}>
                해제
              </ClearLink>
            </>
          }
        />
      )
    }
    if (mode === 'level') {
      return (
        <ContextRow
          palette={palette}
          left={
            <span
              style={{ fontSize: 12, fontWeight: 700, color: palette.primary }}
            >
              {levelFilter}차{unitLabelFilter ? ` · ${unitLabelFilter}` : ''}{' '}
              전체
            </span>
          }
          right={
            <>
              <CountBadge palette={palette}>{sortedRows.length}곳</CountBadge>
              <ClearLink palette={palette} onClick={() => setUnitFilter(null)}>
                해제
              </ClearLink>
            </>
          }
        />
      )
    }

    const compactBreadcrumb =
      breadcrumb.length > 3
        ? [
            { node: breadcrumb[0]!, idx: 0 },
            { node: null, idx: -2 } as const,
            {
              node: breadcrumb[breadcrumb.length - 2]!,
              idx: breadcrumb.length - 2,
            },
            {
              node: breadcrumb[breadcrumb.length - 1]!,
              idx: breadcrumb.length - 1,
            },
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
              gap: 4,
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
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
                      .map((item) => item.name)
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
          <>
            {currentParent && selectedId !== currentParent.id && (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(currentParent.id)
                  reportLocation(currentParent)
                }}
                title={`${currentParent.name} 자체 정보 보기`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${palette.border}`,
                  background: 'transparent',
                  color: palette.textSecondary,
                  cursor: 'pointer',
                }}
              >
                <FiInfo size={11} />
                <span>상위</span>
              </button>
            )}
            <CountBadge palette={palette}>
              {drillLevel}차 · {sortedRows.length}곳
            </CountBadge>
          </>
        }
      />
    )
  })()

  const showStatusToolbar =
    infographic.abolishedCount > 0 || statusFilter !== 'all'

  const toolbar = (
    <>
      <div
        style={{
          padding: '10px 12px 8px',
          background: palette.bg,
          flexShrink: 0,
        }}
      >
        <SearchInput
          palette={palette}
          value={search}
          onChange={setSearch}
          placeholder="이름 · 현지어 검색"
        />
      </div>
      <div
        style={{
          padding: '0 12px 10px',
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
          options={ADMIN_SORT_OPTIONS}
          onChange={setSort}
        />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          style={{
            height: 30,
            padding: '0 9px',
            fontSize: 11.5,
            fontWeight: 600,
            border: `1px solid ${palette.border}`,
            background: palette.bg,
            color: palette.text,
            borderRadius: 6,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          일괄 등록
        </button>
        <RegisterButton palette={palette} onClick={openCreate} />
      </div>
      {showStatusToolbar && (
        <PillToolbar palette={palette}>
          <FilterPill
            palette={palette}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            전체 ({flat.length})
          </FilterPill>
          <FilterPill
            palette={palette}
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
          >
            현존 ({infographic.activeCount})
          </FilterPill>
          <FilterPill
            palette={palette}
            active={statusFilter === 'abolished'}
            onClick={() => setStatusFilter('abolished')}
          >
            폐지 ({infographic.abolishedCount})
          </FilterPill>
        </PillToolbar>
      )}
      {contextBar}
    </>
  )

  const distinctUnitInView = useMemo(() => {
    const unitSet = new Set<string>()
    for (const row of sortedRows) {
      if (row.divisionLabel) unitSet.add(row.divisionLabel)
    }
    return unitSet.size
  }, [sortedRows])

  const showTypeBadge = mode !== 'drill' || distinctUnitInView > 1

  const schemeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const scheme of schemes) map.set(scheme.id, scheme.name)
    return map
  }, [schemes])

  const renderRow = (row: FlatRow) => {
    const node = findInTree(divisions, row.id)
    const subtitleParts: string[] = []
    if (row.localName) subtitleParts.push(row.localName)
    if (row.establishedDate || row.abolishedDate) {
      subtitleParts.push(
        formatYearRange(row.establishedDate, row.abolishedDate),
      )
    }
    if (mode !== 'drill' && row.parentPath.length > 0) {
      subtitleParts.push(row.parentPath.join(' › '))
    }
    if (!activeSchemeId && row.schemeId) {
      const schemeName = schemeNameById.get(row.schemeId)
      if (schemeName) subtitleParts.push(schemeName)
    }
    const subtitle = subtitleParts.join(' · ') || undefined

    return (
      <div data-admin-row={row.id} style={{ position: 'relative' }}>
        <RegionListItem
          palette={palette}
          selected={selectedId === row.id}
          onSelect={() => handleItemClick(row)}
          title={row.name}
          subtitle={subtitle}
          abolished={row.abolished}
          hasCoords={row.centerLat != null && row.centerLng != null}
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
            <span
              style={{
                display: 'inline-flex',
                gap: 5,
                alignItems: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.abolished && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isDarkMode ? '#f87171' : '#dc2626',
                    background: isDarkMode
                      ? 'rgba(248, 113, 113, 0.14)'
                      : 'rgba(220, 38, 38, 0.08)',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  폐지
                </span>
              )}
              {row.childrenCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: palette.textSecondary,
                    background: palette.bgSecondary,
                    border: `1px solid ${palette.border}`,
                    padding: '1px 7px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                  title={
                    row.descendantCount > row.childrenCount
                      ? `직할 ${row.childrenCount}곳 · 전체 하위 ${row.descendantCount}곳`
                      : `직할 하위 ${row.childrenCount}곳`
                  }
                >
                  {row.childrenCount}
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
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  background: 'transparent',
                  color: palette.textSecondary,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                또는 일괄 등록 (팔도·47개 도도부현·50개 주 한 번에)
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
          : statusFilter !== 'all'
            ? '선택한 존속 상태에 해당하는 구역이 없습니다'
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
              onClick={() => setSearchLimit((prev) => Math.min(200, prev + 50))}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
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
          onClick={() => setSearchLimit((prev) => Math.min(200, prev + 50))}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px',
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

  // 등록 모달 컨텍스트
  const formDefaultLevel = editing
    ? 1
    : customCreateParent
      ? customCreateParent.level
      : mode === 'drill'
        ? drillLevel
        : 1
  const formDefaultParent = editing
    ? null
    : customCreateParent
      ? { id: customCreateParent.id, name: customCreateParent.name }
      : mode === 'drill' && currentParent
        ? { id: currentParent.id, name: currentParent.name }
        : null

  const detailUnitLabel = selectedDivision
    ? (configsById.get(selectedDivision.adminDivisionId)?.divisionLabel ?? null)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!isLoading && flat.length > 0 && (
        <AdminBentoInfographic
          totalCount={flat.length}
          scopeCount={drillItems.length || divisions.length}
          schemeCount={schemes.length}
          currentParentName={currentParent?.name ?? null}
          isDarkMode={isDarkMode}
          infographic={infographic}
          activeLevelFilterKey={activeLevelFilterKey}
          statusFilter={statusFilter}
          selectedId={selectedId}
          onChangeUnitFilter={setUnitFilter}
          onChangeStatusFilter={setStatusFilter}
          onChangeRankMetric={setRankMetric}
          onSelectRankNode={drillToNode}
        />
      )}

      <AdminSchemeBar
        palette={palette}
        schemes={schemes}
        activeSchemeId={activeSchemeId}
        onSelectScheme={setActiveScheme}
        onCreateScheme={() => {
          setSchemeEditing(null)
          setSchemeModalOpen(true)
        }}
        onEditScheme={(scheme) => {
          setSchemeEditing(scheme)
          setSchemeModalOpen(true)
        }}
        onOpenConfigModal={() => setConfigModalOpen(true)}
        onOpenCompare={() => setCompareOpen(true)}
      />

      <RegionSplitLayout
        ariaLabel="행정구역"
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
          <>
            <MapCard
              palette={palette}
              country={country}
              mapLocation={mapLocation}
              markers={mapMarkers}
              selectedMarkerId={focusedCity ? null : selectedId}
              selectedDivisionQuery={selectedDivisionQuery}
              selectedDivisionName={selectedDivisionDisplayName}
              onMarkerClick={(id) => {
                setFocusedCity(null)
                const row = sortedRows.find((item) => item.id === id)
                if (row) handleItemClick(row)
                else drillToNode(id)
              }}
            />

            <RegionDetailPanel
              palette={palette}
              isSelected={!!selectedDivision}
              empty={
                sortedRows.length > 0 ? (
                  <AdminUnselectedOverview
                    palette={palette}
                    title={
                      currentParent
                        ? `${currentParent.name} 하위 구역 총람`
                        : `${country.name} 행정구역 총람`
                    }
                    rows={sortedRows}
                    onSelectRow={handleItemClick}
                  />
                ) : undefined
              }
              emptyTitle={
                divisions.length === 0
                  ? '등록된 행정구역이 없습니다'
                  : '좌측 목록에서 지역을 선택하세요'
              }
              emptyDescription={
                divisions.length === 0
                  ? '상단 등록 또는 일괄 등록 버튼으로 국가의 광역·기초 행정구역 편제를 구성해 보세요'
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
                    onAddChild={() => openAddChildFor(selectedDivision)}
                    onOpenEditModal={() => openEdit(selectedDivision)}
                  />
                ) : null
              }
            >
              {selectedParentChain.length > 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: palette.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 700, marginRight: 2 }}>
                    소속 경로:
                  </span>
                  <BreadcrumbBtn
                    palette={palette}
                    active={false}
                    onClick={() => {
                      updateParams([
                        { key: 'division_q', value: null },
                        { key: 'division_level', value: null },
                        { key: 'division_path', value: null },
                        { key: 'division_id', value: null },
                      ])
                      reportLocation(null)
                    }}
                  >
                    {country.name}
                  </BreadcrumbBtn>
                  {selectedParentChain.map((parent) => (
                    <span
                      key={parent.id}
                      style={{
                        display: 'inline-flex',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: palette.textSecondary }}>›</span>
                      <BreadcrumbBtn
                        palette={palette}
                        active={false}
                        onClick={() => drillToNode(parent.id)}
                      >
                        {parent.name}
                      </BreadcrumbBtn>
                    </span>
                  ))}
                </div>
              )}
              {selectedDivision && (
                <DivisionDetailFields
                  key={selectedDivision.id}
                  palette={palette}
                  owner={owner}
                  division={selectedDivision}
                  divisions={divisions}
                  configsById={configsById}
                  onSelectDivision={drillToNode}
                  onSelectCity={handleSelectLinkedCity}
                  focusedCityId={focusedCity?.id ?? null}
                  fallbackCoords={{
                    latitude: country.latitude,
                    longitude: country.longitude,
                  }}
                />
              )}
            </RegionDetailPanel>
          </>
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

      <AdminDivisionConfigModal
        isOpen={configModalOpen}
        owner={owner}
        schemeId={activeSchemeId}
        schemeName={activeScheme?.name ?? null}
        onClose={() => setConfigModalOpen(false)}
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
          const cities = sumSubtree(
            pendingDelete,
            (item) => item.cityCount ?? 0,
          )
          const successors = sumSubtree(
            pendingDelete,
            (item) => item.successorCount ?? 0,
          )
          const parts: string[] = []
          parts.push(
            desc === 0
              ? `"${pendingDelete.name}"을(를) 삭제합니다.`
              : `"${pendingDelete.name}"과 하위 ${desc}개 구역(총 ${desc + 1}개)이 함께 삭제됩니다.`,
          )
          if (cities > 0) {
            parts.push(`연결된 도시 ${cities}개의 행정구역 연결이 해제됩니다.`)
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
    </div>
  )
}

interface BreadcrumbBtnProps {
  palette: ReturnType<typeof useRegionPalette>
  active: boolean
  onClick: () => void
  children: ReactNode
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
        padding: '2px 5px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        color: active ? palette.text : palette.textSecondary,
        cursor: active ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.background = palette.bgSecondary
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

interface ContextRowProps {
  palette: ReturnType<typeof useRegionPalette>
  left: ReactNode
  right: ReactNode
}

function ContextRow({ palette, left, right }: ContextRowProps) {
  return (
    <div
      style={{
        padding: '7px 12px',
        borderBottom: `1px solid ${palette.border}`,
        background: palette.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div
        style={{
          display: 'inline-flex',
          gap: 5,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
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
  children: ReactNode
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: palette.primary,
        background: palette.badgeBg,
        padding: '2px 7px',
        borderRadius: 4,
        fontVariantNumeric: 'tabular-nums',
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
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: palette.textSecondary,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  )
}
