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
import * as S from '@/pages/history/country/country.styles'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
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
const ACCENT = {
  teal: '#0d9488',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
} as const

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
        <>
          {/* 핵심 수치 요약 */}
          <div style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid #e9eef5',
            paddingBottom: 20,
            marginBottom: 4,
          }}>
            {[
              { label: '총 인원', value: totalEmployees, unit: '명' },
              { label: '총 예산', value: totalBudget, unit: '조원' },
              { label: '조직 수', value: totalOrganizations, unit: '개' },
              { label: '중앙부처', value: totalMinistries, unit: '개' },
              { label: '헌법기관', value: totalConstitutional, unit: '개' },
            ].map((kpi, i, arr) => (
              <div
                key={i}
                style={{
                  flex: '1 1 0',
                  paddingLeft: i === 0 ? 0 : 24,
                  paddingRight: i < arr.length - 1 ? 24 : 0,
                  borderRight: i < arr.length - 1 ? '1px solid #f0f4f8' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                  {kpi.label}
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.3 }}>
                  {kpi.value}
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginLeft: 2 }}>{kpi.unit}</span>
                </span>
              </div>
            ))}
          </div>

          {/* 요약 지표 */}
          <section aria-label="행정조직 요약">
            <SectionLabel>요약 지표</SectionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 20,
              }}
            >
              <StatCard
                accentColor={MAIN}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                }
                title="전체 조직"
                value={totalOrganizations}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.teal}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
                  </svg>
                }
                title="중앙부처"
                value={totalMinistries}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.amber}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                }
                title="헌법기관"
                value={totalConstitutional}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.emerald}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                }
                title="총 인원"
                value={totalEmployees}
                unit="명"
              />
              <StatCard
                accentColor={ACCENT.sky}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                title="총 예산"
                value={totalBudget}
                unit="조원"
              />
            </div>
          </section>

          {/* 예산 추이 — 요약 지표 바로 아래 */}
          <section aria-label="국가 예산 추이">
            <SectionLabel>예산 추이</SectionLabel>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 24,
                padding: 28,
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#78716c',
                    fontWeight: 500,
                  }}
                >
                  최근 6년간 예산 변화 (단위: 조원)
                </p>
                {budgetData.length > 0 && (
                  <span
                    style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500 }}
                  >
                    최대 {Math.max(...budgetData.map((s) => s.budget || 0))}조원
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 16,
                  height: 260,
                  padding: '0 8px 8px',
                  position: 'relative',
                }}
              >
                {/* Y축 눈금 배경 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                  }}
                >
                  {[100, 75, 50, 25].map((pct) => (
                    <div
                      key={pct}
                      style={{
                        width: '100%',
                        height: 1,
                        background: 'rgba(0,0,0,0.06)',
                        marginLeft: 8,
                        marginRight: 8,
                      }}
                    />
                  ))}
                </div>
                {budgetData.map((stat, idx) => {
                  const maxBudget = Math.max(
                    ...budgetData.map((s) => s.budget || 0),
                    1,
                  )
                  const height = maxBudget
                    ? ((stat.budget || 0) / maxBudget) * 200
                    : 0
                  const prevBudget =
                    idx > 0 ? budgetData[idx - 1].budget || 0 : 0
                  const currBudget = stat.budget || 0
                  const isUp = currBudget > prevBudget
                  const pctChange = prevBudget
                    ? Math.abs((currBudget - prevBudget) / prevBudget) * 100
                    : 0
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 72,
                          minHeight: 32,
                          height: `${Math.max(height, 32)}px`,
                          background: `linear-gradient(180deg, ${MAIN} 0%, rgba(99, 102, 241, 0.75) 70%, rgba(99, 102, 241, 0.5) 100%)`,
                          borderRadius: '12px 12px 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          padding: '10px 6px',
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: 700,
                          boxShadow: '0 2px 12px rgba(99, 102, 241, 0.25)',
                          transition:
                            'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow =
                            '0 8px 24px rgba(99, 102, 241, 0.35)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow =
                            '0 2px 12px rgba(99, 102, 241, 0.25)'
                        }}
                      >
                        {stat.budget}조
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1c1917',
                          }}
                        >
                          {stat.year}
                        </span>
                        {idx > 0 && prevBudget > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isUp ? ACCENT.emerald : '#78716c',
                            }}
                          >
                            {isUp ? '↑' : '↓'} {pctChange.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* 좌: 타임라인 | 우: 조직 유형별 현황 — 5:5 */}
          <section
            aria-label="타임라인 및 조직 유형"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* 좌측: 주요 사건 타임라인 */}
            <div style={{ minWidth: 0 }}>
              <SectionLabel>주요 사건</SectionLabel>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 24,
                  padding: 28,
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 20,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: MAIN,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: '#1c1917',
                          margin: 0,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        타임라인
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#78716c',
                          margin: '2px 0 0',
                        }}
                      >
                        행정조직 관련 주요 사건
                      </p>
                    </div>
                  </div>

                  {/* 사건 타입 필터 — 세그먼트 스타일 */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      flexWrap: 'wrap',
                      padding: 4,
                      background: '#f5f5f4',
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {[
                      { key: 'all', label: '전체', count: eventCounts.all },
                      {
                        key: 'establishment',
                        label: '설립',
                        count: eventCounts.establishment,
                      },
                      {
                        key: 'reform',
                        label: '개혁',
                        count: eventCounts.reform,
                      },
                      {
                        key: 'achievement',
                        label: '성과',
                        count: eventCounts.achievement,
                      },
                      {
                        key: 'crisis',
                        label: '위기',
                        count: eventCounts.crisis,
                      },
                      {
                        key: 'merger',
                        label: '통합',
                        count: eventCounts.merger,
                      },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setSelectedEventType(filter.key)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: 'none',
                          background:
                            selectedEventType === filter.key
                              ? '#ffffff'
                              : 'transparent',
                          color:
                            selectedEventType === filter.key
                              ? '#1c1917'
                              : '#57534e',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow:
                            selectedEventType === filter.key
                              ? '0 1px 3px rgba(0,0,0,0.08)'
                              : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedEventType !== filter.key) {
                            e.currentTarget.style.background =
                              'rgba(255,255,255,0.6)'
                            e.currentTarget.style.color = '#1c1917'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedEventType !== filter.key) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#57534e'
                          }
                        }}
                      >
                        {filter.label}
                        <span
                          style={{
                            fontSize: 10,
                            background:
                              selectedEventType === filter.key
                                ? MAIN
                                : 'rgba(0,0,0,0.08)',
                            color:
                              selectedEventType === filter.key
                                ? '#ffffff'
                                : '#57534e',
                            padding: '2px 6px',
                            borderRadius: 8,
                            fontWeight: 700,
                          }}
                        >
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 사건 리스트 — 세로 타임라인 (축선 + 노드 + 카드) */}
                <div
                  style={{
                    position: 'relative',
                    maxHeight: 560,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                  className="government-events-list"
                >
                  {filteredEvents.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        fontSize: 14,
                        color: '#78716c',
                        background: '#fafaf9',
                        borderRadius: 18,
                        border: '1px dashed rgba(0,0,0,0.1)',
                      }}
                    >
                      해당 조건의 사건이 없습니다.
                    </div>
                  ) : (
                    <>
                      {/* 세로 축선 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 23,
                          top: 12,
                          bottom: 12,
                          width: 2,
                          background: `linear-gradient(180deg, ${MAIN} 0%, transparent 100%)`,
                          borderRadius: 1,
                          opacity: 0.8,
                        }}
                        aria-hidden
                      />
                      {filteredEvents.slice(0, 20).map((event, idx) => {
                        const eventWithImages = event as typeof event & {
                          images?: string[]
                        }
                        const imageUrl =
                          eventWithImages.images?.[0] ??
                          mockGovernmentData.ministries.find(
                            (m) => m.name === event.orgName,
                          )?.images?.[0]
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 0,
                              position: 'relative',
                              paddingBottom: 20,
                            }}
                          >
                            {/* 타임라인 노드 (연도) */}
                            <div
                              style={{
                                width: 48,
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingTop: 14,
                              }}
                            >
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  border: `3px solid ${MAIN}`,
                                  boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: MAIN,
                                  marginTop: 6,
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                {event.year}
                              </span>
                            </div>

                            {/* 카드 */}
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                background: '#ffffff',
                                borderRadius: 18,
                                border: '1px solid rgba(0,0,0,0.06)',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow =
                                  '0 8px 24px rgba(0,0,0,0.08)'
                                e.currentTarget.style.borderColor = MAIN
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow =
                                  '0 2px 8px rgba(0,0,0,0.04)'
                                e.currentTarget.style.borderColor =
                                  'rgba(0,0,0,0.06)'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  minHeight: 88,
                                }}
                              >
                                <div
                                  style={{
                                    width: 100,
                                    minWidth: 100,
                                    flexShrink: 0,
                                    background: imageUrl
                                      ? `url(${imageUrl}) center/cover`
                                      : `linear-gradient(135deg, #e7e5e4 0%, ${MAIN} 100%)`,
                                  }}
                                />
                                <div
                                  style={{
                                    padding: '12px 14px 14px',
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      marginBottom: 6,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    {event.orgName && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: '#57534e',
                                          background: '#f5f5f4',
                                          padding: '4px 8px',
                                          borderRadius: 8,
                                        }}
                                      >
                                        {event.orgName}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: '#78716c',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      {event.type === 'establishment' && '설립'}
                                      {event.type === 'reform' && '개혁'}
                                      {event.type === 'achievement' && '성과'}
                                      {event.type === 'crisis' && '위기'}
                                      {event.type === 'merger' && '통합'}
                                    </span>
                                  </div>
                                  <h4
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: '#292524',
                                      margin: '0 0 4px',
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {event.title}
                                  </h4>
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: '#57534e',
                                      lineHeight: 1.5,
                                      margin: 0,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {event.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 우측: 조직 유형별 현황 2x2 */}
            <div style={{ minWidth: 0 }}>
              <SectionLabel>조직 유형별 현황</SectionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                }}
              >
                <OrgTypeCard
                  accentColor={MAIN}
                  title="중앙행정기관"
                  count={totalMinistries}
                  description="18개 부처"
                  examples={['기획재정부', '외교부', '국방부']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.teal}
                  title="헌법기관"
                  count={totalConstitutional}
                  description="5개 기관"
                  examples={['국회', '대법원', '헌법재판소']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.amber}
                  title="산하기관"
                  count={totalAgencies}
                  description="8개 기관"
                  examples={['국세청', '관세청', '경찰청']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.sky}
                  title="지방자치단체"
                  count={totalLocal}
                  description="4개 시/도"
                  examples={['서울시', '경기도', '부산시']}
                />
              </div>
            </div>
          </section>
        </>
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

// 통계 카드 (카드별 액센트 색)
function StatCard({
  accentColor = MAIN,
  icon,
  title,
  value,
  unit,
}: {
  accentColor?: string
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = '#d1d5db'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#e5e7eb'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: '#6b7280',
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

// 조직 타입 카드 (카드별 액센트 색)
function OrgTypeCard({
  accentColor = MAIN,
  title,
  count,
  description,
  examples,
}: {
  accentColor?: string
  title: string
  count: number
  description: string
  examples: string[]
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 22,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = '#d1d5db'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#e5e7eb'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h4
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h4>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {count}
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: '#6b7280',
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {examples.map((example, idx) => (
          <div
            key={idx}
            style={{
              fontSize: 12,
              color: '#374151',
              padding: '8px 12px',
              background: '#f9fafb',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          >
            • {example}
          </div>
        ))}
      </div>
    </div>
  )
}

// 이벤트 타입별 아이콘
function getEventIcon(type: string) {
  switch (type) {
    case 'establishment':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
        </svg>
      )
    case 'reform':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      )
    case 'achievement':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    case 'crisis':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'merger':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      )
    default:
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}
