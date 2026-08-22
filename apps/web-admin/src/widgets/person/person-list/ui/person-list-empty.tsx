/**
 * 인물 목록 빈 상태 — 국가 목록 빈 상태와 같은 조판. 검색·필터 분기에 따라 메시지 분기.
 */
import React from 'react'

import { FiSearch } from 'react-icons/fi'

import * as S from '@/shared/ui/sidebar-list'

interface PersonListEmptyProps {
  query: string
  hasActiveFilter: boolean
  onAdd: () => void
}

export function PersonListEmpty({
  query,
  hasActiveFilter,
  onAdd,
}: PersonListEmptyProps) {
  return (
    <S.EmptyFilterState>
      <S.EmptyFilterIcon>
        <FiSearch size={28} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>
        {query
          ? '일치하는 인물이 없어요'
          : hasActiveFilter
            ? '조건에 맞는 인물이 없어요'
            : '등록된 인물이 없어요'}
      </S.EmptyFilterTitle>
      <S.EmptyFilterText>
        {query ? (
          <>
            <strong>&quot;{query}&quot;</strong> 검색어와 일치하는 인물을 찾지
            못했어요.
            <br />
            다른 검색어를 시도하거나 새 인물을 등록해보세요.
          </>
        ) : hasActiveFilter ? (
          <>
            시대·지역·상세 필터를 모두 만족하는 인물이 없어요.
            <br />
            필터를 초기화하면 전체 인물을 볼 수 있어요.
          </>
        ) : (
          <>
            아직 등록된 인물이 없어요.
            <br />첫 인물을 등록해서 시작해보세요.
          </>
        )}
      </S.EmptyFilterText>
      <S.EmptyFilterActions>
        <S.AddButton type="button" onClick={onAdd}>
          <S.AddButtonIcon>➕</S.AddButtonIcon>새 인물 등록
        </S.AddButton>
      </S.EmptyFilterActions>
    </S.EmptyFilterState>
  )
}
