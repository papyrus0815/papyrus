/**
 * 최상위 콘텐츠 셸 스켈레톤 — 테마 적응형 플랫 레저(Flat Ledger) 지오메트리
 *
 * 과거 다크 전용(#0f1115) 리퀴드 글라스·3단 페이크 구성을 폐기하고,
 * 실제 `ContentAreaShell`과 동일한 좌측 320px 평면 채널 사이드바 + 우측 장부 패널 구조로 정렬한다.
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
  LedgerPaneSuspenseFallback,
  LedgerSkeletonBar,
} from '@/shared/ui/ledger-skeleton'
import { SidebarListSkeleton } from '@/shared/ui/sidebar-list/sidebar-list-skeleton'

const resolveMode = (mode?: string): Mode => (mode === 'dark' ? 'dark' : 'light')

export const ContentSkeleton: React.FC = () => {
  return (
    <ShellFrame role="status" aria-busy="true" aria-label="화면을 불러오는 중">
      <LeftRail aria-hidden="true">
        <RailHeader>
          <LedgerSkeletonBar $w="92px" $h="14px" $tone="strong" />
          <LedgerSkeletonBar $w="100%" $h="32px" $radius={RADIUS.SM} />
        </RailHeader>
        <SidebarListSkeleton label="목록 로딩 중" />
      </LeftRail>

      <RightStage>
        <LedgerPaneSuspenseFallback />
      </RightStage>
    </ShellFrame>
  )
}

const ShellFrame = styled.div`
  display: flex;
  width: 100%;
  min-height: calc(100vh - 56px);
  background: ${({ theme }) => ledgerBackground(resolveMode(theme?.mode))};
  overflow: hidden;
`

const LeftRail = styled.aside`
  flex: 0 0 320px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-right: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
  background: ${({ theme }) => ledgerBackground(resolveMode(theme?.mode))};

  @media (max-width: 1024px) {
    display: none;
  }
`

const RailHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 12px 6px;
`

const RightStage = styled.div`
  flex: 1;
  min-width: 0;
`

export default ContentSkeleton
