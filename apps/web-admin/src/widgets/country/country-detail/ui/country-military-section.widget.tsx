import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { GovernmentMilitaryTab } from '@/features/government-info/ui/government-military-tab.widget'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'

import { MilitaryUnitFormModal } from './military-unit-form.modal'

export interface CountryMilitarySectionProps {
  country: UnifiedCountry
}

export function CountryMilitarySection({
  country,
}: CountryMilitarySectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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

  const openCreateRootUnit = () => {
    setMilitaryUnitEditingId(null)
    setMilitaryDeptDefaultId(null)
    setMilitaryParentDefaultId(null)
    setMilitaryHistCountryDefaultId(
      country.type === 'historical' ? country.id : null,
    )
    setMilitaryBranchDefault(null)
    setMilitaryUnitModalOpen(true)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
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
          title="군사"
          description="최고사령부·참모본부·각군 총사령부부터 전구·집단군·야전군·군단·사단·함대까지 지휘 계통, 개편 계보, 역대 지휘관 재임, 작전·전투 투입을 관리합니다."
          rightSlot={
            <AddButton type="button" onClick={openCreateRootUnit}>
              + 사령부·군부대 등록
            </AddButton>
          }
        />

        <section aria-label="군사 사령부 및 편제">
          <GovernmentMilitaryTab
            country={country}
            effectiveCountryId={country.id}
            focusUnitId={focusMilitaryUnitId}
            onConsumedFocusUnit={() => setFocusMilitaryUnitId(null)}
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
        </section>
      </motion.div>

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
