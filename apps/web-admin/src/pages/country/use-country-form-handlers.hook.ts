/**
 * 국가 상세 페이지의 폼 진입 핸들러를 한 곳에 모음.
 *
 * - 좌측 리스트에서 역사 국가 편집 클릭 → 모달 오픈
 * - 우측 상세에서 편집/삭제 클릭 → 현대/역사 분기
 *
 * 페이지에서는 hook이 반환하는 핸들러만 props로 내려주면 된다.
 */
import { useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

import type { Country } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { pathKeys } from '@/shared/router'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { useCountryFormModal } from '@/widgets/country/country-form/model/use-country-form-modal.hook'
import { usePinnedCountriesStore } from '@/widgets/country/country-list/model/pinned-countries.store'
import { useHistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/model/use-historical-country-form-modal.hook'

interface Args {
  /** Raw 역사 국가 응답 — 편집 시 전체 객체를 모달에 전달하기 위해 필요. */
  apiHistoricalCountries: HistoricalCountry[] | undefined
  /** 현재 상세 페이지에서 보고 있는 국가 (삭제 분기용). */
  selectedCountry: UnifiedCountry | undefined
}

export function useCountryFormHandlers({
  apiHistoricalCountries,
  selectedCountry,
}: Args) {
  const navigate = useNavigate()
  // 삭제 시 핀·최근에서 유령 id 제거 (F59)
  const removePinned = usePinnedCountriesStore((store) => store.remove)
  const removeRecent = useRecentCountriesStore((store) => store.remove)

  // 신규 등록 후 새 국가의 상세 페이지로 자동 이동
  const countryForm = useCountryFormModal({
    onSaved: (id, savedMode) => {
      if (savedMode === 'create') {
        navigate(pathKeys.countryDetail(id))
      }
    },
  })

  const historicalForm = useHistoricalCountryFormModal()

  const editHistoricalFromList = useCallback(
    (country: UnifiedCountry) => {
      const full = apiHistoricalCountries?.find((hc) => hc.id === country.id)
      if (full) historicalForm.openEdit(full as HistoricalCountry)
    },
    [apiHistoricalCountries, historicalForm],
  )

  const editFromDetail = useCallback(
    (country: UnifiedCountry) => {
      if (country.type === 'historical') {
        const full = apiHistoricalCountries?.find((hc) => hc.id === country.id)
        if (full) historicalForm.openEdit(full as HistoricalCountry)
      } else {
        countryForm.openEdit(country as Country)
      }
    },
    [apiHistoricalCountries, countryForm, historicalForm],
  )

  const deleteFromDetail = useCallback(
    async (id: string) => {
      if (selectedCountry?.type === 'historical') {
        const ok = await historicalForm.remove(id)
        if (ok) {
          removePinned(id)
          removeRecent(id)
          navigate(pathKeys.country())
        }
      } else {
        const name = selectedCountry?.name ?? '국가'
        const ok = await countryForm.remove(id, name)
        if (ok) {
          removePinned(id)
          removeRecent(id)
        }
      }
    },
    [
      selectedCountry,
      historicalForm,
      countryForm,
      navigate,
      removePinned,
      removeRecent,
    ],
  )

  return {
    countryForm,
    historicalForm,
    editHistoricalFromList,
    editFromDetail,
    deleteFromDetail,
  }
}
