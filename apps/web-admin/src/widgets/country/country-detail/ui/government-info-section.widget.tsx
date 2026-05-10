/**
 * 국가 상세 화면의 「행정조직」 블록.
 * 상단 탭(역대 수반 · 행정부 · 중앙부처 · 행정기구 · 직위 정의 · 통계) 전환,
 * 부처 카테고리 설정 모달(`GovernmentCategoryModal`), 중앙부처 탭에서 열리는 군부대 등록 모달을 포함한다.
 */
import { useEffect, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { motion } from 'framer-motion'

import {
  GOVERNMENT_TAB_ORDER,
  GOV_TAB_META,
  type GovernmentContentTab,
} from '@/features/government-info/model/government-content-tab'
import { GovernmentOrganizationsTab } from '@/features/government-info/ui/government-organizations-tab.widget'
import { GovernmentStatisticsTab } from '@/features/government-info/ui/government-statistics-tab.widget'
import { MinistriesTabSection } from '@/features/government-info/ui/ministries-tab-section.widget'
import { administrationDepartmentsByCountryQueryKey } from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { useThemeStore } from '@/shared/styles/theme.store'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import { CabinetsSection } from './cabinets-section.widget'
import { GovernmentCategoryModal } from './government-category-modal.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { MilitaryUnitFormModal } from './military-unit-form.modal'
import { PositionDefinitionsSection } from './position-definitions-section.widget'

export type { GovernmentContentTab }

export interface GovernmentInfoSectionProps {
  /** 국가(현대/역사) — 행정부 탭에서 사용 */
  country?: import('@/entities/country/model/unified-types').UnifiedCountry
  /** 국가 ID (있으면 중앙부처 탭에서 API 연동 CRUD) */
  countryId?: string
  /** 부모가 바꿀 때마다 행정조직 서브탭을 이 값으로 맞춤(예: URL·딥링크). `undefined`면 탭 상태를 덮어쓰지 않음 */
  initialContentTab?: GovernmentContentTab
}

export function GovernmentInfoSection({
  country,
  countryId,
  initialContentTab,
}: GovernmentInfoSectionProps) {
  const queryClient = useQueryClient()
  const [contentTab, setContentTab] = useState<GovernmentContentTab>(
    initialContentTab ?? 'heads',
  )
  const effectiveCountryId = countryId ?? country?.id
  const isDark = useThemeStore((state) => state.mode === 'dark')

  useEffect(() => {
    if (initialContentTab != null) {
      setContentTab(initialContentTab)
    }
  }, [initialContentTab])

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

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const closeCategoryModal = () => setCategoryModalOpen(false)
  const openCategoryModal = () => setCategoryModalOpen(true)

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
          variant="plain"
          title="행정조직"
          description="역대 수반, 행정부, 중앙부처, 행정기구, 직위 정의, 통계를 관리합니다."
          rightSlot={
            <AddButton
              type="button"
              onClick={openCategoryModal}
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
          }
        />

        {/* 신규 탭 UI(UnderlineTab*) — MapRegion*과 별도. 상위 flex 열에서 세로로 눌리지 않게 */}
        <div style={{ flexShrink: 0, width: '100%', minWidth: 0 }}>
          <UnderlineTabNav
            role="tablist"
            aria-label="행정조직 하위 메뉴"
            style={{ marginBottom: 0 }}
          >
            {GOVERNMENT_TAB_ORDER.map((tabKey) => (
              <UnderlineTabButton
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={contentTab === tabKey}
                $active={contentTab === tabKey}
                onClick={() => setContentTab(tabKey)}
                title={GOV_TAB_META[tabKey].hint}
              >
                {GOV_TAB_META[tabKey].label}
              </UnderlineTabButton>
            ))}
          </UnderlineTabNav>
        </div>

        {contentTab === 'heads' && country && (
          <section aria-label="역대 수반">
            <HeadsOfStateSection country={country} embedded />
          </section>
        )}

        {contentTab === 'statistics' && <GovernmentStatisticsTab />}

        {contentTab === 'ministries' && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
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
          </div>
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
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <GovernmentOrganizationsTab
              country={country}
              effectiveCountryId={effectiveCountryId}
            />
          </div>
        )}
      </motion.div>

      <GovernmentCategoryModal
        open={categoryModalOpen}
        onClose={closeCategoryModal}
      />

      <MilitaryUnitFormModal
        isOpen={militaryUnitModalOpen}
        onClose={() => {
          setMilitaryUnitModalOpen(false)
          setMilitaryUnitEditingId(null)
          setMilitaryDeptDefaultId(null)
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey:
              administrationDepartmentsByCountryQueryKey(effectiveCountryId),
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
