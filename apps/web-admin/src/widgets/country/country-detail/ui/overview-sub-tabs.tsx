import React from 'react'

import { UnderlineTabButton } from '@/shared/ui/underline-tabs'

import * as S from './overview-sub-tabs.styles'

export type OverviewSubTab =
  | 'statistics'
  | 'linkedHistorical'
  | 'map'
  | 'government'
  | 'ethnicity'
  | 'elections'
  | 'laws'
  | 'treaty'

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
        <S.TopUnderlineTabNav role="tablist" aria-label="국가 상세 메인 메뉴">
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'statistics'}
            $active={activeSubTab === 'statistics'}
            onClick={() => onSubTabChange('statistics')}
          >
            대시보드
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'map'}
            $active={activeSubTab === 'map'}
            onClick={() => onSubTabChange('map')}
          >
            행정구역
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'government'}
            $active={activeSubTab === 'government'}
            onClick={() => onSubTabChange('government')}
          >
            행정조직
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'ethnicity'}
            $active={activeSubTab === 'ethnicity'}
            onClick={() => onSubTabChange('ethnicity')}
          >
            민족
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'elections'}
            $active={activeSubTab === 'elections'}
            onClick={() => onSubTabChange('elections')}
          >
            선거·투표
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'laws'}
            $active={activeSubTab === 'laws'}
            onClick={() => onSubTabChange('laws')}
          >
            법령
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'linkedHistorical'}
            $active={activeSubTab === 'linkedHistorical'}
            onClick={() => onSubTabChange('linkedHistorical')}
          >
            과거국가
          </UnderlineTabButton>
          <UnderlineTabButton
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'treaty'}
            $active={activeSubTab === 'treaty'}
            onClick={() => onSubTabChange('treaty')}
          >
            조약
          </UnderlineTabButton>
        </S.TopUnderlineTabNav>
      </S.Left>
      <S.Right>{rightSlot}</S.Right>
    </S.Row>
  )
}
