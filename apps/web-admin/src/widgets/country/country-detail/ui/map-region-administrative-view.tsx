/**
 * 지도 및 지역 — 행정구역 전용 뷰 (현대 국가 & 역사 국가 공용).
 *
 * 구성:
 *  1) 3열 Event-Ledger 벤토 인포그래픽 (계층·단위 분포 / 광역 구역 편제 Top 5 / 존속·좌표 매핑률)
 *  2) 시기별 행정구역 편제 체계 바 (전체 · 각 시대 체계 · 단위 관리 · 체계 비교)
 *  3) 좌우 병렬 아틀라스 데스크: 좌측 계층·검색 원장 목록 + 우측(인터랙티브 지도 + 상세/총람 패널)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import {
  FiEdit2,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiRepeat,
  FiSettings,
} from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

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
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid3Col,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerHairline,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { dateSortKey } from '@/shared/lib/iso-date'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  AdminDivisionConfigModal,
  AdminDivisionFormModal,
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

type AdminSort = 'name' | 'children' | 'established'
type StatusFilter = 'all' | 'active' | 'abolished'
type TopRankMetric = 'descendants' | 'cities'

const SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'children' as const, label: '하위 구역 많은 순' },
  { value: 'established' as const, label: '설립 연도순' },
]
const SORT_VALUES = ['name', 'children', 'established'] as const

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
        descendantCount: countDescendants(n),
        cityCount: n.cityCount ?? 0,
        abolished: isAbolished(n),
        establishedDate: n.establishedDate ?? null,
        abolishedDate: n.abolishedDate ?? null,
        predecessorId: n.predecessorId ?? null,
        successorCount: n.successorCount ?? 0,
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

// ─── Bento Infographic Styled Helpers ─────────────────────────────────────────

const BentoLegendWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
`

const BentoLegendChip = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  margin: -1px -4px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const LegendDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const MetricSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const MetricSwitchBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  border: none;
  border-radius: 3px;
  padding: 2px 7px;
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const RankRowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RankRowBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: grid;
  grid-template-columns: 20px minmax(84px, 128px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 3px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const RankIndex = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RankName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RankTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const RankFill = styled.div`
  height: 100%;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

const RankMeta = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const CoverageSplit = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const CoverageRight = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CoverageSubFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

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
  const scrollRef = useRef<HTMLDivElement>(null)

  // URL 동기화
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('division_q') ?? ''
  const sort = ((): AdminSort => {
    const raw = searchParams.get('division_sort')
    return raw && (SORT_VALUES as readonly string[]).includes(raw)
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
    if (!Number.isFinite(parsedLevel) || parsedLevel <= 0)
      return { levelFilter: null, unitLabelFilter: null }
    return { levelFilter: parsedLevel, unitLabelFilter: label || null }
  })()

  const activeSchemeId = searchParams.get('division_scheme')

  // 데이터
  const { data: divisions = [], isLoading } = useAdministrativeDivisions(
    owner,
    activeSchemeId,
  )
  const { data: configs = [] } = useAdminDivisionConfigs(owner, activeSchemeId)
  const { data: schemes = [], isSuccess: schemesLoaded } =
    useAdminDivisionSchemes(owner)
  const deleteMut = useDeleteAdministrativeDivision(owner)

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
    (v: string) => updateParam('division_q', v),
    [updateParam],
  )
  const setSort = useCallback(
    (v: AdminSort) => updateParam('division_sort', v, 'name'),
    [updateParam],
  )
  const setPath = useCallback(
    (ids: string[]) => updateParam('division_path', ids.join(',')),
    [updateParam],
  )
  const setSelectedId = useCallback(
    (v: string | null) => updateParam('division_id', v),
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

  useEffect(() => {
    if (!activeSchemeId || !schemesLoaded) return
    if (!schemes.some((s) => s.id === activeSchemeId)) {
      setActiveScheme(null)
    }
  }, [activeSchemeId, schemes, schemesLoaded, setActiveScheme])

  const activeScheme = schemes.find((s) => s.id === activeSchemeId) ?? null

  // 모드 결정
  const mode: 'search' | 'level' | 'drill' =
    search.trim() !== ''
      ? 'search'
      : levelFilter != null
        ? 'level'
        : 'drill'

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

  const configsById = useMemo(() => {
    const m = new Map<string, AdminDivisionConfig>()
    for (const c of configs) m.set(c.id, c)
    return m
  }, [configs])

  const flat = useMemo(
    () => flattenTree(divisions, configsById),
    [divisions, configsById],
  )

  const flatById = useMemo(() => {
    const m = new Map<string, FlatRow>()
    for (const r of flat) m.set(r.id, r)
    return m
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
      base = (searchQuery.data ?? []).map((h) => {
        const localFlat = flatById.get(h.id)
        return {
          id: h.id,
          name: h.name,
          localName: h.localName ?? null,
          divisionLevel: h.divisionLevel,
          divisionLabel: h.divisionLabel,
          parentPath: h.parentPath,
          childrenCount: localFlat?.childrenCount ?? 0,
          descendantCount: localFlat?.descendantCount ?? 0,
          cityCount: localFlat?.cityCount ?? 0,
          abolished: h.abolished,
          establishedDate: localFlat?.establishedDate ?? null,
          abolishedDate: localFlat?.abolishedDate ?? null,
          predecessorId: localFlat?.predecessorId ?? null,
          successorCount: localFlat?.successorCount ?? 0,
          schemeId: h.schemeId ?? null,
          centerLat: h.centerLat ?? null,
          centerLng: h.centerLng ?? null,
        }
      })
    } else if (mode === 'level') {
      base = flat.filter(
        (r) =>
          r.divisionLevel === levelFilter &&
          (unitLabelFilter == null || r.divisionLabel === unitLabelFilter),
      )
    } else {
      base = drillItems.map<FlatRow>((n) => {
        const cfg = configsById.get(n.adminDivisionId)
        return {
          id: n.id,
          name: n.name,
          localName: n.localName ?? null,
          divisionLevel: cfg?.divisionLevel ?? drillLevel,
          divisionLabel: cfg?.divisionLabel ?? '',
          parentPath: breadcrumb.map((b) => b.name),
          childrenCount: n.children?.length ?? 0,
          descendantCount: countDescendants(n),
          cityCount: n.cityCount ?? 0,
          abolished: isAbolished(n),
          establishedDate: n.establishedDate ?? null,
          abolishedDate: n.abolishedDate ?? null,
          predecessorId: n.predecessorId ?? null,
          successorCount: n.successorCount ?? 0,
          schemeId: n.schemeId ?? null,
          centerLat: n.centerLat ?? null,
          centerLng: n.centerLng ?? null,
        }
      })
    }

    if (statusFilter === 'active') return base.filter((r) => !r.abolished)
    if (statusFilter === 'abolished') return base.filter((r) => r.abolished)
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
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else if (sort === 'children') {
      list.sort(
        (a, b) =>
          b.descendantCount - a.descendantCount ||
          b.childrenCount - a.childrenCount ||
          a.name.localeCompare(b.name, 'ko'),
      )
    } else {
      list.sort((a, b) => {
        const ka = dateSortKey(a.establishedDate)
        const kb = dateSortKey(b.establishedDate)
        if (ka == null && kb == null) return a.name.localeCompare(b.name, 'ko')
        if (ka == null) return 1
        if (kb == null) return -1
        return ka - kb || a.name.localeCompare(b.name, 'ko')
      })
    }
    return list
  }, [rowsForMode, sort])

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
    if (isLoading) return
    if (selectedId && !findInTree(divisions, selectedId)) {
      setSelectedId(null)
    }
  }, [isLoading, divisions, selectedId, setSelectedId])

  useEffect(() => {
    if (!selectedId) return
    const el = document.querySelector(
      `[data-admin-row="${selectedId}"]`,
    ) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedId])

  // ===== 인포그래픽 집계 (단위 분포 · 상위 구역 Top 5 · 존속/좌표 매핑) =====
  const levelCounts = useMemo(() => {
    const counts = new Map<
      string,
      { level: number; label: string; count: number }
    >()
    for (const r of flat) {
      const label = r.divisionLabel || `${r.divisionLevel}차`
      const key = `${r.divisionLevel}:${label}`
      const cur = counts.get(key)
      if (cur) cur.count += 1
      else counts.set(key, { level: r.divisionLevel, label, count: 1 })
    }
    return Array.from(counts.values()).sort(
      (a, b) => a.level - b.level || b.count - a.count,
    )
  }, [flat])

  const infographic = useMemo(() => {
    const tierColors = isDarkMode
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#fb7185', '#94a3b8']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48', '#64748b']

    const maxDepth = flat.reduce(
      (mx, r) => (r.divisionLevel > mx ? r.divisionLevel : mx),
      0,
    )

    const tierSlices: SegmentSlice[] = levelCounts.map((lc, idx) => ({
      key: `${lc.level}:${lc.label}`,
      label: `${lc.level}차 · ${lc.label}`,
      value: lc.count,
      color: tierColors[idx % tierColors.length]!,
      meta: `${lc.count.toLocaleString('ko-KR')}곳`,
    }))

    // 좌표·존속·계보 현황
    let pinnedCount = 0
    let abolishedCount = 0
    let lineageCount = 0
    let totalLinkedCities = 0
    for (const r of flat) {
      if (r.centerLat != null && r.centerLng != null) pinnedCount += 1
      if (r.abolished) abolishedCount += 1
      if (r.predecessorId || r.successorCount > 0) lineageCount += 1
      totalLinkedCities += r.cityCount
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

    // 광역 구역 편제 Top 5 (드릴 시 현재 부모의 자식, 루트 시 1차 구역)
    const targetNodes = drillItems.length > 0 ? drillItems : divisions
    const rankCandidates = targetNodes.map((node) => {
      const desc = countDescendants(node)
      const cities = sumSubtree(node, (n) => n.cityCount ?? 0)
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

    const sortedCandidates = [...rankCandidates].sort((a, b) => {
      const va = effectiveMetric === 'cities' ? a.cities : a.descendants
      const vb = effectiveMetric === 'cities' ? b.cities : b.descendants
      if (vb !== va) return vb - va
      return a.name.localeCompare(b.name, 'ko')
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

  const reportLocation = useCallback(
    (division: AdministrativeDivision | null) => {
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
    },
    [onCityClick, country.latitude, country.longitude],
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
      // 자식이 있는 노드면 그 노드의 하위 목록도 함께 볼 수 있게 path에 포함
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
      if (idx >= 0)
        updates.push({
          key: 'division_path',
          value: pathIds.slice(0, idx).join(','),
        })
      if (selectedId === pendingDelete.id)
        updates.push({ key: 'division_id', value: null })
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
      setPath(selectedParentChain.map((p) => p.id))
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
    if (!selectedDivision) return null
    return [
      ...selectedParentChain.map((p) => p.name),
      selectedDivision.name,
    ].join(' ')
  }, [selectedDivision, selectedParentChain])

  const selectedDivisionDisplayName = useMemo(() => {
    if (!selectedDivision) return null
    return [
      ...selectedParentChain.map((p) => p.name),
      selectedDivision.name,
    ].join(' › ')
  }, [selectedDivision, selectedParentChain])

  // ===== 1) 3열 벤토 인포그래픽 요약 =====
  const activeLevelFilterKey =
    levelFilter == null ? null : `${levelFilter}:${unitLabelFilter ?? ''}`

  const bentoInfographic =
    !isLoading && flat.length > 0 ? (
      <BentoGrid3Col aria-label="행정구역 인포그래픽 요약">
        {/* Card 1: 계층·단위 편제 분포 */}
        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>계층 · 단위 편제 구성</BentoCardTitle>
              <BentoCardBadge>
                총 {flat.length.toLocaleString('ko-KR')}곳 · 최대{' '}
                {infographic.maxDepth}차
              </BentoCardBadge>
            </BentoCardTitleGroup>
            {activeLevelFilterKey && (
              <BentoLegendChip
                type="button"
                $active
                onClick={() => setUnitFilter(null)}
              >
                필터 해제 ×
              </BentoLegendChip>
            )}
          </BentoCardHeader>
          <BentoCardBody>
            <StackedSegmentBar
              slices={infographic.tierSlices}
              height={10}
              showPercent
            />
            <BentoLegendWrap>
              {infographic.tierSlices.map((slice) => {
                const isActive = activeLevelFilterKey === slice.key
                return (
                  <BentoLegendChip
                    key={slice.key}
                    type="button"
                    $active={isActive}
                    title={`${slice.label} 단위만 필터링`}
                    onClick={() =>
                      setUnitFilter(isActive ? null : slice.key)
                    }
                  >
                    <LegendDot $color={slice.color} />
                    <span>{slice.label}</span>
                    <strong>{slice.value.toLocaleString('ko-KR')}</strong>
                  </BentoLegendChip>
                )
              })}
            </BentoLegendWrap>
          </BentoCardBody>
        </BentoCard>

        {/* Card 2: 주요 광역 구역 편제 규모 Top 5 */}
        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>
                {currentParent
                  ? `${currentParent.name} 하위 편제 Top 5`
                  : '광역 행정구역 편제 Top 5'}
              </BentoCardTitle>
              <BentoCardBadge>
                {(drillItems.length || divisions.length).toLocaleString('ko-KR')}곳
              </BentoCardBadge>
            </BentoCardTitleGroup>
            {infographic.hasCitiesMetric && (
              <MetricSwitchGroup role="tablist" aria-label="순위 기준">
                <MetricSwitchBtn
                  type="button"
                  $active={infographic.effectiveMetric === 'descendants'}
                  onClick={() => setRankMetric('descendants')}
                >
                  하위구역
                </MetricSwitchBtn>
                <MetricSwitchBtn
                  type="button"
                  $active={infographic.effectiveMetric === 'cities'}
                  onClick={() => setRankMetric('cities')}
                >
                  소속도시
                </MetricSwitchBtn>
              </MetricSwitchGroup>
            )}
          </BentoCardHeader>
          <BentoCardBody>
            <RankRowList>
              {infographic.topFive.map((item, idx) => {
                const val =
                  infographic.effectiveMetric === 'cities'
                    ? item.cities
                    : item.descendants
                const hasNumericScale = infographic.maxMetricVal > 0
                const pct = hasNumericScale
                  ? Math.max(8, (val / infographic.maxMetricVal) * 100)
                  : item.hasCoords
                    ? 100
                    : 32
                const isSelected = selectedId === item.id
                return (
                  <RankRowBtn
                    key={item.id}
                    type="button"
                    $active={isSelected}
                    onClick={() => drillToNode(item.id)}
                    title={`${item.name} 상세 및 하위 구역 포커스`}
                  >
                    <RankIndex>#{idx + 1}</RankIndex>
                    <RankName title={item.name}>{item.name}</RankName>
                    <RankTrack>
                      <RankFill
                        style={{
                          width: `${pct}%`,
                          opacity: hasNumericScale ? 1 : 0.45,
                        }}
                      />
                    </RankTrack>
                    <RankMeta>
                      {hasNumericScale
                        ? infographic.effectiveMetric === 'cities'
                          ? `도시 ${val}곳`
                          : `하위 ${val}곳`
                        : item.period ?? (item.unitLabel || (item.hasCoords ? '좌표됨' : '1차'))}
                    </RankMeta>
                  </RankRowBtn>
                )
              })}
            </RankRowList>
          </BentoCardBody>
        </BentoCard>

        {/* Card 3: 존속 현황 · 좌표 매핑률 */}
        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>존속 현황 · 좌표 매핑</BentoCardTitle>
              <BentoCardBadge>
                좌표 {infographic.pinnedCount.toLocaleString('ko-KR')}/
                {flat.length.toLocaleString('ko-KR')}
              </BentoCardBadge>
            </BentoCardTitleGroup>
          </BentoCardHeader>
          <BentoCardBody>
            <CoverageSplit>
              <MiniDonutRing
                slices={infographic.coordDonutSlices}
                size={72}
                strokeWidth={8.5}
                centerValue={`${infographic.coordPct}%`}
                centerLabel="좌표 매핑"
              />
              <CoverageRight>
                <StackedSegmentBar
                  slices={infographic.statusSlices}
                  height={8}
                />
                <BentoLegendWrap>
                  <BentoLegendChip
                    type="button"
                    $active={statusFilter === 'active'}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === 'active' ? 'all' : 'active',
                      )
                    }
                  >
                    <LegendDot
                      $color={isDarkMode ? '#34d399' : '#059669'}
                    />
                    <span>현존</span>
                    <strong>
                      {infographic.activeCount.toLocaleString('ko-KR')}
                    </strong>
                  </BentoLegendChip>
                  <BentoLegendChip
                    type="button"
                    $active={statusFilter === 'abolished'}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === 'abolished' ? 'all' : 'abolished',
                      )
                    }
                  >
                    <LegendDot
                      $color={isDarkMode ? '#f87171' : '#dc2626'}
                    />
                    <span>폐지</span>
                    <strong>
                      {infographic.abolishedCount.toLocaleString('ko-KR')}
                    </strong>
                  </BentoLegendChip>
                </BentoLegendWrap>
                <CoverageSubFoot>
                  <span>편제 체계 {schemes.length}개</span>
                  {infographic.lineageCount > 0 && (
                    <span>개편 계보 {infographic.lineageCount}곳</span>
                  )}
                </CoverageSubFoot>
              </CoverageRight>
            </CoverageSplit>
          </BentoCardBody>
        </BentoCard>
      </BentoGrid3Col>
    ) : null

  // ===== 2) 시기별 행정구역 체계 바 =====
  const schemeBar = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '8px 12px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: palette.textSecondary,
          marginRight: 4,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        편제 체계
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
              opacity: 0.78,
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
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
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px dashed ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiPlus size={12} />
        <span>체계 등록</span>
      </button>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => setConfigModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiSettings size={12} />
        <span>단위 관리</span>
      </button>
      <button
        type="button"
        onClick={() => setCompareOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 9px',
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px solid ${palette.border}`,
          background: 'transparent',
          color: palette.textSecondary,
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <FiRepeat size={12} />
        <span>체계 비교</span>
      </button>
    </div>
  )

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
              {levelFilter}차
              {unitLabelFilter ? ` · ${unitLabelFilter}` : ''} 전체
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
          options={SORT_OPTIONS}
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
    const s = new Set<string>()
    for (const r of sortedRows) {
      if (r.divisionLabel) s.add(r.divisionLabel)
    }
    return s.size
  }, [sortedRows])

  const showTypeBadge = mode !== 'drill' || distinctUnitInView > 1
  const isVirtualized = sortedRows.length > 35
  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
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
              onClick={() => setSearchLimit((n) => Math.min(200, n + 50))}
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
          onClick={() => setSearchLimit((n) => Math.min(200, n + 50))}
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

  // ===== 미선택 상태일 때 우측 총람 그리드 (빈 공백 대신 즉시 탐색 타일 노출!) =====
  const unselectedOverview =
    sortedRows.length > 0 ? (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingBottom: 10,
            marginBottom: 12,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: palette.text,
              }}
            >
              {currentParent
                ? `${currentParent.name} 하위 구역 총람`
                : `${country.name} 행정구역 총람`}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: palette.textSecondary,
                marginTop: 2,
              }}
            >
              카드를 클릭하면 상세 변천사·인라인 편집 및 지도 포커스로 전환됩니다 (키보드 ↑↓ 지원)
            </div>
          </div>
          <CountBadge palette={palette}>
            {sortedRows.length.toLocaleString('ko-KR')}곳
          </CountBadge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: 8,
          }}
        >
          {sortedRows.slice(0, 24).map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => handleItemClick(row)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 5,
                padding: '10px 12px',
                borderRadius: 6,
                border: `1px solid ${palette.border}`,
                background: palette.bgSecondary,
                textAlign: 'left',
                cursor: 'pointer',
                opacity: row.abolished ? 0.68 : 1,
                fontVariantNumeric: 'tabular-nums',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = palette.primary
                e.currentTarget.style.background = palette.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = palette.border
                e.currentTarget.style.background = palette.bgSecondary
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: palette.text,
                    textDecoration: row.abolished ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </span>
                {row.divisionLabel && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: palette.primary,
                      background: palette.badgeBg,
                      padding: '1px 6px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {row.divisionLabel}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 6,
                  fontSize: 11,
                  color: palette.textSecondary,
                }}
              >
                {row.localName && <span>{row.localName}</span>}
                {(row.establishedDate || row.abolishedDate) && (
                  <span>
                    {formatYearRange(row.establishedDate, row.abolishedDate)}
                  </span>
                )}
                {row.descendantCount > 0 && (
                  <span style={{ color: palette.primary, fontWeight: 700 }}>
                    하위 {row.descendantCount}곳
                  </span>
                )}
                {row.centerLat != null && row.centerLng != null && (
                  <FiMapPin size={10} style={{ color: palette.primary }} />
                )}
              </div>
            </button>
          ))}
        </div>
        {sortedRows.length > 24 && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11.5,
              color: palette.textSecondary,
              textAlign: 'right',
            }}
          >
            좌측 원장 목록에서 전체 {sortedRows.length.toLocaleString('ko-KR')}곳을 탐색할 수 있습니다
          </div>
        )}
      </div>
    ) : undefined

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bentoInfographic}
      {schemeBar}

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
              selectedMarkerId={selectedId}
              selectedDivisionQuery={selectedDivisionQuery}
              selectedDivisionName={selectedDivisionDisplayName}
              onMarkerClick={(id) => {
                const row = sortedRows.find((r) => r.id === id)
                if (row) handleItemClick(row)
                else drillToNode(id)
              }}
            />

            <RegionDetailPanel
              palette={palette}
              isSelected={!!selectedDivision}
              empty={unselectedOverview}
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
                  {selectedParentChain.map((p) => (
                    <span
                      key={p.id}
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
                  key={selectedDivision.id}
                  palette={palette}
                  owner={owner}
                  division={selectedDivision}
                  divisions={divisions}
                  configsById={configsById}
                  onSelectDivision={drillToNode}
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
    </div>
  )
}

interface SchemeChipProps {
  palette: ReturnType<typeof useRegionPalette>
  active: boolean
  onClick: () => void
  onEdit?: () => void
  children: React.ReactNode
}

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
          height: 28,
          padding: '0 10px',
          fontSize: 12,
          fontWeight: active ? 700 : 600,
          borderRadius: 6,
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
            borderRadius: 4,
            background: 'transparent',
            color: palette.textSecondary,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FiEdit2 size={11} />
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
        padding: '2px 5px',
        borderRadius: 4,
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
  children: React.ReactNode
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
  children: React.ReactNode
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
