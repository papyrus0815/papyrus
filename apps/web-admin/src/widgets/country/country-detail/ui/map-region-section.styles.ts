import styled, { css } from 'styled-components'

// ============================================
// 🎨 현대적인 색상 시스템 (2024 트렌드)
// ============================================
export const COLORS = {
  // Primary - 모던한 인디고 블루
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  primaryDark: '#4338ca',
  primaryUltraLight: '#eef2ff',

  // Accent - 포인트 색상
  accent: '#06b6d4',
  accentLight: '#22d3ee',

  // Text colors - 더 부드러운 대비
  text: {
    primary: '#18181b',
    secondary: '#52525b',
    tertiary: '#71717a',
    muted: '#a1a1aa',
  },

  // Background colors - 미묘한 그라데이션
  bg: {
    white: '#ffffff',
    gray50: '#fafafa',
    gray100: '#f4f4f5',
    gray200: '#e4e4e7',
    gray800: '#27272a',
    primary50: '#f5f3ff',
    primary100: '#ede9fe',
  },

  // Border colors - 얇고 세련되게
  border: {
    light: '#e4e4e7',
    medium: '#d4d4d8',
    dark: '#71717a',
    primary: '#4f46e5',
  },

  // Badge colors - 모던한 파스텔
  badge: {
    blue: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
    green: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
    purple: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
    cyan: { bg: '#cffafe', text: '#155e75', border: '#a5f3fc' },
  },

  // Shadows - 부드러운 그림자
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
} as const

// ============================================
// 🎯 전체 화면 활용 - 컨테이너 최소화
// ============================================
export const MainContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  min-height: 800px;
  max-height: 100vh;
  background: ${COLORS.bg.gray50};
  overflow: hidden;
`

export const HoverGradient = styled.div`
  display: none;
`

// ============================================
// 상단 브레드크럼 (전체 너비)
// ============================================
export const TopBreadcrumb = styled.div`
  padding: 12px 20px;
  background: ${COLORS.bg.gray50};
  border-bottom: 1px solid ${COLORS.border.light};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${COLORS.text.secondary};
  font-weight: 500;
`

export const BreadcrumbPath = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const BreadcrumbItem = styled.span<{
  $isActive?: boolean
  $clickable?: boolean
}>`
  color: ${(props) =>
    props.$isActive ? COLORS.primary : COLORS.text.secondary};
  font-weight: ${(props) => (props.$isActive ? '600' : '400')};
  cursor: ${(props) => (props.$clickable ? 'pointer' : 'default')};
  transition: color 0.2s;

  &:hover {
    color: ${(props) => (props.$clickable ? COLORS.primary : undefined)};
  }
`

export const BreadcrumbSeparator = styled.span`
  color: ${COLORS.border.medium};
`

// Breadcrumb 컴포넌트 추가
export const Breadcrumb = styled.div`
  padding: 12px 16px;
  background: ${COLORS.bg.gray50};
  border-bottom: 1px solid ${COLORS.border.light};
`

export const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`

// ============================================
// ViewMode Selector (전체 너비 활용)
// ============================================
export const ViewModeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  background: ${COLORS.bg.white};
  border-bottom: 2px solid ${COLORS.border.light};
  box-shadow: ${COLORS.shadow.sm};
`

export const ViewModeButton = styled.button<{ $isActive?: boolean }>`
  padding: 20px 24px;
  background: ${(props) =>
    props.$isActive ? COLORS.primary : COLORS.bg.white};
  color: ${(props) =>
    props.$isActive ? COLORS.bg.white : COLORS.text.secondary};
  border: none;
  border-bottom: 3px solid
    ${(props) => (props.$isActive ? COLORS.primary : 'transparent')};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    height: 50%;
    width: 1px;
    background: ${COLORS.border.light};
  }

  &:hover {
    background: ${(props) =>
      props.$isActive ? COLORS.primaryDark : COLORS.bg.gray50};
  }

  span:first-child {
    font-size: 24px;
    filter: ${(props) => (props.$isActive ? 'none' : 'grayscale(0.5)')};
    transition: all 0.2s ease;
  }

  &:hover span:first-child {
    transform: scale(1.1);
    filter: none;
  }
`

// ============================================
// 🏛️ 행정구역 모드: 3단 레이아웃 (35%-30%-35%)
// ============================================
export const AdministrativeLayout = styled.div`
  display: grid;
  grid-template-columns: 35% 30% 35%;
  height: 100%;
  overflow: hidden;
  gap: 0;

  @media (max-width: 1400px) {
    grid-template-columns: 30% 40% 30%;
  }
`

// ============================================
// 🏔️ 자연 지리 모드: 지도 중심 (20%-50%-30%)
// ============================================
export const NatureLayout = styled.div`
  display: grid;
  grid-template-columns: 20% 50% 30%;
  height: 100%;
  overflow: hidden;
  gap: 0;

  @media (max-width: 1400px) {
    grid-template-columns: 25% 45% 30%;
  }
`

// ============================================
// ⚡ 인프라 모드: 네트워크 중심 (20%-55%-25%)
// ============================================
export const InfrastructureLayout = styled.div`
  display: grid;
  grid-template-columns: 20% 55% 25%;
  height: 100%;
  overflow: hidden;
  gap: 0;

  @media (max-width: 1400px) {
    grid-template-columns: 25% 50% 25%;
  }
`

// ============================================
// 좌측 패널 (공통)
// ============================================
export const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  background: ${COLORS.bg.white};
  border-right: 1px solid ${COLORS.border.light};
  overflow: hidden;
  height: 100%;
`

// ============================================
// 중앙 패널 (지도 - 공통)
// ============================================
export const MiddlePanel = styled.div`
  display: flex;
  flex-direction: column;
  background: ${COLORS.bg.gray50};
  overflow: hidden;
  height: 100%;
  position: relative;
`

// ============================================
// 우측 패널 (공통)
// ============================================
export const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  background: ${COLORS.bg.white};
  border-left: 1px solid ${COLORS.border.light};
  overflow: hidden;
  height: 100%;
`

export const MapHeader = styled.div`
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: ${COLORS.text.primary};
  background: ${COLORS.bg.white};
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid ${COLORS.border.light};

  span:first-child {
    font-size: 20px;
  }
`

export const MapContainer = styled.div`
  background: ${COLORS.bg.gray50};
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`

// ============================================
// 구분선 (Dividers)
// ============================================
export const DividerHorizontal = styled.div`
  height: 1px;
  background: ${COLORS.border.light};
  width: 100%;
`

export const DividerVertical = styled.div`
  width: 1px;
  background: ${COLORS.border.light};
  height: 100%;
`

// ============================================
// 리스트 컨테이너 (좌측 패널용)
// ============================================
export const ListContainer = styled.div`
  background: ${COLORS.bg.white};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
`

export const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 2px solid ${COLORS.border.light};
  background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

export const BackButton = styled.button`
  padding: 6px 10px;
  background: ${COLORS.bg.white};
  border: 1.5px solid ${COLORS.border.light};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: ${COLORS.shadow.sm};

  &:hover {
    background: ${COLORS.primary};
    border-color: ${COLORS.primary};
    transform: translateX(-2px);
    box-shadow: ${COLORS.shadow.md};

    svg {
      stroke: #ffffff;
    }
  }

  svg {
    transition: stroke 0.2s;
  }
`

export const HeaderTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  margin: 0;
  letter-spacing: -0.02em;
`

export const CountBadge = styled.div`
  background: ${COLORS.primary};
  color: ${COLORS.bg.white};
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: ${COLORS.shadow.sm};
`

export const ListScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.border.medium};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.border.primary};
  }
`

export const ListContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

// ============================================
// 리스트 아이템 (모던하고 미니멀하게!)
// ============================================
export const ListItem = styled.div<{ $isSelected?: boolean }>`
  padding: 16px 18px;
  background: ${(props) =>
    props.$isSelected ? COLORS.bg.primary50 : COLORS.bg.white};
  border-radius: 12px;
  border: 1.5px solid
    ${(props) => (props.$isSelected ? COLORS.primary : COLORS.border.light)};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${(props) =>
    props.$isSelected ? COLORS.shadow.md : COLORS.shadow.sm};
  position: relative;

  ${(props) =>
    props.$isSelected &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        background: ${COLORS.primary};
        border-radius: 0 3px 3px 0;
      }
    `}

  &:hover {
    ${(props) =>
      !props.$isSelected &&
      css`
        border-color: ${COLORS.border.medium};
        background: ${COLORS.bg.gray50};
        box-shadow: ${COLORS.shadow.md};
        transform: translateY(-1px);
      `}
  }

  &:active {
    transform: translateY(0);
  }
`

export const GradientOverlay = styled.div`
  display: none;
`

export const ListItemContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const ListItemTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.text.primary};
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`

export const ListItemSubtitle = styled.div`
  font-size: 13px;
  color: ${COLORS.text.tertiary};
  font-weight: 400;
`

export const BadgeContainer = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
`

export const ItemCountBadge = styled.div<{ $isSelected?: boolean }>`
  background: ${(props) =>
    props.$isSelected ? COLORS.primary : COLORS.bg.gray100};
  color: ${(props) =>
    props.$isSelected ? COLORS.bg.white : COLORS.text.secondary};
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;
  box-shadow: ${(props) => (props.$isSelected ? COLORS.shadow.sm : 'none')};
`

export const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.bg.gray50};
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${COLORS.border.light};
`

export const RightPanelScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.border.medium};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.border.primary};
  }
`

// ============================================
// 행정구역 체계 정보 (Hierarchy Info)
// ============================================
export const HierarchyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${COLORS.bg.gray50};
  border-bottom: 1px solid ${COLORS.border.light};
  font-size: 13px;
  flex-wrap: wrap;
`

export const HierarchySeparator = styled.span`
  color: ${COLORS.border.medium};
  font-weight: 400;
`

export const HierarchyItem = styled.span<{ $isActive?: boolean }>`
  color: ${(props) =>
    props.$isActive ? COLORS.primary : COLORS.text.secondary};
  font-weight: ${(props) => (props.$isActive ? '600' : '400')};
  transition: color 0.2s;
`

export const RightPanelHeader = styled.div`
  padding: 20px 24px;
  background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
  border-bottom: 1px solid ${COLORS.border.light};
`

export const RightPanelTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.text.primary};
`

export const MayorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: ${COLORS.bg.gray50};
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid ${COLORS.border.light};
`

export const MayorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${COLORS.text.secondary};
  font-weight: 600;
`

export const PartyBadge = styled.div`
  background: ${COLORS.bg.primary100};
  color: ${COLORS.primary};
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${COLORS.badge.blue.border};
  box-shadow: ${COLORS.shadow.sm};
`

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 0;
`

export const StatCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  padding: 20px 22px;
  border-radius: 12px;
  border: 1px solid ${COLORS.border.light};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: ${COLORS.primary};
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.12);
    transform: translateY(-4px);
    background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  }
`

export const StatLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.text.tertiary};
  margin-bottom: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

export const StatValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  line-height: 1.2;

  span {
    font-size: 14px;
    color: ${COLORS.text.secondary};
    font-weight: 500;
    margin-left: 4px;
  }
`

// ============================================
// 탭 메뉴 (모던하고 미니멀하게!)
// ============================================
export const TabMenu = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: ${COLORS.bg.white};
  border-bottom: 1px solid ${COLORS.border.light};
  padding: 16px 20px;
`

export const TabButton = styled.button<{ $isActive?: boolean }>`
  padding: 12px 16px;
  background: ${(props) =>
    props.$isActive ? COLORS.primary : COLORS.bg.gray50};
  border: 1.5px solid
    ${(props) => (props.$isActive ? COLORS.primary : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) =>
    props.$isActive ? COLORS.bg.white : COLORS.text.secondary};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: ${(props) => (props.$isActive ? COLORS.shadow.sm : 'none')};

  &:hover {
    background: ${(props) =>
      props.$isActive ? COLORS.primaryDark : COLORS.bg.gray100};
    transform: translateY(-1px);
    box-shadow: ${(props) =>
      props.$isActive ? COLORS.shadow.md : COLORS.shadow.sm};
  }

  &:active {
    transform: translateY(0);
  }

  span:first-child {
    font-size: 18px;
    filter: ${(props) => (props.$isActive ? 'none' : 'grayscale(0.3)')};
  }

  &:hover span:first-child {
    filter: none;
  }
`

export const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: ${COLORS.bg.white};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${COLORS.bg.gray50};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.border.medium};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.primary};
  }
`

export const TabContentInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
`

// ============================================
// 상세 카드 (모던하고 깔끔하게)
// ============================================
export const DetailCard = styled.div`
  background: ${COLORS.bg.white};
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid ${COLORS.border.light};
  cursor: default;
  transition: all 0.2s ease;
  box-shadow: ${COLORS.shadow.sm};
  margin-bottom: 12px;

  &:hover {
    border-color: ${COLORS.border.medium};
    box-shadow: ${COLORS.shadow.md};
    transform: translateY(-2px);
  }
`

export const DetailCardTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${COLORS.text.primary};
  margin-bottom: 12px;
  letter-spacing: -0.02em;
`

export const DetailCardContent = styled.div`
  font-size: 14px;
  color: ${COLORS.text.secondary};
  line-height: 1.6;
  margin-bottom: 12px;
  font-weight: 400;
`

export const DetailMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid ${COLORS.border.light};
`

export const DetailMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  border-radius: 10px;
  border: 1px solid ${COLORS.border.light};
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #bfdbfe;
    transform: translateY(-2px);
  }
`

export const DetailMetaLabel = styled.div`
  font-size: 11px;
  color: ${COLORS.text.tertiary};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export const DetailMetaValue = styled.div`
  font-size: 15px;
  color: ${COLORS.text.primary};
  font-weight: 700;
  letter-spacing: -0.01em;
`

export const DetailBadgeRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  align-items: center;
  flex-wrap: wrap;
`

export const BlueBadge = styled.div`
  background: ${COLORS.badge.blue.bg};
  color: ${COLORS.badge.blue.text};
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid ${COLORS.badge.blue.border};
  font-size: 12px;
`

export const GreenBadge = styled.div`
  background: ${COLORS.badge.green.bg};
  color: ${COLORS.badge.green.text};
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid ${COLORS.badge.green.border};
  font-size: 12px;
`

export const YellowBadge = styled.div`
  background: ${COLORS.badge.purple.bg};
  color: ${COLORS.badge.purple.text};
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid ${COLORS.badge.purple.border};
  font-size: 12px;
`

export const DetailInfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${COLORS.bg.gray50};
  padding: 5px 12px;
  border-radius: 20px;
  color: ${COLORS.text.secondary};
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${COLORS.border.light};
`

// ============================================
// 섹션 타이틀 (미니멀하게)
// ============================================
export const SectionTitle = styled.h4<{ $large?: boolean }>`
  font-size: ${(props) => (props.$large ? '17px' : '15px')};
  font-weight: 600;
  color: ${COLORS.text.primary};
  margin: ${(props) => (props.$large ? '28px 0 16px 0' : '20px 0 12px 0')};
  padding: 0;
  position: relative;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${COLORS.border.light};
  }
`

// ============================================
// 빈 상태
// ============================================
export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  margin: 24px;
  border: 2px dashed ${COLORS.border.medium};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.03) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`

export const EmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.5;
  filter: grayscale(0.3);
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`

export const EmptyTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  margin: 0 0 12px 0;
  letter-spacing: -0.01em;
`

export const EmptyDescription = styled.p`
  font-size: 14px;
  color: ${COLORS.text.secondary};
  margin: 0;
  line-height: 1.7;
  font-weight: 500;
`

export const StatisticsEmpty = styled.div`
  text-align: center;
  padding: 100px 40px;
  background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  border: 2px dashed ${COLORS.border.medium};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(139, 92, 246, 0.04) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`

export const StatisticsEmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.5;
  filter: grayscale(0.3);
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.6;
    }
  }
`

export const StatisticsEmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  margin-bottom: 12px;
  letter-spacing: -0.01em;
`

export const StatisticsEmptyDescription = styled.div`
  font-size: 14px;
  color: ${COLORS.text.secondary};
  line-height: 1.7;
  font-weight: 500;
`

// ============================================
// 아코디언 섹션 (우측 패널용)
// ============================================
export const AccordionSection = styled.div`
  border: 1px solid ${COLORS.border.light};
  border-radius: 12px;
  overflow: hidden;
  background: ${COLORS.bg.white};
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  margin-bottom: 16px;
`

export const AccordionHeader = styled.button<{ $isOpen?: boolean }>`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: ${(props) =>
    props.$isOpen
      ? 'linear-gradient(to bottom, #fafbfc 0%, #f8fafc 100%)'
      : COLORS.bg.gray50};
  border: none;
  border-bottom: ${(props) =>
    props.$isOpen ? `1px solid ${COLORS.border.light}` : 'none'};
  font-size: 15px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%);
  }
`

export const AccordionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: ${COLORS.text.primary};
`

export const AccordionToggleIcon = styled.div<{ $isOpen?: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLORS.text.secondary};
  transition: transform 0.3s ease;
  transform: ${(props) => (props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};
`

export const AccordionContent = styled.div<{ $isOpen?: boolean }>`
  max-height: ${(props) => (props.$isOpen ? '2000px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
`

export const AccordionInner = styled.div`
  padding: 20px;
`

// ============================================
// 🏔️ 자연 지리 모드 전용 스타일 (Google Material)
// ============================================
export const NatureFullMap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #f9fafb;
`

export const NatureFilterBar = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: #ffffff;
  border: 1px solid #e8eaed;
  padding: 12px 20px;
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: center;
`

export const FilterCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 16px;
  transition: background 0.2s;
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;

  &:hover {
    background: #f8f9fa;
  }

  input {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  span {
    font-size: 16px;
  }
`

export const NatureFloatingCard = styled.div`
  position: absolute;
  bottom: 30px;
  left: 30px;
  width: 420px;
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 20;
`

export const NatureCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`

export const NatureCardClose = styled.button`
  background: #f8f9fa;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  transition: all 0.2s;

  &:hover {
    background: #e8eaed;
    color: #202124;
  }
`

export const NatureCardTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
`

export const NatureCardSubtitle = styled.div`
  font-size: 13px;
  color: #5f6368;
  font-weight: 500;
`

export const NatureStatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
`

export const NatureStatCard = styled.div`
  background: #f8f9fa;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e8eaed;
`

export const NatureStatLabel = styled.div`
  font-size: 11px;
  color: #5f6368;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`

export const NatureStatValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #202124;
`

export const NatureSideList = styled.div`
  position: absolute;
  top: 100px;
  left: 20px;
  width: 280px;
  max-height: calc(100% - 140px);
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  z-index: 5;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

export const NatureListTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const NatureListItem = styled.div<{ $active?: boolean }>`
  padding: 12px;
  background: ${(props) => (props.$active ? '#e8f0fe' : '#ffffff')};
  border: 1px solid ${(props) => (props.$active ? '#4285f4' : '#e8eaed')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: ${(props) => (props.$active ? '#e8f0fe' : '#f8f9fa')};
    border-color: ${(props) => (props.$active ? '#4285f4' : '#dadce0')};
  }
`

export const NatureListItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #202124;
  margin-bottom: 4px;
`

export const NatureListItemRegion = styled.div`
  font-size: 11px;
  color: #5f6368;
`

// ============================================
// ⚡ 인프라 모드 전용 스타일 (대시보드)
// ============================================
export const InfraDashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 20px;
  height: 100%;
  padding: 20px;
  background: #f8f9fa;
  overflow: hidden;

  @media (max-width: 1400px) {
    grid-template-columns: 250px 1fr 250px;
  }
`

export const InfraLeftStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

export const InfraStatCard = styled.div`
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`

export const InfraStatIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 12px;
`

export const InfraStatLabel = styled.div`
  font-size: 11px;
  color: #5f6368;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`

export const InfraStatValue = styled.div`
  font-size: 28px;
  font-weight: 600;
  color: #202124;
  margin-bottom: 4px;
`

export const InfraStatChange = styled.div<{ $positive?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${(props) => (props.$positive ? '#34a853' : '#ea4335')};
  display: flex;
  align-items: center;
  gap: 4px;
`

export const InfraCenterMap = styled.div`
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
`

export const InfraMapHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e8eaed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
`

export const InfraMapTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #202124;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const InfraMapLegend = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`

export const InfraLegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #5f6368;
  font-weight: 500;
`

export const InfraLegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => props.$color};
`

export const InfraRightList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

export const InfraListCard = styled.div<{ $active?: boolean }>`
  background: #ffffff;
  border: 1px solid ${(props) => (props.$active ? '#4285f4' : '#e8eaed')};
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${(props) =>
    props.$active
      ? '0 4px 12px rgba(66, 133, 244, 0.15)'
      : '0 1px 2px rgba(0, 0, 0, 0.04)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #4285f4;
  }
`

export const InfraListCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`

export const InfraListCardIcon = styled.div`
  font-size: 20px;
`

export const InfraListCardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #202124;
`

export const InfraListCardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const InfraListCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #5f6368;
`

export const InfraListCardLabel = styled.span`
  font-weight: 500;
`

export const InfraListCardValue = styled.span`
  font-weight: 600;
  color: #202124;
`
