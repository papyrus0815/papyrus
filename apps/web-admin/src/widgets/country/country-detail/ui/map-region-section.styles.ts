import styled, { css } from 'styled-components'

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

const darkBlur = css`
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
`

/** 다크: 리퀴드 글라스 카드 / 라이트: 흰 배경 카드 */
const glassCard = css`
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          ${darkBlur}
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        `}
`

// ─── 탭 내비게이션 ────────────────────────────────────────────────────────────

export const MapRegionTabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        `
      : css`
          background: #f1f5f9;
        `}
`

export const MapRegionTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(255,255,255,0.15)' : 'transparent'};
          color: ${$active ? '#ffffff' : theme.colors.text.secondary};
          box-shadow: ${$active ? '0 2px 8px rgba(0,0,0,0.35)' : 'none'};
          backdrop-filter: ${$active ? 'blur(8px)' : 'none'};
          -webkit-backdrop-filter: ${$active ? 'blur(8px)' : 'none'};
          &:hover {
            color: #ffffff;
            background: ${$active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'};
          }
        `
      : css`
          background: ${$active ? '#ffffff' : 'transparent'};
          color: ${$active ? '#4f46e5' : '#64748b'};
          box-shadow: ${$active ? '0 2px 8px rgba(79,70,229,0.12)' : 'none'};
          &:hover {
            color: ${$active ? '#4f46e5' : '#475569'};
            background: ${$active ? '#ffffff' : 'rgba(255,255,255,0.6)'};
          }
        `}
`

export const MapRegionSectionLabel = styled.div`
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

// ─── 최상위 컨테이너 ──────────────────────────────────────────────────────────

export const MainContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  min-height: 800px;
  max-height: 100vh;
  background: ${({ theme }) => theme.colors.background.primary};
  overflow: hidden;
`

export const HoverGradient = styled.div`
  display: none;
`

// ─── 브레드크럼 ──────────────────────────────────────────────────────────────

export const TopBreadcrumb = styled.div`
  padding: 12px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : theme.colors.background.secondary};
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
  color: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.primary : theme.colors.text.secondary};
  font-weight: ${({ $isActive }) => ($isActive ? '600' : '400')};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: color 0.2s;

  &:hover {
    color: ${({ $clickable, theme }) =>
      $clickable ? theme.colors.primary : undefined};
  }
`

export const BreadcrumbSeparator = styled.span`
  color: ${({ theme }) => theme.colors.border.medium};
`

export const Breadcrumb = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : theme.colors.background.secondary};
`

export const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`

// ─── ViewMode 셀렉터 ─────────────────────────────────────────────────────────

export const ViewModeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

export const ViewModeButton = styled.button<{ $isActive?: boolean }>`
  padding: 20px 24px;
  border: none;
  border-bottom: 3px solid
    ${({ $isActive, theme }) => ($isActive ? theme.colors.primary : 'transparent')};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;

  ${({ $isActive, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$isActive
            ? theme.colors.primary
            : 'rgba(255,255,255,0.03)'};
          color: ${$isActive ? '#ffffff' : theme.colors.text.secondary};
          &:hover {
            background: ${$isActive
              ? 'rgba(99,106,242,0.85)'
              : 'rgba(255,255,255,0.07)'};
          }
        `
      : css`
          background: ${$isActive ? theme.colors.primary : '#ffffff'};
          color: ${$isActive ? '#ffffff' : theme.colors.text.secondary};
          &:hover {
            background: ${$isActive ? '#4f46e5' : theme.colors.background.secondary};
          }
        `}

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    height: 50%;
    width: 1px;
    background: ${({ theme }) => theme.colors.border.light};
  }

  span:first-child {
    font-size: 24px;
    filter: ${({ $isActive }) => ($isActive ? 'none' : 'grayscale(0.5)')};
    transition: all 0.2s ease;
  }

  &:hover span:first-child {
    transform: scale(1.1);
    filter: none;
  }
`

// ─── 레이아웃 ────────────────────────────────────────────────────────────────

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

// ─── 패널 ────────────────────────────────────────────────────────────────────

export const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
  height: 100%;
  background: ${({ theme }) => theme.colors.background.primary};

  ${({ theme }) =>
    theme.mode === 'dark' &&
    css`
      ${darkBlur}
      background: rgba(23,23,23,0.92);
    `}
`

export const MiddlePanel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  position: relative;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.secondary
      : theme.colors.background.secondary};
`

export const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
  height: 100%;
  background: ${({ theme }) => theme.colors.background.primary};

  ${({ theme }) =>
    theme.mode === 'dark' &&
    css`
      ${darkBlur}
      background: rgba(23,23,23,0.92);
    `}
`

export const MapHeader = styled.div`
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};

  span:first-child {
    font-size: 20px;
  }
`

export const MapContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: ${({ theme }) => theme.colors.background.secondary};
`

// ─── 구분선 ──────────────────────────────────────────────────────────────────

export const DividerHorizontal = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  width: 100%;
`

export const DividerVertical = styled.div`
  width: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  height: 100%;
`

// ─── 리스트 컨테이너 ─────────────────────────────────────────────────────────

export const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)'};
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

export const BackButton = styled.button`
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          &:hover {
            background: ${theme.colors.primary};
            border-color: ${theme.colors.primary};
            transform: translateX(-2px);
            svg { stroke: #ffffff; }
          }
        `
      : css`
          background: #ffffff;
          border: 1.5px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          &:hover {
            background: #6366f1;
            border-color: #6366f1;
            transform: translateX(-2px);
            svg { stroke: #ffffff; }
          }
        `}

  svg { transition: stroke 0.2s; }
`

export const HeaderTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  letter-spacing: -0.02em;
`

export const CountBadge = styled.div`
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
`

export const ListScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: transparent;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.5)' : '#6366f1'};
  }
`

export const ListContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

// ─── 리스트 아이템 ────────────────────────────────────────────────────────────

export const ListItem = styled.div<{ $isSelected?: boolean }>`
  padding: 16px 18px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  ${({ $isSelected, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$isSelected
            ? 'rgba(99,106,242,0.12)'
            : 'rgba(255,255,255,0.03)'};
          border: 1.5px solid ${$isSelected
            ? 'rgba(99,106,242,0.35)'
            : 'rgba(255,255,255,0.07)'};
          ${darkBlur}
          box-shadow: ${$isSelected
            ? '0 4px 14px rgba(99,106,242,0.2)'
            : '0 1px 3px rgba(0,0,0,0.2)'};
        `
      : css`
          background: ${$isSelected ? '#f5f3ff' : '#ffffff'};
          border: 1.5px solid ${$isSelected ? '#6366f1' : '#e5e7eb'};
          box-shadow: ${$isSelected
            ? '0 4px 6px -1px rgba(0,0,0,0.1)'
            : '0 1px 2px rgba(0,0,0,0.05)'};
        `}

  ${({ $isSelected, theme }) =>
    $isSelected &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        background: ${theme.colors.primary};
        border-radius: 0 3px 3px 0;
      }
    `}

  &:hover {
    ${({ $isSelected, theme }) =>
      !$isSelected &&
      (theme.mode === 'dark'
        ? css`
            background: rgba(99,106,242,0.08);
            border-color: rgba(99,106,242,0.25);
            transform: translateY(-1px);
          `
        : css`
            border-color: #d1d5db;
            background: #fafafa;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transform: translateY(-1px);
          `)}
  }

  &:active { transform: translateY(0); }
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
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`

export const ListItemSubtitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
`

export const BadgeContainer = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
`

export const ItemCountBadge = styled.div<{ $isSelected?: boolean }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;

  ${({ $isSelected, theme }) =>
    $isSelected
      ? css`
          background: ${theme.colors.primary};
          color: #ffffff;
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.07)'
            : '#f4f4f5'};
          color: ${theme.colors.text.secondary};
        `}
`

export const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RightPanelScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db'};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.5)' : '#6366f1'};
  }
`

// ─── 행정구역 체계 정보 ───────────────────────────────────────────────────────

export const HierarchyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 13px;
  flex-wrap: wrap;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : theme.colors.background.secondary};
`

export const HierarchySeparator = styled.span`
  color: ${({ theme }) => theme.colors.border.medium};
  font-weight: 400;
`

export const HierarchyItem = styled.span<{ $isActive?: boolean }>`
  color: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.primary : theme.colors.text.secondary};
  font-weight: ${({ $isActive }) => ($isActive ? '600' : '400')};
  transition: color 0.2s;
`

// ─── 우측 패널 헤더 ──────────────────────────────────────────────────────────

export const RightPanelHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)'};
`

export const RightPanelTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const MayorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : theme.colors.background.secondary};
`

export const MayorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
`

export const PartyBadge = styled.div`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99,106,242,0.15);
          color: ${theme.colors.primary};
          border: 1px solid rgba(99,106,242,0.3);
        `
      : css`
          background: #ede9fe;
          color: #6366f1;
          border: 1px solid #c7d2fe;
        `}
`

// ─── 통계 그리드 ─────────────────────────────────────────────────────────────

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 0;
`

export const StatCard = styled.div`
  padding: 20px 22px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.04);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
          &:hover {
            border-color: rgba(99,106,242,0.35);
            box-shadow: 0 6px 18px rgba(0,0,0,0.5);
            transform: translateY(-4px);
          }
        `
      : css`
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
          border: 1px solid #e5e7eb;
          &:hover {
            border-color: #6366f1;
            box-shadow: 0 6px 20px rgba(59,130,246,0.12);
            transform: translateY(-4px);
            background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          }
        `}
`

export const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

export const StatValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.2;

  span {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 500;
    margin-left: 4px;
  }
`

// ─── 탭 메뉴 (우측 패널) ─────────────────────────────────────────────────────

export const TabMenu = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 16px 20px;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const TabButton = styled.button<{ $isActive?: boolean }>`
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${({ $isActive, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$isActive ? theme.colors.primary : 'rgba(255,255,255,0.05)'};
          border: 1.5px solid ${$isActive ? theme.colors.primary : 'transparent'};
          color: ${$isActive ? '#ffffff' : theme.colors.text.secondary};
          box-shadow: ${$isActive ? '0 3px 10px rgba(99,106,242,0.3)' : 'none'};
          &:hover {
            background: ${$isActive ? 'rgba(99,106,242,0.85)' : 'rgba(255,255,255,0.1)'};
            transform: translateY(-1px);
          }
        `
      : css`
          background: ${$isActive ? '#6366f1' : '#f4f4f5'};
          border: 1.5px solid ${$isActive ? '#6366f1' : 'transparent'};
          color: ${$isActive ? '#ffffff' : '#52525b'};
          box-shadow: ${$isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'};
          &:hover {
            background: ${$isActive ? '#4f46e5' : '#e4e4e7'};
            transform: translateY(-1px);
          }
        `}

  &:active { transform: translateY(0); }

  span:first-child {
    font-size: 18px;
    filter: ${({ $isActive }) => ($isActive ? 'none' : 'grayscale(0.3)')};
  }
  &:hover span:first-child { filter: none; }
`

export const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: ${({ theme }) => theme.colors.background.primary};

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary};
  }
`

export const TabContentInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
`

// ─── 상세 카드 ────────────────────────────────────────────────────────────────

export const DetailCard = styled.div`
  padding: 18px 20px;
  border-radius: 12px;
  cursor: default;
  transition: all 0.2s ease;
  margin-bottom: 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.04);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          &:hover {
            border-color: rgba(99,106,242,0.3);
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            transform: translateY(-2px);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          &:hover {
            border-color: #d1d5db;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
        `}
`

export const DetailCardTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
  letter-spacing: -0.02em;
`

export const DetailCardContent = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
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
  border-top: 2px solid ${({ theme }) => theme.colors.border.light};
`

export const DetailMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.03);
          &:hover {
            background: rgba(99,106,242,0.1);
            border-color: rgba(99,106,242,0.3);
            transform: translateY(-2px);
          }
        `
      : css`
          background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
          &:hover {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-color: #bfdbfe;
            transform: translateY(-2px);
          }
        `}
`

export const DetailMetaLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export const DetailMetaValue = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
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

// ─── 배지 ────────────────────────────────────────────────────────────────────

export const BlueBadge = styled.div`
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(59,130,246,0.15);
          color: #93c5fd;
          border: 1px solid rgba(59,130,246,0.25);
        `
      : css`
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        `}
`

export const GreenBadge = styled.div`
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(16,185,129,0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16,185,129,0.25);
        `
      : css`
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `}
`

export const YellowBadge = styled.div`
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(139,92,246,0.15);
          color: #c4b5fd;
          border: 1px solid rgba(139,92,246,0.25);
        `
      : css`
          background: #f3e8ff;
          color: #6b21a8;
          border: 1px solid #e9d5ff;
        `}
`

export const DetailInfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : theme.colors.background.secondary};
`

// ─── 섹션 타이틀 ─────────────────────────────────────────────────────────────

export const SectionTitle = styled.h4<{ $large?: boolean }>`
  font-size: ${({ $large }) => ($large ? '17px' : '15px')};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: ${({ $large }) => ($large ? '28px 0 16px 0' : '20px 0 12px 0')};
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
    background: ${({ theme }) => theme.colors.border.light};
  }
`

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  border-radius: 16px;
  margin: 24px;
  border: 2px dashed ${({ theme }) => theme.colors.border.medium};
  position: relative;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.02);
          &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(99,106,242,0.04) 0%, transparent 70%);
            pointer-events: none;
          }
        `
      : css`
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 70%);
            pointer-events: none;
          }
        `}
`

export const EmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.5;
  filter: grayscale(0.3);
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
`

export const EmptyTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  letter-spacing: -0.01em;
`

export const EmptyDescription = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.7;
  font-weight: 500;
`

export const StatisticsEmpty = styled.div`
  text-align: center;
  padding: 100px 40px;
  border-radius: 16px;
  border: 2px dashed ${({ theme }) => theme.colors.border.medium};
  position: relative;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.02);
          &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%);
            pointer-events: none;
          }
        `
      : css`
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%);
            pointer-events: none;
          }
        `}
`

export const StatisticsEmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.5;
  filter: grayscale(0.3);
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.05); opacity: 0.6; }
  }
`

export const StatisticsEmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
  letter-spacing: -0.01em;
`

export const StatisticsEmptyDescription = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.7;
  font-weight: 500;
`

// ─── 아코디언 ────────────────────────────────────────────────────────────────

export const AccordionSection = styled.div`
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.03);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `
      : css`
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15,23,42,0.04);
        `}
`

export const AccordionHeader = styled.button<{ $isOpen?: boolean }>`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border: none;
  border-bottom: ${({ $isOpen, theme }) =>
    $isOpen ? `1px solid ${theme.colors.border.light}` : 'none'};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  ${({ $isOpen, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$isOpen
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.02)'};
          &:hover { background: rgba(255,255,255,0.07); }
        `
      : css`
          background: ${$isOpen
            ? 'linear-gradient(to bottom, #fafbfc 0%, #f8fafc 100%)'
            : '#f4f4f5'};
          &:hover { background: linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%); }
        `}
`

export const AccordionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const AccordionToggleIcon = styled.div<{ $isOpen?: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: transform 0.3s ease;
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};
`

export const AccordionContent = styled.div<{ $isOpen?: boolean }>`
  max-height: ${({ $isOpen }) => ($isOpen ? '2000px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
`

export const AccordionInner = styled.div`
  padding: 20px;
`

// ─── 자연 지리 모드 ──────────────────────────────────────────────────────────

export const NatureFullMap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.colors.background.secondary};
`

export const NatureFilterBar = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 12px 20px;
  border-radius: 24px;
  display: flex;
  gap: 16px;
  align-items: center;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(33,33,33,0.9);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8eaed;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `}
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
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8f9fa'};
  }

  input {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  span { font-size: 16px; }
`

export const NatureFloatingCard = styled.div`
  position: absolute;
  bottom: 30px;
  left: 30px;
  width: 420px;
  border-radius: 16px;
  padding: 24px;
  z-index: 20;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(23,23,23,0.92);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8eaed;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        `}
`

export const NatureCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`

export const NatureCardClose = styled.button`
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8f9fa'};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#e8eaed'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const NatureCardTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
`

export const NatureCardSubtitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

export const NatureStatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
`

export const NatureStatCard = styled.div`
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8f9fa'};
`

export const NatureStatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`

export const NatureStatValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const NatureSideList = styled.div`
  position: absolute;
  top: 100px;
  left: 20px;
  width: 280px;
  max-height: calc(100% - 140px);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  z-index: 5;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(23,23,23,0.9);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8eaed;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `}

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#dadce0'};
    border-radius: 3px;
  }
`

export const NatureListTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const NatureListItem = styled.div<{ $active?: boolean }>`
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(99,106,242,0.15)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${$active ? 'rgba(99,106,242,0.4)' : 'rgba(255,255,255,0.07)'};
          &:hover {
            background: ${$active ? 'rgba(99,106,242,0.2)' : 'rgba(255,255,255,0.07)'};
          }
        `
      : css`
          background: ${$active ? '#e8f0fe' : '#ffffff'};
          border: 1px solid ${$active ? '#4285f4' : '#e8eaed'};
          &:hover {
            background: ${$active ? '#e8f0fe' : '#f8f9fa'};
            border-color: ${$active ? '#4285f4' : '#dadce0'};
          }
        `}
`

export const NatureListItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`

export const NatureListItemRegion = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 인프라 모드 ─────────────────────────────────────────────────────────────

export const InfraDashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 20px;
  height: 100%;
  padding: 20px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};

  @media (max-width: 1400px) {
    grid-template-columns: 250px 1fr 250px;
  }
`

export const InfraLeftStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#dadce0'};
    border-radius: 3px;
  }
`

export const InfraStatCard = styled.div`
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.04);
          ${darkBlur}
          border: 1px solid rgba(255,255,255,0.08);
          &:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8eaed;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        `}
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
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`

export const InfraStatValue = styled.div`
  font-size: 28px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`

export const InfraStatChange = styled.div<{ $positive?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.success : theme.colors.error};
  display: flex;
  align-items: center;
  gap: 4px;
`

export const InfraCenterMap = styled.div`
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e8eaed;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        `}
`

export const InfraMapHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'};
`

export const InfraMapTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
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
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

export const InfraLegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

export const InfraRightList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#dadce0'};
    border-radius: 3px;
  }
`

export const InfraListCard = styled.div<{ $active?: boolean }>`
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(99,106,242,0.12)' : 'rgba(255,255,255,0.04)'};
          border: 1px solid ${$active ? 'rgba(99,106,242,0.4)' : 'rgba(255,255,255,0.08)'};
          box-shadow: ${$active ? '0 4px 12px rgba(99,106,242,0.2)' : 'none'};
          &:hover {
            transform: translateY(-2px);
            border-color: rgba(99,106,242,0.4);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid ${$active ? '#4285f4' : '#e8eaed'};
          box-shadow: ${$active ? '0 4px 12px rgba(66,133,244,0.15)' : '0 1px 2px rgba(0,0,0,0.04)'};
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-color: #4285f4;
          }
        `}
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
  color: ${({ theme }) => theme.colors.text.primary};
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
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const InfraListCardLabel = styled.span`
  font-weight: 500;
`

export const InfraListCardValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`
