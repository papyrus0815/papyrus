/**
 * 인물 목록 검색·필터 행 — 국가 목록(CountryListFilters)과 같은 조판.
 *
 * 검색 인풋 + 시대/지역/정렬 셀렉트 + 초기화, 그 아래 유도 배지 줄.
 *
 * 셀렉트는 단일 선택이지만 store의 scope는 다중 선택이다(상세 필터 패널에서 여러 개 고를 수 있음).
 * 2개 이상 선택된 카테고리는 '시대 3개' 같은 요약 옵션으로 표시하고, 값 변경은 단일 선택으로
 * 덮어쓴다 — 셀렉트가 다중 상태를 조용히 지우지 않도록 요약 옵션을 고르면 아무 일도 하지 않는다.
 */
import React from 'react'

import * as S from '@/shared/ui/sidebar-list'
import {
  ERAS,
  SORT_OPTIONS,
  usePersonInfographicFilterStore,
  type PersonSortKey,
} from '@/widgets/person-infographic'

import * as PersonStyles from './person-list.styles'

/** 2개 이상 선택된 카테고리를 표시하기 위한 sentinel */
const MULTI = '__multi__'

interface PersonListFiltersProps {
  /** 검색 인풋 값 (로컬 즉시 반영 — 커밋은 상위가 디바운스) */
  searchInput: string
  onSearchInputChange: (value: string) => void
  /** 검색 인풋에서 ↓ 키 → 첫 행으로 포커스 이동 */
  onSearchKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  /** 데이터에 실제로 존재하는 지역 목록 (빈 옵션 노출 방지) */
  regionOptions: string[]
  /** 상세 필터(다중 스코프·영향력·생존) 열기 */
  onOpenAdvanced: () => void
  /** 셀렉트로 표현되지 않는 상세 필터의 활성 개수 */
  advancedActiveCount: number
  onClearFilters: () => void
  hasActiveFilter: boolean
}

export function PersonListFilters({
  searchInput,
  onSearchInputChange,
  onSearchKeyDown,
  regionOptions,
  onOpenAdvanced,
  advancedActiveCount,
  onClearFilters,
  hasActiveFilter,
}: PersonListFiltersProps) {
  const scopes = usePersonInfographicFilterStore((state) => state.scopes)
  const setScopeValues = usePersonInfographicFilterStore(
    (state) => state.setScopeValues,
  )
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const setSort = usePersonInfographicFilterStore((state) => state.setSort)

  const selectValue = (values: string[]) =>
    values.length === 0 ? '' : values.length === 1 ? values[0] : MULTI

  const handleScopeChange =
    (kind: 'era' | 'region') => (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value
      if (next === MULTI) return // 요약 옵션 — 다중 선택을 지우지 않는다
      setScopeValues(kind, next ? [next] : [])
    }

  return (
    <S.FilterRow>
      <S.SearchWrapper>
        <S.SearchIcon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </S.SearchIcon>
        <S.SearchInput
          type="search"
          aria-label="인물 검색"
          placeholder="인물 검색..."
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
        {searchInput && (
          <S.ClearButton
            onClick={() => onSearchInputChange('')}
            aria-label="지우기"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </S.ClearButton>
        )}
      </S.SearchWrapper>

      <S.FilterWrapper>
        <S.FilterSelect
          value={selectValue(scopes.era)}
          onChange={handleScopeChange('era')}
          $active={scopes.era.length > 0}
          aria-label="시대"
        >
          <option value="">시대 전체</option>
          {scopes.era.length > 1 && (
            <option value={MULTI}>시대 {scopes.era.length}개</option>
          )}
          {ERAS.map((era) => (
            <option key={era.key} value={era.key}>
              {era.lbl}
            </option>
          ))}
        </S.FilterSelect>

        <S.FilterSelect
          value={selectValue(scopes.region)}
          onChange={handleScopeChange('region')}
          $active={scopes.region.length > 0}
          aria-label="지역"
        >
          <option value="">지역 전체</option>
          {scopes.region.length > 1 && (
            <option value={MULTI}>지역 {scopes.region.length}개</option>
          )}
          {regionOptions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </S.FilterSelect>

        <S.FilterSelect
          value={sort}
          onChange={(event) => setSort(event.target.value as PersonSortKey)}
          aria-label="정렬"
        >
          {SORT_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}순
            </option>
          ))}
        </S.FilterSelect>

        {hasActiveFilter && (
          <S.ClearAllFiltersButton onClick={onClearFilters}>
            초기화
          </S.ClearAllFiltersButton>
        )}
      </S.FilterWrapper>

      <PersonStyles.DiscoveryRow>
        <PersonStyles.AdvancedFilterBadge
          type="button"
          onClick={onOpenAdvanced}
          title="분야·국가 다중 선택, 영향력, 생존 여부"
        >
          상세 필터
          {advancedActiveCount > 0 && (
            <PersonStyles.BadgeCount>{advancedActiveCount}</PersonStyles.BadgeCount>
          )}
        </PersonStyles.AdvancedFilterBadge>
        {advancedActiveCount > 0 && (
          <PersonStyles.ActiveAdvancedHint title="셀렉트에 드러나지 않는 필터가 적용 중입니다">
            적용 중 {advancedActiveCount}
          </PersonStyles.ActiveAdvancedHint>
        )}
      </PersonStyles.DiscoveryRow>
    </S.FilterRow>
  )
}
