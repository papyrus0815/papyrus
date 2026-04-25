/**
 * 국가 리스트 빈 상태 — 검색·필터 분기에 따라 4가지 메시지.
 */
import React from 'react'

import { FiSearch } from 'react-icons/fi'

import type { CountryTypeFilter } from '@/entities/country/model/unified-types'

import * as S from './country-list.styles'

interface CountryListEmptyProps {
  query: string
  continentFilter: string
  countryTypeFilter: CountryTypeFilter
  onAdd: () => void
}

export function CountryListEmpty({
  query,
  continentFilter,
  countryTypeFilter,
  onAdd,
}: CountryListEmptyProps) {
  return (
    <S.EmptyFilterState>
      <S.EmptyFilterIcon>
        <FiSearch size={28} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>
        {query
          ? '일치하는 국가가 없어요'
          : countryTypeFilter === 'historical'
            ? '등록된 과거 국가가 없어요'
            : countryTypeFilter === 'modern'
              ? '등록된 현대 국가가 없어요'
              : '등록된 국가가 없어요'}
      </S.EmptyFilterTitle>
      <S.EmptyFilterText>
        {query && (
          <>
            <strong>"{query}"</strong> 검색어와 일치하는 국가를 찾지 못했어요.
            <br />
            다른 검색어를 시도하거나 새 국가를 등록해보세요.
          </>
        )}
        {!query && continentFilter && (
          <>
            선택한 대륙에 등록된 국가가 없어요.
            <br />
            필터를 초기화하거나 새 국가를 등록해보세요.
          </>
        )}
        {!query && countryTypeFilter === 'historical' && (
          <>
            과거(역사적) 국가를 등록한 뒤, 현대 국가 편집에서 &quot;연결할 현대
            국가&quot;로 지정하면 여기에 표시됩니다.
            <br />
            필터를 초기화하면 현대 국가 목록을 볼 수 있어요.
          </>
        )}
        {!query &&
          !continentFilter &&
          countryTypeFilter !== 'historical' && (
            <>
              아직 등록된 국가가 없어요.
              <br />첫 국가를 등록해서 시작해보세요.
            </>
          )}
      </S.EmptyFilterText>
      <S.EmptyFilterActions>
        <S.AddButton onClick={onAdd}>
          <S.AddButtonIcon>➕</S.AddButtonIcon>새 국가 등록
        </S.AddButton>
      </S.EmptyFilterActions>
    </S.EmptyFilterState>
  )
}
