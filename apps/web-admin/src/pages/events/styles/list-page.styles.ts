/**
 * List Page Shell Styled Components
 * 페이지 헤더 · 탭 · 메인/상세 패널 레이아웃 · 빈 상태 · 삭제 패널 · 단축키 도움말
 */
import styled from 'styled-components'

export const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 4px 8px;
  flex-wrap: wrap;
`

export const PageHeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const PageHeaderTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`

export const PageHeaderSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const EmbedHeader = styled.div`
  position: relative;
  padding: 14px 18px 10px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};

  /* 좌측 인디고 악센트 라인 — 다른 모듈과 시각 구분 */
  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
  }
  padding-left: 18px;
`

export const EmbedHeaderHint = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 10px;
  font-size: 13px;
`

export const ActiveContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
  flex: 1;
`

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 4px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e5e7eb'};
  background: transparent;
`

export const TabButton = styled.button<{ $active: boolean; $tone: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  position: relative;
  transition:
    color 0.18s ease,
    background 0.18s ease;
  color: ${({ theme, $active, $tone }) =>
    $active
      ? $tone === 'danger'
        ? '#ef4444'
        : '#6366f1'
      : theme.colors.text.tertiary};
  border-radius: 8px 8px 0 0;

  /* 활성 탭의 underline은 ::after로 — 1px border와 겹쳐 매끈하게 */
  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active, $tone }) =>
      $active
        ? $tone === 'danger'
          ? 'linear-gradient(90deg, #ef4444, #f97316)'
          : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
        : 'transparent'};
    transition: background 0.18s ease;
  }

  &:hover:not([aria-selected='true']) {
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
  }
`

export const EmptyResults = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 96px 32px;
  text-align: center;
  /* 살짝 dim된 배경 + 점선으로 빈 영역 강조 */
  margin: 16px;
  border-radius: 18px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.015)'
      : 'rgba(15,23,42,0.01)'};

  /* 우상단 "검색 안된 결과" 의미를 살린 둥근 아이콘 영역 */
  &::before {
    content: '⌕';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    font-size: 26px;
    font-weight: 400;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(199,210,254,0.55)' : '#a5b4fc'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.12)'
        : 'rgba(99,102,241,0.08)'};
    margin-bottom: 6px;
  }
`

export const EmptyResultsTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const EmptyResultsHint = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.6;
  max-width: 360px;
`

export const DeletedEventsPanel = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 18px;
`

export const DeletedEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DeletedEventRow = styled.button`
  position: relative;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 16px 14px 18px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;

  /* 좌측 빨강 악센트 + 미세 반투명 — 휴지통/아카이브 인상 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(239, 68, 68, 0.55);
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  &:hover {
    border-color: rgba(239, 68, 68, 0.45);
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239,68,68,0.08)'
        : 'rgba(239,68,68,0.03)'};
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);
  }
  &:hover::before {
    opacity: 1;
  }
`

export const DeletedEventTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  /* 삭제 항목 — 살짝 줄긋기 인상으로 시각 단서 */
  text-decoration: line-through;
  text-decoration-color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(239,68,68,0.5)'
      : 'rgba(239,68,68,0.35)'};
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
`

export const DeletedEventMeta = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/**
 * 상세 패널 컨테이너:
 * - >=1200px: Layout.CatalogSplit grid의 두 번째 컬럼으로 자연스럽게 자리잡음
 * - <1200px: 우측에서 슬라이드인하는 fixed drawer로 동작
 */
export const DetailPanelHost = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1200px) {
    position: fixed;
    top: var(--header-height, 0);
    right: 0;
    bottom: 0;
    width: min(420px, 100vw);
    z-index: 1100;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#0f0f0f' : '#ffffff'};
    box-shadow: ${({ $open }) =>
      $open
        ? '-12px 0 32px rgba(15, 17, 29, 0.18)'
        : 'none'};
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  }
`

export const DetailDrawerBackdrop = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 1200px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
    z-index: 1099;
  }
`

export const DetailDrawerClose = styled.button`
  display: none;

  @media (max-width: 1200px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;
    z-index: 1;
    transition: background 0.15s, color 0.15s, border-color 0.15s;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`

export const ShortcutOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadein 0.15s ease-out;

  @keyframes fadein {
    from {
      opacity: 0;
    }
  }
`

export const ShortcutBox = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,32,0.96)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-radius: 18px;
  padding: 20px 24px 22px;
  width: 100%;
  max-width: 460px;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.24),
    0 2px 6px rgba(15, 23, 42, 0.06);
  animation: pop 0.18s ease-out;

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const ShortcutHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const ShortcutClose = styled.button`
  background: transparent;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ShortcutList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: background 0.12s;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(15,23,42,0.025)'};
    }

    & > span:last-child {
      margin-left: auto;
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 500;
    }
  }

  kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-bottom-width: 2px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
    font: 600 11.5px/1
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    box-shadow: inset 0 -1px 0
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(15,23,42,0.04)'};
  }
`
