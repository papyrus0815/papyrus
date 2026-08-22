/**
 * 좌측 사이드바 목록의 공용 조판 — 국가 목록(/country)과 인물 목록(/persons-timeline)이
 * **같은 스타일 인스턴스**를 공유한다. 원본은 country-list.styles.ts 였고, 인물 목록을
 * 국가 목록과 동일하게 만들면서 여기로 승격했다(복제하면 두 지면이 곧 어긋난다).
 *
 * 구성:
 * - 패널 컨테이너: ListPaneWrapper / ListPane / ListContainer / SidebarTabBody
 * - 접힘 rail: CollapsedRail / CollapsedToggleBtn / CollapsedHint
 * - 검색·필터 행: FilterRow / SearchWrapper·SearchIcon·SearchInput·ClearButton /
 *   FilterWrapper·FilterSelect·ClearAllFiltersButton
 * - 그룹 헤더: GroupSectionHeader / GroupCaret / GroupDot / GroupLeadIcon / GroupTitle / GroupCount
 * - 행: ListRow / RowTop·RowLeft·RowRight / TextStack·CodeText·SubMeta /
 *   AvatarBadge·ThumbnailAvatar / PinButton
 * - 빈/에러 상태: EmptyFilterState … AddButton
 *
 * 도메인 전용(국가의 ISO·대륙 색, 인물의 영향력 등)은 각 위젯 styles에 남긴다.
 * 리퀴드 글래스 표현은 다크 모드 전용.
 */
import styled, { css } from 'styled-components'
import type { DefaultTheme } from 'styled-components'

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 다크 전용 backdrop-filter */
export const darkBlur = (px = 16) => css`
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
export const overlayScrollbar = css`
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
export const stickyBar = (theme: DefaultTheme) => css`
  position: sticky;
  z-index: 2;
  ${theme.mode === 'dark'
    ? css`
        background: #151515;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      `
    : css`
        background: #f4f6fa;
        border-bottom: 1px solid ${theme.colors.border.light};
      `}
`

/** SidebarHeader action 슬롯의 아이콘 버튼 (등록 등) */
export const SidebarActionButton = styled.button`
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &[aria-expanded='true'] {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
  }
`

// ─── 패널 컨테이너 ───────────────────────────────────────────────────────────

export const ListPaneWrapper = styled.div`
  position: sticky;
  top: var(--header-height);
  align-self: start;
  height: calc(100vh - var(--header-height));
  overflow: visible;
  /* Finder 컬럼 — 본 목록 + (있으면) 보조 컬럼 가로 배치 */
  display: flex;
  flex-direction: row;

  @media (max-width: 1024px) {
    display: none;
  }
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

  /* 표면 톤 계단(디스코드 규약): 레일 가장 진함 → 사이드바 중간 → 본문 가장 밝음.
     예전엔 사이드바가 본문과 같은 흰색이라 층이 갈리지 않았다. */
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: #151515;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: #f4f6fa;
          border-right: 1px solid ${theme.colors.border.light};
        `}

  @media (max-width: 1024px) {
    display: none;
  }
`

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

export const SidebarTabBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

// ─── 검색·필터 행 ────────────────────────────────────────────────────────────

export const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 14px 14px;
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
  left: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  z-index: 1;

  > svg {
    width: 16px;
    height: 16px;
  }
`

export const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 32px 0 36px;
  border-radius: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid transparent;
  transition: border-color 0.12s ease, background 0.12s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  /* type="search"의 네이티브 X를 감춘다 — 우리 ClearButton과 겹쳐 X가 두 개로 보였다 */
  &::-webkit-search-cancel-button,
  &::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
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
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
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
  height: 30px;
  padding: 0 22px 0 10px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'transparent' : 'transparent'};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : theme.colors.background.secondary};
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: background 0.12s ease, color 0.12s ease;
  max-width: 116px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

// ─── 리스트 행 ───────────────────────────────────────────────────────────────

export const VirtualList = styled.div`
  border: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  /* 하단 계정 패널(AccountPanel)이 fixed로 겹치므로 마지막 행이 가리지 않게 비워둔다 */
  padding: 6px 8px calc(var(--user-panel-height, 52px) + 20px) 8px;
  background: transparent;
  ${overlayScrollbar}

  @media (max-width: 768px) {
    padding: 4px 6px calc(var(--user-panel-height, 52px) + 16px) 6px;
    gap: 3px;
  }
`

export const GroupSectionHeader = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 12px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.02em;
  border: none;
  cursor: pointer;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 2;
  transition: color 0.12s ease;

  /* sticky 헤더 — 아래로 지나가는 행이 비치지 않도록 사이드바와 같은 톤으로 덮는다 */
  ${({ theme }) => css`
    background: ${theme.mode === 'dark' ? '#151515' : '#f4f6fa'};
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

export const GroupCaret = styled.span<{ $collapsed?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  transition: transform 0.15s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const GroupTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const GroupCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
`

export const GroupLeadIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-right: 5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const GroupDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
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
  padding: ${({ $compact }) => ($compact ? '10px 12px' : '13px 12px')};
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  text-align: left;
  border-radius: 10px;
  transition: background 0.12s ease;
  min-height: ${({ $compact }) => ($compact ? '52px' : '64px')};
  /* sticky 그룹 헤더(약 34px)에 가리지 않게 자동 스크롤 여백 확보 (F1) */
  scroll-margin-top: 40px;
  line-height: 1.2;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  /* 가상화-라이트: 화면 밖 행은 브라우저가 렌더를 건너뜀.
     팝오버·컨텍스트 메뉴는 행 바깥(sibling)에 렌더되므로 paint containment에 안 잘림. */
  content-visibility: auto;
  contain-intrinsic-size: auto 64px;
  /* 구분선을 두지 않는다 — 행 높이가 커지고 hover/선택 배경이 생기면서 선까지 있으면
     좌측 컬럼이 표로 보인다(디스코드 채널 목록도 선이 없다). */

  ${({ $active, $historicalActive, theme }) => css`
    background: ${$active || $historicalActive
      ? theme.colors.activeLight
      : 'transparent'};
    color: ${$active || $historicalActive
      ? theme.colors.active
      : theme.colors.text.primary};

    /* 활성 행 — CodeText 굵게, AvatarBadge 색 강화 */
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

export const RowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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

/**
 * 썸네일이 없을 때의 대체 박스 — 국가는 ISO 코드/랜드마크, 인물은 이름 첫 글자.
 * 배경/색은 inline style로 row가 전달 (그룹 accent 색 옅은 톤).
 */
export const AvatarBadge = styled.div<{ $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  height: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  border-radius: 8px;
  font-size: ${({ $size }) => ($size === 'sm' ? '10px' : '12px')};
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
    width: 16px;
    height: 16px;
  }
`

/**
 * 사이드바 접힘 시 상단에 표시되는 펼치기 rail — 국가 목록·인물 목록 공통.
 */
/** 행 우측 작은 수치 배지 — 자식 수·영향력 등 도메인 지표 */
export const RowMetricBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 15px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  flex-shrink: 0;
`

// ─── 접힘 rail ───────────────────────────────────────────────────────────────

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

export const ThumbnailAvatar = styled.div<{ $size?: 'sm' | 'md' }>`
  width: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  height: ${({ $size }) => ($size === 'sm' ? '26px' : '32px')};
  border-radius: 8px;
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

export const CodeText = styled.div<{ $unread?: boolean }>`
  font-size: 15px;
  font-weight: 600;
  color: inherit; /* ListRow의 active/비활성 색 따라감 */
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`

/** 행 두 번째 줄 — 수도·인구·연도 등 부가 정보 (I2) */
export const SubMeta = styled.div`
  font-size: 12px;
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

// ─── 빈 상태 / 에러 상태 ─────────────────────────────────────────────────────

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
