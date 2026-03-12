import React from 'react'

import styled from 'styled-components'

export type OverviewSubTab =
  | 'statistics'
  | 'linkedHistorical'
  | 'map'
  | 'government'
  | 'ethnicity'
  | 'person'
  | 'history'

interface OverviewSubTabsProps {
  activeSubTab: OverviewSubTab
  onSubTabChange: (tab: OverviewSubTab) => void
  /** 우측에 배치할 액션 (예: 행정조직 탭일 때 카테고리 설정 버튼) */
  rightSlot?: React.ReactNode
}

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 24px;
`

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const TabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin: 0;
  overflow-x: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? '#c7d2fe' : 'transparent')};
  background: ${({ $active }) => ($active ? '#eef2ff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4338ca' : '#64748b')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: ${({ $active }) => ($active ? '#4338ca' : '#475569')};
    background: ${({ $active }) => ($active ? '#eef2ff' : '#f8fafc')};
    border-color: ${({ $active }) => ($active ? '#c7d2fe' : '#e2e8f0')};
  }
`

export const OverviewSubTabs: React.FC<OverviewSubTabsProps> = ({
  activeSubTab,
  onSubTabChange,
  rightSlot,
}) => {
  return (
    <Row>
      <Left>
        <TabBar>
          <TabButton
            $active={activeSubTab === 'statistics'}
            onClick={() => onSubTabChange('statistics')}
          >
            대시보드
          </TabButton>
          <TabButton
            $active={activeSubTab === 'linkedHistorical'}
            onClick={() => onSubTabChange('linkedHistorical')}
          >
            역사적 국가
          </TabButton>
          <TabButton
            $active={activeSubTab === 'map'}
            onClick={() => onSubTabChange('map')}
          >
            행정구역
          </TabButton>
          <TabButton
            $active={activeSubTab === 'government'}
            onClick={() => onSubTabChange('government')}
          >
            행정조직
          </TabButton>
          <TabButton
            $active={activeSubTab === 'ethnicity'}
            onClick={() => onSubTabChange('ethnicity')}
          >
            민족
          </TabButton>
          <TabButton
            $active={activeSubTab === 'person'}
            onClick={() => onSubTabChange('person')}
          >
            인물
          </TabButton>
          <TabButton
            $active={activeSubTab === 'history'}
            onClick={() => onSubTabChange('history')}
          >
            역사
          </TabButton>
        </TabBar>
      </Left>
      <Right>{rightSlot}</Right>
    </Row>
  )
}
