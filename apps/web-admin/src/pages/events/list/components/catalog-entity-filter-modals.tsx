/**
 * 엔티티 필터 모달 묶음 — 카테고리 / 국가.
 *
 * 단축키 도움말·요약 같은 portal/focus-trap이 필요한 overlay와는 책임이 달라
 * `catalog-overlay-modals`로 분리되어 있다.
 */
import React, { useMemo } from 'react'

import { FILTER_ALL } from '@/features/event-list/lib'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { CategoryModal } from '@/widgets/event-list/ui/category-modal'

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
  /**
   * 페이지의 대륙 필터 — 모달의 대륙 사이드바를 **같은 값으로 시딩**한다(검토 IA-9).
   * 예전엔 두 필터가 완전히 단절돼 있어서, 대륙을 좁혀 둔 채 '전체 보기'로 들어가면
   * 모달은 전 세계를 보여 주고 사용자는 같은 좁힘을 두 번 해야 했다.
   */
  selectedContinent?: string
  continents?: ContinentResponseDto[]
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
  selectedContinent = FILTER_ALL,
  continents = [],
}) => {
  /**
   * 현대 국가 목록 — **sentinel을 더 이상 끼우지 않는다**(검토 IA-14).
   *
   * 예전엔 `{ id: 'all', name: '전체 국가' }`를 첫 항목으로 넣었는데, 모달이 목록을
   * `localeCompare(ko)`로 정렬하므로 그 카드는 'ㅈ' 구간 한복판에 파묻혔다 —
   * 70여 개 카드 중 40번째쯤이라 스크롤 없이는 보이지도 않았고, 역사 탭에는 아예
   * 없어서 역사국가를 고른 사람에게는 해제 수단 자체가 없었다.
   * 지금은 모달 헤더의 '선택 해제' 액션이 그 일을 한다(탭·정렬과 무관).
   *
   * 배열 참조는 여전히 안정해야 한다(검토 PERF-7) — 새 참조면 모달 내부의
   * `filteredCountries`(검색·대륙 필터 + 정렬) memo가 매 렌더 무효화된다.
   */
  const modernCountryOptions = useMemo(() => countries, [countries])

  /**
   * 모달 대륙 사이드바의 시드(검토 IA-9). 페이지는 continentId를 쓰고 모달도 이제
   * 같은 키를 쓰므로 그대로 넘긴다 — 참조 목록에 없는 id면 넘기지 않는다
   * (모달에는 그 대륙 버튼이 없어 '아무것도 선택되지 않은' 상태가 되기 때문).
   */
  const initialContinentId =
    selectedContinent !== FILTER_ALL &&
    continents.some((continent) => continent.id === selectedContinent)
      ? selectedContinent
      : undefined

  /**
   * 선택 id 배열도 같은 이유로 memo — 단일 선택이라 항상 0~1개지만
   * 새 배열 참조가 모달의 열림 탭 판정 effect(`selectedCountryIds` deps)를 매번 깨운다.
   */
  const selectedCountryIds = useMemo(
    () => (selectedCountry === FILTER_ALL ? [] : [selectedCountry]),
    [selectedCountry],
  )

  return (
    <>
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/**
       * 국가 모달은 **열렸을 때만 마운트**한다(검토 PERF-7).
       *
       * 이 모달의 `if (!isOpen) return null`은 파일 310행 — 그 앞에 검색·대륙 필터 +
       * `localeCompare` 정렬 memo 3벌과 옵션 배열 생 map 2회가 있다. 그래서 닫혀 있어도
       * 부모가 리렌더될 때마다(카탈로그는 스크롤·키 입력마다 리렌더한다) 국가 전량을
       * 훑었다. 내부의 early return을 위로 올리려면 훅 순서를 뜯어야 하는데 이 모달은
       * 사건 상세·인물·국가 상세가 함께 쓰는 공용 컴포넌트라, 호출부에서 끊는 쪽이 안전하다.
       *
       * 부수효과 하나: 닫으면 언마운트되므로 모달 내부 상태(검색어·정렬·현대/역사 탭)가
       * 다음 열림에 초기화된다. 필터 피커는 매번 새 조회로 여는 게 자연스럽고,
       * 어차피 열릴 때 `selectedCountryIds` 기준으로 탭을 다시 정하므로 회귀가 아니다.
       */}
      {showCountryModal && (
        <AdvancedCountrySelectModal
          isOpen
          onClose={() => setShowCountryModal(false)}
          onSelect={(country) => {
            setSelectedCountry(country.id)
            setShowCountryModal(false)
          }}
          // 탭 무관 해제 — sentinel 카드를 대체한다(검토 IA-14)
          onClearSelection={() => {
            setSelectedCountry(FILTER_ALL)
            setShowCountryModal(false)
          }}
          // 페이지 대륙 필터와 같은 좁힘으로 열린다(검토 IA-9)
          initialContinentId={initialContinentId}
          modernCountries={modernCountryOptions}
          historicalCountries={historicalCountries}
          title="국가 필터"
          selectedCountryIds={selectedCountryIds}
          multiSelect={false}
        />
      )}
    </>
  )
}
