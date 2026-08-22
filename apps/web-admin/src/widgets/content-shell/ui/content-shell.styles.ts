/**
 * ContentShell 전용 레이아웃 스타일.
 * - MainGrid: 좌측(패널/리스트) + 우측(콘텐츠) 2컬럼 그리드
 * - DetailPane: 우측 컨테이너 (뷰포트 높이 - 헤더)
 * - DetailPaneScrollBody: 내부 스크롤 본문
 *
 * `--content-left-inset`: 좌측 사이드바가 차지한 폭. 우측 콘텐츠 안에서 `position: fixed`로
 * 뷰포트를 통째로 쓰는 지면(사건 카탈로그 PageScene 등)이 `left: var(--content-left-inset, 0px)`
 * 로 사이드바를 피할 수 있게 셸이 내려준다 — fixed는 grid 트랙을 모르기 때문.
 */
import styled from 'styled-components'

export const MainGrid = styled.div<{
  $noSidebar?: boolean
  $listCollapsed?: boolean
  /** 사이드바 우측에 추가 컬럼이 떠 있을 때 (B-4 Finder 자식 컬럼 등) — 그 폭을 더해줌 */
  $sidebarExtraWidth?: number
}>`
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: ${({
    $noSidebar,
    $listCollapsed,
    $sidebarExtraWidth = 0,
  }) => {
    if ($listCollapsed) return '48px minmax(0, 1fr)'
    if ($noSidebar) {
      return `${360 + $sidebarExtraWidth}px minmax(0, 1fr)`
    }
    return '15% 30% minmax(0, 1fr)'
  }};
  column-gap: 0;
  align-items: start;
  min-height: inherit;
  transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1280px) {
    grid-template-columns: ${({
      $noSidebar,
      $listCollapsed,
      $sidebarExtraWidth = 0,
    }) => {
      if ($listCollapsed) return '48px minmax(0, 1fr)'
      if ($noSidebar) {
        // 1280px 이하에선 자식 컬럼이 160px (styles 매칭)
        const extra = $sidebarExtraWidth > 0 ? 160 : 0
        return `${320 + extra}px minmax(0, 1fr)`
      }
      return '18% 35% minmax(0, 1fr)'
    }};
  }

  @media (max-width: 1024px) {
    /* minmax(0, 1fr) — 1fr만 쓰면 트랙이 내용물 min-content(탭 바 등) 아래로
       줄지 않아 페이지 전체가 옆으로 늘어나 가로 스크롤이 생긴다 */
    grid-template-columns: minmax(0, 1fr);
    row-gap: 12px;
    padding: 0;
  }
`

export const DetailPane = styled.div<{
  $mobileVisible?: boolean
  /** 좌측 사이드바 폭 — MainGrid의 첫 트랙과 같은 값으로 맞춘다 */
  $listCollapsed?: boolean
  $sidebarExtraWidth?: number
}>`
  /* 좌측 내비 레일 + 목록 사이드바를 합친 폭. fixed로 뷰포트를 쓰는 지면이 이만큼 피한다. */
  --content-left-inset: ${({ $listCollapsed, $sidebarExtraWidth = 0 }) =>
    $listCollapsed
      ? 'calc(var(--nav-rail-width, 72px) + 48px)'
      : `calc(var(--nav-rail-width, 72px) + ${360 + $sidebarExtraWidth}px)`};
  @media (max-width: 1280px) {
    --content-left-inset: ${({ $listCollapsed, $sidebarExtraWidth = 0 }) =>
      $listCollapsed
        ? 'calc(var(--nav-rail-width, 72px) + 48px)'
        : `calc(var(--nav-rail-width, 72px) + ${320 + ($sidebarExtraWidth > 0 ? 160 : 0)}px)`};
  }
  @media (max-width: 1024px) {
    /* 목록 사이드바가 숨겨지므로 레일 폭만 */
    --content-left-inset: var(--nav-rail-width, 72px);
  }

  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100vh - var(--header-height));
  min-height: 0;
  overflow-y: auto;
  border-left: none;
  @media (max-width: 1024px) {
    ${({ $mobileVisible }) =>
      $mobileVisible
        ? `
          height: auto;
          overflow-y: visible;
        `
        : `display: none;`}
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
