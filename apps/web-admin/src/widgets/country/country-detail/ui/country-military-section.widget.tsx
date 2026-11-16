import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { GovLedgerPage } from '@/features/government-info/ui/government-ledger.styles'
import { GovernmentMilitaryTab } from '@/features/government-info/ui/government-military-tab.widget'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'

import { MilitaryUnitFormModal } from './military-unit-form.modal'

export interface CountryMilitarySectionProps {
  country: UnifiedCountry
}

export function CountryMilitarySection({
  country,
}: CountryMilitarySectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const unitIdQuery = searchParams.get('unitId')?.trim() || ''

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

  useEffect(() => {
    if (unitIdQuery) {
      setFocusMilitaryUnitId(unitIdQuery)
    }
  }, [unitIdQuery])

  const syncSelectedUnitParam = useCallback(
    (unitId: string | null) => {
      const nextParams = new URLSearchParams(searchParams)
      if (unitId) {
        nextParams.set('unitId', unitId)
      } else {
        nextParams.delete('unitId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return (
    <>
      <GovLedgerPage aria-label="군사 사령부 및 편제">
        <GovernmentMilitaryTab
          country={country}
          effectiveCountryId={country.id}
          focusUnitId={focusMilitaryUnitId}
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
                (country.type === 'historical' ? country.id : null),
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
      </GovLedgerPage>

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
            queryKey:
              country.type === 'historical'
                ? administrationDepartmentsByHistoricalCountryQueryKey(
                    country.id,
                  )
                : administrationDepartmentsByCountryQueryKey(country.id),
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-units'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-unit'],
          })
        }}
        defaultCountryId={
          country.type === 'historical'
            ? (country.modernCountries?.[0]?.id ?? null)
            : country.id
        }
        defaultHistoricalCountryId={
          country.type === 'historical'
            ? country.id
            : (militaryHistCountryDefaultId ?? null)
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
