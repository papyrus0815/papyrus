/**
 * 국가 상세 화면의 「정부·행정」 블록.
 * 사건 페이지 디자인 시스템을 참조한 플랫 원장형 서브탭 네비게이션(정체·헌정 · 행정부·내각 · 중앙부처·국가기관 · 통계·연혁)과
 * 전역 직능 분류 사전 모달(`GovernmentCategoryModal`), 고유 관직 사이드 패널을 포함한다.
 */
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  GOVERNMENT_TAB_ORDER,
  type GovernmentContentTab,
} from '@/features/government-info/model/government-content-tab'
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

  /*
   * URL → 구역 동기화. 머리 탭의 2차 메뉴(country-tab-submenu)가 ?sub=만 바꿔 같은 지면 안에서 구역을 옮기므로
   * 처음 한 번만 읽던 contentTab이 URL을 따라오게 한다. sub가 없으면 기본 구역(행정부·내각).
   */
  useEffect(() => {
    if (departmentIdQuery) return
    /*
     * sub가 없으면 이 지면의 기본 구역 — 라우트가 정한 initialContentTab(예: /government/system)이 있으면 그것,
     * 없으면 행정부·내각. 과거 국가 지면은 늘 initialContentTab='cabinets'를 넘기므로, 예전처럼 'initialContentTab이
     * 있으면 무시'하면 머리 메뉴에서 '행정부·내각'(sub 없음)을 골라도 부처 구역에 그대로 머물렀다.
     */
    const routeDefault: GovernmentContentTab =
      initialContentTab && initialContentTab !== 'military' && initialContentTab !== 'positions'
        ? initialContentTab
        : 'cabinets'
    const fromUrl: GovernmentContentTab | null =
      validSubQuery ?? (rawSubQuery === '' ? routeDefault : null)
    if (fromUrl && fromUrl !== contentTab) {
      /* 머리 메뉴로 고른 것도 손으로 고른 것 — 빈 구역 자동 넘김이 되돌리지 않게, 부처 필터 맥락은 비운다 */
      userManuallyPickedTabRef.current = true
      setPositionFilterContext(null)
      setContentTab(fromUrl)
    }
    // contentTab은 일부러 빼둔다 — 지면 안 전환(switchSubTab)이 URL보다 먼저 state를 바꾸는 순간 되돌리지 않게
  }, [rawSubQuery, validSubQuery, departmentIdQuery, initialContentTab])

  /*
   * 머리 탭 '정부·행정 ▾' 메뉴의 도구 칸이 여는 것 — ?tool=positions(고유 관직·직제 사전) · ?tool=categories(직능 분류).
   * 한 번 열고 쿼리는 지운다. sub는 건드리지 않아 보던 구역에 그대로 머문다.
   */
  const toolQuery = searchParams.get('tool')
  useEffect(() => {
    if (toolQuery !== 'positions' && toolQuery !== 'categories') return
    if (toolQuery === 'positions') {
      setPositionFilterContext(null)
      setPositionsDrawerOpen(true)
    } else {
      setCategoryModalOpen(true)
    }
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('tool')
        return next
      },
      { replace: true },
    )
  }, [toolQuery, setSearchParams])

  const switchSubTab = useCallback(
    (
      nextTab: GovernmentContentTab,
      extra?: {
        cabinetId?: string | null
        departmentId?: string | null
        regimeId?: string | null
        createCabinet?: boolean
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
      if (extra?.createCabinet) {
        nextParams.set('createCabinet', '1')
      } else {
        nextParams.delete('createCabinet')
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

  const visibleCabinetCount = useMemo(() => {
    if (!cabinetsCountQuery.data) return undefined
    const totalLen = cabinetsCountQuery.data.length
    const nonCeremonialLen = cabinetsCountQuery.data.filter(
      (cabItem) =>
        !shouldHideCabinetFromExecutiveTimeline(cabItem.headTenure, cabItem),
    ).length
    return nonCeremonialLen > 0 ? nonCeremonialLen : totalLen
  }, [cabinetsCountQuery.data])

  /*
   * 군주 재위 수 — 행정부·내각은 내각 없는 재위도 군주 행으로 그린다. 내각 0건이어도 군주가 있으면
   * 이 지면이 비어 있지 않다(러시아 차르국). 행정부 구역과 같은 키라 한 번만 받는다.
   */
  const countryTenuresQuery = useQuery({
    queryKey: [
      'tenures-by-country-for-cabinet',
      isHistorical ? undefined : effectiveCountryId,
      isHistorical ? effectiveCountryId : undefined,
      isHistorical ? 'with-constituents' : 'direct',
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: isHistorical ? undefined : effectiveCountryId,
        historicalCountryId: isHistorical ? effectiveCountryId : undefined,
        includeConstituents: isHistorical || undefined,
      }),
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })
  const hasMonarchReigns = useMemo(
    () =>
      (countryTenuresQuery.data as Array<{ isMonarchical?: boolean }> | undefined)?.some(
        (tenure) => tenure.isMonarchical === true,
      ) ?? false,
    [countryTenuresQuery.data],
  )

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
      !departmentsQuery.isFetched ||
      !countryTenuresQuery.isFetched
    ) {
      return
    }
    autoFallbackScopeRef.current = effectiveCountryId
    if ((visibleCabinetCount ?? 0) > 0 || hasMonarchReigns) return
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
    countryTenuresQuery.isFetched,
    hasMonarchReigns,
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
        {/*
          구역 제목 줄(「행정부·내각 19 … ⋯」)은 뺐다 — 자리만 차지했다. 지금 구역은 머리 탭 '정부·행정 ▾' 메뉴의 ✓가,
          ⋯에 있던 도구(관직 사전·직능 분류·전 국가 허브)는 같은 메뉴 아래칸이 맡는다(?tool= → 아래 효과).
        */}
        {contentTab === 'system' && (
          <GovContentStage aria-label="정체·헌정">
            <PoliticalSystemTab
              countryId={isHistorical ? undefined : effectiveCountryId}
              historicalCountryId={isHistorical ? country?.id : undefined}
              countryName={country?.name}
              onOpenCabinetsByRegime={(targetRegimeId) =>
                switchSubTab('cabinets', { regimeId: targetRegimeId })
              }
              onRegisterCabinetForRegime={(targetRegimeId) =>
                switchSubTab('cabinets', {
                  regimeId: targetRegimeId,
                  createCabinet: true,
                })
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 14,
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.28)',
              fontSize: 12,
            }}
          >
            <span>
              전 국가 보편 직책·국가별 스코프·역대 재임자·중복 직책 통합은 전용
              관리 지면에서 한눈에 다룰 수 있습니다.
            </span>
            <button
              type="button"
              onClick={() => {
                setPositionsDrawerOpen(false)
                navigate(
                  pathKeys.government.positions({
                    polity: country?.id
                      ? `${country.type === 'historical' ? 'h' : 'm'}:${country.id}`
                      : undefined,
                  }),
                )
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
                color: 'inherit',
              }}
            >
              관직·직책 정본 관리 페이지 열기 ↗
            </button>
          </div>
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
