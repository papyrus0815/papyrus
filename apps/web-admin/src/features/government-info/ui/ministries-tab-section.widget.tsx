import { useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiBriefcase,
  FiColumns,
  FiGrid,
  FiMaximize2,
  FiPlus,
  FiSearch,
  FiShield,
} from 'react-icons/fi'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { useMinistriesTab } from '@/features/government-info/model/use-ministries-tab'
import {
  ALL_DEPARTMENTS_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_ID,
  isDefenseRelatedCategory,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
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
import { MinistryFormModal } from './ministry-form-modal.widget'
import { UnlinkedCountryTenuresBar } from './unlinked-country-tenures-bar'

type DepartmentKindGroup =
  | 'ALL'
  | 'MINISTRY'
  | 'AGENCY'
  | 'SPECIAL'

type WorkspaceLayoutMode = 'SPLIT' | 'FOCUS'

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
  /** 군부대 등록 시 기본 연결 부처 ID */
  onRegisterMilitaryUnit: (departmentId: string) => void
  /** 연결 군부대 클릭 시 군사 탭의 해당 부대 상세/편제 트리로 이동 */
  onInspectMilitaryUnit?: (unitId: string) => void
  onEditMilitaryUnit: (unitId: string) => void
  /** 상단 「군사」 탭으로 바로 이동 */
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

  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
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
    const rootCount = ministriesList.filter(
      (deptItem) => !deptItem.parentId,
    ).length
    const subCount = totalCount - rootCount
    const linkedUnitIdSet = new Set<string>()
    for (const deptItem of ministriesList) {
      for (const unitRef of deptItem.militaryUnits ?? []) {
        if (unitRef.id) linkedUnitIdSet.add(unitRef.id)
      }
    }
    return {
      totalCount,
      rootCount,
      subCount,
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
  }, [activeCategory, ministriesList, eraFilter, kindGroupFilter, categoriesList])

  const deptsInActiveCatFiltered = useMemo(
    () => filterDepartmentsBySearchQuery(deptsInActiveCat, ministrySearchQuery),
    [deptsInActiveCat, filterDepartmentsBySearchQuery, ministrySearchQuery],
  )

  // 분할 워크스페이스에서 아무 기관도 선택되지 않았으면 첫 번째 최상위 기관을 자동 선택
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

  return (
    <>
      <section
        aria-label="중앙부처 현황"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {!isFocusDetailOnly ? (
          <div
            style={{
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: `1px solid ${palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* 헤더 + 액션 버튼 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color: palette.text,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    중앙부처 · 국가기관
                  </h3>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: palette.accentBg,
                      color: palette.accent,
                    }}
                  >
                    총 {kpiStats.totalCount}곳
                  </span>
                </div>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 13,
                    color: palette.textMuted,
                    lineHeight: 1.45,
                    maxWidth: 680,
                  }}
                >
                  내각 부처(성·부·6조), 외청·정보·위원회, 총독부·궁내기관의 상하
                  위계와 전신·후신 계보, 역대 장관·수장을 관리합니다. (군 최고사령부·야전군 편제는 상단 「군사」 탭에서 관리)
                </p>
              </div>

              {effectiveCountryId ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* 레이아웃 전환 토글 */}
                  <div
                    role="group"
                    aria-label="화면 보기 방식"
                    style={{
                      display: 'inline-flex',
                      borderRadius: 10,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.bgSubtle,
                      padding: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setLayoutMode('SPLIT')}
                      title="좌측 계층 트리 + 우측 기관 상세 분할 워크스페이스"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background:
                          layoutMode === 'SPLIT'
                            ? palette.cardBg
                            : 'transparent',
                        color:
                          layoutMode === 'SPLIT'
                            ? palette.accent
                            : palette.textMuted,
                      }}
                    >
                      <FiColumns size={13} />
                      트리+상세 분할
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode('FOCUS')}
                      title="목록/상세 단독 전환 보기"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background:
                          layoutMode === 'FOCUS'
                            ? palette.cardBg
                            : 'transparent',
                        color:
                          layoutMode === 'FOCUS'
                            ? palette.accent
                            : palette.textMuted,
                      }}
                    >
                      <FiMaximize2 size={13} />
                      단독 보기
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCategoryModal()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 13px',
                      borderRadius: 10,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.cardBg,
                      color: palette.text,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <FiGrid size={14} />
                    분류 관리
                  </button>

                  {onOpenMilitaryTab && (
                    <button
                      type="button"
                      onClick={onOpenMilitaryTab}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 14px',
                        borderRadius: 10,
                        border: `1px solid ${palette.borderMid}`,
                        background: palette.cardBg,
                        color: palette.text,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <FiShield size={14} />
                      군사 사령부·편제 이동 →
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      openMinistryCreateRootInCategory(
                        ministryTreeCategoryId,
                        resolveDefaultCreateEra(),
                        resolveDefaultCreateKind(),
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '9px 16px',
                      border: 'none',
                      background: palette.accent,
                      color: '#fff',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 10px rgba(99, 102, 241, 0.28)',
                    }}
                  >
                    <FiPlus size={16} />
                    기관·부처 등록
                  </button>
                </div>
              ) : null}
            </div>

            {/* KPI 요약 배지 바 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 10,
              }}
            >
              {[
                {
                  label: '전체 행정부처·기관',
                  value: `${kpiStats.totalCount}곳`,
                  sub: `최상위 ${kpiStats.rootCount} · 산하 ${kpiStats.subCount}`,
                },
                {
                  label: '시대별 국가 정체',
                  value: isHistorical
                    ? '단일 정체'
                    : `${historicalErasAvailable.length}개`,
                  sub: '왕조·제국·공화국 시대 구분',
                },
                {
                  label: '소관 연결 군사조직',
                  value: `${kpiStats.linkedUnitCount}개`,
                  sub: '국방·군정 부처 소관 사령부·부대',
                },
                {
                  label: '등록된 분야 카테고리',
                  value: `${categoriesList.length}개`,
                  sub: '미분류·직속 기구 별도 지원',
                },
              ].map((statCard) => (
                <div
                  key={statCard.label}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${palette.borderHairline}`,
                    background: palette.bgSubtle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: palette.textMuted,
                    }}
                  >
                    {statCard.label}
                  </span>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: palette.text,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {statCard.value}
                  </span>
                  <span style={{ fontSize: 11, color: palette.textFaint }}>
                    {statCard.sub}
                  </span>
                </div>
              ))}
            </div>

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
                  tenureHistCountryId,
                  'MINISTRY',
                )
              }
            />

            {/* 검색 + 성격·시대 필터 */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  flex: '1 1 280px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 13px',
                  borderRadius: 11,
                  border: `1px solid ${palette.borderMid}`,
                  background: palette.bgMuted,
                }}
              >
                <FiSearch
                  size={16}
                  style={{
                    color: palette.iconColor,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <input
                  type="search"
                  value={ministrySearchQuery}
                  onChange={(event) =>
                    setMinistrySearchQuery(event.target.value)
                  }
                  placeholder="부처·사령부명, 약칭(OKW·합참), 원어명, 카테고리 검색…"
                  aria-label="부처 이름 검색"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '2px 0',
                    fontSize: 13.5,
                    border: 'none',
                    background: 'transparent',
                    color: palette.text,
                    outline: 'none',
                  }}
                />
              </div>

              <div
                role="group"
                aria-label="기관 성격 필터"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                {(
                  [
                    { key: 'ALL', label: '전체 성격' },
                    { key: 'MINISTRY', label: '중앙부처 (성·부·조)' },
                    { key: 'AGENCY', label: '외청·정보·위원회' },
                    { key: 'SPECIAL', label: '궁내·총독부·기타' },
                  ] as const
                ).map((chipItem) => {
                  const isActive = kindGroupFilter === chipItem.key
                  return (
                    <button
                      key={chipItem.key}
                      type="button"
                      onClick={() => setKindGroupFilter(chipItem.key)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${
                          isActive ? palette.accent : palette.borderMid
                        }`,
                        background: isActive ? palette.accentBg : 'transparent',
                        color: isActive ? palette.accent : palette.textMuted,
                      }}
                    >
                      {chipItem.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 시대·정체 필터 칩 (항상 노출하여 빈 상태에서도 시대별 등록 가능) */}
            {!isHistorical && historicalErasAvailable.length > 0 && (
              <div
                role="group"
                aria-label="시대·정체 필터"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: palette.textMuted,
                    marginRight: 4,
                  }}
                >
                  시대·정체:
                </span>
                <button
                  type="button"
                  onClick={() => setEraFilter('ALL')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${
                      eraFilter === 'ALL' ? palette.accent : palette.borderMid
                    }`,
                    background:
                      eraFilter === 'ALL' ? palette.accentBg : 'transparent',
                    color:
                      eraFilter === 'ALL' ? palette.accent : palette.textMuted,
                  }}
                >
                  전체 시대 ({ministriesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEraFilter('MODERN')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${
                      eraFilter === 'MODERN'
                        ? palette.accent
                        : palette.borderMid
                    }`,
                    background:
                      eraFilter === 'MODERN' ? palette.accentBg : 'transparent',
                    color:
                      eraFilter === 'MODERN'
                        ? palette.accent
                        : palette.textMuted,
                  }}
                >
                  현대 체제 직속 (
                  {
                    ministriesList.filter(
                      (deptItem) => !deptItem.historicalCountryId,
                    ).length
                  }
                  )
                </button>
                {historicalErasAvailable.map((eraItem) => {
                  const isActive = eraFilter === eraItem.id
                  const eraCount = ministriesList.filter(
                    (deptItem) => deptItem.historicalCountryId === eraItem.id,
                  ).length
                  return (
                    <button
                      key={eraItem.id}
                      type="button"
                      onClick={() => setEraFilter(eraItem.id)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${
                          isActive ? palette.accent : palette.borderMid
                        }`,
                        background: isActive ? palette.accentBg : 'transparent',
                        color: isActive ? palette.accent : palette.textMuted,
                      }}
                    >
                      🏛️ {eraItem.name} ({eraCount})
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* 본문 영역 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
            <motion.div
              key="ministry-detail-focus"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
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
                    ? () => onRegisterMilitaryUnit(ministryBrowseResolved.id)
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
            </motion.div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
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
                      : '이 분류에 첫 국가기관·중앙부처·최고사령부를 등록하면 상하 계층과 전신·후신 계보가 표시됩니다.'
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
                /* 2-Column Master-Detail Workspace (좌: 편제 트리 / 우: 선택 기관 인라인 상세) */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'minmax(340px, 430px) minmax(0, 1fr)',
                    gap: 18,
                    alignItems: 'start',
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 16,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.bgSubtle,
                      maxHeight: 'calc(100vh - 280px)',
                      overflowY: 'auto',
                    }}
                  >
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
                  </div>

                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: 16,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.cardBg,
                      minWidth: 0,
                    }}
                  >
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
                      <div
                        style={{
                          padding: '48px 24px',
                          textAlign: 'center',
                          color: palette.textMuted,
                          fontSize: 13.5,
                        }}
                      >
                        좌측 편제 트리에서 기관·부처·사령부를 선택하면 상세
                        정보와 전신·후신 계보, 소관 군부대, 역대 재임 인사가
                        여기에 표시됩니다.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </section>

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
