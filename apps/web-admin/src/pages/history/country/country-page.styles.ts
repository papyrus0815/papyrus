/**
 * /history/country 페이지 레이아웃 스타일
 * country.page.tsx 전용: 페이지 루트, 그리드, PageHeader, KPI 등
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

// ─── 페이지 루트 ──────────────────────────────────────────────────────────────

export const Wrap = styled.div<{ $inHistory?: boolean }>`
  width: 100%;
  min-height: ${({ $inHistory }) => ($inHistory ? 'auto' : '100vh')};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: ${({ theme }) => theme.colors.background.primary};
  padding: ${({ $inHistory }) => ($inHistory ? '0' : '64px 0 0')};

  @media (max-width: 1024px) {
    padding: ${({ $inHistory }) => ($inHistory ? '0' : '28px 0 12px')};
  }

  @media (max-width: 768px) {
    padding: ${({ $inHistory }) => ($inHistory ? '0' : '20px 0 10px')};
  }
`

export const MainGrid = styled.div<{
  $noSidebar?: boolean
  $listCollapsed?: boolean
}>`
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: ${({ $noSidebar, $listCollapsed }) => {
    if ($listCollapsed) return '48px minmax(0, 1fr)'
    return $noSidebar ? '15% minmax(0, 1fr)' : '15% 30% minmax(0, 1fr)'
  }};
  column-gap: 0;
  align-items: start;
  min-height: inherit;
  transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1280px) {
    grid-template-columns: ${({ $noSidebar, $listCollapsed }) => {
      if ($listCollapsed) return '48px minmax(0, 1fr)'
      return $noSidebar ? '35% minmax(0, 1fr)' : '18% 35% minmax(0, 1fr)'
    }};
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    row-gap: 12px;
    padding: 0;
  }
`

// ─── 상단 KPI 바 ──────────────────────────────────────────────────────────────

export const Top = styled.div`
  width: min(980px, calc(100% - 64px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 12px;

  @media (max-width: 1024px) {
    width: calc(100% - 48px);
  }

  @media (max-width: 768px) {
    width: calc(100% - 32px);
  }

  @media (max-width: 480px) {
    width: calc(100% - 24px);
  }
`

export const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
`

export const KpiCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const KpiLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const KpiValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const Primary = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  cursor: pointer;

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 13px;
  }
`

// ─── 페이지 헤더 ──────────────────────────────────────────────────────────────

export const PageHeader = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.sm};
  position: sticky;
  top: 64px;
  z-index: 10;
`

export const HeaderContent = styled.div`
  max-width: 1920px;
  margin: 0 auto;
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;

  @media (min-width: 769px) and (max-width: 1024px) {
    padding: 20px 28px;
    gap: 24px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px 20px;
    gap: 16px;
  }
`

export const PageHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`

export const PageHeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: ${({ theme }) => theme.colors.activeLight};
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};

  @media (min-width: 769px) and (max-width: 1024px) {
    width: 52px;
    height: 52px;
  }

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
  }
`

export const PageHeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const PageHeaderTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.5px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const PageHeaderSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const PageHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`

export const HeaderStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const HeaderStatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const HeaderStatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

// ─── 대시보드 메뉴 콘텐츠 패널 ────────────────────────────────────────────────

export const DashboardMenuContentPanel = styled.div`
  padding: 32px 24px;
  min-height: 100%;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`

export const DashboardMenuContentTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DashboardMenuContentDesc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  max-width: 360px;
`

export const DashboardMenuContentButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

// ─── 모바일 UI (CountryMobileUI.tsx 전용) ─────────────────────────────────────

export const MobileListOverlay = styled(motion.div)`
  display: none;

  @media (max-width: 1024px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${OVERLAY_STYLES.BACKGROUND};
    z-index: ${Z_INDEX.MODAL_OVERLAY};
    backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  }
`

export const MobileListPane = styled.div<{ $inHistory?: boolean }>`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 20px 20px 0 0;
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
    box-shadow: 0 -4px 20px ${({ theme }) => theme.colors.shadow.lg};
  }
`

export const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  background: ${({ theme }) => theme.colors.border.medium};
  border-radius: 2px;
  margin: 8px auto 4px;
  cursor: grab;
  transition: background 0.2s ease;

  &:active {
    cursor: grabbing;
    background: ${({ theme }) => theme.colors.border.dark};
  }
`

export const MobileListHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  flex-shrink: 0;
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`

export const MobileListTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const MobileListTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const MobileListClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const MobileListSearchRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const MobileFilterRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

export const MobileFilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  height: 36px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  border-radius: 10px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.primary};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
`

export const MobileClearButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 14px;
  height: 36px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const MobileTabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 0 0 0;
`

export const MobileTabButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.gradient.primary : theme.colors.background.secondary};
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.primary};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.97);
  }

  svg {
    flex-shrink: 0;
  }
`

export const MobileTabBadge = styled.span`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

export const MobileActionRow = styled.div`
  padding: 12px 0 0 0;
`

export const MobileAddButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const MobileDashboardInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  flex: 1;
`

export const MobileDashboardIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`

export const MobileDashboardText = styled.p`
  margin: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const MobileViewSwitcher = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 10px;
`

export const ViewSwitchButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
`

export const MobileSearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.activeLight};
  }
`

export const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 768px) {
    display: flex;
  }
`

export const MobileMenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`

export const MobileMenuDrawer = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 92%;
    max-width: 420px;
    max-height: 65vh;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 20px;
    box-shadow: 0 20px 60px ${({ theme }) => theme.colors.shadow.lg};
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

export const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

export const MobileMenuTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const MobileMenuClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const MobileMenuContent = styled.div`
  flex: 1;
  padding: 8px 12px 16px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const MobileMenuItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 14px;
  margin-bottom: 4px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.primary};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  text-align: left;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
  }

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`

export const MobileMenuBadge = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
`

export const MobileMenuDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  margin: 12px 0;
`

export const OverviewSubTabRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 12px 20px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const OverviewSubTabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 20px;
  overflow-x: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const OverviewSubTabButton = styled.button<{ $active?: boolean }>`
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
  box-shadow: ${({ $active, theme }) =>
    $active ? `0 2px 8px ${theme.colors.shadow.sm}` : 'none'};
`

export const CollapsedListPane = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
`

export const CollapsedListButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 4px ${({ theme }) => theme.colors.shadow.sm};
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.activeLight};
  }
`

// ─── 상세 패널 (country.page.tsx 에서 직접 렌더) ──────────────────────────────

export const DetailPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100vh - var(--header-height));
  min-height: 0;
  overflow-y: auto;
  border-left: none;

  @media (max-width: 1024px) {
    display: none;
  }
`
