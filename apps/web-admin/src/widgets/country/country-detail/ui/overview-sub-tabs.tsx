import React from 'react'

import * as S from './overview-sub-tabs.styles'

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

export const OverviewSubTabs: React.FC<OverviewSubTabsProps> = ({
  activeSubTab,
  onSubTabChange,
  rightSlot,
}) => {
  return (
    <S.Row>
      <S.Left>
        <S.TabBar>
          <S.TabButton
            $active={activeSubTab === 'statistics'}
            onClick={() => onSubTabChange('statistics')}
          >
            대시보드
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'linkedHistorical'}
            onClick={() => onSubTabChange('linkedHistorical')}
          >
            역사적 국가
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'map'}
            onClick={() => onSubTabChange('map')}
          >
            행정구역
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'government'}
            onClick={() => onSubTabChange('government')}
          >
            행정조직
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'ethnicity'}
            onClick={() => onSubTabChange('ethnicity')}
          >
            민족
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'person'}
            onClick={() => onSubTabChange('person')}
          >
            인물
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'history'}
            onClick={() => onSubTabChange('history')}
          >
            역사
          </S.TabButton>
        </S.TabBar>
      </S.Left>
      <S.Right>{rightSlot}</S.Right>
    </S.Row>
  )
}
