import styled, { css, keyframes } from 'styled-components'

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`

export const WideShell = styled.div`
  width: 100%;
  box-sizing: border-box;
  min-height: 100%;
  padding: clamp(20px, 3vw, 44px) clamp(14px, 3.5vw, 48px) 56px;
  background: ${({ theme }) => theme.colors.background.primary};
`

/** SectionTabHeader `leftSlot` — 회색 베이스, 인디고는 좌측 악센트만 */
export const SectionHeaderIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: ${theme.colors.text.secondary};
          background: ${theme.colors.background.tertiary};
          border: 1px solid ${theme.colors.border.medium};
          box-shadow: inset 3px 0 0 0 ${theme.colors.primary}55;
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: ${theme.colors.background.secondary};
          border: 1px solid ${theme.colors.border.default};
          box-shadow: inset 3px 0 0 0 ${theme.colors.primary}35;
        `}
`

export const PageHeaderBlock = styled.div`
  margin-bottom: 0;
`

export const PageMetaStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 22px;
`

export const MetaChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : theme.colors.border.default};
`

/** 주요 CTA만 인디고 풀 사용 */
export const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 2px 10px ${({ theme }) => `${theme.colors.primary}30`};
  transition:
    transform 0.15s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.06),
      0 4px 16px ${({ theme }) => `${theme.colors.primary}38`};
  }
  &:active {
    transform: scale(0.98);
  }
`

export const GhostBtn = styled.button`
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? theme.colors.background.tertiary
        : theme.colors.background.tertiary};
  }
`

/** 연도 필터 — 표보다 가벼운 톤(보조 영역) */
export const RangeFilterCard = styled.section`
  margin-bottom: 20px;
  padding: 16px 18px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : theme.colors.border.light};
`

export const RangeFilterHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 14px;
`

export const RangeFilterTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const RangeFilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 14px;
`

export const RangeField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const RangeLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RangeInput = styled.input`
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  width: 112px;
  letter-spacing: -0.02em;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &:focus {
    outline: none;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
          `
        : css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
          `}
  }
`

export const RangeConnector = styled.span`
  display: inline-flex;
  align-items: center;
  padding-bottom: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 15px;
  font-weight: 500;
`

export const RangeHint = styled.p`
  margin: 16px 0 0;
  padding-top: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RangeOrderNote = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 매트릭스 — 가로 스크롤 시 양끝 페이드 힌트 */
export const MatrixScroll = styled.div`
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  max-height: none;
  border-radius: 16px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid ${theme.colors.border.default};
          box-shadow:
            inset 12px 0 18px -10px rgba(0, 0, 0, 0.65),
            inset -12px 0 18px -10px rgba(0, 0, 0, 0.65);
        `
      : css`
          border: 1px solid ${theme.colors.border.default};
          box-shadow:
            0 1px 3px ${theme.colors.shadow.sm},
            inset 12px 0 18px -10px rgba(0, 0, 0, 0.04),
            inset -12px 0 18px -10px rgba(0, 0, 0, 0.04);
        `}
  -webkit-overflow-scrolling: touch;
`

export const MatrixGrid = styled.div<{ $nCountries: number; $nDataRows: number }>`
  display: grid;
  grid-template-columns: 96px repeat(
      ${({ $nCountries }) => $nCountries},
      minmax(208px, 1fr)
    );
  grid-template-rows: auto repeat(
    ${({ $nDataRows }) => Math.max(1, $nDataRows)},
    minmax(72px, auto)
  );
  gap: 1px;
  min-width: ${({ $nCountries }) => {
    const n = Math.max(1, $nCountries)
    return `calc(96px + ${n} * 209px)`
  }};
  width: max(
    100%,
    ${({ $nCountries }) => {
      const n = Math.max(1, $nCountries)
      return `calc(96px + ${n} * 221px)`
    }},
  );
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.border.default
      : theme.colors.border.light};
`

const cellBg = (theme: { colors: { background: { primary: string } } }) =>
  theme.colors.background.primary

export const CellCorner = styled.div`
  grid-column: 1;
  grid-row: 1;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 6;
  padding: 16px 12px;
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => cellBg(theme)};
  border: none;
  box-shadow:
    4px 4px 16px rgba(0, 0, 0, 0.06),
    0 0 0 1px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(0,0,0,0.04)'} inset;
`

/** 드래그 힌트 — 헤더 hover·focus-within 시에만 표시 */
export const HeadGripVisual = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 3px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CellCountryHead = styled.div<{
  $gridColumn: number
  $canReorder?: boolean
  $dragOver?: boolean
}>`
  grid-column: ${({ $gridColumn }) => $gridColumn};
  grid-row: 1;
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 12px 12px 12px 14px;
  min-height: 84px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  background: ${({ theme }) => cellBg(theme)};
  box-shadow: 0 1px 0
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease;
  ${({ $canReorder }) =>
    $canReorder &&
    css`
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      &:active {
        cursor: grabbing;
      }
      &:hover ${HeadGripVisual},
      &:focus-within ${HeadGripVisual} {
        opacity: 0.48;
      }
    `}
  ${({ $dragOver, theme }) =>
    $dragOver &&
    css`
      background: ${theme.mode === 'dark'
        ? theme.colors.background.tertiary
        : theme.colors.hover};
      box-shadow:
        inset 0 0 0 1px ${theme.colors.border.medium},
        0 1px 0
          ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(0,0,0,0.06)'};
    `}
`

/** 헤더 한 줄: 타이틀 영역 + ⋮ 메뉴 */
export const HeadHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  min-width: 0;
`

export const HeadTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
`

export const HeadMenuAnchor = styled.div`
  position: relative;
  flex-shrink: 0;
  z-index: 12;
`

export const HeadMoreTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
  }
`

export const HeadMenuPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 176px;
  padding: 6px;
  border-radius: 14px;
  z-index: 30;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${theme.colors.background.secondary};
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 16px 48px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.light};
          box-shadow:
            0 12px 40px ${theme.colors.shadow.md},
            0 0 0 1px rgba(255, 255, 255, 0.8) inset;
        `}
`

export const HeadMenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error : theme.colors.text.primary};
  transition: background 0.15s ease;
  &:hover {
    background: ${({ theme, $danger }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239,68,68,0.12)'
          : 'rgba(239,68,68,0.08)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : theme.colors.background.secondary};
  }
`

export const HeadFlag = styled.span`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`

export const HeadTitleBlock = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const HeadName = styled.span`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export const CellYear = styled.div<{ $gridRow: number }>`
  grid-column: 1;
  grid-row: ${({ $gridRow }) => $gridRow};
  position: sticky;
  left: 0;
  z-index: 4;
  padding: 14px 10px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => cellBg(theme)};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          box-shadow:
            4px 0 20px rgba(0, 0, 0, 0.55),
            1px 0 0 ${theme.colors.border.default};
        `
      : css`
          box-shadow:
            4px 0 14px rgba(0, 0, 0, 0.06),
            1px 0 0 ${theme.colors.border.light};
        `}
  border: none;
`

export const CellData = styled.div<{
  $gridColumn: number
  $gridRowStart: number
  $gridRowEnd: number
  $centerContent?: boolean
}>`
  grid-column: ${({ $gridColumn }) => $gridColumn};
  grid-row: ${({ $gridRowStart, $gridRowEnd }) =>
    `${$gridRowStart} / ${$gridRowEnd}`};
  padding: ${({ $gridRowStart, $gridRowEnd }) =>
    $gridRowEnd - $gridRowStart > 1 ? '8px 12px' : '12px 14px'};
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: ${({ $centerContent }) => ($centerContent ? 'center' : 'stretch')};
  justify-content: ${({ $centerContent }) =>
    $centerContent ? 'center' : 'flex-start'};
  background: ${({ theme }) => cellBg(theme)};
  vertical-align: top;
  border: none;
`

export const CellDataInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  width: 100%;
  align-items: stretch;
`

/** 행정부 카드 — 클릭 시 해당 국가 행정조직(/government)으로 이동 */
export const MiniCabinet = styled.button<{ $stretch?: boolean }>`
  width: 100%;
  max-width: 100%;
  padding: ${({ $stretch }) => ($stretch ? '12px 14px' : '10px 12px')};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: inherit;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color 0.2s ease,
    background 0.15s ease;
  ${({ $stretch }) =>
    $stretch &&
    css`
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
    `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : theme.colors.background.secondary};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
          `
        : css`
            border-color: ${theme.colors.border.dark};
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
          `}
  }
`

/** 연속 연도 병합 시 본문 블록 (가운데 정렬) */
export const MiniCabinetContent = styled.div<{ $centered?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  ${({ $centered }) =>
    $centered &&
    css`
      text-align: center;
      align-items: center;
    `}
`

export const MiniCabinetMediaRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-width: 0;
`

export const MiniCabinetTextCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const MiniCabinetThumb = styled.div<{ $large?: boolean }>`
  flex-shrink: 0;
  width: ${({ $large }) => ($large ? 52 : 40)}px;
  height: ${({ $large }) => ($large ? 52 : 40)}px;
  border-radius: ${({ $large }) => ($large ? '12px' : '10px')};
  overflow: hidden;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MiniCabinetThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

export const MiniCabinetThumbFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`

export const MiniCabinetTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

/** 수반 재임 대수(제N대) — termNumber / regnalNumber */
export const MiniCabinetTerm = styled.div`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.3;
`

export const MiniCabinetMeta = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  max-width: 100%;
`

/** 빈 셀·로딩 — 카드 없이 타이포만 */
export const CellStateText = styled.span<{ $muted?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
  line-height: 1.4;
  user-select: none;
`

export const LoadingBar = styled.div`
  margin-bottom: 14px;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.background.secondary} 0%,
    ${({ theme }) =>
        theme.mode === 'dark'
          ? theme.colors.background.quaternary
          : theme.colors.background.tertiary}
      50%,
    ${({ theme }) => theme.colors.background.secondary} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.8s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-position: 50% 50%;
  }
`
