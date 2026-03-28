import { useMemo } from 'react'

import { motion } from 'framer-motion'
import { FiBriefcase, FiGrid, FiPlus, FiSearch } from 'react-icons/fi'

import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { useMinistriesTab } from '@/features/government-info/model/use-ministries-tab'
import { emptyMinistryFormFields } from '@/shared/lib/ministry-department/ministry-department-utils'
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

export type MinistriesTabSectionProps = {
  contentTab: GovernmentContentTab
  effectiveCountryId: string | undefined
  isDark: boolean
  cabinetOpenMinistryIntent: { categoryId: string } | null
  onConsumedCabinetOpenMinistryIntent: () => void
  onNavigateToPositions: () => void
  /** 군부대 등록 시 기본 연결 부처 ID */
  onRegisterMilitaryUnit: (departmentId: string) => void
  onEditMilitaryUnit: (unitId: string) => void
  openCategoryModal: () => void
}

export function MinistriesTabSection({
  contentTab,
  effectiveCountryId,
  isDark,
  cabinetOpenMinistryIntent,
  onConsumedCabinetOpenMinistryIntent,
  onNavigateToPositions,
  onRegisterMilitaryUnit,
  onEditMilitaryUnit,
  openCategoryModal,
}: MinistriesTabSectionProps) {
  const ministriesTab = useMinistriesTab({
    effectiveCountryId,
    contentTab,
    cabinetOpenMinistryIntent,
    onConsumedCabinetOpenMinistryIntent,
  })

  const {
    ministriesList,
    ministriesLoading,
    ministryFormModalOpen,
    setMinistryFormModalOpen,
    ministrySearchQuery,
    setMinistrySearchQuery,
    ministryTreeCategoryId,
    setMinistryTreeCategoryId,
    ministryBrowseDepartment,
    setMinistryBrowseDepartment,
    editingMinistry,
    setEditingMinistry,
    ministryForm,
    setMinistryForm,
    categoriesList,
    openMinistryEdit,
    openMinistryCreateChild,
    openMinistryCreateRootInCategory,
    closeMinistryFormModal,
    submitMinistryForm,
    handleMinistryDelete,
    ministryCategoryDeptCounts,
    ministryBrowseResolved,
    showMinistryListToolbar,
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
  } = ministriesTab

  const C = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])

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
        {showMinistryListToolbar ? (
          <div
            style={{
              marginBottom: 18,
              paddingBottom: 18,
              borderBottom: `1px solid ${C.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.text,
                    letterSpacing: '-0.03em',
                  }}
                >
                  중앙부처
                </h3>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 13,
                    color: C.textMuted,
                    lineHeight: 1.45,
                    maxWidth: 520,
                  }}
                >
                  카테고리 선택 → 목록에서 부처 클릭 → 상세에서 재임·사건·편집.
                </p>
              </div>
              {effectiveCountryId ? (
                <button
                  type="button"
                  onClick={() => {
                    setMinistryBrowseDepartment(null)
                    setEditingMinistry(null)
                    setMinistryForm(emptyMinistryFormFields('', ''))
                    setMinistryFormModalOpen(true)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    border: 'none',
                    background: C.accent,
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.28)',
                  }}
                >
                  <FiPlus size={16} />
                  부처 등록
                </button>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 12,
                border: `1px solid ${C.borderMid}`,
                background: C.bgMuted,
              }}
            >
              <FiSearch
                size={18}
                style={{
                  color: C.iconColor,
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <input
                type="search"
                value={ministrySearchQuery}
                onChange={(event) => setMinistrySearchQuery(event.target.value)}
                placeholder="부처명·카테고리 검색…"
                aria-label="부처 이름 검색"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '4px 2px',
                  fontSize: 14,
                  border: 'none',
                  background: 'transparent',
                  color: C.text,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        ) : null}
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
          ) : categoriesList.length === 0 ? (
            <EmptyStateFill>
              <EmptyStateFeatureCard
                flat
                cardBorder={false}
                icon={<FiPlus size={28} strokeWidth={2.5} />}
                title="등록된 부처 카테고리가 없습니다"
                description="먼저 카테고리를 추가한 뒤, 해당 카테고리에 부처를 등록하세요."
                primaryAction={{
                  label: '카테고리 관리',
                  onClick: () => openCategoryModal(),
                  icon: <FiGrid size={16} />,
                }}
              />
            </EmptyStateFill>
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
              {ministryBrowseResolved && !ministryFormModalOpen ? (
                <motion.div
                  key="ministry-detail"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '0',
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <MinistryDepartmentDetailView
                    department={ministryBrowseResolved}
                    isDark={isDark}
                    categoryLabel={
                      categoriesList.find(
                        (category) =>
                          category.id === ministryBrowseResolved.categoryId,
                      )?.name ?? null
                    }
                    isDefenseRelated={(() => {
                      const categoryRow = categoriesList.find(
                        (row) => row.id === ministryBrowseResolved.categoryId,
                      )
                      const ko = categoryRow?.name ?? ''
                      const en = categoryRow?.nameEn ?? ''
                      return (
                        /국방|군사|국군|전쟁|합참/i.test(ko) ||
                        /defense|military|armed|forces|war/i.test(en)
                      )
                    })()}
                    onRegisterMilitaryUnit={
                      effectiveCountryId
                        ? () =>
                            onRegisterMilitaryUnit(ministryBrowseResolved.id)
                        : undefined
                    }
                    onEditMilitaryUnit={onEditMilitaryUnit}
                    onBack={() => {
                      setMinistrySearchQuery('')
                      setMinistryBrowseDepartment(null)
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
                      setMinistrySearchQuery('')
                      setMinistryBrowseDepartment(null)
                      onNavigateToPositions()
                    }}
                    tenuresSlot={
                      <DepartmentTenuresBlock
                        departmentId={ministryBrowseResolved.id}
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
                    categories={categoriesList}
                    counts={ministryCategoryDeptCounts}
                    selectedCategoryId={ministryTreeCategoryId}
                    onSelectCategory={setMinistryTreeCategoryId}
                    isDark={isDark}
                  />
                  {(() => {
                    const cat =
                      categoriesList.find(
                        (category) => category.id === ministryTreeCategoryId,
                      ) ?? categoriesList[0]
                    if (!cat) return null
                    const deptsInCat = ministriesList.filter(
                      (dept) => dept.categoryId === cat.id,
                    )
                    const deptsInCatFiltered = filterDepartmentsBySearchQuery(
                      deptsInCat,
                      ministrySearchQuery,
                    )
                    return (
                      <div
                        role="tabpanel"
                        id={`ministry-cat-panel-${cat.id}`}
                        aria-labelledby={`ministry-cat-tab-${cat.id}`}
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          paddingTop: 4,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0,
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch',
                          }}
                        >
                          {deptsInCat.length === 0 ? (
                            <EmptyStateSpotlight
                              flat
                              icon={
                                <FiBriefcase size={30} strokeWidth={1.75} />
                              }
                              title="등록된 부처가 없습니다"
                              description="이 카테고리에 첫 부처를 등록하면 목록과 계층이 여기에 표시됩니다."
                              primaryAction={{
                                label: '부처 등록',
                                onClick: () =>
                                  openMinistryCreateRootInCategory(cat.id),
                                icon: <FiPlus size={16} strokeWidth={2.25} />,
                              }}
                            />
                          ) : deptsInCatFiltered.length === 0 ? (
                            <MinistryDeptSearchEmpty
                              onClearSearch={() => setMinistrySearchQuery('')}
                            />
                          ) : (
                            <MinistryDepartmentTree
                              allDepartments={ministriesList}
                              departmentsInCategory={deptsInCatFiltered}
                              isDark={isDark}
                              selectedDepartmentId={
                                ministryBrowseDepartment?.id
                              }
                              onSelectDepartment={(dept) =>
                                setMinistryBrowseDepartment(dept)
                              }
                              onAddRoot={() =>
                                openMinistryCreateRootInCategory(cat.id)
                              }
                              onGoToPositionDefinitions={() =>
                                onNavigateToPositions()
                              }
                            />
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <MinistryFormModal
        effectiveCountryId={effectiveCountryId}
        isOpen={ministryFormModalOpen}
        isDark={isDark}
        editingMinistry={editingMinistry}
        ministryForm={ministryForm}
        setMinistryForm={setMinistryForm}
        ministriesList={ministriesList}
        categoriesList={categoriesList}
        closeMinistryFormModal={closeMinistryFormModal}
        submitMinistryForm={submitMinistryForm}
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
      />
    </>
  )
}
