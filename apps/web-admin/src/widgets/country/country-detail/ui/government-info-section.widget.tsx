import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { FiGrid, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'

import type { GovernmentContentTab } from '@/features/government-info/model/government-content-tab'
import { GovernmentOrganizationsTab } from '@/features/government-info/ui/government-organizations-tab.widget'
import { GovernmentStatisticsTab } from '@/features/government-info/ui/government-statistics-tab.widget'
import { MinistriesTabSection } from '@/features/government-info/ui/ministries-tab-section.widget'
import {
  OrgEmptyState,
  OrgListHeader,
  OrgListHeaderCount,
  OrgListHeaderDesc,
  OrgListHeaderRow,
  OrgListHeaderTitle,
  OrgListHeaderTitleBlock,
  OrgSearchInput,
  OrgSearchWrap,
  OrgToolbarRow,
} from '@/features/government-info/ui/government-organizations-tab.styled'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PositionDefinitionsSection } from './position-definitions-section.widget'

import { mockGovernmentData } from '../mock'
import type { HistoricalEvent } from '../mock/types'
import { CabinetsSection } from './cabinets-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { MilitaryUnitFormModal } from './military-unit-form.modal'

export type { GovernmentContentTab }

export interface GovernmentInfoSectionProps {
  /** 국가(현대/역사) — 행정부 탭에서 사용 */
  country?: import('@/entities/country/model/unified-types').UnifiedCountry
  /** 국가 ID (있으면 중앙부처 탭에서 API 연동 CRUD) */
  countryId?: string
  /** 카테고리 모달 열림 (헤더 버튼에서 제어 시 부모에서 전달) */
  categoryModalOpen?: boolean
  /** 카테고리 모달 닫기 콜백 */
  onCloseCategoryModal?: () => void
  /** 카테고리 모달 열기 콜백 (헤더 우측 버튼용, 부모에서 state 제어 시 전달) */
  onOpenCategoryModal?: () => void
  /** URL 등으로 역대 수반 탭 진입 시 첫 서브탭을 역대 수반으로 */
  initialContentTab?: GovernmentContentTab
}

// 메인·액센트 컬러 (트렌디한 다색 팔레트)
const MAIN = '#6366f1'
const BORDER_COLOR = '#e5e7eb'

/* 부처 카테고리 모달 — CountrySelectModal·HistoricalCountryFormModal 디자인 참조 */
const BORDER_LIGHT = '#f3f4f6'
const TEXT = '#0f172a'
const TEXT_MUTED = '#64748b'
const BG_MUTED = '#f8fafc'

const CategoryModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
`
const CategoryModalBox = styled(motion.div)`
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  overflow: hidden;
`
const CategoryModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-bottom: 1px solid ${BORDER_LIGHT};
`
const CategoryModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${TEXT};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 10px;
  svg {
    color: ${TEXT_MUTED};
    flex-shrink: 0;
  }
`
const CategoryModalDesc = styled.p`
  margin: 8px 0 0 0;
  font-size: 14px;
  color: ${TEXT_MUTED};
`
const CategoryModalCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: ${BG_MUTED};
  color: ${TEXT_MUTED};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  &:hover {
    background: #e2e8f0;
    color: ${TEXT};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
`
const CategoryModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 28px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${BORDER_LIGHT};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`
const CategoryFormBlock = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`
const CategorySectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${TEXT_MUTED};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 16px;
`
const CategoryFormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${TEXT};
`
const CategoryInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 15px;
  color: ${TEXT};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &::placeholder {
    color: #94a3b8;
  }
  &:last-of-type {
    margin-bottom: 20px;
  }
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
const CategoryBtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`
const CategoryPrimaryBtn = styled.button`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${MAIN};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`
const CategorySecondaryBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT_MUTED};
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: #f8fafc;
  }
`
const CategoryListSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${TEXT_MUTED};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 12px;
`
const CategoryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const CategoryListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`
const CategoryListItemLabel = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${TEXT};
  span {
    color: ${TEXT_MUTED};
    margin-left: 6px;
    font-weight: 500;
    font-size: 13px;
  }
`
const CategoryItemActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`
const CategoryEditBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${MAIN};
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: #f8fafc;
    border-color: rgba(99, 102, 241, 0.3);
  }
`
const CategoryDeleteBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: #fee2e2;
  }
`
const CategoryEmptyMessage = styled.li`
  padding: 32px 24px;
  font-size: 14px;
  color: ${TEXT_MUTED};
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  text-align: center;
  line-height: 1.55;
  list-style: none;
`

const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 18,
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  lineHeight: 1.4,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>
}

const GOV_TAB_META: Record<
  GovernmentContentTab,
  { label: string; hint: string }
> = {
  heads: {
    label: '역대 수반',
    hint: '국가별 재임 기록과 인물 정보를 조회·수정합니다.',
  },
  cabinets: {
    label: '행정부',
    hint: '정권별 행정부와 각료 구성을 관리합니다.',
  },
  ministries: {
    label: '중앙부처',
    hint: '카테고리별 중앙부처를 검색·등록·수정합니다.',
  },
  organizations: {
    label: '행정기구',
    hint: '행정기구·조직을 검색하고 국가별로 관리합니다.',
  },
  positions: {
    label: '직위 정의',
    hint: '관직·직위를 정의하고 관리합니다.',
  },
  statistics: {
    label: '통계',
    hint: '행정조직 규모와 추이를 한눈에 확인합니다.',
  },
}

export function GovernmentInfoSection({
  country,
  countryId,
  categoryModalOpen: categoryModalOpenProp,
  onCloseCategoryModal,
  onOpenCategoryModal,
  initialContentTab,
}: GovernmentInfoSectionProps) {
  const queryClient = useQueryClient()
  const [contentTab, setContentTab] = useState<GovernmentContentTab>(
    initialContentTab ?? 'heads',
  )
  const effectiveCountryId = countryId ?? country?.id
  const isDark = useThemeStore((s) => s.mode === 'dark')
  const cabinetsPalette = useMemo(
    () => getCabinetsSectionPalette(isDark),
    [isDark],
  )
  const [cabinetMinistryIntent, setCabinetMinistryIntent] = useState<{
    categoryId: string
  } | null>(null)
  const [militaryUnitModalOpen, setMilitaryUnitModalOpen] = useState(false)
  const [militaryUnitEditingId, setMilitaryUnitEditingId] = useState<
    string | null
  >(null)
  const [militaryDeptDefaultId, setMilitaryDeptDefaultId] = useState<
    string | null
  >(null)
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  // 카테고리 설정 모달 (헤더에서 열면 부모 state, 아니면 내부 state)
  const [categoryModalOpenLocal, setCategoryModalOpenLocal] = useState(false)
  const categoryModalOpen = categoryModalOpenProp ?? categoryModalOpenLocal
  const closeCategoryModal = () => {
    onCloseCategoryModal?.()
    setCategoryModalOpenLocal(false)
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
  }
  const [categoryModalList, setCategoryModalList] = useState<
    AdministrationDepartmentCategory[]
  >([])
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  )
  const [categoryFormSaving, setCategoryFormSaving] = useState(false)

  const loadCategoryModalList = () => {
    administrationDepartmentApi
      .getCategories()
      .then((list) => {
        setCategoryModalList(list)
      })
      .catch(() => setCategoryModalList([]))
  }

  useEffect(() => {
    if (categoryModalOpen) loadCategoryModalList()
  }, [categoryModalOpen])

  const openCategoryModal = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
    if (onOpenCategoryModal) {
      onOpenCategoryModal()
      return
    }
    setCategoryModalOpenLocal(true)
  }

  const saveCategoryForm = async () => {
    if (!categoryForm.name.trim()) {
      alert('카테고리명을 입력해주세요.')
      return
    }
    setCategoryFormSaving(true)
    try {
      if (editingCategoryId) {
        await administrationDepartmentApi.updateCategory(editingCategoryId, {
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
      } else {
        await administrationDepartmentApi.createCategory({
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
      }
      loadCategoryModalList()
      setEditingCategoryId(null)
      setCategoryForm({ name: '', nameEn: '' })
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setCategoryFormSaving(false)
    }
  }

  const deleteCategoryById = async (id: string) => {
    if (
      !confirm(
        '이 카테고리를 삭제하시겠습니까? 해당 카테고리를 쓰는 부처는 카테고리가 해제됩니다.',
      )
    )
      return
    try {
      await administrationDepartmentApi.deleteCategory(id)
      loadCategoryModalList()
      if (editingCategoryId === id) {
        setEditingCategoryId(null)
        setCategoryForm({ name: '', nameEn: '' })
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // 전체 통계 계산
  const totalMinistries = mockGovernmentData.ministries.length
  const totalConstitutional = mockGovernmentData.constitutionalBodies.length
  const totalAgencies = mockGovernmentData.agencies.length
  const totalLocal = mockGovernmentData.localGovernments.length
  const totalOrganizations =
    totalMinistries + totalConstitutional + totalAgencies + totalLocal

  // 전체 예산 (조원)
  const totalBudget = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const budget = parseFloat(ministry.budget.replace(/[^0-9.]/g, ''))
      return sum + budget
    }, 0)
    .toFixed(1)

  // 전체 인원
  const totalEmployees = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const employees = parseInt(ministry.employees.replace(/[^0-9]/g, ''))
      return sum + employees
    }, 0)
    .toLocaleString()

  // 모든 사건 수집
  const allEvents: (HistoricalEvent & { orgName: string; orgType: string })[] =
    []

  mockGovernmentData.ministries.forEach((ministry) => {
    if (ministry.events) {
      ministry.events.forEach((event) => {
        allEvents.push({
          ...event,
          orgName: ministry.name,
          orgType: '중앙부처',
        })
      })
    }
  })

  mockGovernmentData.constitutionalBodies.forEach((body) => {
    if (body.events) {
      body.events.forEach((event) => {
        allEvents.push({ ...event, orgName: body.name, orgType: '헌법기관' })
      })
    }
  })

  mockGovernmentData.agencies.forEach((agency) => {
    if (agency.events) {
      agency.events.forEach((event) => {
        allEvents.push({ ...event, orgName: agency.name, orgType: '산하기관' })
      })
    }
  })

  mockGovernmentData.localGovernments.forEach((local) => {
    if (local.events) {
      local.events.forEach((event: HistoricalEvent) => {
        allEvents.push({ ...event, orgName: local.name, orgType: '지방정부' })
      })
    }
  })

  // 연도순 정렬
  allEvents.sort(
    (eventA, eventB) => parseInt(eventB.year) - parseInt(eventA.year),
  )

  // 필터링된 사건
  const filteredEvents =
    selectedEventType === 'all'
      ? allEvents
      : allEvents.filter((event) => event.type === selectedEventType)

  // 사건 타입별 개수
  const eventCounts = {
    all: allEvents.length,
    establishment: allEvents.filter((event) => event.type === 'establishment')
      .length,
    reform: allEvents.filter((event) => event.type === 'reform').length,
    achievement: allEvents.filter((event) => event.type === 'achievement')
      .length,
    crisis: allEvents.filter((event) => event.type === 'crisis').length,
    merger: allEvents.filter((event) => event.type === 'merger').length,
  }

  // 연도별 예산 데이터 (기획재정부 기준)
  const budgetData = mockGovernmentData.ministries[0].statistics || []

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '36px 32px 48px',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <SectionTabHeader
        title="행정조직"
        description="역대 수반, 행정부, 중앙부처, 행정기구를 관리합니다."
        rightSlot={
          onOpenCategoryModal ? (
            <AddButton
              type="button"
              onClick={onOpenCategoryModal}
              aria-label="부처 카테고리 설정"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              카테고리 설정
            </AddButton>
          ) : undefined
        }
      />

      <TabNavigation>
        {(Object.keys(GOV_TAB_META) as GovernmentContentTab[]).map((tabKey) => (
          <TabButton
            key={tabKey}
            type="button"
            $active={contentTab === tabKey}
            onClick={() => setContentTab(tabKey)}
          >
            {GOV_TAB_META[tabKey].label}
          </TabButton>
        ))}
      </TabNavigation>

      {contentTab === 'heads' && country && (
        <section aria-label="역대 수반">
          <HeadsOfStateSection country={country} embedded />
        </section>
      )}

      {contentTab === 'statistics' && (
        <GovernmentStatisticsTab
          palette={cabinetsPalette}
          isDark={isDark}
          totalEmployees={totalEmployees}
          totalBudget={totalBudget}
          totalOrganizations={totalOrganizations}
          totalMinistries={totalMinistries}
          totalConstitutional={totalConstitutional}
          totalAgencies={totalAgencies}
          totalLocal={totalLocal}
          budgetData={budgetData}
          filteredEvents={filteredEvents}
          eventCounts={eventCounts}
          selectedEventType={selectedEventType}
          onSelectedEventTypeChange={setSelectedEventType}
        />
      )}

      {contentTab === 'ministries' && (
        <MinistriesTabSection
          contentTab={contentTab}
          effectiveCountryId={effectiveCountryId}
          isDark={isDark}
          cabinetOpenMinistryIntent={cabinetMinistryIntent}
          onConsumedCabinetOpenMinistryIntent={() =>
            setCabinetMinistryIntent(null)
          }
          onNavigateToPositions={() => setContentTab('positions')}
          onRegisterMilitaryUnit={(departmentId) => {
            setMilitaryDeptDefaultId(departmentId)
            setMilitaryUnitEditingId(null)
            setMilitaryUnitModalOpen(true)
          }}
          onEditMilitaryUnit={(unitId) => {
            setMilitaryUnitEditingId(unitId)
            setMilitaryDeptDefaultId(null)
            setMilitaryUnitModalOpen(true)
          }}
          openCategoryModal={openCategoryModal}
        />
      )}

      {contentTab === 'positions' && (
        <section aria-label="직위 정의">
          <PositionDefinitionsSection />
        </section>
      )}

      {contentTab === 'cabinets' && country && (
        <section
          aria-label="행정부(역대 내각)"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CabinetsSection
            country={country}
            onOpenMinistriesTab={(categoryId) => {
              setContentTab('ministries')
              setCabinetMinistryIntent({
                categoryId: categoryId ?? '',
              })
            }}
          />
        </section>
      )}

      {contentTab === 'organizations' && (
        <GovernmentOrganizationsTab
          country={country}
          effectiveCountryId={effectiveCountryId}
        />
      )}


      {/* 부처 카테고리 모달 */}
      {categoryModalOpen && (
        <CategoryModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCategoryModal()
          }}
        >
          <CategoryModalBox
            id="category-modal-title"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            <CategoryModalHeader>
              <div>
                <CategoryModalTitle>
                  <FiGrid size={24} strokeWidth={2} />
                  부처 카테고리
                </CategoryModalTitle>
                <CategoryModalDesc>
                  국방·외교 등 공통 분류 관리
                </CategoryModalDesc>
              </div>
              <CategoryModalCloseBtn
                type="button"
                onClick={closeCategoryModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </CategoryModalCloseBtn>
            </CategoryModalHeader>

            <CategoryModalBody>
              <CategoryFormBlock>
                <CategorySectionTitle>추가 / 수정</CategorySectionTitle>
                <CategoryFormLabel htmlFor="category-form-name">
                  카테고리명
                </CategoryFormLabel>
                <CategoryInput
                  id="category-form-name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="예: 국방"
                />
                <CategoryFormLabel htmlFor="category-form-nameEn">
                  영문명 (선택)
                </CategoryFormLabel>
                <CategoryInput
                  id="category-form-nameEn"
                  value={categoryForm.nameEn}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, nameEn: e.target.value }))
                  }
                  placeholder="예: Defense"
                />
                <CategoryBtnRow>
                  <CategoryPrimaryBtn
                    type="button"
                    onClick={saveCategoryForm}
                    disabled={categoryFormSaving}
                  >
                    {categoryFormSaving
                      ? '저장 중…'
                      : editingCategoryId
                        ? '수정'
                        : '추가'}
                  </CategoryPrimaryBtn>
                  {editingCategoryId && (
                    <CategorySecondaryBtn
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null)
                        setCategoryForm({ name: '', nameEn: '' })
                      }}
                    >
                      취소
                    </CategorySecondaryBtn>
                  )}
                </CategoryBtnRow>
              </CategoryFormBlock>

              <CategoryListSectionTitle>
                등록된 카테고리
              </CategoryListSectionTitle>
              <CategoryList>
                {categoryModalList.length === 0 ? (
                  <CategoryEmptyMessage>
                    등록된 카테고리가 없습니다.
                  </CategoryEmptyMessage>
                ) : (
                  categoryModalList.map((cat) => (
                    <CategoryListItem key={cat.id}>
                      <CategoryListItemLabel>
                        {cat.name}
                        {cat.nameEn && <span>({cat.nameEn})</span>}
                      </CategoryListItemLabel>
                      <CategoryItemActions>
                        <CategoryEditBtn
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                            setCategoryForm({
                              name: cat.name,
                              nameEn: cat.nameEn ?? '',
                            })
                          }}
                        >
                          수정
                        </CategoryEditBtn>
                        <CategoryDeleteBtn
                          type="button"
                          onClick={() => deleteCategoryById(cat.id)}
                        >
                          삭제
                        </CategoryDeleteBtn>
                      </CategoryItemActions>
                    </CategoryListItem>
                  ))
                )}
              </CategoryList>
            </CategoryModalBody>
          </CategoryModalBox>
        </CategoryModalOverlay>
      )}
    </motion.div>

    <MilitaryUnitFormModal
      isOpen={militaryUnitModalOpen}
      onClose={() => {
        setMilitaryUnitModalOpen(false)
        setMilitaryUnitEditingId(null)
        setMilitaryDeptDefaultId(null)
      }}
      onSaved={() => {
        void queryClient.invalidateQueries({
          queryKey: administrationDepartmentsByCountryQueryKey(effectiveCountryId),
        })
      }}
      defaultCountryId={effectiveCountryId ?? null}
      defaultAdministrationDepartmentId={militaryDeptDefaultId}
      editingUnitId={militaryUnitEditingId}
      lockCountryAndDepartment={
        !militaryUnitEditingId &&
        Boolean(effectiveCountryId && militaryDeptDefaultId)
      }
    />
  </>
  )
}
