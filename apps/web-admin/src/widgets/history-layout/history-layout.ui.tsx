import React from 'react'

import { Outlet } from 'react-router-dom'
import styled from 'styled-components'

/**
 * HistoryLayout 컴포넌트
 * 히스토리 페이지의 레이아웃을 담당
 * - 데스크톱: 좌측 사이드바
 * - 모바일: 하단 탭바 + 가운데 FAB 버튼 (국가 페이지에서만)
 * - 사이드바 배지: 현재 로그인 계정 소유 데이터만 표시
 */
export default function HistoryLayout() {
  return (
    <Root>
      {/* 페이지 컨텐츠 영역 */}
      <Content>
        <Outlet />
      </Content>
    </Root>
  )
}

/* ============================================
   레이아웃 컴포넌트 스타일
   ============================================ */

const Root = styled.div`
  width: 100%;
  min-height: 100vh;
  display: block;
  padding: var(--header-height) 0 0;
  background: ${({ theme }) => theme.colors.background.primary};
`

const Content = styled.div`
  min-width: 0;
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  overflow-x: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 0;
  -webkit-overflow-scrolling: touch;
`
