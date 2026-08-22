/**
 * 사이드바 목록 로딩 중 placeholder rows — 국가 목록·인물 목록 공용.
 * - 그룹 헤더 1 + 행 8개로 시각적 형태 유지.
 */
import React from 'react'

import styled, { keyframes } from 'styled-components'

const SKELETON_ROWS = 8

interface SidebarListSkeletonProps {
  /** 스크린리더 라벨 — 예: '국가 목록 로딩 중' */
  label: string
}

export function SidebarListSkeleton({ label }: SidebarListSkeletonProps) {
  return (
    <Wrap aria-busy="true" aria-label={label}>
      <SkelHeader>
        <SkelBlock $w="40%" $h="10px" />
      </SkelHeader>
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <SkelRow key={index}>
          <SkelAvatar />
          <SkelLines>
            <SkelBlock $w={`${55 + ((index * 7) % 30)}%`} $h="11px" />
            <SkelBlock $w={`${30 + ((index * 5) % 25)}%`} $h="9px" />
          </SkelLines>
        </SkelRow>
      ))}
    </Wrap>
  )
}

const shimmer = keyframes`
  0% { opacity: 0.45; }
  50% { opacity: 0.8; }
  100% { opacity: 0.45; }
`

const Wrap = styled.div`
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SkelHeader = styled.div`
  padding: 8px 12px;
`

const SkelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const SkelAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.border.light};
  animation: ${shimmer} 1.4s ease-in-out infinite;
`

const SkelLines = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const SkelBlock = styled.div<{ $w: string; $h: string }>`
  width: ${({ $w }) => $w};
  height: ${({ $h }) => $h};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.border.light};
  animation: ${shimmer} 1.4s ease-in-out infinite;
`
