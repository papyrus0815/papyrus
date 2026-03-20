import { motion } from 'framer-motion'
import { FiBriefcase, FiGrid, FiPlus, FiSearch } from 'react-icons/fi'

import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { GOV_MAIN_COLOR as MAIN } from '@/features/government-info/model/constants'
import { useMinistriesTab } from '@/features/government-info/model/use-ministries-tab'
import { emptyMinistryFormFields } from '@/shared/lib/ministry-department/ministry-department-utils'
import { MinistryCategoryTabBar } from '@/widgets/country/country-detail/ui/ministry-category-tab-bar'
import { MinistryDepartmentDetailView } from '@/widgets/country/country-detail/ui/ministry-department-detail.view'
import { MinistryDepartmentTree } from '@/widgets/country/country-detail/ui/ministry-department-tree'
import { MinistryDeptSearchEmpty } from '@/widgets/country/country-detail/ui/ministry-dept-search-empty'

import { DepartmentEventsBlock, DepartmentTenuresBlock } from './department-blocks'
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

  return (
    <>
        <section aria-label="중앙부처 현황">
          {showMinistryListToolbar ? (
            <div
              style={{
                marginBottom: 18,
                paddingBottom: 18,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#eceff3'}`,
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
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    중앙부처
                  </h3>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      color: isDark ? '#94a3b8' : '#64748b',
                      lineHeight: 1.45,
                      maxWidth: 520,
                    }}
                  >
                    카테고리 선택 → 목록에서 부처 클릭 → 상세에서
                    재임·사건·편집.
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
                      background: MAIN,
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
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
                }}
              >
                <FiSearch
                  size={18}
                  style={{
                    color: isDark ? '#94a3b8' : '#64748b',
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
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : null}
          {!effectiveCountryId ? (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                color: isDark ? '#64748b' : '#6b7280',
                fontSize: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderRadius: 16,
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              }}
            >
              국가를 선택하면 부처를 등록할 수 있습니다.
            </div>
          ) : ministriesLoading ? (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                color: isDark ? '#64748b' : '#6b7280',
                fontSize: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderRadius: 16,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
              }}
            >
              불러오는 중…
            </div>
          ) : categoriesList.length === 0 ? (
            /* 카테고리가 없으면 행정부처럼 등록 유도 카드 1개 표시 (중앙부처 화면에 아무것도 안 나오는 문제 해결) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div
                style={{
                  padding: '48px 32px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  borderRadius: 20,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 20px',
                    borderRadius: 20,
                    background:
                      'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: MAIN,
                  }}
                >
                  <FiPlus size={28} strokeWidth={2.5} />
                </div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: 19,
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  등록된 부처 카테고리가 없습니다
                </h3>
                <p
                  style={{
                    margin: '0 0 24px',
                    fontSize: 14,
                    color: isDark ? '#64748b' : '#64748b',
                    lineHeight: 1.5,
                    maxWidth: 420,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  먼저 카테고리를 추가한 뒤, 해당 카테고리에 부처를 등록하세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    openCategoryModal()
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    background: MAIN,
                    border: 'none',
                    borderRadius: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <FiGrid size={16} /> 카테고리 관리
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
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
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <MinistryDepartmentDetailView
                    department={ministryBrowseResolved}
                    isDark={isDark}
                    categoryLabel={
                      categoriesList.find(
                        (category) => category.id === ministryBrowseResolved.categoryId,
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
                <>
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
                          minHeight: 260,
                          maxHeight: 'min(70vh, 680px)',
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
                            <div
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 18,
                                padding: '40px 20px 48px',
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 22,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: isDark
                                    ? 'linear-gradient(145deg, rgba(99,102,241,0.22), rgba(99,102,241,0.08))'
                                    : 'linear-gradient(145deg, #eef2ff, #f5f3ff)',
                                  color: isDark ? '#a5b4fc' : MAIN,
                                  boxShadow: isDark
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : '0 8px 24px rgba(99, 102, 241, 0.12)',
                                }}
                                aria-hidden
                              >
                                <FiBriefcase size={30} strokeWidth={1.75} />
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                  maxWidth: 320,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    letterSpacing: '-0.03em',
                                    color: isDark ? '#f1f5f9' : '#0f172a',
                                  }}
                                >
                                  등록된 부처가 없습니다
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    lineHeight: 1.55,
                                    color: isDark ? '#94a3b8' : '#64748b',
                                  }}
                                >
                                  이 카테고리에 첫 부처를 등록하면 목록과 계층이
                                  여기에 표시됩니다.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  openMinistryCreateRootInCategory(cat.id)
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '11px 20px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: 'none',
                                  borderRadius: 12,
                                  background: MAIN,
                                  color: '#fff',
                                  boxShadow:
                                    '0 4px 14px rgba(99, 102, 241, 0.35)',
                                }}
                              >
                                <FiPlus size={16} strokeWidth={2.25} />
                                부처 등록
                              </button>
                            </div>
                          ) : deptsInCatFiltered.length === 0 ? (
                            <MinistryDeptSearchEmpty
                              isDark={isDark}
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
                </>
              )}
            </div>
          )}
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
