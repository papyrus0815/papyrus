import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiExternalLink, FiPlus } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  fetchCountryScopedMilitaryUnits,
  militaryUnitQueryKeys,
} from '@/entities/military-unit'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { GovernmentMilitaryTab } from '@/features/government-info/ui/government-military-tab.widget'
import { EVENTS_LIMIT_ALL, getAllEvents } from '@/shared/api/events'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { SectionSubNav } from '@/shared/ui/section-sub-nav/section-sub-nav'

import {
  countryTabCanvasPadding,
  LedgerPrimaryButton,
} from './country-ledger-primitives'
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

  const openUnitDetailPage = useCallback(
    (targetUnitId: string, replace = false) => {
      navigate(pathKeys.militaryUnitDetail(targetUnitId), {
        replace,
        state: {
          fromCountry: {
            id: country.id,
            name: country.name,
          },
        },
      })
    },
    [navigate, country.id, country.name],
  )

  useEffect(() => {
    if (unitIdQuery) {
      openUnitDetailPage(unitIdQuery, true)
    }
  }, [unitIdQuery, openUnitDetailPage])

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
    const units = unitsSummaryQuery.data ?? []
    const milEvents = militaryEventsSummaryQuery.data ?? []
    return {
      totalUnits: units.length,
      totalMilitaryEvents: milEvents.length,
    }
  }, [unitsSummaryQuery.data, militaryEventsSummaryQuery.data])

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
        <SectionSubNav<MilitarySubTab>
          ariaLabel="군사 하위 지면"
          tabs={[
            {
              key: 'units',
              label: '편제 · 사령부',
              count: headlineStats.totalUnits,
            },
            {
              key: 'wars',
              label: '전쟁 · 참전사',
              count: headlineStats.totalMilitaryEvents,
            },
          ]}
          activeTab={subQuery}
          onTabChange={handleSubTabChange}
          actions={
            <>
              {subQuery === 'wars' ? (
                <LedgerPrimaryButton
                  type="button"
                  onClick={() => navigate(pathKeys.events.create())}
                >
                  <FiPlus size={14} /> 군사 사건 등록
                </LedgerPrimaryButton>
              ) : (
                <LedgerPrimaryButton
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
                </LedgerPrimaryButton>
              )}

              <PopoverMenu
                ariaLabel="군사 화면 설정 및 이동 메뉴"
                title="군사 사건 등록 · 군사 총람 이동"
                items={[
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
            </>
          }
        />

        {subQuery === 'wars' ? (
          <CountryMilitaryWarsPanel
            country={country}
            linkedHistoricalCountryIds={relatedHistoricalIds}
            units={unitsSummaryQuery.data ?? []}
            onSelectUnit={(targetUnitId) => openUnitDetailPage(targetUnitId)}
          />
        ) : (
          <GovernmentMilitaryTab
            country={country}
            effectiveCountryId={country.id}
            hidePrimaryCta
            onOpenUnitDetail={(targetUnitId) => openUnitDetailPage(targetUnitId)}
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


