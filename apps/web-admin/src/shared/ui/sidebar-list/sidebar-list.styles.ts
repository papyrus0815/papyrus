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

import { SIDEBAR_SURFACE } from './surface'

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

/**
 * 사이드바 표면색 — 한 사이드바 안의 **모든 불투명 면이 같은 값을 써야 한다**
 * (패널 · sticky 상단 바 · sticky 그룹 헤더). 셋 중 하나만 달라도 스크롤할 때 톤이 어긋난다.
 *
 * 지면이 `--sidebar-surface`를 내려주면 그 값이 이긴다(도메인 예외용). 기본값이 곧 규약이다.
 */
export const sidebarSurface = (theme: DefaultTheme) =>
  theme.mode === 'dark'
    ? `var(--sidebar-surface, ${SIDEBAR_SURFACE.dark})`
    : `var(--sidebar-surface, ${SIDEBAR_SURFACE.light})`

/** 사이드바 경계 — 지면이 본문과 **같은 흰색**이라, 층을 만드는 건 이 선 하나뿐이다 */
export const sidebarLine = (theme: DefaultTheme) =>
  theme.mode === 'dark'
    ? 'var(--sidebar-line, rgba(255, 255, 255, 0.07))'
    : 'var(--sidebar-line, #e9eaec)'

/**
 * 지면 위에 얹는 **채움 한 단계** — 검색칸·셀렉트·아바타 대체 박스가 같은 값을 쓴다.
 *
 * 흰 지면에서는 채움의 방향이 뒤집힌다: 입력칸은 한 톤 내려 회색으로 채워야 '칸'으로 읽히고
 * (흰 지면에 흰 칸은 보이지 않는다), 테두리는 필요 없다.
 */
export const sidebarFill = (theme: DefaultTheme) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.055)' : '#f4f4f5'

/** 호버는 채움보다 한 눈금 더 — 칸(정적)과 호버(반응)가 같은 톤이면 반응이 안 읽힌다 */
export const sidebarFillHover = (theme: DefaultTheme) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f0f0f2'

/** 선택 행 — 이 목록에서 유일하게 accent를 쓰는 자리 */
export const sidebarRowSelected = (theme: DefaultTheme) =>
  theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.20)' : '#eef0fe'

/** 사이드바 sticky 상단 영역 공통 스타일 (다크: 리퀴드 / 라이트: 솔리드) */
export const stickyBar = (theme: DefaultTheme) => css`
  position: sticky;
  z-index: 2;
  background: ${sidebarSurface(theme)};
  border-bottom: 1px solid ${sidebarLine(theme)};
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
    background: ${({ theme }) => sidebarFillHover(theme)};
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

  /* 지면은 본문과 **같은 흰색**이고, 층은 오른쪽 경계선 하나로만 만든다(sidebarSurface).
     톤 계단(레일 > 사이드바 > 본문)을 쓰던 시절엔 목록이 회색 판 위에 얹힌 물건으로 보였다.
     도메인이 --sidebar-surface / --sidebar-line 을 내려주면 그쪽이 이긴다. */
  background: ${({ theme }) => sidebarSurface(theme)};
  border-right: 1px solid ${({ theme }) => sidebarLine(theme)};

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

/**
 * 검색·필터 블록 — 크롬의 2·3단.
 *
 * 크롬은 목록을 밀어내는 비용이다: 예전엔 제목 69 + 이 블록 118 = **187px**가 첫 행 앞에
 * 소비됐다(840px 뷰포트의 22%). 단 사이 간격과 아래 여백을 줄여 회수한다 — 줄 수를 줄이는
 * 건 SearchFilterInline 쪽 일이고, 여기서는 이미 있는 줄을 촘촘히 세운다.
 */
export const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px 10px;
  ${({ theme }) => stickyBar(theme)}
`

/**
 * 검색칸 + 칩을 **한 줄에** 놓는 압축 모드.
 *
 * 칩이 하나뿐인 지면(조약·기업)은 292px 줄에 116px짜리 칩 하나만 떠 있어 줄의 2/3가 비고,
 * 그 빈 줄이 목록을 36px 아래로 밀었다. 남는 폭이 충분하면 같은 줄에 앉히는 게 맞다.
 * 넘치면 wrap이 알아서 줄을 내주므로 폭이 좁아져도 깨지지 않는다.
 */
export const SearchFilterInline = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  /* 검색이 남는 폭을 먹되, 초기화 버튼이 끼어들면 그만큼 양보한다.
     실측(291px 줄): 검색 133 + 칩 90 + 초기화 56 + 간격 12 = 291 — 필터를 켜도 줄이 늘지
     않는다. 기준값을 160으로 두면 켜는 순간 초기화가 다음 줄로 떨어져 줄 수가 출렁였다. */
  > *:first-child {
    flex: 1 1 120px;
    min-width: 0;
  }
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
  /* 흰 지면에 흰 칸은 보이지 않는다 — 한 톤 내려 채워야 '칸'으로 읽힌다(테두리 대신 채움) */
  background-color: ${({ theme }) => sidebarFill(theme)};
  border: 1px solid transparent;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease;

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
    background-color: ${({ theme }) => sidebarFillHover(theme)};
    border-color: transparent;
  }

  /* 포커스는 반대로 채움을 걷고 테두리로 말한다 — 입력 중엔 글자가 지면 위에 바로 놓인다 */
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
    background-color: transparent;
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
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    background: ${({ theme }) => sidebarFillHover(theme)};
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
  transition:
    color 0.12s ease,
    background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => sidebarFillHover(theme)};
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

/**
 * 필터 칩 아래 **유도 줄** — 국가의 '과거 국가 289개 보기', 인물의 '상세 필터'.
 *
 * 국가·인물이 각자 같은 코드를 갖고 있었다(바이트까지 같았다). 한쪽만 고치면 곧 어긋난다.
 */
export const DiscoveryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

/**
 * 유도 배지 — **칩과 형태를 가른다**.
 *
 * 예전엔 칩과 같이 채워져 있어서 '네 번째 필터 줄'로 읽혔다. 하는 일이 다르다: 칩은 지금
 * 모수 안에서 값을 고르고, 배지는 **다른 모수로 점프**한다. 그래서 채움을 걷고 테두리만
 * 남긴다 — 같은 줄의 무게 다툼이 사라지고, 위계가 한 단 내려간다.
 */
export const DiscoveryBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  border: 1px solid ${({ theme }) => sidebarLine(theme)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => sidebarFill(theme)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

/** 배지 안의 수 — 배지가 흐린 톤이라 수만 본문 색으로 올려 읽히게 한다 */
export const DiscoveryBadgeCount = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/**
 * 유도 줄의 **상태 힌트** — '연결 안 됨 12', '상세 필터 적용 중'.
 *
 * 여기는 채움을 남긴다. 배지(누를 수 있는 것)보다 한 단 위가 아니라, **알아채야 하는 것**이라
 * 색으로 말할 자격이 있는 유일한 자리다. 톤은 도메인이 $tone으로 고른다.
 */
export const DiscoveryHint = styled.span<{ $tone?: 'warn' | 'accent' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  ${({ $tone = 'warn', theme }) => {
    const dark = theme.mode === 'dark'
    const palette =
      $tone === 'accent'
        ? {
            border: dark ? 'rgba(99,102,241,0.32)' : '#c7d2fe',
            background: dark ? 'rgba(99,102,241,0.14)' : '#eef2ff',
            color: dark ? '#a5b4fc' : '#3730a3',
          }
        : {
            border: dark ? 'rgba(245,158,11,0.32)' : '#fde68a',
            background: dark ? 'rgba(245,158,11,0.14)' : '#fef3c7',
            color: dark ? '#fbbf24' : '#92400e',
          }
    return css`
      border: 1px solid ${palette.border};
      background: ${palette.background};
      color: ${palette.color};
    `
  }}
`

export const FilterSelect = styled.select<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 22px 0 10px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? 'transparent' : 'transparent')};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  /* ⚠️ background-**color**로만 덮는다. shorthand를 쓰면 아래 화살표 SVG가
     background-image째로 지워져 칩이 그냥 알약이 된다. */
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : sidebarFill(theme)};
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  max-width: 116px;

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : sidebarFillHover(theme)};
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
  background: ${({ theme }) => sidebarSurface(theme)};

  /* 기본이 '접힘'인 그룹이라 눌러서 펼칠 수 있다는 신호가 필요하다.
     예전 hover 규칙은 평상시와 같은 색이어서 아무 피드백이 없었다. */
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
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

/**
 * 행 사이에 끼는 얇은 구분 라벨 — 도메인이 `item.leadDivider`로 요청한다.
 *
 * 그룹 헤더(아코디언)와 다르다: 접히지 않고, 누를 수도 없고, 그룹 안에서 **축을 끊어 주는
 * 앵커**다(사건 목록의 연도). 도메인이 자기 레일 좌표에 도트를 얹을 수 있도록 position만
 * 잡아 두고 나머지 장식은 하지 않는다.
 */
export const RowDivider = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  user-select: none;
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

  /* 선택 행 좌측 accent strip — 그룹(대륙·시대) 색으로 '어느 묶음의 선택인지'를 표시한다.
     $accentColor는 오래 전부터 넘어오고 있었지만 조판에서 쓰이지 않던 값이다. */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${({ $accentColor }) => $accentColor ?? 'transparent'};
    opacity: ${({ $active, $historicalActive }) =>
      $active || $historicalActive ? 1 : 0};
    transition: opacity 0.12s ease;
  }

  ${({ $active, $historicalActive, theme }) => css`
    background: ${$active || $historicalActive
      ? sidebarRowSelected(theme)
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
        ? sidebarRowSelected(theme)
        : sidebarFillHover(theme)};
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
  transition:
    opacity 0.12s ease,
    color 0.12s ease;

  ${ListRow}:hover &,
  ${ListRow}:focus-within & {
    opacity: 1;
  }

  &:hover {
    color: #f59e0b;
  }
`

/**
 * 행 맨 앞의 고정폭 슬롯 — 배지 대신 **값**을 세로로 정렬해 세울 때 쓴다(사건의 날짜).
 *
 * 배지(AvatarBadge)와 자리는 같지만 성격이 다르다: 배지는 색 블록이고, 이쪽은 행마다 같은
 * 자리에서 오른쪽 맞춤으로 읽히는 한 줄짜리 값이다. 폭·타이포는 도메인 스코프가 정한다.
 */
export const RowLead = styled.div`
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
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
  font-family: 'SF Mono', 'Roboto Mono', ui-monospace, Menlo, monospace;
  text-transform: uppercase;
  line-height: 1;
  background: ${({ theme }) => sidebarFill(theme)};
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
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ theme }) => sidebarFillHover(theme)};
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
  background: ${({ theme }) => sidebarFill(theme)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

/**
 * 행 첫 줄(이름).
 *
 * `$lines`를 2 이상으로 주면 말줄임 대신 그 줄 수까지 접어 준다 — 이름이 아니라 **문장**인
 * 도메인(사건 제목: "2025 이란–이스라엘 12일 전쟁 …")에서 한 줄 말줄임은 구분에 필요한
 * 꼬리를 먼저 잘라낸다. 기본값(1줄 말줄임)은 이름이 짧은 도메인(국가·인물)의 조판 그대로다.
 */
export const CodeText = styled.div<{ $unread?: boolean; $lines?: number }>`
  font-size: 15px;
  font-weight: 600;
  color: inherit; /* ListRow의 active/비활성 색 따라감 */
  letter-spacing: -0.01em;
  overflow: hidden;
  line-height: 1.4;
  flex: 1;
  min-width: 0;

  ${({ $lines }) =>
    $lines && $lines > 1
      ? css`
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: ${$lines};
          white-space: normal;
          overflow-wrap: anywhere;
        `
      : css`
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
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

  /* 기본은 '줄이지 않음' — 연도·수치·배지가 긴 이름에 밀려 사라지면 안 된다.
     줄어들 조각은 SubMetaText로 명시한다. */
  > * {
    flex-shrink: 0;
  }

  > span.dot {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.tertiary};
    opacity: 0.5;
    flex-shrink: 0;
  }
`

/**
 * SubMeta 안에서 남는 폭을 먹고, 넘치면 말줄임되는 조각(역사국가 영문명·수도 등).
 * SubMeta가 flex라 부모의 text-overflow가 자식에 먹지 않아 예전엔 그냥 잘려 나갔다
 * — 뒤따르는 존속기간·배지가 통째로 화면 밖으로 밀리던 원인.
 */
export const SubMetaText = styled.span`
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  /* ⚠️ 반투명 흰 카드는 흰 지면 위에서 사라진다 — 채움 한 단계 + 경계선으로 세운다 */
  background: ${({ theme }) => sidebarFill(theme)};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => sidebarLine(theme)};
`

export const EmptyFilterIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-bottom: 12px;
  background: ${({ theme }) => sidebarFill(theme)};
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
  background: ${({ theme }) => sidebarSurface(theme)};
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(0, 0, 0, 0.18)'};
    background: ${({ theme }) => sidebarFillHover(theme)};
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
