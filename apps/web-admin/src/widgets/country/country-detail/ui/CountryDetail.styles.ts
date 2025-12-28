import { motion } from 'framer-motion'
import styled from 'styled-components'

// Design System Colors
const COLORS = {
  // Header/Title backgrounds
  headerBg: '#fafbfc',
  headerBorder: '#e5e7eb',

  // Text colors
  titleText: '#374151',
  bodyText: '#4b5563',
  secondaryText: '#6b7280',
  lightText: '#9ca3af',

  // Backgrounds
  white: '#ffffff',
  lightBg: '#f9fafb',

  // Borders
  border: '#e5e7eb',
  divider: '#e5e7eb',
}

// Grid Layouts (Modern Design)
export const DashboardGrid = styled.div`
  display: grid;
`

export const KPIGrid = styled(DashboardGrid)`
  grid-template-columns: repeat(4, 1fr);
  margin-top: -90px;
  position: relative;
  z-index: 1;
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 28px;
    margin-top: -70px;
    gap: 16px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    padding: 0 20px;
    margin-top: -50px;
    gap: 16px;
  }
`

export const MapGrid = styled(DashboardGrid)`
  grid-template-columns: 1fr 400px;
  margin-bottom: 28px;
  margin-top: 20px;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

export const ChartGrid = styled(DashboardGrid)`
  grid-template-columns: repeat(3, 1fr);
  margin-top: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

// Card Components - Enhanced Modern Design
export const Card = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  padding: 20px 22px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4285f4, #34a853, #fbbc04, #ea4335);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: #d1d5db;
    box-shadow:
      0 8px 16px rgba(0, 0, 0, 0.08),
      0 4px 8px rgba(0, 0, 0, 0.04);

    &::before {
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    padding: 18px 20px;
  }
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;

  svg {
    color: #4285f4;
    flex-shrink: 0;
    transition: all 0.25s ease;
  }

  ${Card}:hover & svg {
    transform: scale(1.1);
    filter: drop-shadow(0 2px 4px rgba(66, 133, 244, 0.3));
  }
`

export const CardLabel = styled.span`
  font-size: 12px;
  color: #5f6368;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: color 0.25s ease;

  ${Card}:hover & {
    color: #4285f4;
  }
`

export const CardValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #202124;
  line-height: 1.1;
  letter-spacing: -0.02em;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #202124 0%, #5f6368 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  ${Card}:hover & {
    background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  @media (max-width: 768px) {
    font-size: 24px;
  }
`

export const PercentageChange = styled.div<{ positive?: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => (props.positive ? '#34a853' : '#ea4335')};
  background: ${(props) =>
    props.positive
      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'};
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 2px;
  transition: all 0.25s ease;

  ${Card}:hover & {
    transform: scale(1.05);
  }
`

export const ChartCard = styled.div`
  background: #fff;
  padding: 16px;
`

export const ChartTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  margin: 0 0 20px 0;
`

// Empty State
export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 500px;
  padding: 80px 40px;
`

// Compact Hero Section
export const CompactHeroSection = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
  position: relative;
  overflow: visible;
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 32px 24px;
    gap: 24px;
    text-align: center;
  }
`

export const FlagCircleWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`

export const FlagCircle = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #ffffff;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 2;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`

export const FlagCirclePlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 4px solid #ffffff;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`

export const FlagGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(66, 133, 244, 0.15) 0%,
    rgba(66, 133, 244, 0.05) 50%,
    transparent 70%
  );
  z-index: 1;
  animation: pulse 3s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
      opacity: 0.8;
    }
  }

  @media (max-width: 768px) {
    width: 120px;
    height: 120px;
  }
`

export const CompactCountryInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    align-items: center;
  }
`

export const CompactCountryName = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`

export const CompactCountryLocalName = styled.p`
  margin: 0;
  font-size: 16px;
  color: #64748b;
  font-weight: 500;
`

export const CompactMetaBadges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`

export const MetaBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  transition: all 0.2s ease;

  svg {
    opacity: 0.7;
  }

  &:hover {
    background: linear-gradient(135deg, #e8f0fe 0%, #d3e3fd 100%);
    border-color: #4285f4;
    color: #1967d2;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);

    svg {
      opacity: 1;
      fill: #4285f4;
    }
  }
`

export const CompactKebabMenu = styled.div`
  position: absolute;
  top: 80px;
  right: 32px;
  z-index: 10;

  @media (max-width: 768px) {
    top: 24px;
    right: 24px;
  }
`

// Simple Header for other tabs
export const SimpleHeader = styled.div`
  padding: 16px 32px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 20px;

  @media (max-width: 768px) {
    padding: 12px 20px;
  }
`

export const SimpleHeaderTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
`

export const SectionTitle = styled.h2`
  margin: 0 0 40px 0;
  padding: 0 0 20px 0;
  font-size: 40px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  display: flex;
  align-items: center;
  gap: 16px;
  line-height: 1.2;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #4285f4, #34a853, #fbbc04, #ea4335) 1;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 80px;
    height: 3px;
    background: linear-gradient(90deg, #4285f4, #34a853, #fbbc04, #ea4335);
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    font-size: 28px;
    gap: 12px;
  }
`

export const SimpleHeaderSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`

export const EmptyStateIconWrapper = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
`

export const EmptyStateTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
`

export const EmptyStateDescription = styled.p`
  font-size: 15px;
  color: #64748b;
  line-height: 1.7;
  margin: 0;
  max-width: 360px;
  text-align: center;
`

// Hero Section
export const HeroSection = styled(motion.div)<{
  $activeTab: 'overview' | 'people' | 'military'
}>`
  margin-bottom: ${(props) =>
    props.$activeTab === 'overview' ? '24px' : '12px'};
  padding: ${(props) => (props.$activeTab === 'overview' ? '0 0 20px 0' : '0')};
  border-bottom: ${(props) =>
    props.$activeTab === 'overview' ? '1px solid #f1f5f9' : 'none'};
`

export const HeroContent = styled.div`
  display: flex;
  gap: 64px;
  align-items: center;
`

export const FlagImageWrapper = styled(motion.div)`
  flex-shrink: 0;
  width: 360px;
  transform-origin: center center;
  will-change: transform, opacity;
`

export const FlagImage = styled.img`
  width: 360px;
  height: auto;
  display: block;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
`

export const FlagPlaceholder = styled.div`
  width: 360px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
`

export const CountryInfoSection = styled(motion.div)`
  flex: 1;
`

export const CountryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
`

export const CountryTitleWrapper = styled.div``

export const CountryTitle = styled(motion.h1)`
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.03em;
`

export const CountryLocalName = styled(motion.p)`
  color: #64748b;
  margin: 12px 0 0 0;
  font-weight: 500;
`

// Kebab Menu
export const KebabMenuWrapper = styled.div`
  position: relative;
`

export const KebabButton = styled.button`
  padding: 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);

  &:hover {
    background: #ffffff;
    border-color: #8b5cf6;
    color: #8b5cf6;
    box-shadow:
      0 4px 16px rgba(139, 92, 246, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

export const DropdownMenu = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.08);
  min-width: 160px;
  z-index: 20;
  overflow: hidden;
  animation: dropdownFadeIn 0.2s ease-out;

  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const DropdownButton = styled.button<{ $isDelete?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.$isDelete ? '#dc2626' : '#374151')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: ${(props) =>
    props.$isDelete ? 'none' : '1px solid rgba(241, 245, 249, 0.8)'};
  transition: all 0.2s ease;

  svg {
    transition: transform 0.2s ease;
  }

  &:hover {
    background: ${(props) =>
      props.$isDelete
        ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(254, 226, 226, 0.6) 100%)'
        : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)'};
    color: ${(props) => (props.$isDelete ? '#b91c1c' : '#111827')};

    svg {
      transform: translateX(2px);
    }
  }
`

// Meta Info
export const MetaInfoGrid = styled.div`
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
`

export const MetaInfoItem = styled.div``

export const MetaInfoLabel = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
  font-weight: 500;
`

export const MetaInfoValue = styled.div`
  font-size: 15px;
  color: #0f172a;
  font-weight: 600;
`

export const DensityValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`

export const DensityUnit = styled.span`
  font-size: 14px;
  color: #5f6368;
  margin-left: 4px;
`

// Map Components - Matching List Design
export const MapContainer = styled.div`
  background: #fff;
  overflow: hidden;
  height: 560px;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  /* 지도가 컨테이너를 꽉 채우도록 */
  > div {
    height: 100% !important;
  }

  iframe {
    height: 100% !important;
  }
`

export const MapPlaceholder = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.04);
`

export const MapPlaceholderText = styled.span`
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
`

// Historical Country Panel
export const HistoricalCountryPanel = styled.div`
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 600px;
`

export const HistoricalCountryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const HistoricalCountryTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  margin: 0;
  letter-spacing: 0.3px;
`

export const HistoricalCountryCount = styled.span`
  font-size: 12px;
  color: #5f6368;
`

export const HistoricalCountryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 460px;
  overflow-y: auto;
`

export const HistoricalCountryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e8eaed;
  }
`

export const HistoricalCountryInfo = styled.div`
  flex: 1;
`

export const HistoricalCountryName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 4px;
`

export const HistoricalCountryDate = styled.div`
  font-size: 12px;
  color: #5f6368;
`

export const HistoricalCountryType = styled.div`
  font-size: 11px;
  color: #5f6368;
  background: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dadce0;
`

export const HistoricalCountryEmpty = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #5f6368;
  font-size: 14px;
`

// Chart Components
export const ChartBarContainer = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 180px;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dadce0;
`

export const ChartBarWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const ChartBar = styled.div<{ $height: number; $color: string }>`
  width: 100%;
  height: ${(props) => props.$height}%;
  background: ${(props) => props.$color};
  border-radius: 4px 4px 0 0;
  min-height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
`

export const ChartBarValue = styled.span`
  font-size: 10px;
  color: #fff;
  font-weight: 500;
`

export const ChartEmpty = styled.div`
  text-align: center;
  width: 100%;
  color: #5f6368;
`

export const ChartLabelContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  gap: 8px;
`

export const ChartLabel = styled.div`
  flex: 1;
  font-size: 10px;
  color: #5f6368;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DonutChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const DonutChartDisplay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
`

export const DonutChart = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    #4285f4 0deg 130deg,
    #34a853 130deg 240deg,
    #fbbc04 240deg 300deg,
    #ea4335 300deg 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
`

export const DonutChartInner = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #fff;
`

export const DonutLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DonutLegendItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const DonutLegendColor = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  background: ${(props) => props.$color};
  border-radius: 2px;
`

export const DonutLegendLabel = styled.span`
  font-size: 12px;
  color: #5f6368;
`

export const DonutLegendValue = styled.span`
  font-size: 12px;
  color: #202124;
  font-weight: 500;
`

export const DonutLegendLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const LineChartContainer = styled.div`
  height: 150px;
  position: relative;
  border-bottom: 1px solid #dadce0;
  border-left: 1px solid #dadce0;
`

export const LineChartSvg = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
`

export const LineChartLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
`

export const LineChartLabel = styled.span`
  font-size: 10px;
  color: #5f6368;
`

// Historical Country Section (bottom)
export const HistoricalCountrySection = styled.div``

export const HistoricalCountrySectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

export const HistoricalCountrySectionTitle = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0;
`

export const HistoricalCountrySectionCount = styled.span`
  font-size: 11px;
  color: #999;
`

export const HistoricalCountryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

export const HistoricalCountryCard = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fafafa;
  }
`

export const HistoricalCountryCardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const HistoricalCountryCardImageWrapper = styled.div`
  width: 100%;
  height: 100px;
`

export const HistoricalCountryCardPlaceholder = styled.div`
  width: 100%;
  height: 100px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const HistoricalCountryCardPlaceholderText = styled.span`
  font-size: 12px;
  color: #ccc;
`

export const HistoricalCountryCardContent = styled.div`
  padding: 16px;
`

export const HistoricalCountryCardTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`

export const HistoricalCountryCardEnName = styled.p`
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
`

export const HistoricalCountryCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
`

export const HistoricalCountryCardType = styled.span`
  font-size: 10px;
  color: #666;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 4px;
`

export const HistoricalCountryCardDate = styled.span`
  font-size: 11px;
  color: #999;
`

export const MilitaryPlaceholder = styled.div`
  padding: 40px;
  text-align: center;
  color: #999;
`

// Info Table Panel (지도 우측)
export const InfoTablePanel = styled.div`
  background: #fff;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 600px;
  overflow: hidden;
`

export const InfoTableHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
  background: #fff;
`

export const InfoTableTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
`

export const InfoTableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

export const InfoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

export const InfoTableRow = styled.tr`
  border-bottom: 1px solid #f1f3f4;
  transition: background 0.15s ease;

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const InfoTableLabel = styled.td`
  padding: 12px 20px;
  font-size: 12px;
  font-weight: 400;
  color: #5f6368;
  width: 35%;
`

export const InfoTableValue = styled.td`
  padding: 12px 20px;
  font-size: 13px;
  color: #202124;
  font-weight: 400;
`

// Chart Grid Two Columns (공간 효율성 개선)
export const ChartGridTwoCol = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 16px;
  margin-top: 0;
  margin-bottom: 28px;

  @media (max-width: 1600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
`

// Chart Card (Simplified Design)
// Chart Card - Matching List Design
export const ChartCardModern = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      #4285f4 0%,
      #34a853 25%,
      #fbbc04 50%,
      #ea4335 75%,
      #4285f4 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: #cbd5e1;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);

    &::before {
      opacity: 1;
    }
  }
`

export const ChartCardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
`

export const ChartCardTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const ChartCardSubtitle = styled.p`
  margin: 0;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
`

export const ChartWrapper = styled.div`
  width: 100%;
  height: 560px;
  position: relative;
  z-index: 1;
`

export const ChartWrapperSmall = styled.div`
  width: 100%;
  height: 200px;
  position: relative;
  z-index: 1;
`

// Chart Grid Three Columns
export const ChartGridThreeCol = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 0;
  margin-bottom: 32px;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
`

// Data Table Components
export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

export const TableHeader = styled.th`
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e5e7eb;
  background: #f8f9fa;
`

export const TableRow = styled.tr`
  border-bottom: 1px solid #f1f3f4;
  transition: background 0.15s ease;

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const TableCell = styled.td<{ $bold?: boolean }>`
  padding: 14px 16px;
  font-size: 14px;
  color: #202124;
  font-weight: ${(props) => (props.$bold ? '600' : '400')};
`

export const MiniFlagWrapper = styled.div`
  width: 100%;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  z-index: 1;
  border-radius: 0;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04);

  /* 국기 이미지에 효과 추가 */
  img {
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover img {
    transform: scale(1.05);
  }

  /* 내부 그림자로 깊이감 추가 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 0;
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: 2;
  }

  @media (max-width: 768px) {
    height: 300px;
    border-radius: 0;
  }
`

/* 그래디언트 오버레이 - 텍스트 가독성 향상 */
export const FlagGradientOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 30%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 1;
`

export const CountryNameOverlay = styled.div`
  position: absolute;
  top: 45px;
  left: 32px;
  z-index: 5;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    top: 24px;
    left: 24px;
    padding: 16px 20px;
  }
`

export const MiniFlag = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
`

export const AnalyticsCountryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  text-align: center;
  max-width: 700px;
  position: relative;
  z-index: 1;
`

export const AnalyticsCountryName = styled.h1`
  font-size: 48px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-align: left;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;

  @media (max-width: 1024px) {
    font-size: 40px;
  }

  @media (max-width: 768px) {
    font-size: 32px;
  }
`

export const AnalyticsCountryLocalName = styled.span`
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.02em;
  display: block;
  text-align: left;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

export const AnalyticsBadges = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
  position: relative;
  z-index: 1;

  @media (max-width: 1024px) {
    gap: 8px;
    margin-top: 8px;
  }
`

export const SimpleBadge = styled.div`
  padding: 4px 12px;
  background: #f1f3f4;
  border-radius: 12px;
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
`

// Info Badge (Simplified Design)
export const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(236, 239, 242, 0.8);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);

  &:hover {
    background: #ffffff;
    border-color: #8b5cf6;
    box-shadow:
      0 4px 16px rgba(139, 92, 246, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

export const BadgeLabel = styled.span`
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`

export const BadgeValue = styled.span`
  font-size: 14px;
  color: #111827;
  font-weight: 700;
  letter-spacing: -0.01em;
`

// Region Panel - Matching List Design
export const RegionPanel = styled.div`
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #eceff2;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 560px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

export const RegionSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);

  &:last-child {
    border-bottom: none;
  }
`

export const RegionSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.8) 0%,
    rgba(241, 245, 249, 0.6) 100%
  );

  svg {
    color: #4285f4;
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: scale(1.1) rotate(-5deg);
  }
`

export const RegionSectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
`

export const RegionList = styled.div`
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const RegionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s ease;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const RegionLabel = styled.span`
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
`

export const RegionValue = styled.span`
  font-size: 12px;
  color: #111827;
  font-weight: 600;
`

export const CityListCompact = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;

    &:hover {
      background: #9ca3af;
    }
  }
`

export const CityItemCompact = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const CityRankSmall = styled.div`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 10px;
  font-weight: 700;
  border-radius: 50%;
  flex-shrink: 0;
`

export const CityNameCompact = styled.div`
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CityPopCompact = styled.div`
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
  flex-shrink: 0;
`

// Government Panel - 정부부처 및 행정수반
export const GovernmentPanel = styled.div`
  background: #ffffff;
  border-right: 1px solid #eceff2;
  border-bottom: 1px solid #eceff2;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 560px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

export const GovernmentSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e5e7eb;
  overflow: hidden;
  min-height: 0;

  &:last-child {
    border-bottom: none;
  }
`

export const GovernmentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;

    &:hover {
      background: #9ca3af;
    }
  }
`

export const GovernmentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s ease;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const GovernmentItemName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #111827;
`

export const GovernmentItemRole = styled.div`
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
`

export const LeaderCard = styled.div`
  padding: 16px;
  background: ${COLORS.headerBg};
  border-bottom: 1px solid ${COLORS.headerBorder};
`

export const LeaderName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.titleText};
  margin-bottom: 4px;
`

export const LeaderTitle = styled.div`
  font-size: 11px;
  color: ${COLORS.secondaryText};
  font-weight: 500;
  margin-bottom: 8px;
`

export const LeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: ${COLORS.lightText};
`

export const LeaderInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const LeaderInfoLabel = styled.span`
  color: #9ca3af;
`

export const LeaderInfoValue = styled.span`
  color: #374151;
  font-weight: 500;
`

// Cities Panel (기존 - 필요시 사용)
export const CitiesPanel = styled.div`
  background: #fff;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 400px;
  overflow: hidden;
`

export const CitiesPanelHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
  background: #fff;
`

export const CitiesPanelTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #5f6368;
  }
`

export const CitiesPanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

export const CityCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #dadce0;
    box-shadow: 0 1px 3px rgba(60, 64, 67, 0.15);
  }

  &:last-child {
    margin-bottom: 0;
  }
`

export const CityRank = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 50%;
  flex-shrink: 0;
`

export const CityInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const CityName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #202124;
`

export const CityMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

export const CityMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #5f6368;

  svg {
    color: #80868b;
  }
`

// ========================================
// Event Tab Styles
// ========================================

// Event List View
export const EventListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const EventListHeader = styled.div`
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8eaed;
`

export const EventListTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 8px 0;
`

export const EventListSubtitle = styled.p`
  font-size: 14px;
  color: #5f6368;
  margin: 0;
`

export const EventListGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

// Event List Card - Matching List Design
export const EventListCard = styled.div`
  background: #ffffff;
  border: 1px solid #eceff2;
  border-radius: 10px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-1px);
    border-color: #dadce0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

export const EventListCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`

export const EventListCardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin: 0;
  line-height: 1.3;
  flex: 1;
`

export const EventCategoryBadge = styled.span`
  padding: 4px 12px;
  background: linear-gradient(135deg, #e8f0fe 0%, #d3e3fd 100%);
  color: #1967d2;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
`

export const EventListCardDate = styled.div`
  font-size: 13px;
  color: #5f6368;
  font-weight: 500;
`

export const EventListCardDescription = styled.p`
  font-size: 14px;
  color: #5f6368;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export const EventListCardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f3f4;
  margin-top: auto;
`

export const EventRoleBadge = styled.span`
  padding: 4px 10px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
`

export const TimelineCount = styled.span`
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(100, 116, 139, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;

  ${EventListCard}:hover & {
    background: rgba(66, 133, 244, 0.15);
    color: #4285f4;
  }
`

// Event Detail View (Timeline)
export const EventDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
`

export const EventDetailBackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;

  &:hover {
    background: #e8eaed;
    color: #202124;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

export const EventDetailHeader = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid #e8eaed;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const EventDetailTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`

export const EventDetailTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #202124;
  margin: 0;
  line-height: 1.2;
  flex: 1;
`

export const EventDetailDate = styled.div`
  font-size: 14px;
  color: #5f6368;
  font-weight: 500;
`

export const EventDetailDescription = styled.p`
  font-size: 15px;
  color: #5f6368;
  line-height: 1.6;
  margin: 0;
`

// Timeline Styles
export const TimelineSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin: 24px 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-left: 24px;
  position: relative;
`

export const TimelineItem = styled.div`
  display: flex;
  gap: 20px;
  position: relative;
`

export const TimelineMarker = styled.div`
  position: relative;
  flex-shrink: 0;
`

export const TimelineMarkerDot = styled.div`
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #4285f4;
`

export const TimelineMarkerLine = styled.div`
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  width: 2px;
  height: calc(100% + 24px);
  background: linear-gradient(180deg, #4285f4 0%, #e8eaed 100%);
`

export const TimelineContent = styled.div`
  flex: 1;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #dadce0;
    box-shadow: 0 2px 8px rgba(60, 64, 67, 0.1);
  }
`

export const TimelineContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`

export const TimelineLocation = styled.div`
  font-size: 14px;
  color: #4285f4;
  font-weight: 600;
  flex: 1;
`

export const TimelineDate = styled.div`
  font-size: 12px;
  color: #80868b;
  font-weight: 500;
  padding: 4px 10px;
  background: #f8f9fa;
  border-radius: 8px;
`

export const TimelineTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #202124;
  margin: 0;
  line-height: 1.4;
`

export const TimelineDescription = styled.p`
  font-size: 14px;
  color: #5f6368;
  line-height: 1.6;
  margin: 0;
`

// Historical Country Badge (과거 국가 표시)
export const HistoricalCountryBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border: 1px solid #ffb74d;
  border-radius: 8px;
  font-size: 12px;
  color: #e65100;
  font-weight: 600;
  margin-bottom: 8px;

  svg {
    flex-shrink: 0;
    fill: #ff9800;
  }

  span {
    color: #f57c00;
    font-size: 11px;
    font-weight: 500;
  }
`

// ========================================
// Timeline Modal Styles
// ========================================

// 타임라인 클릭 힌트
export const TimelineClickHint = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.2s ease;

  ${TimelineContent}:hover & {
    opacity: 1;
    color: #1890ff;
  }
`

// 모달 오버레이
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
`

// 타임라인 모달
export const TimelineModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

// 모달 헤더
export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
`

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  flex: 1;
`

export const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: #8c8c8c;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #262626;
  }
`

// 모달 콘텐츠
export const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f0f0f0;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 4px;

    &:hover {
      background: #bfbfbf;
    }
  }
`

// 모달 섹션
export const ModalSection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`

export const ModalSectionTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

// 모달 정보 그리드
export const ModalInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

export const ModalInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const ModalInfoLabel = styled.span`
  font-size: 13px;
  color: #8c8c8c;
  font-weight: 500;
`

export const ModalInfoValue = styled.span`
  font-size: 15px;
  color: #262626;
  font-weight: 500;
`

export const ModalDescription = styled.p`
  margin: 16px 0 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #595959;
`

// 시설 카드
export const FacilityCard = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%);
  border: 1px solid #91caff;
  border-radius: 12px;
`

export const FacilityName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #0958d9;
  margin-bottom: 6px;
`

export const FacilityType = styled.div`
  font-size: 13px;
  color: #1677ff;
  font-weight: 500;
`

// 인물 리스트
export const PersonList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`

export const PersonCard = styled.div`
  padding: 12px;
  background: #f9f9f9;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f0f0;
    border-color: #d9d9d9;
  }
`

export const PersonName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
`

export const PersonJob = styled.div`
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
`

export const PersonRole = styled.div`
  display: inline-block;
  padding: 2px 8px;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 4px;
  font-size: 11px;
  color: #0958d9;
  font-weight: 500;
  margin-top: 6px;
`

// Premium KPI Card Styles - Clean Dashboard Design (Like Image)
export const PremiumCard = styled.div`
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  border-left: none;
  border-right: none;
  border-radius: 0;
  position: relative;
  padding: 24px;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 170px;
  transition: all 0.2s ease;

  /* 첫 번째 카드만 왼쪽 보더 */
  &:first-child {
    border-left: 1px solid #e5e7eb;
  }

  /* 마지막 카드는 우측 보더 추가 */
  &:last-child {
    border-right: 1px solid #e5e7eb;
  }

  /* 우측 구분선 - 가운데만 보이도록 (마지막 카드 제외) */
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background: #e5e7eb;
  }

  &:hover {
    background: #fafbfc;

    &:not(:last-child)::after {
      background: #d1d5db;
    }
  }
`

export const PremiumCardPopulation = styled(PremiumCard)``

export const PremiumCardGDP = styled(PremiumCard)``

export const PremiumCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

export const PremiumCardLeft = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const PremiumCardLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

export const PremiumCardLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  text-transform: none;
  letter-spacing: -0.02em;
  margin: 0;
`

export const PremiumCardRank = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: -0.01em;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`

export const PremiumCardValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0;
  margin-bottom: 12px;
`

export const PremiumCardValue = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  letter-spacing: -0.02em;
`

export const PremiumCardBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 4px;
`

export const PremiumCardYear = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  letter-spacing: 0.02em;
`

export const PremiumCardSparkline = styled.div`
  width: 100px;
  height: 50px;
  margin-top: 0;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;

  svg {
    width: 100%;
    height: 100%;
  }
`

export const PremiumCardValueWrapper = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
`

export const PremiumPercentageBadge = styled.div<{ positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  margin: 0;
  color: #6b7280;

  svg {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    stroke: ${(props) => (props.positive ? '#10b981' : '#ef4444')};
  }
`
