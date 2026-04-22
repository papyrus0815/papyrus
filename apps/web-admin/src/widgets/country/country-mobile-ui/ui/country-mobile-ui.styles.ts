/**
 * CountryMobileUI 전용 스타일.
 * 이전에는 country-page.styles.ts에 함께 있었으나 Phase 6 리팩토링에서 분리.
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

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

export const MobileListPane = styled(motion.div)`
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
    $active
      ? theme.colors.gradient.primary
      : theme.colors.background.secondary};
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
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: 10px;
  }
`

export const ViewSwitchButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.background.primary
        : theme.colors.background.tertiary};
  }
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
