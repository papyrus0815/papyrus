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
import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  useAdminDivisionConfigs,
  useAdministrativeDivisionSearch,
  useAdministrativeDivisions,
  useDeleteAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'

import {
  AdminDivisionFormModal,
  KpiChip,
  KpiStrip,
  ListEmptyState,
  ListToolbarRow,
  MapCard,
  MetaCard,
  RegionDetailHeader,
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
    latitude?: number | null
    longitude?: number | null
  }
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
  centerLat?: number | null
  centerLng?: number | null
}

/** path를 따라가며 각 단계의 노드를 모은다. 못 찾으면 거기서 멈춤. */
function resolvePath(
  roots: AdministrativeDivision[],
  ids: string[],
): AdministrativeDivision[] {
  const result: AdministrativeDivision[] = []
  let cursor = roots
  for (const id of ids) {
    const found = cursor.find((d) => d.id === id)
    if (!found) break
    result.push(found)
    cursor = found.children ?? []
  }
  return result
}

/** 트리 어디든 id로 노드 찾기 */
function findInTree(
  roots: AdministrativeDivision[],
  id: string,
): AdministrativeDivision | null {
  for (const node of roots) {
    if (node.id === id) return node
    if (node.children?.length) {
      const f = findInTree(node.children, id)
      if (f) return f
    }
  }
  return null
}

function isAbolished(d: AdministrativeDivision): boolean {
  if (!d.abolishedDate) return false
  return new Date(d.abolishedDate).getTime() <= Date.now()
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
  mapLocation: externalMapLocation,
  onCityClick,
}: MapRegionAdministrativeViewProps) {
  const palette = useRegionPalette()
  const { data: divisions = [], isLoading } = useAdministrativeDivisions(
    country.id,
  )
  const { data: configs = [] } = useAdminDivisionConfigs(country.id)
  const deleteMut = useDeleteAdministrativeDivision(country.id)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdministrativeDivision | null>(null)
  const [pendingDelete, setPendingDelete] =
    useState<AdministrativeDivision | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

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

  const updateParam = useCallback(
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
    country.id,
    searchLimit,
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
        centerLat: null,
        centerLng: null,
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
    if (selectedId && !findInTree(divisions, selectedId)) {
      setSelectedId(null)
    }
  }, [divisions, selectedId, setSelectedId])

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
    setSelectedId(row.id)
    const node = findInTree(divisions, row.id)
    reportLocation(node)
    if (mode === 'drill' && (node?.children ?? []).length > 0) {
      setPath([...pathIds, row.id])
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    setPath(index < 0 ? [] : pathIds.slice(0, index + 1))
    setSelectedId(null)
    reportLocation(null)
  }

  const handleBack = () => {
    if (breadcrumb.length === 0) return
    setPath(pathIds.slice(0, -1))
    setSelectedId(null)
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
      toast.success('행정구역을 삭제했습니다')
      const idx = pathIds.indexOf(pendingDelete.id)
      if (idx >= 0) setPath(pathIds.slice(0, idx))
      if (selectedId === pendingDelete.id) setSelectedId(null)
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
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

  const childCount = selectedDivision?.children?.length ?? 0

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
    setSearch('')
    setLevelFilter(null)
    setPath(chain)
    setSelectedId(id)
    const node = findInTree(divisions, id)
    reportLocation(node)
  }

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

  const breadcrumbBar = mode === 'drill' && (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontSize: 12,
      }}
    >
      <BreadcrumbBtn
        palette={palette}
        active={breadcrumb.length === 0}
        onClick={() => handleBreadcrumbClick(-1)}
      >
        {country.name}
      </BreadcrumbBtn>
      {breadcrumb.map((node, i) => (
        <span key={node.id} style={{ display: 'inline-flex', gap: 8 }}>
          <span style={{ color: palette.textSecondary }}>›</span>
          <BreadcrumbBtn
            palette={palette}
            active={i === breadcrumb.length - 1}
            onClick={() => handleBreadcrumbClick(i)}
          >
            {node.name}
          </BreadcrumbBtn>
        </span>
      ))}
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          fontWeight: 600,
          color: palette.primary,
          background: palette.badgeBg,
          padding: '3px 8px',
          borderRadius: 6,
        }}
      >
        {drillLevel}차 · {sortedRows.length}개
      </span>
    </div>
  )

  const modeChrome = (() => {
    if (mode === 'search') {
      return (
        <ModeBanner
          palette={palette}
          label={`"${search}" 전체 검색 (모든 레벨)`}
          onClear={() => setSearch('')}
        />
      )
    }
    if (mode === 'level') {
      const cfg = configs.find((c) => c.divisionLevel === levelFilter)
      return (
        <ModeBanner
          palette={palette}
          label={`${levelFilter}차 ${cfg ? `(${cfg.divisionLabel})` : ''} 전체`}
          onClear={() => setLevelFilter(null)}
        />
      )
    }
    return null
  })()

  const toolbar = (
    <>
      <ListToolbarRow
        palette={palette}
        rightSlot={
          <div style={{ display: 'inline-flex', gap: 6 }}>
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
        }
      >
        <SearchInput
          palette={palette}
          value={search}
          onChange={setSearch}
          placeholder="이름·현지어 (전체 트리에서 검색)"
        />
        <SortSelect
          palette={palette}
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
        />
      </ListToolbarRow>
      {mode === 'drill' && breadcrumb.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderBottom: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            aria-label="상위 구역으로 돌아가기"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              background: palette.bg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={palette.textSecondary}
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: palette.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentParent?.name}의 하위
          </span>
        </div>
      )}
      {breadcrumbBar}
      {modeChrome}
    </>
  )

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
            <RegisterButton
              palette={palette}
              onClick={openCreate}
              label="첫 행정구역 등록"
            />
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
    const items = sortedRows.map((row) => {
      const node = findInTree(divisions, row.id)
      const subtitleParts: string[] = []
      if (row.divisionLabel) subtitleParts.push(row.divisionLabel)
      if (row.localName) subtitleParts.push(row.localName)
      if (row.parentPath.length > 0)
        subtitleParts.push(row.parentPath.join(' › '))
      const subtitle = subtitleParts.join(' · ') || undefined

      return (
        <RegionListItem
          key={row.id}
          palette={palette}
          selected={selectedId === row.id}
          onSelect={() => handleItemClick(row)}
          title={row.name}
          subtitle={
            row.abolished ? (
              <span style={{ textDecoration: 'line-through' }}>{subtitle}</span>
            ) : (
              subtitle
            )
          }
          onEdit={node ? () => openEdit(node) : undefined}
          onDelete={node ? () => setPendingDelete(node) : undefined}
          typeBadge={
            row.divisionLabel
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
      )
    })
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

  const detailSubtitle = (() => {
    if (!selectedDivision) return country.name
    const labelCfg = configsById.get(selectedDivision.adminDivisionId)
    const parts: string[] = [country.name]
    if (labelCfg) parts.push(labelCfg.divisionLabel)
    return parts.join(' · ')
  })()

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
        sectionLabel="행정구역"
        kpiStrip={kpiStrip}
        maxHeight="calc(100vh - 380px)"
        left={
          <RegionListPanel palette={palette} toolbar={toolbar}>
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
                <RegionDetailHeader
                  palette={palette}
                  title={selectedDivision.name}
                  subtitle={detailSubtitle}
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
                    setSearch('')
                    setLevelFilter(null)
                    setPath([])
                    setSelectedId(null)
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
            {selectedDivision?.localName && (
              <MetaCard
                palette={palette}
                label="현지어 명칭"
                value={selectedDivision.localName}
              />
            )}
            {selectedDivision?.nameMeaning && (
              <MetaCard
                palette={palette}
                label="명칭 뜻"
                value={selectedDivision.nameMeaning}
              />
            )}
            {childCount > 0 && (
              <MetaCard
                palette={palette}
                label="하위 구역"
                value={`${childCount}개`}
              />
            )}
            {selectedDivision?.centerLat != null &&
              selectedDivision?.centerLng != null && (
                <MetaCard
                  palette={palette}
                  label="중심 좌표"
                  value={`${Number(selectedDivision.centerLat).toFixed(4)}, ${Number(selectedDivision.centerLng).toFixed(4)}`}
                />
              )}
            {selectedDivision?.establishedDate && (
              <MetaCard
                palette={palette}
                label="설립일"
                value={selectedDivision.establishedDate.slice(0, 10)}
              />
            )}
            {selectedDivision?.abolishedDate && (
              <MetaCard
                palette={palette}
                label="폐지일"
                value={selectedDivision.abolishedDate.slice(0, 10)}
              />
            )}
            {selectedDivision?.predecessorId && (
              <MetaCard
                palette={palette}
                label="이전 행정구역"
                value={
                  findInTree(divisions, selectedDivision.predecessorId)?.name ??
                  '—'
                }
              />
            )}
            {(selectedDivision?.successorCount ?? 0) > 0 && (
              <MetaCard
                palette={palette}
                label="후계 구역"
                value={`${selectedDivision!.successorCount}개`}
              />
            )}
            {(selectedDivision?.cityCount ?? 0) > 0 && (
              <MetaCard
                palette={palette}
                label="등록된 도시"
                value={`${selectedDivision!.cityCount}개`}
              />
            )}
          </RegionDetailPanel>
        }
      />

      <AdminDivisionFormModal
        isOpen={formOpen}
        countryId={country.id}
        editing={editing}
        defaultLevel={formDefaultLevel}
        defaultParent={formDefaultParent}
        onClose={closeForm}
      />

      <AdminDivisionBulkImportModal
        isOpen={bulkOpen}
        countryId={country.id}
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
        message={
          pendingDelete
            ? `"${pendingDelete.name}" 항목을 삭제하시겠습니까? 하위 구역도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
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

interface ModeBannerProps {
  palette: ReturnType<typeof useRegionPalette>
  label: string
  onClear: () => void
}

function ModeBanner({ palette, label, onClear }: ModeBannerProps) {
  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: palette.badgeBg,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: palette.primary,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
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
        해제
      </button>
    </div>
  )
}
