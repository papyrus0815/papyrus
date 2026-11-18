import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiChevronDown,
  FiChevronRight,
  FiGitBranch,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  type LedgerMilitaryUnitItem,
  MilitaryUnitsLedgerView,
} from '@/features/government-info/ui/military-units-ledger-view.widget'
import { centuryOf } from '@/pages/events/list/lib/era-strip.lib'
import { toolbarControlHeight } from '@/pages/events/styles/theme'
import {
  type GovernmentCenturyBucket,
  type GovernmentDecadeBucket,
  type GovernmentEraSpanItem,
  GovernmentEraStrip,
} from '@/pages/government/components/government-era-strip'
import {
  militaryUnitApi,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { pathKeys } from '@/shared/router'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'
import * as DashboardStyles from '@/widgets/country/country-detail/ui/country-detail-dashboard.styles'
import {
  LedgerFilterChip,
  LedgerSearchBox,
  LedgerSearchInput,
  LedgerToolbarButton,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { MilitaryUnitFormModal } from '@/widgets/country/country-detail/ui/military-unit-form.modal'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal/country-inline-modal'

import { MilitaryUnitDetailDrawer } from './components/military-unit-detail-drawer'

const UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  SUPREME_COMMAND: '최고통수·최고사령부',
  GENERAL_STAFF: '참모본부·합참',
  SERVICE_HQ: '군종 본부·총사령부',
  THEATER: '전구·전역사령부',
  ARMY_GROUP: '집단군',
  FRONT: '전선군',
  MILITARY_DISTRICT: '군관구·방면군',
  FIELD_ARMY: '야전군',
  FLEET: '함대',
  AIR_FLEET: '항공함대',
  CORPS: '군단',
  AIR_CORPS: '항공군단',
  DIVISION: '사단',
  WING: '비행단·전대',
  BRIGADE: '여단',
  REGIMENT: '연대',
  SQUADRON: '전대·대대급',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  DETACHMENT: '분견대·특임대',
  SPECIAL_FORCES: '특수부대',
  OTHER: '기타 편제',
}

const BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

const ECHELON_ORDER: Record<string, number> = {
  SUPREME_COMMAND: -3,
  GENERAL_STAFF: -2,
  SERVICE_HQ: -1,
  THEATER: 1,
  ARMY_GROUP: 2,
  FRONT: 2,
  MILITARY_DISTRICT: 3,
  FIELD_ARMY: 4,
  FLEET: 4,
  AIR_FLEET: 4,
  CORPS: 5,
  AIR_CORPS: 5,
  DIVISION: 6,
  WING: 6,
  BRIGADE: 7,
  REGIMENT: 8,
  SQUADRON: 8,
  BATTALION: 9,
  SPECIAL_FORCES: 9,
  DETACHMENT: 10,
  COMPANY: 11,
  PLATOON: 12,
  SQUAD: 13,
  OTHER: 99,
}

type BranchTabKey =
  | 'ALL'
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'JOINT_OTHER'

type EchelonTierFilter =
  | 'ALL'
  | 'HIGH_COMMAND'
  | 'STRATEGIC'
  | 'OPERATIONAL'
  | 'TACTICAL'

type CatalogViewMode = 'ledger' | 'tree'

const BRANCH_TABS: Array<{ key: BranchTabKey; label: string }> = [
  { key: 'ALL', label: '전체 편제' },
  { key: 'ARMY', label: '육군' },
  { key: 'NAVY', label: '해군 · 해안경비대' },
  { key: 'AIR_FORCE', label: '공군 · 우주군' },
  { key: 'MARINE_CORPS', label: '해병대' },
  { key: 'JOINT_OTHER', label: '합동 · 특수 · 기타' },
]

const ECHELON_TIER_OPTIONS: Array<{
  value: EchelonTierFilter
  label: string
}> = [
  { value: 'ALL', label: '전체 제대' },
  { value: 'HIGH_COMMAND', label: '최고통수 · 참모본부 · 군종본부' },
  { value: 'STRATEGIC', label: '전역 · 집단군 · 전선군 · 군관구' },
  { value: 'OPERATIONAL', label: '야전군 · 함대 · 군단 · 사단' },
  { value: 'TACTICAL', label: '여단 · 연대 · 대대 이하' },
]

function extractSignedYear(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  isoValue: string | null | undefined,
): number | null {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    return parts.era === 'BC' ? -Math.abs(parts.year) : parts.year
  }
  const parsed = parseSignedDateParts(isoValue)
  return parsed ? parsed.signedYear : null
}

function matchesEchelonTier(
  unitType: string | null | undefined,
  tier: EchelonTierFilter,
): boolean {
  if (tier === 'ALL') return true
  if (!unitType) return false
  if (tier === 'HIGH_COMMAND') {
    return ['SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ'].includes(unitType)
  }
  if (tier === 'STRATEGIC') {
    return ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
      unitType,
    )
  }
  if (tier === 'OPERATIONAL') {
    return [
      'FIELD_ARMY',
      'FLEET',
      'AIR_FLEET',
      'CORPS',
      'AIR_CORPS',
      'DIVISION',
      'WING',
    ].includes(unitType)
  }
  return [
    'BRIGADE',
    'REGIMENT',
    'SQUADRON',
    'BATTALION',
    'COMPANY',
    'PLATOON',
    'SQUAD',
    'DETACHMENT',
    'SPECIAL_FORCES',
    'OTHER',
  ].includes(unitType)
}

function matchesBranchTab(
  branch: string | null | undefined,
  tab: BranchTabKey,
): boolean {
  if (tab === 'ALL') return true
  if (tab === 'ARMY') return branch === 'ARMY'
  if (tab === 'NAVY') return branch === 'NAVY' || branch === 'COAST_GUARD'
  if (tab === 'AIR_FORCE') {
    return branch === 'AIR_FORCE' || branch === 'SPACE_FORCE'
  }
  if (tab === 'MARINE_CORPS') return branch === 'MARINE_CORPS'
  return !branch || branch === 'JOINT' || branch === 'OTHER'
}

function parseSnapshotYearInput(rawInput: string): number | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null
  const bcMatch = /^(?:bc|기원전)\s*(\d{1,5})$/i.exec(trimmed)
  if (bcMatch) {
    const abs = Number(bcMatch[1])
    return abs > 0 ? -abs : null
  }
  const numMatch = /^([+-]?\d{1,5})$/.exec(trimmed)
  if (numMatch) {
    const val = Number(numMatch[1])
    return Number.isFinite(val) && val !== 0 ? val : null
  }
  return null
}

function formatCenturyChipLabel(centuryKey: string): string {
  const c = Number(centuryKey.replace(/^c:/, ''))
  if (!Number.isFinite(c)) return centuryKey
  return c < 0 ? `BC ${Math.abs(c)}세기` : `${c}세기`
}

export function MilitaryCatalogPage() {
  useDocumentTitle('군사 사령부 · 편제 총람')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // 레거시 /military?unitId=<id> 북마크 자동 리다이렉트
  const legacyUnitId = searchParams.get('unitId')?.trim() || ''
  useEffect(() => {
    if (legacyUnitId) {
      navigate(pathKeys.militaryUnitDetail(legacyUnitId), { replace: true })
    }
  }, [legacyUnitId, navigate])

  const [branchTab, setBranchTab] = useState<BranchTabKey>(
    () => (searchParams.get('branch') as BranchTabKey) || 'ALL',
  )
  const [viewMode, setViewMode] = useState<CatalogViewMode>(
    () => (searchParams.get('view') === 'tree' ? 'tree' : 'ledger'),
  )
  const [searchInput, setSearchInput] = useState<string>(
    () => searchParams.get('q') ?? '',
  )
  const debouncedSearch = useDebouncedValue(searchInput, 180)
  const [countryFilter, setCountryFilter] = useState<string>(
    () => searchParams.get('country') ?? '',
  )
  const [echelonTier, setEchelonTier] = useState<EchelonTierFilter>(
    () => (searchParams.get('tier') as EchelonTierFilter) || 'ALL',
  )
  const [activeYearInput, setActiveYearInput] = useState<string>(
    () => searchParams.get('year') ?? '',
  )
  const [activeCenturyKey, setActiveCenturyKey] = useState<string | null>(
    () => searchParams.get('century') ?? null,
  )
  const [activeDecadeStart, setActiveDecadeStart] = useState<number | null>(
    () => {
      const raw = searchParams.get('decade')
      return raw !== null && raw !== '' && Number.isFinite(Number(raw))
        ? Number(raw)
        : null
    },
  )
  const [currentOnly, setCurrentOnly] = useState<boolean>(
    () => searchParams.get('active') === '1',
  )
  const [collapsedCountryGroups, setCollapsedCountryGroups] = useState<
    Set<string>
  >(new Set())

  const [previewUnitId, setPreviewUnitId] = useState<string | null>(null)
  const [unitFormOpen, setUnitFormOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)

  // URL 쿼리 동기화 (뒤로 가기 시 필터 복원용)
  useEffect(() => {
    if (legacyUnitId) return
    const next = new URLSearchParams()
    if (branchTab !== 'ALL') next.set('branch', branchTab)
    if (viewMode !== 'ledger') next.set('view', viewMode)
    if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim())
    if (countryFilter) next.set('country', countryFilter)
    if (echelonTier !== 'ALL') next.set('tier', echelonTier)
    if (activeYearInput.trim()) next.set('year', activeYearInput.trim())
    if (activeCenturyKey) next.set('century', activeCenturyKey)
    if (activeDecadeStart !== null) next.set('decade', String(activeDecadeStart))
    if (currentOnly) next.set('active', '1')
    setSearchParams(next, { replace: true })
  }, [
    legacyUnitId,
    branchTab,
    viewMode,
    debouncedSearch,
    countryFilter,
    echelonTier,
    activeYearInput,
    activeCenturyKey,
    activeDecadeStart,
    currentOnly,
    setSearchParams,
  ])

  const unitsQuery = useQuery({
    queryKey: ['military-units', 'global-catalog'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 60_000,
  })

  const allUnits = useMemo(
    () => (unitsQuery.data ?? []) as LedgerMilitaryUnitItem[],
    [unitsQuery.data],
  )

  const unitById = useMemo(() => {
    const map = new Map<string, LedgerMilitaryUnitItem>()
    for (const unitItem of allUnits) {
      map.set(unitItem.id, unitItem)
    }
    return map
  }, [allUnits])

  const resolveEffectiveDepartment = useCallback(
    (unitItem: LedgerMilitaryUnitItem) => {
      const visited = new Set<string>()
      let cursor: LedgerMilitaryUnitItem | undefined = unitItem
      while (cursor && !visited.has(cursor.id)) {
        visited.add(cursor.id)
        if (cursor.administrationDepartment) {
          return cursor.administrationDepartment
        }
        cursor = cursor.parentUnitId
          ? unitById.get(cursor.parentUnitId)
          : undefined
      }
      return null
    },
    [unitById],
  )

  // 요약 지표 계산
  const kpiMetrics = useMemo(() => {
    const polityKeys = new Set<string>()
    let highAndStrategicCount = 0
    let deploymentLinkCount = 0
    for (const unitItem of allUnits) {
      const polityId =
        unitItem.historicalCountryId ?? unitItem.countryId ?? null
      if (polityId) polityKeys.add(polityId)
      if (
        unitItem.unitType &&
        [
          'SUPREME_COMMAND',
          'GENERAL_STAFF',
          'SERVICE_HQ',
          'THEATER',
          'ARMY_GROUP',
          'FRONT',
          'MILITARY_DISTRICT',
          'FIELD_ARMY',
          'FLEET',
          'AIR_FLEET',
        ].includes(unitItem.unitType)
      ) {
        highAndStrategicCount += 1
      }
      deploymentLinkCount +=
        (unitItem.sideDeployedUnits?.length ?? 0) +
        (unitItem.eventRelations?.length ?? 0)
    }
    return {
      totalUnits: allUnits.length,
      polityCount: polityKeys.size,
      highAndStrategicCount,
      deploymentLinkCount,
    }
  }, [allUnits])

  // 시대 띠(GovernmentEraStrip) 버킷 계산
  const eraStripData = useMemo(() => {
    const centuryCounts = new Map<number, number>()
    const decadeCounts = new Map<number, number>()
    const spans: GovernmentEraSpanItem[] = []
    let undatedCount = 0

    for (const unitItem of allUnits) {
      const startYr = extractSignedYear(
        unitItem.established,
        unitItem.establishedDate,
      )
      const endYr = extractSignedYear(
        unitItem.disbanded,
        unitItem.disbandedDate,
      )
      if (startYr == null) {
        undatedCount += 1
        continue
      }
      const cVal = centuryOf(startYr)
      centuryCounts.set(cVal, (centuryCounts.get(cVal) ?? 0) + 1)
      const decStart = Math.floor(startYr / 10) * 10
      decadeCounts.set(decStart, (decadeCounts.get(decStart) ?? 0) + 1)

      if (
        unitItem.unitType &&
        [
          'SUPREME_COMMAND',
          'GENERAL_STAFF',
          'SERVICE_HQ',
          'THEATER',
          'ARMY_GROUP',
          'FRONT',
          'FLEET',
        ].includes(unitItem.unitType)
      ) {
        const effectiveEnd =
          endYr ?? (unitItem.isActive !== false ? new Date().getFullYear() : startYr)
        if (effectiveEnd - startYr >= 3) {
          spans.push({
            id: unitItem.id,
            title: unitItem.name,
            from: startYr,
            to: effectiveEnd,
          })
        }
      }
    }

    const buckets: GovernmentCenturyBucket[] = [...centuryCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([century, count]) => ({
        key: `c:${century}`,
        century,
        count,
      }))

    const decadeBuckets: GovernmentDecadeBucket[] = [
      ...decadeCounts.entries(),
    ]
      .sort((a, b) => a[0] - b[0])
      .map(([decadeStartYear, count]) => {
        const rep = decadeStartYear === 0 ? 1 : decadeStartYear + 5
        const century = centuryOf(rep)
        return {
          key: `d:${decadeStartYear}`,
          decadeStartYear,
          centuryKey: `c:${century}`,
          count,
        }
      })

    return { buckets, decadeBuckets, spans: spans.slice(0, 24), undatedCount }
  }, [allUnits])

  // 국가 옵션 목록 (현대 국가 통합 + 개별 역사정치체 지원)
  const countryOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    const bump = (name: string) => {
      const prev = counts.get(name)
      if (prev) prev.count += 1
      else counts.set(name, { label: name, count: 1 })
    }
    for (const unitItem of allUnits) {
      const histName = unitItem.historicalCountry?.name?.trim() || null
      const modName = unitItem.country?.name?.trim() || null
      if (histName) bump(histName)
      if (modName && modName !== histName) bump(modName)
      if (!histName && !modName) bump('국가 미지정')
    }
    return [...counts.values()].sort((a, b) => {
      if (a.label === '국가 미지정') return 1
      if (b.label === '국가 미지정') return -1
      return b.count - a.count || a.label.localeCompare(b.label, 'ko')
    })
  }, [allUnits])

  const parsedSnapshotYear = useMemo(
    () => parseSnapshotYearInput(activeYearInput),
    [activeYearInput],
  )

  // 군종 탭 건수 (군종 외 필터 적용 기준)
  const preBranchFilteredUnits = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()

    return allUnits.filter((unitItem) => {
      const histLabel = unitItem.historicalCountry?.name?.trim() || null
      const modLabel = unitItem.country?.name?.trim() || null
      const countryLabel = histLabel ?? modLabel ?? '국가 미지정'
      if (countryFilter) {
        const matchesCountry =
          countryFilter === '국가 미지정'
            ? !histLabel && !modLabel
            : histLabel === countryFilter || modLabel === countryFilter
        if (!matchesCountry) return false
      }
      if (!matchesEchelonTier(unitItem.unitType, echelonTier)) return false
      if (currentOnly && unitItem.isActive === false) return false

      const startYr = extractSignedYear(
        unitItem.established,
        unitItem.establishedDate,
      )
      const endYr = extractSignedYear(
        unitItem.disbanded,
        unitItem.disbandedDate,
      )

      if (activeDecadeStart !== null) {
        if (startYr == null) return false
        const decEnd = activeDecadeStart + 9
        const unitEnd =
          endYr ??
          (unitItem.isActive !== false ? new Date().getFullYear() : startYr)
        if (startYr > decEnd || unitEnd < activeDecadeStart) return false
      } else if (activeCenturyKey && activeCenturyKey.startsWith('c:')) {
        const targetCentury = Number(activeCenturyKey.slice(2))
        if (Number.isFinite(targetCentury)) {
          if (startYr == null) return false
          const unitStartCentury = centuryOf(startYr)
          const unitEndCentury =
            endYr != null
              ? centuryOf(endYr)
              : unitItem.isActive !== false
                ? centuryOf(new Date().getFullYear())
                : unitStartCentury
          if (
            targetCentury < unitStartCentury ||
            targetCentury > unitEndCentury
          ) {
            return false
          }
        }
      }

      if (parsedSnapshotYear !== null) {
        if (startYr == null && endYr == null) return false
        if (startYr != null && parsedSnapshotYear < startYr) return false
        if (endYr != null && parsedSnapshotYear > endYr) return false
      }

      if (q) {
        const commanderNames = [
          ...(unitItem.tenures ?? []).map(
            (t) => `${t.person?.name ?? ''} ${t.person?.surname ?? ''}`,
          ),
          ...(unitItem.commanders ?? []).map(
            (c) => `${c.person?.name ?? ''} ${c.person?.surname ?? ''}`,
          ),
        ].join(' ')
        const haystack = [
          unitItem.name,
          unitItem.abbreviation,
          unitItem.nameLocal,
          unitItem.nameEn,
          unitItem.nickname,
          unitItem.garrison,
          histLabel,
          modLabel,
          commanderNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [
    allUnits,
    debouncedSearch,
    countryFilter,
    echelonTier,
    currentOnly,
    activeCenturyKey,
    activeDecadeStart,
    parsedSnapshotYear,
  ])

  const branchCounts = useMemo(() => {
    const counts: Record<BranchTabKey, number> = {
      ALL: preBranchFilteredUnits.length,
      ARMY: 0,
      NAVY: 0,
      AIR_FORCE: 0,
      MARINE_CORPS: 0,
      JOINT_OTHER: 0,
    }
    for (const unitItem of preBranchFilteredUnits) {
      if (matchesBranchTab(unitItem.branch, 'ARMY')) counts.ARMY += 1
      else if (matchesBranchTab(unitItem.branch, 'NAVY')) counts.NAVY += 1
      else if (matchesBranchTab(unitItem.branch, 'AIR_FORCE')) {
        counts.AIR_FORCE += 1
      } else if (matchesBranchTab(unitItem.branch, 'MARINE_CORPS')) {
        counts.MARINE_CORPS += 1
      } else {
        counts.JOINT_OTHER += 1
      }
    }
    return counts
  }, [preBranchFilteredUnits])

  const filteredUnits = useMemo(() => {
    if (branchTab === 'ALL') return preBranchFilteredUnits
    return preBranchFilteredUnits.filter((unitItem) =>
      matchesBranchTab(unitItem.branch, branchTab),
    )
  }, [preBranchFilteredUnits, branchTab])

  // 국가별 편제 트리 그룹화
  const countryTreeGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        key: string
        label: string
        countryId: string | null
        isHistorical: boolean
        units: LedgerMilitaryUnitItem[]
      }
    >()

    for (const unitItem of filteredUnits) {
      const hist = unitItem.historicalCountry
      const mod = unitItem.country
      const key = hist?.id
        ? `hist:${hist.id}`
        : mod?.id
          ? `mod:${mod.id}`
          : '__unassigned__'
      const label = hist?.name ?? mod?.name ?? '국가 미지정'
      const existing = groupMap.get(key)
      if (existing) {
        existing.units.push(unitItem)
      } else {
        groupMap.set(key, {
          key,
          label,
          countryId: hist?.id ?? mod?.id ?? null,
          isHistorical: Boolean(hist?.id),
          units: [unitItem],
        })
      }
    }

    return [...groupMap.values()].sort((a, b) => {
      if (a.key === '__unassigned__') return 1
      if (b.key === '__unassigned__') return -1
      return b.units.length - a.units.length || a.label.localeCompare(b.label, 'ko')
    })
  }, [filteredUnits])

  const hasActiveFilters = Boolean(
    branchTab !== 'ALL' ||
      searchInput.trim() ||
      countryFilter ||
      echelonTier !== 'ALL' ||
      activeYearInput.trim() ||
      activeCenturyKey ||
      activeDecadeStart !== null ||
      currentOnly,
  )

  const handleResetFilters = () => {
    setBranchTab('ALL')
    setSearchInput('')
    setCountryFilter('')
    setEchelonTier('ALL')
    setActiveYearInput('')
    setActiveCenturyKey(null)
    setActiveDecadeStart(null)
    setCurrentOnly(false)
  }

  const handleSelectUnitRow = useCallback(
    (unitItem: LedgerMilitaryUnitItem, evt?: React.MouseEvent) => {
      if (evt?.metaKey || evt?.ctrlKey) {
        navigate(pathKeys.militaryUnitDetail(unitItem.id), {
          state: { listSearch: location.search },
        })
        return
      }
      setPreviewUnitId(unitItem.id)
    },
    [navigate, location.search],
  )

  const allTreeGroupsCollapsed =
    countryTreeGroups.length > 0 &&
    countryTreeGroups.every((g) => collapsedCountryGroups.has(g.key))

  const toggleAllTreeGroups = () => {
    if (allTreeGroupsCollapsed) {
      setCollapsedCountryGroups(new Set())
    } else {
      setCollapsedCountryGroups(new Set(countryTreeGroups.map((g) => g.key)))
    }
  }

  const toggleCountryGroup = (groupKey: string) => {
    setCollapsedCountryGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  return (
    <PageCanvas>
      <SectionTabHeader
        variant="plain"
        title="군사 사령부 · 편제 총람"
        description="시대·국가별 최고통수기구, 야전 사령부, 함대·비행단, 전술 제대의 지휘 계통과 참전 전투서열(ORBAT) 원장"
        rightSlot={
          <AddButton type="button" onClick={() => setUnitFormOpen(true)}>
            <FiPlus size={14} /> 사령부·부대 등록
          </AddButton>
        }
      />

      <DashboardStyles.SectionHeadlineStrip aria-label="군사 총람 요약 지표">
        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            등록 사령부 · 편제
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={kpiMetrics.totalUnits === 0}
          >
            {kpiMetrics.totalUnits > 0 ? (
              <>
                {kpiMetrics.totalUnits.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '미등록'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            현재 조건 일치 {filteredUnits.length.toLocaleString('ko-KR')}개 부대
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            보유 국가 · 정치체
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={kpiMetrics.polityCount === 0}
          >
            {kpiMetrics.polityCount > 0 ? (
              <>
                {kpiMetrics.polityCount.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개국
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            역사 왕조·제국 및 현대 국가 통합
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            상급지휘부 · 전략제대
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={kpiMetrics.highAndStrategicCount === 0}
          >
            {kpiMetrics.highAndStrategicCount > 0 ? (
              <>
                {kpiMetrics.highAndStrategicCount.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            최고사령부 · 참모본부 · 집단군 · 야전군 · 함대
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            전투 투입 · 지령 기록
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={kpiMetrics.deploymentLinkCount === 0}
          >
            {kpiMetrics.deploymentLinkCount > 0 ? (
              <>
                {kpiMetrics.deploymentLinkCount.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  건
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            사건 전투서열(ORBAT) 투입 및 작전 지령 합산
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>
      </DashboardStyles.SectionHeadlineStrip>

      {eraStripData.buckets.length > 0 ? (
        <GovernmentEraStrip
          buckets={eraStripData.buckets}
          decadeBuckets={eraStripData.decadeBuckets}
          spans={eraStripData.spans}
          activeCenturyKey={activeCenturyKey}
          onJumpToCentury={(centuryKey) => {
            setActiveDecadeStart(null)
            setActiveCenturyKey((prev) =>
              prev === centuryKey ? null : centuryKey,
            )
          }}
          onJumpToDecade={(decadeBucket) => {
            setActiveCenturyKey(decadeBucket.centuryKey)
            setActiveDecadeStart((prev) =>
              prev === decadeBucket.decadeStartYear
                ? null
                : decadeBucket.decadeStartYear,
            )
          }}
          activeYearValue={activeYearInput}
          currentOnly={currentOnly}
          showCurrentToggle
          onToggleCurrentOnly={() => setCurrentOnly((prev) => !prev)}
          undatedCount={eraStripData.undatedCount}
        />
      ) : null}

      <UnderlineTabNav aria-label="군종별 편제 탭">
        {BRANCH_TABS.map((tab) => {
          const isActive = branchTab === tab.key
          const count = branchCounts[tab.key]
          return (
            <UnderlineTabButton
              key={tab.key}
              type="button"
              $active={isActive}
              onClick={() => setBranchTab(tab.key)}
            >
              <span>{tab.label}</span>
              <UnderlineTabBadge $active={isActive}>
                {count.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
          )
        })}
      </UnderlineTabNav>

      <ToolbarRow>
        <ToolbarLeftGroup>
          <LedgerSearchBox>
            <FiSearch />
            <LedgerSearchInput
              type="search"
              placeholder="부대·사령부명, 약칭, 별칭, 지휘관, 주둔지, 국가 검색…"
              value={searchInput}
              onChange={(evt) => setSearchInput(evt.target.value)}
            />
            {searchInput ? (
              <ClearIconBtn
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setSearchInput('')}
              >
                <FiX size={13} />
              </ClearIconBtn>
            ) : null}
          </LedgerSearchBox>

          <ToolbarSelect
            aria-label="국가 및 정치체 필터"
            value={countryFilter}
            onChange={(evt) => setCountryFilter(evt.target.value)}
          >
            <option value="">전체 국가 · 정치체 ({countryOptions.length})</option>
            {countryOptions.map((opt) => (
              <option key={opt.label} value={opt.label}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            aria-label="제대 규모 필터"
            value={echelonTier}
            onChange={(evt) =>
              setEchelonTier(evt.target.value as EchelonTierFilter)
            }
          >
            {ECHELON_TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ToolbarSelect>

          <SnapshotInputWrap title="특정 연도에 존속했던 편제만 단면 조회 (예: 1941, BC 218, -218)">
            <SnapshotPrefix>시점</SnapshotPrefix>
            <SnapshotInput
              type="text"
              placeholder="연도 (예: 1941, BC 218)"
              value={activeYearInput}
              onChange={(evt) => setActiveYearInput(evt.target.value)}
            />
            {activeYearInput ? (
              <ClearIconBtn
                type="button"
                aria-label="시점 연도 초기화"
                onClick={() => setActiveYearInput('')}
              >
                <FiX size={12} />
              </ClearIconBtn>
            ) : null}
          </SnapshotInputWrap>

          <LedgerFilterChip
            type="button"
            $active={currentOnly}
            onClick={() => setCurrentOnly((prev) => !prev)}
          >
            현존 편제만
          </LedgerFilterChip>
        </ToolbarLeftGroup>

        <ToolbarRightGroup>
          {viewMode === 'tree' && countryTreeGroups.length > 1 ? (
            <LedgerToolbarButton type="button" onClick={toggleAllTreeGroups}>
              {allTreeGroupsCollapsed ? '국가 모두 펼치기' : '국가 모두 접기'}
            </LedgerToolbarButton>
          ) : null}

          {hasActiveFilters ? (
            <LedgerToolbarButton type="button" onClick={handleResetFilters}>
              <FiRotateCcw size={13} />
              필터 초기화
            </LedgerToolbarButton>
          ) : null}

          <LedgerViewSwitch role="group" aria-label="보기 방식 전환">
            <LedgerViewSwitchItem
              type="button"
              $active={viewMode === 'ledger'}
              onClick={() => setViewMode('ledger')}
            >
              <FiList size={13} />
              원장 표
            </LedgerViewSwitchItem>
            <LedgerViewSwitchItem
              type="button"
              $active={viewMode === 'tree'}
              onClick={() => setViewMode('tree')}
            >
              <FiGitBranch size={13} />
              국가별 편제 트리
            </LedgerViewSwitchItem>
          </LedgerViewSwitch>
        </ToolbarRightGroup>
      </ToolbarRow>

      {hasActiveFilters ? (
        <ActiveFilterBar>
          {countryFilter ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setCountryFilter('')}
            >
              국가: {countryFilter} <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
          {echelonTier !== 'ALL' ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setEchelonTier('ALL')}
            >
              제대:{' '}
              {ECHELON_TIER_OPTIONS.find((o) => o.value === echelonTier)?.label}{' '}
              <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
          {activeDecadeStart !== null ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setActiveDecadeStart(null)}
            >
              10년대:{' '}
              {activeDecadeStart < 0
                ? `BC ${Math.abs(activeDecadeStart)}년대`
                : `${activeDecadeStart}년대`}{' '}
              <FiX size={11} />
            </LedgerFilterChip>
          ) : activeCenturyKey ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setActiveCenturyKey(null)}
            >
              시대: {formatCenturyChipLabel(activeCenturyKey)} <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
          {parsedSnapshotYear !== null ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setActiveYearInput('')}
            >
              시점:{' '}
              {parsedSnapshotYear < 0
                ? `BC ${Math.abs(parsedSnapshotYear)}년`
                : `${parsedSnapshotYear}년`}{' '}
              <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
          {currentOnly ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setCurrentOnly(false)}
            >
              현존 편제만 <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
        </ActiveFilterBar>
      ) : null}

      <LedgerSurfacePanel>
        {unitsQuery.isLoading ? (
          <LoadingBox>사령부·부대 원장을 불러오는 중입니다…</LoadingBox>
        ) : allUnits.length === 0 ? (
          <EmptyStateSpotlight
            flat
            icon={<FiShield size={24} />}
            title="등록된 군사 사령부·부대가 없습니다"
            description="국방군 최고사령부, 참모본부, 집단군·야전군, 함대·사단 등 시대별 군사 편제를 등록해 보세요."
            primaryAction={{
              label: '사령부·부대 등록',
              onClick: () => setUnitFormOpen(true),
            }}
          />
        ) : filteredUnits.length === 0 ? (
          <EmptyStateSpotlight
            flat
            icon={<FiSearch size={22} />}
            title="조건에 일치하는 군사 편제가 없습니다"
            description="검색어, 세기·연도 단면, 군종 또는 국가 필터를 조정해 보세요."
            primaryAction={{
              label: '필터 초기화',
              onClick: handleResetFilters,
            }}
          />
        ) : viewMode === 'ledger' ? (
          <MilitaryUnitsLedgerView
            units={filteredUnits}
            allUnits={allUnits}
            selectedUnitId={previewUnitId}
            showCountryColumn
            onCountryClick={(targetCountryId) => {
              const matchedUnit = allUnits.find(
                (u) =>
                  u.historicalCountry?.id === targetCountryId ||
                  u.country?.id === targetCountryId,
              )
              if (matchedUnit?.historicalCountry?.id === targetCountryId) {
                setCountryModalTarget({
                  kind: 'historical',
                  id: targetCountryId,
                  name: matchedUnit.historicalCountry.name,
                })
              } else {
                setCountryModalTarget({
                  kind: 'modern',
                  id: targetCountryId,
                  name: matchedUnit?.country?.name ?? undefined,
                })
              }
            }}
            unitTypeLabels={UNIT_TYPE_LABELS}
            branchLabels={BRANCH_LABELS}
            echelonOrder={ECHELON_ORDER}
            resolveEffectiveDepartment={resolveEffectiveDepartment}
            onSelectUnit={handleSelectUnitRow}
          />
        ) : (
          <CountryTreeContainer>
            {countryTreeGroups.map((group) => {
              const isCollapsed = collapsedCountryGroups.has(group.key)
              const groupIdSet = new Set(group.units.map((u) => u.id))
              const childrenMap = new Map<string, LedgerMilitaryUnitItem[]>()
              const roots: LedgerMilitaryUnitItem[] = []

              const sortedGroupUnits = [...group.units].sort((a, b) => {
                const rA = a.unitType ? (ECHELON_ORDER[a.unitType] ?? 50) : 50
                const rB = b.unitType ? (ECHELON_ORDER[b.unitType] ?? 50) : 50
                if (rA !== rB) return rA - rB
                return a.name.localeCompare(b.name, 'ko')
              })

              for (const unitItem of sortedGroupUnits) {
                if (
                  unitItem.parentUnitId &&
                  groupIdSet.has(unitItem.parentUnitId)
                ) {
                  const arr = childrenMap.get(unitItem.parentUnitId) ?? []
                  arr.push(unitItem)
                  childrenMap.set(unitItem.parentUnitId, arr)
                } else {
                  roots.push(unitItem)
                }
              }

              const renderTreeNodes = (
                nodes: LedgerMilitaryUnitItem[],
                depth: number,
                visited: Set<string>,
              ): React.ReactNode =>
                nodes.map((node) => {
                  if (visited.has(node.id)) return null
                  const nextVisited = new Set(visited)
                  nextVisited.add(node.id)
                  const childNodes = childrenMap.get(node.id) ?? []
                  const typeLabel = node.unitType
                    ? (UNIT_TYPE_LABELS[node.unitType] ?? node.unitType)
                    : '편제'
                  const branchText = node.branch
                    ? (BRANCH_LABELS[node.branch] ?? node.branch)
                    : null
                  const battleCount = node.sideDeployedUnits?.length ?? 0

                  return (
                    <React.Fragment key={node.id}>
                      <TreeUnitRow
                        type="button"
                        $depth={depth}
                        onClick={(evt) => {
                          if (evt.metaKey || evt.ctrlKey) {
                            navigate(pathKeys.militaryUnitDetail(node.id), {
                              state: { listSearch: location.search },
                            })
                            return
                          }
                          handleSelectUnitRow(node)
                        }}
                      >
                        <TreeRowLeft>
                          {depth > 0 ? <TreeIndentConnector>↳</TreeIndentConnector> : null}
                          <TreeEchelonTag>{typeLabel}</TreeEchelonTag>
                          {branchText ? (
                            <TreeBranchTag>{branchText}</TreeBranchTag>
                          ) : null}
                          <TreeUnitTitle>
                            {node.name}
                            {node.abbreviation ? ` (${node.abbreviation})` : ''}
                          </TreeUnitTitle>
                          {node.nickname ? (
                            <TreeUnitNick>“{node.nickname}”</TreeUnitNick>
                          ) : null}
                        </TreeRowLeft>
                        <TreeRowRight>
                          {battleCount > 0 ? (
                            <TreeStatPill>참전 {battleCount}</TreeStatPill>
                          ) : null}
                          {childNodes.length > 0 ? (
                            <TreeSubCount>예하 {childNodes.length}</TreeSubCount>
                          ) : null}
                        </TreeRowRight>
                      </TreeUnitRow>
                      {childNodes.length > 0
                        ? renderTreeNodes(childNodes, depth + 1, nextVisited)
                        : null}
                    </React.Fragment>
                  )
                })

              return (
                <CountryTreeSection key={group.key}>
                  <CountryGroupBand>
                    <CountryGroupToggle
                      type="button"
                      onClick={() => toggleCountryGroup(group.key)}
                    >
                      {isCollapsed ? (
                        <FiChevronRight size={14} />
                      ) : (
                        <FiChevronDown size={14} />
                      )}
                      <strong>{group.label}</strong>
                      <CountryGroupCount>
                        {group.units.length}개 편제
                      </CountryGroupCount>
                    </CountryGroupToggle>
                    {group.countryId ? (
                      <CountryJumpBtn
                        type="button"
                        onClick={() =>
                          navigate(pathKeys.countryMilitary(group.countryId!))
                        }
                      >
                        국가 군사 탭 보기 →
                      </CountryJumpBtn>
                    ) : null}
                  </CountryGroupBand>
                  {!isCollapsed ? (
                    <CountryTreeList>
                      {renderTreeNodes(roots, 0, new Set())}
                    </CountryTreeList>
                  ) : null}
                </CountryTreeSection>
              )
            })}
          </CountryTreeContainer>
        )}
      </LedgerSurfacePanel>

      <MilitaryUnitDetailDrawer
        unitId={previewUnitId}
        listSearch={location.search}
        onClose={() => setPreviewUnitId(null)}
        onSelectUnit={(nextId) => setPreviewUnitId(nextId)}
        onEditUnit={(targetId) => {
          setEditingUnitId(targetId)
          setUnitFormOpen(true)
        }}
      />

      <MilitaryUnitFormModal
        isOpen={unitFormOpen}
        onClose={() => {
          setUnitFormOpen(false)
          setEditingUnitId(null)
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['military-units'] })
          void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
        }}
        editingUnitId={editingUnitId}
      />

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
      />
    </PageCanvas>
  )
}

const PageCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px clamp(20px, 2.8vw, 36px) 56px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
    gap: 14px;
  }
`

const ToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const ToolbarLeftGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1 1 560px;
  min-width: 0;
`

const ToolbarRightGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ActiveFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const ToolbarSelect = styled.select`
  ${toolbarControlHeight}
  padding: 0 28px 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background-color: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  max-width: 220px;
  cursor: pointer;
  outline: none;
  transition: border-color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  &:focus {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const SnapshotInputWrap = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 8px 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const SnapshotPrefix = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const SnapshotInput = styled.input`
  width: 132px;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  ${DIGIT_DISPLAY}

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ClearIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const LedgerSurfacePanel = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
  min-height: 320px;
`

const LoadingBox = styled.div`
  padding: 56px 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryTreeContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const CountryTreeSection = styled.div`
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }
`

const CountryGroupBand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 14px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CountryGroupToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
`

const CountryGroupCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const CountryJumpBtn = styled.button`
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const CountryTreeList = styled.div`
  display: flex;
  flex-direction: column;
`

const TreeUnitRow = styled.button<{ $depth: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 8.5px 14px 8.5px ${({ $depth }) => 16 + Math.min($depth, 7) * 22}px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  transition: background ${MOTION.fast} ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TreeRowLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const TreeIndentConnector = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeEchelonTag = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const TreeBranchTag = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeUnitTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreeUnitNick = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeRowRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const TreeStatPill = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

const TreeSubCount = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`
