/**
 * 사이드바 빈 상태 / 로딩 실패 상태 — 모든 도메인 공용.
 * 실패를 '없음'으로 위장하지 않도록 둘을 분리하고, 실패 쪽엔 등록 CTA 대신 재시도를 둔다.
 */
import React from 'react'

import { FiAlertTriangle, FiRefreshCw, FiSearch } from 'react-icons/fi'

import * as S from '@/shared/ui/sidebar-list'

interface EntitySidebarEmptyProps {
  /** '국가' '인물' 같은 도메인 명사 */
  noun: string
  query: string
  hasActiveFilter: boolean
  addLabel?: string
  onAdd?: () => void
}

export function EntitySidebarEmpty({
  noun,
  query,
  hasActiveFilter,
  addLabel,
  onAdd,
}: EntitySidebarEmptyProps) {
  return (
    <S.EmptyFilterState>
      <S.EmptyFilterIcon>
        <FiSearch size={28} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>
        {query
          ? `일치하는 ${noun}이(가) 없어요`
          : hasActiveFilter
            ? `조건에 맞는 ${noun}이(가) 없어요`
            : `등록된 ${noun}이(가) 없어요`}
      </S.EmptyFilterTitle>
      <S.EmptyFilterText>
        {query ? (
          <>
            <strong>&quot;{query}&quot;</strong> 검색어와 일치하는 {noun}을(를)
            찾지 못했어요.
            <br />
            다른 검색어를 시도해보세요.
          </>
        ) : hasActiveFilter ? (
          <>
            선택한 필터를 모두 만족하는 {noun}이(가) 없어요.
            <br />
            필터를 초기화하면 전체를 볼 수 있어요.
          </>
        ) : (
          <>
            아직 등록된 {noun}이(가) 없어요.
            <br />첫 {noun}을(를) 등록해서 시작해보세요.
          </>
        )}
      </S.EmptyFilterText>
      {onAdd && addLabel && (
        <S.EmptyFilterActions>
          <S.AddButton type="button" onClick={onAdd}>
            <S.AddButtonIcon>➕</S.AddButtonIcon>
            {addLabel}
          </S.AddButton>
        </S.EmptyFilterActions>
      )}
    </S.EmptyFilterState>
  )
}

interface EntitySidebarErrorProps {
  noun: string
  onRetry?: () => void
}

export function EntitySidebarError({ noun, onRetry }: EntitySidebarErrorProps) {
  return (
    <S.EmptyFilterState role="alert">
      <S.EmptyFilterIcon>
        <FiAlertTriangle size={26} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>목록을 불러오지 못했어요</S.EmptyFilterTitle>
      <S.EmptyFilterText>
        네트워크 또는 서버 문제로 {noun} 목록을 가져오지 못했어요.
        <br />
        잠시 후 다시 시도해주세요.
      </S.EmptyFilterText>
      {onRetry && (
        <S.EmptyFilterActions>
          <S.AddButton type="button" onClick={onRetry}>
            <S.AddButtonIcon>
              <FiRefreshCw size={15} />
            </S.AddButtonIcon>
            다시 시도
          </S.AddButton>
        </S.EmptyFilterActions>
      )}
    </S.EmptyFilterState>
  )
}
