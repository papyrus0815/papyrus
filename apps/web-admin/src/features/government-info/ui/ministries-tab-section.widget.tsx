import { useEffect, useMemo, useState } from 'react'

import {
  FiBriefcase,
  FiColumns,
  FiGrid,
  FiMaximize2,
  FiPlus,
  FiSearch,
  FiShield,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { useMinistriesTab } from '@/features/government-info/model/use-ministries-tab'
import {
  ALL_DEPARTMENTS_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_ID,
  isDefenseRelatedCategory,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import {
  EmptyStateFeatureCard,
  EmptyStateFill,
  EmptyStateSimple,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'
import { MinistryCategoryTabBar } from '@/widgets/country/country-detail/ui/ministry-category-tab-bar'
import { MinistryDepartmentDetailView } from '@/widgets/country/country-detail/ui/ministry-department-detail.view'
import { MinistryDepartmentTree } from '@/widgets/country/country-detail/ui/ministry-department-tree'
import { MinistryDeptSearchEmpty } from '@/widgets/country/country-detail/ui/ministry-dept-search-empty'

import {
  DepartmentEventsBlock,
  DepartmentTenuresBlock,
} from './department-blocks'
import {
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
import { MinistryFormModal } from './ministry-form-modal.widget'
import { UnlinkedCountryTenuresBar } from './unlinked-country-tenures-bar'

type DepartmentKindGroup = 'ALL' | 'MINISTRY' | 'AGENCY' | 'SPECIAL'

type WorkspaceLayoutMode = 'SPLIT' | 'FOCUS'

const KIND_GROUP_LABEL: Record<DepartmentKindGroup, string> = {
  ALL: '전체 성격',
  MINISTRY: '중앙부처',
  AGENCY: '외청·위원회',
  SPECIAL: '궁내·총독부',
}

export type MinistriesTabSectionProps = {
  contentTab: GovernmentContentTab
  effectiveCountryId: string | undefined
  isHistorical?: boolean
  isDark: boolean
  cabinetOpenMinistryIntent: { categoryId: string } | null
  onConsumedCabinetOpenMinistryIntent: () => void
  focusDepartmentId?: string | null
  onConsumedFocusDepartment?: () => void
  onNavigateToPositions: (context?: {
    departmentId?: string
    departmentName?: string
    categoryId?: string
    categoryName?: string
  }) => void
  onRegisterMilitaryUnit: (
    departmentId: string,
    historicalCountryId?: string | null,
  ) => void
  onInspectMilitaryUnit?: (unitId: string) => void
  onEditMilitaryUnit: (unitId: string) => void
  onOpenMilitaryTab?: () => void
  openCategoryModal: () => void
}

export function MinistriesTabSection({
  contentTab,
  effectiveCountryId,
  isHistorical = false,
  isDark,
  cabinetOpenMinistryIntent,
  onConsumedCabinetOpenMinistryIntent,
  focusDepartmentId,
  onConsumedFocusDepartment,
  onNavigateToPositions,
  onRegisterMilitaryUnit,
  onInspectMilitaryUnit,
  onEditMilitaryUnit,
  onOpenMilitaryTab,
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
    handleMinistryDelete,
    ministryCategoryDeptCounts,
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
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>('SPLIT')

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && effectiveCountryId ? effectiveCountryId : '',
    )

  const historicalErasAvailable = useMemo(() => {
    const eraMap = new Map<string, string>()
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
    return Array.from(eraMap.entries()).map(([histId, histName]) => ({
      id: histId,
      name: histName,
    }))
  }, [linkedHistoricalCountries, ministriesList])

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
      if (kindGroupFilter === 'MINISTRY') {
        if (deptKind !== 'MINISTRY') return false
      } else if (kindGroupFilter === 'AGENCY') {
        if (deptKind !== 'AGENCY') return false
      } else if (kindGroupFilter === 'SPECIAL') {
        if (
          !['ROYAL_HOUSEHOLD', 'COLONIAL_GOVERNMENT', 'OTHER'].includes(
            deptKind,
          )
        ) {
          return false
        }
      }
    }
    return true
  }

  const activeCategory = useMemo(
    () =>
      displayCategoriesList.find(
        (category) => category.id === ministryTreeCategoryId,
      ) ?? displayCategoriesList[0],
    [displayCategoriesList, ministryTreeCategoryId],
  )

  const deptsInActiveCat = useMemo(() => {
    if (!activeCategory) return []
    return ministriesList.filter((deptItem) => {
      if (!matchesDepartmentFilters(deptItem)) return false
      if (activeCategory.id === ALL_DEPARTMENTS_CATEGORY_ID) return true
      return activeCategory.id === UNCATEGORIZED_CATEGORY_ID
        ? !deptItem.categoryId
        : deptItem.categoryId === activeCategory.id
    })
  }, [
    activeCategory,
    ministriesList,
    eraFilter,
    kindGroupFilter,
    categoriesList,
  ])

  const deptsInActiveCatFiltered = useMemo(
    () => filterDepartmentsBySearchQuery(deptsInActiveCat, ministrySearchQuery),
    [deptsInActiveCat, filterDepartmentsBySearchQuery, ministrySearchQuery],
  )

  useEffect(() => {
    if (
      layoutMode === 'SPLIT' &&
      !ministryBrowseDepartment &&
      deptsInActiveCatFiltered.length > 0
    ) {
      const firstRoot =
        deptsInActiveCatFiltered.find((deptItem) => !deptItem.parentId) ??
        deptsInActiveCatFiltered[0]
      if (firstRoot) {
        setMinistryBrowseDepartment(firstRoot)
      }
    }
  }, [
    layoutMode,
    ministryBrowseDepartment,
    deptsInActiveCatFiltered,
    setMinistryBrowseDepartment,
  ])

  const resolveDefaultCreateKind = () => {
    if (kindGroupFilter === 'AGENCY') return 'AGENCY' as const
    if (kindGroupFilter === 'SPECIAL') return 'ROYAL_HOUSEHOLD' as const
    return 'MINISTRY' as const
  }

  const resolveDefaultCreateEra = () =>
    eraFilter !== 'ALL' && eraFilter !== 'MODERN' ? eraFilter : ''

  const isFocusDetailOnly =
    layoutMode === 'FOCUS' &&
    Boolean(ministryBrowseResolved) &&
    !ministryFormModalOpen

  const hasActiveFilters =
    Boolean(ministrySearchQuery.trim()) ||
    kindGroupFilter !== 'ALL' ||
    eraFilter !== 'ALL'

  const activeEraName =
    eraFilter === 'MODERN'
      ? '현대 직속'
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

              <GovToolbarGroup role="group" aria-label="기관 성격 필터">
                {(
                  ['ALL', 'MINISTRY', 'AGENCY', 'SPECIAL'] as const
                ).map((groupKey) => (
                  <GovToolbarBtn
                    key={groupKey}
                    type="button"
                    $active={kindGroupFilter === groupKey}
                    onClick={() => setKindGroupFilter(groupKey)}
                  >
                    {KIND_GROUP_LABEL[groupKey]}
                  </GovToolbarBtn>
                ))}
              </GovToolbarGroup>

              {!isHistorical && historicalErasAvailable.length > 0 ? (
                <EraSelect
                  aria-label="시대·정체 필터"
                  value={eraFilter}
                  onChange={(event) => setEraFilter(event.target.value)}
                >
                  <option value="ALL">전체 시대 ({ministriesList.length})</option>
                  <option value="MODERN">
                    현대 직속 (
                    {
                      ministriesList.filter(
                        (deptItem) => !deptItem.historicalCountryId,
                      ).length
                    }
                    )
                  </option>
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

              <GovToolbarRight>
                <GovViewMeta>
                  표시 <strong>{deptsInActiveCatFiltered.length}</strong> · 전체{' '}
                  <strong>{kpiStats.totalCount}</strong>
                </GovViewMeta>

                {kpiStats.linkedUnitCount > 0 ? (
                  <GovToolbarBtn
                    type="button"
                    onClick={() => onOpenMilitaryTab?.()}
                    title="군사 탭에서 소관 부대 편제 보기"
                  >
                    <FiShield size={12.5} />
                    <span>군부대 {kpiStats.linkedUnitCount}</span>
                  </GovToolbarBtn>
                ) : null}

                {effectiveCountryId ? (
                  <>
                    <GovToolbarDivider />
                    <GovToolbarBtn
                      type="button"
                      $active={layoutMode === 'SPLIT'}
                      onClick={() =>
                        setLayoutMode((prev) =>
                          prev === 'SPLIT' ? 'FOCUS' : 'SPLIT',
                        )
                      }
                      title={
                        layoutMode === 'SPLIT'
                          ? '현재 분할 보기 (클릭하여 단독 보기 전환)'
                          : '현재 단독 보기 (클릭하여 분할 보기 전환)'
                      }
                    >
                      {layoutMode === 'SPLIT' ? (
                        <>
                          <FiColumns size={13} />
                          <span>분할</span>
                        </>
                      ) : (
                        <>
                          <FiMaximize2 size={13} />
                          <span>단독</span>
                        </>
                      )}
                    </GovToolbarBtn>

                    <GovToolbarBtn
                      type="button"
                      onClick={() => openCategoryModal()}
                    >
                      <FiGrid size={13} />
                      <span>분류 ({categoriesList.length})</span>
                    </GovToolbarBtn>

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
            <EmptyStateFill>
              <EmptyStateSimple border="solid">불러오는 중…</EmptyStateSimple>
            </EmptyStateFill>
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
                onRegisterMilitaryUnit={
                  effectiveCountryId
                    ? () =>
                        onRegisterMilitaryUnit(
                          ministryBrowseResolved.id,
                          ministryBrowseResolved.historicalCountryId ?? null,
                        )
                    : undefined
                }
                onInspectMilitaryUnit={onInspectMilitaryUnit}
                onEditMilitaryUnit={onEditMilitaryUnit}
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
                }}
                onBack={() => {
                  setMinistryBrowseDepartment(null)
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
                counts={ministryCategoryDeptCounts}
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
                    eraFilter !== 'ALL' || kindGroupFilter !== 'ALL'
                      ? '선택한 시대·성격 필터에 해당하는 기관이 없습니다. 바로 이 조건으로 새 기관을 등록하거나 필터를 변경해 보세요.'
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
                <SplitWorkspaceGrid>
                  <TreeLedgerColumn>
                    <MinistryDepartmentTree
                      allDepartments={ministriesList}
                      departmentsInCategory={deptsInActiveCatFiltered}
                      isDark={isDark}
                      selectedDepartmentId={ministryBrowseResolved?.id}
                      onSelectDepartment={(dept) =>
                        setMinistryBrowseDepartment(dept)
                      }
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
                        onRegisterMilitaryUnit={
                          effectiveCountryId
                            ? () =>
                                onRegisterMilitaryUnit(
                                  ministryBrowseResolved.id,
                                  ministryBrowseResolved.historicalCountryId ??
                                    null,
                                )
                            : undefined
                        }
                        onInspectMilitaryUnit={onInspectMilitaryUnit}
                        onEditMilitaryUnit={onEditMilitaryUnit}
                        onSelectDepartment={(targetDeptId) => {
                          const targetDept = ministriesList.find(
                            (deptItem) => deptItem.id === targetDeptId,
                          )
                          if (!targetDept) return
                          setMinistryBrowseDepartment(targetDept)
                        }}
                        onBack={() => setMinistryBrowseDepartment(null)}
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
                        정보와 전신·후신 계보, 소관 군부대, 역대 재임 인사가
                        표시됩니다.
                      </EmptyDetailPlaceholder>
                    )}
                  </GovLedgerPanel>
                </SplitWorkspaceGrid>
              ) : (
                <GovLedgerPanel>
                  <MinistryDepartmentTree
                    allDepartments={ministriesList}
                    departmentsInCategory={deptsInActiveCatFiltered}
                    isDark={isDark}
                    selectedDepartmentId={ministryBrowseDepartment?.id}
                    onSelectDepartment={(dept) =>
                      setMinistryBrowseDepartment(dept)
                    }
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
                </GovLedgerPanel>
              )}
            </WorkspaceStack>
          )}
        </WorkspaceStage>
      </SectionRoot>

      <MinistryFormModal
        effectiveCountryId={effectiveCountryId}
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

const SplitWorkspaceGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(310px, 390px) minmax(0, 1fr);
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
