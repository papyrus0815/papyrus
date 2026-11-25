/**
 * 국가 상세 화면의 「정부·행정」 블록.
 * 사건 페이지 디자인 시스템을 참조한 플랫 원장형 서브탭 네비게이션(정체·헌정 · 행정부·내각 · 중앙부처·국가기관 · 통계·연혁)과
 * 전역 직능 분류 사전 모달(`GovernmentCategoryModal`), 고유 관직 사이드 패널을 포함한다.
 */
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiAward, FiGlobe, FiGrid } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import { countCountryScopedPositions } from '@/features/government-info/model/count-country-scoped-positions'
import {
  GOVERNMENT_TAB_ORDER,
  GOV_TAB_META,
  type GovernmentContentTab,
} from '@/features/government-info/model/government-content-tab'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { GovMorePopover } from '@/features/government-info/ui/gov-more-popover'
import { GovSectionSwitcher } from '@/features/government-info/ui/gov-section-switcher'
import {
  GovLedgerPage,
} from '@/features/government-info/ui/government-ledger.styles'
import { GovernmentStatisticsTab } from '@/features/government-info/ui/government-statistics-tab.widget'
import { MinistriesTabSection } from '@/features/government-info/ui/ministries-tab-section.widget'
import { PoliticalSystemTab } from '@/features/government-info/ui/political-system-tab.widget'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { personCareerApi } from '@/shared/api/person-career'
import { shouldHideCabinetFromExecutiveTimeline } from '@/shared/lib/ministry-department/department-cabinet-matcher'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { SidePanel } from '@/shared/ui/side-panel'

import { CabinetsSection } from './cabinets-section.widget'
import { GovernmentCategoryModal } from './government-category-modal.widget'
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
            : 'cabinets'),
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
  const [focusDepartmentId, setFocusDepartmentId] = useState<string | null>(
    departmentIdQuery || null,
  )
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const userManuallyPickedTabRef = useRef(false)
  const autoFallbackScopeRef = useRef<string | null>(null)

  useEffect(() => {
    userManuallyPickedTabRef.current = false
  }, [effectiveCountryId])

  const switchSubTab = useCallback(
    (
      nextTab: GovernmentContentTab,
      extra?: {
        cabinetId?: string | null
        departmentId?: string | null
        regimeId?: string | null
      },
    ) => {
      userManuallyPickedTabRef.current = true
      setContentTab(nextTab)
      const nextParams = new URLSearchParams(searchParams)
      if (nextTab === 'cabinets' && !initialContentTab) {
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
      if (extra?.regimeId) {
        nextParams.set('regimeId', extra.regimeId)
      } else {
        nextParams.delete('regimeId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [initialContentTab, searchParams, setSearchParams],
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

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical ? effectiveCountryId : undefined,
  )

  const positionsCountQuery = useQuery({
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}),
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })

  const dedicatedPositionCount = useMemo(
    () =>
      countCountryScopedPositions(
        positionsCountQuery.data ?? [],
        country,
        constituentPolities,
      ),
    [positionsCountQuery.data, country, constituentPolities],
  )

  const visibleCabinetCount = useMemo(() => {
    if (!cabinetsCountQuery.data) return undefined
    const totalLen = cabinetsCountQuery.data.length
    const nonCeremonialLen = cabinetsCountQuery.data.filter(
      (cabItem) =>
        !shouldHideCabinetFromExecutiveTimeline(cabItem.headTenure, cabItem),
    ).length
    return nonCeremonialLen > 0 ? nonCeremonialLen : totalLen
  }, [cabinetsCountQuery.data])

  const tabCountByKey: Partial<Record<GovernmentContentTab, number>> = {
    system: politicalSystemsQuery.data?.length,
    cabinets: visibleCabinetCount,
    ministries: departmentsQuery.data?.length,
  }

  // URL에 서브탭이 명시되지 않았고 「행정부·내각」이 비어 있는 국가는 데이터가 있는 탭(중앙부처 → 정체·헌정)으로 스마트 폴백
  useEffect(() => {
    if (!effectiveCountryId) return
    if (autoFallbackScopeRef.current === effectiveCountryId) return
    if (
      userManuallyPickedTabRef.current ||
      rawSubQuery ||
      cabinetIdQuery ||
      departmentIdQuery ||
      unitIdQuery ||
      initialContentTab
    ) {
      autoFallbackScopeRef.current = effectiveCountryId
      return
    }
    if (
      !politicalSystemsQuery.isFetched ||
      !cabinetsCountQuery.isFetched ||
      !departmentsQuery.isFetched
    ) {
      return
    }
    autoFallbackScopeRef.current = effectiveCountryId
    if ((visibleCabinetCount ?? 0) > 0) return
    if ((departmentsQuery.data?.length ?? 0) > 0) {
      setContentTab('ministries')
    } else if ((politicalSystemsQuery.data?.length ?? 0) > 0) {
      setContentTab('system')
    }
  }, [
    effectiveCountryId,
    rawSubQuery,
    cabinetIdQuery,
    departmentIdQuery,
    unitIdQuery,
    initialContentTab,
    politicalSystemsQuery.isFetched,
    politicalSystemsQuery.data,
    cabinetsCountQuery.isFetched,
    visibleCabinetCount,
    departmentsQuery.isFetched,
    departmentsQuery.data,
  ])

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
        {/* 구역 제목 겸 전환 메뉴 — 예전 알약 하위 탭 줄이 국가 탭 아래 또 한 겹 띠를 깔아 지면이 좁아 보였다 */}
        <GovSectionSwitcher<GovernmentContentTab>
          ariaLabel="정부·행정 구역 바꾸기"
          items={GOVERNMENT_TAB_ORDER.map((tabKey) => ({
            key: tabKey,
            label: GOV_TAB_META[tabKey].label,
            hint: GOV_TAB_META[tabKey].hint,
            count:
              typeof tabCountByKey[tabKey] === 'number' && (tabCountByKey[tabKey] ?? 0) > 0
                ? tabCountByKey[tabKey]
                : null,
          }))}
          activeKey={contentTab}
          onChange={(tabKey) => {
            setPositionFilterContext(null)
            switchSubTab(tabKey)
          }}
          actions={
            <>
            {/* 행정부 상세에선 바로 아래 줄에 그 행정부의 ⋯가 있어 ⋯ 두 개가 34px 간격으로 겹쳐 보였다 — 상세 동안 숨김 */}
            {effectiveCountryId && !(contentTab === 'cabinets' && cabinetIdQuery) ? (
          <GovMorePopover
            ariaLabel="정부·행정 도구 및 사전 메뉴"
            title="관직 사전 · 직능 분류 · 전 국가 허브"
            triggerSize="sm"
            hasActiveIndicator={positionsDrawerOpen || categoryModalOpen}
            actions={[
              {
                key: 'country-positions',
                label: '고유 관직 · 직제 사전',
                icon: <FiAward size={14} />,
                badge:
                  dedicatedPositionCount > 0
                    ? String(dedicatedPositionCount)
                    : undefined,
                active: positionsDrawerOpen,
                onClick: () => {
                  setPositionFilterContext(null)
                  setPositionsDrawerOpen(true)
                },
              },
              {
                key: 'global-categories',
                label: '전역 직능 분류 관리',
                icon: <FiGrid size={14} />,
                onClick: () => openCategoryModal(),
              },
              {
                key: 'global-hub',
                label: '전 국가 정부·내각 허브 ↗',
                icon: <FiGlobe size={14} />,
                onClick: () =>
                  navigate(
                    pathKeys.government.list({
                      tab:
                        contentTab === 'ministries'
                          ? 'departments'
                          : 'cabinets',
                    }),
                    { state: { skipGovernmentMemoryRestore: true } },
                  ),
              },
            ]}
          />
            ) : null}
            </>
          }
        />

        {contentTab === 'system' && (
          <GovContentStage aria-label="정체·헌정">
            <PoliticalSystemTab
              countryId={isHistorical ? undefined : effectiveCountryId}
              historicalCountryId={isHistorical ? country?.id : undefined}
              countryName={country?.name}
              onOpenCabinetsByRegime={(targetRegimeId) =>
                switchSubTab('cabinets', { regimeId: targetRegimeId })
              }
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
              onInspectMilitaryUnit={(unitId) => {
                if (effectiveCountryId) {
                  navigate(pathKeys.countryMilitary(effectiveCountryId, unitId))
                }
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
              hasAnyPoliticalSystem={(politicalSystemsQuery.data?.length ?? 0) > 0}
              hasAnyDepartment={(departmentsQuery.data?.length ?? 0) > 0}
              onOpenPoliticalSystemTab={() => switchSubTab('system')}
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
