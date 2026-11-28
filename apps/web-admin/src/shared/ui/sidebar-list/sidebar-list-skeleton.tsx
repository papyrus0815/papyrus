/**
 * 사이드바 목록 로딩 중 placeholder rows — 평면 채널 리스트(`ListRow`) 기하학 정렬.
 * - 불투명 블록 카드를 쓰지 않고 `transparent` 채널 행 + 그룹 헤더 2단으로 실제 목록과 1:1 정렬한다.
 */
import React from 'react'

import styled from 'styled-components'

import {
  ledgerHairline,
  type Mode,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  LedgerSkeletonBar,
  LedgerSkeletonCircle,
} from '@/shared/ui/ledger-skeleton'

const resolveMode = (mode?: string): Mode => (mode === 'dark' ? 'dark' : 'light')

interface SidebarListSkeletonProps {
  /** 스크린리더 라벨 — 예: '국가 목록 로딩 중' */
  label: string
}

export function SidebarListSkeleton({ label }: SidebarListSkeletonProps) {
  return (
    <Wrap role="status" aria-busy="true" aria-label={label}>
      <GroupBlock aria-hidden="true">
        <GroupHeader>
          <LedgerSkeletonBar $w="34%" $h="9.5px" />
          <LedgerSkeletonBar $w="22px" $h="9px" />
        </GroupHeader>
        {Array.from({ length: 5 }).map((_, index) => (
          <ChannelRow key={`g1-${index}`}>
            <LedgerSkeletonCircle $size={28} $radius={RADIUS.SM} />
            <RowLines>
              <LedgerSkeletonBar
                $w={`${52 + ((index * 9) % 28)}%`}
                $h="11.5px"
                $tone={index === 0 ? 'strong' : 'subtle'}
              />
              <LedgerSkeletonBar $w={`${28 + ((index * 7) % 24)}%`} $h="9px" />
            </RowLines>
          </ChannelRow>
        ))}
      </GroupBlock>

      <GroupDivider aria-hidden="true" />

      <GroupBlock aria-hidden="true">
        <GroupHeader>
          <LedgerSkeletonBar $w="42%" $h="9.5px" />
          <LedgerSkeletonBar $w="22px" $h="9px" />
        </GroupHeader>
        {Array.from({ length: 4 }).map((_, index) => (
          <ChannelRow key={`g2-${index}`}>
            <LedgerSkeletonCircle $size={28} $radius={RADIUS.SM} />
            <RowLines>
              <LedgerSkeletonBar
                $w={`${48 + ((index * 11) % 30)}%`}
                $h="11.5px"
              />
              <LedgerSkeletonBar $w={`${26 + ((index * 6) % 22)}%`} $h="9px" />
            </RowLines>
          </ChannelRow>
        ))}
      </GroupBlock>
    </Wrap>
  )
}

const Wrap = styled.div`
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 4px;
`

const GroupDivider = styled.div`
  height: 1px;
  margin: 2px 10px;
  background: ${({ theme }) => ledgerHairline(resolveMode(theme?.mode))};
`

const ChannelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: ${RADIUS.SM};
  background: transparent;
`

const RowLines = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`
