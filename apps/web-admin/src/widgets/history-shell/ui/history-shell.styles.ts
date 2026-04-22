/**
 * HistoryShell 전용 레이아웃 스타일.
 * - MainGrid: 좌측(패널/리스트) + 우측(콘텐츠) 2컬럼 그리드
 * - DetailPane: 우측 컨테이너 (뷰포트 높이 - 헤더)
 * - DetailPaneScrollBody: 내부 스크롤 본문
 */
import styled from 'styled-components'

export const MainGrid = styled.div<{
  $noSidebar?: boolean
  $listCollapsed?: boolean
}>`
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: ${({ $noSidebar, $listCollapsed }) => {
    if ($listCollapsed) return '48px minmax(0, 1fr)'
    return $noSidebar ? '280px minmax(0, 1fr)' : '15% 30% minmax(0, 1fr)'
  }};
  column-gap: 0;
  align-items: start;
  min-height: inherit;
  transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1280px) {
    grid-template-columns: ${({ $noSidebar, $listCollapsed }) => {
      if ($listCollapsed) return '48px minmax(0, 1fr)'
      return $noSidebar ? '260px minmax(0, 1fr)' : '18% 35% minmax(0, 1fr)'
    }};
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    row-gap: 12px;
    padding: 0;
  }
`

export const DetailPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100vh - var(--header-height));
  min-height: 0;
  overflow-y: auto;
  border-left: none;
  @media (max-width: 1024px) {
    display: none;
  }
`

/** DetailPane 안 콘텐츠 — 스크롤 영역 보존을 위해 flex-shrink 0 */
export const DetailPaneScrollBody = styled.div`
  width: 100%;
  box-sizing: border-box;
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  @media (max-width: 640px) {
    padding-bottom: 32px;
  }
`
