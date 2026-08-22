/**
 * 사이드바 공통 헤더 — 모든 목록 사이드바가 같은 머리를 갖도록.
 *
 * 좌측: 지면 제목(18px) + 그 아래 개수 줄
 * 우측: 부가 액션(예: + 등록 버튼) + 접기 버튼
 *
 * 개수를 제목 옆 작은 배지로 붙이던 시절엔 제목과 수가 같은 줄에서 크기를 다투느라 둘 다
 * 작아졌다. 줄을 나누면 제목은 지면 제목답게 커지고 수는 보조 정보 자리로 내려간다.
 */
import React from 'react'

import { FiChevronLeft } from 'react-icons/fi'
import styled from 'styled-components'

interface SidebarHeaderProps {
  title: React.ReactNode
  /** 제목 아래 보조 줄 — 보통 '71개' 또는 '9 / 71개' */
  subtitle?: React.ReactNode
  /** 보조 줄 tooltip — 분수 카운트의 의미 설명용 (선택) */
  subtitleTitle?: string
  /** 우측 추가 액션 (예: + 등록) */
  action?: React.ReactNode
  /** 접기 버튼이 호출할 핸들러. 없으면 접기 버튼 숨김 */
  onCollapse?: () => void
}

export function SidebarHeader({
  title,
  subtitle,
  subtitleTitle,
  action,
  onCollapse,
}: SidebarHeaderProps) {
  return (
    <Root>
      <Left>
        <Title>{title}</Title>
        {subtitle !== undefined && (
          <Subtitle title={subtitleTitle}>{subtitle}</Subtitle>
        )}
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
            <FiChevronLeft size={18} />
          </CollapseBtn>
        )}
      </Right>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  /* 상단 여백 — 예전엔 제목이 뷰포트 맨 위에 붙어 숨 쉴 자리가 없었다 */
  padding: 18px 14px 14px;
  /* 표면 톤 계단: 사이드바는 본문보다 한 단계 진하다(레일 < 사이드바 < 본문) */
  background: transparent;
`

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Title = styled.span`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Subtitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  /* 제목 첫 줄과 눈높이를 맞춘다 */
  margin-top: 1px;
`

const CollapseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
