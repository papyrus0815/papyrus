/**
 * 국가 상세 화면의 「정부·행정」 블록.
 * 상단 탭(정체·헌정 · 역대 수반 · 행정부·내각 · 중앙부처·국가기관 · 통계) 전환 및
 * 부처 카테고리 설정 모달(`GovernmentCategoryModal`), 국방부 등 부처 상세에서 바로 여는 군부대 등록 모달을 포함한다.
 * (군사 사령부·부대 전체 편제는 국가 최상위 「군사」 탭에서 전담한다.)
 */
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  GOVERNMENT_TAB_ORDER,
  GOV_TAB_META,
  type GovernmentContentTab,
} from '@/features/government-info/model/government-content-tab'
import { GovernmentStatisticsTab } from '@/features/government-info/ui/government-statistics-tab.widget'
import { MinistriesTabSection } from '@/features/government-info/ui/ministries-tab-section.widget'
import { PoliticalSystemTab } from '@/features/government-info/ui/political-system-tab.widget'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
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
  country?: import('@/entities/country/model/unified-types').UnifiedCountry
  countryId?: string
  initialContentTab?: GovernmentContentTab
}

export function GovernmentInfoSection({
  country,
  countryId,
  initialContentTab,
}: GovernmentInfoSectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cabinetIdQuery = searchParams.get('cabinetId')?.trim() || ''
  const unitIdQuery = searchParams.get('unitId')?.trim() || ''
  const departmentIdQuery = searchParams.get('departmentId')?.trim() || ''
  const rawSubQuery = searchParams.get('sub')?.trim() || ''

  const effectiveCountryId = countryId ?? country?.id
  const isDark = useThemeStore((state) => state.mode === 'dark')

  const validSubQuery = (
    GOVERNMENT_TAB_ORDER as readonly string[]
  ).includes(rawSubQuery)
    ? (rawSubQuery as GovernmentContentTab)
    : rawSubQuery === 'positions'
      ? ('positions' as const)
      : null

  const [contentTab, setContentTab] = useState<GovernmentContentTab>(
    departmentIdQuery
      ? 'ministries'
      : validSubQuery ??
          (initialContentTab && initialContentTab !== 'military'
            ? initialContentTab
            : cabinetIdQuery
              ? 'cabinets'
              : 'heads'),
  )

  const [cabinetMinistryIntent, setCabinetMinistryIntent] = useState<{
    categoryId: string
  } | null>(null)
  const [positionFilterContext, setPositionFilterContext] = useState<{
    departmentId?: string
    departmentName?: string
    categoryId?: string
    categoryName?: string
  } | null>(null)
  const [militaryUnitModalOpen, setMilitaryUnitModalOpen] = useState(false)
  const [militaryUnitEditingId, setMilitaryUnitEditingId] = useState<
    string | null
  >(null)
  const [militaryDeptDefaultId, setMilitaryDeptDefaultId] = useState<
    string | null
  >(null)
  const [focusDepartmentId, setFocusDepartmentId] = useState<string | null>(
    departmentIdQuery || null,
  )
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  useEffect(() => {
    if (
      effectiveCountryId &&
      (unitIdQuery ||
        rawSubQuery === 'military' ||
        initialContentTab === 'military')
    ) {
      navigate(
        pathKeys.countryMilitary(effectiveCountryId, unitIdQuery || null),
        { replace: true },
      )
      return
    }
    if (departmentIdQuery) {
      setContentTab('ministries')
      setFocusDepartmentId(departmentIdQuery)
      return
    }
    if (validSubQuery != null) {
      setContentTab(validSubQuery)
    } else if (initialContentTab != null && initialContentTab !== 'military') {
      setContentTab(initialContentTab)
    } else if (cabinetIdQuery) {
      setContentTab('cabinets')
    }
  }, [
    effectiveCountryId,
    unitIdQuery,
    rawSubQuery,
    departmentIdQuery,
    validSubQuery,
    initialContentTab,
    cabinetIdQuery,
    navigate,
  ])

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
          title="정부·행정"
          description="정체·헌정, 역대 수반(군주·원수·총리), 행정부·내각, 중앙부처·국가기관을 통합 관리합니다. (군 사령부·부대 편제는 상단 「군사」 탭에서 관리합니다.)"
          rightSlot={
            contentTab === 'ministries' ? (
              <AddButton
                type="button"
                onClick={openCategoryModal}
                aria-label="부처 카테고리 설정"
              >
                <FiSettings size={14} />
                카테고리 설정
              </AddButton>
            ) : undefined
          }
        />

        <div style={{ flexShrink: 0, width: '100%', minWidth: 0 }}>
          <UnderlineTabNav
            role="tablist"
            aria-label="정부·행정 하위 메뉴"
            style={{ marginBottom: 0 }}
          >
            {GOVERNMENT_TAB_ORDER.map((tabKey) => (
              <UnderlineTabButton
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={contentTab === tabKey}
                $active={contentTab === tabKey}
                onClick={() => {
                  setPositionFilterContext(null)
                  setContentTab(tabKey)
                }}
                title={GOV_TAB_META[tabKey].hint}
              >
                {GOV_TAB_META[tabKey].label}
              </UnderlineTabButton>
            ))}
          </UnderlineTabNav>
        </div>

        {contentTab === 'system' && (
          <section aria-label="정체·헌정">
            <PoliticalSystemTab
              countryId={
                country?.type === 'historical' ? undefined : effectiveCountryId
              }
              historicalCountryId={
                country?.type === 'historical' ? country.id : undefined
              }
              countryName={country?.name}
            />
          </section>
        )}

        {contentTab === 'heads' && country && (
          <section aria-label="역대 수반">
            <HeadsOfStateSection country={country} embedded />
          </section>
        )}

        {contentTab === 'statistics' && (
          <GovernmentStatisticsTab
            country={country}
            effectiveCountryId={effectiveCountryId}
          />
        )}

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
              isHistorical={country?.type === 'historical'}
              isDark={isDark}
              cabinetOpenMinistryIntent={cabinetMinistryIntent}
              onConsumedCabinetOpenMinistryIntent={() =>
                setCabinetMinistryIntent(null)
              }
              focusDepartmentId={focusDepartmentId}
              onConsumedFocusDepartment={() => setFocusDepartmentId(null)}
              onNavigateToPositions={(ctx) => {
                setPositionFilterContext(ctx ?? null)
                setContentTab('positions')
              }}
              onRegisterMilitaryUnit={(departmentId) => {
                setMilitaryDeptDefaultId(departmentId)
                setMilitaryUnitEditingId(null)
                setMilitaryUnitModalOpen(true)
              }}
              onInspectMilitaryUnit={(unitId) => {
                if (effectiveCountryId) {
                  navigate(pathKeys.countryMilitary(effectiveCountryId, unitId))
                }
              }}
              onEditMilitaryUnit={(unitId) => {
                setMilitaryUnitEditingId(unitId)
                setMilitaryDeptDefaultId(null)
                setMilitaryUnitModalOpen(true)
              }}
              onOpenMilitaryTab={() => {
                if (effectiveCountryId) {
                  navigate(pathKeys.countryMilitary(effectiveCountryId))
                }
              }}
              openCategoryModal={openCategoryModal}
            />
          </div>
        )}

        {contentTab === 'positions' && (
          <section aria-label="직위·서열 사전">
            <PositionDefinitionsSection
              country={country}
              fixedAdministrationDepartmentId={
                positionFilterContext?.departmentId
              }
              fixedAdministrationDepartmentName={
                positionFilterContext?.departmentName
              }
              fixedCategoryId={positionFilterContext?.categoryId}
              fixedCategoryName={positionFilterContext?.categoryName}
              onClearFixedFilter={
                positionFilterContext
                  ? () => setPositionFilterContext(null)
                  : undefined
              }
            />
          </section>
        )}

        {contentTab === 'cabinets' && country && (
          <section
            aria-label="행정부·내각"
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
              onOpenDepartmentDetail={(departmentId) => {
                setFocusDepartmentId(departmentId)
                setContentTab('ministries')
              }}
            />
          </section>
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
              country?.type === 'historical'
                ? administrationDepartmentsByHistoricalCountryQueryKey(
                    effectiveCountryId,
                  )
                : administrationDepartmentsByCountryQueryKey(
                    effectiveCountryId,
                  ),
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-units'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-unit'],
          })
        }}
        defaultCountryId={
          country?.type === 'historical'
            ? (country.modernCountries?.[0]?.id ?? null)
            : (effectiveCountryId ?? null)
        }
        defaultHistoricalCountryId={
          country?.type === 'historical' ? (effectiveCountryId ?? null) : null
        }
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
