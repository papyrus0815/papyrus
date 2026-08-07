/**
 * Event Filters Panel Widget
 * FSD: widgets/event-filters-panel/ui
 *
 * 검색 입력 / 활성 칩 / reset / *정렬·페이지 크기*는 페이지 또는 ViewSwitcherRow가
 * 담당. 이 위젯은 "데이터 좁히기"인 카테고리·국가·세기 + 표시 토글만.
 *
 * v2 — 인라인 팝오버: 카테고리·국가 모두 클릭 시 *드롭다운 리스트*로 즉시 선택 가능.
 * 항목이 많으면 popover 내부 검색 박스 노출. 기존 모달 진입은 "전체 보기" 풋터에서.
 *
 * v3 — 팝오버를 APG combobox로 재작성(필터 검토 배치 1). `role="listbox"` 선언만 있고
 * 조작 모델은 '버튼 나열'이던 상태를 끝냈다. 자세한 근거는 아래 InlineFilterPopover 주석.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { createPortal } from 'react-dom'
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiMap,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { CenturyFilter } from '@/entities/event/model'
// 값 import는 types 모듈에서 직접 — 배럴은 useEvents → api.service(`import.meta`)를
// 끌고 와 이 위젯의 spec이 컴파일되지 않는다.
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
// 라벨 폴백은 칩과 **같은 함수**를 쓴다(검토 URL-1/IA-16/DATA-17 · GAP-5).
// 배럴이 아니라 모듈에서 직접 — 배럴은 useEventFilters를 끌고 오고 이 위젯엔 spec이 있다.
import {
  EMPTY_FILTER_OPTION_COUNTS,
  type FilterOptionCounts,
} from '@/features/event-filters/model/option-facets'
import {
  READY_REFERENCE_STATE,
  resolveFilterValueLabel,
  type FilterReferenceState,
  type ReferenceLoadState,
} from '@/features/event-filters/model/reference-label'
import { FILTER_ALL } from '@/features/event-list/lib'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { useAnchoredPosition } from '@/shared/hooks/use-anchored-position.hook'
import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

import * as Filter from '../../../pages/events/styles/filter.styles'
import { BRAND, MOTION, SHADOW } from '../../../pages/events/styles/theme'

interface FiltersPanelProps {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedContinent: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  showFlatView: boolean

  dbCategories: EventCategoryDto[]
  availableCenturies: number[]
  countries?: Array<{
    id: string
    name: string
    flagEmoji?: string | null
    /** 대륙 축과의 계층 관계에 쓴다(검토 IA-1) */
    continentId?: string | null
  }>
  historicalCountries?: Array<{ id: string; name: string }>
  continents?: ContinentResponseDto[]

  /**
   * 로드된 사건 기준 축별 건수(검토 IA-13). 옵션 우측 회색 숫자이자 국가 축의 **정렬 키**다.
   *
   * 이게 없던 시절 옵션 모집단 규약은 축마다 갈려 있었다 — 세기만 사건에서 파생되고
   * 카테고리·국가·대륙은 참조 DB 전량이라, 사건 0건인 국가 263개가 그대로 서 있었고
   * 어느 것을 고르면 결과가 있는지는 눌러 봐야만 알 수 있었다.
   */
  optionCounts?: FilterOptionCounts

  /**
   * 참조 데이터(카테고리·국가·대륙)의 로드 상태(검토 GAP-5).
   * 선택된 id의 이름을 못 찾았을 때 '불러오는 중' / '이름 조회 실패' / '알 수 없음'을
   * 가르고, 실패한 축의 팝오버에는 '다시 시도' 행을 띄운다.
   */
  referenceState?: FilterReferenceState
  /** 실패한 참조 축 재조회 — 축별 refetch */
  onRetryReference?: (axis: keyof FilterReferenceState) => void

  /** 인라인 선택 핸들러 — 신규 (모달 우회) */
  onSelectCategory?: (id: typeof FILTER_ALL | string) => void
  onSelectCountry?: (id: typeof FILTER_ALL | string) => void
  onSelectContinent?: (id: typeof FILTER_ALL | string) => void

  /** 모달 트리거 — "전체 보기"용 fallback */
  onShowCategoryModal: () => void
  onShowCountryModal: () => void
  onToggleFlatView: () => void
  onSelectCentury: (century: CenturyFilter) => void
}

/** 세기 옵션·값 라벨의 단일 표기 — BC는 '기원전 N세기' */
function formatCenturyOptionLabel(century: number): string {
  return century < 0 ? `기원전 ${Math.abs(century)}세기` : `${century}세기`
}

/**
 * 국가 팝오버의 두 섹션 라벨(검토 IA-2).
 *
 * 예전엔 한 목록에 현대 70 + 역사 263이 이어 붙고 상한이 50이라, **첫 화면의
 * 역사국가가 구조적으로 0개**였다(현대가 슬롯을 전부 소진). 대륙 축도 역사국가를
 * 배제하므로 두 축이 동시에 현대 편향이었고, 역사국가로만 태그된 사건은
 * '국가로 좁히기' 브라우즈 동선에서 사실상 부재했다 — 역사 카탈로그에서
 * 엔티티 한 클래스의 전면 부재다. 섹션을 나눠 **각자 상한을 갖게** 하면 그 경합이 사라진다.
 */
const MODERN_COUNTRY_GROUP = '현대 국가'
const HISTORICAL_COUNTRY_GROUP = '역사 국가'

/** 검색어가 없을 때 국가 섹션이 첫 화면에 내놓는 수 — 나머지는 'N개 더 보기'로 펼친다 */
const COUNTRY_GROUP_LIMIT = 20

/**
 * 검색 중 렌더 상한(검토 PERF-9).
 * 예전엔 검색 중에는 상한이 **풀려** 옵션 334개가 통째로 DOM에 들어갔다(가상화 없음).
 */
const COUNTRY_SEARCH_LIMIT = 100

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  selectedCategory,
  selectedCountry,
  selectedContinent,
  selectedCentury,
  showFlatView,
  dbCategories,
  availableCenturies,
  countries = [],
  historicalCountries = [],
  continents = [],
  optionCounts = EMPTY_FILTER_OPTION_COUNTS,
  referenceState = READY_REFERENCE_STATE,
  onRetryReference,
  onSelectCategory,
  onSelectCountry,
  onSelectContinent,
  onShowCategoryModal,
  onShowCountryModal,
  onToggleFlatView,
  onSelectCentury,
}) => {
  /**
   * 트리거는 이제 `필드명 · 값` **2요소**라, 여기서 만드는 건 '값'뿐이다(검토 VIS-4).
   * 미적용이면 `undefined` — 트리거는 필드명만 렌더한다.
   *
   * 폴백은 **칩과 같은 함수**를 쓴다(검토 URL-1/IA-16/DATA-17). 예전엔 축마다 문구가
   * 달랐다 — 카테고리는 '알 수 없음', 국가·대륙은 축 이름 그 자체('국가'/'대륙')로
   * 되돌아가 **필터 없음과 같은 문자열**이 됐다. 그래서 삭제된 국가 id가 담긴 링크를
   * 열면 "필터가 안 걸린 것처럼 보이는데 결과는 0건"이 됐다.
   */
  const categoryValue =
    selectedCategory === FILTER_ALL
      ? undefined
      : resolveFilterValueLabel(
          dbCategories.find((category) => category.id === selectedCategory)
            ?.name,
          referenceState.category,
        )

  const countryValue =
    selectedCountry === FILTER_ALL
      ? undefined
      : resolveFilterValueLabel(
          countries.find((country) => country.id === selectedCountry)?.name ??
            historicalCountries.find(
              (country) => country.id === selectedCountry,
            )?.name,
          referenceState.country,
        )

  const continentValue =
    selectedContinent === FILTER_ALL
      ? undefined
      : resolveFilterValueLabel(
          continents.find((continent) => continent.id === selectedContinent)
            ?.name,
          referenceState.continent,
        )

  const centuryValue =
    selectedCentury === FILTER_ALL
      ? undefined
      : selectedCentury === CENTURY_UNKNOWN
        ? '연도 미상'
        : formatCenturyOptionLabel(selectedCentury)

  /**
   * 건수를 **붙일 자격이 있는가**(검토 IA-13 + GAP-3의 정신).
   *
   * 사건이 아직 한 건도 로드되지 않았을 때 모든 옵션에 '0'을 붙이면, 그건 정보가 아니라
   * **거짓 단정**이다(카탈로그는 autoLoadAll로 페이지를 순차 소진하므로 그 창이 실재한다).
   * 그 구간에는 숫자를 아예 내지 않는다.
   */
  const showOptionCounts = optionCounts.unfiltered > 0
  const countOf = useCallback(
    (value: number | undefined) => (showOptionCounts ? (value ?? 0) : undefined),
    [showOptionCounts],
  )

  /**
   * 세기 옵션 — 네이티브 `<select>`에서 다른 축과 같은 팝오버로 옮겼다(검토 IA-15).
   *
   * 선택된 세기가 옵션 모집단(로드된 사건에서 파생)에 없으면 **임시 옵션**을 하나 만든다
   * (검토 URL-2/DATA-11). 옵션은 로드된 사건에서 만들어지므로 `?century=17` 정상 딥링크도
   * 자동 로드가 끝나기 전에는 목록에 없고, 그때 컨트롤은 값이 매칭되지 않아 아무것도
   * 가리키지 못해 화면과 URL이 서로 다른 말을 했다. 진짜로 결과가 없는 세기도 마찬가지다.
   */
  const centuryOptions = useMemo(() => {
    // 리터럴 두 개로 시작하면 id가 'all' | 'unknown'으로 좁혀져 세기 숫자를 못 넣는다.
    const options: InlineFilterOption[] = [
      // '전체'의 건수 = 이 축을 풀었을 때의 건수. 다른 축이 걸려 있으면 전체 로드 수와 다르다.
      {
        id: FILTER_ALL,
        name: '전체',
        count: countOf(optionCounts.dropOneOut.century),
      },
      // '연도 미상'은 목록의 1급 섹션인데 세기 축에 그 값이 없어, 세기를 고르면
      // 날짜 미상 사건이 전량 조용히 탈락했다(검토 IA-5).
      {
        id: CENTURY_UNKNOWN,
        name: '연도 미상',
        count: countOf(optionCounts.centuryUnknown),
      },
    ]
    if (
      typeof selectedCentury === 'number' &&
      !availableCenturies.includes(selectedCentury)
    ) {
      options.push({
        id: String(selectedCentury),
        name: `${formatCenturyOptionLabel(selectedCentury)} (결과 없음)`,
      })
    }
    availableCenturies.forEach((century) => {
      options.push({
        id: String(century),
        name: formatCenturyOptionLabel(century),
        count: countOf(optionCounts.century.get(century)),
      })
    })
    return options
  }, [availableCenturies, selectedCentury, optionCounts, countOf])

  /**
   * 필터 그룹이 실제로 넘칠 때만 우측 페이드를 건다(검토 VIS-7).
   *
   * CSS만으로는 `scrollWidth > clientWidth`를 알 수 없어 여기서 잰다. 예전엔 ≤768px이면
   * 마스크가 상시 적용돼, 넘치지 않는 폭에서도 그룹 우측 모서리·보더가 늘 흐렸다.
   * 라벨이 길어지는 것만으로도 넘침 여부가 바뀌므로(그룹 자신의 박스는 그대로다)
   * ResizeObserver 외에 **값 라벨 변화**도 재측정 트리거로 넣는다.
   */
  const filterGroupRef = useRef<HTMLDivElement | null>(null)
  const [isFilterGroupOverflowing, setIsFilterGroupOverflowing] =
    useState(false)
  useEffect(() => {
    const node = filterGroupRef.current
    if (!node) return
    // 1px 여유 — 서브픽셀 반올림으로 scrollWidth가 clientWidth보다 아주 조금 큰 경우가 있다.
    const measure = () =>
      setIsFilterGroupOverflowing(node.scrollWidth > node.clientWidth + 1)
    measure()
    // jsdom에는 ResizeObserver 구현이 없다 — 없으면 초기 1회 측정으로 만족한다.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [categoryValue, countryValue, continentValue, centuryValue])

  /** country.id → continentId — 대륙 축이 국가 옵션을 좁히는 데 쓴다(검토 IA-1) */
  const continentIdByCountryId = useMemo(() => {
    const map = new Map<string, string>()
    for (const country of countries) {
      if (country.continentId) map.set(country.id, country.continentId)
    }
    return map
  }, [countries])

  const selectedContinentName =
    selectedContinent === FILTER_ALL
      ? undefined
      : continents.find((continent) => continent.id === selectedContinent)?.name

  /**
   * 선택한 대륙과 선택한 국가가 **서로 다른 곳을 가리키는가**(검토 IA-1).
   *
   * 대륙→국가는 개념상 계층인데 옵션도 술어도 평행이라 '아시아 + 프랑스' 같은 조합을
   * UI가 막지 않았다. 사건 하나가 두 대륙에 걸칠 수 있어 **항상** 0건은 아니지만,
   * 사용자가 그 조합을 의도해서 만드는 경우는 사실상 없다. 그래서 막는 대신
   * 팝오버 안에서 원인을 밝히고 한 번에 풀 수 있게 한다.
   */
  const countryContinentConflict =
    selectedContinent !== FILTER_ALL &&
    selectedCountry !== FILTER_ALL &&
    continentIdByCountryId.has(selectedCountry) &&
    continentIdByCountryId.get(selectedCountry) !== selectedContinent

  /**
   * 국가 옵션 — **2섹션 + 빈도 정렬**(검토 IA-2 · IA-13 · IA-1).
   *
   * - 현대/역사를 별도 섹션으로 나눠 각자 상한을 갖게 한다(한 목록·한 상한이면 역사가 0개).
   * - 정렬은 참조 DB 순서가 아니라 **로드된 사건의 태그 빈도** 내림차순이다 —
   *   카탈로그에서 '국가로 좁히기'를 누르는 사람이 원하는 건 사전순 첫 국가가 아니라
   *   이 데이터에 실제로 있는 국가다. 동수는 이름순으로 안정화한다.
   * - 대륙이 걸려 있으면 현대 섹션을 그 대륙으로 좁힌다. 역사국가는 continentId가 없어
   *   '대륙 미상'으로 존치한다(빼면 그 클래스가 또 통째로 사라진다).
   */
  const allCountryOptions = useMemo<InlineFilterOption[]>(() => {
    const byCountEntry = (
      left: InlineFilterOption,
      right: InlineFilterOption,
    ) =>
      (right.count ?? 0) - (left.count ?? 0) ||
      left.name.localeCompare(right.name, 'ko')

    const narrowByContinent = selectedContinent !== FILTER_ALL
    const modernGroupLabel = selectedContinentName
      ? `${MODERN_COUNTRY_GROUP} · ${selectedContinentName}`
      : MODERN_COUNTRY_GROUP
    const historicalGroupLabel = narrowByContinent
      ? `${HISTORICAL_COUNTRY_GROUP} (대륙 미상)`
      : HISTORICAL_COUNTRY_GROUP

    const modern = countries
      .filter(
        (country) =>
          !narrowByContinent ||
          continentIdByCountryId.get(country.id) === selectedContinent ||
          // 현재 선택은 절단·좁힘과 무관하게 항상 보여야 한다(검토 INT-5) —
          // 안 그러면 대륙을 바꾼 순간 걸려 있는 국가 필터를 해제할 수단이 사라진다.
          country.id === selectedCountry,
      )
      .map<InlineFilterOption>((country) => ({
        id: country.id,
        name: country.name,
        prefix: country.flagEmoji ?? undefined,
        group: modernGroupLabel,
        count: countOf(optionCounts.country.get(country.id)),
      }))
      .sort(byCountEntry)

    const historical = historicalCountries
      .map<InlineFilterOption>((country) => ({
        id: country.id,
        name: country.name,
        prefix: '🏛️',
        group: historicalGroupLabel,
        count: countOf(optionCounts.country.get(country.id)),
      }))
      .sort(byCountEntry)

    return [
      // '전체'는 어느 섹션에도 속하지 않는 해제 sentinel — 항상 최상단.
      {
        id: FILTER_ALL,
        name: '전체',
        count: countOf(optionCounts.dropOneOut.country),
      },
      ...modern,
      ...historical,
    ]
  }, [
    countries,
    historicalCountries,
    continentIdByCountryId,
    selectedContinent,
    selectedContinentName,
    selectedCountry,
    optionCounts,
    countOf,
  ])

  /** 국가 팝오버 상단 고지 — 좁힘 사실과 그 해제 경로를 같은 자리에서 준다(검토 IA-1) */
  const countryNotice = useMemo<InlineFilterNotice | undefined>(() => {
    if (selectedContinent === FILTER_ALL) return undefined
    const continentName = selectedContinentName ?? '선택한 대륙'
    return {
      text: countryContinentConflict
        ? `선택한 국가는 ${continentName}에 속하지 않습니다`
        : `${continentName}의 현대 국가만 보입니다`,
      actionLabel: '대륙 필터 해제',
      onAction: () => onSelectContinent?.(FILTER_ALL),
    }
  }, [
    selectedContinent,
    selectedContinentName,
    countryContinentConflict,
    onSelectContinent,
  ])

  return (
    <Filter.FilterBlock>
      {/* 필터 트리거 4개 — 한 외곽 border로 묶음 (내부 hairline divider) */}
      <Filter.FilterGroup
        ref={filterGroupRef}
        $overflowing={isFilterGroupOverflowing}
      >
        {/* 카테고리 — 인라인 팝오버 (전체 + 카테고리 N개 + 모달 진입) */}
        <InlineFilterPopover
          icon={<FiGrid size={13} />}
          axisLabel="카테고리"
          valueLabel={categoryValue}
          isActive={selectedCategory !== FILTER_ALL}
          options={[
            {
              id: FILTER_ALL,
              name: '전체',
              count: countOf(optionCounts.dropOneOut.category),
            },
            ...dbCategories.map((category) => ({
              id: category.id,
              name: category.name,
              count: countOf(optionCounts.category.get(category.id)),
            })),
          ]}
          selectedId={selectedCategory}
          onSelect={(id) => onSelectCategory?.(id)}
          onShowMoreModal={onShowCategoryModal}
          searchable={dbCategories.length > 12}
          loadState={referenceState.category}
          onRetryLoad={
            onRetryReference ? () => onRetryReference('category') : undefined
          }
        />

        {/* 대륙 — 인라인 팝오버 (대륙 → 국가 순으로 좁혀가는 동선) */}
        <InlineFilterPopover
          icon={<FiMap size={13} />}
          axisLabel="대륙"
          valueLabel={continentValue}
          isActive={selectedContinent !== FILTER_ALL}
          options={[
            {
              id: FILTER_ALL,
              name: '전체',
              count: countOf(optionCounts.dropOneOut.continent),
            },
            ...continents.map((continent) => ({
              id: continent.id,
              name: continent.name,
              count: countOf(optionCounts.continent.get(continent.id)),
            })),
          ]}
          selectedId={selectedContinent}
          onSelect={(id) => onSelectContinent?.(id)}
          searchable={continents.length > 12}
          loadState={referenceState.continent}
          onRetryLoad={
            onRetryReference ? () => onRetryReference('continent') : undefined
          }
        />

        {/* 국가 — 인라인 팝오버 (검색 가능, 자주 쓰는 항목 위주) */}
        <InlineFilterPopover
          icon={<FiGlobe size={13} />}
          axisLabel="국가"
          valueLabel={countryValue}
          isActive={selectedCountry !== FILTER_ALL}
          options={allCountryOptions}
          selectedId={selectedCountry}
          onSelect={(id) => onSelectCountry?.(id)}
          onShowMoreModal={onShowCountryModal}
          searchable
          maxVisiblePerGroup={COUNTRY_GROUP_LIMIT}
          maxVisibleWhenSearching={COUNTRY_SEARCH_LIMIT}
          notice={countryNotice}
          loadState={referenceState.country}
          onRetryLoad={
            onRetryReference ? () => onRetryReference('country') : undefined
          }
        />

        {/**
         * 세기 — 다른 3축과 같은 인라인 팝오버(검토 IA-15).
         *
         * 예전엔 이 축만 네이티브 `<select>`였다. 그래서 ⑴ 미적용일 때 표시가 '전체'가 되어
         * **축 이름('세기')이 화면에서 사라지고** ⑵ 조작 감각(열림 위치·검색·키 규약)도
         * 옆 트리거들과 달랐다. 한 필터 바 안에서 컨트롤 규약이 갈리면 사용자는 축마다
         * 다른 조작법을 학습해야 한다.
         */}
        <InlineFilterPopover
          icon={<FiCalendar size={13} />}
          axisLabel="세기"
          valueLabel={centuryValue}
          isActive={selectedCentury !== FILTER_ALL}
          options={centuryOptions}
          selectedId={
            selectedCentury === FILTER_ALL || selectedCentury === CENTURY_UNKNOWN
              ? selectedCentury
              : String(selectedCentury)
          }
          onSelect={(id) => {
            if (id === FILTER_ALL) onSelectCentury(FILTER_ALL)
            else if (id === CENTURY_UNKNOWN) onSelectCentury(CENTURY_UNKNOWN)
            else onSelectCentury(Number.parseInt(id, 10))
          }}
          // 세기는 목록이 길어질 수 있다(BC 포함 최대 40여 종) — 다른 축과 같은 임계.
          searchable={centuryOptions.length > 12}
        />
      </Filter.FilterGroup>

      {/* 토글들 — segmented group 외부, inline group.
       *
       * ⚠️ FilterToggle(label)에 onClick을 걸지 말 것. label 안의 Switch는 button —
       * HTML labelable 요소라 label의 피제어 컨트롤이 된다. 라벨 영역을 누르면
       * ⑴ label 자신의 onClick ⑵ 브라우저가 button으로 전달한 활성화 클릭이 연달아 실행돼
       * **짝수 번 토글 = 순 변화 0**이 됐다. 라이브 실측에선 URL만 flat=1로 바뀌고 목록은
       * 계층 그대로 남아, 새로고침하면 다른 화면이 뜨는 URL↔화면 desync까지 생겼다.
       * 토글 주체는 Switch 하나로 단일화한다(라벨 클릭은 브라우저가 알아서 버튼으로 전달). */}
      <Filter.FilterToggle>
        <FiLayers size={12} style={{ color: '#64748b' }} aria-hidden="true" />
        <Filter.FilterToggleLabel>계층</Filter.FilterToggleLabel>
        <Filter.Switch
          type="button"
          role="switch"
          aria-checked={!showFlatView}
          aria-label="계층 보기"
          $active={!showFlatView}
          onClick={onToggleFlatView}
        >
          <Filter.SwitchThumb $active={!showFlatView} />
        </Filter.Switch>
      </Filter.FilterToggle>
    </Filter.FilterBlock>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline filter popover — APG combobox (검토 배치 1)
//
// ## 왜 combobox로 다시 썼나
//
// 예전 구조는 `role="listbox"`를 **선언만** 하고 실제 조작 모델은 '버튼 N개 나열'이었다.
// 열려도 포커스가 이동하지 않고(검색 가능한 국가 축만 예외), 팝오버는 `document.body`
// 끝으로 포털된다. 그래서 키보드·스크린리더 사용자가 카테고리·대륙 옵션에 닿으려면
// 툴바·목록 행 전부·드로어를 지나 문서 끝까지 Tab을 밀어야 했다 — 유일한 우회로인
// '전체 보기 →' 진입점조차 팝오버 안에 있었다(검토 INT-1/A11Y-2 · 이번 검토의 유일한 P1).
//
// 포털은 되돌릴 수 없다. `FilterGroup`의 `overflow:hidden`이 팝오버를 잘라 드롭다운이
// 7주간 화면에 아예 나타나지 않던 근본 원인이기 때문이다. 포털을 유지한 채 도달성을
// 세우는 표준 모델이 **활성 옵션을 `aria-activedescendant`로 가리키고 포커스는 한 곳에
// 묶어 두는** combobox다. DOM 인접성 대신 `aria-controls`로 프로그램적 관계를 세운다.
//
// ## 두 변종 — 같은 코어
//
// - `searchable=false`(카테고리·대륙): APG **select-only combobox**.
//   트리거 자신이 combobox이고 포커스는 트리거에 머문다. 타이핑은 타입어헤드(접두 점프).
// - `searchable=true`(국가): APG **list-autocomplete combobox**.
//   텍스트 입력이 존재하는 이상 select-only가 될 수 없다(입력에 포커스가 없으면 타이핑이
//   안 되고, 있으면 트리거는 더 이상 활성 옵션의 소유자가 아니다). 그래서 이 변종만
//   입력이 combobox 역할을 지고 트리거는 `aria-haspopup` 버튼으로 남는다. 검색어 자체가
//   타입어헤드다.
//
// 두 변종은 같은 키 처리(`handleListNavigationKey`)·같은 닫기 창구(`closePopover`)·
// 같은 활성 인덱스를 쓴다. 갈리는 것은 "포커스가 어디에 있는가" 하나뿐이다.
// ─────────────────────────────────────────────────────────────────────────────

/** 타입어헤드 버퍼 유지 시간 — 네이티브 `<select>`와 같은 감각(약 0.7초) */
const TYPEAHEAD_RESET_MS = 700

/** 바깥 mousedown 뒤 click을 기다리는 상한 — 이 안에 안 오면 삼킴 예약을 스스로 푼다 */
const OUTSIDE_CLICK_SWALLOW_MS = 400

/**
 * 팝오버를 닫은 **바깥 mousedown**에 뒤이어 오는 click 1회를 삼킨다(검토 INT-14).
 *
 * 팝오버는 mousedown 단계에서 닫힌다. 그러면 이어지는 click은 이미 사라진 팝오버 대신
 * 그 아래에 있던 요소(목록 행 등)에 떨어져, "팝오버를 닫으려던 클릭"이 사건 드로어를
 * 열어 버렸다. 캡처 단계에서 딱 한 번 가로채 소비한다.
 *
 * click이 끝내 오지 않는 경우(드래그로 벗어나 mouseup, 컨텍스트 메뉴, 창 전환)를 위해
 * 짧은 타임아웃으로 스스로 해제한다 — 없으면 리스너가 남아 한참 뒤 무관한 클릭을 먹는다.
 */
function swallowNextDocumentClick(): () => void {
  let timerId = 0
  const release = () => {
    document.removeEventListener('click', onClickCapture, true)
    window.clearTimeout(timerId)
  }
  function onClickCapture(clickEvent: MouseEvent) {
    clickEvent.stopPropagation()
    clickEvent.preventDefault()
    release()
  }
  document.addEventListener('click', onClickCapture, true)
  timerId = window.setTimeout(release, OUTSIDE_CLICK_SWALLOW_MS)
  return release
}

/** 타입어헤드로 취급할 키인가 — 조합키가 없는 인쇄 가능한 한 글자 */
function isTypeaheadKey(event: React.KeyboardEvent): boolean {
  return (
    event.key.length === 1 &&
    event.key !== ' ' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  )
}

interface InlineFilterOption {
  id: string
  name: string
  prefix?: string // 국기 이모지 등 (옵션 좌측 prefix)
  /**
   * 섹션 라벨 — 같은 값끼리 `role="group"`으로 묶인다(검토 IA-2).
   * `undefined`면 최상단 무제목 구역('전체' 같은 해제 sentinel 자리).
   */
  group?: string
  /** 로드된 사건 기준 건수(검토 IA-13). `undefined`면 숫자를 렌더하지 않는다. */
  count?: number
}

/** 팝오버 상단 고지 + 인라인 해제 액션(검토 IA-1) */
interface InlineFilterNotice {
  text: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * 렌더 단위 — 옵션 행과 '더 보기' 행 **둘 다 `role="option"`**이다.
 *
 * '더 보기'를 버튼으로 두면 ⑴ `role="listbox"`의 무효 자식이 되고 ⑵ 검색 변종에서는
 * 포커스가 입력에 묶여 있어 Tab으로 닿을 수 없다(팝오버 안 Tab은 닫고 트리거로 복귀한다).
 * 옵션으로 두면 ↓ 로 도달하고 Enter로 펼칠 수 있다 — 절단 해제가 키보드에서도 산다.
 */
type PopoverRow =
  | {
      kind: 'option'
      option: InlineFilterOption
      /** 섹션 내 총 옵션 수(절단 이전) — SR에 정직한 setsize */
      setSize: number
      /** 섹션 내 1-based 위치 */
      posInSet: number
    }
  | { kind: 'more'; group: string; hiddenCount: number }

/** 렌더 순서를 유지한 섹션 — 라벨이 없으면 `role="group"` 없이 평평하게 낸다. */
interface PopoverSection {
  label?: string
  rows: PopoverRow[]
}

interface InlineFilterPopoverProps {
  icon: React.ReactNode
  /**
   * 축 이름('카테고리'·'국가'·'대륙'·'세기') — **항상 화면에 보인다**.
   *
   * 접근 이름을 **시각 텍스트로** 구성하는 데 쓴다(검토 INT-8/A11Y-4). 예전엔
   * `aria-label="카테고리 필터"`가 고정으로 붙어 선택값('정치')을 덮었고, 음성 제어
   * 사용자가 화면에 보이는 말("정치")로는 이 컨트롤을 부를 수 없었다(WCAG 2.5.3 실패).
   * 그 뒤 축 접두사를 sr-only로 붙였는데, 이번엔 값이 걸린 축의 **이름이 화면에서
   * 사라지는** 쪽이 문제였다(검토 VIS-4·IA-15). 지금은 축 이름이 시각·접근 양쪽에 있다.
   */
  axisLabel: string
  /** 적용된 값 — `undefined`면 미적용이라 트리거는 축 이름만 렌더한다 */
  valueLabel?: string
  isActive: boolean
  options: InlineFilterOption[]
  selectedId: string
  onSelect: (id: string) => void
  onShowMoreModal?: () => void
  searchable?: boolean
  /**
   * 검색어가 없을 때 **섹션별** 상한(검토 IA-2). 넘치면 그 섹션 끝에 'N개 더 보기' 행.
   * `undefined` = 무제한.
   */
  maxVisiblePerGroup?: number
  /**
   * 검색 중 **전체** 상한(검토 PERF-9). 예전엔 검색 중 상한이 풀려 옵션 334개가
   * 통째로 DOM에 들어갔다(가상화 없음). `undefined` = 무제한.
   */
  maxVisibleWhenSearching?: number
  /** 상단 고지 행 — 좁힘 사실과 해제 경로를 옵션 목록 바로 위에 둔다(검토 IA-1) */
  notice?: InlineFilterNotice
  /**
   * 이 축의 참조 데이터 로드 상태(검토 GAP-5). 옵션이 '전체' 하나뿐인 화면이
   * '로딩 중'인지 '조회 실패'인지 '정말로 비었는지' 구분되지 않던 것을 메운다.
   */
  loadState?: ReferenceLoadState
  /** 실패 시 재조회 — 제공되면 실패 행에 '다시 시도' 버튼이 붙는다 */
  onRetryLoad?: () => void
}

const InlineFilterPopover: React.FC<InlineFilterPopoverProps> = ({
  icon,
  axisLabel,
  valueLabel,
  isActive,
  options,
  selectedId,
  onSelect,
  onShowMoreModal,
  searchable = false,
  maxVisiblePerGroup,
  maxVisibleWhenSearching,
  notice,
  loadState = 'ready',
  onRetryLoad,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /**
   * 활성(하이라이트) 행 인덱스 — `visibleRows` 기준.
   * 포커스가 아니라 `aria-activedescendant`가 가리키는 대상이라 DOM 포커스는 움직이지 않는다.
   */
  const [activeIndex, setActiveIndex] = useState(0)
  /** 사용자가 'N개 더 보기'로 펼친 섹션 — 닫으면 초기화된다 */
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  /** 포털된 팝오버 노드 — wrapRef의 자손이 아니므로 외부클릭 판정에 따로 필요 */
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const typeaheadRef = useRef({ buffer: '', timerId: 0 })
  const swallowReleaseRef = useRef<(() => void) | null>(null)
  const position = useAnchoredPosition(triggerRef, open)

  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const axisNameId = `${baseId}-axis`
  const valueNameId = `${baseId}-value`
  const optionDomId = useCallback(
    (index: number) => `${baseId}-option-${index}`,
    [baseId],
  )

  const trimmedQuery = query.trim()
  const searching = trimmedQuery.length > 0

  const filtered = useMemo(() => {
    if (!searching) return options
    const needle = trimmedQuery.toLowerCase()
    return options.filter((option) =>
      option.name.toLowerCase().includes(needle),
    )
  }, [options, searching, trimmedQuery])

  /**
   * ===== 섹션 조립 (검토 IA-2 · INT-5 · PERF-9) =====
   *
   * 규칙 셋. 한 문장씩이라 여기 적어 둔다 — 나중에 상한을 만질 사람이 셋 중 하나만
   * 고치면 다시 "역사국가가 한 개도 안 보인다"로 돌아간다.
   *
   * ⑴ **선택은 자기 섹션 맨 앞으로 끌어올린다.** 절단·좁힘과 무관하게 항상 보인다 —
   *    예전엔 선택한 국가가 앞 50개 창 밖이면 팝오버 안에 체크가 하나도 없어,
   *    지금 무엇이 걸려 있는지 확인할 수도 해제할 수도 없었다(INT-5).
   * ⑵ **검색어가 없으면 섹션별 상한**, 넘치면 그 섹션 끝에 'N개 더 보기' 행.
   *    한 목록·한 상한이면 현대 70개가 슬롯을 전부 먹어 역사 263개가 0개가 된다(IA-2).
   * ⑶ **검색 중에는 전체 상한**(섹션별 상한은 해제). 검색은 사용자가 이미 좁힌 상태라
   *    섹션마다 자르면 오히려 답을 감춘다. 대신 DOM 폭주는 총량으로 막는다(PERF-9).
   */
  const { sections, visibleRows, renderedOptionCount, hiddenOptionCount } =
    useMemo(() => {
      const UNGROUPED = ' ungrouped'
      const order: string[] = []
      const buckets = new Map<string, InlineFilterOption[]>()
      for (const option of filtered) {
        const key = option.group ?? UNGROUPED
        const bucket = buckets.get(key)
        if (bucket) bucket.push(option)
        else {
          buckets.set(key, [option])
          order.push(key)
        }
      }

      const globalLimit = searching
        ? (maxVisibleWhenSearching ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY

      const builtSections: PopoverSection[] = []
      const flatRows: PopoverRow[] = []
      let rendered = 0

      for (const key of order) {
        const groupOptions = buckets.get(key) ?? []
        // ⑴ 선택을 맨 앞으로 — 원본 순서(빈도 정렬)는 나머지에서 그대로 유지된다.
        const selectedFirst =
          groupOptions.some((option) => option.id === selectedId) &&
          groupOptions[0]?.id !== selectedId
            ? [
                ...groupOptions.filter((option) => option.id === selectedId),
                ...groupOptions.filter((option) => option.id !== selectedId),
              ]
            : groupOptions

        const groupLimit =
          searching || expandedGroups.has(key)
            ? Number.POSITIVE_INFINITY
            : (maxVisiblePerGroup ?? Number.POSITIVE_INFINITY)

        const rows: PopoverRow[] = []
        for (const option of selectedFirst) {
          if (rows.length >= groupLimit) break
          if (rendered >= globalLimit) break
          rows.push({
            kind: 'option',
            option,
            setSize: selectedFirst.length,
            posInSet: rows.length + 1,
          })
          rendered += 1
        }
        // 섹션 상한에 걸려 남은 것만 '더 보기'가 된다 — 전체 상한(검색)은 푸터가 말한다.
        const hiddenInGroup = selectedFirst.length - rows.length
        if (hiddenInGroup > 0 && rows.length >= groupLimit) {
          rows.push({
            kind: 'more',
            group: key,
            hiddenCount: hiddenInGroup,
          })
        }
        if (rows.length === 0) continue
        builtSections.push({
          label: key === UNGROUPED ? undefined : key,
          rows,
        })
        flatRows.push(...rows)
      }

      return {
        sections: builtSections,
        visibleRows: flatRows,
        renderedOptionCount: rendered,
        hiddenOptionCount: filtered.length - rendered,
      }
    }, [
      filtered,
      searching,
      selectedId,
      expandedGroups,
      maxVisiblePerGroup,
      maxVisibleWhenSearching,
    ])

  const rowCount = visibleRows.length
  const truncated = hiddenOptionCount > 0

  /**
   * 여는 시점에 현재 렌더 목록을 읽기 위한 손잡이.
   * `openPopover`가 `visibleRows`를 deps로 잡으면 옵션이 바뀔 때마다 콜백이 새로 만들어져
   * 트리거의 onClick 참조가 매번 갈린다 — 값만 필요하므로 ref로 읽는다.
   */
  const visibleRowsRef = useRef<PopoverRow[]>(visibleRows)
  visibleRowsRef.current = visibleRows

  /**
   * 닫기의 **단일 창구**(검토 INT-3/A11Y-5).
   *
   * 닫히는 경로가 다섯(Esc·옵션 확정·Tab·'전체 보기' 진입·바깥 클릭)인데 복귀를 각자
   * 처리하면 반드시 한 경로가 샌다 — 실제로 옵션 클릭·검색창 Esc 두 경로에서 포커스가
   * body로 떨어졌다. 바깥 클릭만 복귀 대상이 아니다: 사용자가 이미 다른 곳을 가리켰다.
   */
  const closePopover = useCallback((restoreFocus: boolean) => {
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
    setOpen(false)
    setQuery('')
    // 펼침은 이번 열림에 한정 — 다음에 열면 다시 요약된 첫 화면이다.
    setExpandedGroups(new Set())
  }, [])

  const openPopover = useCallback(() => {
    /**
     * 열자마자 현재 선택을 활성으로 — Enter 한 번이 '아무거나'를 고르지 않게.
     * 선택은 위 ⑴에 의해 자기 섹션 맨 앞에 항상 렌더되므로, 여기서 창 밖 인덱스를
     * 클램프하던 보정(옛 `maxVisible` 창)이 통째로 필요 없어졌다.
     */
    const index = visibleRowsRef.current.findIndex(
      (row) => row.kind === 'option' && row.option.id === selectedId,
    )
    setActiveIndex(index >= 0 ? index : 0)
    setOpen(true)
  }, [selectedId])

  // 닫기: 외부 클릭(Escape는 아래 키 핸들러 + useOverlayEscape 안전망)
  useEffect(() => {
    if (!open) return
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      // 팝오버는 body로 포털되어 wrapRef 밖에 있다. popoverRef를 함께 보지 않으면
      // 옵션을 누르는 mousedown이 "외부 클릭"으로 판정돼 click 전에 언마운트되고,
      // 결과적으로 아무것도 선택되지 않는다.
      if (wrapRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      /**
       * 이 mousedown에 뒤이어 올 click이 아래 요소로 새지 않게 1회 삼킨다(검토 INT-14).
       *
       * 예외: 다른 팝업 트리거로의 '한 번에 갈아타기'는 정상 조작이다. 카테고리를 연 채
       * 대륙을 누르는 클릭까지 먹으면 두 번 눌러야 열려, 고치려던 것보다 잦은 짜증이 된다.
       */
      const landsOnAnotherPopupTrigger =
        target instanceof Element && target.closest('[aria-haspopup]') !== null
      if (!landsOnAnotherPopupTrigger) {
        swallowReleaseRef.current?.()
        swallowReleaseRef.current = swallowNextDocumentClick()
      }
      closePopover(false)
    }
    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown)
    }
  }, [open, closePopover])

  // 삼킴 예약은 `open` 효과의 정리에서 풀면 안 된다 — 닫히는 그 순간 등록되기 때문에
  // 곧바로 해제돼 버린다. 언마운트에서만 정리한다(타이머는 스스로도 해제된다).
  useEffect(
    () => () => {
      swallowReleaseRef.current?.()
      window.clearTimeout(typeaheadRef.current.timerId)
    },
    [],
  )

  /**
   * Escape 안전망 — 포커스가 이 위젯 밖(예: body)에 있을 때만 여기까지 온다.
   * 트리거·검색창에 포커스가 있으면 아래 키 핸들러가 먼저 소비하고 전파를 끊는다.
   * 어느 경로든 전파를 끊어야 페이지의 window 핸들러가 같은 Esc를 '선택 해제'로
   * 재해석하지 않는다(검토 INT-1).
   */
  const closeFromDocumentEscape = useCallback(() => {
    const focused = document.activeElement
    // 위젯 안에서 난 Esc는 키 핸들러가 이미 소비했다. 전파 차단이 새더라도 여기서
    // 다시 닫으면 2단 규약 1회차('검색어만 지움')를 덮어써 팝오버가 닫혀 버린다.
    if (
      focused &&
      (wrapRef.current?.contains(focused) ||
        popoverRef.current?.contains(focused))
    ) {
      return
    }
    // 2단 규약은 전파 경로와 무관하게 지킨다 — 검색어가 남아 있으면 1회차는 그것만 지운다.
    if (query !== '') {
      setQuery('')
      return
    }
    closePopover(false)
  }, [query, closePopover])
  useOverlayEscape(open, closeFromDocumentEscape)

  // 검색 변종(국가)만 포커스를 입력으로 옮긴다 — select-only 변종은 트리거에 머문다.
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  // 목록이 줄면(검색·절단) 활성 인덱스가 범위를 벗어나 dangling activedescendant가 남는다.
  useEffect(() => {
    setActiveIndex((previous) =>
      previous > rowCount - 1 ? Math.max(0, rowCount - 1) : previous,
    )
  }, [rowCount])

  // 활성 옵션을 스크롤 안으로 — 50개 목록에서 하이라이트가 화면 밖으로 사라지지 않게.
  useEffect(() => {
    if (!open) return
    const node = document.getElementById(optionDomId(activeIndex))
    // jsdom에는 scrollIntoView 구현이 없다 — 존재를 확인하고 부른다.
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex, optionDomId])

  /**
   * 활성 옵션의 DOM id — **범위를 벗어나면 undefined**다.
   *
   * 옵션 수가 줄어드는 경로(검색·절단·참조 데이터 재조회)에서는 위 클램프 효과가 돌기
   * 전 한 커밋 동안 `activeIndex`가 목록 밖을 가리킨다. 그대로 내보내면
   * `aria-activedescendant`가 **존재하지 않는 id**를 참조해, 스크린리더는 '활성 옵션
   * 없음'도 아닌 침묵 상태가 된다(속성은 있는데 대상이 없다). 없으면 없다고 말한다.
   */
  const activeOptionId =
    open && activeIndex >= 0 && activeIndex < rowCount
      ? optionDomId(activeIndex)
      : undefined

  /**
   * 행 확정 — 옵션이면 선택하고 닫는다. 'N개 더 보기' 행이면 **그 섹션만 펼치고
   * 팝오버는 열어 둔다**(펼치려던 사람이 다시 열어야 한다면 어포던스가 아니다).
   * 펼친 직후에는 방금 드러난 첫 항목을 활성으로 옮겨 ↓ 를 이어서 누를 수 있게 한다.
   */
  const commitRow = useCallback(
    (row: PopoverRow | undefined) => {
      if (!row) return
      if (row.kind === 'more') {
        const revealFrom = activeIndex
        setExpandedGroups((previous) => {
          const next = new Set(previous)
          next.add(row.group)
          return next
        })
        setActiveIndex(revealFrom)
        return
      }
      onSelect(row.option.id)
      closePopover(true)
    },
    [activeIndex, onSelect, closePopover],
  )

  const moveActive = useCallback(
    (nextIndex: number) => {
      if (rowCount === 0) return
      // 끝에서 감싸지 않는다(clamp) — 네이티브 select·APG listbox와 같은 감각.
      setActiveIndex(Math.max(0, Math.min(nextIndex, rowCount - 1)))
    },
    [rowCount],
  )

  const runTypeahead = useCallback(
    (character: string) => {
      const state = typeaheadRef.current
      window.clearTimeout(state.timerId)
      state.buffer += character.toLowerCase()
      state.timerId = window.setTimeout(() => {
        state.buffer = ''
      }, TYPEAHEAD_RESET_MS)
      // '더 보기' 행은 타입어헤드 대상이 아니다 — 이름이 데이터가 아니라 조작 문구다.
      const found = visibleRows.findIndex(
        (row) =>
          row.kind === 'option' &&
          row.option.name.toLowerCase().startsWith(state.buffer),
      )
      if (found >= 0) setActiveIndex(found)
    },
    [visibleRows],
  )

  /**
   * 열린 목록의 키 처리 — 트리거(select-only)와 검색 입력(list-autocomplete)이 공유한다.
   * 처리했으면 true를 돌려 호출자가 자기 고유 분기로 내려가지 않게 한다.
   */
  const handleListNavigationKey = useCallback(
    (event: React.KeyboardEvent): boolean => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          moveActive(activeIndex + 1)
          return true
        case 'ArrowUp':
          event.preventDefault()
          moveActive(activeIndex - 1)
          return true
        case 'Home':
          event.preventDefault()
          moveActive(0)
          return true
        case 'End':
          event.preventDefault()
          moveActive(rowCount - 1)
          return true
        case 'Enter':
          // 버튼의 기본 동작(Enter→click→토글)을 막고 활성 옵션을 확정한다.
          event.preventDefault()
          commitRow(visibleRows[activeIndex])
          return true
        case 'Escape':
          event.preventDefault()
          // 이 Esc는 여기서 소비됐다 — window 핸들러가 '선택 해제'로 재해석하면 안 된다.
          event.stopPropagation()
          if (query !== '') {
            // 2단 규약 1회차: 검색어만 지운다(검토 INT-12). 팝오버는 열린 채 남는다.
            setQuery('')
            return true
          }
          closePopover(true)
          return true
        default:
          return false
      }
    },
    [
      activeIndex,
      rowCount,
      visibleRows,
      query,
      moveActive,
      commitRow,
      closePopover,
    ],
  )

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!open) {
      // 닫힌 상태의 ↑↓는 열기(APG). Enter·Space는 버튼 기본 동작(click)이 토글한다.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        openPopover()
      }
      return
    }
    if (event.key === 'Tab') {
      // 트리거에서의 Tab은 막지 않는다 — 목록만 닫고 다음 컨트롤로 자연스럽게 나간다.
      closePopover(false)
      return
    }
    if (event.key === ' ') {
      // select-only combobox의 Space = 확정. 검색 변종에서는 여기 오지 않는다(입력이 소비).
      event.preventDefault()
      commitRow(visibleRows[activeIndex])
      return
    }
    if (handleListNavigationKey(event)) return
    if (isTypeaheadKey(event)) {
      event.preventDefault()
      /**
       * 이 키는 열린 목록이 소비했다 — 전파를 끊지 않으면 페이지의 window 단축키
       * 핸들러(`useCatalogShortcuts`)가 같은 키를 다시 해석한다. 실제로 `/`는 목록
       * 검색창으로 **포커스를 끌고 가고**(팝오버는 열린 채 남는다), `?`는 단축키 도움말
       * 모달을 띄운다. 타입어헤드를 붙인 이상 트리거 위의 한 글자 입력은 여기 소유다.
       */
      event.stopPropagation()
      runTypeahead(event.key)
    }
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      /**
       * 검색 입력은 body 끝 포털 안에 있다. Tab을 그대로 두면 포커스가 문서 끝으로
       * 튀어 사용자가 툴바로 돌아올 길을 잃는다 — 닫고 트리거로 되돌린 뒤, 다음 Tab이
       * 툴바의 정상 순서를 따르게 한다.
       */
      event.preventDefault()
      closePopover(true)
      return
    }
    handleListNavigationKey(event)
  }

  /**
   * 팝오버 안 라이브 영역 문구(검토 INT-13/A11Y-9 · A11Y-8).
   * 열려 있는 동안 **항상 마운트**되고 텍스트만 바뀐다 — 마운트/언마운트로 알리면
   * 스크린리더가 놓친다. 절단(50개 창)도 여기서 수치로 고지한다.
   */
  /**
   * 값 슬롯을 렌더할지 — `aria-labelledby`가 참조하는 id와 **같은 조건**이어야 한다.
   * 둘이 갈리면 존재하지 않는 id를 가리켜 접근 이름이 통째로 비는 경로가 생긴다.
   */
  const showValue = isActive && !!valueLabel

  const liveAnnouncement = (() => {
    if (loadState === 'loading') return '목록을 불러오는 중'
    if (loadState === 'error') return '목록을 불러오지 못했습니다'
    if (renderedOptionCount === 0) return '조건에 맞는 항목 없음'
    /**
     * 고지 문구는 팝오버 안 어디에도 시각 텍스트로 없는 정보를 대신 말한다 —
     * 좁힘 사실(notice)은 위 행에 보이지만 SR 사용자에게는 목록 자체의 성질이다.
     */
    const noticePart = notice ? `${notice.text}. ` : ''
    if (truncated) {
      return `${noticePart}전체 ${filtered.length}개 중 ${renderedOptionCount}개 표시. 검색으로 좁힐 수 있습니다`
    }
    return `${noticePart}${renderedOptionCount}개 항목`
  })()

  /**
   * 한 행 렌더 — 옵션과 '더 보기'가 **같은 role·같은 하이라이트 규약**을 쓴다.
   * `flatIndex`는 섹션을 가로지르는 연속 인덱스라 `aria-activedescendant`의 대상 id다.
   */
  const renderRow = (row: PopoverRow, flatIndex: number) => {
    if (row.kind === 'more') {
      return (
        <Item
          key={`more:${row.group}`}
          id={optionDomId(flatIndex)}
          role="option"
          aria-selected={false}
          $selected={false}
          $active={flatIndex === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => setActiveIndex(flatIndex)}
          onClick={() => commitRow(row)}
        >
          <MoreLabel>{row.hiddenCount}개 더 보기</MoreLabel>
        </Item>
      )
    }
    const selected = row.option.id === selectedId
    return (
      <Item
        key={row.option.id}
        id={optionDomId(flatIndex)}
        role="option"
        aria-selected={selected}
        /**
         * 절단된 창을 SR에 정직하게 알린다(검토 A11Y-8) — setsize는 렌더된 수가 아니라
         * **그 섹션의** 전체 수다(섹션마다 상한이 따로라 전역 합계는 거짓말이 된다).
         */
        aria-setsize={row.setSize}
        aria-posinset={row.posInSet}
        $selected={selected}
        $active={flatIndex === activeIndex}
        // 포커스는 트리거(또는 검색 입력)에 머문다 — 옵션이 포커스를 훔치면
        // activedescendant 모델이 깨지고 닫힘 시 복귀 대상도 잃는다.
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={() => setActiveIndex(flatIndex)}
        onClick={() => commitRow(row)}
      >
        {row.option.prefix && (
          <ItemPrefix aria-hidden="true">{row.option.prefix}</ItemPrefix>
        )}
        <ItemName>{row.option.name}</ItemName>
        {/**
         * 건수(검토 IA-13) — '빈손 선택'을 누르기 전에 알린다.
         * `aria-hidden`이 아니다: 이 숫자가 옵션의 접근 이름에 포함돼야
         * SR 사용자도 같은 정보를 받는다('프랑스 12').
         */}
        {row.option.count !== undefined && (
          <ItemCount>{row.option.count}</ItemCount>
        )}
        {selected && <FiCheck size={12} aria-hidden="true" />}
      </Item>
    )
  }

  return (
    <PopoverWrap ref={wrapRef}>
      <Filter.FilterTriggerButton
        ref={triggerRef}
        type="button"
        $inGroup
        /**
         * 검색 변종은 팝오버 안 입력이 combobox 역할을 진다 — 한 listbox를 두 combobox가
         * 소유할 수는 없으므로 그때 트리거는 `aria-haspopup` 버튼으로 남는다.
         */
        role={searchable ? undefined : 'combobox'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={searchable ? undefined : activeOptionId}
        /**
         * 접근 이름을 **시각 텍스트 그대로** 조합한다(검토 INT-8/A11Y-4).
         * 값이 걸리면 '카테고리 정치', 미적용이면 '카테고리'.
         * 사이의 '·'는 장식이라 참조에서 뺀다 — 스크린리더가 문장부호를 읽어
         * 값 이름을 흐리게 만들 이유가 없다.
         */
        aria-labelledby={showValue ? `${axisNameId} ${valueNameId}` : axisNameId}
        data-active={isActive ? 'true' : undefined}
        onClick={() => (open ? closePopover(true) : openPopover())}
        onKeyDown={handleTriggerKeyDown}
      >
        {icon}
        {/* 필드명 · 값 2요소 — 값이 필드명을 치환하던 시절의 폭 요동을 끝낸다(검토 VIS-4) */}
        <Filter.TriggerAxis id={axisNameId}>{axisLabel}</Filter.TriggerAxis>
        {showValue && (
          <>
            <Filter.TriggerSeparator aria-hidden="true">
              ·
            </Filter.TriggerSeparator>
            {/* 말줄임되면 화면에서 전체를 못 읽는다 — title로 복구 경로를 둔다. */}
            <Filter.TriggerValue id={valueNameId} title={valueLabel}>
              {valueLabel}
            </Filter.TriggerValue>
          </>
        )}
        <FiChevronDown
          size={11}
          aria-hidden="true"
          style={{
            // 슬롯이 min-width로 고정돼 있으므로 셰브론은 우측 끝에 붙인다 —
            // 그래야 4개 트리거의 화살표가 같은 격자에 서서 '필드'로 읽힌다(검토 VIS-4).
            marginLeft: 'auto',
            opacity: 0.7,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s ease',
          }}
        />
      </Filter.FilterTriggerButton>
      {open &&
        position &&
        createPortal(
          /**
           * 팝오버 컨테이너에는 role을 주지 않는다 — 검색 행·상태 행·빈 행·푸터가
           * `role="listbox"`의 **무효 자식**이던 것을 풀기 위해, listbox는 옵션만 담는
           * `List`로 내렸다(검토 INT-13/A11Y-9 · A11Y-8).
           */
          <Popover
            ref={popoverRef}
            /**
             * 팝오버 **안의 버튼**('다시 시도'·'전체 보기 →')에 포커스가 있을 때의 Esc.
             *
             * 그 버튼들에는 키 핸들러가 없어 Esc가 document 안전망까지 내려갔는데,
             * 안전망은 "포커스가 위젯 안이면 키 핸들러가 이미 소비했다"고 보고 되돌아온다.
             * 결과는 **아무 일도 안 일어나는 막다른 골목**이었다(전파는 안전망이 이미
             * 끊어 놓아 페이지 Esc로 넘어가지도 않는다). 여기서 같은 2단 규약으로 받는다.
             * 검색 입력의 Esc는 자기 핸들러가 먼저 소비하고 전파를 끊으므로 오지 않는다.
             */
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              event.stopPropagation()
              if (query !== '') {
                setQuery('')
                return
              }
              closePopover(true)
            }}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
              maxHeight: position.maxHeight,
            }}
          >
            {searchable && (
              <SearchRow>
                <FiSearch size={12} aria-hidden="true" />
                <SearchInput
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeOptionId}
                  value={query}
                  placeholder="검색…"
                  onChange={(event) => {
                    setQuery(event.target.value)
                    // 타이핑하면 상위 매치를 활성으로 — Enter 한 번에 첫 결과가 확정된다.
                    setActiveIndex(0)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  aria-label={`${axisLabel} 검색`}
                />
                {query !== '' && (
                  // Esc 1회차와 같은 일을 하는 마우스 어포던스(검토 INT-12).
                  <SearchClearButton
                    type="button"
                    aria-label="검색어 지우기"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                  >
                    <FiX size={12} aria-hidden="true" />
                  </SearchClearButton>
                )}
              </SearchRow>
            )}
            {/**
             * 참조 데이터 상태 행 — '아직 안 옴'과 '영영 실패'를 구분한다(검토 GAP-5).
             * 예전엔 둘 다 '전체' 하나만 있는 목록이라 사용자에겐 완전히 같은 화면이었고,
             * 그 상태는 필터가 걸린 공유 링크를 열 때마다 지나가는 정상 구간이기도 하다.
             *
             * ⚠️ role은 아래 단일 라이브 영역이 진다 — 여기에도 role="status"를 두면
             * 같은 사실이 두 번 announce된다.
             */}
            {loadState === 'loading' && (
              <StatusRow>목록을 불러오는 중…</StatusRow>
            )}
            {loadState === 'error' && (
              <StatusRow>
                <span>목록을 불러오지 못했습니다</span>
                {onRetryLoad && (
                  <StatusActionButton type="button" onClick={onRetryLoad}>
                    다시 시도
                  </StatusActionButton>
                )}
              </StatusRow>
            )}
            {/**
             * 좁힘 고지 + 인라인 해제(검토 IA-1). 대륙→국가는 개념상 계층인데 옵션도
             * 술어도 평행이라, '아시아'를 걸어 둔 채 국가를 찾다 못 찾는 사람에게
             * 원인을 말해 주는 자리가 어디에도 없었다. listbox **밖** 형제다.
             */}
            {notice && (
              <StatusRow>
                <span>{notice.text}</span>
                {notice.actionLabel && notice.onAction && (
                  <StatusActionButton
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={notice.onAction}
                  >
                    {notice.actionLabel}
                  </StatusActionButton>
                )}
              </StatusRow>
            )}
            <VisuallyHidden role="status" aria-live="polite">
              {liveAnnouncement}
            </VisuallyHidden>
            <List id={listboxId} role="listbox" aria-label={`${axisLabel} 옵션`}>
              {(() => {
                /**
                 * 활성 인덱스는 **섹션을 가로질러 연속**이다(평평한 `visibleRows` 기준).
                 * 여기서도 같은 순서로 세어야 `aria-activedescendant`가 가리키는 id와
                 * 실제 하이라이트가 어긋나지 않는다.
                 */
                let flatIndex = 0
                return sections.map((section, sectionIndex) => {
                  const rows = section.rows.map((row) =>
                    renderRow(row, flatIndex++),
                  )
                  if (!section.label) {
                    return (
                      <React.Fragment key={`section-${sectionIndex}`}>
                        {rows}
                      </React.Fragment>
                    )
                  }
                  return (
                    // role="group"은 listbox의 **유효한** 자식이다 — 소제목을 그냥
                    // div로 끼우면 옵션 사이에 정체불명 텍스트가 끼는 셈이 된다.
                    <Group
                      key={`section-${section.label}`}
                      role="group"
                      aria-label={section.label}
                    >
                      <GroupHeading aria-hidden="true">
                        {section.label}
                      </GroupHeading>
                      {rows}
                    </Group>
                  )
                })
              })()}
            </List>
            {renderedOptionCount === 0 && (
              <Empty>조건에 맞는 항목이 없습니다</Empty>
            )}
            {(truncated || onShowMoreModal) && (
              <Footer>
                {truncated && (
                  <FooterHint>
                    {searching
                      ? `조건에 맞는 ${filtered.length}개 중 ${renderedOptionCount}개 표시`
                      : `전체 ${filtered.length}개 중 ${renderedOptionCount}개 표시`}
                  </FooterHint>
                )}
                {onShowMoreModal && (
                  <FooterAction
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      /**
                       * 모달을 열기 **전에** 트리거로 포커스를 되돌린다(검토 INT-4).
                       * 팝오버가 모달보다 먼저 언마운트되므로, 순서를 바꾸면 모달이
                       * 기억하는 previouslyFocused가 body가 되어 닫아도 돌아올 곳이 없다.
                       */
                      closePopover(true)
                      onShowMoreModal()
                    }}
                  >
                    전체 보기 →
                  </FooterAction>
                )}
              </Footer>
            )}
          </Popover>,
          document.body,
        )}
    </PopoverWrap>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled — popover
// ─────────────────────────────────────────────────────────────────────────────

const PopoverWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
`

/**
 * body로 포털되어 뜬다 — `top`/`left`/`minWidth`/`maxHeight`는 useAnchoredPosition이
 * 인라인 스타일로 주입한다. 툴바 안에서 absolute로 띄우면 FilterGroup의
 * `overflow: hidden`에 잘리므로 이 컴포넌트를 다시 DOM 자식으로 되돌리지 말 것.
 * (같은 이유로 FilterGroup의 `& button { ...!important }` 자손 리셋도 더 이상 닿지 않는다.)
 */
const Popover = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.DROPDOWN};
  min-width: 200px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.1);
         box-shadow: ${SHADOW.mdDark};`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.1);
         box-shadow: ${SHADOW.md};`}
  overflow: hidden;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  min-width: 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 검색어 지우기 ✕ — Esc 2단 규약 1회차의 마우스 대응(검토 INT-12) */
const SearchClearButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/** 시각적으로 숨기되 보조기술엔 노출 — 라이브 영역·접근 이름 조각용 표준 sr-only */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  /* 뷰포트가 짧으면 Popover의 maxHeight가 더 작다 — flex 축소로 그 안에 맞춘다. */
  flex: 1 1 auto;
  min-height: 0;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(37, 99, 235, 0.2);
    border-radius: 3px;
  }
`

/**
 * 옵션 행 — `<button>`이 아니라 `<div role="option">`이다(검토 INT-2/A11Y-1).
 *
 * 버튼이던 시절 국가 팝오버는 탭 정지점을 50개 만들어, Tab으로 툴바를 지나가려던
 * 사용자를 목록 안에 가뒀다. combobox 모델에서 옵션은 포커스를 받지 않고
 * `aria-activedescendant`가 가리키기만 한다 — 그래서 `$active`가 포커스 링을 대신한다.
 */
const Item = styled.div<{ $selected: boolean; $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $selected, $active, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover
      : $active
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(15,23,42,0.05)'
        : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  /* 활성(키보드 커서) 표시 — 선택(체크)과 색이 겹치지 않게 안쪽 테두리로 낸다. */
  box-shadow: ${({ $active }) =>
    $active ? `inset 0 0 0 1px ${BRAND.primaryBorderHover}` : 'none'};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  text-align: left;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/**
 * 옵션 섹션(검토 IA-2) — `role="group"`은 listbox의 유효한 자식이고,
 * 그 안의 옵션은 여전히 listbox 소속이다. `aria-activedescendant` 순회는
 * 섹션을 가로질러 연속이므로(평평한 인덱스) 그룹은 시각·의미 구획만 진다.
 */
const Group = styled.div`
  display: flex;
  flex-direction: column;

  /* 첫 섹션 위에는 구분선을 두지 않는다 — '전체' 바로 밑이라 이미 경계가 보인다. */
  & + & {
    margin-top: 2px;
  }
`

const GroupHeading = styled.div`
  padding: 6px 10px 3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: none;
`

const ItemPrefix = styled.span`
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
`

/**
 * 옵션 우측 건수(검토 IA-13) — '이걸 고르면 몇 건'.
 * 색 단독으로만 약화하고 크기는 유지한다(작게까지 만들면 저시력에서 읽히지 않는다).
 */
const ItemCount = styled.span`
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 'N개 더 보기' 행의 라벨 — 데이터가 아니라 조작이라 색으로 구분한다 */
const MoreLabel = styled.span`
  flex: 1;
  min-width: 0;
  color: ${BRAND.primary};
  font-weight: 600;
`

const ItemName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Empty = styled.div`
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 참조 데이터 로딩·실패 고지 행 — 옵션 목록 바로 위.
 * `SearchRow`·`Empty`·`Footer`와 함께 `role="listbox"`(=`List`) **밖** 형제다.
 * 예전엔 넷 다 listbox 컨테이너 안의 무효 자식이었다(검토 INT-13/A11Y-9 · A11Y-8).
 * 음성 고지는 이 행이 아니라 팝오버 안 단일 라이브 영역이 진다.
 */
const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

/** 상태 행의 인라인 액션 — 참조 재조회(GAP-5)와 좁힘 해제(IA-1)가 함께 쓴다 */
const StatusActionButton = styled.button`
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${BRAND.primary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.14)'
        : BRAND.primarySoftHover};
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 11px;
`

const FooterHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  letter-spacing: -0.005em;
`

const FooterAction = styled.button`
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${BRAND.primary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.14)'
        : BRAND.primarySoftHover};
  }
`
