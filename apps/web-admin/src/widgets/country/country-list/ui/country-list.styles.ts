/**
 * CountryList 위젯 전용 스타일
 * 좌측 사이드바: 탭, 필터, 리스트 행, 대시보드 메뉴
 * 리퀴드 글래스 디자인은 다크 모드 전용
 */
import styled, { css } from 'styled-components'
import type { DefaultTheme } from 'styled-components'

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 다크 전용 backdrop-filter */
const darkBlur = (px = 16) => css`
  backdrop-filter: blur(${px}px) saturate(160%);
  -webkit-backdrop-filter: blur(${px}px) saturate(160%);
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

  @media (max-width: 1024px) {
    display: none;
  }
`

export const ListPane = styled.div<{
  $inHistory?: boolean
  $collapsed?: boolean
}>`
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

// ─── 탭 바 ───────────────────────────────────────────────────────────────────

export const TabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 4px;
  border-radius: 12px;
  overflow-x: auto;
  overscroll-behavior: contain;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: ${theme.colors.background.tertiary};
          border: 1px solid ${theme.colors.border.default};
        `}

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    display: none;
  }
`

export const TabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  white-space: nowrap;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.2s ease;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
          color: ${$active ? '#ffffff' : theme.colors.text.secondary};
          font-weight: ${$active ? '600' : '500'};
          box-shadow: ${$active
            ? '0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)'
            : 'none'};
          backdrop-filter: ${$active ? 'blur(8px)' : 'none'};
          -webkit-backdrop-filter: ${$active ? 'blur(8px)' : 'none'};

          &:hover {
            color: #ffffff;
            background: ${$active
              ? 'rgba(255, 255, 255, 0.14)'
              : 'rgba(255, 255, 255, 0.06)'};
          }
        `
      : css`
          background: ${$active
            ? theme.colors.background.primary
            : 'transparent'};
          color: ${$active ? theme.colors.active : theme.colors.text.secondary};
          font-weight: ${$active ? '600' : '500'};
          box-shadow: ${$active
            ? `0 2px 8px ${theme.colors.shadow.md}`
            : 'none'};

          &:hover {
            color: ${$active ? theme.colors.active : theme.colors.text.primary};
            background: ${$active
              ? theme.colors.background.primary
              : theme.colors.background.secondary};
          }
        `}

  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 12px;
    gap: 5px;
  }
  @media (max-width: 480px) {
    padding: 5px 8px;
    font-size: 11px;
  }
`

export const TabBadge = styled.span`
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 106, 242, 0.2)'
      : 'rgba(99, 102, 241, 0.12)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
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
  align-items: center;
  gap: 8px;
  padding: 10px 16px 12px;
  flex-wrap: wrap;
  top: 57px;
  ${({ theme }) => stickyBar(theme)}

  @media (max-width: 768px) {
    padding: 8px 12px 10px;
    gap: 6px;
    top: 47px;
  }
  @media (max-width: 480px) {
    padding: 6px 10px 8px;
    gap: 6px;
  }
`

export const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    gap: 6px;
  }

  @media (max-width: 768px) {
    width: 100%;
    gap: 6px;
  }

  @media (max-width: 480px) {
    gap: 4px;
  }
`

export const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  @media (max-width: 1024px) {
    min-width: 180px;
    max-width: 300px;
  }

  @media (max-width: 768px) {
    min-width: 150px;
    max-width: 100%;
    flex: 1 1 auto;
  }

  @media (max-width: 480px) {
    min-width: 100%;
    flex-basis: 100%;
  }
`

export const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  z-index: 1;
`

export const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 32px 0 38px;
  border-radius: 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          ${darkBlur(8)}
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.default};
        `}

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
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : theme.colors.background.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.2)'
          : 'rgba(99, 102, 241, 0.12)'};
  }

  @media (max-width: 768px) {
    height: 34px;
    font-size: 13px;
    padding: 0 28px 0 34px;
  }
  @media (max-width: 480px) {
    height: 32px;
    font-size: 12px;
    padding: 0 24px 0 30px;
  }
`

export const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ClearAllFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.08)'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(0, 0, 0, 0.15)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.95)'};
  }

  &:active {
    opacity: 0.85;
  }

  svg {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  @media (max-width: 480px) {
    height: 32px;
    padding: 0 10px;
    font-size: 11px;
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

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.12)'};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.25)'
        : 'rgba(0, 0, 0, 0.2)'};
  }

  @media (max-width: 768px) {
    padding: 4px 6px 8px 6px;
    gap: 3px;
  }
`

export const ContinentSectionHeader = styled.div`
  padding: 10px 16px 10px 18px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-left: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px 10px 0 0;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 106, 242, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: rgba(99, 102, 241, 0.07);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        `}
`

export const ListRow = styled.button<{
  $active?: boolean
  $historicalActive?: boolean
}>`
  width: 100%;
  padding: 8px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.15s ease;
  min-height: 48px;
  line-height: 1.3;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;

  ${({ $active, $historicalActive, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active || $historicalActive
            ? 'rgba(99, 106, 242, 0.12)'
            : 'rgba(255, 255, 255, 0.03)'};
          ${darkBlur(12)}
          border: 1px solid
            ${$active
            ? 'rgba(99, 106, 242, 0.3)'
            : 'rgba(255, 255, 255, 0.07)'};
          border-left: 3px solid
            ${$active || $historicalActive
              ? theme.colors.primary
              : 'rgba(255, 255, 255, 0.06)'};
          box-shadow: ${$active
            ? '0 4px 14px rgba(99, 106, 242, 0.2)'
            : '0 1px 3px rgba(0,0,0,0.2)'};

          &:hover {
            background: rgba(99, 106, 242, 0.1);
            border-color: rgba(99, 106, 242, 0.3);
            box-shadow: 0 4px 14px rgba(99, 106, 242, 0.18);
            transform: translateX(1px);
          }
        `
      : css`
          background: ${$active || $historicalActive
            ? theme.colors.activeLight
            : theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.light};
          border-left: 3px solid
            ${$active || $historicalActive
              ? theme.colors.primary
              : theme.colors.border.light};
          box-shadow: none;

          &:hover {
            background: ${theme.colors.activeLight};
            border-color: ${theme.colors.border.medium};
            box-shadow: 0 2px 8px ${theme.colors.shadow.sm};
            transform: translateX(1px);
          }
        `}

  &:active {
    opacity: 0.9;
    transform: translateX(0);
  }

  @media (max-width: 768px) {
    padding: 8px 10px;
    min-height: 46px;
    border-radius: 8px;
  }
  @media (max-width: 480px) {
    padding: 6px 8px;
    min-height: 44px;
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
  gap: 14px;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    gap: 12px;
  }

  @media (max-width: 480px) {
    gap: 10px;
  }
`

export const RowRight = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
  border-radius: 4px;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  &:active {
    transform: scale(0.95);
  }
`

export const StarIcon = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.border.default};
`

export const FlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.9)'};
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 2px 6px
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'};

  ${ListRow}:hover & {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(255, 255, 255, 0.95)'};
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 18px;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
`

export const ThumbnailAvatar = styled.div<{ $size?: 'sm' | 'md' }>`
  width: ${({ $size }) =>
    $size === 'sm' ? 'clamp(24px, 5vw, 28px)' : 'clamp(24px, 5vw, 32px)'};
  height: ${({ $size }) =>
    $size === 'sm' ? 'clamp(24px, 5vw, 28px)' : 'clamp(24px, 5vw, 32px)'};
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(255, 255, 255, 0.7)'};

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
  min-width: clamp(16px, 3vw, 18px);
  height: clamp(16px, 3vw, 18px);
  padding: 0 clamp(3px, 1vw, 5px);
  font-size: clamp(9px, 2vw, 10px);
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 106, 242, 0.15)'
      : 'rgba(99, 102, 241, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
  border-radius: 9px;
  flex-shrink: 0;
`

export const TextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`

export const CodeText = styled.div<{ $unread?: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 480px) {
    font-size: 13px;
  }
`

export const NameText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 11px;
  }
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
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.4;
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

// ─── 사이드바 대시보드 요약 ────────────────────────────────────────────────────

export const DashboardSidebarSectionTitle = styled.h2`
  margin: 0;
  padding: 14px 20px 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.02em;
  background: transparent;
  border-bottom: none;
`

export const DashboardSummary = styled.div`
  padding: 0 16px 20px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  overflow-y: auto;
  background: transparent;
`

export const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          ${darkBlur(16)}
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          &::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.03) 0%,
              transparent 60%
            );
            pointer-events: none;
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.light};
          box-shadow: 0 1px 4px ${theme.colors.shadow.sm};
        `}

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.35)'
        : theme.colors.border.default};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        : `0 4px 12px ${theme.colors.shadow.md}`};
  }
`

export const SummaryIcon = styled.div`
  width: 26px;
  height: 26px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
  opacity: 0.9;
  position: relative;
  z-index: 1;

  svg {
    width: 22px;
    height: 22px;
  }
`

export const SummaryValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
  letter-spacing: -0.03em;
  line-height: 1.2;
  position: relative;
  z-index: 1;
`

export const SummaryLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
  letter-spacing: 0.01em;
  position: relative;
  z-index: 1;
`

// ─── 사이드바 대시보드 메뉴 ───────────────────────────────────────────────────

export const DashboardMenu = styled.nav`
  padding: 16px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: transparent;
`

export const DashboardMenuTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  padding: 8px 10px 10px;
  text-transform: none;
`

export const DashboardMenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;

  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          background: ${p.$active ? 'rgba(99, 106, 242, 0.15)' : 'transparent'};
          border: 1px solid
            ${p.$active ? 'rgba(99, 106, 242, 0.35)' : 'transparent'};
          color: ${p.$active ? '#ffffff' : p.theme.colors.text.secondary};
          box-shadow: ${p.$active
            ? '0 3px 10px rgba(99, 106, 242, 0.25)'
            : 'none'};
          backdrop-filter: ${p.$active ? 'blur(8px)' : 'none'};
          -webkit-backdrop-filter: ${p.$active ? 'blur(8px)' : 'none'};
        `
      : css`
          background: ${p.$active ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
          border: 1px solid
            ${p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
          color: ${p.$active
            ? p.theme.colors.active
            : p.theme.colors.text.secondary};
          box-shadow: ${p.$active
            ? '0 3px 10px rgba(99, 102, 241, 0.12)'
            : 'none'};
        `}

  &:hover {
    background: ${(p) =>
      p.theme.mode === 'dark'
        ? p.$active
          ? 'rgba(99, 106, 242, 0.2)'
          : 'rgba(255, 255, 255, 0.05)'
        : p.$active
          ? 'rgba(99, 102, 241, 0.12)'
          : p.theme.colors.background.secondary};
    color: ${(p) =>
      p.theme.mode === 'dark'
        ? '#ffffff'
        : p.$active
          ? p.theme.colors.active
          : p.theme.colors.text.primary};
    border-color: ${(p) =>
      p.theme.mode === 'dark'
        ? p.$active
          ? 'rgba(99, 106, 242, 0.5)'
          : 'rgba(255, 255, 255, 0.08)'
        : p.$active
          ? 'rgba(99, 102, 241, 0.3)'
          : p.theme.colors.border.default};
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: ${(p) =>
      p.$active
        ? p.theme.mode === 'dark'
          ? '#ffffff'
          : p.theme.colors.primary
        : p.theme.colors.text.secondary};
    opacity: ${(p) => (p.$active ? 1 : 0.85)};
  }

  &:hover svg {
    color: ${(p) =>
      p.theme.mode === 'dark' ? '#ffffff' : p.theme.colors.primary};
  }
`

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
