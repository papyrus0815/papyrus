/**
 * 국가 상세 › 군사 › 편제 · 사령부 지면.
 *
 * 설계 원칙:
 * 1. 슬라이드 사이드바(Drawer) 없이 사령부·부대 행 클릭 시 곧바로 단독 상세 페이지(`/military/units/:unitId`)로 진입
 * 2. 무카드 에디토리얼(Cardless Editorial) 레이아웃 — 바깥 테두리 상자·회색 띠·알약 배지 난립을 없애고 수평 헤어라인과 여백·타이포 위계로만 구성
 * 3. 상단 인라인 제대 요약·필터 바 + 단일 행 검색·군종·보기 전환 툴바
 * 4. 건축적 L자 계통선(`TreeChildrenRail`)과 주둔지·대표 지휘관·참전 기록이 한 줄 위계로 읽히는 편제 계통도 및 플랫 원장 표 제공
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiGitBranch,
  FiLayers,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiShield,
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
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  LedgerPrimaryButton,
  LedgerSearchBox,
  LedgerSearchInput,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
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
  if (estStr && disStr) return `${estStr} – ${disStr}`
  if (estStr)
    return `${estStr} – ${unitItem.isActive === false ? '해체' : '현재'}`
  return `– ${disStr}`
}

function resolveUnitLeadCommanderInfo(unitItem: ExtendedMilitaryUnit): {
  label: string
  portraitUrl: string | null
} | null {
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
      return {
        label: firstTenure.rankTitle
          ? `${firstTenure.rankTitle} ${nameStr}`
          : nameStr,
        portraitUrl: firstTenure.person.profileImageUrl
          ? getUploadImageUrl(firstTenure.person.profileImageUrl)
          : null,
      }
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
      return {
        label: leadCmd.rank ? `${leadCmd.rank} ${nameStr}` : nameStr,
        portraitUrl: leadCmd.person.profileImageUrl
          ? getUploadImageUrl(leadCmd.person.profileImageUrl)
          : null,
      }
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

function UnitEmblemThumb({
  unitItem,
  size = 26,
}: {
  unitItem: ExtendedMilitaryUnit
  size?: number
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const resolvedSrc = unitItem.insigniaUrl
    ? getUploadImageUrl(unitItem.insigniaUrl)
    : null

  if (!resolvedSrc || imgFailed) {
    return null
  }

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
            departmentName: effDept ? effDept.name : '직할 · 독립 편제',
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

    const typeText = unitItem.unitType
      ? (MILITARY_UNIT_TYPE_LABELS[unitItem.unitType as MilitaryUnitType] ??
        unitItem.unitType)
      : null
    const branchText =
      unitItem.branch && branchFilter === 'ALL'
        ? (MILITARY_BRANCH_LABELS[unitItem.branch] ?? unitItem.branch)
        : null
    const classificationText = [typeText, branchText]
      .filter(Boolean)
      .join(' · ')

    const eraTagText =
      !hideEraInMeta &&
      eraFilter === 'ALL' &&
      (!isHistorical || unitItem.historicalCountryId !== targetId) &&
      unitItem.historicalCountry?.name
        ? unitItem.historicalCountry.name
        : null

    const garrisonText = unitItem.garrison?.trim() || null
    const strengthFirstLine = unitItem.strength?.trim()
      ? unitItem.strength.trim().split('\n')[0].slice(0, 48)
      : null
    const leadCommanderInfo = resolveUnitLeadCommanderInfo(unitItem)
    const combatCount =
      (unitItem.sideDeployedUnits?.length ?? 0) +
      (unitItem.eventRelations?.length ?? 0)
    const vesselCount =
      (unitItem.assignedNavalVessels ?? unitItem.navalVessels ?? []).length

    const subMetaTokens: Array<{ key: string; node: React.ReactNode }> = []
    if (periodLabel) {
      subMetaTokens.push({ key: 'period', node: <span>{periodLabel}</span> })
    }
    if (isDisbanded) {
      subMetaTokens.push({ key: 'disbanded', node: <span>해체</span> })
    }
    if (eraTagText) {
      subMetaTokens.push({
        key: 'era',
        node: <EraPolitySpan>{eraTagText}</EraPolitySpan>,
      })
    }
    if (garrisonText) {
      subMetaTokens.push({
        key: 'garrison',
        node: <span>{garrisonText}</span>,
      })
    }
    if (strengthFirstLine) {
      subMetaTokens.push({
        key: 'strength',
        node: <StrengthSummaryText>{strengthFirstLine}</StrengthSummaryText>,
      })
    }

    return (
      <TreeNodeWrap key={unitItem.id} $child={depth > 0}>
        <TreeRow
          $root={depth === 0}
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
            <TreeCaretSlot>
              {hasChildren ? (
                <CollapseToggleBtn
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-label={
                    isCollapsed ? '예하 부대 펼치기' : '예하 부대 접기'
                  }
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
                <TreeLeafNode
                  $tier={echelonTier}
                  $disbanded={isDisbanded}
                  aria-hidden="true"
                />
              )}
            </TreeCaretSlot>

            <UnitEmblemThumb unitItem={unitItem} size={depth === 0 ? 28 : 24} />

            <TreeTextBody>
              <TreeTitleLine>
                <TreeUnitName $root={depth === 0}>{unitItem.name}</TreeUnitName>
                {unitItem.abbreviation?.trim() ? (
                  <TreeAbbrSpan>({unitItem.abbreviation.trim()})</TreeAbbrSpan>
                ) : null}
                {unitItem.nickname?.trim() ? (
                  <TreeNicknameSpan>
                    “{unitItem.nickname.trim()}”
                  </TreeNicknameSpan>
                ) : null}
                {classificationText ? (
                  <TreeClassText $highCommand={echelonTier === 'HIGH_COMMAND'}>
                    {classificationText}
                  </TreeClassText>
                ) : null}
                <RowOpenArrow aria-hidden="true">
                  <FiArrowUpRight size={12.5} />
                </RowOpenArrow>
              </TreeTitleLine>

              {subMetaTokens.length > 0 ? (
                <TreeMetaStrip>
                  {subMetaTokens.map((token, idx) => (
                    <React.Fragment key={token.key}>
                      {idx > 0 ? (
                        <MetaDotSep aria-hidden="true">·</MetaDotSep>
                      ) : null}
                      {token.node}
                    </React.Fragment>
                  ))}
                </TreeMetaStrip>
              ) : null}
            </TreeTextBody>
          </TreeLeftCluster>

          <TreeRightCluster>
            {leadCommanderInfo ? (
              <CommanderInline title={`대표 지휘관: ${leadCommanderInfo.label}`}>
                {leadCommanderInfo.portraitUrl ? (
                  <CommanderThumbImg
                    src={leadCommanderInfo.portraitUrl}
                    alt=""
                    onError={(imgEvt) => {
                      imgEvt.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <span>{leadCommanderInfo.label}</span>
              </CommanderInline>
            ) : null}

            {(hasChildren || vesselCount > 0 || combatCount > 0) && (
              <RightFiguresGroup>
                {hasChildren ? (
                  <SubCountTextBtn
                    type="button"
                    onClick={(evt) => {
                      evt.stopPropagation()
                      toggleNodeCollapse(unitItem.id)
                    }}
                  >
                    예하 {children.length}
                  </SubCountTextBtn>
                ) : null}
                {vesselCount > 0 ? (
                  <QuietMetricSpan title={`배속 함정 ${vesselCount}척`}>
                    함정 {vesselCount}
                  </QuietMetricSpan>
                ) : null}
                {combatCount > 0 ? (
                  <QuietMetricSpan
                    $accent
                    title={`참전·지령 기록 ${combatCount}건`}
                  >
                    참전 {combatCount}
                  </QuietMetricSpan>
                ) : null}
              </RightFiguresGroup>
            )}

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
        <DeptGroupSection
          key={groupItem.key}
          $first={groupIdx === 0 && !hideEraInMeta}
        >
          {showGroupHeader ? (
            <DeptGroupHeaderBar>
              <DeptGroupTitleWrap>
                <DeptGroupName>{groupItem.departmentName}</DeptGroupName>
                {groupItem.departmentAbbreviation ? (
                  <DeptGroupAbbr>
                    ({groupItem.departmentAbbreviation})
                  </DeptGroupAbbr>
                ) : null}
                <DeptGroupCount>{groupItem.roots.length}</DeptGroupCount>
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
          <DeptRootsList>
            {groupItem.roots.map((rootUnit) =>
              renderTreeNode(rootUnit, 0, new Set(), hideEraInMeta),
            )}
          </DeptRootsList>
        </DeptGroupSection>
      )
    })

  return (
    <SectionRoot aria-label="군사 조직 및 편제 현황">
      {/* 1. 상단 무카드 인라인 제대 요약 & 원클릭 필터 바 */}
      {countryUnits.length > 0 ? (
        <EchelonSummaryStrip role="region" aria-label="제대별 편제 요약">
          <SummaryTiersGroup>
            <SummaryTierBtn
              type="button"
              $active={echelonGroupFilter === 'ALL'}
              onClick={() => setEchelonGroupFilter('ALL')}
            >
              <span className="tier-label">전체 사령부 · 편제</span>
              <strong className="tier-val">
                {tierStats.total.toLocaleString('ko-KR')}
              </strong>
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
              <span className="tier-label">최고 · 상급지휘부</span>
              <strong
                className="tier-val"
                data-muted={tierStats.highCommand === 0 || undefined}
              >
                {tierStats.highCommand.toLocaleString('ko-KR')}
              </strong>
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
              <span className="tier-label">작전 · 전략 제대</span>
              <strong
                className="tier-val"
                data-muted={tierStats.operational === 0 || undefined}
              >
                {tierStats.operational.toLocaleString('ko-KR')}
              </strong>
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
              <span className="tier-label">전술 · 특수 부대</span>
              <strong
                className="tier-val"
                data-muted={tierStats.tactical === 0 || undefined}
              >
                {tierStats.tactical.toLocaleString('ko-KR')}
              </strong>
            </SummaryTierBtn>
          </SummaryTiersGroup>

          <SummaryAuxFacts>
            <span>
              지휘관{' '}
              <strong>
                {tierStats.commanderCount.toLocaleString('ko-KR')}
              </strong>
            </span>
            <span aria-hidden>·</span>
            <span>
              참전·지령{' '}
              <strong>{tierStats.combatLinks.toLocaleString('ko-KR')}</strong>
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

      {/* 2. 무카드 오픈 원장 지면 */}
      <LedgerCanvas>
        {countryUnits.length > 0 ? (
          <FilterToolbar>
            {(branchTabs.length > 2 ||
              branchFilter !== 'ALL' ||
              historicalErasAvailable.length > 0) ? (
              <FilterChipsStack>
                {branchTabs.length > 2 || branchFilter !== 'ALL' ? (
                  <BranchTabsRow role="group" aria-label="군종 필터">
                    {branchTabs.map((tabItem) => (
                      <BranchFilterBtn
                        key={tabItem.id}
                        type="button"
                        $active={branchFilter === tabItem.id}
                        onClick={() => setBranchFilter(tabItem.id)}
                      >
                        <span>{tabItem.label}</span>
                        <small>{tabItem.count}</small>
                      </BranchFilterBtn>
                    ))}
                  </BranchTabsRow>
                ) : null}

                {historicalErasAvailable.length > 0 ? (
                <EraFilterRow
                  role="group"
                  aria-label={
                    isHistorical ? '소속 정치체 필터' : '시대·정치체 필터'
                  }
                >
                  <EraRowLabel>
                    {isHistorical ? '정치체' : '시대'}
                  </EraRowLabel>
                  <EraTextBtn
                    type="button"
                    $active={eraFilter === 'ALL'}
                    onClick={() => setEraFilter('ALL')}
                  >
                    전체 {countryUnits.length}
                  </EraTextBtn>
                  {isHistorical && targetId ? (
                    <EraTextBtn
                      type="button"
                      $active={eraFilter === targetId}
                      onClick={() => setEraFilter(targetId)}
                    >
                      {country?.name ?? '본국'} 직속 {directCountryUnitCount}
                    </EraTextBtn>
                  ) : directCountryUnitCount > 0 ? (
                    <EraTextBtn
                      type="button"
                      $active={eraFilter === 'MODERN'}
                      onClick={() => setEraFilter('MODERN')}
                    >
                      현대 직속 {directCountryUnitCount}
                    </EraTextBtn>
                  ) : null}
                  {historicalErasAvailable.map((eraItem) => (
                    <EraTextBtn
                      key={eraItem.id}
                      type="button"
                      $active={eraFilter === eraItem.id}
                      onClick={() => setEraFilter(eraItem.id)}
                    >
                      {eraItem.name} {eraItem.count}
                    </EraTextBtn>
                  ))}
                </EraFilterRow>
              ) : null}
              </FilterChipsStack>
            ) : null}

            <FilterRight>
              <LedgerSearchBox style={{ maxWidth: 268 }}>
                <FiSearch />
                <LedgerSearchInput
                  type="search"
                  value={searchQuery}
                  onChange={(evt) => setSearchQuery(evt.target.value)}
                  placeholder="사령부·부대, 지휘관, 주둔지 검색…"
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
                          편제 계통 보기
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
        ) : null}

        {hasActiveFilters ? (
          <ActiveFilterBar>
            <ActiveFilterCount>
              표시 <strong>{filteredUnits.length}</strong> / 전체{' '}
              {countryUnits.length}
            </ActiveFilterCount>
            {echelonGroupFilter !== 'ALL' ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setEchelonGroupFilter('ALL')}
              >
                {ECHELON_GROUP_LABELS[echelonGroupFilter]}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {statusFilter !== 'ALL' ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setStatusFilter('ALL')}
              >
                {STATUS_FILTER_LABELS[statusFilter]}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {parsedSnapshotYear != null ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setSnapshotYearInput('')}
              >
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
                {activeEraName}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            {deptFilter !== 'ALL' && activeDeptName ? (
              <ActiveFilterPill
                type="button"
                onClick={() => setDeptFilter('ALL')}
              >
                {activeDeptName}
                <FiX size={11} />
              </ActiveFilterPill>
            ) : null}
            <ResetFiltersLink type="button" onClick={resetAllFilters}>
              필터 초기화
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
              hierarchyGroups.eraSections.map((eraSection, secIdx) => {
                const isEraCollapsed = collapsedEraIds.has(eraSection.id)
                return (
                  <EraSectionBlock key={eraSection.id} $first={secIdx === 0}>
                    <EraStickyHeaderBar>
                      <EraStickyToggleBtn
                        type="button"
                        aria-expanded={!isEraCollapsed}
                        onClick={() => toggleEraCollapse(eraSection.id)}
                      >
                        {isEraCollapsed ? (
                          <FiChevronRight size={14} />
                        ) : (
                          <FiChevronDown size={14} />
                        )}
                        <EraStickyTitle>{eraSection.label}</EraStickyTitle>
                        <DeptGroupCount>{eraSection.totalCount}</DeptGroupCount>
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
      </LedgerCanvas>
    </SectionRoot>
  )
}

/* ─── Cardless Open Editorial Primitives (무카드 에디토리얼 스타일) ─── */

const SectionRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const EchelonSummaryStrip = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 24px;
  padding: 2px 0 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SummaryTiersGroup = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 22px;
`

const SummaryTierBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding: 8px 0 11px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease;

  .tier-label {
    font-size: 12.5px;
    font-weight: ${({ $active }) => ($active ? 700 : 500)};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.text.primary : theme.colors.text.secondary};
  }

  .tier-val {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    ${DIGIT_DISPLAY}
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};

    &[data-muted] {
      color: ${({ theme }) => theme.colors.text.tertiary};
      font-weight: 600;
    }
  }

  &:hover .tier-label {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SummaryAuxFacts = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 10px;
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  @media (max-width: 920px) {
    display: none;
  }
`

const LedgerCanvas = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 8px 0 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FilterChipsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1 1 300px;
`

const BranchTabsRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
`

const BranchFilterBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  small {
    font-size: 11.5px;
    font-weight: 600;
    ${DIGIT_DISPLAY}
    opacity: ${({ $active }) => ($active ? 0.95 : 0.65)};
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const EraFilterRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
`

const EraRowLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EraTextBtn = styled.button<{ $active: boolean }>`
  padding: 2px 0;
  border: none;
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font: inherit;
  font-size: 12px;
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
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
`

const ActiveFilterCount = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
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
  padding: 18px 0;
`

/* ─── Architectural ORBAT Command Tree (무카드 건축형 편제 계통도) ─── */

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const EraSectionBlock = styled.div<{ $first?: boolean }>`
  display: flex;
  flex-direction: column;
  padding-top: ${({ $first }) => ($first ? '8px' : '28px')};
`

const EraStickyHeaderBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 0 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
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
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  cursor: pointer;
`

const EraStickyTitle = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DeptGroupSection = styled.div<{ $first?: boolean }>`
  display: flex;
  flex-direction: column;
  margin-top: ${({ $first }) => ($first ? '0' : '22px')};
`

const DeptGroupHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 2px 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const DeptGroupTitleWrap = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
`

const DeptGroupName = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DeptGroupAbbr = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeptGroupCount = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeptGroupRightActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const DeptRootsList = styled.div`
  display: flex;
  flex-direction: column;
`

const TreeNodeWrap = styled.div<{ $child?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;

  ${({ $child, theme }) =>
    $child
      ? `
    &::before {
      content: '';
      position: absolute;
      left: -14px;
      top: 22px;
      width: 12px;
      height: 1px;
      background: ${ledgerHairlineStrong(theme.mode)};
      pointer-events: none;
    }
  `
      : ''}
`

const HoverAddSubBtn = styled(LedgerCompactAction)`
  height: 24px;
  padding: 0 7px;
  font-size: 11px;
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

const TreeUnitName = styled.span<{ $root?: boolean }>`
  font-size: ${({ $root }) => ($root ? '14.5px' : '13.5px')};
  font-weight: ${({ $root }) => ($root ? 800 : 680)};
  letter-spacing: -0.018em;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: color 0.12s ease;
`

const TreeRow = styled.div<{ $root?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: ${({ $root }) => ($root ? '12px 6px' : '8.5px 6px')};
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

const TreeLeafNode = styled.span<{
  $tier: Exclude<EchelonGroupKey, 'ALL'>
  $disbanded?: boolean
}>`
  width: 6px;
  height: 6px;
  border-radius: ${({ $tier }) => ($tier === 'HIGH_COMMAND' ? '1.5px' : '50%')};
  transform: ${({ $tier }) =>
    $tier === 'HIGH_COMMAND' ? 'rotate(45deg)' : 'none'};
  background: ${({ theme, $tier, $disbanded }) =>
    $disbanded
      ? theme.colors.text.tertiary
      : $tier === 'HIGH_COMMAND'
        ? ledgerAccent(theme.mode)
        : '#10b981'};
  opacity: ${({ $disbanded }) => ($disbanded ? 0.45 : 0.85)};
`

const EmblemImg = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const TreeTextBody = styled.div`
  flex: 1;
  min-width: 0;
`

const TreeTitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 7px;
  line-height: 1.35;
`

const TreeAbbrSpan = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeNicknameSpan = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeClassText = styled.span<{ $highCommand?: boolean }>`
  font-size: 11.5px;
  font-weight: ${({ $highCommand }) => ($highCommand ? 700 : 600)};
  color: ${({ theme, $highCommand }) =>
    $highCommand ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const TreeMetaStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaDotSep = styled.span`
  opacity: 0.55;
  user-select: none;
`

const EraPolitySpan = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StrengthSummaryText = styled.span`
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TreeRightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`

const CommanderInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 184px;
  font-size: 12.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 760px) {
    display: none;
  }
`

const CommanderThumbImg = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const RightFiguresGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  ${DIGIT_DISPLAY}
`

const SubCountTextBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const QuietMetricSpan = styled.span<{ $accent?: boolean }>`
  font-weight: ${({ $accent }) => ($accent ? 650 : 500)};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};

  @media (max-width: 640px) {
    display: none;
  }
`

const RowQuickActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const TreeChildrenRail = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 15px;
  padding-left: 14px;
  border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 640px) {
    margin-left: 10px;
    padding-left: 10px;
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
