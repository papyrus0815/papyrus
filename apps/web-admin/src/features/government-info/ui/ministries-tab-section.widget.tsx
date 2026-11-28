import { useEffect, useMemo, useRef, useState } from 'react'

import {
  FiBriefcase,
  FiColumns,
  FiGitBranch,
  FiGrid,
  FiList,
  FiMaximize2,
  FiPlus,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { useMinistriesTab } from '@/features/government-info/model/use-ministries-tab'
import type { AdministrationDepartment } from '@/shared/api/administration-department'
import {
  ALL_DEPARTMENTS_CATEGORY_ID,
  type HistoricalPolityYearSpan,
  UNCATEGORIZED_CATEGORY_ID,
  countDepartmentsByCategoryId,
  isDefenseRelatedCategory,
  isDepartmentActiveAtSignedYear,
  resolveDepartmentLifecycleStatus,
  toSignedHistoricalYear,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { LedgerSplitPaneSkeleton } from '@/shared/ui/ledger-skeleton'
import {
  EmptyStateFeatureCard,
  EmptyStateFill,
  EmptyStateSimple,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { MinistryCategoryTabBar } from '@/widgets/country/country-detail/ui/ministry-category-tab-bar'
import { MinistryDepartmentDetailView } from '@/widgets/country/country-detail/ui/ministry-department-detail.view'
import {
  MinistryDepartmentTree,
  type MinistryEraTreeSection,
} from '@/widgets/country/country-detail/ui/ministry-department-tree'
import { MinistryDeptSearchEmpty } from '@/widgets/country/country-detail/ui/ministry-dept-search-empty'

import {
  DepartmentEventsBlock,
  DepartmentTenuresBlock,
} from './department-blocks'
import {
  GovMoreFieldGroup,
  GovMoreFieldLabel,
  GovMorePopover,
  GovMoreTextInput,
} from './gov-more-popover'
import {
  GovActiveFilterChip,
  GovActiveFiltersRow,
  GovClearFiltersBtn,
  GovLedgerPanel,
  GovPrimaryBtn,
  GovPromSearch,
  GovPromSearchClear,
  GovPromSearchInput,
  GovToolbarRight,
  GovToolbarRow,
  GovToolbarShell,
  GovViewMeta,
} from './government-ledger.styles'
import { MinistriesLedgerView } from './ministries-ledger-view.widget'
import { MinistryFormModal } from './ministry-form-modal.widget'
import { UnlinkedCountryTenuresBar } from './unlinked-country-tenures-bar'

type DepartmentKindGroup =
  | 'ALL'
  | 'MINISTRY'
  | 'AGENCY'
  | 'CROWN_EXEC'
  | 'CONSTITUTIONAL'
  | 'COLONIAL'
type DepartmentStatusFilter = 'ALL' | 'ACTIVE' | 'ABOLISHED'
type BrowseViewMode = 'TREE' | 'LEDGER'

type WorkspaceLayoutMode = 'SPLIT' | 'FOCUS'

const KIND_GROUP_LABEL: Record<DepartmentKindGroup, string> = {
  ALL: '전체',
  MINISTRY: '중앙부처',
  AGENCY: '외청·위원회',
  CROWN_EXEC: '원수직속·궁내',
  CONSTITUTIONAL: '헌법·사법·입법',
  COLONIAL: '총독부',
}

const STATUS_FILTER_LABEL: Record<DepartmentStatusFilter, string> = {
  ALL: '전체 상태',
  ACTIVE: '현존',
  ABOLISHED: '역사·폐지',
}

function parseSnapshotYearInput(rawInput: string): number | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null
  const bcPrefixMatch = /^(?:bc|기원전)\s*(\d{1,5})$/i.exec(trimmed)
  if (bcPrefixMatch) {
    const absVal = Number(bcPrefixMatch[1])
    return absVal > 0 ? -absVal : null
  }
  const signedMatch = /^([+-]?\d{1,5})$/.exec(trimmed)
  if (signedMatch) {
    const yearVal = Number(signedMatch[1])
    return Number.isFinite(yearVal) && yearVal !== 0 ? yearVal : null
  }
  return null
}

function formatPolitySpanLabel(span?: HistoricalPolityYearSpan | null): string | null {
  if (!span) return null
  const fmt = (signed?: number | null) => {
    if (signed == null) return null
    return signed < 0 ? `BC ${Math.abs(signed)}` : `${signed}`
  }
  const startLabel = fmt(span.startSignedYear)
  const endLabel = fmt(span.endSignedYear)
  if (!startLabel && !endLabel) return null
  return `${startLabel ?? '?'}–${endLabel ?? ''}`
}

export type MinistriesTabSectionProps = {
  contentTab: GovernmentContentTab
  effectiveCountryId: string | undefined
  countryName?: string
  isHistorical?: boolean
  isDark: boolean
  cabinetOpenMinistryIntent: { categoryId: string } | null
  onConsumedCabinetOpenMinistryIntent: () => void
  focusDepartmentId?: string | null
  onConsumedFocusDepartment?: () => void
  onSelectedDepartmentChange?: (departmentId: string | null) => void
  onNavigateToPositions: (context?: {
    departmentId?: string
    departmentName?: string
    categoryId?: string
    categoryName?: string
  }) => void
  onInspectMilitaryUnit?: (unitId: string) => void
  onOpenMilitaryTab?: () => void
  onSelectCabinet?: (cabinetId: string) => void
  openCategoryModal: () => void
}

export function MinistriesTabSection({
  contentTab,
  effectiveCountryId,
  countryName,
  isHistorical = false,
  isDark,
  cabinetOpenMinistryIntent,
  onConsumedCabinetOpenMinistryIntent,
  focusDepartmentId,
  onConsumedFocusDepartment,
  onSelectedDepartmentChange,
  onNavigateToPositions,
  onInspectMilitaryUnit,
  onOpenMilitaryTab,
  onSelectCabinet,
  openCategoryModal,
}: MinistriesTabSectionProps) {
  const ministriesTab = useMinistriesTab({
    effectiveCountryId,
    isHistorical,
    contentTab,
    cabinetOpenMinistryIntent,
    onConsumedCabinetOpenMinistryIntent,
    focusDepartmentId,
    onConsumedFocusDepartment,
  })

  const {
    ministriesList,
    ministriesLoading,
    ministryFormModalOpen,
    ministrySearchQuery,
    setMinistrySearchQuery,
    ministryTreeCategoryId,
    setMinistryTreeCategoryId,
    ministryBrowseDepartment,
    setMinistryBrowseDepartment,
    editingMinistry,
    ministryForm,
    setMinistryForm,
    categoriesList,
    setCategoriesList,
    reloadCategories,
    displayCategoriesList,
    openMinistryEdit,
    openMinistryCreateChild,
    openMinistryCreateRootInCategory,
    closeMinistryFormModal,
    submitMinistryForm,
    submittingMinistry,
    batchSavedCount,
    handleMinistryDelete,
    ministryBrowseResolved,
    filterDepartmentsBySearchQuery,
    thumbnailInputRef,
    thumbnailUploading,
    setThumbnailUploading,
    establishedDateModalOpen,
    setEstablishedDateModalOpen,
    abolishedDateModalOpen,
    setAbolishedDateModalOpen,
    categorySelectOpen,
    setCategorySelectOpen,
    parentSelectOpen,
    setParentSelectOpen,
    successorSelectOpen,
    setSuccessorSelectOpen,
    predecessorSelectOpen,
    setPredecessorSelectOpen,
  } = ministriesTab

  const [eraFilter, setEraFilter] = useState<string>('ALL')
  const [kindGroupFilter, setKindGroupFilter] =
    useState<DepartmentKindGroup>('ALL')
  const [statusFilter, setStatusFilter] =
    useState<DepartmentStatusFilter>('ALL')
  const [snapshotYearInput, setSnapshotYearInput] = useState('')
  const [browseViewMode, setBrowseViewMode] = useState<BrowseViewMode>('TREE')
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>('SPLIT')
  const [groupByEra, setGroupByEra] = useState(true)

  const parsedSnapshotYear = useMemo(
    () => parseSnapshotYearInput(snapshotYearInput),
    [snapshotYearInput],
  )

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && effectiveCountryId ? effectiveCountryId : '',
    )

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical ? effectiveCountryId : undefined,
  )

  const politySpanById = useMemo(() => {
    const map = new Map<string, HistoricalPolityYearSpan>()
    for (const item of linkedHistoricalCountries) {
      const raw = item as {
        id?: string
        startEra?: string | null
        startYear?: number | null
        endEra?: string | null
        endYear?: number | null
      }
      if (!raw.id) continue
      map.set(raw.id, {
        startSignedYear: toSignedHistoricalYear(raw.startEra, raw.startYear),
        endSignedYear: toSignedHistoricalYear(raw.endEra, raw.endYear),
      })
    }
    for (const item of constituentPolities) {
      if (!item.id) continue
      map.set(item.id, {
        startSignedYear: toSignedHistoricalYear(item.startEra, item.startYear),
        endSignedYear: toSignedHistoricalYear(item.endEra, item.endYear),
      })
    }
    return map
  }, [constituentPolities, linkedHistoricalCountries])

  const historicalErasAvailable = useMemo(() => {
    const eraMap = new Map<string, string>()
    if (isHistorical) {
      for (const constituentItem of constituentPolities) {
        if (constituentItem.id && constituentItem.name) {
          eraMap.set(constituentItem.id, constituentItem.name)
        }
      }
      for (const deptItem of ministriesList) {
        if (
          deptItem.historicalCountry?.id &&
          deptItem.historicalCountry.id !== effectiveCountryId &&
          deptItem.historicalCountry.name
        ) {
          eraMap.set(
            deptItem.historicalCountry.id,
            deptItem.historicalCountry.name,
          )
        }
      }
    } else {
      for (const linkedItem of linkedHistoricalCountries) {
        if (linkedItem.id && linkedItem.name) {
          eraMap.set(linkedItem.id, linkedItem.name)
        }
      }
      for (const deptItem of ministriesList) {
        if (deptItem.historicalCountry?.id && deptItem.historicalCountry.name) {
          eraMap.set(
            deptItem.historicalCountry.id,
            deptItem.historicalCountry.name,
          )
        }
      }
    }
    return Array.from(eraMap.entries())
      .map(([histId, histName]) => ({
        id: histId,
        name: histName,
        span: politySpanById.get(histId) ?? null,
      }))
      .sort((left, right) => {
        const leftEnd =
          left.span?.endSignedYear ??
          left.span?.startSignedYear ??
          Number.MIN_SAFE_INTEGER
        const rightEnd =
          right.span?.endSignedYear ??
          right.span?.startSignedYear ??
          Number.MIN_SAFE_INTEGER
        if (leftEnd !== rightEnd) return rightEnd - leftEnd
        return left.name.localeCompare(right.name, 'ko')
      })
  }, [
    constituentPolities,
    effectiveCountryId,
    isHistorical,
    linkedHistoricalCountries,
    ministriesList,
    politySpanById,
  ])

  const hasColonialGovernment = useMemo(
    () =>
      ministriesList.some(
        (deptItem) => deptItem.kind === 'COLONIAL_GOVERNMENT',
      ),
    [ministriesList],
  )

  const visibleKindGroupKeys = useMemo<DepartmentKindGroup[]>(() => {
    const base: DepartmentKindGroup[] = [
      'ALL',
      'MINISTRY',
      'AGENCY',
      'CROWN_EXEC',
      'CONSTITUTIONAL',
    ]
    if (hasColonialGovernment || kindGroupFilter === 'COLONIAL') {
      base.push('COLONIAL')
    }
    return base
  }, [hasColonialGovernment, kindGroupFilter])

  const kpiStats = useMemo(() => {
    const totalCount = ministriesList.length
    const linkedUnitIdSet = new Set<string>()
    for (const deptItem of ministriesList) {
      for (const unitRef of deptItem.militaryUnits ?? []) {
        if (unitRef.id) linkedUnitIdSet.add(unitRef.id)
      }
    }
    return {
      totalCount,
      linkedUnitCount: linkedUnitIdSet.size,
    }
  }, [ministriesList])

  const matchesDepartmentFilters = (
    deptItem: (typeof ministriesList)[number],
  ): boolean => {
    if (eraFilter === 'MODERN' && deptItem.historicalCountryId) return false
    if (
      eraFilter !== 'ALL' &&
      eraFilter !== 'MODERN' &&
      deptItem.historicalCountryId !== eraFilter
    ) {
      return false
    }
    if (kindGroupFilter !== 'ALL') {
      const deptKind = deptItem.kind || 'MINISTRY'
      if (kindGroupFilter === 'MINISTRY' && deptKind !== 'MINISTRY') {
        return false
      }
      if (kindGroupFilter === 'AGENCY' && deptKind !== 'AGENCY') {
        return false
      }
      if (kindGroupFilter === 'CROWN_EXEC' && deptKind !== 'ROYAL_HOUSEHOLD') {
        return false
      }
      if (kindGroupFilter === 'CONSTITUTIONAL' && deptKind !== 'OTHER') {
        return false
      }
      if (
        kindGroupFilter === 'COLONIAL' &&
        deptKind !== 'COLONIAL_GOVERNMENT'
      ) {
        return false
      }
    }
    const politySpan = deptItem.historicalCountryId
      ? (politySpanById.get(deptItem.historicalCountryId) ?? null)
      : null
    const lifecycleStatus = resolveDepartmentLifecycleStatus(deptItem, {
      politySpan,
    })
    if (statusFilter === 'ACTIVE' && lifecycleStatus !== 'ACTIVE') {
      return false
    }
    if (statusFilter === 'ABOLISHED' && lifecycleStatus === 'ACTIVE') {
      return false
    }
    if (
      parsedSnapshotYear != null &&
      !isDepartmentActiveAtSignedYear(
        deptItem,
        parsedSnapshotYear,
        politySpan,
      )
    ) {
      return false
    }
    return true
  }

  const toolbarFilteredDepts = useMemo(
    () => ministriesList.filter(matchesDepartmentFilters),
    [
      ministriesList,
      eraFilter,
      kindGroupFilter,
      statusFilter,
      parsedSnapshotYear,
      politySpanById,
    ],
  )

  const toolbarAndSearchFilteredDepts = useMemo(
    () =>
      filterDepartmentsBySearchQuery(toolbarFilteredDepts, ministrySearchQuery),
    [filterDepartmentsBySearchQuery, ministrySearchQuery, toolbarFilteredDepts],
  )

  const dynamicCategoryDeptCounts = useMemo(
    () => countDepartmentsByCategoryId(toolbarAndSearchFilteredDepts),
    [toolbarAndSearchFilteredDepts],
  )

  const activeCategory = useMemo(
    () =>
      displayCategoriesList.find(
        (category) => category.id === ministryTreeCategoryId,
      ) ?? displayCategoriesList[0],
    [displayCategoriesList, ministryTreeCategoryId],
  )

  const deptsInActiveCat = useMemo(() => {
    if (!activeCategory) return []
    return toolbarFilteredDepts.filter((deptItem) => {
      if (activeCategory.id === ALL_DEPARTMENTS_CATEGORY_ID) return true
      return activeCategory.id === UNCATEGORIZED_CATEGORY_ID
        ? !deptItem.categoryId
        : deptItem.categoryId === activeCategory.id
    })
  }, [activeCategory, toolbarFilteredDepts])

  const deptsInActiveCatFiltered = useMemo(
    () => filterDepartmentsBySearchQuery(deptsInActiveCat, ministrySearchQuery),
    [deptsInActiveCat, filterDepartmentsBySearchQuery, ministrySearchQuery],
  )

  const isSearchActive = Boolean(ministrySearchQuery.trim())
  const effectiveActiveCatIdForBadges =
    activeCategory &&
    activeCategory.id !== ALL_DEPARTMENTS_CATEGORY_ID &&
    activeCategory.id !== UNCATEGORIZED_CATEGORY_ID
      ? activeCategory.id
      : undefined

  const eraSectionsForTree = useMemo<MinistryEraTreeSection[] | null>(() => {
    if (!groupByEra || eraFilter !== 'ALL' || historicalErasAvailable.length === 0) {
      return null
    }
    const sections: MinistryEraTreeSection[] = []
    if (isHistorical && effectiveCountryId) {
      const ownDepts = deptsInActiveCatFiltered.filter(
        (deptItem) =>
          !deptItem.historicalCountryId ||
          deptItem.historicalCountryId === effectiveCountryId,
      )
      if (ownDepts.length > 0) {
        sections.push({
          id: effectiveCountryId,
          label: `${countryName ?? '본국'} 직속`,
          departments: ownDepts,
        })
      }
    } else {
      const modernDepts = deptsInActiveCatFiltered.filter(
        (deptItem) => !deptItem.historicalCountryId,
      )
      if (modernDepts.length > 0) {
        sections.push({
          id: '__MODERN__',
          label: `현대 ${countryName ?? ''} 직속`.trim(),
          subLabel: '현행·현대 체제',
          departments: modernDepts,
        })
      }
    }

    const handledEraIds = new Set<string>(sections.map((secItem) => secItem.id))
    for (const eraItem of historicalErasAvailable) {
      if (handledEraIds.has(eraItem.id)) continue
      const eraDepts = deptsInActiveCatFiltered.filter(
        (deptItem) => deptItem.historicalCountryId === eraItem.id,
      )
      if (eraDepts.length > 0) {
        handledEraIds.add(eraItem.id)
        sections.push({
          id: eraItem.id,
          label: eraItem.name,
          subLabel: formatPolitySpanLabel(eraItem.span),
          departments: eraDepts,
        })
      }
    }
    return sections.length > 1 ? sections : null
  }, [
    countryName,
    deptsInActiveCatFiltered,
    effectiveCountryId,
    eraFilter,
    groupByEra,
    historicalErasAvailable,
    isHistorical,
  ])

  const autoSelectedSplitScopeRef = useRef<string | null>(null)
  const currentSplitScopeKey = `${effectiveCountryId ?? ''}:${activeCategory?.id ?? ''}`

  useEffect(() => {
    if (layoutMode !== 'SPLIT') {
      autoSelectedSplitScopeRef.current = null
      return
    }
    if (ministryBrowseDepartment) {
      autoSelectedSplitScopeRef.current = currentSplitScopeKey
      return
    }
    if (autoSelectedSplitScopeRef.current === currentSplitScopeKey) {
      return
    }
    if (deptsInActiveCatFiltered.length > 0) {
      const firstRoot =
        deptsInActiveCatFiltered.find((deptItem) => !deptItem.parentId) ??
        deptsInActiveCatFiltered[0]
      if (firstRoot) {
        autoSelectedSplitScopeRef.current = currentSplitScopeKey
        setMinistryBrowseDepartment(firstRoot)
      }
    }
  }, [
    layoutMode,
    currentSplitScopeKey,
    ministryBrowseDepartment,
    deptsInActiveCatFiltered,
    setMinistryBrowseDepartment,
  ])

  const resolveDefaultCreateKind = () => {
    if (kindGroupFilter === 'AGENCY') return 'AGENCY' as const
    if (kindGroupFilter === 'CROWN_EXEC') return 'ROYAL_HOUSEHOLD' as const
    if (kindGroupFilter === 'CONSTITUTIONAL') return 'OTHER' as const
    if (kindGroupFilter === 'COLONIAL') return 'COLONIAL_GOVERNMENT' as const
    return 'MINISTRY' as const
  }

  const resolveDefaultCreateEra = () => {
    if (isHistorical) {
      return eraFilter !== 'ALL' ? eraFilter : (effectiveCountryId ?? '')
    }
    return eraFilter !== 'ALL' && eraFilter !== 'MODERN' ? eraFilter : ''
  }

  const isFocusDetailOnly =
    layoutMode === 'FOCUS' &&
    Boolean(ministryBrowseResolved) &&
    !ministryFormModalOpen

  const hasActiveFilters =
    Boolean(ministrySearchQuery.trim()) ||
    kindGroupFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    parsedSnapshotYear != null ||
    eraFilter !== 'ALL'

  const activeEraName =
    eraFilter === 'MODERN'
      ? '현대 직속'
      : isHistorical && eraFilter === effectiveCountryId
        ? `${countryName ?? '본국'} 직속`
        : historicalErasAvailable.find((eraItem) => eraItem.id === eraFilter)
            ?.name ?? null

  return (
    <>
      <SectionRoot aria-label="중앙부처 현황">
        {!isFocusDetailOnly ? (
          <GovToolbarShell>
            <GovToolbarRow>
              <GovPromSearch>
                <FiSearch size={14} aria-hidden />
                <GovPromSearchInput
                  type="text"
                  value={ministrySearchQuery}
                  onChange={(event) =>
                    setMinistrySearchQuery(event.target.value)
                  }
                  placeholder="부처·기관명, 약칭, 원어·영문명 검색…"
                  aria-label="부처 이름 검색"
                />
                {ministrySearchQuery ? (
                  <GovPromSearchClear
                    type="button"
                    aria-label="검색어 지우기"
                    onClick={() => setMinistrySearchQuery('')}
                  >
                    <FiX size={12} />
                  </GovPromSearchClear>
                ) : null}
              </GovPromSearch>

              {historicalErasAvailable.length > 0 ? (
                <EraSelect
                  aria-label={isHistorical ? '소속 정치체 필터' : '시대·정체 필터'}
                  value={eraFilter}
                  onChange={(event) => setEraFilter(event.target.value)}
                >
                  <option value="ALL">
                    {isHistorical
                      ? `전체 본국·구성국 (${ministriesList.length})`
                      : `전체 시대 (${ministriesList.length})`}
                  </option>
                  {isHistorical && effectiveCountryId ? (
                    <option value={effectiveCountryId}>
                      {countryName ?? '본국'} 직속 (
                      {
                        ministriesList.filter(
                          (deptItem) =>
                            deptItem.historicalCountryId === effectiveCountryId,
                        ).length
                      }
                      )
                    </option>
                  ) : (
                    <option value="MODERN">
                      현대 직속 (
                      {
                        ministriesList.filter(
                          (deptItem) => !deptItem.historicalCountryId,
                        ).length
                      }
                      )
                    </option>
                  )}
                  {historicalErasAvailable.map((eraItem) => {
                    const eraCount = ministriesList.filter(
                      (deptItem) => deptItem.historicalCountryId === eraItem.id,
                    ).length
                    return (
                      <option key={eraItem.id} value={eraItem.id}>
                        {eraItem.name} ({eraCount})
                      </option>
                    )
                  })}
                </EraSelect>
              ) : null}

              {visibleKindGroupKeys.length > 2 ? (
                <EraSelect
                  aria-label="기관 성격 필터"
                  value={kindGroupFilter}
                  onChange={(changeEvent) =>
                    setKindGroupFilter(
                      changeEvent.target.value as DepartmentKindGroup,
                    )
                  }
                >
                  {visibleKindGroupKeys.map((groupKey) => (
                    <option key={groupKey} value={groupKey}>
                      {groupKey === 'ALL'
                        ? '기관 구분: 전체'
                        : KIND_GROUP_LABEL[groupKey]}
                    </option>
                  ))}
                </EraSelect>
              ) : null}

              <GovToolbarRight>
                <GovViewMeta>
                  {deptsInActiveCatFiltered.length === kpiStats.totalCount ? (
                    <>
                      전체 <strong>{kpiStats.totalCount}</strong>
                    </>
                  ) : (
                    <>
                      표시 <strong>{deptsInActiveCatFiltered.length}</strong> /{' '}
                      <strong>{kpiStats.totalCount}</strong>
                    </>
                  )}
                </GovViewMeta>

                {effectiveCountryId ? (
                  <>
                    <GovMorePopover
                      ariaLabel="기관 목록 보기 및 필터 설정"
                      title="보기 방식 · 배치 · 상세 필터"
                      menuWidth={284}
                      hasActiveIndicator={
                        browseViewMode !== 'TREE' ||
                        layoutMode !== 'SPLIT' ||
                        statusFilter !== 'ALL' ||
                        parsedSnapshotYear != null ||
                        !groupByEra
                      }
                      segments={[
                        {
                          key: 'browse-view',
                          label: '목록 표시 방식',
                          value: browseViewMode,
                          options: [
                            {
                              value: 'TREE',
                              label: '편제 트리',
                              icon: <FiGitBranch size={12} />,
                            },
                            {
                              value: 'LEDGER',
                              label: '원장 표',
                              icon: <FiList size={12} />,
                            },
                          ],
                          onChange: (nextVal) =>
                            setBrowseViewMode(nextVal as BrowseViewMode),
                        },
                        {
                          key: 'layout-mode',
                          label: '화면 배치',
                          value: layoutMode,
                          options: [
                            {
                              value: 'SPLIT',
                              label: '2단 분할',
                              icon: <FiColumns size={12} />,
                            },
                            {
                              value: 'FOCUS',
                              label: '단독 보기',
                              icon: <FiMaximize2 size={12} />,
                            },
                          ],
                          onChange: (nextVal) =>
                            setLayoutMode(nextVal as WorkspaceLayoutMode),
                        },
                        {
                          key: 'status-filter',
                          label: '존속 상태 필터',
                          value: statusFilter,
                          options: [
                            { value: 'ALL', label: '전체' },
                            { value: 'ACTIVE', label: '현존' },
                            { value: 'ABOLISHED', label: '폐지' },
                          ],
                          onChange: (nextVal) =>
                            setStatusFilter(nextVal as DepartmentStatusFilter),
                        },
                      ]}
                      customContent={
                        <GovMoreFieldGroup>
                          <GovMoreFieldLabel htmlFor="gov-ministry-snapshot-year">
                            기준 연도 스냅샷 필터
                          </GovMoreFieldLabel>
                          <GovMoreTextInput
                            id="gov-ministry-snapshot-year"
                            type="text"
                            value={snapshotYearInput}
                            onChange={(changeEvt) =>
                              setSnapshotYearInput(changeEvt.target.value)
                            }
                            placeholder="예: 1941, BC 221"
                            aria-label="기준 연도 스냅샷 필터"
                          />
                        </GovMoreFieldGroup>
                      }
                      toggles={
                        browseViewMode === 'TREE' &&
                        eraFilter === 'ALL' &&
                        historicalErasAvailable.length > 0
                          ? [
                              {
                                key: 'group-by-era',
                                label: '시대·정체별 묶음 표시',
                                description:
                                  '현대 직속과 역사 정치체를 섹션으로 구분',
                                checked: groupByEra,
                                onChange: setGroupByEra,
                              },
                            ]
                          : []
                      }
                      actions={[
                        {
                          key: 'global-categories',
                          label: '전역 직능 분류 관리',
                          icon: <FiGrid size={13.5} />,
                          badge: String(categoriesList.length),
                          onClick: () => openCategoryModal(),
                        },
                        ...(kpiStats.linkedUnitCount > 0 && onOpenMilitaryTab
                          ? [
                              {
                                key: 'open-military-tab',
                                label: '군사 탭 소관 부대 보기',
                                icon: <FiShield size={13.5} />,
                                badge: String(kpiStats.linkedUnitCount),
                                onClick: () => onOpenMilitaryTab(),
                              },
                            ]
                          : []),
                      ]}
                    />

                    <GovPrimaryBtn
                      type="button"
                      onClick={() =>
                        openMinistryCreateRootInCategory(
                          ministryTreeCategoryId,
                          resolveDefaultCreateEra(),
                          resolveDefaultCreateKind(),
                        )
                      }
                    >
                      <FiPlus size={14} />
                      <span>기관·부처 등록</span>
                    </GovPrimaryBtn>
                  </>
                ) : null}
              </GovToolbarRight>
            </GovToolbarRow>

            {hasActiveFilters ? (
              <GovActiveFiltersRow>
                {ministrySearchQuery.trim() ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setMinistrySearchQuery('')}
                  >
                    검색: &ldquo;{ministrySearchQuery.trim()}&rdquo;
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {kindGroupFilter !== 'ALL' ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setKindGroupFilter('ALL')}
                  >
                    성격: {KIND_GROUP_LABEL[kindGroupFilter]}
                    <FiX size={11} />
                  </GovActiveFilterChip>
                ) : null}
                {statusFilter !== 'ALL' ? (
                  <GovActiveFilterChip
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                  >
                    상태: {STATUS_FILTER_LABEL[statusFilter]}
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
                <GovClearFiltersBtn
                  type="button"
                  onClick={() => {
                    setMinistrySearchQuery('')
                    setKindGroupFilter('ALL')
                    setStatusFilter('ALL')
                    setSnapshotYearInput('')
                    setEraFilter('ALL')
                  }}
                >
                  필터 초기화
                </GovClearFiltersBtn>
              </GovActiveFiltersRow>
            ) : null}
          </GovToolbarShell>
        ) : null}

        {!isFocusDetailOnly ? (
          <UnlinkedCountryTenuresBar
            mode="DEPARTMENT"
            effectiveCountryId={effectiveCountryId}
            isHistorical={isHistorical}
            targetOptions={ministriesList.map((deptRow) => ({
              id: deptRow.id,
              label: deptRow.historicalCountry?.name
                ? `[${deptRow.historicalCountry.name}] ${deptRow.name}`
                : deptRow.name,
              historicalCountryId: deptRow.historicalCountryId ?? null,
            }))}
            onRequestCreateTarget={(tenureHistCountryId) =>
              openMinistryCreateRootInCategory(
                ministryTreeCategoryId,
                tenureHistCountryId ?? undefined,
                'MINISTRY',
              )
            }
          />
        ) : null}

        {/* 본문 영역 */}
        <WorkspaceStage>
          {!effectiveCountryId ? (
            <EmptyStateFill>
              <EmptyStateSimple border="dashed">
                국가를 선택하면 부처를 등록할 수 있습니다.
              </EmptyStateSimple>
            </EmptyStateFill>
          ) : ministriesLoading ? (
            <LedgerSplitPaneSkeleton
              rows={7}
              label="중앙부처·행정기관을 불러오는 중"
            />
          ) : displayCategoriesList.length === 0 ? (
            <EmptyStateFill>
              <EmptyStateFeatureCard
                flat
                cardBorder={false}
                icon={<FiPlus size={28} strokeWidth={2.5} />}
                title="등록된 부처 카테고리가 없습니다"
                description="먼저 카테고리를 추가하거나 바로 기관·부처를 등록하세요."
                primaryAction={{
                  label: '기관·부처 바로 등록',
                  onClick: () =>
                    openMinistryCreateRootInCategory(
                      '',
                      resolveDefaultCreateEra(),
                      resolveDefaultCreateKind(),
                    ),
                  icon: <FiPlus size={16} />,
                }}
              />
            </EmptyStateFill>
          ) : isFocusDetailOnly && ministryBrowseResolved ? (
            <GovLedgerPanel>
              <MinistryDepartmentDetailView
                department={ministryBrowseResolved}
                allDepartments={ministriesList}
                isDark={isDark}
                categoryLabel={
                  categoriesList.find(
                    (category) =>
                      category.id === ministryBrowseResolved.categoryId,
                  )?.name ?? null
                }
                isDefenseRelated={isDefenseRelatedCategory(
                  categoriesList.find(
                    (row) => row.id === ministryBrowseResolved.categoryId,
                  ),
                  ministryBrowseResolved.kind,
                )}
                onInspectMilitaryUnit={onInspectMilitaryUnit}
                onOpenMilitaryTab={onOpenMilitaryTab}
                onSelectDepartment={(targetDeptId) => {
                  const targetDept = ministriesList.find(
                    (deptItem) => deptItem.id === targetDeptId,
                  )
                  if (!targetDept) return
                  if (ministryTreeCategoryId !== ALL_DEPARTMENTS_CATEGORY_ID) {
                    setMinistryTreeCategoryId(
                      targetDept.categoryId || UNCATEGORIZED_CATEGORY_ID,
                    )
                  }
                  setMinistryBrowseDepartment(targetDept)
                  onSelectedDepartmentChange?.(targetDept.id)
                }}
                onBack={() => {
                  setMinistryBrowseDepartment(null)
                  onSelectedDepartmentChange?.(null)
                }}
                onEdit={() => openMinistryEdit(ministryBrowseResolved)}
                onDelete={() => handleMinistryDelete(ministryBrowseResolved)}
                onAddChild={() =>
                  openMinistryCreateChild(
                    ministryBrowseResolved,
                    ministryBrowseResolved.categoryId ?? '',
                  )
                }
                onGoToPositions={() => {
                  const dept = ministryBrowseResolved
                  const catName =
                    categoriesList.find(
                      (category) => category.id === dept.categoryId,
                    )?.name ?? undefined
                  onNavigateToPositions({
                    departmentId: dept.id,
                    departmentName: dept.name,
                    categoryId: dept.categoryId ?? undefined,
                    categoryName: catName,
                  })
                }}
                tenuresSlot={
                  <DepartmentTenuresBlock
                    departmentId={ministryBrowseResolved.id}
                    countryId={isHistorical ? undefined : effectiveCountryId}
                    historicalCountryId={
                      isHistorical
                        ? effectiveCountryId
                        : (ministryBrowseResolved.historicalCountryId ?? null)
                    }
                    departmentName={ministryBrowseResolved.name}
                    departmentKind={ministryBrowseResolved.kind}
                    onSelectCabinet={onSelectCabinet}
                  />
                }
                eventsSlot={
                  <DepartmentEventsBlock
                    departmentId={ministryBrowseResolved.id}
                  />
                }
              />
            </GovLedgerPanel>
          ) : (
            <WorkspaceStack>
              <MinistryCategoryTabBar
                categories={displayCategoriesList}
                counts={dynamicCategoryDeptCounts}
                selectedCategoryId={ministryTreeCategoryId}
                onSelectCategory={setMinistryTreeCategoryId}
                isDark={isDark}
              />

              {deptsInActiveCat.length === 0 ? (
                <EmptyStateSpotlight
                  flat
                  icon={<FiBriefcase size={30} strokeWidth={1.75} />}
                  title="등록된 기관·부처가 없습니다"
                  description={
                    eraFilter !== 'ALL' ||
                    kindGroupFilter !== 'ALL' ||
                    statusFilter !== 'ALL' ||
                    parsedSnapshotYear != null
                      ? '선택한 시대·성격·상태·연도 조건에 해당하는 기관이 없습니다. 바로 이 조건으로 새 기관을 등록하거나 필터를 변경해 보세요.'
                      : '이 분류에 첫 중앙부처·국가기관을 등록하면 상하 계층과 전신·후신 계보가 표시됩니다.'
                  }
                  primaryAction={{
                    label: '기관·부처 등록',
                    onClick: () =>
                      openMinistryCreateRootInCategory(
                        activeCategory?.id ?? '',
                        resolveDefaultCreateEra(),
                        resolveDefaultCreateKind(),
                      ),
                    icon: <FiPlus size={16} strokeWidth={2.25} />,
                  }}
                />
              ) : deptsInActiveCatFiltered.length === 0 ? (
                <MinistryDeptSearchEmpty
                  onClearSearch={() => setMinistrySearchQuery('')}
                />
              ) : layoutMode === 'SPLIT' ? (
                <SplitWorkspaceGrid $ledgerView={browseViewMode === 'LEDGER'}>
                  <TreeLedgerColumn>
                    {browseViewMode === 'LEDGER' ? (
                      <MinistriesLedgerView
                        departments={deptsInActiveCatFiltered}
                        allDepartments={ministriesList}
                        categories={categoriesList}
                        selectedDepartmentId={ministryBrowseResolved?.id}
                        compact
                        onSelectDepartment={(dept) => {
                          setMinistryBrowseDepartment(dept)
                          onSelectedDepartmentChange?.(dept.id)
                        }}
                        onAddRoot={() =>
                          openMinistryCreateRootInCategory(
                            activeCategory?.id ?? '',
                            resolveDefaultCreateEra(),
                            resolveDefaultCreateKind(),
                          )
                        }
                      />
                    ) : (
                      <MinistryDepartmentTree
                        allDepartments={ministriesList}
                        departmentsInCategory={deptsInActiveCatFiltered}
                        toolbarFilteredDepartments={toolbarFilteredDepts}
                        activeCategoryId={effectiveActiveCatIdForBadges}
                        isSearchActive={isSearchActive}
                        eraSections={eraSectionsForTree}
                        isDark={isDark}
                        selectedDepartmentId={ministryBrowseResolved?.id}
                        onSelectDepartment={(dept) => {
                          setMinistryBrowseDepartment(dept)
                          onSelectedDepartmentChange?.(dept.id)
                        }}
                        onAddRoot={() =>
                          openMinistryCreateRootInCategory(
                            activeCategory?.id ?? '',
                            resolveDefaultCreateEra(),
                            resolveDefaultCreateKind(),
                          )
                        }
                        onAddChild={(parentDept) =>
                          openMinistryCreateChild(
                            parentDept,
                            parentDept.categoryId ?? '',
                          )
                        }
                        onGoToPositionDefinitions={() =>
                          onNavigateToPositions(
                            activeCategory &&
                              activeCategory.id !== UNCATEGORIZED_CATEGORY_ID &&
                              activeCategory.id !== ALL_DEPARTMENTS_CATEGORY_ID
                              ? {
                                  categoryId: activeCategory.id,
                                  categoryName: activeCategory.name,
                                }
                              : undefined,
                          )
                        }
                      />
                    )}
                  </TreeLedgerColumn>

                  <GovLedgerPanel>
                    {ministryBrowseResolved ? (
                      <MinistryDepartmentDetailView
                        department={ministryBrowseResolved}
                        allDepartments={ministriesList}
                        isDark={isDark}
                        embeddedInSplitView
                        categoryLabel={
                          categoriesList.find(
                            (category) =>
                              category.id === ministryBrowseResolved.categoryId,
                          )?.name ?? null
                        }
                        isDefenseRelated={isDefenseRelatedCategory(
                          categoriesList.find(
                            (row) =>
                              row.id === ministryBrowseResolved.categoryId,
                          ),
                          ministryBrowseResolved.kind,
                        )}
                        onInspectMilitaryUnit={onInspectMilitaryUnit}
                        onOpenMilitaryTab={onOpenMilitaryTab}
                        onSelectDepartment={(targetDeptId) => {
                          const targetDept = ministriesList.find(
                            (deptItem) => deptItem.id === targetDeptId,
                          )
                          if (!targetDept) return
                          setMinistryBrowseDepartment(targetDept)
                          onSelectedDepartmentChange?.(targetDept.id)
                        }}
                        onBack={() => {
                          setMinistryBrowseDepartment(null)
                          onSelectedDepartmentChange?.(null)
                        }}
                        onEdit={() => openMinistryEdit(ministryBrowseResolved)}
                        onDelete={() =>
                          handleMinistryDelete(ministryBrowseResolved)
                        }
                        onAddChild={() =>
                          openMinistryCreateChild(
                            ministryBrowseResolved,
                            ministryBrowseResolved.categoryId ?? '',
                          )
                        }
                        onGoToPositions={() => {
                          const dept = ministryBrowseResolved
                          const catName =
                            categoriesList.find(
                              (category) => category.id === dept.categoryId,
                            )?.name ?? undefined
                          onNavigateToPositions({
                            departmentId: dept.id,
                            departmentName: dept.name,
                            categoryId: dept.categoryId ?? undefined,
                            categoryName: catName,
                          })
                        }}
                        tenuresSlot={
                          <DepartmentTenuresBlock
                            departmentId={ministryBrowseResolved.id}
                            countryId={
                              isHistorical ? undefined : effectiveCountryId
                            }
                            historicalCountryId={
                              isHistorical
                                ? effectiveCountryId
                                : (ministryBrowseResolved.historicalCountryId ??
                                  null)
                            }
                            departmentName={ministryBrowseResolved.name}
                            departmentKind={ministryBrowseResolved.kind}
                            onSelectCabinet={onSelectCabinet}
                          />
                        }
                        eventsSlot={
                          <DepartmentEventsBlock
                            departmentId={ministryBrowseResolved.id}
                          />
                        }
                      />
                    ) : (
                      <EmptyDetailPlaceholder>
                        좌측 편제 트리에서 중앙부처·국가기관을 선택하면 상세
                        정보와 상하위 편제·전후 계보, 역대 재임 인사가
                        표시됩니다.
                      </EmptyDetailPlaceholder>
                    )}
                  </GovLedgerPanel>
                </SplitWorkspaceGrid>
              ) : (
                <GovLedgerPanel>
                  {browseViewMode === 'LEDGER' ? (
                    <MinistriesLedgerView
                      departments={deptsInActiveCatFiltered}
                      allDepartments={ministriesList}
                      categories={categoriesList}
                      selectedDepartmentId={ministryBrowseDepartment?.id}
                      onSelectDepartment={(dept) => {
                        setMinistryBrowseDepartment(dept)
                        onSelectedDepartmentChange?.(dept.id)
                      }}
                      onAddRoot={() =>
                        openMinistryCreateRootInCategory(
                          activeCategory?.id ?? '',
                          resolveDefaultCreateEra(),
                          resolveDefaultCreateKind(),
                        )
                      }
                    />
                  ) : (
                    <MinistryDepartmentTree
                      allDepartments={ministriesList}
                      departmentsInCategory={deptsInActiveCatFiltered}
                      toolbarFilteredDepartments={toolbarFilteredDepts}
                      activeCategoryId={effectiveActiveCatIdForBadges}
                      isSearchActive={isSearchActive}
                      eraSections={eraSectionsForTree}
                      isDark={isDark}
                      selectedDepartmentId={ministryBrowseDepartment?.id}
                      onSelectDepartment={(dept) => {
                        setMinistryBrowseDepartment(dept)
                        onSelectedDepartmentChange?.(dept.id)
                      }}
                      onAddRoot={() =>
                        openMinistryCreateRootInCategory(
                          activeCategory?.id ?? '',
                          resolveDefaultCreateEra(),
                          resolveDefaultCreateKind(),
                        )
                      }
                      onAddChild={(parentDept) =>
                        openMinistryCreateChild(
                          parentDept,
                          parentDept.categoryId ?? '',
                        )
                      }
                      onGoToPositionDefinitions={() =>
                        onNavigateToPositions(
                          activeCategory &&
                            activeCategory.id !== UNCATEGORIZED_CATEGORY_ID &&
                            activeCategory.id !== ALL_DEPARTMENTS_CATEGORY_ID
                            ? {
                                categoryId: activeCategory.id,
                                categoryName: activeCategory.name,
                              }
                            : undefined,
                        )
                      }
                    />
                  )}
                </GovLedgerPanel>
              )}
            </WorkspaceStack>
          )}
        </WorkspaceStage>
      </SectionRoot>

      <MinistryFormModal
        effectiveCountryId={effectiveCountryId}
        countryName={countryName}
        constituentPolities={constituentPolities}
        isHistorical={isHistorical}
        isOpen={ministryFormModalOpen}
        isDark={isDark}
        editingMinistry={editingMinistry}
        ministryForm={ministryForm}
        setMinistryForm={setMinistryForm}
        ministriesList={ministriesList}
        categoriesList={categoriesList}
        setCategoriesList={setCategoriesList}
        reloadCategories={reloadCategories}
        closeMinistryFormModal={closeMinistryFormModal}
        submitMinistryForm={submitMinistryForm}
        submittingMinistry={submittingMinistry}
        batchSavedCount={batchSavedCount}
        thumbnailInputRef={thumbnailInputRef}
        thumbnailUploading={thumbnailUploading}
        setThumbnailUploading={setThumbnailUploading}
        establishedDateModalOpen={establishedDateModalOpen}
        setEstablishedDateModalOpen={setEstablishedDateModalOpen}
        abolishedDateModalOpen={abolishedDateModalOpen}
        setAbolishedDateModalOpen={setAbolishedDateModalOpen}
        categorySelectOpen={categorySelectOpen}
        setCategorySelectOpen={setCategorySelectOpen}
        parentSelectOpen={parentSelectOpen}
        setParentSelectOpen={setParentSelectOpen}
        successorSelectOpen={successorSelectOpen}
        setSuccessorSelectOpen={setSuccessorSelectOpen}
        predecessorSelectOpen={predecessorSelectOpen}
        setPredecessorSelectOpen={setPredecessorSelectOpen}
      />
    </>
  )
}

const SectionRoot = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

const EraSelect = styled.select`
  height: 34px;
  padding: 0 28px 0 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
`

const WorkspaceStage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const WorkspaceStack = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SplitWorkspaceGrid = styled.div<{ $ledgerView?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $ledgerView }) =>
    $ledgerView
      ? 'minmax(420px, 1.05fr) minmax(0, 1fr)'
      : 'minmax(310px, 390px) minmax(0, 1fr)'};
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const TreeLedgerColumn = styled(GovLedgerPanel)`
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 250px);
`

const EmptyDetailPlaceholder = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
