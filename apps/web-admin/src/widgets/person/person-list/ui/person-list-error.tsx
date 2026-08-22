/**
 * 인물 목록 로딩 실패 — 빈 상태로 위장하지 않고 재시도 경로를 제공 (국가 목록과 동일 규약).
 */
import React from 'react'

import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

import * as S from '@/shared/ui/sidebar-list'

interface PersonListErrorProps {
  onRetry: () => void
}

export function PersonListError({ onRetry }: PersonListErrorProps) {
  return (
    <S.EmptyFilterState role="alert">
      <S.EmptyFilterIcon>
        <FiAlertTriangle size={26} />
      </S.EmptyFilterIcon>
      <S.EmptyFilterTitle>목록을 불러오지 못했어요</S.EmptyFilterTitle>
      <S.EmptyFilterText>
        네트워크 또는 서버 문제로 인물 목록을 가져오지 못했어요.
        <br />
        잠시 후 다시 시도해주세요.
      </S.EmptyFilterText>
      <S.EmptyFilterActions>
        <S.AddButton type="button" onClick={onRetry}>
          <S.AddButtonIcon>
            <FiRefreshCw size={15} />
          </S.AddButtonIcon>
          다시 시도
        </S.AddButton>
      </S.EmptyFilterActions>
    </S.EmptyFilterState>
  )
}
