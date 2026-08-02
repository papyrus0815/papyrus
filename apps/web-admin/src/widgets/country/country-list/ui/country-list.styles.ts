/**
 * CountryList 위젯 전용 스타일
 * 좌측 사이드바: 탭, 필터, 리스트 행, 대시보드 메뉴
 * 리퀴드 글래스 디자인은 다크 모드 전용
 */
import styled, { css } from 'styled-components'
import type { DefaultTheme } from 'styled-components'

import { UnderlineTabNav } from '@/shared/ui/underline-tabs'

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 다크 전용 backdrop-filter */
const darkBlur = (px = 16) => css`
  backdrop-filter: blur(${px}px) saturate(160%);
  -webkit-backdrop-filter: blur(${px}px) saturate(160%);
`

/**
 * Overlay 스타일 스크롤바 (Sc1) — 평소 투명, 컨테이너 hover 시만 얇게 노출.
 * - 평소에도 8px 폭 reserve (overlay), thumb만 transparent로 fade
 * - 컨테이너 hover 시 thumb 색이 fade in (transition 0.2s)
 * - thumb 위·아래 4px 여백 (border + background-clip)
 * - macOS Mail/Finder 사이드바 스타일
 */
const overlayScrollbar = css`
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.2s ease;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background: transparent;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background 0.2s ease;
  }

  &:hover {
    scrollbar-color: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.22)'
          : 'rgba(0, 0, 0, 0.2)'}
      transparent;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(0, 0, 0, 0.2)'};
    background-clip: padding-box;
  }

  &:hover::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.36)'
        : 'rgba(0, 0, 0, 0.34)'};
    background-clip: padding-box;
  }
`

/** 사이드바 sticky 상단 영역 공통 스타일 (다크: 리퀴드 / 라이트: 솔리드) */
const stickyBar = (theme: DefaultTheme) => css`
  position: sticky;
  z-index: 2;
  ${theme.mode === 'dark'
    ? css`
        background: rgba(23, 23, 23, 0.9);
        ${darkBlur(16)}
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      `
    : css`
        background: ${theme.colors.background.primary};
        border-bottom: 1px solid ${theme.colors.border.light};
      `}
`

// ─── 리스트 패널 컨테이너 ─────────────────────────────────────────────────────

export const ListPaneWrapper = styled.div`
  position: sticky;
  top: var(--header-height);
  align-self: start;
  height: calc(100vh - var(--header-height));
  overflow: visible;
  /* B-4 Finder 컬럼 — parents + (선택 시) children 두 컬럼 가로 배치 */
  display: flex;
  flex-direction: row;

  @media (max-width: 1024px) {
    display: none;
  }
`

/** B-4 — 자식 (역사 국가) 전용 두 번째 컬럼 */
export const ChildrenPane = styled.div`
  display: flex;
  flex-direction: column;
  width: 180px;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  animation: childrenSlideIn 0.18s ease-out;

  @keyframes childrenSlideIn {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 1280px) {
    width: 160px;
  }
`

/** 자식 컬럼 헤더 — 부모 mini 카드 (IsoBadge + 이름 + 자식 수) */
export const ChildrenHeader = styled.div`
  padding: 12px 10px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const ChildrenHeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const ChildrenHeaderName = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
`

export const ChildrenHeaderMeta = styled.div`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;

  > span.count {
    font-variant-numeric: tabular-nums;
    text-transform: none;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 700;
  }
`

export const ChildrenScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
  ${overlayScrollbar}
`

export const ChildrenEmpty = styled.div`
  padding: 24px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  line-height: 1.5;
`

export const ListPane = styled.div<{
  $collapsed?: boolean
}>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  padding-top: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(23, 23, 23, 0.85);
          ${darkBlur(20)}
          border-right: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: ${theme.colors.background.primary};
          border-right: 1px solid ${theme.colors.border.light};
        `}

  @media (max-width: 1024px) {
    display: none;
  }
`

export const ListCollapseButton = styled.button<{ $collapsed?: boolean }>`
  position: absolute;
  top: 50%;
  right: -16px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(33, 33, 33, 0.9);
          ${darkBlur(12)}
          color: ${theme.colors.text.secondary};
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        `
      : css`
          border: 1px solid ${theme.colors.border.light};
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          box-shadow: 0 1px 4px ${theme.colors.shadow.sm};
        `}

  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${({ $collapsed }) =>
      $collapsed ? 'rotate(180deg)' : 'rotate(0deg)'};
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.2)'
        : theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : theme.colors.activeLight};
  }

  @media (max-width: 1024px) {
    display: none;
  }
`

// ─── 레이아웃 ────────────────────────────────────────────────────────────────

export const ListContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
`

/** 시각적으로 숨기되 보조기술엔 노출 — 필터 결과 수 aria-live 공지용 (F28, 표준 sr-only) */
export const SrLiveRegion = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const SidebarFilterSlot = styled.div`
  min-height: 54px;
  flex-shrink: 0;
`

export const SidebarTabBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

// ─── 사이드바 모드 탭 (국가 상세 OverviewSubTabs와 동일: 언더라인 탭) ─────────

export const SidebarModeTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
`

/** 국가 개수 — 필터 칩 배지 대신 타이포만으로 정리 */
export const SidebarTabCount = styled.span<{ $active?: boolean }>`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  opacity: ${({ $active }) => ($active ? 0.95 : 0.8)};
`

// ─── 컨트롤 / 필터 ────────────────────────────────────────────────────────────

export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 12px 24px;
  top: 0;
  ${({ theme }) => stickyBar(theme)}
  box-shadow: 0 1px 0
    ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'};
`

export const ControlsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const ControlsRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const AddIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  transition:
    background 0.15s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
  box-shadow: 0 4px 12px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};

  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: translateY(-1px);
  }

  &:active {
    opacity: 0.9;
    transform: translateY(0);
  }

  svg {
    flex-shrink: 0;
  }
`

export const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 10px;
  ${({ theme }) => stickyBar(theme)}
`

export const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`

export const SearchIcon = styled.div`
  position: absolute;
  left: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  z-index: 1;

  > svg {
    width: 14px;
    height: 14px;
  }
`

export const SearchInput = styled.input`
  width: 100%;
  height: 30px;
  padding: 0 28px 0 32px;
  border-radius: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid transparent;
  transition: border-color 0.12s ease, background 0.12s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : theme.colors.border.medium};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

export const ClearButton = styled.button`
  position: absolute;
  right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ClearAllFiltersButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.95)'};
  }

  &:active {
    opacity: 0.85;
  }

  svg {
    opacity: 0.7;
    width: 12px;
    height: 12px;
  }

  @media (max-width: 768px) {
    height: 26px;
    padding: 0 8px;
    font-size: 11px;
  }
`

export const FilterSelect = styled.select<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 18px 0 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'transparent' : 'transparent'};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : theme.colors.background.secondary};
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 9px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: background 0.12s ease, color 0.12s ease;
  max-width: 100px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

export const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.4)'
          : 'rgba(99, 102, 241, 0.3)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.08)'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : theme.colors.primary
      : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.15)'
        : 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.12)'
        : 'rgba(99, 102, 241, 0.07)'};
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 768px) {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }
`

export const FilterResultBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  ${({ theme }) => stickyBar(theme)}
  top: 113px;
  z-index: 1;
`

export const FilterResultText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

export const FilterResultCount = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

// ─── 리스트 행 ────────────────────────────────────────────────────────────────

export const VirtualList = styled.div`
  border: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding: 6px 8px 12px 8px;
  background: transparent;
  ${overlayScrollbar}

  @media (max-width: 768px) {
    padding: 4px 6px 8px 6px;
    gap: 3px;
  }
`

export const ContinentSectionHeader = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 2;
  transition: color 0.12s ease;

  ${({ theme }) => css`
    background: ${theme.colors.background.primary};
    ${theme.mode === 'dark'
      ? `backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);`
      : ''}
  `}

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
    border-radius: 4px;
  }
`

export const ContinentCaret = styled.span<{ $collapsed?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ContinentTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ContinentCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
  letter-spacing: 0;
  text-transform: none;
`

export const ContinentLeadIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-right: 5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ContinentDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
`

export const ListRow = styled.div<{
  $active?: boolean
  $historicalActive?: boolean
  $accentColor?: string
  $compact?: boolean
}>`
  width: 100%;
  padding: ${({ $compact }) =>
    $compact ? '10px 10px' : '11px 10px'};
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
  min-height: ${({ $compact }) => ($compact ? '46px' : '56px')};
  /* sticky 그룹 헤더(약 34px)에 가리지 않게 자동 스크롤 여백 확보 (F1) */
  scroll-margin-top: 40px;
  line-height: 1.2;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  /* 가상화-라이트: 화면 밖 행은 브라우저가 렌더를 건너뜀.
     팝오버·컨텍스트 메뉴는 행 바깥(sibling)에 렌더되므로 paint containment에 안 잘림. */
  content-visibility: auto;
  contain-intrinsic-size: auto 56px;
  /* 행 사이 미세 구분선 */
  box-shadow: inset 0 -1px 0 ${({ theme }) => theme.colors.border.light};

  ${({ $active, $historicalActive, theme }) => css`
    background: ${$active || $historicalActive
      ? theme.colors.activeLight
      : 'transparent'};
    color: ${$active || $historicalActive
      ? theme.colors.active
      : theme.colors.text.primary};

    /* 활성 행 — CodeText 굵게, IsoBadge 색 강화 */
    ${($active || $historicalActive) &&
    css`
      ${CodeText} {
        font-weight: 700;
      }
    `}

    &:hover {
      background: ${$active || $historicalActive
        ? theme.colors.activeLight
        : theme.colors.hover};
    }
  `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }

  @media (max-width: 768px) {
    padding: 8px 8px 8px 9px;
    min-height: 46px;
  }
  @media (max-width: 480px) {
    padding: 8px 8px;
    min-height: 46px;
  }
`

export const RowTop = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const RowBottom = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  padding-left: 50px;
  margin-top: 4px;

  @media (max-width: 768px) {
    padding-left: 44px;
  }

  @media (max-width: 480px) {
    padding-left: 40px;
  }
`

export const RowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`

export const RowRight = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
`

export const RowCheckbox = styled.span`
  width: 14px;
  height: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.12)'};
  border-radius: 3px;
`

export const ExpandButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 3px;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const StarIcon = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.border.default};
`

export const PinButton = styled.button<{ $pinned?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ $pinned, theme }) =>
    $pinned ? '#f59e0b' : theme.colors.text.tertiary};
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  /* 핀된 항목은 항상 표시, 핀 안 된 항목은 행 hover 시에만 노출 */
  opacity: ${({ $pinned }) => ($pinned ? 1 : 0)};
  transition: opacity 0.12s ease, color 0.12s ease;

  ${ListRow}:hover &,
  ${ListRow}:focus-within & {
    opacity: 1;
  }

  &:hover {
    color: #f59e0b;
  }
`

export const QuickAccessSection = styled.div`
  margin-bottom: 6px;
`

export const QuickAccessHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 8px 10px 4px;
`

/**
 * ISO 코드(또는 SVG fallback) 박스 — flagEmoji 대신.
 * 배경/색은 inline style로 row가 전달 (대륙 색 옅은 톤).
 */
export const IsoBadge = styled.div<{ $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => ($size === 'sm' ? '22px' : '26px')};
  height: ${({ $size }) => ($size === 'sm' ? '22px' : '26px')};
  border-radius: 4px;
  font-size: ${({ $size }) => ($size === 'sm' ? '9px' : '10px')};
  font-weight: 700;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  font-family:
    'SF Mono',
    'Roboto Mono',
    ui-monospace,
    Menlo,
    monospace;
  text-transform: uppercase;
  line-height: 1;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};

  > svg {
    width: 13px;
    height: 13px;
  }
`

/**
 * 사이드바 접힘 시 상단에 표시되는 펼치기 rail.
 * 인물 필터(LeftFilterSlot)의 collapsed UI와 동일 패턴.
 */
export const CollapsedRail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  height: 100%;
`

export const CollapsedToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const CollapsedHint = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.5;
  flex-shrink: 0;
`

/** 자식(역사) 있는 부모 행 우측 chevron — 클릭 시 popover 열기 (M2) */
export const HasChildrenChevron = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  opacity: 0.7;
  margin-left: 2px;
  transition: background 0.12s ease, opacity 0.12s ease, color 0.12s ease;

  /* 시각적 강조 — 옅은 외곽선으로 클릭 가능함을 알림 */
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border.light};

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border.medium};
  }

  &[aria-expanded='true'] {
    opacity: 1;
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.active};
  }

  > svg {
    width: 14px;
    height: 14px;
  }
`

/** Deprecated — IsoBadge 사용. country-mobile-ui 호환 위해 유지 */
export const FlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
`

export const ThumbnailAvatar = styled.div<{ $size?: 'sm' | 'md' }>`
  width: ${({ $size }) => ($size === 'sm' ? '22px' : '26px')};
  height: ${({ $size }) => ($size === 'sm' ? '22px' : '26px')};
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const HistoricalCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  font-size: 9px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 7px;
  flex-shrink: 0;
`

export const TextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`

export const CodeText = styled.div<{ $unread?: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: inherit; /* ListRow의 active/비활성 색 따라감 */
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`

export const NameText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
`

export const SubYear = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  font-size: 11px;
  margin-left: 4px;
`

/** 행 두 번째 줄 — 수도·인구·연도 등 부가 정보 (I2) */
export const SubMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;

  > span.dot {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.tertiary};
    opacity: 0.5;
    flex-shrink: 0;
  }
`

export const TextStack = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
`

export const RadioDot = styled.span<{ $active?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
`

export const AttachmentDot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.border.default};
`

export const TimeText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  min-width: 44px;
  text-align: right;
  letter-spacing: 0.02em;
`

export const Meta = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

export const MetaInline = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export const Dot = styled.span`
  width: 3px;
  height: 3px;
  background: ${({ theme }) => theme.colors.border.medium};
  border-radius: 50%;
  display: inline-block;
`

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

export const EmptyFilterState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  margin: 20px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.6)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(255, 255, 255, 0.8)'};
`

export const EmptyFilterIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const EmptyFilterTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const EmptyFilterText = styled.p`
  margin: 0 0 20px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
  max-width: 300px;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`

export const EmptyFilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(0, 0, 0, 0.18)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(255, 255, 255, 0.97)'};
  }

  &:active {
    opacity: 0.85;
  }
`

export const AddButtonIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`

// ─── 사이드바 대시보드 메뉴 (Phase 5에서 제거됨) ──────────────────────────────
// DashboardMenu·DashboardMenuTitle·DashboardMenuItem 은 country-list에서 더 이상
// 사용되지 않는다. 대시보드 뷰는 별도 라우트(/history/dashboard/*)로 분리됨.

// ─── 선택 모달 ────────────────────────────────────────────────────────────────

export const SelectModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
`

export const SelectModal = styled.div`
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  border-radius: 20px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(33, 33, 33, 0.92);
          ${darkBlur(30)}
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        `
      : css`
          background: ${theme.colors.background.primary};
          border-radius: 16px;
          box-shadow: 0 20px 60px ${theme.colors.shadow.lg};
        `}
`

export const SelectModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(0, 0, 0, 0.06)'};
`

export const SelectModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SelectModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.1)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const SelectModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.1)'};
    border-radius: 2px;
  }
`

export const SelectOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  margin-bottom: 4px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.3)'
          : 'rgba(99, 102, 241, 0.2)'
        : 'transparent'};
  border-radius: 12px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.12)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.16)'
          : 'rgba(99, 102, 241, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(0, 0, 0, 0.03)'};
  }

  &:last-child {
    margin-bottom: 0;
  }
`

export const SelectOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ theme }) => theme.colors.primary};
`

export const SelectOptionTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const SelectOptionLabel = styled.span`
  font-weight: 600;
`

export const SelectOptionDesc = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
