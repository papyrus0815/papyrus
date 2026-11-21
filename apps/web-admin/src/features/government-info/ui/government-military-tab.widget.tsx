import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAnchor,
  FiArrowUpRight,
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiColumns,
  FiCrosshair,
  FiGitBranch,
  FiLayers,
  FiList,
  FiMaximize2,
  FiNavigation,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  buildUnitByIdMap,
  extractUnitSignedYear,
  fetchCountryScopedMilitaryUnits,
  MILITARY_BRANCH_LABELS,
  MILITARY_ECHELON_ORDER,
  MILITARY_UNIT_TYPE_LABELS,
  militaryUnitQueryKeys,
  parseSnapshotYearInput,
  resolveEffectiveDepartmentForUnit,
} from '@/entities/military-unit'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { MilitaryUnitDetailDrawer } from '@/pages/military/components/military-unit-detail-drawer'
import type { MilitaryUnitType } from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useThemeStore } from '@/shared/styles/theme.store'
import {
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import {
  PopoverMenu,
  PopoverMenuDivider,
  PopoverMenuItem,
  PopoverMenuSectionLabel,
} from '@/shared/ui/popover-menu'
import {
  MilitaryUnitDetailContent,
  type MilitaryUnitDetailResponse,
} from '@/widgets/military-unit-detail'

import {
  GOV_BRAND,
  GOV_ROW_HAIRLINE,
  GovActiveFilterChip,
  GovActiveFiltersRow,
  GovClearFiltersBtn,
  GovLedgerPanel,
  GovPrimaryBtn,
  GovPromSearch,
  GovPromSearchClear,
  GovPromSearchInput,
  GovToolbarBtn,
  GovToolbarDivider,
  GovToolbarGroup,
  GovToolbarRight,
  GovToolbarRow,
  GovToolbarShell,
  GovViewMeta,
} from './government-ledger.styles'
import {
  type LedgerMilitaryUnitItem,
  MilitaryUnitsLedgerView,
} from './military-units-ledger-view.widget'
import { UnlinkedCountryTenuresBar } from './unlinked-country-tenures-bar'

export interface CreateMilitaryUnitDefaults {
  parentUnitId?: string | null
  administrationDepartmentId?: string | null
  historicalCountryId?: string | null
  branch?: string | null
}

export interface GovernmentMilitaryTabProps {
  country?: UnifiedCountry
  effectiveCountryId: string | undefined
  focusUnitId?: string | null
  hidePrimaryCta?: boolean
  onConsumedFocusUnit?: () => void
  onSelectedUnitChange?: (unitId: string | null) => void
  onCreateUnit: (defaults?: CreateMilitaryUnitDefaults) => void
  onEditUnit: (unitId: string) => void
  onNavigateToDepartment?: (departmentId: string) => void
}

type EchelonGroupKey = 'ALL' | 'HIGH_COMMAND' | 'OPERATIONAL' | 'TACTICAL'
type UnitStatusFilter = 'ALL' | 'ACTIVE' | 'DISBANDED'
type BrowseViewMode = 'TREE' | 'LEDGER'
type WorkspaceLayoutMode = 'FOCUS' | 'SPLIT'

const ECHELON_GROUP_LABELS: Record<EchelonGroupKey, string> = {
  ALL: '전체 제대',
  HIGH_COMMAND: '상급지휘부',
  OPERATIONAL: '작전·전략',
  TACTICAL: '전술·부대',
}

const STATUS_FILTER_LABELS: Record<UnitStatusFilter, string> = {
  ALL: '전체 상태',
  ACTIVE: '운용',
  DISBANDED: '해체',
}

const HIGH_COMMAND_ECHELONS = new Set<string>([
  'SUPREME_COMMAND',
  'GENERAL_STAFF',
  'SERVICE_HQ',
  'THEATER',
])

const OPERATIONAL_ECHELONS = new Set<string>([
  'ARMY_GROUP',
  'FRONT',
  'MILITARY_DISTRICT',
  'FIELD_ARMY',
  'CORPS',
  'FLEET',
  'AIR_FLEET',
  'AIR_CORPS',
])

const BRANCH_DISPLAY_ORDER: string[] = [
  'JOINT',
  'ARMY',
  'NAVY',
  'AIR_FORCE',
  'MARINE_CORPS',
  'COAST_GUARD',
  'SPACE_FORCE',
  'OTHER',
  'UNSPECIFIED',
]

type ExtendedMilitaryUnit = LedgerMilitaryUnitItem & {
  description?: string | null
  motto?: string | null
  garrison?: string | null
}

function getEchelonGroup(
  unitType: string | null | undefined,
): Exclude<EchelonGroupKey, 'ALL'> {
  if (!unitType) return 'TACTICAL'
  if (HIGH_COMMAND_ECHELONS.has(unitType)) return 'HIGH_COMMAND'
  if (OPERATIONAL_ECHELONS.has(unitType)) return 'OPERATIONAL'
  return 'TACTICAL'
}

function matchesEchelonGroup(
  unitType: string | null | undefined,
  filter: EchelonGroupKey,
): boolean {
  if (filter === 'ALL') return true
  return getEchelonGroup(unitType) === filter
}

function isUnitActiveAtYear(
  unitItem: ExtendedMilitaryUnit,
  targetSignedYear: number,
): boolean {
  const startYr = extractUnitSignedYear(
    unitItem.established,
    unitItem.establishedDate,
  )
  const endYr = extractUnitSignedYear(
    unitItem.disbanded,
    unitItem.disbandedDate,
  )
  if (startYr == null && endYr == null) return false
  if (startYr != null && targetSignedYear < startYr) return false
  if (endYr != null && targetSignedYear > endYr) return false
  return true
}

function formatCompactYear(signedYear: number | null): string | null {
  if (signedYear == null) return null
  return signedYear < 0 ? `BC ${Math.abs(signedYear)}` : String(signedYear)
}

function formatUnitCompactPeriod(unitItem: ExtendedMilitaryUnit): string {
  const estStr = formatCompactYear(
    extractUnitSignedYear(unitItem.established, unitItem.establishedDate),
  )
  const disStr = formatCompactYear(
    extractUnitSignedYear(unitItem.disbanded, unitItem.disbandedDate),
  )
  if (!estStr && !disStr) return ''
  if (estStr && disStr) return `${estStr}~${disStr}`
  if (estStr) return `${estStr}~${unitItem.isActive === false ? '해체' : ''}`
  return `~${disStr}`
}

function compareUnitsByEchelonAndYear(
  left: ExtendedMilitaryUnit,
  right: ExtendedMilitaryUnit,
): number {
  const leftRank = left.unitType
    ? (MILITARY_ECHELON_ORDER[left.unitType] ?? 50)
    : 50
  const rightRank = right.unitType
    ? (MILITARY_ECHELON_ORDER[right.unitType] ?? 50)
    : 50
  if (leftRank !== rightRank) return leftRank - rightRank

  const leftYr =
    extractUnitSignedYear(left.established, left.establishedDate) ??
    Number.MAX_SAFE_INTEGER
  const rightYr =
    extractUnitSignedYear(right.established, right.establishedDate) ??
    Number.MAX_SAFE_INTEGER
  if (leftYr !== rightYr) return leftYr - rightYr
  return left.name.localeCompare(right.name, 'ko')
}

function renderUnitBranchIcon(
  branch: string | null | undefined,
  unitType: string | null | undefined,
  size = 13,
) {
  if (
    unitType === 'SUPREME_COMMAND' ||
    unitType === 'GENERAL_STAFF' ||
    unitType === 'SERVICE_HQ'
  ) {
    return <FiAward size={size} aria-hidden />
  }
  if (branch === 'NAVY' || branch === 'COAST_GUARD' || unitType === 'FLEET') {
    return <FiAnchor size={size} aria-hidden />
  }
  if (
    branch === 'AIR_FORCE' ||
    branch === 'SPACE_FORCE' ||
    unitType === 'AIR_FLEET' ||
    unitType === 'AIR_CORPS' ||
    unitType === 'WING'
  ) {
    return <FiNavigation size={size} aria-hidden />
  }
  if (branch === 'JOINT') return <FiLayers size={size} aria-hidden />
  if (unitType === 'SPECIAL_FORCES') {
    return <FiCrosshair size={size} aria-hidden />
  }
  return <FiShield size={size} aria-hidden />
}

function UnitEmblemThumb({
  unitItem,
  size = 24,
  isDark,
}: {
  unitItem: ExtendedMilitaryUnit
  size?: number
  isDark: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolvedSrc = unitItem.insigniaUrl
    ? getUploadImageUrl(unitItem.insigniaUrl)
    : null

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          objectFit: 'cover',
          flexShrink: 0,
          border: `1px solid ${
            isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,19,34,0.1)'
          }`,
        }}
      />
    )
  }

  const isHighCommand =
    unitItem.unitType != null && HIGH_COMMAND_ECHELONS.has(unitItem.unitType)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isHighCommand
          ? isDark
            ? 'rgba(139, 92, 246, 0.16)'
            : 'rgba(109, 40, 217, 0.08)'
          : isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(20, 19, 34, 0.045)',
        color: isHighCommand
          ? isDark
            ? '#c4b5fd'
            : '#5b21b6'
          : isDark
            ? 'rgba(255,255,255,0.72)'
            : 'rgba(20,19,34,0.68)',
      }}
    >
      {renderUnitBranchIcon(unitItem.branch, unitItem.unitType, size * 0.54)}
    </div>
  )
}

export function GovernmentMilitaryTab({
  country,
  effectiveCountryId,
  focusUnitId,
  hidePrimaryCta = false,
  onConsumedFocusUnit,
  onSelectedUnitChange,
  onCreateUnit,
  onEditUnit,
  onNavigateToDepartment,
}: GovernmentMilitaryTabProps) {
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const isHistorical = country?.type === 'historical'
  const targetId = effectiveCountryId ?? country?.id ?? ''

  const [browseViewMode, setBrowseViewMode] = useState<BrowseViewMode>('TREE')
  // 기본 전체폭(FOCUS) + 항목 클릭 시 통합 슬라이드 드로어 (⋯ 메뉴에서 2단 분할 전환 가능)
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>('FOCUS')
  const [groupByEra, setGroupByEra] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [echelonGroupFilter, setEchelonGroupFilter] =
    useState<EchelonGroupKey>('ALL')
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('ALL')
  const [snapshotYearInput, setSnapshotYearInput] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    focusUnitId || null,
  )
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [collapsedEraIds, setCollapsedEraIds] = useState<Set<string>>(
    () => new Set(),
  )

  const parsedSnapshotYear = useMemo(
    () => parseSnapshotYearInput(snapshotYearInput),
    [snapshotYearInput],
  )

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && targetId ? targetId : '',
    )

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical && targetId ? targetId : undefined,
  )

  const constituentPolityIds = useMemo(
    () =>
      constituentPolities
        .map((item) => item.id)
        .filter((idVal): idVal is string => Boolean(idVal))
        .sort(),
    [constituentPolities],
  )

  const relatedHistKey = useMemo(
    () => (isHistorical ? constituentPolityIds.join(',') : ''),
    [isHistorical, constituentPolityIds],
  )

  const unitsQuery = useQuery({
    queryKey: militaryUnitQueryKeys.countryScope(
      isHistorical ? 'hist' : 'mod',
      targetId,
      relatedHistKey,
    ),
    queryFn: () =>
      fetchCountryScopedMilitaryUnits({
        countryId: targetId,
        isHistorical,
        relatedHistoricalIds: constituentPolityIds,
      }),
    enabled: Boolean(targetId),
    staleTime: 1000 * 60 * 2,
  })

  const countryUnits = useMemo<ExtendedMilitaryUnit[]>(
    () => (unitsQuery.data ?? []) as ExtendedMilitaryUnit[],
    [unitsQuery.data],
  )

  const unitByIdMap = useMemo(
    () => buildUnitByIdMap(countryUnits),
    [countryUnits],
  )

  const selectUnit = (nextUnitId: string | null) => {
    setSelectedUnitId(nextUnitId)
    onSelectedUnitChange?.(nextUnitId)
  }

  /** 외부(중앙부처 상세 또는 URL ?unitId=)에서 특정 부대 포커스 요청 시 선택 및 필터 해제 */
  useEffect(() => {
    if (!focusUnitId || countryUnits.length === 0) return
    if (unitByIdMap.has(focusUnitId)) {
      setSelectedUnitId(focusUnitId)
      setEchelonGroupFilter('ALL')
      setEraFilter('ALL')
      setDeptFilter('ALL')
      setBranchFilter('ALL')
      setStatusFilter('ALL')
      setSnapshotYearInput('')
    }
    onConsumedFocusUnit?.()
  }, [focusUnitId, countryUnits.length, unitByIdMap, onConsumedFocusUnit])

  /** 선택된 부대가 변경되면 상위 트리 노드와 소속 시대 섹션을 자동으로 펼침 */
  useEffect(() => {
    if (!selectedUnitId) return
    const ancestorsToExpand: string[] = []
    const visited = new Set<string>()
    let cursor = unitByIdMap.get(selectedUnitId)
    while (cursor?.parentUnitId && !visited.has(cursor.parentUnitId)) {
      visited.add(cursor.parentUnitId)
      ancestorsToExpand.push(cursor.parentUnitId)
      cursor = unitByIdMap.get(cursor.parentUnitId)
    }
    if (ancestorsToExpand.length > 0) {
      setCollapsedNodeIds((prev) => {
        let changed = false
        const next = new Set(prev)
        for (const ancId of ancestorsToExpand) {
          if (next.has(ancId)) {
            next.delete(ancId)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    const selectedNode = unitByIdMap.get(selectedUnitId)
    if (selectedNode) {
      const eraSectionId = selectedNode.historicalCountryId || '__MODERN__'
      setCollapsedEraIds((prev) => {
        if (!prev.has(eraSectionId)) return prev
        const next = new Set(prev)
        next.delete(eraSectionId)
        return next
      })
    }
  }, [selectedUnitId, unitByIdMap])

  const autoSelectedSplitScopeRef = useRef<string | null>(null)
  const currentSplitScopeKey = `${targetId}:${branchFilter}:${eraFilter}:${deptFilter}`

  useEffect(() => {
    if (layoutMode !== 'SPLIT') {
      autoSelectedSplitScopeRef.current = null
      return
    }
    if (countryUnits.length === 0) {
      setSelectedUnitId(null)
      return
    }
    if (selectedUnitId && unitByIdMap.has(selectedUnitId)) {
      autoSelectedSplitScopeRef.current = currentSplitScopeKey
      return
    }
    if (autoSelectedSplitScopeRef.current === currentSplitScopeKey) {
      return
    }
    const sortedDefaults = [...countryUnits].sort(compareUnitsByEchelonAndYear)
    if (sortedDefaults[0]) {
      autoSelectedSplitScopeRef.current = currentSplitScopeKey
      setSelectedUnitId(sortedDefaults[0].id)
    }
  }, [
    layoutMode,
    currentSplitScopeKey,
    countryUnits,
    selectedUnitId,
    unitByIdMap,
  ])

  const historicalErasAvailable = useMemo(() => {
    const eraMap = new Map<string, string>()
    if (isHistorical) {
      for (const constituentItem of constituentPolities) {
        if (constituentItem.id && constituentItem.name) {
          eraMap.set(constituentItem.id, constituentItem.name)
        }
      }
      for (const unitItem of countryUnits) {
        if (
          unitItem.historicalCountry?.id &&
          unitItem.historicalCountry.id !== targetId &&
          unitItem.historicalCountry.name
        ) {
          eraMap.set(
            unitItem.historicalCountry.id,
            unitItem.historicalCountry.name,
          )
        }
      }
    } else {
      for (const linkedItem of linkedHistoricalCountries) {
        if (linkedItem.id && linkedItem.name) {
          eraMap.set(linkedItem.id, linkedItem.name)
        }
      }
      for (const unitItem of countryUnits) {
        if (unitItem.historicalCountry?.id && unitItem.historicalCountry.name) {
          eraMap.set(
            unitItem.historicalCountry.id,
            unitItem.historicalCountry.name,
          )
        }
      }
    }
    return Array.from(eraMap.entries())
      .map(([histId, histName]) => ({
        id: histId,
        name: histName,
        count: countryUnits.filter(
          (unitRow) => unitRow.historicalCountryId === histId,
        ).length,
      }))
      .filter((item) => item.count > 0)
  }, [
    constituentPolities,
    countryUnits,
    isHistorical,
    linkedHistoricalCountries,
    targetId,
  ])

  const directCountryUnitCount = useMemo(
    () =>
      isHistorical
        ? countryUnits.filter(
            (unitItem) => unitItem.historicalCountryId === targetId,
          ).length
        : countryUnits.filter((unitItem) => !unitItem.historicalCountryId)
            .length,
    [countryUnits, isHistorical, targetId],
  )

  const resolveEffectiveDepartment = useMemo(
    () => (unitItem: LedgerMilitaryUnitItem) =>
      resolveEffectiveDepartmentForUnit(
        unitItem as ExtendedMilitaryUnit,
        unitByIdMap,
      ),
    [unitByIdMap],
  )

  const commandDepartments = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; abbreviation?: string | null; count: number }
    >()
    for (const unitItem of countryUnits) {
      const dept = resolveEffectiveDepartment(unitItem)
      if (!dept) continue
      const existing = map.get(dept.id)
      if (existing) {
        existing.count += 1
      } else {
        map.set(dept.id, {
          id: dept.id,
          name: dept.name,
          abbreviation: dept.abbreviation,
          count: 1,
        })
      }
    }
    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'ko'),
    )
  }, [countryUnits, resolveEffectiveDepartment])

  const unlinkedDeptUnitCount = useMemo(
    () =>
      countryUnits.filter((unitRow) => !resolveEffectiveDepartment(unitRow))
        .length,
    [countryUnits, resolveEffectiveDepartment],
  )

  const matchesNonBranchFilters = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return (unitItem: ExtendedMilitaryUnit): boolean => {
      if (eraFilter === 'MODERN' && unitItem.historicalCountryId) return false
      if (
        eraFilter !== 'ALL' &&
        eraFilter !== 'MODERN' &&
        unitItem.historicalCountryId !== eraFilter
      ) {
        return false
      }
      if (deptFilter !== 'ALL') {
        const effDept = resolveEffectiveDepartment(unitItem)
        if (deptFilter === 'UNLINKED') {
          if (effDept != null) return false
        } else if (effDept?.id !== deptFilter) {
          return false
        }
      }
      if (!matchesEchelonGroup(unitItem.unitType, echelonGroupFilter)) {
        return false
      }
      if (statusFilter === 'ACTIVE' && unitItem.isActive === false) {
        return false
      }
      if (statusFilter === 'DISBANDED' && unitItem.isActive !== false) {
        return false
      }
      if (
        parsedSnapshotYear != null &&
        !isUnitActiveAtYear(unitItem, parsedSnapshotYear)
      ) {
        return false
      }
      if (!keyword) return true
      const commanderMatch =
        (unitItem.commanders ?? []).some((cmdItem) => {
          const fullName =
            `${cmdItem.person?.surname ?? ''} ${cmdItem.person?.name ?? ''}`.toLowerCase()
          return fullName.includes(keyword)
        }) ||
        (unitItem.tenures ?? []).some((tenureItem) => {
          const fullName =
            `${tenureItem.person?.surname ?? ''} ${tenureItem.person?.name ?? ''}`.toLowerCase()
          return fullName.includes(keyword)
        })
      return (
        unitItem.name.toLowerCase().includes(keyword) ||
        (unitItem.abbreviation ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nameLocal ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nameEn ?? '').toLowerCase().includes(keyword) ||
        (unitItem.nickname ?? '').toLowerCase().includes(keyword) ||
        (unitItem.motto ?? '').toLowerCase().includes(keyword) ||
        (unitItem.garrison ?? '').toLowerCase().includes(keyword) ||
        (unitItem.description ?? '').toLowerCase().includes(keyword) ||
        (unitItem.administrationDepartment?.name ?? '')
          .toLowerCase()
          .includes(keyword) ||
        commanderMatch
      )
    }
  }, [
    searchQuery,
    eraFilter,
    deptFilter,
    echelonGroupFilter,
    statusFilter,
    parsedSnapshotYear,
    resolveEffectiveDepartment,
  ])

  const unitsMatchingToolbar = useMemo(
    () => countryUnits.filter(matchesNonBranchFilters),
    [countryUnits, matchesNonBranchFilters],
  )

  const branchTabs = useMemo(() => {
    const presentBranches = new Set<string>()
    for (const unitItem of countryUnits) {
      presentBranches.add(unitItem.branch || 'UNSPECIFIED')
    }
    const countsInToolbar = new Map<string, number>()
    for (const unitItem of unitsMatchingToolbar) {
      const bKey = unitItem.branch || 'UNSPECIFIED'
      countsInToolbar.set(bKey, (countsInToolbar.get(bKey) ?? 0) + 1)
    }

    const orderedKeys = [
      ...BRANCH_DISPLAY_ORDER.filter((key) => presentBranches.has(key)),
      ...Array.from(presentBranches).filter(
        (key) => !BRANCH_DISPLAY_ORDER.includes(key),
      ),
    ]

    return [
      {
        id: 'ALL',
        label: '전체 편제',
        count: unitsMatchingToolbar.length,
      },
      ...orderedKeys.map((branchKey) => ({
        id: branchKey,
        label:
          branchKey === 'UNSPECIFIED'
            ? '군종 미지정'
            : (MILITARY_BRANCH_LABELS[branchKey] ?? branchKey),
        count: countsInToolbar.get(branchKey) ?? 0,
      })),
    ]
  }, [countryUnits, unitsMatchingToolbar])

  const filteredUnits = useMemo(() => {
    const list =
      branchFilter === 'ALL'
        ? unitsMatchingToolbar
        : unitsMatchingToolbar.filter(
            (unitItem) => (unitItem.branch || 'UNSPECIFIED') === branchFilter,
          )
    return [...list].sort(compareUnitsByEchelonAndYear)
  }, [unitsMatchingToolbar, branchFilter])

  const hierarchyGroups = useMemo(() => {
    const filteredIdSet = new Set(filteredUnits.map((unitItem) => unitItem.id))
    const childrenByParentId = new Map<string, ExtendedMilitaryUnit[]>()
    const rootUnits: ExtendedMilitaryUnit[] = []

    for (const unitItem of filteredUnits) {
      const parentId = unitItem.parentUnitId
      if (parentId && filteredIdSet.has(parentId) && parentId !== unitItem.id) {
        const list = childrenByParentId.get(parentId) ?? []
        list.push(unitItem)
        childrenByParentId.set(parentId, list)
      } else {
        rootUnits.push(unitItem)
      }
    }

    for (const childList of childrenByParentId.values()) {
      childList.sort(compareUnitsByEchelonAndYear)
    }
    rootUnits.sort(compareUnitsByEchelonAndYear)

    type DeptGroup = {
      key: string
      departmentId: string | null
      departmentName: string
      departmentAbbreviation?: string | null
      historicalCountryId?: string | null
      roots: ExtendedMilitaryUnit[]
    }

    const buildDeptGroups = (targetRoots: ExtendedMilitaryUnit[]): DeptGroup[] => {
      const groupMap = new Map<string, DeptGroup>()
      for (const rootUnit of targetRoots) {
        const effDept = resolveEffectiveDepartment(rootUnit)
        const groupKey = effDept ? `dept:${effDept.id}` : 'dept:unlinked'
        const existing = groupMap.get(groupKey)
        if (existing) {
          existing.roots.push(rootUnit)
        } else {
          groupMap.set(groupKey, {
            key: groupKey,
            departmentId: effDept?.id ?? null,
            departmentName: effDept
              ? effDept.name
              : '독립 · 상급 군령기구 미지정 편제',
            departmentAbbreviation: effDept?.abbreviation,
            historicalCountryId: rootUnit.historicalCountryId ?? null,
            roots: [rootUnit],
          })
        }
      }
      return Array.from(groupMap.values()).sort((left, right) => {
        if (left.departmentId && !right.departmentId) return -1
        if (!left.departmentId && right.departmentId) return 1
        return left.departmentName.localeCompare(right.departmentName, 'ko')
      })
    }

    const groups = buildDeptGroups(rootUnits)

    type EraTreeSection = {
      id: string
      label: string
      historicalCountryId: string | null
      totalCount: number
      deptGroups: DeptGroup[]
    }

    let eraSections: EraTreeSection[] | null = null
    if (
      groupByEra &&
      eraFilter === 'ALL' &&
      historicalErasAvailable.length > 0
    ) {
      const sections: EraTreeSection[] = []
      const countSubtree = (rootsList: ExtendedMilitaryUnit[]): number => {
        let count = 0
        const visited = new Set<string>()
        const walk = (node: ExtendedMilitaryUnit) => {
          if (visited.has(node.id)) return
          visited.add(node.id)
          count += 1
          for (const childNode of childrenByParentId.get(node.id) ?? []) {
            walk(childNode)
          }
        }
        for (const rootNode of rootsList) walk(rootNode)
        return count
      }

      if (isHistorical && targetId) {
        const ownRoots = rootUnits.filter(
          (unitRow) =>
            !unitRow.historicalCountryId ||
            unitRow.historicalCountryId === targetId,
        )
        if (ownRoots.length > 0) {
          sections.push({
            id: targetId,
            label: `${country?.name ?? '본국'} 직속`,
            historicalCountryId: targetId,
            totalCount: countSubtree(ownRoots),
            deptGroups: buildDeptGroups(ownRoots),
          })
        }
      } else {
        const modernRoots = rootUnits.filter(
          (unitRow) => !unitRow.historicalCountryId,
        )
        if (modernRoots.length > 0) {
          sections.push({
            id: '__MODERN__',
            label: `현대 ${country?.name ?? ''} 직속`.trim(),
            historicalCountryId: null,
            totalCount: countSubtree(modernRoots),
            deptGroups: buildDeptGroups(modernRoots),
          })
        }
      }

      const handledEraIds = new Set<string>(sections.map((sec) => sec.id))
      for (const eraItem of historicalErasAvailable) {
        if (handledEraIds.has(eraItem.id)) continue
        const eraRoots = rootUnits.filter(
          (unitRow) => unitRow.historicalCountryId === eraItem.id,
        )
        if (eraRoots.length > 0) {
          handledEraIds.add(eraItem.id)
          sections.push({
            id: eraItem.id,
            label: eraItem.name,
            historicalCountryId: eraItem.id,
            totalCount: countSubtree(eraRoots),
            deptGroups: buildDeptGroups(eraRoots),
          })
        }
      }

      if (sections.length > 1) {
        eraSections = sections
      }
    }

    return {
      groups,
      eraSections,
      childrenByParentId,
      collapsibleParentIds: Array.from(childrenByParentId.keys()),
    }
  }, [
    filteredUnits,
    resolveEffectiveDepartment,
    groupByEra,
    eraFilter,
    historicalErasAvailable,
    isHistorical,
    targetId,
    country?.name,
  ])

  const toggleNodeCollapse = (unitId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  const toggleEraCollapse = (eraId: string) => {
    setCollapsedEraIds((prev) => {
      const next = new Set(prev)
      if (next.has(eraId)) next.delete(eraId)
      else next.add(eraId)
      return next
    })
  }

  const allCollapsibleCollapsed =
    hierarchyGroups.collapsibleParentIds.length > 0 &&
    hierarchyGroups.collapsibleParentIds.every((idVal) =>
      collapsedNodeIds.has(idVal),
    )

  const toggleCollapseAll = () => {
    if (allCollapsibleCollapsed) {
      setCollapsedNodeIds(new Set())
      setCollapsedEraIds(new Set())
    } else {
      setCollapsedNodeIds(new Set(hierarchyGroups.collapsibleParentIds))
    }
  }

  const resolveDefaultCreateOptions = (): CreateMilitaryUnitDefaults => ({
    historicalCountryId:
      eraFilter !== 'ALL' && eraFilter !== 'MODERN'
        ? eraFilter
        : isHistorical
          ? targetId
          : null,
    administrationDepartmentId:
      deptFilter !== 'ALL' && deptFilter !== 'UNLINKED' ? deptFilter : null,
    branch:
      branchFilter !== 'ALL' && branchFilter !== 'UNSPECIFIED'
        ? branchFilter
        : null,
  })

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    echelonGroupFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    parsedSnapshotYear != null ||
    eraFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    branchFilter !== 'ALL'

  const resetAllFilters = () => {
    setSearchQuery('')
    setEchelonGroupFilter('ALL')
    setStatusFilter('ALL')
    setSnapshotYearInput('')
    setEraFilter('ALL')
    setDeptFilter('ALL')
    setBranchFilter('ALL')
  }

  const activeEraName =
    eraFilter === 'MODERN'
      ? '현대 직속'
      : isHistorical && eraFilter === targetId
        ? `${country?.name ?? '본국'} 직속`
        : (historicalErasAvailable.find((eraItem) => eraItem.id === eraFilter)
            ?.name ?? null)

  const activeDeptName =
    deptFilter === 'UNLINKED'
      ? '지휘부 미지정'
      : (commandDepartments.find((deptItem) => deptItem.id === deptFilter)
          ?.name ?? null)

  const activeBranchName =
    branchFilter === 'UNSPECIFIED'
      ? '군종 미지정'
      : (MILITARY_BRANCH_LABELS[branchFilter] ?? null)

  const renderTreeNode = (
    unitItem: ExtendedMilitaryUnit,
    depth: number,
    visitedIds: Set<string>,
    hideEraInMeta = false,
  ) => {
    if (visitedIds.has(unitItem.id)) return null
    const nextVisited = new Set(visitedIds)
    nextVisited.add(unitItem.id)

    const children =
      hierarchyGroups.childrenByParentId.get(unitItem.id) ?? []
    const hasChildren = children.length > 0
    const isCollapsed = collapsedNodeIds.has(unitItem.id)
    const isSelected = selectedUnitId === unitItem.id
    const periodLabel = formatUnitCompactPeriod(unitItem)

    const metaTextParts: string[] = []
    if (periodLabel) metaTextParts.push(periodLabel)
    if (unitItem.branch && branchFilter === 'ALL') {
      metaTextParts.push(
        MILITARY_BRANCH_LABELS[unitItem.branch] ?? unitItem.branch,
      )
    }
    if (
      !hideEraInMeta &&
      eraFilter === 'ALL' &&
      (!isHistorical || unitItem.historicalCountryId !== targetId) &&
      unitItem.historicalCountry?.name
    ) {
      metaTextParts.push(unitItem.historicalCountry.name)
    }

    return (
      <div key={unitItem.id} style={{ minWidth: 0 }}>
        <TreeRow
          $selected={isSelected}
          $depth={depth}
          onClick={() => selectUnit(unitItem.id)}
        >
          <TreeCaretSlot>
            {hasChildren ? (
              <CollapseToggleBtn
                type="button"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? '예하 부대 펼치기' : '예하 부대 접기'}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleNodeCollapse(unitItem.id)
                }}
              >
                {isCollapsed ? (
                  <FiChevronRight size={14} />
                ) : (
                  <FiChevronDown size={14} />
                )}
              </CollapseToggleBtn>
            ) : (
              <TreeLeafDot $selected={isSelected} />
            )}
          </TreeCaretSlot>

          <TreeMainBtn type="button" onClick={() => selectUnit(unitItem.id)}>
            <UnitEmblemThumb unitItem={unitItem} size={26} isDark={isDark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <TreeTitleLine $selected={isSelected}>
                <span>{unitItem.name}</span>
                {unitItem.abbreviation?.trim() ? (
                  <TreeAbbrSpan>
                    ({unitItem.abbreviation.trim()})
                  </TreeAbbrSpan>
                ) : null}
                {unitItem.unitType ? (
                  <EchelonMiniBadge $echelon={unitItem.unitType}>
                    {MILITARY_UNIT_TYPE_LABELS[
                      unitItem.unitType as MilitaryUnitType
                    ] ?? unitItem.unitType}
                  </EchelonMiniBadge>
                ) : null}
                {hasChildren ? (
                  <TreeCountHint>예하 {children.length}</TreeCountHint>
                ) : null}
              </TreeTitleLine>

              {(metaTextParts.length > 0 || unitItem.isActive === false) && (
                <TreeMetaStrip>
                  {metaTextParts.length > 0 ? (
                    <TreeLifespanSpan>
                      {metaTextParts.join(' · ')}
                    </TreeLifespanSpan>
                  ) : null}
                  {unitItem.isActive === false ? (
                    <TreeDisbandedBadge>해체</TreeDisbandedBadge>
                  ) : null}
                </TreeMetaStrip>
              )}
            </div>
          </TreeMainBtn>
        </TreeRow>

        {hasChildren && !isCollapsed ? (
          <TreeChildrenGroup>
            {children.map((childUnit) =>
              renderTreeNode(childUnit, depth + 1, nextVisited, hideEraInMeta),
            )}
          </TreeChildrenGroup>
        ) : null}
      </div>
    )
  }

  const renderDeptGroupsList = (
    deptGroups: typeof hierarchyGroups.groups,
    hideEraInMeta = false,
  ) =>
    deptGroups.map((groupItem, groupIdx) => {
      const showGroupHeader =
        deptGroups.length > 1 || Boolean(groupItem.departmentId)
      return (
        <div key={groupItem.key}>
          {showGroupHeader ? (
            <DeptGroupHeaderBar $first={groupIdx === 0 && !hideEraInMeta}>
              <DeptGroupTitleWrap>
                <FiShield size={13} />
                <DeptGroupName>{groupItem.departmentName}</DeptGroupName>
                {groupItem.departmentAbbreviation ? (
                  <DeptGroupAbbr>
                    ({groupItem.departmentAbbreviation})
                  </DeptGroupAbbr>
                ) : null}
                <DeptGroupCountPill>
                  {groupItem.roots.length}
                </DeptGroupCountPill>
              </DeptGroupTitleWrap>
              <DeptGroupRightActions>
                <PopoverMenu
                  size="sm"
                  ariaLabel={`${groupItem.departmentName} 그룹 메뉴`}
                  title="직할 편제 추가 · 소관 부처 이동"
                  minWidth={190}
                  items={[
                    {
                      id: 'add-direct',
                      label: '이 부처 직할 편제 추가',
                      icon: <FiPlus size={12.5} />,
                      onSelect: () =>
                        onCreateUnit({
                          administrationDepartmentId: groupItem.departmentId,
                          historicalCountryId: groupItem.historicalCountryId,
                          branch:
                            branchFilter !== 'ALL' &&
                            branchFilter !== 'UNSPECIFIED'
                              ? branchFilter
                              : null,
                        }),
                    },
                    ...(groupItem.departmentId && onNavigateToDepartment
                      ? [
                          {
                            id: 'open-dept',
                            label: '소관 부처 상세 보기',
                            icon: <FiArrowUpRight size={12.5} />,
                            onSelect: () =>
                              onNavigateToDepartment(groupItem.departmentId!),
                          },
                        ]
                      : []),
                  ]}
                />
              </DeptGroupRightActions>
            </DeptGroupHeaderBar>
          ) : null}
          {groupItem.roots.map((rootUnit) =>
            renderTreeNode(rootUnit, 0, new Set(), hideEraInMeta),
          )}
        </div>
      )
    })

  const renderTreePanel = () => (
    <TreeContainer>
      <TreeScrollArea>
        {hierarchyGroups.eraSections ? (
          hierarchyGroups.eraSections.map((eraSection) => {
            const isEraCollapsed = collapsedEraIds.has(eraSection.id)
            return (
              <div key={eraSection.id}>
                <EraStickyHeaderBar>
                  <EraStickyToggleBtn
                    type="button"
                    aria-expanded={!isEraCollapsed}
                    onClick={() => toggleEraCollapse(eraSection.id)}
                  >
                    {isEraCollapsed ? (
                      <FiChevronRight size={13} />
                    ) : (
                      <FiChevronDown size={13} />
                    )}
                    <EraStickyTitle>{eraSection.label}</EraStickyTitle>
                    <DeptGroupCountPill>
                      {eraSection.totalCount}
                    </DeptGroupCountPill>
                  </EraStickyToggleBtn>
                  <PopoverMenu
                    size="sm"
                    ariaLabel={`${eraSection.label} 설정 메뉴`}
                    title="이 시대 편제 추가"
                    minWidth={172}
                    items={[
                      {
                        id: 'add-era-unit',
                        label: '이 시대 편제 추가',
                        icon: <FiPlus size={12.5} />,
                        onSelect: () =>
                          onCreateUnit({
                            historicalCountryId: eraSection.historicalCountryId,
                            administrationDepartmentId:
                              deptFilter !== 'ALL' && deptFilter !== 'UNLINKED'
                                ? deptFilter
                                : null,
                            branch:
                              branchFilter !== 'ALL' &&
                              branchFilter !== 'UNSPECIFIED'
                                ? branchFilter
                                : null,
                          }),
                      },
                    ]}
                  />
                </EraStickyHeaderBar>
                {!isEraCollapsed
                  ? renderDeptGroupsList(eraSection.deptGroups, true)
                  : null}
              </div>
            )
          })
        ) : (
          renderDeptGroupsList(hierarchyGroups.groups, false)
        )}
      </TreeScrollArea>
    </TreeContainer>
  )

  const scopedUnitsForDetail =
    countryUnits as unknown as MilitaryUnitDetailResponse[]

  return (
    <>
      <SectionRoot aria-label="군사 조직 및 편제 현황">
        <GovToolbarShell>
          <GovToolbarRow>
            <GovPromSearch>
              <FiSearch size={14} aria-hidden />
              <GovPromSearchInput
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="부대·사령부명, 약칭, 별칭, 지휘관, 주둔지 검색…"
                aria-label="부대 이름 및 지휘관 검색"
              />
              {searchQuery ? (
                <GovPromSearchClear
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchQuery('')}
                >
                  <FiX size={12} />
                </GovPromSearchClear>
              ) : null}
            </GovPromSearch>

            {historicalErasAvailable.length > 0 ? (
              <ToolbarSelect
                aria-label={
                  isHistorical ? '소속 정치체 필터' : '시대·정체 필터'
                }
                value={eraFilter}
                onChange={(event) => setEraFilter(event.target.value)}
              >
                <option value="ALL">
                  {isHistorical
                    ? `전체 본국·구성국 (${countryUnits.length})`
                    : `전체 시대 (${countryUnits.length})`}
                </option>
                {isHistorical && targetId ? (
                  <option value={targetId}>
                    {country?.name ?? '본국'} 직속 ({directCountryUnitCount})
                  </option>
                ) : directCountryUnitCount > 0 ? (
                  <option value="MODERN">
                    현대 직속 ({directCountryUnitCount})
                  </option>
                ) : null}
                {historicalErasAvailable.map((eraItem) => (
                  <option key={eraItem.id} value={eraItem.id}>
                    {eraItem.name} ({eraItem.count})
                  </option>
                ))}
              </ToolbarSelect>
            ) : null}

            {branchTabs.length > 1 ? (
              <ToolbarSelect
                aria-label="군종별 편제 필터"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
              >
                {branchTabs.map((tabItem) => (
                  <option key={tabItem.id} value={tabItem.id}>
                    {tabItem.label} ({tabItem.count})
                  </option>
                ))}
              </ToolbarSelect>
            ) : null}

            <GovToolbarRight>
              <GovViewMeta>
                표시 <strong>{filteredUnits.length}</strong> · 전체{' '}
                <strong>{countryUnits.length}</strong>
              </GovViewMeta>

              <GovToolbarDivider />

              <GovToolbarGroup role="group" aria-label="목록 표시 방식">
                <GovToolbarBtn
                  type="button"
                  $active={browseViewMode === 'TREE'}
                  onClick={() => setBrowseViewMode('TREE')}
                  title="상하 위계 편제 트리 보기"
                >
                  <FiGitBranch size={12.5} />
                  <span>편제 트리</span>
                </GovToolbarBtn>
                <GovToolbarBtn
                  type="button"
                  $active={browseViewMode === 'LEDGER'}
                  onClick={() => setBrowseViewMode('LEDGER')}
                  title="창설·해체일, 제대·군종, 상급 편제·전과 원장 표 보기"
                >
                  <FiList size={12.5} />
                  <span>원장 표</span>
                </GovToolbarBtn>
              </GovToolbarGroup>

              <PopoverMenu
                ariaLabel="화면 보기 및 상세 필터 설정"
                title="화면 레이아웃 · 시대별 묶음 · 상세 필터 설정"
                minWidth={272}
                active={
                  echelonGroupFilter !== 'ALL' ||
                  statusFilter !== 'ALL' ||
                  deptFilter !== 'ALL' ||
                  parsedSnapshotYear != null ||
                  layoutMode === 'SPLIT'
                }
              >
                {(closeMenu) => (
                  <>
                    <PopoverMenuSectionLabel>
                      화면 레이아웃
                    </PopoverMenuSectionLabel>
                    <PopoverMenuItem
                      type="button"
                      onClick={() => {
                        setLayoutMode('FOCUS')
                        closeMenu()
                      }}
                    >
                      <FiMaximize2 size={13} />
                      <span>전체폭 목록 + 드로어 상세 (권장)</span>
                      {layoutMode === 'FOCUS' ? (
                        <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                      ) : null}
                    </PopoverMenuItem>
                    <PopoverMenuItem
                      type="button"
                      onClick={() => {
                        setLayoutMode('SPLIT')
                        closeMenu()
                      }}
                    >
                      <FiColumns size={13} />
                      <span>좌측 목록 · 우측 상세 2단 분할</span>
                      {layoutMode === 'SPLIT' ? (
                        <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                      ) : null}
                    </PopoverMenuItem>

                    {browseViewMode === 'TREE' ? (
                      <>
                        <PopoverMenuDivider />
                        <PopoverMenuSectionLabel>
                          편제 트리 설정
                        </PopoverMenuSectionLabel>
                        {eraFilter === 'ALL' &&
                        historicalErasAvailable.length > 0 ? (
                          <PopoverMenuItem
                            type="button"
                            onClick={() => setGroupByEra((prev) => !prev)}
                          >
                            <FiLayers size={13} />
                            <span>시대 · 정체별 섹션 묶음</span>
                            {groupByEra ? (
                              <FiCheck
                                size={13}
                                style={{ marginLeft: 'auto' }}
                              />
                            ) : null}
                          </PopoverMenuItem>
                        ) : null}
                        {hierarchyGroups.collapsibleParentIds.length > 0 ? (
                          <PopoverMenuItem
                            type="button"
                            onClick={() => {
                              toggleCollapseAll()
                              closeMenu()
                            }}
                          >
                            <FiGitBranch size={13} />
                            <span>
                              {allCollapsibleCollapsed
                                ? '하위 편제 모두 펼치기'
                                : '하위 편제 모두 접기'}
                            </span>
                          </PopoverMenuItem>
                        ) : null}
                      </>
                    ) : null}

                    <PopoverMenuDivider />
                    <PopoverMenuSectionLabel>
                      제대 위계 필터
                    </PopoverMenuSectionLabel>
                    <PopoverPillGrid>
                      {(
                        [
                          'ALL',
                          'HIGH_COMMAND',
                          'OPERATIONAL',
                          'TACTICAL',
                        ] as const
                      ).map((groupKey) => (
                        <PopoverPillBtn
                          key={groupKey}
                          type="button"
                          $active={echelonGroupFilter === groupKey}
                          onClick={() => setEchelonGroupFilter(groupKey)}
                        >
                          {ECHELON_GROUP_LABELS[groupKey]}
                        </PopoverPillBtn>
                      ))}
                    </PopoverPillGrid>

                    <PopoverMenuSectionLabel>
                      운용 상태 필터
                    </PopoverMenuSectionLabel>
                    <PopoverPillGrid>
                      {(['ALL', 'ACTIVE', 'DISBANDED'] as const).map(
                        (statusKey) => (
                          <PopoverPillBtn
                            key={statusKey}
                            type="button"
                            $active={statusFilter === statusKey}
                            onClick={() => setStatusFilter(statusKey)}
                          >
                            {STATUS_FILTER_LABELS[statusKey]}
                          </PopoverPillBtn>
                        ),
                      )}
                    </PopoverPillGrid>

                    {commandDepartments.length > 0 ? (
                      <>
                        <PopoverMenuSectionLabel>
                          소관 국방 · 군정부처
                        </PopoverMenuSectionLabel>
                        <ToolbarSelect
                          aria-label="소관 국방·군정부처 필터"
                          value={deptFilter}
                          onChange={(event) =>
                            setDeptFilter(event.target.value)
                          }
                          style={{ width: '100%' }}
                        >
                          <option value="ALL">
                            전체 지휘부 ({countryUnits.length})
                          </option>
                          {commandDepartments.map((deptItem) => (
                            <option key={deptItem.id} value={deptItem.id}>
                              {deptItem.name}
                              {deptItem.abbreviation
                                ? ` (${deptItem.abbreviation})`
                                : ''}{' '}
                              ({deptItem.count})
                            </option>
                          ))}
                          {unlinkedDeptUnitCount > 0 ? (
                            <option value="UNLINKED">
                              지휘부 미지정 ({unlinkedDeptUnitCount})
                            </option>
                          ) : null}
                        </ToolbarSelect>
                      </>
                    ) : null}

                    <PopoverMenuSectionLabel>
                      기준 연도 스냅샷
                    </PopoverMenuSectionLabel>
                    <SnapshotYearWrap
                      style={{ width: '100%' }}
                      title="특정 연도(예: 1941, BC 221)에 존재했던 군부대만 필터링합니다"
                    >
                      <FiCalendar size={12.5} aria-hidden />
                      <SnapshotYearInput
                        type="text"
                        value={snapshotYearInput}
                        onChange={(changeEvt) =>
                          setSnapshotYearInput(changeEvt.target.value)
                        }
                        placeholder="연도 입력 (예: 1941, BC 221)"
                        aria-label="기준 연도 스냅샷 필터"
                        style={{ width: '100%' }}
                      />
                      {snapshotYearInput ? (
                        <GovPromSearchClear
                          type="button"
                          aria-label="기준 연도 지우기"
                          onClick={() => setSnapshotYearInput('')}
                        >
                          <FiX size={11} />
                        </GovPromSearchClear>
                      ) : null}
                    </SnapshotYearWrap>

                    {hasActiveFilters ? (
                      <>
                        <PopoverMenuDivider />
                        <PopoverMenuItem
                          type="button"
                          $danger
                          onClick={() => {
                            resetAllFilters()
                            closeMenu()
                          }}
                        >
                          <FiRotateCcw size={13} />
                          <span>모든 필터 초기화</span>
                        </PopoverMenuItem>
                      </>
                    ) : null}
                  </>
                )}
              </PopoverMenu>

              {!hidePrimaryCta ? (
                <GovPrimaryBtn
                  type="button"
                  onClick={() => onCreateUnit(resolveDefaultCreateOptions())}
                >
                  <FiPlus size={14} />
                  <span>사령부·부대 등록</span>
                </GovPrimaryBtn>
              ) : null}
            </GovToolbarRight>
          </GovToolbarRow>

          {hasActiveFilters ? (
            <GovActiveFiltersRow>
              {searchQuery.trim() ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setSearchQuery('')}
                >
                  검색: &ldquo;{searchQuery.trim()}&rdquo;
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {echelonGroupFilter !== 'ALL' ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setEchelonGroupFilter('ALL')}
                >
                  제대: {ECHELON_GROUP_LABELS[echelonGroupFilter]}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {statusFilter !== 'ALL' ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                >
                  상태: {STATUS_FILTER_LABELS[statusFilter]}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {parsedSnapshotYear != null ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setSnapshotYearInput('')}
                >
                  기준 연도:{' '}
                  {parsedSnapshotYear < 0
                    ? `BC ${Math.abs(parsedSnapshotYear)}년`
                    : `${parsedSnapshotYear}년`}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {eraFilter !== 'ALL' && activeEraName ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setEraFilter('ALL')}
                >
                  시대: {activeEraName}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {deptFilter !== 'ALL' && activeDeptName ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setDeptFilter('ALL')}
                >
                  지휘부: {activeDeptName}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              {branchFilter !== 'ALL' && activeBranchName ? (
                <GovActiveFilterChip
                  type="button"
                  onClick={() => setBranchFilter('ALL')}
                >
                  군종: {activeBranchName}
                  <FiX size={11} />
                </GovActiveFilterChip>
              ) : null}
              <GovClearFiltersBtn type="button" onClick={resetAllFilters}>
                필터 초기화
              </GovClearFiltersBtn>
            </GovActiveFiltersRow>
          ) : null}
        </GovToolbarShell>

        <UnlinkedCountryTenuresBar
          mode="MILITARY_UNIT"
          effectiveCountryId={targetId || undefined}
          isHistorical={isHistorical}
          targetOptions={countryUnits.map((unitRow) => ({
            id: unitRow.id,
            label: unitRow.historicalCountry?.name
              ? `[${unitRow.historicalCountry.name}] ${unitRow.name}`
              : unitRow.name,
            historicalCountryId: unitRow.historicalCountryId ?? null,
          }))}
          onRequestCreateTarget={(tenureHistCountryId) =>
            onCreateUnit({
              historicalCountryId: tenureHistCountryId,
            })
          }
        />

        <WorkspaceStage>
          {unitsQuery.isLoading ? (
            <ChartSkeleton variant="bars" rows={5} />
          ) : countryUnits.length === 0 ? (
            <EmptyStateSpotlight
              flat
              icon={<FiShield size={30} strokeWidth={1.75} />}
              title="등록된 군사 사령부·편제가 없습니다"
              description="최고사령부·참모본부·각군 총사령부부터 전구·집단군·야전군·군단·사단·함대까지 첫 군사 편제를 등록해 보세요."
              primaryAction={{
                label: '사령부·부대 등록',
                onClick: () => onCreateUnit(resolveDefaultCreateOptions()),
                icon: <FiPlus size={16} strokeWidth={2.25} />,
              }}
            />
          ) : filteredUnits.length === 0 ? (
            <EmptyStateSpotlight
              flat
              icon={<FiShield size={28} strokeWidth={1.75} />}
              title="조건에 일치하는 군사 편제가 없습니다"
              description="선택한 검색어나 제대·군종·시대·연도 조건에 해당하는 사령부·부대가 없습니다. 이 조건으로 새 부대를 등록하거나 필터를 초기화해 보세요."
              primaryAction={{
                label: '현재 조건으로 부대 등록',
                onClick: () => onCreateUnit(resolveDefaultCreateOptions()),
                icon: <FiPlus size={15} strokeWidth={2.25} />,
              }}
            />
          ) : layoutMode === 'SPLIT' ? (
            <SplitWorkspaceGrid $ledgerView={browseViewMode === 'LEDGER'}>
              <TreeLedgerColumn>
                {browseViewMode === 'LEDGER' ? (
                  <MilitaryUnitsLedgerView
                    units={filteredUnits}
                    allUnits={countryUnits}
                    selectedUnitId={selectedUnitId}
                    compact
                    isHistorical={isHistorical}
                    targetPolityId={targetId}
                    unitTypeLabels={MILITARY_UNIT_TYPE_LABELS}
                    branchLabels={MILITARY_BRANCH_LABELS}
                    echelonOrder={MILITARY_ECHELON_ORDER}
                    resolveEffectiveDepartment={resolveEffectiveDepartment}
                    onSelectUnit={(unitItem) => selectUnit(unitItem.id)}
                    onAddRoot={() =>
                      onCreateUnit(resolveDefaultCreateOptions())
                    }
                  />
                ) : (
                  renderTreePanel()
                )}
              </TreeLedgerColumn>

              <GovLedgerPanel>
                {selectedUnitId ? (
                  <EmbeddedDetailPad>
                    <MilitaryUnitDetailContent
                      unitId={selectedUnitId}
                      variant="embedded"
                      scopedUnits={scopedUnitsForDetail}
                      onSelectUnit={(nextId) => selectUnit(nextId)}
                      onEditUnit={onEditUnit}
                      onCreateSubUnit={(defaults) =>
                        onCreateUnit({
                          parentUnitId: defaults.parentUnitId,
                          administrationDepartmentId:
                            defaults.administrationDepartmentId,
                          historicalCountryId: defaults.historicalCountryId,
                          branch: defaults.branch,
                        })
                      }
                      onDeleted={() => selectUnit(null)}
                      onNavigateToDepartment={onNavigateToDepartment}
                      onCloseEmbedded={() => selectUnit(null)}
                    />
                  </EmbeddedDetailPad>
                ) : (
                  <EmptyDetailPlaceholder>
                    좌측 편제 트리에서 사령부·부대를 선택하면 지휘 계통, 개편
                    계보, 역대 지휘관 재임, 지령 및 참전 전투 기록이 표시됩니다.
                  </EmptyDetailPlaceholder>
                )}
              </GovLedgerPanel>
            </SplitWorkspaceGrid>
          ) : (
            <GovLedgerPanel>
              {browseViewMode === 'LEDGER' ? (
                <MilitaryUnitsLedgerView
                  units={filteredUnits}
                  allUnits={countryUnits}
                  selectedUnitId={selectedUnitId}
                  isHistorical={isHistorical}
                  targetPolityId={targetId}
                  unitTypeLabels={MILITARY_UNIT_TYPE_LABELS}
                  branchLabels={MILITARY_BRANCH_LABELS}
                  echelonOrder={MILITARY_ECHELON_ORDER}
                  resolveEffectiveDepartment={resolveEffectiveDepartment}
                  onSelectUnit={(unitItem) => selectUnit(unitItem.id)}
                  onAddRoot={() => onCreateUnit(resolveDefaultCreateOptions())}
                />
              ) : (
                renderTreePanel()
              )}
            </GovLedgerPanel>
          )}
        </WorkspaceStage>
      </SectionRoot>

      {/* FOCUS 모드(기본): 카탈로그와 동일한 통합 슬라이드 드로어 상세 */}
      {layoutMode === 'FOCUS' ? (
        <MilitaryUnitDetailDrawer
          unitId={selectedUnitId}
          scopedUnits={scopedUnitsForDetail}
          onClose={() => selectUnit(null)}
          onSelectUnit={(nextId) => selectUnit(nextId)}
          onEditUnit={onEditUnit}
          onCreateSubUnit={(defaults) =>
            onCreateUnit({
              parentUnitId: defaults.parentUnitId,
              administrationDepartmentId: defaults.administrationDepartmentId,
              historicalCountryId: defaults.historicalCountryId,
              branch: defaults.branch,
            })
          }
          onNavigateToDepartment={onNavigateToDepartment}
        />
      ) : null}
    </>
  )
}

const SectionRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const WorkspaceStage = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const SplitWorkspaceGrid = styled.div<{ $ledgerView?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $ledgerView }) =>
    $ledgerView
      ? 'minmax(360px, 44%) minmax(0, 1fr)'
      : 'minmax(320px, 38%) minmax(0, 1fr)'};
  gap: 14px;
  align-items: start;
  min-width: 0;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`

const TreeLedgerColumn = styled.div`
  border: 1px solid ${GOV_ROW_HAIRLINE};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);
  min-width: 0;
`

const EmbeddedDetailPad = styled.div`
  padding: 12px;
`

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
`

const TreeScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 180px;
`

const EraStickyHeaderBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#161b26' : '#f4f6fa'};
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
`

const EraStickyToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
`

const EraStickyTitle = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DeptGroupHeaderBar = styled.div<{ $first?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.025)'
      : 'rgba(20, 19, 34, 0.025)'};
  border-top: ${({ $first }) => ($first ? 'none' : `1px solid ${GOV_ROW_HAIRLINE}`)};
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
`

const DeptGroupTitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptGroupName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DeptGroupAbbr = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeptGroupCountPill = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(20, 19, 34, 0.07)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptGroupRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const TreeRow = styled.div<{ $selected: boolean; $depth: number }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 8px ${({ $depth }) => 10 + Math.min($depth, 6) * 20}px;
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
  background: ${({ theme, $selected }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(79, 70, 229, 0.07)'
      : 'transparent'};
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.18)'
          : 'rgba(79, 70, 229, 0.09)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.03)'
          : 'rgba(20, 19, 34, 0.025)'};
  }
`

const TreeCaretSlot = styled.div`
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const CollapseToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(20, 19, 34, 0.06)'};
  }
`

const TreeLeafDot = styled.span<{ $selected?: boolean }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme, $selected }) =>
    $selected ? GOV_BRAND.primary : theme.colors.text.tertiary};
  opacity: ${({ $selected }) => ($selected ? 1 : 0.45)};
`

const TreeMainBtn = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
`

const TreeTitleLine = styled.div<{ $selected?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 600)};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

const TreeAbbrSpan = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EchelonMiniBadge = styled.span<{ $echelon: string }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme, $echelon }) =>
    HIGH_COMMAND_ECHELONS.has($echelon)
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.2)'
        : 'rgba(109, 40, 217, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.06)'};
  color: ${({ theme, $echelon }) =>
    HIGH_COMMAND_ECHELONS.has($echelon)
      ? theme.mode === 'dark'
        ? '#c4b5fd'
        : '#5b21b6'
      : theme.colors.text.secondary};
`

const TreeCountHint = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeMetaStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`

const TreeLifespanSpan = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeDisbandedBadge = styled.span`
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeChildrenGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const ToolbarSelect = styled.select`
  height: 32px;
  padding: 0 26px 0 10px;
  border-radius: 8px;
  border: 1px solid ${GOV_ROW_HAIRLINE};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  max-width: 210px;
`

const SnapshotYearWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid ${GOV_ROW_HAIRLINE};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  box-sizing: border-box;
`

const SnapshotYearInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  min-width: 0;
`

const PopoverPillGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 4px 6px;
`

const PopoverPillBtn = styled.button<{ $active: boolean }>`
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? GOV_BRAND.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(79, 70, 229, 0.1)'
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? GOV_BRAND.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

const EmptyDetailPlaceholder = styled.div`
  padding: 56px 24px;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
