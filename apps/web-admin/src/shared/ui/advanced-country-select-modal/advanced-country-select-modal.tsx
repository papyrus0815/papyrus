/**
 * 고급 국가 선택 모달 — 공용 {@link CountryPicker}의 어댑터(피커 통합 1단계).
 *
 * 구현은 `@/shared/ui/country-picker` 한 곳에 있다. 이 파일은 기존 호출부(사건 상세 관련국·
 * 사건 목록 국가 필터·사건 등록 폼)의 props 계약만 유지한다 — 새 코드는 CountryPicker를 직접 쓸 것.
 *
 * `multiSelect`(기본 true)는 피커의 `toggle` 모드다: 누를 때마다 `onSelect`가 불리고
 * 담기·빼기는 호출부가 정한다.
 */
import React from 'react'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { CountryHintYearRange } from '@/shared/lib/country-picker-filter'
import { CountryPicker, type CountryPickerPick } from '@/shared/ui/country-picker'

/**
 * id·name만 strict하게 요구하고 나머지는 optional — 호출부가 경량 옵션을 넘길 수 있다.
 * 모달 내부 렌더는 모든 부가 필드(continentId/population 등)를 nullable check한다.
 */
type ModernCountryOption = Partial<CountryResponseDto> & Pick<CountryResponseDto, 'id' | 'name'>

interface AdvancedCountrySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (country: CountryPickerPick) => void
  modernCountries: ModernCountryOption[]
  historicalCountries: HistoricalCountryResponseDto[]
  selectedCountryIds: string[] // 복수 선택용
  multiSelect?: boolean
  title?: string
  /** 시대 힌트(F42) — 겹치는 역사국가를 상단으로 올릴 뿐 걸러내지 않는다 */
  hintYearRange?: CountryHintYearRange
  /** 선택 해제 — 주어지면 헤더에 '선택 해제' 버튼이 뜬다(검토 IA-14) */
  onClearSelection?: () => void
  /** 열릴 때 미리 적용할 대륙 id(검토 IA-9) */
  initialContinentId?: string
}

export const AdvancedCountrySelectModal: React.FC<AdvancedCountrySelectModalProps> = ({
  multiSelect = true,
  selectedCountryIds,
  ...rest
}) => (
  <CountryPicker
    {...rest}
    mode={multiSelect ? 'toggle' : 'single'}
    selectedIds={selectedCountryIds}
  />
)
