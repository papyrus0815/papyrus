import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiBarChart2, FiExternalLink, FiPlus } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import {
  fetchCountryScopedMilitaryUnits,
  HIGH_AND_OPERATIONAL_UNIT_TYPES,
  militaryUnitQueryKeys,
} from '@/entities/military-unit'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { GovernmentMilitaryTab } from '@/features/government-info/ui/government-military-tab.widget'
import { EVENTS_LIMIT_ALL, getAllEvents } from '@/shared/api/events'
import { type MilitaryUnit } from '@/shared/api/military-unit'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { AddButton } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import * as DashboardStyles from './country-detail-dashboard.styles'
import { countryTabCanvasPadding } from './country-ledger-primitives'
import { CountryMilitaryWarsPanel } from './country-military-wars-panel'
import { MilitaryUnitFormModal } from './military-unit-form.modal'

export interface CountryMilitarySectionProps {
  country: UnifiedCountry
}

type MilitarySubTab = 'units' | 'wars'

export function CountryMilitarySection({
  country,
}: CountryMilitarySectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isHistorical = country.type === 'historical'

  const unitIdQuery = searchParams.get('unitId')?.trim() || ''
  const subQuery: MilitarySubTab =
    searchParams.get('sub') === 'wars' && !unitIdQuery ? 'wars' : 'units'

  const [focusMilitaryUnitId, setFocusMilitaryUnitId] = useState<string | null>(
    unitIdQuery || null,
  )
  const [militaryUnitModalOpen, setMilitaryUnitModalOpen] = useState(false)
  const [militaryUnitEditingId, setMilitaryUnitEditingId] = useState<
    string | null
  >(null)
  const [militaryDeptDefaultId, setMilitaryDeptDefaultId] = useState<
    string | null
  >(null)
  const [militaryParentDefaultId, setMilitaryParentDefaultId] = useState<
    string | null
  >(null)
  const [militaryHistCountryDefaultId, setMilitaryHistCountryDefaultId] =
    useState<string | null>(null)
  const [militaryBranchDefault, setMilitaryBranchDefault] = useState<
    string | null
  >(null)
  const [showHeadlineStats, setShowHeadlineStats] = useState(false)

  useEffect(() => {
    if (unitIdQuery) {
      setFocusMilitaryUnitId(unitIdQuery)
    }
  }, [unitIdQuery])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && country.id ? country.id : '',
    )

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical && country.id ? country.id : undefined,
  )

  const relatedHistoricalIds = useMemo(() => {
    const idSet = new Set<string>()
    if (isHistorical) {
      for (const item of constituentPolities) {
        if (item.id) idSet.add(item.id)
      }
    } else {
      for (const item of country.historicalCountries ?? []) {
        if (item.id) idSet.add(item.id)
      }
      for (const item of linkedHistoricalCountries) {
        if (item.id) idSet.add(item.id)
      }
    }
    return [...idSet].sort()
  }, [
    isHistorical,
    constituentPolities,
    country.historicalCountries,
    linkedHistoricalCountries,
  ])

  const relatedHistKey = relatedHistoricalIds.join(',')

  // GovernmentMilitaryTab과 동일한 캐시 키·조회 함수 사용 (현대국 N+1 중복 요청 제거)
  const unitsSummaryQuery = useQuery({
    queryKey: militaryUnitQueryKeys.countryScope(
      isHistorical ? 'hist' : 'mod',
      country.id,
      isHistorical ? relatedHistKey : '',
    ),
    queryFn: () =>
      fetchCountryScopedMilitaryUnits({
        countryId: country.id,
        isHistorical,
        relatedHistoricalIds,
      }),
    staleTime: 1000 * 60 * 2,
  })

  const militaryEventsSummaryQuery = useQuery({
    queryKey: [
      'country-military-events',
      country.type,
      country.id,
      isHistorical ? relatedHistKey : 'auto-linked',
    ],
    queryFn: async () => {
      if (isHistorical) {
        const targetIds = Array.from(
          new Set([country.id, ...relatedHistoricalIds]),
        )
        return getAllEvents({
          historicalCountryIds: targetIds,
          domain: 'MILITARY',
          includeSubEvents: true,
          limit: EVENTS_LIMIT_ALL,
        })
      }
      // 현대 국가는 백엔드 EventController.getAllEvents에서 연결된 역사국가 ID를 자동 병합함
      return getAllEvents({
        countryId: country.id,
        domain: 'MILITARY',
        includeSubEvents: true,
        limit: EVENTS_LIMIT_ALL,
      })
    },
    staleTime: 60_000,
  })

  const headlineStats = useMemo(() => {
    const units = (unitsSummaryQuery.data ?? []) as Array<
      Omit<MilitaryUnit, 'tenures' | 'commanders' | 'sideDeployedUnits'> & {
        tenures?: Array<{ id: string }>
        commanders?: Array<{ id: string; tenureId?: string | null }>
        sideDeployedUnits?: Array<{ id: string }>
      }
    >
    let highCommandAndOps = 0
    let commanderTenures = 0
    let orbatDeployments = 0

    for (const unitItem of units) {
      if (
        unitItem.unitType &&
        HIGH_AND_OPERATIONAL_UNIT_TYPES.has(unitItem.unitType)
      ) {
        highCommandAndOps += 1
      }
      const tCount = unitItem.tenures?.length ?? 0
      const legacyCount = (unitItem.commanders ?? []).filter(
        (cmdItem) => !cmdItem.tenureId,
      ).length
      commanderTenures += tCount + legacyCount
      orbatDeployments += unitItem.sideDeployedUnits?.length ?? 0
    }

    const milEvents = militaryEventsSummaryQuery.data ?? []
    const warCount = milEvents.filter((ev) => ev.type === 'WAR').length

    return {
      totalUnits: units.length,
      highCommandAndOps,
      commanderTenures,
      orbatDeployments,
      totalMilitaryEvents: milEvents.length,
      warCount,
    }
  }, [unitsSummaryQuery.data, militaryEventsSummaryQuery.data])

  const syncSelectedUnitParam = useCallback(
    (unitId: string | null) => {
      const nextParams = new URLSearchParams(searchParams)
      if (unitId) {
        nextParams.set('unitId', unitId)
        nextParams.delete('sub')
      } else {
        nextParams.delete('unitId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleSubTabChange = (nextTab: MilitarySubTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === 'wars') {
      nextParams.set('sub', 'wars')
      nextParams.delete('unitId')
    } else {
      nextParams.delete('sub')
    }
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <SectionCanvas aria-label="군사 사령부 및 전쟁사">
        <HeaderBar>
          <UnderlineTabNav aria-label="군사 하위 지면" style={{ flex: 1, borderBottom: 'none' }}>
            <UnderlineTabButton
              type="button"
              $active={subQuery === 'units'}
              onClick={() => handleSubTabChange('units')}
            >
              <span>편제 · 사령부</span>
              <UnderlineTabBadge $active={subQuery === 'units'}>
                {headlineStats.totalUnits.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
            <UnderlineTabButton
              type="button"
              $active={subQuery === 'wars'}
              onClick={() => handleSubTabChange('wars')}
            >
              <span>전쟁 · 참전사</span>
              <UnderlineTabBadge $active={subQuery === 'wars'}>
                {headlineStats.totalMilitaryEvents.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
          </UnderlineTabNav>

          <HeaderActions>
            {subQuery === 'wars' ? (
              <AddButton
                type="button"
                onClick={() => navigate(pathKeys.events.create())}
              >
                <FiPlus size={14} /> 군사 사건 등록
              </AddButton>
            ) : (
              <AddButton
                type="button"
                onClick={() => {
                  setMilitaryUnitEditingId(null)
                  setMilitaryDeptDefaultId(null)
                  setMilitaryParentDefaultId(null)
                  setMilitaryHistCountryDefaultId(
                    isHistorical ? country.id : null,
                  )
                  setMilitaryBranchDefault(null)
                  setMilitaryUnitModalOpen(true)
                }}
              >
                <FiPlus size={14} /> 사령부·부대 등록
              </AddButton>
            )}

            <PopoverMenu
              ariaLabel="군사 화면 설정 및 이동 메뉴"
              title="요약 지표 표시 · 군사 카탈로그 이동"
              active={showHeadlineStats}
              items={[
                {
                  id: 'toggle-summary',
                  label: '요약 지표 카드 표시',
                  icon: <FiBarChart2 size={13} />,
                  checked: showHeadlineStats,
                  onSelect: () => setShowHeadlineStats((prev) => !prev),
                },
                {
                  id: 'alt-create',
                  label:
                    subQuery === 'wars'
                      ? '사령부·부대 등록'
                      : '군사 사건 등록',
                  icon: <FiPlus size={13} />,
                  onSelect: () => {
                    if (subQuery === 'wars') {
                      setMilitaryUnitEditingId(null)
                      setMilitaryDeptDefaultId(null)
                      setMilitaryParentDefaultId(null)
                      setMilitaryHistCountryDefaultId(
                        isHistorical ? country.id : null,
                      )
                      setMilitaryBranchDefault(null)
                      setMilitaryUnitModalOpen(true)
                    } else {
                      navigate(pathKeys.events.create())
                    }
                  },
                },
                { type: 'divider', id: 'div-catalog' },
                {
                  id: 'open-catalog',
                  label: '전체 군사 카탈로그에서 보기',
                  icon: <FiExternalLink size={13} />,
                  onSelect: () =>
                    navigate(
                      `${pathKeys.military()}?country=${encodeURIComponent(country.name)}`,
                    ),
                },
              ]}
            />
          </HeaderActions>
        </HeaderBar>

        {showHeadlineStats ? (
          <DashboardStyles.SectionHeadlineStrip aria-label="군사 전력 요약 지표">
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                전체 사령부 · 편제
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.totalUnits === 0}
              >
                {headlineStats.totalUnits > 0 ? (
                  <>
                    {headlineStats.totalUnits.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      개
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '미등록'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                상급지휘부 · 작전제대
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.highCommandAndOps === 0}
              >
                {headlineStats.highCommandAndOps > 0 ? (
                  <>
                    {headlineStats.highCommandAndOps.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      개
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '없음'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                역대 지휘관 · 참모
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.commanderTenures === 0}
              >
                {headlineStats.commanderTenures > 0 ? (
                  <>
                    {headlineStats.commanderTenures.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      건
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '미등록'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                참전 · 관여 군사사건
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.totalMilitaryEvents === 0}
              >
                {headlineStats.totalMilitaryEvents > 0 ? (
                  <>
                    {headlineStats.totalMilitaryEvents.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      건
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '없음'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>
          </DashboardStyles.SectionHeadlineStrip>
        ) : null}

        {subQuery === 'wars' ? (
          <CountryMilitaryWarsPanel
            country={country}
            linkedHistoricalCountryIds={relatedHistoricalIds}
            units={unitsSummaryQuery.data ?? []}
            onSelectUnit={(targetUnitId) => {
              setFocusMilitaryUnitId(targetUnitId)
              syncSelectedUnitParam(targetUnitId)
            }}
          />
        ) : (
          <GovernmentMilitaryTab
            country={country}
            effectiveCountryId={country.id}
            focusUnitId={focusMilitaryUnitId}
            hidePrimaryCta
            onConsumedFocusUnit={() => setFocusMilitaryUnitId(null)}
            onSelectedUnitChange={syncSelectedUnitParam}
            onCreateUnit={(defaults) => {
              setMilitaryUnitEditingId(null)
              setMilitaryDeptDefaultId(
                defaults?.administrationDepartmentId ?? null,
              )
              setMilitaryParentDefaultId(defaults?.parentUnitId ?? null)
              setMilitaryHistCountryDefaultId(
                defaults?.historicalCountryId ??
                  (isHistorical ? country.id : null),
              )
              setMilitaryBranchDefault(defaults?.branch ?? null)
              setMilitaryUnitModalOpen(true)
            }}
            onEditUnit={(unitId) => {
              setMilitaryUnitEditingId(unitId)
              setMilitaryDeptDefaultId(null)
              setMilitaryParentDefaultId(null)
              setMilitaryHistCountryDefaultId(null)
              setMilitaryBranchDefault(null)
              setMilitaryUnitModalOpen(true)
            }}
            onNavigateToDepartment={(departmentId) => {
              navigate(
                `${pathKeys.countryGovernment(country.id)}?departmentId=${encodeURIComponent(departmentId)}`,
              )
            }}
          />
        )}
      </SectionCanvas>

      <MilitaryUnitFormModal
        isOpen={militaryUnitModalOpen}
        onClose={() => {
          setMilitaryUnitModalOpen(false)
          setMilitaryUnitEditingId(null)
          setMilitaryDeptDefaultId(null)
          setMilitaryParentDefaultId(null)
          setMilitaryHistCountryDefaultId(null)
          setMilitaryBranchDefault(null)
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: isHistorical
              ? administrationDepartmentsByHistoricalCountryQueryKey(country.id)
              : administrationDepartmentsByCountryQueryKey(country.id),
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-units'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-unit'],
          })
        }}
        defaultCountryId={isHistorical ? null : country.id}
        defaultHistoricalCountryId={
          isHistorical ? country.id : (militaryHistCountryDefaultId ?? null)
        }
        defaultAdministrationDepartmentId={militaryDeptDefaultId}
        defaultParentUnitId={militaryParentDefaultId}
        defaultBranch={militaryBranchDefault}
        editingUnitId={militaryUnitEditingId}
        lockCountryAndDepartment={
          !militaryUnitEditingId &&
          Boolean(country.id && militaryDeptDefaultId) &&
          !militaryParentDefaultId
        }
      />
    </>
  )
}

const SectionCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${countryTabCanvasPadding}
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  padding-bottom: 2px;
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`


