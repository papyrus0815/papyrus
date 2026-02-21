import { motion } from 'framer-motion'
import styled from 'styled-components'

import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import { FormInput } from '@/shared/ui/form-input'

export const Wrap = styled.div<{ $inHistory?: boolean }>`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: #ffffff;
  padding: ${({ $inHistory }) => ($inHistory ? '0' : '64px 0 0')};

  @media (max-width: 1024px) {
    padding: ${({ $inHistory }) => ($inHistory ? '0' : '28px 0 12px')};
  }

  @media (max-width: 768px) {
    padding: ${({ $inHistory }) => ($inHistory ? '0' : '20px 0 10px')};
  }
`

export const Top = styled.div`
  width: min(980px, calc(100% - 64px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 12px;

  @media (max-width: 1024px) {
    width: calc(100% - 48px);
    gap: 10px;
    margin: 6px 0 10px;
  }

  @media (max-width: 768px) {
    width: calc(100% - 32px);
    gap: 8px;
    margin: 4px 0 8px;
  }

  @media (max-width: 480px) {
    width: calc(100% - 24px);
  }
`

export const Primary = styled.button`
  border: none;
  background: var(--color-primary);
  color: #fff;

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 13px;
  }

  @media (max-width: 480px) {
    padding: 8px 14px;
    font-size: 12px;
  }
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  cursor: pointer;
`

export const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
`

export const KpiCard = styled.div`
  border: 1px solid #eceff2;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: none;
`

export const KpiLabel = styled.div`
  font-size: 12px;
  color: #5f6368;
`

export const KpiValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #202124;
`

export const MainGrid = styled.div<{ $noSidebar?: boolean }>`
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: ${({ $noSidebar }) =>
    $noSidebar ? '15% minmax(0, 1fr)' : '15% 30% minmax(0, 1fr)'};
  column-gap: 0;
  align-items: start;
  min-height: inherit;

  @media (max-width: 1280px) {
    grid-template-columns: ${({ $noSidebar }) =>
      $noSidebar ? '35% minmax(0, 1fr)' : '18% 35% minmax(0, 1fr)'};
    column-gap: 0; /* 반응형에서도 보더가 겹치지 않도록 */
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr; /* 태블릿/모바일에서는 리스트 숨김 */
    row-gap: 12px;
    padding: 0; /* 여백 제거 */
  }
`

export const ListPane = styled.div<{ $inHistory?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100vh - var(--header-height));
  max-height: calc(100vh - var(--header-height));
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  position: sticky;
  top: var(--header-height);
  border-right: 1px solid var(--border-color);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
  overflow: hidden;

  @media (max-width: 1024px) {
    display: none; /* 태블릿/모바일에서는 숨기고 MobileListPane 사용 */
  }
`

// Mobile List Styles
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
    background: #fff;
    border-radius: 20px 20px 0 0;
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  }
`

export const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 8px auto 4px;
  cursor: grab;
  transition: background 0.2s ease;

  &:active {
    cursor: grabbing;
    background: rgba(0, 0, 0, 0.3);
  }
`

export const MobileListHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

export const MobileListTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%)'
      : 'rgba(0, 0, 0, 0.04)'};
  color: ${({ $active }) => ($active ? '#fff' : '#3c4043')};
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
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  background: rgba(173, 70, 255, 0.05);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(173, 70, 255, 0.1);
    border-color: var(--color-primary);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    flex-shrink: 0;
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
  color: #5f6368;
  line-height: 1.5;
`

export const MobileListTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #202124;
  letter-spacing: -0.02em;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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
    ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'rgba(0, 0, 0, 0.12)'};
  border-radius: 10px;
  background: ${({ $active }) =>
    $active ? 'rgba(173, 70, 255, 0.08)' : '#fff'};
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#202124')};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    opacity: ${({ $active }) => ($active ? '1' : '0.6')};
  }

  &:hover {
    border-color: var(--color-primary);
    background: rgba(173, 70, 255, 0.06);
  }

  &:active {
    transform: scale(0.96);
  }
`

export const MobileClearButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 14px;
  height: 36px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: #f8f9fa;
  color: #5f6368;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;

  &:hover {
    background: #e8eaed;
    color: #202124;
  }

  &:active {
    transform: scale(0.96);
  }
`

export const MobileListClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #70757a;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #202124;
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

export const MobileViewSwitcher = styled.div`
  display: none;
`

export const ViewSwitchButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%)'
      : 'rgba(0, 0, 0, 0.04)'};
  color: ${({ $active }) => ($active ? '#fff' : '#5f6368')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    flex-shrink: 0;
  }

  &:active {
    opacity: 0.8;
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

/* 검색/필터 제거로 미사용 */

export const TabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0 2px;
  background: transparent;
  overflow-x: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    display: none;
  }
`

export const TabButton = styled.button<{ $active?: boolean }>`
  padding: 12px 16px;
  border-radius: 10px 10px 0 0;
  border: none;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)'
      : 'transparent'};
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#70757a')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  &:hover {
    color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#3c4043')};
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)'
        : 'linear-gradient(180deg, #f8f9fa 0%, #f1f3f5 100%)'};
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-300) 100%)'
        : 'transparent'};
    border-radius: 3px 3px 0 0;
    transition: all 0.3s ease;
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 12px;
    gap: 6px;
  }

  @media (max-width: 480px) {
    padding: 8px 10px;
    font-size: 11px;
  }
`

export const TabBadge = styled.span`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f0fe 0%, #d3e3fd 100%);
  color: #1967d2;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(25, 103, 210, 0.15);
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

// Mobile Menu Styles
export const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #3c4043;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::before {
    opacity: 1;
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    position: relative;
    z-index: 1;
  }

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
    background: #fff;
    border-radius: 20px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.12),
      0 0 1px rgba(0, 0, 0, 0.1);
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

export const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
`

export const MobileMenuTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #202124;
  letter-spacing: -0.02em;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`

export const MobileMenuClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #70757a;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #202124;
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

export const MobileMenuContent = styled.div`
  flex: 1;
  padding: 8px 12px 16px;
  overflow-y: auto;
  background: #fff;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
  }
`

export const MobileMenuItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 14px;
  margin-bottom: 4px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'rgba(173, 70, 255, 0.06)' : 'transparent'};
  border: 1px solid transparent;
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#202124')};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  text-align: left;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-primary);
    opacity: ${({ $active }) => ($active ? '1' : '0')};
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(173, 70, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
    transform: translateX(2px);

    &::before {
      opacity: ${({ $active }) => ($active ? '1' : '0.5')};
    }
  }

  &:active {
    transform: scale(0.98);
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
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
`

export const MobileMenuDivider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 12px 0;
`

export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  border-bottom: 1px solid var(--border-color-light);
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
`

export const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  position: sticky;
  top: 57px;
  z-index: 2;
  background: #ffffff;
  border-bottom: 1px solid var(--border-color-light);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 10px 8px;
    gap: 8px;
    top: 47px;
  }

  @media (max-width: 480px) {
    padding: 8px 6px;
    gap: 6px;
  }
`

export const ControlsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const ControlsRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const AddIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(173, 70, 255, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(173, 70, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(173, 70, 255, 0.3);
  }

  svg {
    flex-shrink: 0;
  }
`

export const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap; /* 작은 화면에서 자동 줄바꿈 */

  @media (max-width: 1024px) {
    gap: 6px;
  }

  @media (max-width: 768px) {
    width: 100%;
    gap: 6px;
    /* 가로 스크롤 대신 wrap으로 여러 줄 표시 */
  }

  @media (max-width: 480px) {
    gap: 4px;
  }
`

export const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  @media (max-width: 1024px) {
    min-width: 180px;
    max-width: 300px;
  }

  @media (max-width: 768px) {
    /* 작은 화면에서는 전체 너비 사용하지 않고 flex로 조정 */
    min-width: 150px;
    max-width: 100%;
    flex: 1 1 auto;
  }

  @media (max-width: 480px) {
    /* 매우 작은 화면에서만 전체 너비 */
    min-width: 100%;
    flex-basis: 100%;
  }
`

export const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  pointer-events: none;
  z-index: 1;
`

export const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 36px 0 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: #202124;
  background: #ffffff;
  transition: all 0.2s ease;

  &::placeholder {
    color: #9aa0a6;
  }

  &:hover {
    border-color: var(--border-color-hover);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow:
      0 0 0 3px rgba(173, 70, 255, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    height: 36px;
    font-size: 13px;
    padding: 0 32px 0 36px;
  }

  @media (max-width: 480px) {
    height: 34px;
    font-size: 12px;
    padding: 0 28px 0 32px;
  }
`

export const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f3f4;
    color: #202124;
  }

  &:active {
    background: #e8eaed;
    transform: scale(0.95);
  }
`

export const MobileSearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(173, 70, 255, 0.1);
  }

  ${SearchIcon} {
    position: static;
    left: auto;
    margin-right: 8px;
  }

  ${SearchInput} {
    height: auto;
    padding: 0;
    padding-right: 32px;
    border: none;
    background: transparent;
    box-shadow: none !important;

    &:hover {
      border: none;
      box-shadow: none;
    }

    &:focus {
      border: none;
      box-shadow: none;
    }
  }

  ${ClearButton} {
    position: static;
    right: auto;
    margin-left: 8px;
  }
`

export const FilterSelect = styled.select<{ $active?: boolean }>`
  height: 40px;
  padding: 0 36px 0 14px;
  min-width: 140px;
  border: 1px solid
    ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'var(--border-color)'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
  background: ${({ $active }) => ($active ? '#f3e8ff' : '#ffffff')}
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%235f6368'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")
    no-repeat right 12px center;
  background-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 3px rgba(173, 70, 255, 0.08)' : 'none'};

  &:hover {
    border-color: var(--border-color-hover);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow:
      0 0 0 3px rgba(173, 70, 255, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
  }
`

export const ClearAllFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #5f6368;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  animation: slideIn 0.2s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &:hover {
    color: #202124;
    border-color: var(--color-primary);
    background: #f3e8ff;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
  }

  @media (max-width: 480px) {
    height: 34px;
    padding: 0 10px;
    font-size: 11px;
  }

  svg {
    opacity: 0.7;
  }
`

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 24px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    border-color: #1a1a1a;
    background: #fafafa;
  }

  &:active {
    transform: scale(0.98);
  }
`

export const AddButtonIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`

export const FilterResultBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
  border-bottom: 1px solid #d0e7ff;
  animation: slideDown 0.3s ease;
  position: sticky;
  top: 113px;
  z-index: 1;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const FilterResultText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1967d2;
  font-weight: 600;

  svg {
    color: #1e8e3e;
  }
`

export const FilterResultCount = styled.span`
  font-weight: 800;
  color: #1967d2;
  font-size: 15px;
`

export const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #5f6368;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #202124;
    border-color: var(--border-color-hover);
    background: #f8f9fa;
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    opacity: 0.7;
  }
`

export const EmptyFilterState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 40px;
  text-align: center;
  margin: 20px;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const EmptyFilterIcon = styled.div`
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.3;
  filter: grayscale(100%);
`

export const EmptyFilterTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.3px;
`

export const EmptyFilterText = styled.p`
  margin: 0 0 32px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  max-width: 380px;

  strong {
    color: #1a1a1a;
    font-weight: 600;
  }
`

export const EmptyFilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const TodayBtn = styled.button`
  border: 1px solid #dadce0;
  border-radius: 20px;
  padding: 6px 16px;
  background: none;
  color: #3c4043;
  cursor: pointer;
`

export const VirtualList = styled.div`
  border: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding-right: 6px;

  /* 커스텀 스크롤바 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 4px;

    &:hover {
      background: #bdc1c6;
    }
  }

  @media (max-width: 768px) {
    padding-right: 0; /* 모바일에서 우측 여백 제거 */
  }
`

export const ListRowMeta = styled.div`
  width: 100%;
  padding: 6px 12px 10px 48px; /* 좌측 체크/아이콘 영역만큼 들여쓰기 */
  border-bottom: 1px solid #eceef0;
  background: #fbfbfd;
  font-size: 12px;
  color: #5f6368;
`

/* 행 내부 하단 라인 스타일 (필요 시 사용) */
export const ListRowMetaInside = styled.div`
  width: 100%;
  padding: 6px 0 0 48px;
  background: transparent;
  font-size: 12px;
  color: #5f6368;
`

// FormInput을 공통 컴포넌트에서 import하여 재export
export { FormInput as Input }

export const Select = styled.select<{ $error?: boolean }>`
  border: 1px solid ${({ $error }) => ($error ? '#ea4335' : '#dadce0')};
  border-radius: 10px;
  padding: 14px 16px;
  background: ${({ $error }) => ($error ? '#fef7f7' : '#ffffff')};
  color: #202124;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
  &:focus {
    outline: none;
    border-color: ${({ $error }) =>
      $error ? '#ea4335' : 'var(--color-primary)'};
    box-shadow: ${({ $error }) =>
      $error
        ? '0 0 0 3px rgba(234, 67, 53, 0.1)'
        : '0 0 0 3px rgba(173, 70, 255, 0.1)'};
    background: #ffffff;
  }
  &:hover:not(:focus) {
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#bdc1c6')};
  }
`

export const SelectButton = styled.button<{
  $error?: boolean
  $hasValue?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid ${({ $error }) => ($error ? '#ea4335' : '#dadce0')};
  border-radius: 10px;
  padding: 14px 16px;
  background: ${({ $error }) => ($error ? '#fef7f7' : '#ffffff')};
  color: ${({ $hasValue }) => ($hasValue ? '#202124' : '#9aa0a6')};
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;

  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.6;
    transition: transform 0.2s ease;
  }

  &:hover {
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#bdc1c6')};

    svg {
      opacity: 1;
    }
  }

  &:focus {
    outline: none;
    border-color: ${({ $error }) =>
      $error ? '#ea4335' : 'var(--color-primary)'};
    box-shadow: ${({ $error }) =>
      $error
        ? '0 0 0 3px rgba(234, 67, 53, 0.1)'
        : '0 0 0 3px rgba(173, 70, 255, 0.1)'};
    background: #ffffff;
  }

  &:active {
    svg {
      transform: translateY(2px);
    }
  }
`

export const ErrorMessage = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ea4335;
  margin-top: 6px;
  font-weight: 500;

  &::before {
    content: '⚠';
    font-size: 14px;
  }
`

export const ThumbnailPreview = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
`

export const ThumbnailImage = styled.img`
  max-width: 100%;
  max-height: 160px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`

export const FileUploadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const FileUploadLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 2px dashed #dadce0;
  border-radius: 10px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    background: #f3e8ff;
  }
`

export const FileInput = styled.input`
  display: none;
`

export const FileUploadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%);
  color: #ffffff;
  flex-shrink: 0;
`

export const FileUploadText = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ListRow = styled.button<{ $active?: boolean }>`
  width: 100%;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #f6f3ff 0%, #ede7ff 100%)'
      : 'transparent'};
  border: none;
  border-bottom: 1px solid var(--border-color-light);
  cursor: pointer;
  text-align: left;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 52px;
  line-height: 1.3;
  position: relative;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-primary);
    opacity: ${({ $active }) => ($active ? '1' : '0')};
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #f6f3ff 0%, #ede7ff 100%)'
        : 'linear-gradient(135deg, #fafafa 0%, #f5f7fa 100%)'};

    &::before {
      opacity: ${({ $active }) => ($active ? '1' : '0.3')};
    }
  }

  &:active {
    transform: scale(0.99);
  }

  @media (max-width: 768px) {
    padding: 12px 12px;
    min-height: 48px;
  }

  @media (max-width: 480px) {
    padding: 10px 10px;
    min-height: 44px;
  }
`

export const RowTop = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const RowBottom = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  padding-left: 48px; /* 좌측 체크/아이콘 영역 들여쓰기 */
  margin-top: 2px; /* 상/하 줄 간 여백 */

  @media (max-width: 768px) {
    padding-left: 40px;
  }

  @media (max-width: 480px) {
    padding-left: 36px;
  }
`

export const RowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0; /* flex 컨테이너에서 overflow를 제대로 처리하기 위해 필요 */

  @media (max-width: 768px) {
    gap: 10px;
  }

  @media (max-width: 480px) {
    gap: 8px;
  }
`

export const RowCheckbox = styled.span`
  width: 14px;
  height: 14px;
  border: 1px solid #dadce0;
  border-radius: 3px;
`

export const ExpandButton = styled.button`
  width: 14px;
  height: 14px;
  border: none;
  background: none;
  color: #5f6368;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: transform 0.2s ease;

  &:hover {
    color: #202124;
  }
`

export const StarIcon = styled.span`
  font-size: 12px;
  color: #dadce0;
`

export const FlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  font-size: 18px;
  border: 1px solid var(--border-color-light);
  transition: all 0.2s ease;
  flex-shrink: 0;

  ${ListRow}:hover & {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
`

export const TextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0; /* overflow 처리를 위해 필수 */
  overflow: hidden; /* 자식 요소가 벗어나지 않도록 */
`

export const CodeText = styled.div<{ $unread?: boolean }>`
  font-size: 14px;
  font-weight: ${({ $unread }) => ($unread ? '700' : '600')};
  color: #1a1a1a;
  letter-spacing: -0.1px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 13px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
  }
`

export const NameText = styled.div`
  font-size: 13px;
  color: #70757a;
  font-weight: 400;
  letter-spacing: 0;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 12px;
  }

  @media (max-width: 480px) {
    font-size: 11px;
  }
`

export const RowRight = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

export const RadioDot = styled.span<{ $active?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active }) =>
    $active ? 'var(--color-primary)' : 'transparent'};
`

export const MetaDate = styled.span`
  font-size: 11px;
  color: #5f6368;
`

export const AttachmentDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c7cbd1;
`

export const TimeText = styled.span`
  font-size: 11px;
  color: #788087;
  min-width: 56px;
  text-align: right;
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const FlagEmoji = styled.span`
  font-size: 18px;
`

export const Title = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #202124;
`

export const Iso = styled.span`
  font-size: 12px;
  color: #5f6368;
`

export const Meta = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #5f6368;
`

export const Dot = styled.span`
  width: 4px;
  height: 4px;
  background: #9aa0a6;
  border-radius: 50%;
  display: inline-block;
`

export const DetailPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  border-left: none; /* 우측 중복 보더 제거 */

  @media (max-width: 1024px) {
    display: none; /* 모바일에서는 DetailPane 숨김 - MobileUI 사용 */
  }
`

export const DetailPaneRelative = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);

  /* 커스텀 스크롤바 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 4px;

    &:hover {
      background: #bdc1c6;
    }
  }

  @media (max-width: 768px) {
    height: auto;
  }
`

export const DetailContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

// Page Header Styles
export const PageHeader = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  background: linear-gradient(
    135deg,
    var(--color-primary-100) 0%,
    var(--color-primary-200) 100%
  );
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(173, 70, 255, 0.2);

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
  color: #1a1a1a;
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
  color: #70757a;
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
  color: #70757a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const HeaderStatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

// Global Dashboard Styles
export const GlobalDashboard = styled.div`
  padding: 32px;
  background: #fff;
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;

  @media (max-width: 1024px) {
    padding: 24px;
  }

  @media (max-width: 768px) {
    padding: 20px;
    gap: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
  }
`

export const GlobalDashboardHero = styled.div`
  position: relative;
  padding: 32px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-12);
  box-shadow: var(--shadow-soft);

  @media (max-width: 1024px) {
    padding: 28px;
  }

  @media (max-width: 768px) {
    padding: 24px;
  }

  @media (max-width: 480px) {
    padding: 20px;
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
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
`

export const HeroIcon = styled.div`
  font-size: 56px;
  opacity: 0.6;
  filter: grayscale(100%);

  @media (max-width: 768px) {
    font-size: 48px;
  }
`

export const HeroTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`

export const HeroTitle = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.8px;

  @media (max-width: 1024px) {
    font-size: 28px;
  }

  @media (max-width: 768px) {
    font-size: 24px;
  }

  @media (max-width: 480px) {
    font-size: 20px;
  }
`

export const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  color: #666;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 480px) {
    font-size: 13px;
  }
`

export const DashboardSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 16px 0;
  background: transparent;

  @media (max-width: 768px) {
    padding: 0 0 12px 0;
  }
`

export const SectionTitleIcon = styled.div`
  font-size: 24px;
`

export const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.5px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  @media (max-width: 768px) {
    font-size: 20px;
  }

  @media (max-width: 480px) {
    font-size: 18px;
  }
`

export const GlobalMetricsGrid = styled.div`
  display: flex;
  flex-wrap: nowrap;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-12);
  box-shadow: var(--shadow-soft);
  overflow: hidden;

  @media (min-width: 769px) and (max-width: 1024px) {
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    flex-wrap: nowrap;
  }
`

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
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-12);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 1024px) {
    padding: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
  }
`

export const GlobalWidgetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-color-light);
`

export const GlobalWidgetIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    var(--color-primary-100) 0%,
    var(--color-primary-200) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(173, 70, 255, 0.15);
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`

export const GlobalWidgetTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.1px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const GlobalWidgetContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
`

export const GlobalMetricCard = styled.div`
  background: transparent;
  border-right: 1px solid var(--border-color);
  padding: 20px 24px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  transition: all 0.3s ease;
  position: relative;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    flex: 0 0 calc(50% - 0.5px);
    padding: 18px 20px 16px;

    &:nth-child(2n) {
      border-right: none;
    }

    &:nth-child(n + 3) {
      border-top: 1px solid var(--border-color);
    }
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    flex-basis: 100%;
    padding: 20px;

    &:last-child {
      border-bottom: none;
    }
  }

  @media (max-width: 480px) {
    padding: 18px 16px;
  }
`

export const GlobalMetricIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #5f6368;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s ease;

  svg {
    width: 22px;
    height: 22px;
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    width: 32px;
    height: 32px;

    svg {
      width: 20px;
      height: 20px;
    }
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
  color: #5f6368;
  text-transform: none;
  letter-spacing: 0;
  line-height: 1.4;
`

export const GlobalMetricValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  @media (min-width: 769px) and (max-width: 1024px) {
    font-size: 24px;
  }

  @media (max-width: 768px) {
    font-size: 24px;
  }

  @media (max-width: 480px) {
    font-size: 22px;
  }
`

export const GlobalMetricSubtext = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: #9aa0a6;
  line-height: 1.4;
`

// Empty Global State
export const EmptyGlobalState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 48px;
  text-align: center;
  min-height: 500px;
`

export const EmptyGlobalIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.3;
  filter: grayscale(100%);
`

export const EmptyGlobalTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.4px;
`

export const EmptyGlobalDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  max-width: 380px;
`

// Dashboard View
export const DashboardView = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #fff;
`

export const DashboardContent = styled.div`
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    padding: 24px;
  }

  @media (max-width: 768px) {
    padding: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
  }
`

export const StatsSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }
`

export const StatsCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e8eaed;
  transition: all 0.2s ease;

  &:hover {
    background: #fff;
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 12px;
  }

  @media (max-width: 480px) {
    padding: 14px;
    gap: 10px;
  }
`

export const StatsIcon = styled.div`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: #fff;

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`

export const StatsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const StatsLabel = styled.div`
  font-size: 13px;
  color: #666;
  font-weight: 500;

  @media (max-width: 480px) {
    font-size: 12px;
  }
`

export const StatsValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 18px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`

export const DashboardHeader = styled.div`
  margin-bottom: 32px;
`

export const DashboardTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.5px;
`

export const DashboardSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
`

export const DashboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;

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
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;

  @media (max-width: 480px) {
    display: none;
  }
`

export const DashboardTh = styled.th<{ align?: string }>`
  padding: 14px 16px;
  text-align: ${(props) => props.align || 'left'};
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 12px 12px;
    font-size: 11px;
  }

  @media (max-width: 480px) {
    padding: 10px 8px;
    font-size: 10px;
  }
`

export const DashboardTr = styled.tr`
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s ease;

  &:hover {
    background: #fafafa;
  }

  &:last-child {
    border-bottom: none;
  }
`

export const DashboardTd = styled.td<{ align?: string }>`
  padding: 16px;
  font-size: 14px;
  color: #1a1a1a;
  text-align: ${(props) => props.align || 'left'};
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 12px;
    font-size: 13px;
  }

  @media (max-width: 480px) {
    padding: 10px 8px;
    font-size: 12px;
    white-space: normal;
    display: block;
    text-align: left !important;

    &:before {
      content: attr(data-label);
      font-weight: 600;
      display: inline-block;
      margin-right: 8px;
      color: #666;
    }
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
  font-weight: 500;
  color: #1a1a1a;
`

export const CountryLocalName = styled.div`
  font-size: 12px;
  color: #999;
`

export const IsoCode = styled.code`
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #666;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
`

export const ContinentBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  background: #f5f5f5;
  border-radius: 6px;
`

// Loading Styles
export const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: ${Z_INDEX.LOADING_OVERLAY};
`

export const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #6b7280;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const LoadingSpinnerInner = styled.div`
  display: none;
`

export const LoadingText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.01em;
`

export const EmptyDetail = styled.div`
  padding: 16px;
  color: #9aa0a6;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  background: transparent;
`

export const OverviewCard = styled.div`
  border: 1px solid var(--border-color);
  border-radius: var(--radius-12);
  padding: 12px 14px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--shadow-soft);
`

export const OverviewTitle = styled.div`
  font-size: 13px;
  color: #5f6368;
`

export const OverviewValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #202124;
`

export const ChartBox = styled.div`
  border: 1px solid var(--border-color);
  border-radius: var(--radius-12);
  padding: 12px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 180px;
  box-shadow: var(--shadow-soft);
`

export const DetailCard = styled.div`
  padding: 16px;
  background: #f6f7f9; /* 이미지처럼 회색 배경 */
  border: none; /* 카드 테두리 제거 */
  box-shadow: none; /* 섀도우 제거 */
  border-radius: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const DetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
  border-bottom: none;
`

export const SectionTitle = styled.h3`
  margin: 0 0 24px 0;
  padding: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.05em;
  line-height: 1.4;
  text-transform: uppercase;
  border-bottom: 2px solid #e2e8f0;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

export const DetailFooter = styled.div`
  padding-top: 8px;
`

export const DetailHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 4px 10px 4px;
  position: sticky;
  top: 0;
  background: #f6f7f9; /* 배경 회색과 자연스럽게 */
  border-bottom: 1px solid #eceff2;
  z-index: 1;
`

export const HeaderLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const DetailTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #202124;
`

export const DetailIso = styled.div`
  font-size: 12px;
  color: #5f6368;
`

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const DetailField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: transparent; /* 이미지처럼 플랫 */
  border: none;
  padding: 0;
  box-shadow: none;
`

export const FieldLabel = styled.div`
  font-size: 11px;
  color: #5f6368;
`

export const FieldValue = styled.div`
  font-size: 13px;
  color: #202124;
`

export const DetailActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
`

export const ActionButton = styled.button`
  border: 1px solid var(--color-primary-300);
  background: var(--color-primary-100);
  color: var(--color-primary);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
`

export const More = styled.button`
  background: transparent;
  border: none;
  color: #5f6368;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #f1f3f4;
  }
`

// Side Panel Styles
export const SidePanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  z-index: ${Z_INDEX.DRAWER_OVERLAY};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
`

export const SidePanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(600px, calc(100% - 40px));
  background: #ffffff;
  box-shadow:
    -4px 0 24px rgba(0, 0, 0, 0.12),
    -2px 0 8px rgba(0, 0, 0, 0.08);
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  display: flex;
  flex-direction: column;
`

export const SidePanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid var(--border-color-light);
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
`

export const SidePanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #202124;
  letter-spacing: -0.2px;
`

export const RequiredFieldsNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: #fff9e6;
  border-bottom: 2px solid #ffd54f;
`

export const RequiredFieldsIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #f57c00;
  font-size: 18px;
`

export const RequiredFieldsText = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5f6368;
`

export const RequiredFieldsTitle = styled.span`
  font-weight: 600;
  color: #f57c00;
`

export const RequiredFieldsList = styled.span`
  font-weight: 500;
`

export const RequiredFieldItem = styled.span<{ $completed?: boolean }>`
  color: ${({ $completed }) => ($completed ? '#1e8e3e' : 'inherit')};
  text-decoration: ${({ $completed }) =>
    $completed ? 'line-through' : 'none'};
  opacity: ${({ $completed }) => ($completed ? '0.6' : '1')};
`

export const RequiredFieldCheckbox = styled.div`
  display: none;
`

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f3f4;
    color: #202124;
  }

  &:active {
    background: #e8eaed;
    transform: scale(0.95);
  }
`

export const SidePanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color-light);

  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }
`

export const FormSectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

export const FormSectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%);
  color: var(--color-primary);
`

export const FormSectionTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #202124;
  letter-spacing: -0.2px;
`

export const FormSectionDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: #5f6368;
  line-height: 1.5;
`

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #202124;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const RequiredStar = styled.span`
  color: #ea4335;
  font-size: 14px;
  font-weight: 700;
`

export const FlagImagePreview = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const FlagImage = styled.img`
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

export const SidePanelFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid var(--border-color-light);
  background: #fafbfc;
`

export const SubmitButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(173, 70, 255, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(173, 70, 255, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(173, 70, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(135deg, #9aa0a6 0%, #80868b 100%);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    transform: none;
  }

  svg {
    flex-shrink: 0;
  }
`

export const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid
    ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'var(--border-color)'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? 'var(--color-primary)' : '#5f6368')};
  background: ${({ $active }) => ($active ? '#f3e8ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 3px rgba(173, 70, 255, 0.08)' : 'none'};
  flex-shrink: 0; /* 버튼이 찌그러지지 않도록 */

  &:hover {
    border-color: var(--color-primary);
    background: #f3e8ff;
    color: var(--color-primary);
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 1024px) {
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    gap: 6px;
  }

  @media (max-width: 768px) {
    height: 36px;
    padding: 0 10px;
    font-size: 12px;
    gap: 5px;
  }

  @media (max-width: 480px) {
    height: 32px;
    padding: 0 8px;
    font-size: 11px;
    gap: 4px;
  }

  svg {
    flex-shrink: 0;
    
    @media (max-width: 768px) {
      width: 16px;
      height: 16px;
    }
    
    @media (max-width: 480px) {
      width: 14px;
      height: 14px;
    }
  }
`

// Select Modal Styles
export const SelectModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(4px);
`

export const SelectModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(440px, calc(100% - 40px));
  max-height: 80vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e5e7eb;

  /* framer-motion transform 보정 */
  &[style*='transform'] {
    transform: translate(-50%, -50%) !important;
  }
`

export const SelectModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color-light);
  background: #fafbfc;
`

export const SelectModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #202124;
`

export const SelectModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f3f4;
    color: #202124;
  }

  &:active {
    background: #e8eaed;
    transform: scale(0.95);
  }
`

export const SelectModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`

export const SelectOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border: none;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #f3e8ff 0%, #efe9ff 100%)'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#ad46ff' : '#374151')};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #e9d1ff 0%, #e5dbff 100%)'
        : '#f9fafb'};
  }

  &:active {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #e0c2ff 0%, #dbd0ff 100%)'
        : '#f3f4f6'};
  }
`

export const SelectOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%);
  color: var(--color-primary);
`

export const SelectOptionText = styled.span`
  flex: 1;
  font-size: 15px;
  font-weight: 500;
`

export const SelectOptionCheck = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
`

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.7;
`

export const EmptyTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #202124;
`

export const EmptyDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: #5f6368;
`

export const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;re
  gap: 8px;
`

// Analytics Dashboard Styles
export const AnalyticsDashboard = styled.div`
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 16px;

  @media (max-width: 768px) {
    padding: 20px;
    gap: 20px;
  }
`

export const DashboardSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 24px 32px;

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    padding: 20px 28px;
    gap: 14px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 20px 24px;
    gap: 12px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 16px 20px;
    gap: 10px;
  }
`

export const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailLabel = styled.div`
  font-size: 13px;
  color: #666;
  font-weight: 500;
`

export const DetailValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 10px;
  border-bottom: none;
`

export const SectionHeaderTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.2px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const MetricCard = styled.div<{ $accent?: string }>`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-right: 1px solid var(--border-color);
  padding: 20px 24px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: none;
  position: relative;
  cursor: default;
  transition: all 0.3s ease;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  }

  @media (max-width: 1024px) {
    padding: 18px 20px 16px;

    &:nth-child(2n) {
      border-right: none;
    }

    &:nth-child(n + 3) {
      border-top: 1px solid var(--border-color);
    }
  }

  @media (max-width: 640px) {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 16px 20px;

    &:last-child {
      border-bottom: none;
    }
  }

  @media (max-width: 480px) {
    padding: 14px 16px;
  }
`

export const MetricIconWrapper = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #5f6368;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
`

export const MetricValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  @media (max-width: 768px) {
    font-size: 24px;
  }

  @media (max-width: 480px) {
    font-size: 22px;
  }
`

export const MetricLabel = styled.div`
  font-size: 10px;
  color: #70757a;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronCard = styled.div`
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 16px 16px;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  min-height: 400px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      var(--color-primary) 0%,
      var(--color-primary-300) 100%
    );
  }

  @media (max-width: 1024px) {
    padding: 36px 32px;
    gap: 28px;
    min-height: 350px;
  }

  @media (max-width: 768px) {
    padding: 28px 24px;
    gap: 24px;
    min-height: 300px;
  }

  @media (max-width: 480px) {
    padding: 20px 16px;
    gap: 20px;
    min-height: auto;
  }
`

export const JumbotronHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

export const JumbotronTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
`

export const JumbotronFlagIcon = styled.div`
  font-size: 48px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`

export const JumbotronBadge = styled.div`
  padding: 8px 18px;
  background: linear-gradient(135deg, #e8f0fe 0%, #d3e3fd 100%);
  color: #1967d2;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(25, 103, 210, 0.15);
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronDivider = styled.div`
  height: 1px;
  background: var(--border-color-light);
  margin: 4px 0;
`

export const JumbotronStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const InfoGraphicCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border-color: var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 12px;
  }

  @media (max-width: 480px) {
    padding: 14px;
    gap: 10px;
  }
`

export const InfoGraphicIcon = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 10px;
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(173, 70, 255, 0.15);
`

export const InfoGraphicContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`

export const InfoGraphicLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const InfoGraphicValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #202124;
  line-height: 1.4;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronTitle = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.8px;
  line-height: 1.2;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronSubtitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #70757a;
  letter-spacing: 0.2px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronDescription = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  color: #3c4043;
  line-height: 1.7;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const JumbotronStatLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const JumbotronStatValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #202124;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const DashboardGrid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

export const DashboardGrid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

export const DashboardWidget = styled.div`
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;

  &:hover {
    background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
    border-color: var(--border-color-hover);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
`

export const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: none;
`

export const WidgetHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const WidgetIconCircle = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #5f6368;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
`

export const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.1px;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const WidgetContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
`

export const WidgetEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  flex: 1;
  min-height: 100px;
`

export const EmptyIconSvg = styled.div`
  color: #5f6368;
  opacity: 0.3;
`

export const EmptyText = styled.div`
  font-size: 12px;
  color: #5f6368;
  font-weight: 400;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const EmptySubtext = styled.div`
  font-size: 11px;
  color: #9aa0a6;
  text-align: center;
  max-width: 200px;
  line-height: 1.4;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const LocationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
`

export const LocationItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: transparent;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f8f9fa;
  }
`

export const LocationDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
`

export const LocationName = styled.div`
  flex: 1;
  font-size: 12px;
  color: #202124;
  font-weight: 400;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const LocationValue = styled.div`
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const AgeChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
`

export const AgeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const AgeLabel = styled.div`
  min-width: 50px;
  font-size: 12px;
  color: #5f6368;
  font-weight: 400;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const AgeProgress = styled.div<{ $percent: number }>`
  flex: 1;
  height: 8px;
  background: #f1f3f4;
  border-radius: 4px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${({ $percent }) => $percent}%;
    background: var(--color-primary);
    border-radius: 4px;
  }
`

export const SalesValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #202124;
  padding: 0 0 4px;
  letter-spacing: -0.01em;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const ChartPlaceholder = styled.div`
  position: relative;
  height: 100px;
  background: #f8f9fa;
  border-radius: 6px;
  overflow: hidden;
  border: none;
`

export const ChartLine = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);

  &::before {
    content: '';
    position: absolute;
    left: 20%;
    bottom: 0;
    width: 60%;
    height: 40px;
    background: linear-gradient(
      to bottom,
      var(--color-primary-100),
      transparent
    );
    border-radius: 50% 50% 0 0;
  }
`

export const ChartLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 0;
  border-top: none;
`

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

export const LegendLabel = styled.div`
  font-size: 11px;
  color: #5f6368;
  font-weight: 400;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

export const ImageScrollContainer = styled.div`
  width: 100%;
  overflow: hidden;
  position: relative;
`

export const ImageScrollWrapper = styled.div`
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 4px 0 16px 0;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #bdc1c6;
  }
`

export const ImageCard = styled.div`
  flex: 0 0 300px;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--color-primary);
  }
`

export const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #70757a;
  transition: all 0.3s ease;

  ${ImageCard}:hover & {
    background: linear-gradient(135deg, #e8f0fe 0%, #d3e3fd 100%);
    color: var(--color-primary);
  }
`

export const ImageLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #202124;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
  transition: color 0.3s ease;

  ${ImageCard}:hover & {
    color: var(--color-primary);
  }
`

// Dashboard Summary Styles
export const DashboardSummary = styled.div`
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
`

export const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #fff 0%, #fafbfc 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.25s;

  &:hover {
    border-color: #0f172a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`

export const SummaryIcon = styled.div`
  font-size: 32px;
  margin-bottom: 8px;
  filter: grayscale(0.3);
`

export const SummaryValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
`

export const SummaryLabel = styled.div`
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const QuickActions = styled.div`
  margin-top: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`

export const QuickActionTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const QuickActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);

  &:hover {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    stroke: #fff;
  }
`
