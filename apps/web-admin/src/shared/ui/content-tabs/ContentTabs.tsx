/**
 * 공통 콘텐츠 탭 (연대표·행정조직·인물 등 서브 탭용)
 * 행정조직 상세와 동일한 인디고 스타일 적용
 */
import React from 'react'
import styled from 'styled-components'

/** 행정조직에서 주로 사용하는 액센트 (인디고) */
const ACCENT_ACTIVE = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
const ACCENT_ACTIVE_HOVER = 'linear-gradient(135deg, #4f46e5, #7c3aed)'
const ACCENT_INACTIVE_HOVER = 'rgba(99, 102, 241, 0.08)'
const ACCENT_TEXT = '#6366f1'
const TEXT_MUTED = '#64748b'

export interface ContentTabItem {
  id: string
  label: string
  icon?: React.ReactNode
}

export interface ContentTabsProps {
  tabs: ContentTabItem[]
  activeId: string
  onChange: (id: string) => void
  /** 탭 오른쪽에 배치할 액션 (예: 카테고리 설정 버튼) */
  rightSlot?: React.ReactNode
  /** 탭 버튼이 동일 너비로 퍼지지 않고 콘텐츠 기준 (기본: true = flex: 1) */
  equalWidth?: boolean
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const TabNav = styled.nav`
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  overflow-x: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active: boolean; $equalWidth?: boolean }>`
  flex: ${(p) => (p.$equalWidth !== false ? 1 : '0 0 auto')};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#ffffff' : TEXT_MUTED)};
  background: ${(p) => (p.$active ? ACCENT_ACTIVE : 'transparent')};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    background: ${(p) => (p.$active ? ACCENT_ACTIVE_HOVER : ACCENT_INACTIVE_HOVER)};
    color: ${(p) => (p.$active ? '#ffffff' : ACCENT_TEXT)};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 12px;
  }
`

const RightSlot = styled.div`
  flex-shrink: 0;
`

export function ContentTabs({
  tabs,
  activeId,
  onChange,
  rightSlot,
  equalWidth = true,
}: ContentTabsProps) {
  return (
    <Wrapper>
      <TabNav role="tablist">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            $active={activeId === tab.id}
            $equalWidth={equalWidth}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </TabButton>
        ))}
      </TabNav>
      {rightSlot && <RightSlot>{rightSlot}</RightSlot>}
    </Wrapper>
  )
}
