/**
 * 국가 상세 화면의 「정부·행정」 블록.
 * 사건 페이지 디자인 시스템을 참조한 플랫 원장형 서브탭 네비게이션(정체·헌정 · 행정부·내각 · 중앙부처·국가기관 · 직위·서열 · 통계·연혁)과
 * 부처 카테고리 설정 모달(`GovernmentCategoryModal`), 국방부 등 부처 상세에서 바로 여는 군부대 등록 사이드 패널을 포함한다.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowUpRight, FiAward, FiGlobe, FiShield } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  GOVERNMENT_TAB_ORDER,
  GOV_TAB_META,
  type GovernmentContentTab,
} from '@/features/government-info/model/government-content-tab'
import {
  GovLedgerPage,
  GovSubNavBar,
  GovSubTabBtn,
  GovSubTabCount,
  GovSubTabList,
  GovToolbarBtn,
} from '@/features/government-info/ui/government-ledger.styles'
import { GovernmentStatisticsTab } from '@/features/government-info/ui/government-statistics-tab.widget'
import { MinistriesTabSection } from '@/features/government-info/ui/ministries-tab-section.widget'
import { PoliticalSystemTab } from '@/features/government-info/ui/political-system-tab.widget'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { personCareerApi } from '@/shared/api/person-career'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { SidePanel } from '@/shared/ui/side-panel'

import { CabinetsSection } from './cabinets-section.widget'
import { GovernmentCategoryModal } from './government-category-modal.widget'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const cabinetIdQuery = searchParams.get('cabinetId')?.trim() || ''
  const unitIdQuery = searchParams.get('unitId')?.trim() || ''
  const departmentIdQuery = searchParams.get('departmentId')?.trim() || ''
  const rawSubQuery = searchParams.get('sub')?.trim() || ''

  const effectiveCountryId = countryId ?? country?.id
  const isHistorical = country?.type === 'historical'
  const isDark = useThemeStore((state) => state.mode === 'dark')

  const validSubQuery = (
    GOVERNMENT_TAB_ORDER as readonly string[]
  ).includes(rawSubQuery)
    ? (rawSubQuery as GovernmentContentTab)
    : null

  const [contentTab, setContentTab] = useState<GovernmentContentTab>(
    departmentIdQuery
      ? 'ministries'
      : validSubQuery ??
          (initialContentTab &&
          initialContentTab !== 'military' &&
          initialContentTab !== 'positions'
            ? initialContentTab
            : cabinetIdQuery
              ? 'cabinets'
              : 'system'),
  )
  const [positionsDrawerOpen, setPositionsDrawerOpen] = useState<boolean>(
    rawSubQuery === 'positions' || initialContentTab === 'positions',
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
  const [militaryHistoricalDefaultId, setMilitaryHistoricalDefaultId] =
    useState<string | null>(null)
  const [focusDepartmentId, setFocusDepartmentId] = useState<string | null>(
    departmentIdQuery || null,
  )
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const switchSubTab = useCallback(
    (
      nextTab: GovernmentContentTab,
      extra?: { cabinetId?: string | null; departmentId?: string | null },
    ) => {
      setContentTab(nextTab)
      const nextParams = new URLSearchParams(searchParams)
      if (nextTab === 'system') {
        nextParams.delete('sub')
      } else {
        nextParams.set('sub', nextTab)
      }
      if (extra?.cabinetId) {
        nextParams.set('cabinetId', extra.cabinetId)
      } else {
        nextParams.delete('cabinetId')
      }
      if (extra?.departmentId) {
        nextParams.set('departmentId', extra.departmentId)
      } else {
        nextParams.delete('departmentId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const syncSelectedDepartmentParam = useCallback(
    (departmentId: string | null) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('sub', 'ministries')
      if (departmentId) {
        nextParams.set('departmentId', departmentId)
      } else {
        nextParams.delete('departmentId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // 탭 배지용 경량 공유 쿼리 (각 서브탭과 동일한 queryKey 재사용)
  const politicalSystemsQuery = usePoliticalSystems({
    countryId: isHistorical ? undefined : effectiveCountryId,
    historicalCountryId: isHistorical ? effectiveCountryId : undefined,
    includeConstituents: isHistorical || undefined,
  })

  const departmentsQuery = useQuery({
    queryKey: isHistorical
      ? administrationDepartmentsByHistoricalCountryQueryKey(
          effectiveCountryId,
          { includeConstituents: true },
        )
      : administrationDepartmentsByCountryQueryKey(effectiveCountryId),
    queryFn: () =>
      isHistorical
        ? administrationDepartmentApi.getByHistoricalCountryId(
            effectiveCountryId!,
            { includeConstituents: true },
          )
        : administrationDepartmentApi.getByCountryId(effectiveCountryId!),
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })

  const cabinetsCountQuery = useQuery({
    queryKey: [
      'cabinets-by-country',
      isHistorical ? '' : (effectiveCountryId ?? ''),
      isHistorical ? (effectiveCountryId ?? null) : null,
      ...(isHistorical ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: isHistorical ? undefined : effectiveCountryId,
        historicalCountryId: isHistorical ? effectiveCountryId : undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })

  const positionsCountQuery = useQuery({
    queryKey: [
      'position-definitions-stats',
      isHistorical ? '' : (effectiveCountryId ?? ''),
      isHistorical ? (effectiveCountryId ?? null) : null,
      ...(isHistorical ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: isHistorical ? undefined : effectiveCountryId,
        historicalCountryId: isHistorical ? effectiveCountryId : undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })

  const dedicatedPositionCount = useMemo(() => {
    const defs = positionsCountQuery.data ?? []
    return defs.filter((defItem) => {
      const scopes = (defItem as { scopes?: unknown[] }).scopes ?? []
      return (
        scopes.length > 0 ||
        Boolean(defItem.administrationDepartmentId) ||
        Boolean(defItem.organizationId)
      )
    }).length
  }, [positionsCountQuery.data])

  const tabCountByKey: Partial<Record<GovernmentContentTab, number>> = {
    system: politicalSystemsQuery.data?.length,
    cabinets: cabinetsCountQuery.data?.length,
    ministries: departmentsQuery.data?.length,
  }

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
    if (rawSubQuery === 'positions') {
      setPositionsDrawerOpen(true)
      const cleanedParams = new URLSearchParams(searchParams)
      cleanedParams.delete('sub')
      setSearchParams(cleanedParams, { replace: true })
      return
    }
    if (departmentIdQuery) {
      setContentTab('ministries')
      setFocusDepartmentId(departmentIdQuery)
      return
    }
    if (validSubQuery != null) {
      setContentTab(validSubQuery)
    } else if (
      initialContentTab != null &&
      initialContentTab !== 'military' &&
      initialContentTab !== 'positions'
    ) {
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
    searchParams,
    setSearchParams,
  ])

  const closeCategoryModal = () => setCategoryModalOpen(false)
  const openCategoryModal = () => setCategoryModalOpen(true)

  return (
    <>
      <GovLedgerPage>
        <GovSubNavBar>
          <GovSubTabList role="tablist" aria-label="정부·행정 하위 메뉴">
            {GOVERNMENT_TAB_ORDER.map((tabKey) => {
              const isActive = contentTab === tabKey
              const countVal = tabCountByKey[tabKey]
              return (
                <GovSubTabBtn
                  key={tabKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  $active={isActive}
                  onClick={() => {
                    setPositionFilterContext(null)
                    switchSubTab(tabKey)
                  }}
                  title={GOV_TAB_META[tabKey].hint}
                >
                  <span>{GOV_TAB_META[tabKey].label}</span>
                  {typeof countVal === 'number' && countVal > 0 ? (
                    <GovSubTabCount $active={isActive}>
                      {countVal}
                    </GovSubTabCount>
                  ) : null}
                </GovSubTabBtn>
              )
            })}
          </GovSubTabList>

          {effectiveCountryId ? (
            <GovSubNavActions>
              <GovToolbarBtn
                type="button"
                $active={positionsDrawerOpen}
                onClick={() => {
                  setPositionFilterContext(null)
                  setPositionsDrawerOpen(true)
                }}
                title="이 국가의 고유 관직·직제 및 부처 소속 직위 사전을 엽니다"
              >
                <FiAward size={13} />
                <span>
                  고유 관직
                  {dedicatedPositionCount > 0
                    ? ` (${dedicatedPositionCount})`
                    : ''}
                </span>
              </GovToolbarBtn>

              <GovToolbarBtn
                type="button"
                onClick={() =>
                  navigate(
                    pathKeys.government.list({
                      tab:
                        contentTab === 'ministries'
                          ? 'departments'
                          : 'cabinets',
                    }),
                    { state: { skipGovernmentMemoryRestore: true } },
                  )
                }
                title="전 국가 행정부·내각 및 중앙부처 비교 카탈로그로 이동"
              >
                <FiGlobe size={13} />
                <span>전 국가 정부·내각 허브</span>
                <FiArrowUpRight size={12.5} />
              </GovToolbarBtn>

              <GovToolbarBtn
                type="button"
                onClick={() =>
                  navigate(pathKeys.countryMilitary(effectiveCountryId))
                }
                title="군 최고사령부·야전군·사단 편제 탭으로 이동"
              >
                <FiShield size={13} />
                <span>군사 사령부·편제</span>
                <FiArrowUpRight size={12.5} />
              </GovToolbarBtn>
            </GovSubNavActions>
          ) : null}
        </GovSubNavBar>

        {contentTab === 'system' && (
          <GovContentStage aria-label="정체·헌정">
            <PoliticalSystemTab
              countryId={isHistorical ? undefined : effectiveCountryId}
              historicalCountryId={isHistorical ? country?.id : undefined}
              countryName={country?.name}
            />
          </GovContentStage>
        )}

        {contentTab === 'statistics' && (
          <GovContentStage aria-label="통계·연혁">
            <GovernmentStatisticsTab
              country={country}
              effectiveCountryId={effectiveCountryId}
              onSelectTab={(nextTab) => {
                setPositionFilterContext(null)
                if (nextTab === 'positions') {
                  setPositionsDrawerOpen(true)
                  return
                }
                switchSubTab(nextTab)
              }}
              onSelectCategory={(targetCategoryId) => {
                setCabinetMinistryIntent({ categoryId: targetCategoryId })
                switchSubTab('ministries')
              }}
              onSelectDepartment={(targetDepartmentId) => {
                setFocusDepartmentId(targetDepartmentId)
                switchSubTab('ministries', {
                  departmentId: targetDepartmentId,
                })
              }}
              onSelectCabinet={(targetCabinetId) => {
                switchSubTab('cabinets', { cabinetId: targetCabinetId })
              }}
              onOpenMilitaryTab={
                effectiveCountryId
                  ? () => navigate(pathKeys.countryMilitary(effectiveCountryId))
                  : undefined
              }
            />
          </GovContentStage>
        )}

        {contentTab === 'ministries' && (
          <GovContentStage
            aria-label="중앙부처·국가기관"
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
              countryName={country?.name}
              isHistorical={isHistorical}
              isDark={isDark}
              cabinetOpenMinistryIntent={cabinetMinistryIntent}
              onConsumedCabinetOpenMinistryIntent={() =>
                setCabinetMinistryIntent(null)
              }
              focusDepartmentId={focusDepartmentId}
              onConsumedFocusDepartment={() => setFocusDepartmentId(null)}
              onSelectedDepartmentChange={syncSelectedDepartmentParam}
              onNavigateToPositions={(ctx) => {
                setPositionFilterContext(ctx ?? null)
                setPositionsDrawerOpen(true)
              }}
              onRegisterMilitaryUnit={(departmentId, historicalCountryId) => {
                setMilitaryDeptDefaultId(departmentId)
                setMilitaryHistoricalDefaultId(historicalCountryId ?? null)
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
                setMilitaryHistoricalDefaultId(null)
                setMilitaryUnitModalOpen(true)
              }}
              onOpenMilitaryTab={() => {
                if (effectiveCountryId) {
                  navigate(pathKeys.countryMilitary(effectiveCountryId))
                }
              }}
              onSelectCabinet={(targetCabinetId) => {
                switchSubTab('cabinets', { cabinetId: targetCabinetId })
              }}
              openCategoryModal={openCategoryModal}
            />
          </GovContentStage>
        )}

        {contentTab === 'cabinets' && country && (
          <GovContentStage
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
                setCabinetMinistryIntent({
                  categoryId: categoryId ?? '',
                })
                switchSubTab('ministries')
              }}
              onOpenDepartmentDetail={(departmentId) => {
                setFocusDepartmentId(departmentId)
                switchSubTab('ministries', { departmentId })
              }}
            />
          </GovContentStage>
        )}
      </GovLedgerPage>

      <SidePanel
        isOpen={positionsDrawerOpen}
        onClose={() => {
          setPositionsDrawerOpen(false)
          setPositionFilterContext(null)
        }}
        title={`${country?.name ?? '국가'} 고유 관직 · 직제 사전`}
        subtitle="이 국가 전용 관직(예: 영의정·집정관·총통 등) 및 소속 부처 직위를 관리합니다"
        width="min(940px, 100vw)"
      >
        <div style={{ padding: '20px 24px 36px' }}>
          <PositionDefinitionsSection
            country={country}
            defaultScopeFilter="country_only"
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
            onOpenDepartmentDetail={(targetDepartmentId) => {
              setPositionsDrawerOpen(false)
              setFocusDepartmentId(targetDepartmentId)
              switchSubTab('ministries', {
                departmentId: targetDepartmentId,
              })
            }}
          />
        </div>
      </SidePanel>

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
          setMilitaryHistoricalDefaultId(null)
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: isHistorical
              ? administrationDepartmentsByHistoricalCountryQueryKey(
                  effectiveCountryId,
                )
              : administrationDepartmentsByCountryQueryKey(effectiveCountryId),
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-units'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-unit'],
          })
        }}
        defaultCountryId={isHistorical ? null : (effectiveCountryId ?? null)}
        defaultHistoricalCountryId={
          isHistorical
            ? (effectiveCountryId ?? null)
            : militaryHistoricalDefaultId
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

const GovSubNavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  flex-shrink: 0;
`

const GovContentStage = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
`
