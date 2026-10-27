/**
 * 국가 선택 모달 — 공용 {@link CountryPicker}의 어댑터(피커 통합 1단계).
 *
 * 구현은 `@/shared/ui/country-picker` 한 곳에 있다. 이 파일은 기존 호출부(인물 등록 국적·
 * 소속 국가, 부처, 조약, 군부대 등)의 props 계약만 유지한다 — 새 코드는 CountryPicker를 직접 쓸 것.
 *
 * 예전 이 모달은 카드 격자 + 가상 스크롤의 독자 구현이었고 Esc·포커스 트랩·aria-modal이 없었다.
 * `multiSelect`는 피커의 `toggle` 모드다(누를 때마다 `onSelect`, 닫지 않음).
 */
import React from 'react'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { CountryHintYearRange } from '@/shared/lib/country-picker-filter'
import { CountryPicker, type CountryPickerPick } from '@/shared/ui/country-picker'

interface CountrySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (country: CountryPickerPick) => void
  modernCountries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  title?: string
  selectedCountryId?: string
  selectedCountryIds?: string[] // 복수 선택용
  multiSelect?: boolean // 복수 선택 모드
  /** 시대 힌트(F42) — 겹치는 역사국가를 상단으로 올릴 뿐 걸러내지 않는다 */
  hintYearRange?: CountryHintYearRange
}

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({
  selectedCountryId,
  selectedCountryIds,
  multiSelect = false,
  ...rest
}) => (
  <CountryPicker
    {...rest}
    mode={multiSelect ? 'toggle' : 'single'}
    selectedIds={
      multiSelect ? (selectedCountryIds ?? []) : selectedCountryId ? [selectedCountryId] : []
    }
  />
)
