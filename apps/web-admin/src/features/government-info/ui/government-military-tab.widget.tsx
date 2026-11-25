/**
 * 국가 상세 › 군사 › 편제 · 사령부 지면.
 *
 * 설계 원칙:
 * 1. 슬라이드 사이드바(Drawer) 없이 사령부·부대 행 클릭 시 곧바로 단독 상세 페이지(`/military/units/:unitId`)로 진입
 * 2. 국가 원장(`country-ledger-primitives`) 디자인 시스템 통일 — 1px 헤어라인, 평면 표면, 인디고 단일 강조색, 34px 툴바
 * 3. 상단 4단 제대 요약 스트립(전체 / 상급지휘부 / 작전·전략 / 전술·부대 원클릭 필터) + 군종·시대 알약 칩
 * 4. 지휘 계통 레일(`TreeChildrenRail`)과 주둔지·대표 지휘관·참전 전과·병력 요약이 한눈에 읽히는 편제 트리 및 원장 표 제공
 */
import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAnchor,
  FiArrowUpRight,
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCompass,
  FiCornerDownRight,
  FiCrosshair,
  FiEdit2,
  FiGitBranch,
  FiLayers,
  FiList,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
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
import type { MilitaryUnitType } from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import {
  PopoverMenu,
  PopoverMenuDivider,
  PopoverMenuItem,
  PopoverMenuSectionLabel,
} from '@/shared/ui/popover-menu'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  LedgerCompactAction,
  LedgerFilterChip,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  LedgerPrimaryButton,
  LedgerSearchBox,
  LedgerSearchInput,
  ledgerSubtleFill,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
  RADIUS,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'

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
  hidePrimaryCta?: boolean
  onOpenUnitDetail?: (unitId: string) => void
  onCreateUnit: (defaults?: CreateMilitaryUnitDefaults) => void
  onEditUnit: (unitId: string) => void
  onNavigateToDepartment?: (departmentId: string) => void
}

type EchelonGroupKey = 'ALL' | 'HIGH_COMMAND' | 'OPERATIONAL' | 'TACTICAL'
type UnitStatusFilter = 'ALL' | 'ACTIVE' | 'DISBANDED'
type BrowseViewMode = 'TREE' | 'LEDGER'

const ECHELON_GROUP_LABELS: Record<EchelonGroupKey, string> = {
  ALL: '전체 편제',
  HIGH_COMMAND: '최고 · 상급지휘부',
  OPERATIONAL: '작전 · 전략 제대',
  TACTICAL: '전술 · 특수 부대',
}

const STATUS_FILTER_LABELS: Record<UnitStatusFilter, string> = {
  ALL: '전체 상태',
  ACTIVE: '현역·운용',
  DISBANDED: '해체·폐지',
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
  strength?: string | null
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
  if (estStr && disStr) return `${estStr} ~ ${disStr}`
  if (estStr) return `${estStr} ~ ${unitItem.isActive === false ? '해체' : '현재'}`
  return `~ ${disStr}`
}

function resolveUnitLeadCommander(unitItem: ExtendedMilitaryUnit): string | null {
  const firstTenure = unitItem.tenures?.[0]
  if (firstTenure?.person) {
    const nameStr =
      getPersonDisplayName({
        name: firstTenure.person.name ?? '',
        surname: firstTenure.person.surname ?? undefined,
        middleName: firstTenure.person.middleName ?? undefined,
        country: firstTenure.person.country ?? undefined,
      }) || firstTenure.person.name
    if (nameStr) {
      return firstTenure.rankTitle
        ? `${firstTenure.rankTitle} ${nameStr}`
        : nameStr
    }
  }
  const leadCmd = unitItem.commanders?.[0]
  if (leadCmd?.person) {
    const nameStr =
      getPersonDisplayName({
        name: leadCmd.person.name ?? '',
        surname: leadCmd.person.surname ?? undefined,
      }) || leadCmd.person.name
    if (nameStr) {
      return leadCmd.rank ? `${leadCmd.rank} ${nameStr}` : nameStr
    }
  }
  return null
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
  size = 14,
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
  size = 30,
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
      <EmblemImg
        src={resolvedSrc}
        alt=""
        width={size}
        height={size}
        $size={size}
        onError={() => setImgFailed(true)}
      />
    )
  }

  const tier = getEchelonGroup(unitItem.unitType)
  return (
    <EmblemFallback $size={size} $tier={tier} $dark={isDark}>
      {renderUnitBranchIcon(unitItem.branch, unitItem.unitType, size * 0.48)}
    </EmblemFallback>
  )
}

export function GovernmentMilitaryTab({
  country,
  effectiveCountryId,
  hidePrimaryCta = false,
  onOpenUnitDetail,
  onCreateUnit,
  onEditUnit,
  onNavigateToDepartment,
}: GovernmentMilitaryTabProps) {
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const isHistorical = country?.type === 'historical'
  const targetId = effectiveCountryId ?? country?.id ?? ''

  const [browseViewMode, setBrowseViewMode] = useState<BrowseViewMode>('TREE')
  const [groupByEra, setGroupByEra] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [echelonGroupFilter, setEchelonGroupFilter] =
    useState<EchelonGroupKey>('ALL')
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('ALL')
  const [snapshotYearInput, setSnapshotYearInput] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')

  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [collapsedEraIds, setCollapsedEraIds] = useState<Set<string>>(
    () => new Set(),
  )

  const openUnitDetail = (unitId: string) => {
    if (onOpenUnitDetail) {
      onOpenUnitDetail(unitId)
      return
    }
    navigate(pathKeys.militaryUnitDetail(unitId), {
      state: targetId
        ? {
            fromCountry: {
              id: targetId,
              name: country?.name ?? null,
            },
          }
        : undefined,
    })
  }

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

  const tierStats = useMemo(() => {
    let highCommand = 0
    let operational = 0
    let tactical = 0
    let commanderCount = 0
    let combatLinks = 0

    for (const unitItem of countryUnits) {
      const grp = getEchelonGroup(unitItem.unitType)
      if (grp === 'HIGH_COMMAND') highCommand += 1
      else if (grp === 'OPERATIONAL') operational += 1
      else tactical += 1

      const tLen = unitItem.tenures?.length ?? 0
      const legacyLen = (unitItem.commanders ?? []).filter(
        (cmdItem) => !cmdItem.tenureId,
      ).length
      commanderCount += tLen + legacyLen
      combatLinks +=
        (unitItem.sideDeployedUnits?.length ?? 0) +
        (unitItem.eventRelations?.length ?? 0)
    }

    return {
      total: countryUnits.length,
      highCommand,
      operational,
      tactical,
      commanderCount,
      combatLinks,
    }
  }, [countryUnits])

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
        label: '전체',
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

    const buildDeptGroups = (
      targetRoots: ExtendedMilitaryUnit[],
    ): DeptGroup[] => {
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

  const createSubUnitUnder = (parentUnit: LedgerMilitaryUnitItem) => {
    const effDept = resolveEffectiveDepartment(parentUnit)
    onCreateUnit({
      parentUnitId: parentUnit.id,
      administrationDepartmentId:
        parentUnit.administrationDepartmentId ?? effDept?.id ?? null,
      historicalCountryId:
        parentUnit.historicalCountryId ?? (isHistorical ? targetId : null),
      branch: parentUnit.branch ?? null,
    })
  }

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
    const periodLabel = formatUnitCompactPeriod(unitItem)
    const isDisbanded = unitItem.isActive === false
    const echelonTier = getEchelonGroup(unitItem.unitType)

    const branchText =
      unitItem.branch && branchFilter === 'ALL'
        ? (MILITARY_BRANCH_LABELS[unitItem.branch] ?? unitItem.branch)
        : null
    const eraTagText =
      !hideEraInMeta &&
      eraFilter === 'ALL' &&
      (!isHistorical || unitItem.historicalCountryId !== targetId) &&
      unitItem.historicalCountry?.name
        ? unitItem.historicalCountry.name
        : null

    const garrisonText = unitItem.garrison?.trim() || null
    const strengthFirstLine = unitItem.strength?.trim()
      ? unitItem.strength.trim().split('\n')[0].slice(0, 52)
      : null
    const leadCommander = resolveUnitLeadCommander(unitItem)
    const combatCount =
      (unitItem.sideDeployedUnits?.length ?? 0) +
      (unitItem.eventRelations?.length ?? 0)
    const vesselCount =
      (unitItem.assignedNavalVessels ?? unitItem.navalVessels ?? []).length

    return (
      <TreeNodeWrap key={unitItem.id}>
        <TreeRow
          role="link"
          tabIndex={0}
          aria-label={`${unitItem.name} 상세 보기`}
          onClick={() => openUnitDetail(unitItem.id)}
          onKeyDown={(keyEvt) => {
            if (keyEvt.key === 'Enter' || keyEvt.key === ' ') {
              keyEvt.preventDefault()
              openUnitDetail(unitItem.id)
            }
          }}
        >
          <TreeLeftCluster>
            {depth > 0 ? (
              <ChildBranchConnector aria-hidden="true">
                <FiCornerDownRight size={12} />
              </ChildBranchConnector>
            ) : null}

            <TreeCaretSlot>
              {hasChildren ? (
                <CollapseToggleBtn
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? '예하 부대 펼치기' : '예하 부대 접기'}
                  title={
                    isCollapsed
                      ? `예하 ${children.length}개 편제 펼치기`
                      : `예하 ${children.length}개 편제 접기`
                  }
                  onClick={(evt) => {
                    evt.stopPropagation()
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
                <TreeLeafDot $disbanded={isDisbanded} />
              )}
            </TreeCaretSlot>

            <UnitEmblemThumb unitItem={unitItem} size={30} isDark={isDark} />

            <TreeTextBody>
              <TreeTitleLine>
                <TreeUnitName>{unitItem.name}</TreeUnitName>
                {unitItem.abbreviation?.trim() ? (
                  <TreeAbbrSpan>({unitItem.abbreviation.trim()})</TreeAbbrSpan>
                ) : null}
                {unitItem.nickname?.trim() ? (
                  <TreeNicknameSpan>
                    &ldquo;{unitItem.nickname.trim()}&rdquo;
                  </TreeNicknameSpan>
                ) : null}
                {unitItem.unitType ? (
                  <EchelonMiniBadge $tier={echelonTier}>
                    {MILITARY_UNIT_TYPE_LABELS[
                      unitItem.unitType as MilitaryUnitType
                    ] ?? unitItem.unitType}
                  </EchelonMiniBadge>
                ) : null}
                {branchText ? <BranchMiniTag>{branchText}</BranchMiniTag> : null}
                {hasChildren ? (
                  <SubCountChip
                    type="button"
                    onClick={(evt) => {
                      evt.stopPropagation()
                      toggleNodeCollapse(unitItem.id)
                    }}
                  >
                    예하 {children.length}
                  </SubCountChip>
                ) : null}
                <RowOpenArrow aria-hidden="true">
                  <FiArrowUpRight size={12.5} />
                </RowOpenArrow>
              </TreeTitleLine>

              {(periodLabel ||
                isDisbanded ||
                garrisonText ||
                strengthFirstLine ||
                eraTagText) && (
                <TreeMetaStrip>
                  {periodLabel ? (
                    <TreeLifespanSpan>{periodLabel}</TreeLifespanSpan>
                  ) : null}
                  {isDisbanded ? (
                    <TreeDisbandedBadge>해체</TreeDisbandedBadge>
                  ) : null}
                  {eraTagText ? (
                    <EraPolityBadge>{eraTagText}</EraPolityBadge>
                  ) : null}
                  {garrisonText ? (
                    <MetaInlineFact>
                      <FiMapPin size={10.5} />
                      {garrisonText}
                    </MetaInlineFact>
                  ) : null}
                  {strengthFirstLine ? (
                    <StrengthSummaryText>{strengthFirstLine}</StrengthSummaryText>
                  ) : null}
                </TreeMetaStrip>
              )}
            </TreeTextBody>
          </TreeLeftCluster>

          <TreeRightCluster>
            {leadCommander ? (
              <CommanderPill title={`대표 지휘관: ${leadCommander}`}>
                <FiUser size={11} />
                <span>{leadCommander}</span>
              </CommanderPill>
            ) : null}

            {vesselCount > 0 ? (
              <FactCountBadge title={`배속 함정 ${vesselCount}척`}>
                <FiAnchor size={10.5} />
                {vesselCount}
              </FactCountBadge>
            ) : null}

            {combatCount > 0 ? (
              <FactCountBadge $accent title={`참전·지령 기록 ${combatCount}건`}>
                <FiCompass size={11} />
                {combatCount}
              </FactCountBadge>
            ) : null}

            <RowQuickActions onClick={(evt) => evt.stopPropagation()}>
              <HoverAddSubBtn
                type="button"
                title={`${unitItem.name} 예하 편제 추가`}
                onClick={() => createSubUnitUnder(unitItem)}
              >
                <FiPlus size={12} /> 예하
              </HoverAddSubBtn>

              <PopoverMenu
                size="sm"
                ariaLabel={`${unitItem.name} 작업 메뉴`}
                title="상세 보기 · 수정 · 예하 편제 추가"
                minWidth={172}
                items={[
                  {
                    id: 'open-detail',
                    label: '상세 페이지 열기',
                    icon: <FiArrowUpRight size={12.5} />,
                    onSelect: () => openUnitDetail(unitItem.id),
                  },
                  {
                    id: 'edit-unit',
                    label: '사령부·부대 수정',
                    icon: <FiEdit2 size={12.5} />,
                    onSelect: () => onEditUnit(unitItem.id),
                  },
                  {
                    id: 'add-sub',
                    label: '예하 편제 추가',
                    icon: <FiPlus size={12.5} />,
                    onSelect: () => createSubUnitUnder(unitItem),
                  },
                ]}
              />
            </RowQuickActions>
          </TreeRightCluster>
        </TreeRow>

        {hasChildren && !isCollapsed ? (
          <TreeChildrenRail>
            {children.map((childUnit) =>
              renderTreeNode(childUnit, depth + 1, nextVisited, hideEraInMeta),
            )}
          </TreeChildrenRail>
        ) : null}
      </TreeNodeWrap>
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
                <DeptGroupCountPill>{groupItem.roots.length}</DeptGroupCountPill>
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

  return (
    <SectionRoot aria-label="군사 조직 및 편제 현황">
      {/* 1. 상단 4단 제대 구성 요약 & 원클릭 필터 스트립 */}
      {countryUnits.length > 0 ? (
        <EchelonSummaryStrip role="region" aria-label="제대별 편제 요약">
          <SummaryTierBtn
            type="button"
            $active={echelonGroupFilter === 'ALL'}
            onClick={() => setEchelonGroupFilter('ALL')}
          >
            <SummaryTierLabel>전체 사령부 · 편제</SummaryTierLabel>
            <SummaryTierValue>
              {tierStats.total.toLocaleString('ko-KR')}
              <small>개</small>
            </SummaryTierValue>
          </SummaryTierBtn>

          <SummaryTierBtn
            type="button"
            $active={echelonGroupFilter === 'HIGH_COMMAND'}
            onClick={() =>
              setEchelonGroupFilter((prev) =>
                prev === 'HIGH_COMMAND' ? 'ALL' : 'HIGH_COMMAND',
              )
            }
          >
            <SummaryTierLabel>최고 · 상급지휘부</SummaryTierLabel>
            <SummaryTierValue $muted={tierStats.highCommand === 0}>
              {tierStats.highCommand.toLocaleString('ko-KR')}
              <small>개</small>
            </SummaryTierValue>
          </SummaryTierBtn>

          <SummaryTierBtn
            type="button"
            $active={echelonGroupFilter === 'OPERATIONAL'}
            onClick={() =>
              setEchelonGroupFilter((prev) =>
                prev === 'OPERATIONAL' ? 'ALL' : 'OPERATIONAL',
              )
            }
          >
            <SummaryTierLabel>작전 · 전략 제대</SummaryTierLabel>
            <SummaryTierValue $muted={tierStats.operational === 0}>
              {tierStats.operational.toLocaleString('ko-KR')}
              <small>개</small>
            </SummaryTierValue>
          </SummaryTierBtn>

          <SummaryTierBtn
            type="button"
            $active={echelonGroupFilter === 'TACTICAL'}
            onClick={() =>
              setEchelonGroupFilter((prev) =>
                prev === 'TACTICAL' ? 'ALL' : 'TACTICAL',
              )
            }
          >
            <SummaryTierLabel>전술 · 특수 부대</SummaryTierLabel>
            <SummaryTierValue $muted={tierStats.tactical === 0}>
              {tierStats.tactical.toLocaleString('ko-KR')}
              <small>개</small>
            </SummaryTierValue>
          </SummaryTierBtn>

          <SummaryAuxFacts>
            <span>
              역대 지휘관 <strong>{tierStats.commanderCount.toLocaleString('ko-KR')}</strong>건
            </span>
            <span>·</span>
            <span>
              참전·지령 <strong>{tierStats.combatLinks.toLocaleString('ko-KR')}</strong>건
            </span>
          </SummaryAuxFacts>
        </EchelonSummaryStrip>
      ) : null}

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

      {/* 2. 본문 원장 카드 (필터 툴바 + 편제 트리 / 원장 표) */}
      <LedgerCard>
        <FilterToolbar>
          <FilterChipsStack>
            <ChipRow role="group" aria-label="군종 필터">
              {branchTabs.map((tabItem) => (
                <LedgerFilterChip
                  key={tabItem.id}
                  type="button"
                  $active={branchFilter === tabItem.id}
                  onClick={() => setBranchFilter(tabItem.id)}
                >
                  {tabItem.label} {tabItem.count}
                </LedgerFilterChip>
              ))}
            </ChipRow>

            {historicalErasAvailable.length > 0 ? (
              <EraFilterRow
                role="group"
                aria-label={isHistorical ? '소속 정치체 필터' : '시대·정치체 필터'}
              >
                <EraRowLabel>{isHistorical ? '정치체' : '시대'}</EraRowLabel>
                <EraMiniChip
                  type="button"
                  $active={eraFilter === 'ALL'}
                  onClick={() => setEraFilter('ALL')}
                >
                  전체 {countryUnits.length}
                </EraMiniChip>
                {isHistorical && targetId ? (
                  <EraMiniChip
                    type="button"
                    $active={eraFilter === targetId}
                    onClick={() => setEraFilter(targetId)}
                  >
                    {country?.name ?? '본국'} 직속 {directCountryUnitCount}
                  </EraMiniChip>
                ) : directCountryUnitCount > 0 ? (
                  <EraMiniChip
                    type="button"
                    $active={eraFilter === 'MODERN'}
                    onClick={() => setEraFilter('MODERN')}
                  >
                    현대 직속 {directCountryUnitCount}
                  </EraMiniChip>
                ) : null}
                {historicalErasAvailable.map((eraItem) => (
                  <EraMiniChip
                    key={eraItem.id}
                    type="button"
                    $active={eraFilter === eraItem.id}
                    onClick={() => setEraFilter(eraItem.id)}
                  >
                    {eraItem.name} {eraItem.count}
                  </EraMiniChip>
                ))}
              </EraFilterRow>
            ) : null}
          </FilterChipsStack>

          <FilterRight>
            <LedgerSearchBox style={{ maxWidth: 276 }}>
              <FiSearch />
              <LedgerSearchInput
                type="search"
                value={searchQuery}
                onChange={(evt) => setSearchQuery(evt.target.value)}
                placeholder="사령부·부대명, 약칭, 지휘관, 주둔지 검색…"
                aria-label="부대 이름 및 지휘관 검색"
              />
              {searchQuery ? (
                <SearchClearBtn
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchQuery('')}
                >
                  <FiX size={12} />
                </SearchClearBtn>
              ) : null}
            </LedgerSearchBox>

            <LedgerViewSwitch role="group" aria-label="목록 표시 방식">
              <LedgerViewSwitchItem
                type="button"
                $active={browseViewMode === 'TREE'}
                onClick={() => setBrowseViewMode('TREE')}
                title="상하 지휘 계통 편제 트리 보기"
              >
                <FiGitBranch size={13} />
                편제 트리
              </LedgerViewSwitchItem>
              <LedgerViewSwitchItem
                type="button"
                $active={browseViewMode === 'LEDGER'}
                onClick={() => setBrowseViewMode('LEDGER')}
                title="창설·해체일, 제대·군종, 대표 지휘관·전과 원장 표 보기"
              >
                <FiList size={13} />
                원장 표
              </LedgerViewSwitchItem>
            </LedgerViewSwitch>

            <PopoverMenu
              ariaLabel="편제·사령부 상세 필터 및 보기 설정"
              title="운용 상태 · 소관 부처 · 기준 연도 · 트리 접기 설정"
              minWidth={264}
              active={
                echelonGroupFilter !== 'ALL' ||
                statusFilter !== 'ALL' ||
                deptFilter !== 'ALL' ||
                parsedSnapshotYear != null
              }
            >
              {(closeMenu) => (
                <>
                  {browseViewMode === 'TREE' ? (
                    <>
                      <PopoverMenuSectionLabel>
                        편제 트리 보기
                      </PopoverMenuSectionLabel>
                      {eraFilter === 'ALL' &&
                      historicalErasAvailable.length > 0 ? (
                        <PopoverMenuItem
                          type="button"
                          onClick={() => setGroupByEra((prev) => !prev)}
                        >
                          <FiLayers size={13} />
                          <span>시대 · 정치체별 섹션 묶음</span>
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
                              ? '예하 편제 모두 펼치기'
                              : '예하 편제 모두 접기'}
                          </span>
                        </PopoverMenuItem>
                      ) : null}
                      <PopoverMenuDivider />
                    </>
                  ) : null}

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
                      <DeptFilterSelect
                        aria-label="소관 국방·군정부처 필터"
                        value={deptFilter}
                        onChange={(evt) => setDeptFilter(evt.target.value)}
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
                      </DeptFilterSelect>
                    </>
                  ) : null}

                  <PopoverMenuSectionLabel>
                    기준 연도 스냅샷
                  </PopoverMenuSectionLabel>
                  <SnapshotYearWrap title="특정 연도(예: 1941, BC 221)에 존재했던 군부대만 필터링합니다">
                    <FiCalendar size={12.5} aria-hidden />
                    <SnapshotYearInput
                      type="text"
                      value={snapshotYearInput}
                      onChange={(changeEvt) =>
                        setSnapshotYearInput(changeEvt.target.value)
                      }
                      placeholder="연도 입력 (예: 1941, BC 221)"
                      aria-label="기준 연도 스냅샷 필터"
                    />
                    {snapshotYearInput ? (
                      <SearchClearBtn
                        type="button"
                        aria-label="기준 연도 지우기"
                        onClick={() => setSnapshotYearInput('')}
                      >
                        <FiX size={11} />
                      </SearchClearBtn>
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
              <LedgerPrimaryButton
                type="button"
                onClick={() => onCreateUnit(resolveDefaultCreateOptions())}
              >
                <FiPlus size={14} /> 사령부·부대 등록
              </LedgerPrimaryButton>
            ) : null}
          </FilterRight>
        </FilterToolbar>

        {hasActiveFilters ? (
          <ActiveFilterBar>
            <ActiveFilterCount>
              표시 <strong>{filteredUnits.length}</strong> / 전체{' '}
              {countryUnits.length}개 편제
            </ActiveFilterCount>
            {echelonGroupFilter !== 'ALL' ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setEchelonGroupFilter('ALL')}
              >
                제대: {ECHELON_GROUP_LABELS[echelonGroupFilter]}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {statusFilter !== 'ALL' ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setStatusFilter('ALL')}
              >
                상태: {STATUS_FILTER_LABELS[statusFilter]}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {parsedSnapshotYear != null ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setSnapshotYearInput('')}
              >
                기준 연도:{' '}
                {parsedSnapshotYear < 0
                  ? `BC ${Math.abs(parsedSnapshotYear)}년`
                  : `${parsedSnapshotYear}년`}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {eraFilter !== 'ALL' && activeEraName ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setEraFilter('ALL')}
              >
                시대: {activeEraName}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {deptFilter !== 'ALL' && activeDeptName ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setDeptFilter('ALL')}
              >
                지휘부: {activeDeptName}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            <ResetFiltersLink type="button" onClick={resetAllFilters}>
              초기화
            </ResetFiltersLink>
          </ActiveFilterBar>
        ) : null}

        {unitsQuery.isLoading ? (
          <SkeletonPad>
            <ChartSkeleton variant="bars" rows={5} />
          </SkeletonPad>
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
        ) : browseViewMode === 'LEDGER' ? (
          <MilitaryUnitsLedgerView
            units={filteredUnits}
            allUnits={countryUnits}
            isHistorical={isHistorical}
            targetPolityId={targetId}
            unitTypeLabels={MILITARY_UNIT_TYPE_LABELS}
            branchLabels={MILITARY_BRANCH_LABELS}
            echelonOrder={MILITARY_ECHELON_ORDER}
            resolveEffectiveDepartment={resolveEffectiveDepartment}
            onSelectUnit={(unitItem) => openUnitDetail(unitItem.id)}
            onEditUnit={onEditUnit}
            onCreateSubUnit={createSubUnitUnder}
            onAddRoot={() => onCreateUnit(resolveDefaultCreateOptions())}
          />
        ) : (
          <TreeContainer>
            {hierarchyGroups.eraSections ? (
              hierarchyGroups.eraSections.map((eraSection) => {
                const isEraCollapsed = collapsedEraIds.has(eraSection.id)
                return (
                  <EraSectionBlock key={eraSection.id}>
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
                          {eraSection.totalCount}개 편제
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
                                historicalCountryId:
                                  eraSection.historicalCountryId,
                                administrationDepartmentId:
                                  deptFilter !== 'ALL' &&
                                  deptFilter !== 'UNLINKED'
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
                  </EraSectionBlock>
                )
              })
            ) : (
              renderDeptGroupsList(hierarchyGroups.groups, false)
            )}
          </TreeContainer>
        )}
      </LedgerCard>
    </SectionRoot>
  )
}

/* ─── Styled Primitives (Country Ledger Design System) ─── */

const SectionRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const EchelonSummaryStrip = styled.div`
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

const SummaryTierBtn = styled.button<{ $active: boolean }>`
  flex: 1 1 136px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  padding: 11px 15px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const SummaryTierLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SummaryTierValue = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};

  small {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SummaryAuxFacts = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  margin-left: auto;
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 900px) {
    display: none;
  }
`

const LedgerCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
  min-width: 0;
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FilterChipsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  flex: 1 1 320px;
`

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const EraFilterRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const EraRowLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const EraMiniChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 23px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  ${DIGIT_DISPLAY}
  cursor: pointer;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const FilterRight = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

const SearchClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ActiveFilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 8px 16px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
`

const ActiveFilterCount = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
  margin-right: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const ActiveFilterPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 23px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const ResetFiltersLink = styled.button`
  margin-left: auto;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    text-decoration: underline;
  }
`

const SkeletonPad = styled.div`
  padding: 18px;
`

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const EraSectionBlock = styled.div`
  display: flex;
  flex-direction: column;
`

const EraStickyHeaderBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#151822' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
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
  padding: 7px 16px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-top: ${({ theme, $first }) =>
    $first ? 'none' : `1px solid ${ledgerHairline(theme.mode)}`};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
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
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptGroupRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const TreeNodeWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const HoverAddSubBtn = styled(LedgerCompactAction)`
  height: 25px;
  padding: 0 8px;
  font-size: 11.5px;
  opacity: 0;
  transition: opacity 0.12s ease;

  @media (max-width: 768px) {
    display: none;
  }
`

const RowOpenArrow = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: opacity 0.12s ease, transform 0.12s ease;
`

const TreeUnitName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: color 0.12s ease;
`

const TreeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    outline: none;

    ${TreeUnitName} {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }

    ${RowOpenArrow} {
      opacity: 0.95;
      transform: translate(1px, -1px);
    }

    ${HoverAddSubBtn} {
      opacity: 1;
    }
  }
`

const TreeLeftCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  flex: 1;
`

const ChildBranchConnector = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  margin-right: -3px;
`

const TreeCaretSlot = styled.div`
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const CollapseToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TreeLeafDot = styled.span<{ $disbanded?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $disbanded }) => ($disbanded ? '#94a3b8' : '#10b981')};
  opacity: ${({ $disbanded }) => ($disbanded ? 0.55 : 0.85)};
`

const EmblemImg = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 7px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const EmblemFallback = styled.span<{
  $size: number
  $tier: Exclude<EchelonGroupKey, 'ALL'>
  $dark: boolean
}>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $tier, $dark, theme }) =>
    $tier === 'HIGH_COMMAND'
      ? $dark
        ? 'rgba(245, 158, 11, 0.14)'
        : '#fffbeb'
      : $tier === 'OPERATIONAL'
        ? ledgerAccentSubtle(theme.mode)
        : $dark
          ? 'rgba(255, 255, 255, 0.05)'
          : '#f8fafc'};
  border: 1px solid
    ${({ $tier, $dark, theme }) =>
      $tier === 'HIGH_COMMAND'
        ? $dark
          ? 'rgba(251, 191, 36, 0.28)'
          : '#fde68a'
        : $tier === 'OPERATIONAL'
          ? ledgerAccentBorder(theme.mode)
          : ledgerHairlineStrong(theme.mode)};
  color: ${({ $tier, $dark, theme }) =>
    $tier === 'HIGH_COMMAND'
      ? $dark
        ? '#fcd34d'
        : '#b45309'
      : $tier === 'OPERATIONAL'
        ? ledgerAccent(theme.mode)
        : theme.colors.text.secondary};
`

const TreeTextBody = styled.div`
  flex: 1;
  min-width: 0;
`

const TreeTitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 6px;
  line-height: 1.35;
`

const TreeAbbrSpan = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeNicknameSpan = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EchelonMiniBadge = styled.span<{
  $tier: Exclude<EchelonGroupKey, 'ALL'>
}>`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme, $tier }) =>
    $tier === 'HIGH_COMMAND'
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.12)'
      : $tier === 'OPERATIONAL'
        ? ledgerAccentSubtle(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme, $tier }) =>
    $tier === 'HIGH_COMMAND'
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : $tier === 'OPERATIONAL'
        ? ledgerAccent(theme.mode)
        : theme.colors.text.secondary};
`

const BranchMiniTag = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.045)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SubCountChip = styled.button`
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const TreeMetaStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 3px;
`

const TreeLifespanSpan = styled.span`
  font-size: 11.5px;
  ${DIGIT_DISPLAY}
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
      : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EraPolityBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaInlineFact = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StrengthSummaryText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TreeRightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const CommanderPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 156px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.04)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 720px) {
    display: none;
  }
`

const FactCountBadge = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  background: ${({ theme, $accent }) =>
    $accent
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const RowQuickActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const TreeChildrenRail = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 24px;
  border-left: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 640px) {
    margin-left: 14px;
  }
`

const DeptFilterSelect = styled.select`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
`

const SnapshotYearWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  box-sizing: border-box;
`

const SnapshotYearInput = styled.input`
  flex: 1;
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
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`
