import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
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
import styled, { css, useTheme } from 'styled-components'

import {
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  MOTION,
} from '@/entities/event/ui/ledger-tokens'
import {
  extractUnitSignedYear,
  matchesMilitaryBranchTab,
  matchesMilitaryEchelonTier,
  MILITARY_BRANCH_LABELS,
  MILITARY_BRANCH_TABS,
  MILITARY_ECHELON_ORDER,
  MILITARY_ECHELON_TIER_OPTIONS,
  MILITARY_UNIT_TYPE_LABELS,
  type MilitaryBranchTabKey,
  type MilitaryEchelonTierFilter,
  militaryUnitQueryKeys,
  parseSnapshotYearInput,
  sortUnitsByEchelon,
} from '@/entities/military-unit'
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
import { militaryUnitApi } from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import {
  PopoverMenu,
  PopoverMenuDivider,
  PopoverMenuItem,
  PopoverMenuSectionLabel,
} from '@/shared/ui/popover-menu'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  LedgerFilterChip,
  LedgerSearchBox,
  LedgerSearchInput,
  LedgerViewSwitch,
  LedgerViewSwitchItem,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { MilitaryUnitFormModal } from '@/widgets/country/country-detail/ui/military-unit-form.modal'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import type { CreateSubUnitDefaults } from '@/widgets/military-unit-detail'

type BranchTabKey = MilitaryBranchTabKey
type EchelonTierFilter = MilitaryEchelonTierFilter
type CatalogViewMode = 'ledger' | 'tree'

const UNIT_TYPE_LABELS = MILITARY_UNIT_TYPE_LABELS
const BRANCH_LABELS = MILITARY_BRANCH_LABELS
const ECHELON_ORDER = MILITARY_ECHELON_ORDER
const BRANCH_TABS = MILITARY_BRANCH_TABS
const ECHELON_TIER_OPTIONS = MILITARY_ECHELON_TIER_OPTIONS
const extractSignedYear = extractUnitSignedYear
const matchesEchelonTier = matchesMilitaryEchelonTier
const matchesBranchTab = matchesMilitaryBranchTab

function formatCenturyChipLabel(centuryKey: string): string {
  const centuryNum = Number(centuryKey.replace(/^c:/, ''))
  if (!Number.isFinite(centuryNum)) return centuryKey
  return centuryNum < 0 ? `BC ${Math.abs(centuryNum)}세기` : `${centuryNum}세기`
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
  const [collapsedTreeUnitIds, setCollapsedTreeUnitIds] = useState<
    Set<string>
  >(new Set())

  const [unitFormOpen, setUnitFormOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [formDefaults, setFormDefaults] = useState<CreateSubUnitDefaults>({})
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)
  const [showInfographic, setShowInfographic] = useState(false)
  const [showEraStrip, setShowEraStrip] = useState(false)

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
    queryKey: militaryUnitQueryKeys.globalCatalog(),
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
      .sort((leftEntry, rightEntry) => leftEntry[0] - rightEntry[0])
      .map(([century, count]) => ({
        key: `c:${century}`,
        century,
        count,
      }))

    const decadeBuckets: GovernmentDecadeBucket[] = [
      ...decadeCounts.entries(),
    ]
      .sort((leftEntry, rightEntry) => leftEntry[0] - rightEntry[0])
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
    return [...counts.values()].sort((leftOpt, rightOpt) => {
      if (leftOpt.label === '국가 미지정') return 1
      if (rightOpt.label === '국가 미지정') return -1
      return (
        rightOpt.count - leftOpt.count ||
        leftOpt.label.localeCompare(rightOpt.label, 'ko')
      )
    })
  }, [allUnits])

  const parsedSnapshotYear = useMemo(
    () => parseSnapshotYearInput(activeYearInput),
    [activeYearInput],
  )

  // 군종 탭 건수 (군종 외 필터 적용 기준)
  const preBranchFilteredUnits = useMemo(() => {
    const queryText = debouncedSearch.trim().toLowerCase()

    return allUnits.filter((unitItem) => {
      const histLabel = unitItem.historicalCountry?.name?.trim() || null
      const modLabel = unitItem.country?.name?.trim() || null
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

      if (queryText) {
        const commanderNames = [
          ...(unitItem.tenures ?? []).map(
            (tenureItem) =>
              `${tenureItem.person?.name ?? ''} ${tenureItem.person?.surname ?? ''}`,
          ),
          ...(unitItem.commanders ?? []).map(
            (cmdItem) =>
              `${cmdItem.person?.name ?? ''} ${cmdItem.person?.surname ?? ''}`,
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
        if (!haystack.includes(queryText)) return false
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

  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'

  const filteredUnits = useMemo(() => {
    if (branchTab === 'ALL') return preBranchFilteredUnits
    return preBranchFilteredUnits.filter((unitItem) =>
      matchesBranchTab(unitItem.branch, branchTab),
    )
  }, [preBranchFilteredUnits, branchTab])

  const branchSlices = useMemo<SegmentSlice[]>(
    () => [
      {
        key: 'ARMY',
        label: '육군',
        value: branchCounts.ARMY,
        color: isDarkMode ? '#34d399' : '#059669',
      },
      {
        key: 'NAVY',
        label: '해군·해안경비대',
        value: branchCounts.NAVY,
        color: isDarkMode ? '#60a5fa' : '#2563eb',
      },
      {
        key: 'AIR_FORCE',
        label: '공군·우주군',
        value: branchCounts.AIR_FORCE,
        color: isDarkMode ? '#38bdf8' : '#0284c7',
      },
      {
        key: 'MARINE_CORPS',
        label: '해병대',
        value: branchCounts.MARINE_CORPS,
        color: isDarkMode ? '#f87171' : '#dc2626',
      },
      {
        key: 'JOINT_OTHER',
        label: '합동·특수·기타',
        value: branchCounts.JOINT_OTHER,
        color: isDarkMode ? '#a5b4fc' : '#4f46e5',
      },
    ],
    [branchCounts, isDarkMode],
  )

  const echelonAndStatusStats = useMemo(() => {
    let highCommand = 0
    let strategic = 0
    let operational = 0
    let tactical = 0
    let activeCount = 0
    let disbandedCount = 0

    for (const unitItem of filteredUnits) {
      if (matchesEchelonTier(unitItem.unitType, 'HIGH_COMMAND')) highCommand += 1
      else if (matchesEchelonTier(unitItem.unitType, 'STRATEGIC')) strategic += 1
      else if (matchesEchelonTier(unitItem.unitType, 'OPERATIONAL')) {
        operational += 1
      } else {
        tactical += 1
      }

      if (unitItem.isActive === false) disbandedCount += 1
      else activeCount += 1
    }

    const echelonSlices: SegmentSlice[] = [
      {
        key: 'HIGH_COMMAND',
        label: '상급사령부',
        value: highCommand,
        color: isDarkMode ? '#a5b4fc' : '#4f46e5',
      },
      {
        key: 'STRATEGIC',
        label: '전구·집단군',
        value: strategic,
        color: isDarkMode ? '#c4b5fd' : '#7c3aed',
      },
      {
        key: 'OPERATIONAL',
        label: '군단·사단·함대',
        value: operational,
        color: isDarkMode ? '#38bdf8' : '#0284c7',
      },
      {
        key: 'TACTICAL',
        label: '전술부대·기타',
        value: tactical,
        color: isDarkMode ? '#2dd4bf' : '#0d9488',
      },
    ]

    const total = activeCount + disbandedCount
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0
    const disbandedPct = total > 0 ? 100 - activePct : 0
    const statusSlices: SegmentSlice[] = [
      {
        key: 'ACTIVE',
        label: '현역·존속',
        value: activeCount,
        color: isDarkMode ? '#34d399' : '#059669',
        meta: `${activeCount.toLocaleString('ko-KR')} (${activePct}%)`,
      },
      {
        key: 'DISBANDED',
        label: '해체·폐지',
        value: disbandedCount,
        color: isDarkMode ? '#94a3b8' : '#64748b',
        meta: `${disbandedCount.toLocaleString('ko-KR')} (${disbandedPct}%)`,
      },
    ]

    return {
      echelonSlices,
      statusSlices,
      activeCount,
      disbandedCount,
      activePct,
    }
  }, [filteredUnits, isDarkMode])

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

    return [...groupMap.values()].sort((leftGroup, rightGroup) => {
      if (leftGroup.key === '__unassigned__') return 1
      if (rightGroup.key === '__unassigned__') return -1
      return (
        rightGroup.units.length - leftGroup.units.length ||
        leftGroup.label.localeCompare(rightGroup.label, 'ko')
      )
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
    (unitItem: LedgerMilitaryUnitItem) => {
      navigate(pathKeys.militaryUnitDetail(unitItem.id), {
        state: { listSearch: location.search },
      })
    },
    [navigate, location.search],
  )

  const allTreeGroupsCollapsed =
    countryTreeGroups.length > 0 &&
    countryTreeGroups.every((groupItem) =>
      collapsedCountryGroups.has(groupItem.key),
    )

  const toggleAllTreeGroups = () => {
    if (allTreeGroupsCollapsed) {
      setCollapsedCountryGroups(new Set())
    } else {
      setCollapsedCountryGroups(
        new Set(countryTreeGroups.map((groupItem) => groupItem.key)),
      )
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

      {showInfographic ? (
        <EditorialSummaryGrid aria-label="군사 총람 인포그래픽 요약">
          <EditorialSummaryCol>
            <EditorialSummaryHead>
              <EditorialSummaryTitle>
                군종 전력 구성
                <span>{branchCounts.ALL.toLocaleString('ko-KR')}개</span>
              </EditorialSummaryTitle>
              <SummaryMetaGroup>
                <span>
                  정치체{' '}
                  <strong>
                    {kpiMetrics.polityCount.toLocaleString('ko-KR')}
                  </strong>
                  개국
                </span>
                <span>·</span>
                <span>
                  전투투입·지령{' '}
                  <strong>
                    {kpiMetrics.deploymentLinkCount.toLocaleString('ko-KR')}
                  </strong>
                  건
                </span>
              </SummaryMetaGroup>
            </EditorialSummaryHead>
            {branchCounts.ALL > 0 ? (
              <BranchSummaryLayout>
                <MiniDonutRing
                  slices={branchSlices}
                  size={74}
                  strokeWidth={9}
                  centerValue={branchCounts.ALL.toLocaleString('ko-KR')}
                  centerLabel="편제"
                />
                <BranchSummaryRight>
                  <StackedSegmentBar slices={branchSlices} height={10} />
                  <SummaryFootNote>
                    등록 총원 {kpiMetrics.totalUnits.toLocaleString('ko-KR')}개 ·
                    현재 조건 일치{' '}
                    {filteredUnits.length.toLocaleString('ko-KR')}개 부대
                  </SummaryFootNote>
                </BranchSummaryRight>
              </BranchSummaryLayout>
            ) : (
              <SummaryEmptyText>
                현재 필터 조건에 해당하는 군종 편제가 없습니다.
              </SummaryEmptyText>
            )}
          </EditorialSummaryCol>

          <EditorialSummaryCol>
            <EditorialSummaryHead>
              <EditorialSummaryTitle>
                지휘 제대 · 현역 비중
                <span>
                  상급·전략{' '}
                  {kpiMetrics.highAndStrategicCount.toLocaleString('ko-KR')}개
                </span>
              </EditorialSummaryTitle>
              <SummaryMetaGroup>
                <span>
                  현역 비율 <strong>{echelonAndStatusStats.activePct}%</strong>
                </span>
              </SummaryMetaGroup>
            </EditorialSummaryHead>
            {filteredUnits.length > 0 ? (
              <>
                <SummarySectionBlock>
                  <SummarySubLabel>지휘 제대 구성</SummarySubLabel>
                  <StackedSegmentBar
                    slices={echelonAndStatusStats.echelonSlices}
                    height={9}
                  />
                </SummarySectionBlock>
                <SummaryHairline />
                <SummarySectionBlock>
                  <SummarySubLabel>현역 · 해체 편제 비율</SummarySubLabel>
                  <StackedSegmentBar
                    slices={echelonAndStatusStats.statusSlices}
                    height={7}
                  />
                </SummarySectionBlock>
              </>
            ) : (
              <SummaryEmptyText>
                현재 필터 조건에 해당하는 지휘 제대 데이터가 없습니다.
              </SummaryEmptyText>
            )}
          </EditorialSummaryCol>
        </EditorialSummaryGrid>
      ) : null}

      {(showEraStrip ||
        Boolean(activeCenturyKey) ||
        activeDecadeStart !== null) &&
      eraStripData.buckets.length > 0 ? (
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

      <ToolbarRow>
        <CatalogBranchRow role="group" aria-label="군종 필터">
          {BRANCH_TABS.filter(
            (tab) =>
              tab.key === 'ALL' ||
              branchCounts[tab.key] > 0 ||
              branchTab === tab.key,
          ).map((tab) => (
            <CatalogBranchBtn
              key={tab.key}
              type="button"
              $active={branchTab === tab.key}
              onClick={() => setBranchTab(tab.key)}
            >
              <span>{tab.label}</span>
              <small>{branchCounts[tab.key].toLocaleString('ko-KR')}</small>
            </CatalogBranchBtn>
          ))}
        </CatalogBranchRow>

        <ToolbarRightGroup>
          <CountryPickerWrap>
            <SearchableSelect
              size="sm"
              ariaLabel="국가 및 정치체 필터"
              clearable
              value={countryFilter}
              onChange={(nextVal) => setCountryFilter(nextVal)}
              placeholder={`전체 국가 · 정체 (${countryOptions.length})`}
              searchPlaceholder="국가 · 시대 정치체 검색…"
              options={countryOptions.map<SearchableSelectOption>((opt) => ({
                value: opt.label,
                label: opt.label,
                meta: `${opt.count}개`,
              }))}
            />
          </CountryPickerWrap>

          <LedgerSearchBox style={{ maxWidth: 268 }}>
            <FiSearch />
            <LedgerSearchInput
              type="search"
              placeholder="사령부·부대, 지휘관, 주둔지 검색…"
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
              국가별 트리
            </LedgerViewSwitchItem>
          </LedgerViewSwitch>

          <PopoverMenu
            ariaLabel="화면 보기 및 상세 필터 설정"
            title="상세 필터 · 통계 요약 · 시대 막대 설정"
            minWidth={260}
            active={
              showInfographic ||
              showEraStrip ||
              echelonTier !== 'ALL' ||
              parsedSnapshotYear !== null ||
              currentOnly
            }
          >
            {(closeMenu) => (
              <>
                <PopoverMenuSectionLabel>보조 패널 표시</PopoverMenuSectionLabel>
                <PopoverMenuItem
                  type="button"
                  onClick={() => setShowInfographic((prev) => !prev)}
                >
                  <FiBarChart2 size={13} />
                  <span>통계 요약 인포그래픽 보기</span>
                  {showInfographic ? (
                    <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                  ) : null}
                </PopoverMenuItem>
                {eraStripData.buckets.length > 0 ? (
                  <PopoverMenuItem
                    type="button"
                    onClick={() => setShowEraStrip((prev) => !prev)}
                  >
                    <FiCalendar size={13} />
                    <span>시대 · 세기 탐색 막대 보기</span>
                    {showEraStrip ? (
                      <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </PopoverMenuItem>
                ) : null}

                {viewMode === 'tree' && countryTreeGroups.length > 1 ? (
                  <>
                    <PopoverMenuDivider />
                    <PopoverMenuItem
                      type="button"
                      onClick={() => {
                        toggleAllTreeGroups()
                        closeMenu()
                      }}
                    >
                      <FiGitBranch size={13} />
                      <span>
                        {allTreeGroupsCollapsed
                          ? '국가 그룹 모두 펼치기'
                          : '국가 그룹 모두 접기'}
                      </span>
                    </PopoverMenuItem>
                  </>
                ) : null}

                <PopoverMenuDivider />
                <PopoverMenuSectionLabel>제대 규모 필터</PopoverMenuSectionLabel>
                {ECHELON_TIER_OPTIONS.map((opt) => {
                  const isActiveTier = echelonTier === opt.value
                  return (
                    <PopoverMenuItem
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setEchelonTier(opt.value)
                        closeMenu()
                      }}
                    >
                      <span>{opt.label}</span>
                      {isActiveTier ? (
                        <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                      ) : null}
                    </PopoverMenuItem>
                  )
                })}

                <PopoverMenuDivider />
                <PopoverMenuSectionLabel>기준 연도 스냅샷</PopoverMenuSectionLabel>
                <SnapshotInputWrap
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  title="특정 연도에 존속했던 편제만 단면 조회 (예: 1941, BC 218)"
                >
                  <SnapshotPrefix>시점</SnapshotPrefix>
                  <SnapshotInput
                    type="text"
                    placeholder="연도 (예: 1941, BC 218)"
                    value={activeYearInput}
                    onChange={(evt) => setActiveYearInput(evt.target.value)}
                    style={{ width: '100%' }}
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

                <PopoverMenuItem
                  type="button"
                  onClick={() => setCurrentOnly((prev) => !prev)}
                >
                  <FiShield size={13} />
                  <span>현존 편제만 보기</span>
                  {currentOnly ? (
                    <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                  ) : null}
                </PopoverMenuItem>

                {hasActiveFilters ? (
                  <>
                    <PopoverMenuDivider />
                    <PopoverMenuItem
                      type="button"
                      onClick={() => {
                        handleResetFilters()
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
        </ToolbarRightGroup>
      </ToolbarRow>

      {hasActiveFilters ? (
        <ActiveFilterBar>
          {branchTab !== 'ALL' ? (
            <LedgerFilterChip
              type="button"
              $active
              onClick={() => setBranchTab('ALL')}
            >
              군종:{' '}
              {BRANCH_TABS.find((tabItem) => tabItem.key === branchTab)?.label}{' '}
              <FiX size={11} />
            </LedgerFilterChip>
          ) : null}
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
              {
                ECHELON_TIER_OPTIONS.find(
                  (optItem) => optItem.value === echelonTier,
                )?.label
              }{' '}
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
            showCountryColumn
            onEditUnit={(targetId) => {
              setEditingUnitId(targetId)
              setFormDefaults({})
              setUnitFormOpen(true)
            }}
            onCreateSubUnit={(parentItem) => {
              setEditingUnitId(null)
              setFormDefaults({
                parentUnitId: parentItem.id,
                countryId: parentItem.countryId ?? null,
                historicalCountryId: parentItem.historicalCountryId ?? null,
                administrationDepartmentId:
                  parentItem.administrationDepartmentId ??
                  parentItem.administrationDepartment?.id ??
                  null,
                branch: parentItem.branch ?? null,
              })
              setUnitFormOpen(true)
            }}
            onCountryClick={(targetCountryId) => {
              const matchedUnit = allUnits.find(
                (unitCandidate) =>
                  unitCandidate.historicalCountry?.id === targetCountryId ||
                  unitCandidate.country?.id === targetCountryId,
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
              const groupIdSet = new Set(
                group.units.map((unitEntry) => unitEntry.id),
              )
              const childrenMap = new Map<string, LedgerMilitaryUnitItem[]>()
              const roots: LedgerMilitaryUnitItem[] = []

              const sortedGroupUnits = sortUnitsByEchelon(group.units)

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
                  const childNodes = (childrenMap.get(node.id) ?? []).filter(
                    (childCandidate) => !nextVisited.has(childCandidate.id),
                  )
                  const hasChildren = childNodes.length > 0
                  const isNodeCollapsed = collapsedTreeUnitIds.has(node.id)
                  const typeLabel = node.unitType
                    ? (UNIT_TYPE_LABELS[node.unitType] ?? node.unitType)
                    : null
                  const branchText = node.branch
                    ? (BRANCH_LABELS[node.branch] ?? node.branch)
                    : null
                  const classText = [typeLabel, branchText]
                    .filter(Boolean)
                    .join(' · ')

                  const startYr = extractSignedYear(
                    node.established,
                    node.establishedDate,
                  )
                  const endYr = extractSignedYear(
                    node.disbanded,
                    node.disbandedDate,
                  )
                  const fmtYr = (yr: number) =>
                    yr < 0 ? `BC ${Math.abs(yr)}` : String(yr)
                  const periodShort =
                    startYr != null && endYr != null
                      ? startYr === endYr
                        ? fmtYr(startYr)
                        : `${fmtYr(startYr)}–${fmtYr(endYr)}`
                      : startYr != null
                        ? node.isActive === false
                          ? `${fmtYr(startYr)}–?`
                          : `${fmtYr(startYr)}–`
                        : endYr != null
                          ? `–${fmtYr(endYr)}`
                          : node.isActive === false
                            ? '해체'
                            : null

                  const leadTenurePerson = node.tenures?.[0]?.person
                  const leadLegacyPerson = node.commanders?.[0]?.person
                  const leadPerson = leadTenurePerson ?? leadLegacyPerson
                  const leadCommanderName = leadPerson
                    ? [leadPerson.name, leadPerson.surname]
                        .filter(Boolean)
                        .join(' ')
                    : null

                  const combatCount =
                    (node.sideDeployedUnits?.length ?? 0) +
                    (node.eventRelations?.length ?? 0)

                  return (
                    <CatalogTreeNodeWrap key={node.id} $child={depth > 0}>
                      <TreeUnitRow
                        $root={depth === 0}
                        role="link"
                        tabIndex={0}
                        onClick={() => handleSelectUnitRow(node)}
                        onKeyDown={(keyEvt) => {
                          if (keyEvt.key === 'Enter' || keyEvt.key === ' ') {
                            keyEvt.preventDefault()
                            handleSelectUnitRow(node)
                          }
                        }}
                      >
                        <TreeRowLeft>
                          {hasChildren ? (
                            <TreeNodeToggleBtn
                              type="button"
                              aria-label={
                                isNodeCollapsed
                                  ? '예하 편제 펼치기'
                                  : '예하 편제 접기'
                              }
                              onClick={(evt) => {
                                evt.stopPropagation()
                                setCollapsedTreeUnitIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(node.id)) next.delete(node.id)
                                  else next.add(node.id)
                                  return next
                                })
                              }}
                            >
                              {isNodeCollapsed ? (
                                <FiChevronRight size={13.5} />
                              ) : (
                                <FiChevronDown size={13.5} />
                              )}
                            </TreeNodeToggleBtn>
                          ) : (
                            <TreeLeafDot aria-hidden />
                          )}

                          {node.insigniaUrl ? (
                            <TreeEmblemImg
                              src={getUploadImageUrl(node.insigniaUrl)}
                              alt=""
                              onError={(imgEvt) => {
                                imgEvt.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : null}

                          <TreeUnitTitle $root={depth === 0}>
                            {node.name}
                            {node.abbreviation ? (
                              <TreeAbbrSpan>
                                {' '}
                                ({node.abbreviation})
                              </TreeAbbrSpan>
                            ) : null}
                          </TreeUnitTitle>

                          {classText ? (
                            <TreeClassSpan>{classText}</TreeClassSpan>
                          ) : null}

                          {periodShort ? (
                            <TreePeriodSpan>· {periodShort}</TreePeriodSpan>
                          ) : null}
                        </TreeRowLeft>

                        <TreeRowRight>
                          {leadCommanderName ? (
                            <TreeCmdSpan>{leadCommanderName}</TreeCmdSpan>
                          ) : null}
                          {hasChildren ? (
                            <TreeSubCount>예하 {childNodes.length}</TreeSubCount>
                          ) : null}
                          {combatCount > 0 ? (
                            <TreeCombatCount>참전 {combatCount}</TreeCombatCount>
                          ) : null}
                        </TreeRowRight>
                      </TreeUnitRow>

                      {hasChildren && !isNodeCollapsed ? (
                        <CatalogTreeChildrenRail>
                          {renderTreeNodes(childNodes, depth + 1, nextVisited)}
                        </CatalogTreeChildrenRail>
                      ) : null}
                    </CatalogTreeNodeWrap>
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
                      <PopoverMenu
                        size="sm"
                        ariaLabel={`${group.label} 메뉴`}
                        title="국가 군사 탭으로 이동"
                        minWidth={172}
                        items={[
                          {
                            id: 'open-country-military',
                            label: '국가 군사 탭 열기',
                            icon: <FiArrowUpRight size={13} />,
                            onSelect: () =>
                              navigate(
                                pathKeys.countryMilitary(group.countryId!),
                              ),
                          },
                        ]}
                      />
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

      <MilitaryUnitFormModal
        isOpen={unitFormOpen}
        onClose={() => {
          setUnitFormOpen(false)
          setEditingUnitId(null)
          setFormDefaults({})
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: militaryUnitQueryKeys.all,
          })
          void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
        }}
        editingUnitId={editingUnitId}
        defaultCountryId={formDefaults.countryId ?? null}
        defaultHistoricalCountryId={formDefaults.historicalCountryId ?? null}
        defaultParentUnitId={formDefaults.parentUnitId ?? null}
        defaultAdministrationDepartmentId={
          formDefaults.administrationDepartmentId ?? null
        }
        defaultBranch={formDefaults.branch ?? null}
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

const EditorialSummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 6px 0 22px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  > *:first-child {
    padding-right: 32px;
  }

  > *:nth-child(2) {
    padding-left: 32px;
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;

    > *:first-child {
      padding-right: 0;
    }

    > *:nth-child(2) {
      padding-left: 0;
      border-left: none;
      margin-top: 22px;
      padding-top: 22px;
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const EditorialSummaryCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

const EditorialSummaryHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 12px;
`

const EditorialSummaryTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.022em;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    font-size: 12px;
    font-weight: 600;
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CatalogBranchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const CatalogBranchBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: background ${MOTION.fast} ease, color ${MOTION.fast} ease;

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

const CountryPickerWrap = styled.div`
  width: 210px;
  min-width: 170px;
`

const ToolbarRightGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const ActiveFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
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
  min-height: 240px;
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
  gap: 18px;
`

const CountryTreeSection = styled.div`
  display: flex;
  flex-direction: column;
`

const CountryGroupBand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px 8px;
  background: transparent;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
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
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.015em;
  cursor: pointer;
`

const CountryGroupCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const CountryTreeList = styled.div`
  display: flex;
  flex-direction: column;
`

const CatalogTreeNodeWrap = styled.div<{ $child?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;

  ${({ $child, theme }) =>
    $child
      ? css`
          &::before {
            content: '';
            position: absolute;
            left: -16px;
            top: 19px;
            width: 12px;
            border-top: 1px solid ${ledgerHairlineStrong(theme.mode)};
            pointer-events: none;
          }
        `
      : ''}
`

const CatalogTreeChildrenRail = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 14px;
  padding-left: 16px;
  border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const TreeUnitRow = styled.div<{ $root?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: ${({ $root }) => ($root ? '11px 6px' : '8.5px 6px')};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  box-sizing: border-box;
  transition: background ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TreeRowLeft = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
`

const TreeNodeToggleBtn = styled.button`
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
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TreeLeafDot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  &::after {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const TreeEmblemImg = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 5px;
  object-fit: contain;
  flex-shrink: 0;
`

const TreeUnitTitle = styled.span<{ $root?: boolean }>`
  font-size: ${({ $root }) => ($root ? '14.5px' : '13.5px')};
  font-weight: ${({ $root }) => ($root ? 800 : 680)};
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreeAbbrSpan = styled.span`
  font-size: 0.88em;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeClassSpan = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreePeriodSpan = styled.span`
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeRowRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const TreeCmdSpan = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TreeSubCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const TreeCombatCount = styled.span`
  font-size: 11.5px;
  font-weight: 650;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

const SummaryMetaGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const BranchSummaryLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const BranchSummaryRight = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SummaryFootNote = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const SummarySectionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SummarySubLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SummaryHairline = styled.div`
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

const SummaryEmptyText = styled.div`
  padding: 12px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`


