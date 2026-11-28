import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'

import { countryTabCanvasPadding } from './country-ledger-primitives'
import { CountryMilitaryWarsPanel } from './country-military-wars-panel'
import { CountryWarDeclarationsPanel } from './country-war-declarations-panel'
import { MilitaryUnitFormModal } from './military-unit-form.modal'

export interface CountryMilitarySectionProps {
  country: UnifiedCountry
}

type MilitarySubTab = 'units' | 'wars' | 'declarations'

export function CountryMilitarySection({
  country,
}: CountryMilitarySectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isHistorical = country.type === 'historical'

  const unitIdQuery = searchParams.get('unitId')?.trim() || ''
  const rawSub = searchParams.get('sub')
  const subQuery: MilitarySubTab = unitIdQuery
    ? 'units'
    : rawSub === 'wars'
      ? 'wars'
      : rawSub === 'declarations'
        ? 'declarations'
        : 'units'

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

  // 전쟁·참전사 탭에서만 투입 편제 역매핑용으로 조회 (편제·사령부 탭은 GovernmentMilitaryTab이 동일 캐시 키로 직접 조회)
  const unitsForWarsQuery = useQuery({
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
    enabled: subQuery === 'wars',
    staleTime: 1000 * 60 * 2,
  })

  /*
   * 구역 제목 줄(「편제 · 사령부 12 … ⋯」)은 뺐다 — 지금 어느 구역인지는 머리 탭 '군사 ▾' 2차 메뉴의 ✓가 맡고,
   * 전 국가 군사 총람 바로가기도 같은 메뉴 아래칸(tools)으로 옮겼다. 본문 최상단은 바로 탭 메뉴로 시작한다.
   */
  return (
    <>
      <SectionCanvas aria-label="군사 사령부 및 전쟁사">
        {subQuery === 'declarations' ? (
          <CountryWarDeclarationsPanel
            country={country}
            linkedHistoricalCountryIds={relatedHistoricalIds}
          />
        ) : subQuery === 'wars' ? (
          <CountryMilitaryWarsPanel
            country={country}
            linkedHistoricalCountryIds={relatedHistoricalIds}
            units={unitsForWarsQuery.data ?? []}
            onSelectUnit={(targetUnitId) => openUnitDetailPage(targetUnitId)}
          />
        ) : (
          <GovernmentMilitaryTab
            country={country}
            effectiveCountryId={country.id}
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
