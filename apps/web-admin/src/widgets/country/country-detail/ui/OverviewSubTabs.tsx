import React from 'react'

import styled from 'styled-components'

import * as S from '@/pages/history/country/country.styles'

export type OverviewSubTab =
  | 'statistics'
  | 'map'
  | 'government'
  | 'person'
  | 'history'

interface OverviewSubTabsProps {
  activeSubTab: OverviewSubTab
  onSubTabChange: (tab: OverviewSubTab) => void
}

const StyledControlsRow = styled(S.ControlsRow)`
  padding: 8px 0;
  margin-bottom: 0;
`

export const OverviewSubTabs: React.FC<OverviewSubTabsProps> = ({
  activeSubTab,
  onSubTabChange,
}) => {
  return (
    <StyledControlsRow>
      <S.ControlsLeft>
        <S.TabBar>
          <S.TabButton
            $active={activeSubTab === 'statistics'}
            onClick={() => onSubTabChange('statistics')}
          >
            통계 및 지표
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'map'}
            onClick={() => onSubTabChange('map')}
          >
            지도 및 지역
          </S.TabButton>
          <S.TabButton
            $active={activeSubTab === 'government'}
            onClick={() => onSubTabChange('government')}
          >
            행정조직
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
      </S.ControlsLeft>
      <S.ControlsRight>
        {/* 우측 영역 (필요시 버튼 추가 가능) */}
      </S.ControlsRight>
    </StyledControlsRow>
  )
}
