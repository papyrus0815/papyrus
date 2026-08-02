/**
 * 사이드바 공통 헤더 — 국가 리스트와 인물 필터 패널이 같은 머리를 갖도록.
 *
 * 좌측: 타이틀 + 카운트 배지
 * 우측: 부가 액션(예: + 등록 버튼) + 접기 버튼
 */
import React from 'react'

import { FiChevronLeft } from 'react-icons/fi'
import styled from 'styled-components'

interface SidebarHeaderProps {
  title: React.ReactNode
  /** 타이틀 옆에 표시할 카운트 (선택) */
  count?: number | string
  /** 카운트 배지에 붙일 tooltip — 분수 카운트의 의미 설명용 (선택) */
  countTitle?: string
  /** 우측 추가 액션 (예: + 등록) */
  action?: React.ReactNode
  /** 접기 버튼이 호출할 핸들러. 없으면 접기 버튼 숨김 */
  onCollapse?: () => void
}

export function SidebarHeader({
  title,
  count,
  countTitle,
  action,
  onCollapse,
}: SidebarHeaderProps) {
  return (
    <Root>
      <Left>
        <Title>{title}</Title>
        {count !== undefined && <Count title={countTitle}>{count}</Count>}
      </Left>
      <Right>
        {action}
        {onCollapse && (
          <CollapseBtn
            type="button"
            onClick={onCollapse}
            aria-label="패널 접기"
            title="패널 접기"
          >
            <FiChevronLeft size={16} />
          </CollapseBtn>
        )}
      </Right>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const Title = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Count = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  padding: 2px 7px;
  border-radius: 999px;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const CollapseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
