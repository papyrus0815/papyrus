/**
 * 국가 상세 화면 전용 스켈레톤 (`CountryDetailSkeleton`)
 *
 * 과거 라이트 전용 불투명 오버레이(`LoadingOverlay`)를 대체하며,
 * 실제 `StickyTopBar` + `CountryDetailHeader` + 종합 벤토 그리드(또는 진입한 하위 탭 장부)의
 * 기하학적 치수와 1:1 정렬해 전환 시 레이아웃 점프(CLS)를 제거한다.
 */
import React from 'react'

import styled from 'styled-components'

import {
  ledgerBackground,
  ledgerInkLine,
  type Mode,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  LedgerBentoCardSkeleton,
  LedgerKpiStripSkeleton,
  LedgerSkeletonBar,
  LedgerSkeletonCircle,
  LedgerSplitPaneSkeleton,
  LedgerTableSkeleton,
} from '@/shared/ui/ledger-skeleton'

const resolveMode = (mode?: string): Mode => (mode === 'dark' ? 'dark' : 'light')

const SPLIT_PANE_TABS = new Set([
  'regions',
  'government',
  'military',
  'heads',
  'political-system',
])

export interface CountryDetailSkeletonProps {
  activeTab?: string
  isHistorical?: boolean
}

export const CountryDetailSkeleton: React.FC<CountryDetailSkeletonProps> = ({
  activeTab = 'dashboard',
  isHistorical = false,
}) => {
  const isOverview =
    activeTab === 'dashboard' || activeTab === 'overview' || !activeTab
  const isSplitTab = SPLIT_PANE_TABS.has(activeTab)

  return (
    <SkeletonCanvas
      role="status"
      aria-busy="true"
      aria-label="국가 정보를 불러오는 중"
    >
      <TopStickySkeleton aria-hidden="true">
        <TopTabsRow>
          {Array.from({ length: isHistorical ? 7 : 9 }).map((_, idx) => (
            <LedgerSkeletonBar
              key={idx}
              $w={`${44 + ((idx * 13) % 28)}px`}
              $h="12px"
              $tone={idx === 0 ? 'strong' : 'subtle'}
            />
          ))}
        </TopTabsRow>
      </TopStickySkeleton>

      <ContentContainer aria-hidden="true">
        {isOverview ? (
          <>
            <HeaderSkeletonRow>
              <HeaderIdentity>
                <LedgerSkeletonCircle $size={48} $radius={RADIUS.MD} />
                <HeaderTitleStack>
                  <HeaderMetaLine>
                    <LedgerSkeletonBar $w="72px" $h="10px" />
                    <LedgerSkeletonBar $w="108px" $h="10px" />
                  </HeaderMetaLine>
                  <LedgerSkeletonBar $w="220px" $h="26px" $tone="strong" />
                  <LedgerSkeletonBar $w="340px" $h="12px" />
                </HeaderTitleStack>
              </HeaderIdentity>
              <LedgerSkeletonBar
                $w="84px"
                $h="30px"
                $radius={RADIUS.SM}
              />
            </HeaderSkeletonRow>

            <HeroAsymGrid>
              <LedgerBentoCardSkeleton rows={4} minHeight={240} />
              <LedgerBentoCardSkeleton rows={3} minHeight={240} />
            </HeroAsymGrid>

            <TwoColGrid>
              <LedgerBentoCardSkeleton rows={3} minHeight={172} />
              <LedgerBentoCardSkeleton rows={3} minHeight={172} />
            </TwoColGrid>

            <LedgerBentoCardSkeleton
              rows={4}
              showMetric={false}
              minHeight={188}
            />
          </>
        ) : isSplitTab ? (
          <LedgerSplitPaneSkeleton rows={8} />
        ) : (
          <>
            <LedgerKpiStripSkeleton cells={4} />
            <LedgerTableSkeleton rows={8} columns={4} showToolbar />
          </>
        )}
      </ContentContainer>
    </SkeletonCanvas>
  )
}

const SkeletonCanvas = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  background: ${({ theme }) => ledgerBackground(resolveMode(theme?.mode))};
`

const TopStickySkeleton = styled.div`
  display: flex;
  align-items: center;
  height: 46px;
  padding: 0 28px;
  border-bottom: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`

const TopTabsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  overflow: hidden;
`

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: 24px 28px 48px;

  @media (max-width: 768px) {
    padding: 18px 16px 36px;
  }
`

const HeaderSkeletonRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 8px;
`

const HeaderIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`

const HeaderTitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
`

const HeaderMetaLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const HeroAsymGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`
