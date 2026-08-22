/**
 * 국가 목록 사이드바의 자립 래퍼 — 지면(page)이 아니라 **레이아웃**이 렌더한다.
 *
 * 셸이 ContentLayout으로 올라가면서 사이드바가 페이지보다 오래 살아남으므로, 예전에
 * CountryDetailShell이 내려주던 것(선택 id·등록/편집 진입)을 여기서 직접 소유한다.
 *
 * 목록에서 여는 폼 모달은 상세에서 여는 것과 **별개 인스턴스**다. 닫힌 모달은 아무것도
 * 그리지 않으므로 비용이 없고, 대신 상세 쪽 핸들러(useCountryFormHandlers)와 결합이 끊겨
 * 사이드바가 페이지 생명주기에 매이지 않는다.
 *
 * 목록·역사 데이터는 CountryListStateProvider(ContentShell이 국가 지면에서만 켠다)에서
 * 가져오므로 별도 fetch가 없다.
 */
import React, { useMemo } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import type { Country } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { pathKeys } from '@/shared/router'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { useCountryFormModal } from '@/widgets/country/country-form/model/use-country-form-modal.hook'
import { useHistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/model/use-historical-country-form-modal.hook'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'

import { useCountryListState } from '../country-list-state.context'
import { CountryList } from './country-list'

/** `/country/:countryId[/...]` 에서 선택 id 추출 (목록만 보는 중이면 null) */
function selectedCountryId(pathname: string): string | null {
  const match = /^\/country\/([^/]+)/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

interface CountrySidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function CountrySidebar({
  collapsed,
  onToggleCollapse,
}: CountrySidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const selectedId = selectedCountryId(pathname)

  const { unifiedCountries, apiHistoricalCountries, continents } =
    useCountryListState()

  // 신규 등록 후 새 국가의 상세로 이동 — 목록에서 만든 것을 바로 보게 한다
  const countryForm = useCountryFormModal({
    onSaved: (id, savedMode) => {
      if (savedMode === 'create') navigate(pathKeys.countryDetail(id))
    },
  })
  const historicalForm = useHistoricalCountryFormModal()

  const editHistoricalFromList = (country: UnifiedCountry) => {
    const full = apiHistoricalCountries?.find((item) => item.id === country.id)
    if (full) historicalForm.openEdit(full as HistoricalCountry)
  }

  // 역사 폼 모달의 후보 목록 — 모달이 닫혀 있으면 계산 회피
  const modernCountriesForModal = useMemo(() => {
    if (!historicalForm.isOpen) return []
    return unifiedCountries
      .filter((country) => country.type === 'modern')
      .map((country) => ({ id: country.id, name: country.name }))
  }, [historicalForm.isOpen, unifiedCountries])

  const historicalCountriesForModal = useMemo(() => {
    if (!historicalForm.isOpen) return []
    return (apiHistoricalCountries ?? [])
      .filter((item) => item.id !== historicalForm.editing?.id)
      .map((item) => ({ id: item.id, name: item.name }))
  }, [
    historicalForm.isOpen,
    apiHistoricalCountries,
    historicalForm.editing?.id,
  ])

  return (
    <>
      <CountryList
        selectedId={selectedId}
        onSelect={(id) => navigate(pathKeys.countryDetail(id))}
        onAdd={countryForm.openCreate}
        onAddHistorical={historicalForm.openCreate}
        onEditHistorical={editHistoricalFromList}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

      <CountryFormModal
        isOpen={countryForm.isOpen}
        onClose={countryForm.close}
        mode={countryForm.mode}
        editing={countryForm.editing as Country | null}
        continents={continents}
        onSave={countryForm.save}
      />

      <HistoricalCountryFormModal
        isOpen={historicalForm.isOpen}
        onClose={historicalForm.close}
        editing={historicalForm.editingForModal}
        initialPreset={historicalForm.preset}
        modernCountries={modernCountriesForModal}
        historicalCountries={historicalCountriesForModal}
        onSave={historicalForm.save}
      />
    </>
  )
}
