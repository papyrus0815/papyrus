/**
 * 국가 선택 모달 — 공용 {@link CountryPicker}의 어댑터(피커 통합 1단계).
 *
 * 구현은 `@/shared/ui/country-picker` 한 곳에 있다. 이 파일은 기존 호출부(재임 등록, 역사국가 폼,
 * 왕조 통치, 직위 정의 등)의 props 계약만 유지한다 — 새 코드는 CountryPicker를 직접 쓸 것.
 *
 * - `onSelectMultiple`이 있으면 피커의 `batch` 모드(담았다 빼다 '선택 완료'에서 한 번에 넘김),
 *   없으면 `single` 모드다.
 * - `modernOnly`/`historicalOnly`는 피커의 `scope`.
 * - id가 빈 문자열인 항목은 '선택 안 함' 류 sentinel이다. 목록에 섞으면 이름 정렬에 파묻히므로
 *   헤더의 해제 버튼(그 항목의 이름을 글자로)으로 옮긴다 — 누르면 예전처럼 id ''로 `onSelect`.
 */
import React from 'react'

import type { CountryHintYearRange } from '@/shared/lib/country-picker-filter'
import { CountryPicker, type CountryPickerPick } from '@/shared/ui/country-picker'

export interface CountryOption {
  id: string
  name: string
  flagEmoji?: string | null
  continentId?: string | null
  startYear?: number | null
  endYear?: number | null
  /** 검색 최소 공통 스펙(F19②) — 채워 주면 영문·현지명·ISO로도 찾을 수 있다 */
  enName?: string | null
  localName?: string | null
  isoCode?: string | null
  /** BC 표기·정렬용 (없으면 AD로 간주) */
  startEra?: string | null
  endEra?: string | null
}

export interface ContinentOption {
  id: string
  name: string
}

interface CountrySearchModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  modernCountries: CountryOption[]
  historicalCountries: CountryOption[]
  continentList?: ContinentOption[]
  /** 단일 선택 시 사용 */
  selectedCountryId?: string | null
  onSelect?: (country: CountryPickerPick) => void
  /** 현대 국가만 표시(역사적 국가 탭 숨김). 연결된 현대 국가 선택 등에서 사용 */
  modernOnly?: boolean
  /** 역사적 국가만 표시(현대 국가 탭 숨김). 후임 국가 선택 등에서 사용 */
  historicalOnly?: boolean
  /** 다중 선택 모드: 선택된 ID 목록 */
  selectedCountryIds?: string[]
  /** 다중 선택 모드: 선택 완료 시 호출 */
  onSelectMultiple?: (countries: CountryPickerPick[]) => void
  placeholder?: string
  /** 시대 힌트(F42) — 겹치는 역사국가를 상단으로 올릴 뿐 걸러내지 않는다 */
  hintYearRange?: CountryHintYearRange
}

export function CountrySearchModal({
  modernCountries,
  historicalCountries,
  selectedCountryId,
  onSelect,
  modernOnly = false,
  historicalOnly = false,
  selectedCountryIds,
  onSelectMultiple,
  ...rest
}: CountrySearchModalProps) {
  const isSentinel = (country: CountryOption) => country.id === ''
  const sentinel = [...modernCountries, ...historicalCountries].find(isSentinel)
  const sentinelIsHistorical = historicalCountries.some(isSentinel)
  const scope = historicalOnly ? 'historical' : modernOnly ? 'modern' : 'all'
  const shared = {
    ...rest,
    scope,
    modernCountries: modernCountries.filter((country) => !isSentinel(country)),
    historicalCountries: historicalCountries.filter((country) => !isSentinel(country)),
  } as const

  if (onSelectMultiple) {
    return (
      <CountryPicker
        {...shared}
        mode="batch"
        selectedIds={selectedCountryIds ?? []}
        onCommit={onSelectMultiple}
      />
    )
  }
  return (
    <CountryPicker
      {...shared}
      mode="single"
      selectedIds={selectedCountryId ? [selectedCountryId] : []}
      onSelect={(country) => onSelect?.(country)}
      onClearSelection={
        sentinel
          ? () => {
              onSelect?.({ id: '', name: sentinel.name, isHistorical: sentinelIsHistorical })
              rest.onClose()
            }
          : undefined
      }
      clearSelectionLabel={sentinel?.name}
    />
  )
}
