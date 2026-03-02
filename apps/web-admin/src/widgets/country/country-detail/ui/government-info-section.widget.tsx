import { useState, useEffect, useRef } from 'react'

import { motion } from 'framer-motion'
import styled from 'styled-components'

import type { AdministrationDepartment, AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getUploadImageUrl, uploadImage, validateImageFile } from '@/shared/api/upload'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import * as S from '@/pages/history/country/country.styles'

import { mockGovernmentData } from '../mock'
import type { HistoricalEvent } from '../mock/types'

export type GovernmentContentTab = 'statistics' | 'ministries'

/* 행정조직 탭 스타일 (country.styles OverviewSubTabBar/Button과 동일) */
const GovTabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`
const GovTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

export interface GovernmentInfoSectionProps {
  /** 국가 ID (있으면 중앙부처 탭에서 API 연동 CRUD) */
  countryId?: string
  /** 카테고리 모달 열림 (헤더 버튼에서 제어 시 부모에서 전달) */
  categoryModalOpen?: boolean
  /** 카테고리 모달 닫기 콜백 */
  onCloseCategoryModal?: () => void
  /** 카테고리 모달 열기 콜백 (헤더 우측 버튼용, 부모에서 state 제어 시 전달) */
  onOpenCategoryModal?: () => void
}

// 메인·액센트 컬러 (트렌디한 다색 팔레트)
const MAIN = '#6366f1'
const ACCENT = {
  teal: '#0d9488',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
} as const

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

/**
 * 행정조직 통계 대시보드
 * - 전체 조직 통계
 * - 주요 사건 타임라인
 * - 예산/인원 그래프
 * - 조직별 현황
 * - 중앙부처 탭: countryId 있으면 API CRUD(등록/수정/삭제)
 */
export function GovernmentInfoSection({ countryId, categoryModalOpen: categoryModalOpenProp, onCloseCategoryModal, onOpenCategoryModal }: GovernmentInfoSectionProps) {
  const [contentTab, setContentTab] = useState<GovernmentContentTab>('statistics')
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  // 중앙부처 실데이터 (countryId 있을 때만)
  const [ministriesList, setMinistriesList] = useState<AdministrationDepartment[]>([])
  const [ministriesLoading, setMinistriesLoading] = useState(false)
  /** 'list' = 목록, 'form' = 컨텐츠 영역에 등록/수정 화면 */
  const [ministryView, setMinistryView] = useState<'list' | 'form'>('list')
  const [editingMinistry, setEditingMinistry] = useState<AdministrationDepartment | null>(null)
  const [ministryForm, setMinistryForm] = useState({ name: '', parentId: '', categoryId: '', thumbnailUrl: '', description: '', establishedDate: '', abolishedDate: '', successorId: '' })
  const [categoriesList, setCategoriesList] = useState<AdministrationDepartmentCategory[]>([])

  // 카테고리 설정 모달 (헤더에서 열면 부모 state, 아니면 내부 state)
  const [categoryModalOpenLocal, setCategoryModalOpenLocal] = useState(false)
  const categoryModalOpen = categoryModalOpenProp ?? categoryModalOpenLocal
  const closeCategoryModal = () => {
    onCloseCategoryModal?.()
    setCategoryModalOpenLocal(false)
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
  }
  const [categoryModalList, setCategoryModalList] = useState<AdministrationDepartmentCategory[]>([])
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryFormSaving, setCategoryFormSaving] = useState(false)

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] = useState(false)
  const [abolishedDateModalOpen, setAbolishedDateModalOpen] = useState(false)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [parentSelectOpen, setParentSelectOpen] = useState(false)
  const [successorSelectOpen, setSuccessorSelectOpen] = useState(false)

  const loadMinistries = () => {
    if (!countryId) return
    setMinistriesLoading(true)
    administrationDepartmentApi
      .getByCountryId(countryId)
      .then(setMinistriesList)
      .catch(() => setMinistriesList([]))
      .finally(() => setMinistriesLoading(false))
  }

  useEffect(() => {
    if (contentTab === 'ministries') {
      administrationDepartmentApi.getCategories().then(setCategoriesList).catch(() => setCategoriesList([]))
      if (countryId) loadMinistries()
    }
  }, [contentTab, countryId])

  const loadCategoryModalList = () => {
    administrationDepartmentApi.getCategories().then((list) => {
      setCategoryModalList(list)
      setCategoriesList(list)
    }).catch(() => setCategoryModalList([]))
  }

  useEffect(() => {
    if (categoryModalOpen) loadCategoryModalList()
  }, [categoryModalOpen])

  const openCategoryModal = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
    if (onCloseCategoryModal !== undefined) {
      // 부모 제어 시 부모에서 열어주므로 여기선 닫기만
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
    if (!confirm('이 카테고리를 삭제하시겠습니까? 해당 카테고리를 쓰는 부처는 카테고리가 해제됩니다.')) return
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        background: '#ffffff',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
      }}
    >
      {/* 헤더 — 대시보드 Hero 스타일 + 카테고리 설정 */}
      <S.GlobalDashboardHero>
        <S.HeroContent style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <S.HeroTextGroup>
              <S.HeroTitle>행정조직</S.HeroTitle>
              <S.HeroSubtitle>
                중앙·헌법기관, 산하기관, 지방자치단체 구성과 예산·주요 사건을 한눈에 볼 수 있습니다.
              </S.HeroSubtitle>
            </S.HeroTextGroup>
          </div>
          {onOpenCategoryModal && (
            <button
              type="button"
              onClick={onOpenCategoryModal}
              aria-label="부처 카테고리 설정"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              카테고리 설정
            </button>
          )}
        </S.HeroContent>
      </S.GlobalDashboardHero>

      {/* 탭 (수반 기본정보/업적과 동일 스타일) + KPI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <GovTabNav>
          <GovTabButton
            type="button"
            $active={contentTab === 'statistics'}
            onClick={() => setContentTab('statistics')}
          >
            통계
          </GovTabButton>
          <GovTabButton
            type="button"
            $active={contentTab === 'ministries'}
            onClick={() => setContentTab('ministries')}
          >
            중앙부처
          </GovTabButton>
        </GovTabNav>

        {/* KPI 스트립 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
            padding: '20px 28px',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>총 인원</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{totalEmployees}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>명</span></span>
          </div>
          <span style={{ width: 1, height: 24, background: '#e2e8f0', borderRadius: 1 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>총 예산</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{totalBudget}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>조원</span></span>
          </div>
          <span style={{ width: 1, height: 24, background: '#e2e8f0', borderRadius: 1 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>조직 수</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{totalOrganizations}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>개</span></span>
          </div>
        </div>
      </div>

      {contentTab === 'statistics' && (
        <>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#78716c', fontWeight: 500 }}>
              최근 6년간 예산 변화 (단위: 조원)
            </p>
            {budgetData.length > 0 && (
              <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500 }}>
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
              const maxBudget = Math.max(...budgetData.map((s) => s.budget || 0), 1)
              const height = maxBudget ? ((stat.budget || 0) / maxBudget) * 200 : 0
              const prevBudget = idx > 0 ? budgetData[idx - 1].budget || 0 : 0
              const currBudget = stat.budget || 0
              const isUp = currBudget > prevBudget
              const pctChange = prevBudget ? Math.abs((currBudget - prevBudget) / prevBudget) * 100 : 0
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
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.35)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    {stat.budget}조
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1917' }}>{stat.year}</span>
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1c1917', margin: 0, letterSpacing: '-0.02em' }}>
                    타임라인
                  </h3>
                  <p style={{ fontSize: 13, color: '#78716c', margin: '2px 0 0' }}>
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
                  { key: 'establishment', label: '설립', count: eventCounts.establishment },
                  { key: 'reform', label: '개혁', count: eventCounts.reform },
                  { key: 'achievement', label: '성과', count: eventCounts.achievement },
                  { key: 'crisis', label: '위기', count: eventCounts.crisis },
                  { key: 'merger', label: '통합', count: eventCounts.merger },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedEventType(filter.key)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background: selectedEventType === filter.key ? '#ffffff' : 'transparent',
                      color: selectedEventType === filter.key ? '#1c1917' : '#57534e',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: selectedEventType === filter.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEventType !== filter.key) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
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
                        background: selectedEventType === filter.key ? MAIN : 'rgba(0,0,0,0.08)',
                        color: selectedEventType === filter.key ? '#ffffff' : '#57534e',
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
                    const eventWithImages = event as typeof event & { images?: string[] }
                    const imageUrl =
                      eventWithImages.images?.[0] ??
                      mockGovernmentData.ministries.find((m) => m.name === event.orgName)?.images?.[0]
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
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                            e.currentTarget.style.borderColor = MAIN
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
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
                            <div style={{ padding: '12px 14px 14px', flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
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
      <section aria-label="중앙부처 현황" style={{ paddingTop: 8, ...(countryId && ministryView === 'form' ? { padding: '20px 0 32px' } : {}) }}>
        {countryId && ministryView === 'form' ? (
          <>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    type="button"
                    onClick={() => { setMinistryView('list'); setEditingMinistry(null) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#64748b',
                      background: 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    목록으로
                  </button>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>{editingMinistry ? '부처 수정' : '부처 등록'}</h2>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ministryForm.name.trim()) { alert('부처명을 입력해주세요.'); return }
                      if (!ministryForm.categoryId?.trim()) { alert('카테고리를 선택해주세요.'); return }
                      if (ministriesList.some((d) => d.categoryId === ministryForm.categoryId && d.id !== editingMinistry?.id)) { alert('이미 해당 카테고리에 부처가 등록되어 있습니다.'); return }
                      const payload = { name: ministryForm.name.trim(), parentId: ministryForm.parentId || null, categoryId: ministryForm.categoryId || null, thumbnailUrl: ministryForm.thumbnailUrl.trim() || null, description: ministryForm.description.trim() || null, establishedDate: ministryForm.establishedDate.trim() || null, abolishedDate: ministryForm.abolishedDate.trim() || null, successorId: ministryForm.successorId.trim() || null }
                      if (editingMinistry) { administrationDepartmentApi.update(editingMinistry.id, payload).then(() => { setMinistryView('list'); setEditingMinistry(null); loadMinistries() }).catch((e) => alert(e instanceof Error ? e.message : '수정에 실패했습니다')) } else { administrationDepartmentApi.create({ ...payload, countryId }).then(() => { setMinistryView('list'); setEditingMinistry(null); loadMinistries() }).catch((e) => alert(e instanceof Error ? e.message : '등록에 실패했습니다')) }
                    }}
                    style={{ padding: '12px 24px', background: MAIN, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
                  >
                    {editingMinistry ? '저장' : '등록'}
                  </button>
                </div>
              </div>

              <input ref={thumbnailInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ''; try { validateImageFile(file); setThumbnailUploading(true); const res = await uploadImage(file, 'ministries'); setMinistryForm((f) => ({ ...f, thumbnailUrl: res.url })); } catch (err) { alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.'); } finally { setThumbnailUploading(false); } }} />

              <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>썸네일</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div role="button" tabIndex={0} onClick={() => thumbnailInputRef.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); thumbnailInputRef.current?.click() } }} style={{ width: '100%', maxWidth: 280, aspectRatio: '16/10', borderRadius: 14, border: '2px dashed #e5e7eb', background: ministryForm.thumbnailUrl ? 'transparent' : '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: thumbnailUploading ? 'wait' : 'pointer' }}>
                      {thumbnailUploading ? <span style={{ fontSize: 13, color: '#94a3b8' }}>업로드 중…</span> : ministryForm.thumbnailUrl ? <img src={getUploadImageUrl(ministryForm.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span style={{ fontSize: 13, color: '#94a3b8' }}>이미지 선택</span>}
                    </div>
                    {ministryForm.thumbnailUrl && <button type="button" onClick={(e) => { e.stopPropagation(); setMinistryForm((f) => ({ ...f, thumbnailUrl: '' })) }} style={{ alignSelf: 'flex-start', marginTop: 4, padding: '6px 12px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', cursor: 'pointer' }}>제거</button>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>부처명 <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={ministryForm.name} onChange={(e) => setMinistryForm((f) => ({ ...f, name: e.target.value }))} placeholder="예: 기획재정부" style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>카테고리 <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" onClick={() => setCategorySelectOpen(true)} style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: ministryForm.categoryId ? '#111827' : '#9ca3af', background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{ministryForm.categoryId ? (categoriesList.find((c) => c.id === ministryForm.categoryId)?.name ?? '') : '선택'}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 8, opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>한 카테고리당 한 부처</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>상위 부처</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" onClick={() => setParentSelectOpen(true)} style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: ministryForm.parentId ? '#111827' : '#9ca3af', background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{ministryForm.parentId ? (ministriesList.find((d) => d.id === ministryForm.parentId)?.name ?? '') : '선택'}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 8, opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>설립일 · 폐지일</label>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setEstablishedDateModalOpen(true)} style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: ministryForm.establishedDate ? '#111827' : '#9ca3af', background: ministryForm.establishedDate ? '#eff6ff' : '#fff', cursor: 'pointer', minWidth: 140 }}>
                      {ministryForm.establishedDate ? ministryForm.establishedDate.replace(/-/g, '.') : '설립일 선택'}
                    </button>
                    <button type="button" onClick={() => setAbolishedDateModalOpen(true)} style={{ padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, color: ministryForm.abolishedDate ? '#111827' : '#9ca3af', background: ministryForm.abolishedDate ? '#fef2f2' : '#fff', cursor: 'pointer', minWidth: 140 }}>
                      {ministryForm.abolishedDate ? ministryForm.abolishedDate.replace(/-/g, '.') : '폐지일 선택'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>후신 부처</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" onClick={() => setSuccessorSelectOpen(true)} style={{ width: '100%', maxWidth: 380, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: ministryForm.successorId ? '#111827' : '#9ca3af', background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{ministryForm.successorId ? (ministriesList.find((d) => d.id === ministryForm.successorId)?.name ?? '') : '선택'}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 8, opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start', padding: '20px 0' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', paddingTop: 10 }}>설명</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea value={ministryForm.description} onChange={(e) => setMinistryForm((f) => ({ ...f, description: e.target.value }))} placeholder="역할, 담당 업무 등" rows={2} style={{ width: '100%', maxWidth: 440, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', resize: 'vertical', minHeight: 72, outline: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            <DatePickerModal isOpen={establishedDateModalOpen} onClose={() => setEstablishedDateModalOpen(false)} onSelect={(date) => { setMinistryForm((f) => ({ ...f, establishedDate: date })); setEstablishedDateModalOpen(false); setAbolishedDateModalOpen(true) }} initialDate={ministryForm.establishedDate || undefined} title="설립일 선택" />
            <DatePickerModal isOpen={abolishedDateModalOpen} onClose={() => setAbolishedDateModalOpen(false)} onSelect={(date) => { setMinistryForm((f) => ({ ...f, abolishedDate: date })); setAbolishedDateModalOpen(false) }} initialDate={ministryForm.abolishedDate || undefined} title="폐지일 선택" />
            <SelectModal
              isOpen={categorySelectOpen}
              onClose={() => setCategorySelectOpen(false)}
              title="카테고리 선택"
              options={categoriesList.filter((c) => !ministriesList.some((d) => d.categoryId === c.id && d.id !== editingMinistry?.id)).map((c) => ({ value: c.id, label: `${c.name}${c.nameEn ? ` (${c.nameEn})` : ''}` })) as SelectOption[]}
              selectedValue={ministryForm.categoryId || undefined}
              onSelect={(id) => { setMinistryForm((f) => ({ ...f, categoryId: id })); setCategorySelectOpen(false) }}
            />
            <SelectModal
              isOpen={parentSelectOpen}
              onClose={() => setParentSelectOpen(false)}
              title="상위 부처 선택"
              options={[{ value: '', label: '없음' }, ...ministriesList.filter((d) => !editingMinistry || d.id !== editingMinistry.id).map((d) => ({ value: d.id, label: d.name }))] as SelectOption[]}
              selectedValue={ministryForm.parentId}
              onSelect={(id) => { setMinistryForm((f) => ({ ...f, parentId: id })); setParentSelectOpen(false) }}
            />
            <SelectModal
              isOpen={successorSelectOpen}
              onClose={() => setSuccessorSelectOpen(false)}
              title="후신 부처 선택"
              options={[{ value: '', label: '없음' }, ...ministriesList.filter((d) => !editingMinistry || d.id !== editingMinistry.id).map((d) => ({ value: d.id, label: d.name }))] as SelectOption[]}
              selectedValue={ministryForm.successorId}
              onSelect={(id) => { setMinistryForm((f) => ({ ...f, successorId: id })); setSuccessorSelectOpen(false) }}
            />
          </>
        ) : (
          /* 목록 — 카테고리별 대형 카드, 모던 톤 */
          <>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>중앙부처 현황</h3>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>카테고리별로 한 부처만 등록됩니다.</p>
            </div>
            {!countryId ? (
              <div style={{ padding: 56, textAlign: 'center', color: '#6b7280', fontSize: 14, background: '#f9fafb', borderRadius: 16, border: '1px dashed #e5e7eb' }}>
                국가를 선택하면 부처를 등록할 수 있습니다.
              </div>
            ) : ministriesLoading ? (
              <div style={{ padding: 56, textAlign: 'center', color: '#6b7280', fontSize: 14, background: '#f9fafb', borderRadius: 16, border: '1px solid #e5e7eb' }}>
                불러오는 중…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
                {categoriesList.map((cat) => {
                  const dept = ministriesList.find((d) => d.categoryId === cat.id)
                  const parentName = dept?.parentId ? ministriesList.find((d) => d.id === dept.parentId)?.name ?? '-' : null
                  return (
                    <div
                      key={cat.id}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        minHeight: 280,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                        {cat.name}
                        {cat.nameEn && <span style={{ fontWeight: 500, color: '#94a3b8', textTransform: 'none', letterSpacing: '0', marginLeft: 8 }}>· {cat.nameEn}</span>}
                      </div>
                      {dept ? (
                        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                            {dept.thumbnailUrl ? (
                              <img src={getUploadImageUrl(dept.thumbnailUrl)} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 16 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <div style={{ width: 88, height: 88, borderRadius: 16, background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24 }}>—</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{dept.name}</div>
                              {parentName && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>상위: {parentName}</div>}
                              {dept.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dept.description}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMinistry(dept)
                                setMinistryForm({ name: dept.name, parentId: dept.parentId ?? '', categoryId: dept.categoryId ?? '', thumbnailUrl: dept.thumbnailUrl ?? '', description: dept.description ?? '', establishedDate: dept.establishedDate ? dept.establishedDate.slice(0, 10) : '', abolishedDate: dept.abolishedDate ? dept.abolishedDate.slice(0, 10) : '', successorId: dept.successorId ?? '' })
                                setMinistryView('form')
                              }}
                              style={{ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', fontWeight: 600, color: '#475569' }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`"${dept.name}" 부처를 삭제하시겠습니까?`)) administrationDepartmentApi.delete(dept.id).then(loadMinistries)
                              }}
                              style={{ padding: '10px 18px', fontSize: 13, cursor: 'pointer', border: '1px solid #fecaca', borderRadius: 12, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32, background: '#f9fafb' }}>
                          <span style={{ fontSize: 14, color: '#6b7280' }}>등록된 부처 없음</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMinistry(null)
                              setMinistryForm({ name: '', parentId: '', categoryId: cat.id, thumbnailUrl: '', description: '', establishedDate: '', abolishedDate: '', successorId: '' })
                              setMinistryView('form')
                            }}
                            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: 10, background: MAIN, color: '#fff' }}
                          >
                            부처 등록
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
      )}

      {/* 부처 카테고리 모달 */}
      {categoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0, 0, 0, 0.38)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCategoryModal() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            id="category-modal-title"
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: 22,
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '26px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>부처 카테고리</h3>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>국방·외교 등 공통 분류 관리</p>
              </div>
              <button
                type="button"
                onClick={closeCategoryModal}
                aria-label="닫기"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
              <div style={{ marginBottom: 28, padding: 24, background: '#fafafa', borderRadius: 16, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', marginBottom: 14, textTransform: 'uppercase' }}>추가 / 수정</div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>카테고리명</label>
                <input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 국방"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    marginBottom: 14,
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    fontSize: 14,
                    color: '#111827',
                    outline: 'none',
                    background: '#fff',
                  }}
                />
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>영문명 (선택)</label>
                <input
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, nameEn: e.target.value }))}
                  placeholder="예: Defense"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    marginBottom: 16,
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    fontSize: 14,
                    color: '#6b7280',
                    outline: 'none',
                    background: '#fff',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={saveCategoryForm}
                    disabled={categoryFormSaving}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: MAIN,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: categoryFormSaving ? 'wait' : 'pointer',
                    }}
                  >
                    {categoryFormSaving ? '저장 중…' : editingCategoryId ? '수정' : '추가'}
                  </button>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: '', nameEn: '' }) }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#6b7280',
                      }}
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>등록된 카테고리</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryModalList.length === 0 ? (
                  <li style={{ padding: '28px 16px', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb', textAlign: 'center' }}>
                    등록된 카테고리가 없습니다.
                  </li>
                ) : (
                  categoryModalList.map((cat) => (
                    <li
                      key={cat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        gap: 12,
                        borderRadius: 12,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {cat.name}
                        {cat.nameEn && <span style={{ color: '#6b7280', marginLeft: 6, fontWeight: 500, fontSize: 13 }}>({cat.nameEn})</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => { setEditingCategoryId(cat.id); setCategoryForm({ name: cat.name, nameEn: cat.nameEn ?? '' }) }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            color: MAIN,
                            cursor: 'pointer',
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategoryById(cat.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
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
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
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
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            {value}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>{unit}</span>
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
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
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
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.45 }}>
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
