/**
 * CountryDashboard 위젯 전용 스타일
 * 우측 컨텐츠: 전 세계 국가 통계, KPI, 차트, 테이블
 */
import styled from 'styled-components'

// ─── 전체 레이아웃 ────────────────────────────────────────────────────────────

export const GlobalDashboard = styled.div`
  padding: 32px 40px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;

  @media (max-width: 1024px) {
    padding: 24px 28px 36px;
    gap: 28px;
  }

  @media (max-width: 768px) {
    padding: 20px 20px 28px;
    gap: 24px;
  }

  @media (max-width: 480px) {
    padding: 16px 16px 24px;
    gap: 20px;
  }
`

// ─── 히어로 헤더 ──────────────────────────────────────────────────────────────

export const GlobalDashboardHero = styled.header`
  padding: 0 0 16px 0;
  margin-bottom: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  position: relative;

  @media (max-width: 768px) {
    padding-bottom: 14px;
  }
`

export const HeroBackground = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(
      circle at 20% 50%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 80%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    );
  opacity: 0.3;
`

export const HeroContent = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 14px;
  }
`

export const HeroIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.gradient.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;

  svg {
    width: 22px;
    height: 22px;
  }

  @media (max-width: 768px) {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    svg {
      width: 20px;
      height: 20px;
    }
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

  @media (max-width: 768px) {
    font-size: 18px;
  }
`

export const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

// ─── 섹션 타이틀 ──────────────────────────────────────────────────────────────

export const DashboardSectionTitle = styled.div<{ $mt?: string }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 0 18px;
  background: transparent;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 6px;
  ${({ $mt }) => $mt && `margin-top: ${$mt};`}
`

export const SectionTitleIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.activeLight};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.primary};
`

export const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 17px;
  }
`

// ─── 글로벌 KPI 그리드 ────────────────────────────────────────────────────────

export const GlobalMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  overflow: hidden;

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const GlobalMetricCard = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:nth-child(4n) {
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.activeLight};
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    padding: 22px 24px;
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    &:nth-child(4n) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
    }
    &:nth-child(2n) {
      border-right: none;
    }
    &:nth-child(n + 3) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }

  @media (max-width: 768px) {
    padding: 22px 24px;
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    &:last-child {
      border-bottom: none;
    }
  }

  @media (max-width: 480px) {
    padding: 20px 22px;
  }
`

export const GlobalMetricIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 21px;
    height: 21px;
  }
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

  @media (max-width: 480px) {
    font-size: 20px;
  }
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

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (max-width: 480px) {
    gap: 10px;
  }
`

export const GlobalWidget = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.sm};
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px ${({ theme }) => theme.colors.shadow.md};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 480px) {
    padding: 20px;
    border-radius: 14px;
  }
`

export const GlobalWidgetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const GlobalWidgetIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.activeLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`

export const GlobalWidgetTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const GlobalWidgetContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
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
  height: 8px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 4px;
  overflow: hidden;
`

export const BarChartFill = styled.div<{
  $percent: number
  $rank?: 1 | 2 | 3
}>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  border-radius: 4px;
  background: ${(p) =>
    p.$rank === 1
      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
      : p.$rank === 2
        ? 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
        : p.$rank === 3
          ? 'linear-gradient(90deg, #92400e, #b45309)'
          : p.theme.colors.primary};
  transition: width 0.4s ease;
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
  background: ${(p) =>
    p.$rank === 1
      ? '#fef3c7'
      : p.$rank === 2
        ? '#f1f5f9'
        : p.$rank === 3
          ? '#fef3c7'
          : p.theme.colors.background.tertiary};
  color: ${(p) =>
    p.$rank === 1
      ? '#d97706'
      : p.$rank === 2
        ? '#64748b'
        : p.$rank === 3
          ? '#92400e'
          : p.theme.colors.text.secondary};
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
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.sm};
`

export const DashboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  @media (max-width: 768px) {
    font-size: 13px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
    display: block;
    overflow-x: auto;
  }
`

export const DashboardTableHead = styled.thead`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  @media (max-width: 480px) {
    display: none;
  }
`

export const DashboardTh = styled.th<{ align?: string }>`
  padding: 12px 16px;
  text-align: ${(props) => props.align || 'left'};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.03em;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 10px 12px;
  }
`

export const DashboardTr = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
  }

  &:last-child {
    border-bottom: none;
  }
`

export const DashboardTd = styled.td<{ align?: string }>`
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: ${(props) => props.align || 'left'};
  white-space: nowrap;
  vertical-align: middle;

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 13px;
  }
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
  background: ${({ theme }) => theme.colors.background.tertiary};
  padding: 4px 8px;
  border-radius: 6px;
`

export const ContinentBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
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
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.sm};
`

export const EmptyGlobalIcon = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 24px;
  background: ${({ theme }) => theme.colors.activeLight};
  border-radius: 20px;
  box-shadow: 0 4px 12px ${({ theme }) => theme.colors.shadow.md};
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
