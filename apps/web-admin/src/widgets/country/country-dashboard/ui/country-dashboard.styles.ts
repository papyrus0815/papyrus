/**
 * CountryDashboard 위젯 전용 스타일
 * 우측 컨텐츠: 전 세계 국가 통계, KPI, 차트, 테이블
 * 리퀴드 글래스 디자인은 다크 모드 전용
 */
import styled, { css, keyframes } from 'styled-components'
import type { DefaultTheme } from 'styled-components'

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

/** 다크 모드 리퀴드 글래스 카드 기본 스타일 */
const liquidCard = (theme: DefaultTheme) =>
  theme.mode === 'dark'
    ? css`
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.07);
        box-shadow:
          0 4px 20px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);

        &::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.03) 0%,
            transparent 50%
          );
          pointer-events: none;
        }
      `
    : css`
        background: ${theme.colors.background.primary};
        border: 1px solid ${theme.colors.border.default};
        box-shadow: 0 2px 8px ${theme.colors.shadow.sm};
      `

/** 다크 모드 리퀴드 글래스 hover 효과 */
const liquidHover = (theme: DefaultTheme) =>
  theme.mode === 'dark'
    ? css`
        transform: translateY(-2px);
        box-shadow:
          0 8px 28px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border-color: rgba(99, 106, 242, 0.4);
      `
    : css`
        box-shadow: 0 4px 16px ${theme.colors.shadow.md};
        border-color: ${theme.colors.primary};
      `

const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

// ─── 전체 레이아웃 ────────────────────────────────────────────────────────────

export const GlobalDashboard = styled.div`
  padding: 32px 40px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  animation: ${fadeSlideIn} 0.35s ease;

  @media (max-width: 1024px) { padding: 24px 28px 36px; gap: 28px; }
  @media (max-width: 768px)  { padding: 20px 20px 28px; gap: 24px; }
  @media (max-width: 480px)  { padding: 16px 16px 24px; gap: 20px; }
`

// ─── 히어로 헤더 ──────────────────────────────────────────────────────────────

export const GlobalDashboardHero = styled.header`
  padding: 28px 32px;
  border-radius: 20px;
  position: relative;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.default};
          box-shadow: 0 2px 8px ${theme.colors.shadow.sm};
        `}

  @media (max-width: 768px) { padding: 20px 22px; border-radius: 16px; }
`

export const HeroBackground = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse at 15% 50%,
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 106, 242, 0.1)'
            : 'rgba(99, 102, 241, 0.06)'}
        0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 85% 20%,
      ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(159, 122, 234, 0.07)'
            : 'rgba(139, 92, 246, 0.04)'}
        0%,
      transparent 55%
    );
`

export const HeroContent = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) { gap: 14px; }
`

export const HeroIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.gradient.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  box-shadow: 0 8px 20px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'},
    inset 0 1px 0 rgba(255, 255, 255, 0.25);

  svg { width: 24px; height: 24px; }

  @media (max-width: 768px) {
    width: 42px; height: 42px; border-radius: 12px;
    svg { width: 21px; height: 21px; }
  }
`

export const HeroTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`

export const HeroTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.3;

  @media (max-width: 768px) { font-size: 18px; }
`

export const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: 768px) { font-size: 12px; }
`

// ─── 섹션 타이틀 ──────────────────────────────────────────────────────────────

export const DashboardSectionTitle = styled.div<{ $mt?: string }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 0 18px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 6px;
  ${({ $mt }) => $mt && `margin-top: ${$mt};`}
`

export const SectionTitleIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.primary};

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        `
      : css`
          background: ${theme.colors.activeLight};
        `}
`

export const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;

  @media (max-width: 768px) { font-size: 17px; }
`

// ─── 글로벌 KPI 그리드 ────────────────────────────────────────────────────────

export const GlobalMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (min-width: 769px) and (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px)  { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (max-width: 480px)  { grid-template-columns: 1fr; gap: 8px; }
`

export const GlobalMetricCard = styled.div`
  border-radius: 18px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  ${({ theme }) => liquidCard(theme)}

  &:hover { ${({ theme }) => liquidHover(theme)} }

  @media (max-width: 480px) { padding: 18px 20px; border-radius: 16px; }
`

export const GlobalMetricIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.gradient.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.35)'
        : 'rgba(99, 102, 241, 0.25)'};

  svg { width: 20px; height: 20px; }
`

export const GlobalMetricContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`

export const GlobalMetricLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`

export const GlobalMetricValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.2;
  letter-spacing: -0.02em;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 2px;

  @media (max-width: 480px) { font-size: 20px; }
`

export const GlobalMetricSubtext = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

// ─── 글로벌 위젯 그리드 (차트) ─────────────────────────────────────────────────

export const GlobalDashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;

  @media (min-width: 769px) and (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (max-width: 768px)  { grid-template-columns: 1fr; gap: 12px; }
  @media (max-width: 480px)  { gap: 10px; }
`

export const GlobalWidget = styled.div`
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  ${({ theme }) => liquidCard(theme)}

  &:hover { ${({ theme }) => liquidHover(theme)} }

  @media (max-width: 480px) { padding: 20px; border-radius: 16px; }
`

export const GlobalWidgetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : theme.colors.border.light};
  position: relative;
  z-index: 1;
`

export const GlobalWidgetIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        `
      : css`
          background: ${theme.colors.activeLight};
        `}

  svg { width: 19px; height: 19px; }
`

export const GlobalWidgetTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
`

export const GlobalWidgetContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  position: relative;
  z-index: 1;
`

// ─── 바 차트 ─────────────────────────────────────────────────────────────────

export const BarChartList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const BarChartRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`

export const BarChartLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const BarChartTrack = styled.div`
  height: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : theme.colors.background.tertiary};
  border-radius: 4px;
  overflow: hidden;
`

export const BarChartFill = styled.div<{ $percent: number; $rank?: 1 | 2 | 3 }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  border-radius: 4px;
  transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${(p) =>
    p.$rank === 1
      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
      : p.$rank === 2
        ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
        : p.$rank === 3
          ? 'linear-gradient(90deg, #92400e, #b45309)'
          : p.theme.colors.gradient.primary};
  box-shadow: ${(p) =>
    p.theme.mode === 'dark'
      ? p.$rank === 1
        ? '0 0 6px rgba(245, 158, 11, 0.5)'
        : p.$rank === 2
          ? '0 0 4px rgba(148, 163, 184, 0.3)'
          : p.$rank === 3
            ? '0 0 5px rgba(146, 64, 14, 0.4)'
            : '0 0 6px rgba(99, 106, 242, 0.4)'
      : 'none'};
`

export const BarChartRank = styled.div<{ $rank: number }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  background: ${(p) =>
    p.$rank === 1
      ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
      : p.$rank === 2
        ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
        : p.$rank === 3
          ? 'linear-gradient(135deg, #fef3c7, #fcd34d)'
          : p.theme.colors.background.tertiary};
  color: ${(p) =>
    p.$rank === 1 ? '#d97706' : p.$rank === 2 ? '#64748b' : p.$rank === 3 ? '#92400e' : p.theme.colors.text.secondary};
`

export const BarChartValue = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
`

// ─── 국가 비교 테이블 ─────────────────────────────────────────────────────────

export const DashboardTableWrap = styled.div`
  border-radius: 20px;
  overflow: hidden;
  position: relative;

  ${({ theme }) => liquidCard(theme)}
`

export const DashboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  @media (max-width: 768px) { font-size: 13px; }
  @media (max-width: 480px) { font-size: 12px; display: block; overflow-x: auto; }
`

export const DashboardTableHead = styled.thead`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : theme.colors.background.secondary};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : theme.colors.border.default};

  @media (max-width: 480px) { display: none; }
`

export const DashboardTh = styled.th<{ align?: string }>`
  padding: 12px 16px;
  text-align: ${(p) => p.align || 'left'};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.03em;
  white-space: nowrap;

  @media (max-width: 768px) { padding: 10px 12px; }
`

export const DashboardTr = styled.tr`
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.colors.border.light};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : theme.colors.background.secondary};
  }

  &:last-child { border-bottom: none; }
`

export const DashboardTd = styled.td<{ align?: string }>`
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: ${(p) => p.align || 'left'};
  white-space: nowrap;
  vertical-align: middle;

  @media (max-width: 768px) { padding: 10px 12px; font-size: 13px; }
`

export const CountryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const CountryFlag = styled.div`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`

export const CountryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const CountryName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CountryLocalName = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const IsoCode = styled.code`
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : theme.colors.background.tertiary};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border.light};
  padding: 3px 8px;
  border-radius: 6px;
`

export const ContinentBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.15)' : theme.colors.activeLight};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.25)' : 'transparent'};
  border-radius: 8px;
`

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

export const EmptyGlobalState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 420px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;

  ${({ theme }) => liquidCard(theme)}
`

export const EmptyGlobalIcon = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  margin-bottom: 24px;
  border-radius: 22px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 24px rgba(99, 106, 242, 0.25);
        `
      : css`
          background: ${theme.colors.activeLight};
          box-shadow: 0 4px 12px ${theme.colors.shadow.md};
        `}
`

export const EmptyGlobalTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const EmptyGlobalDesc = styled.p`
  margin: 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  max-width: 360px;
`
