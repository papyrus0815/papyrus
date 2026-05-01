/**
 * 인포그래픽 뷰 공용 빈 상태 표시.
 *
 * 필터가 활성화된 상태이면 "필터 해제" CTA를 함께 노출하여,
 * 사용자가 데이터가 없는 건지 / 필터 때문인지 즉시 구분할 수 있게 함.
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'

interface EmptyStateProps {
  /** 메인 메시지 (예: "인물 데이터가 없습니다") */
  title?: ReactNode
  /** 보조 설명 */
  description?: ReactNode
  /** 필터 활성화 여부 — true면 안내 + CTA */
  hasActiveFilter?: boolean
  /** 필터 모두 해제 콜백 */
  onClearFilters?: () => void
}

export function EmptyState({
  title,
  description,
  hasActiveFilter,
  onClearFilters,
}: EmptyStateProps) {
  const finalTitle =
    title ??
    (hasActiveFilter
      ? '조건에 맞는 인물이 없습니다'
      : '인물 데이터가 없습니다')
  const finalDesc =
    description ??
    (hasActiveFilter
      ? '현재 필터에 일치하는 인물이 없어요. 필터를 해제해 전체를 보세요.'
      : null)

  return (
    <Wrap>
      <Title>{finalTitle}</Title>
      {finalDesc && <Desc>{finalDesc}</Desc>}
      {hasActiveFilter && onClearFilters && (
        <ClearBtn type="button" onClick={onClearFilters}>
          필터 모두 해제
        </ClearBtn>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`

const Title = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Desc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 320px;
  line-height: 1.55;
`

const ClearBtn = styled.button`
  margin-top: 6px;
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`
