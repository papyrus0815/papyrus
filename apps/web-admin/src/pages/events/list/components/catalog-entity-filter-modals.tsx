/**
 * 엔티티 필터 모달 묶음 — 카테고리 / 국가 / 직책.
 *
 * 단축키 도움말·요약 같은 portal/focus-trap이 필요한 overlay와는 책임이 달라
 * `catalog-overlay-modals`로 분리되어 있다.
 */
import React from 'react'

import { FiUsers } from 'react-icons/fi'

import { FILTER_ALL } from '@/features/event-list/lib'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { CategoryModal } from '@/widgets/event-list/ui/category-modal'
import { SimpleSelectModal } from '@/widgets/event-list/ui/simple-select-modal'

import { MOCK_POSITION_TYPES } from '../../../../entities/event/model/mock-government-positions'

interface Props {
  // 카테고리
  showCategoryModal: boolean
  setShowCategoryModal: (v: boolean) => void
  dbCategories: EventCategoryDto[]
  selectedCategory: string
  setSelectedCategory: (v: string) => void

  // 국가
  showCountryModal: boolean
  setShowCountryModal: (v: boolean) => void
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  selectedCountry: string
  setSelectedCountry: (v: string) => void

  // 직책
  showPositionTypeModal: boolean
  setShowPositionTypeModal: (v: boolean) => void
  selectedPositionType: string
  setSelectedPositionType: (v: string) => void
}

export const CatalogEntityFilterModals: React.FC<Props> = ({
  showCategoryModal,
  setShowCategoryModal,
  dbCategories,
  selectedCategory,
  setSelectedCategory,
  showCountryModal,
  setShowCountryModal,
  countries,
  historicalCountries,
  selectedCountry,
  setSelectedCountry,
  showPositionTypeModal,
  setShowPositionTypeModal,
  selectedPositionType,
  setSelectedPositionType,
}) => {
  return (
    <>
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <AdvancedCountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={(country) => {
          setSelectedCountry(
            country.id === FILTER_ALL ? FILTER_ALL : country.id,
          )
          setShowCountryModal(false)
        }}
        modernCountries={[
          { id: FILTER_ALL, name: '전체 국가', flagEmoji: '🌍' },
          ...countries,
        ]}
        historicalCountries={historicalCountries}
        title="국가 필터"
        selectedCountryIds={
          selectedCountry === FILTER_ALL ? [] : [selectedCountry]
        }
        multiSelect={false}
      />

      <SimpleSelectModal
        isOpen={showPositionTypeModal}
        onClose={() => setShowPositionTypeModal(false)}
        title="역대 수반 직책"
        selectedValue={selectedPositionType}
        options={MOCK_POSITION_TYPES}
        onSelect={setSelectedPositionType}
        allLabel="전체 직책"
        allDescription="모든 역대 수반"
        Icon={FiUsers}
      />
    </>
  )
}
