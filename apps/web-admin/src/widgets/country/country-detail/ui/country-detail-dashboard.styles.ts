import styled, { css } from 'styled-components'

/* ─── Design tokens ───────────────────────────────────────────────────── */

const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 }
const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

const PRIMARY = '#6366f1'
const PRIMARY_INK = '#4f46e5'
const PRIMARY_SOFT_BG = 'rgba(99, 102, 241, 0.08)'
const PRIMARY_SOFT_BORDER = 'rgba(99, 102, 241, 0.2)'

const SUCCESS = '#10b981'
const SUCCESS_SOFT_BG = 'rgba(16, 185, 129, 0.12)'
const DANGER_DOT = '#ef4444'

/* 카테고리별 액센트 — KPI는 indigo, 등록현황은 5색 */
export type AccentKey =
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'emerald'

interface AccentDef {
  base: string
  ink: string
  soft: string
  border: string
  glow: string
  watermark: string
}

const ACCENTS: Record<AccentKey, AccentDef> = {
  indigo: {
    base: '#6366f1',
    ink: '#4f46e5',
    soft: 'rgba(99, 102, 241, 0.10)',
    border: 'rgba(99, 102, 241, 0.22)',
    glow: 'rgba(99, 102, 241, 0.28)',
    watermark: 'rgba(99, 102, 241, 0.06)',
  },
  violet: {
    base: '#8b5cf6',
    ink: '#7c3aed',
    soft: 'rgba(139, 92, 246, 0.10)',
    border: 'rgba(139, 92, 246, 0.22)',
    glow: 'rgba(139, 92, 246, 0.28)',
    watermark: 'rgba(139, 92, 246, 0.06)',
  },
  rose: {
    base: '#f43f5e',
    ink: '#e11d48',
    soft: 'rgba(244, 63, 94, 0.10)',
    border: 'rgba(244, 63, 94, 0.22)',
    glow: 'rgba(244, 63, 94, 0.26)',
    watermark: 'rgba(244, 63, 94, 0.06)',
  },
  amber: {
    base: '#f59e0b',
    ink: '#d97706',
    soft: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.26)',
    glow: 'rgba(245, 158, 11, 0.30)',
    watermark: 'rgba(245, 158, 11, 0.07)',
  },
  sky: {
    base: '#0ea5e9',
    ink: '#0284c7',
    soft: 'rgba(14, 165, 233, 0.10)',
    border: 'rgba(14, 165, 233, 0.22)',
    glow: 'rgba(14, 165, 233, 0.28)',
    watermark: 'rgba(14, 165, 233, 0.06)',
  },
  emerald: {
    base: '#10b981',
    ink: '#059669',
    soft: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.26)',
    glow: 'rgba(16, 185, 129, 0.28)',
    watermark: 'rgba(16, 185, 129, 0.07)',
  },
}

const accent = ($k: AccentKey | undefined, key: keyof AccentDef) =>
  ACCENTS[$k ?? 'indigo'][key]

/* ─── Surface helpers ─────────────────────────────────────────────────── */

const surfaceStatic = css`
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.07);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        `}
`

const surfaceInteractive = css<{ $accent?: AccentKey }>`
  ${surfaceStatic}
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
  &:hover {
    transform: translateY(-2px);
    ${({ theme, $accent }) => {
      const glow = accent($accent, 'glow')
      const softGlow = glow.replace(/0\.\d+\)/, '0.12)')
      return theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.05);
            border-color: ${accent($accent, 'border')};
            box-shadow: 0 4px 14px ${softGlow};
          `
        : css`
            border-color: ${accent($accent, 'border')};
            box-shadow: 0 4px 14px ${softGlow};
          `
    }}
  }
  &:focus-visible {
    outline: 2px solid ${({ $accent }) => accent($accent, 'base')};
    outline-offset: 2px;
  }
`

/* ─── Layout root ─────────────────────────────────────────────────────── */

export const DashboardRoot = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: ${space.xxxl}px 40px 48px;
  gap: ${space.xxxl}px;

  /* 헤더 ↔ 본문 사이 단일 indigo 약한 fade */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    pointer-events: none;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(to bottom, rgba(99, 102, 241, 0.06), transparent)'
        : 'linear-gradient(to bottom, rgba(99, 102, 241, 0.04), transparent)'};
  }

  @media (max-width: 1024px) {
    padding: ${space.xxl}px 28px 36px;
    gap: 28px;
  }
  @media (max-width: 768px) {
    padding: ${space.xl}px ${space.xl}px 28px;
    gap: ${space.xxl}px;
  }
  @media (max-width: 480px) {
    padding: ${space.lg}px ${space.lg}px ${space.xxl}px;
    gap: ${space.xl}px;
  }
`

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.lg}px;
`

export const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm}px;
  margin-bottom: ${space.xs}px;
`

export const SectionTitleIcon = styled.div<{ $accent?: AccentKey }>`
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $accent }) => accent($accent, 'soft')};
  color: ${({ $accent }) => accent($accent, 'ink')};
  border: 1px solid ${({ $accent }) => accent($accent, 'border')};

  svg {
    width: 14px;
    height: 14px;
  }
`

export const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const SectionCountChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: ${space.xs}px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
`

export const SectionTitleSpacer = styled.div`
  flex: 1;
`

/* ─── Top row: completeness + heads ───────────────────────────────────── */

export const TwoColRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${space.xl}px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export const CardPanel = styled.div<{ $accent?: AccentKey }>`
  position: relative;
  border-radius: 10px;
  padding: ${space.xl}px ${space.xxl}px;
  ${surfaceStatic}
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: ${({ $accent }) => accent($accent, 'base')};
  }
`

export const CardPanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
`

export const CardPanelTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CardPanelHint = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── Completeness — 도넛 차트 ────────────────────────────────────────── */

export const CompletenessRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: ${space.xl}px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
`

export const DonutWrap = styled.div`
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
`

export const DonutSvg = styled.svg`
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
`

export const DonutTrackCircle = styled.circle`
  fill: none;
  stroke: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)'};
  stroke-width: 10;
`

export const DonutFillCircle = styled.circle<{ $full: boolean }>`
  fill: none;
  stroke: ${({ $full }) => ($full ? SUCCESS : PRIMARY)};
  stroke-width: 10;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    stroke 0.3s ease;
`

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
`

export const DonutPercent = styled.span`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

export const DonutSubLabel = styled.span`
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export const CompletenessTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm}px;
  min-width: 0;
`

export const CompletenessLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

export const CompletenessLineStrong = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`

export const CompletionFullState = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
  padding: 6px 10px;
  border-radius: 6px;
  background: ${SUCCESS_SOFT_BG};
  color: ${SUCCESS};
  font-size: 12px;
  font-weight: 700;
  align-self: flex-start;
`

export const CompletionCheckIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  svg {
    width: 14px;
    height: 14px;
  }
`

export const MissingChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const missingChipBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: ${radius.pill}px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: ${radius.pill}px;
    background: ${DANGER_DOT};
    flex-shrink: 0;
  }
`

export const MissingChip = styled.span`
  ${missingChipBase}
`

export const MissingChipButton = styled.button`
  ${missingChipBase}
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
  &:hover {
    background: ${PRIMARY_SOFT_BG};
    border-color: ${PRIMARY_SOFT_BORDER};
    color: ${PRIMARY_INK};
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
  }
`

/* ─── Current heads — featured + 보조 ─────────────────────────────────── */

export const HeadsLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
`

export const FeaturedHeadCard = styled.button`
  appearance: none;
  text-align: left;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: ${space.lg}px;
  padding: ${space.lg}px;
  border-radius: 10px;
  border: 1px solid ${PRIMARY_SOFT_BORDER};
  background: linear-gradient(
    135deg,
    ${PRIMARY_SOFT_BG} 0%,
    rgba(139, 92, 246, 0.08) 100%
  );
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
  &:hover {
    transform: translateY(-1px);
    border-color: ${PRIMARY};
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12);
  }
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`

export const FeaturedAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${radius.pill}px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: #ffffff;
  border: 2px solid #ffffff;
  color: ${PRIMARY};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const FeaturedMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const PositionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffffff;
  background: linear-gradient(135deg, ${PRIMARY}, #8b5cf6);
`

export const FeaturedName = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const FeaturedMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space.sm}px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FeaturedMetaSep = styled.span`
  opacity: 0.4;
`

export const HeadList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
`

export const HeadRow = styled.button`
  appearance: none;
  text-align: left;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${space.md}px;
  padding: ${space.sm}px ${space.md}px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${PRIMARY_SOFT_BG};
    border-color: ${PRIMARY_SOFT_BORDER};
  }
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: default;
    &:hover {
      background: transparent;
      border-color: transparent;
    }
  }
`

export const HeadAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${radius.pill}px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  background: ${PRIMARY_SOFT_BG};
  color: ${PRIMARY};
  border: 1px solid ${PRIMARY_SOFT_BORDER};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const HeadMain = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const HeadName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const HeadMeta = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ─── 국가 정보 (highlight) ──────────────────────────────────────────── */

export const HighlightInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${space.lg}px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`

/* 카테고리별 액센트 좌측 바 */
export const HighlightCard = styled.div<{ $accent?: AccentKey }>`
  position: relative;
  border-radius: 10px;
  padding: ${space.xxl}px;
  ${surfaceStatic}
  display: flex;
  flex-direction: column;
  gap: ${space.sm}px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: ${({ $accent }) => accent($accent, 'base')};
  }
`

export const HighlightIconBox = styled.div<{ $accent?: AccentKey }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $accent }) => accent($accent, 'soft')};
  color: ${({ $accent }) => accent($accent, 'ink')};
  border: 1px solid ${({ $accent }) => accent($accent, 'border')};
  z-index: 1;

  svg {
    width: 18px;
    height: 18px;
  }
`

export const HighlightLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.02em;
  text-transform: uppercase;
  z-index: 1;
`

export const HighlightValue = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  z-index: 1;
  @media (max-width: 480px) {
    font-size: 26px;
  }
`

export const HighlightUnit = styled.span`
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const MetaInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.lg}px ${space.xxl}px;
  padding: 0 ${space.xs}px;
`

export const MetaInlineItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const MetaInlineLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MetaInlineValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`

/* ─── 등록 현황 stat cards ──────────────────────────────────────────── */

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${space.lg}px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

export const StatCard = styled.div<{
  $interactive: boolean
  $dim?: boolean
  $accent?: AccentKey
}>`
  position: relative;
  border-radius: 10px;
  padding: ${space.xl}px ${space.xxl}px;
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  overflow: hidden;
  ${({ $interactive }) => ($interactive ? surfaceInteractive : surfaceStatic)}
  ${({ $dim }) =>
    $dim &&
    css`
      opacity: 0.6;
    `}

  /* 호버 시에만 카테고리 색 워터마크 등장 */
  &::after {
    content: '';
    position: absolute;
    top: -40%;
    right: -30%;
    width: 70%;
    height: 140%;
    background: radial-gradient(
      circle,
      ${({ $accent }) => accent($accent, 'watermark')} 0%,
      transparent 65%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  ${({ $interactive }) =>
    $interactive &&
    css`
      &:hover::after {
        opacity: 1;
      }
    `}
`

export const StatHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space.sm}px;
  position: relative;
  z-index: 1;
`

export const StatLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
`

export const StatIcon = styled.div<{ $accent?: AccentKey }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    ${({ $accent }) => accent($accent, 'soft')},
    ${({ $accent }) => accent($accent, 'border')}
  );
  color: ${({ $accent }) => accent($accent, 'ink')};

  svg {
    width: 22px;
    height: 22px;
  }
`

export const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: -0.005em;
`

export const StatValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${space.md}px;
  position: relative;
  z-index: 1;
`

export const StatValue = styled.div`
  font-size: 30px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
`

export const StatUnit = styled.span`
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 추세 칩 — 카테고리 색 동기화 */
export const DeltaChip = styled.span<{ $accent?: AccentKey }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $accent }) => accent($accent, 'soft')};
  color: ${({ $accent }) => accent($accent, 'ink')};
  border: 1px solid ${({ $accent }) => accent($accent, 'border')};
  font-variant-numeric: tabular-nums;
`

export const StatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
`

export const StatCardButton = styled.button`
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  width: 100%;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
    border-radius: 10px;
  }
`

export const EmptyHint = styled.p`
  margin: 0;
  padding: ${space.lg}px ${space.xl}px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 8px;
  line-height: 1.5;
  ${surfaceStatic}
`

/* ─── 최근 활동 — 타임라인 ──────────────────────────────────────────── */

export const FeedPanel = styled.div`
  position: relative;
  border-radius: 10px;
  padding: ${space.xl}px ${space.xxl}px;
  ${surfaceStatic}
`

export const ActivityGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm}px;
  padding: ${space.md}px ${space.xs}px ${space.sm}px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  &:first-child {
    padding-top: 0;
  }
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15, 23, 42, 0.06)'};
  }
`

export const FeedList = styled.ul`
  position: relative;
  margin: 0;
  padding: 0 0 0 28px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  max-height: clamp(280px, 50vh, 520px);
  overflow-y: auto;

  /* 좌측 세로 라인 */
  &::before {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 11px;
    width: 1.5px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(15, 23, 42, 0.08)'};
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
    border-radius: ${radius.pill}px;
  }
`

export const FeedItem = styled.li`
  position: relative;
`

export const FeedDot = styled.span<{ $accent?: AccentKey }>`
  position: absolute;
  left: -22px;
  top: 16px;
  width: 10px;
  height: 10px;
  border-radius: ${radius.pill}px;
  background: ${({ $accent }) => accent($accent, 'base')};
  box-shadow: 0 0 0 2.5px
    ${({ theme }) => (theme.mode === 'dark' ? '#0b0d12' : '#ffffff')};
`

export const FeedRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${space.md}px;
  padding: 10px ${space.md}px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
  &:hover {
    background: ${PRIMARY_SOFT_BG};
    border-color: ${PRIMARY_SOFT_BORDER};
    transform: translateX(2px);
  }
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
  }
`

export const FeedAvatar = styled.div<{ $accent?: AccentKey }>`
  width: 32px;
  height: 32px;
  border-radius: ${radius.pill}px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  background: ${({ $accent }) => accent($accent, 'soft')};
  color: ${({ $accent }) => accent($accent, 'ink')};
  border: 1px solid ${({ $accent }) => accent($accent, 'border')};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    width: 14px;
    height: 14px;
  }
`

export const FeedAvatarSpacer = styled.span`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
`

export const FeedLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const FeedTime = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

export const FeedEmpty = styled.p`
  margin: 0;
  padding: ${space.xxl}px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`

export const EmptyWithCta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.md}px;
  padding: ${space.xl}px 0;
  & > p {
    padding: 0;
  }
`

/* ─── Quick Actions bar ──────────────────────────────────────────────── */

export const QuickActionsBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.sm}px;
`

export const QuickActionButton = styled.button<{ $accent?: AccentKey }>`
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $accent }) => accent($accent, 'ink')};
  background: ${({ $accent }) => accent($accent, 'soft')};
  border: 1px solid ${({ $accent }) => accent($accent, 'border')};
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    background: ${({ $accent }) => accent($accent, 'border')};
    color: ${({ $accent }) => accent($accent, 'ink')};
  }
  &:focus-visible {
    outline: 2px solid ${({ $accent }) => accent($accent, 'base')};
    outline-offset: 2px;
  }
`

/* ─── Sparkline ─────────────────────────────────────────────────────── */

export const SparkSvg = styled.svg`
  display: block;
  width: 100%;
  height: 32px;
  margin-top: ${space.xs}px;
  overflow: visible;
`

export const VisuallyHidden = styled.span`
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

/* ─── 대륙 비교 칩 ───────────────────────────────────────────────────── */

export const CompareLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  z-index: 1;
`

export const ComparePill = styled.span<{ $direction: 'up' | 'down' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ $direction }) =>
    $direction === 'up'
      ? 'rgba(16, 185, 129, 0.10)'
      : $direction === 'down'
        ? 'rgba(244, 63, 94, 0.10)'
        : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ $direction }) =>
    $direction === 'up'
      ? '#059669'
      : $direction === 'down'
        ? '#e11d48'
        : '#64748b'};
  border: 1px solid
    ${({ $direction }) =>
      $direction === 'up'
        ? 'rgba(16, 185, 129, 0.22)'
        : $direction === 'down'
          ? 'rgba(244, 63, 94, 0.22)'
          : 'rgba(15, 23, 42, 0.10)'};
`

/* ─── 정치 카드 (정부/선거) ─────────────────────────────────────────── */

export const PoliticsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${space.xl}px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export const GovHeadingBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const GovStartDate = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PartyRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  font-size: 12.5px;
`

export const PartySwatch = styled.span<{ $color?: string | null }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
  background: ${({ $color }) => $color ?? '#8b5cf6'};
  border: 1px solid rgba(15, 23, 42, 0.12);
`

export const PartyName = styled.span`
  flex: 1;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PartyShare = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PartyBarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: ${radius.pill}px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
  display: flex;
`

export const PartyBarSeg = styled.div<{ $color?: string | null }>`
  height: 100%;
  background: ${({ $color }) => $color ?? '#8b5cf6'};
`

export const PartyList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/* 선거 카드 — 큰 D-N 표기 */
export const ElectionDay = styled.div<{ $past?: boolean }>`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ $past }) => ($past ? '#64748b' : PRIMARY_INK)};
`

export const ElectionMeta = styled.div`
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ElectionName = styled.span`
  display: block;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ─── 역사적 전신 lineage ────────────────────────────────────────────── */

export const LineageFlow = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const LineageChip = styled.li`
  display: flex;
  align-items: center;
`

export const LineageArrow = styled.li`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
  user-select: none;
`

export const LineageChipBody = styled.span`
  display: inline-flex;
  flex-direction: column;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
`

export const LineageName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const LineageYears = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
`

/* ─── 활동 헤더 보조 텍스트 ─────────────────────────────────────────── */

export const LastUpdatedHint = styled.span`
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

export const EmptyCtaButton = styled.button`
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: ${PRIMARY};
  color: #ffffff;
  border: 1px solid ${PRIMARY_INK};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    background: ${PRIMARY_INK};
  }
  &:focus-visible {
    outline: 2px solid ${PRIMARY};
    outline-offset: 2px;
  }
`

/* ── 개편(2026-08): 규모 지표 바 · 지금 · 하단 2열 ───────────────────────────── */

/**
 * 규모 지표 바 — 인구·면적·밀도·수도·ISO를 한 줄에.
 * 예전엔 큰 카드 3개(인구/면적/수도) + 별도 메타 줄로 세로를 많이 먹었다. 값 자체는
 * 짧으므로 한 줄에 세워도 읽힌다.
 */
export const FactBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1px;
  border-radius: 14px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border.light};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const Fact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const FactLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FactValue = styled.span`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const FactUnit = styled.span`
  margin-left: 3px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** '지금' — 현임 수반 · 현 내각 · 선거 3매를 한 행에 */
export const NowRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  align-items: stretch;
`

/** 하단 보조 — 최근 활동과 완성도를 나란히 */
export const BottomRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/** 섹션 제목 줄 우측 텍스트 링크 (‘전체 보기’) */
export const SectionLink = styled.button`
  margin-left: auto;
  border: none;
  background: transparent;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/** 계보 요약 위 '이전 N개' 줄 — 좌측 정렬(SectionLink의 margin-left:auto 무효화) */
export const LineageMoreRow = styled.div`
  display: flex;
  margin-bottom: 6px;

  > button {
    margin-left: 0;
  }
`
