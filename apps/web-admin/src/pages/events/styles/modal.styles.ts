/**
 * Modal Styled Components
 * 모달 관련 스타일 — ledger polish 톤(평면, transform/lift 제거).
 */
import styled, { css } from 'styled-components'

import { BRAND, MOTION, SHADOW } from './theme'

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
`

/* Modal — radius 24 → 14 (admin 톤), shadow는 토큰 사용. */
export const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 14px;
  z-index: 1001;
  width: 90%;
  max-width: 480px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(20, 20, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: ${SHADOW.modalDark};
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: #ffffff;
    border: 1px solid rgba(20, 19, 34, 0.06);
    box-shadow: ${SHADOW.modal};
  `}
`

export const ModalHeader = styled.div`
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  ` : css`
    border-bottom: 1px solid rgba(37, 99, 235, 0.1);
  `}
`

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const ModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background ${MOTION.fast}, color ${MOTION.fast};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : BRAND.primarySoftHover};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const ModalContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.2); border-radius: 3px; }
`

/* 평면 톤 — gradient/box-shadow lift 제거. radius 14 → 10. */
export const ModalOption = styled.button<{ $active: boolean }>`
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  div { display: flex; flex-direction: column; gap: 4px; }
  ${({ theme, $active }) => theme.mode === 'dark' ? css`
    background: ${$active ? BRAND.primarySoftDark : 'rgba(255,255,255,0.04)'};
    border: 1px solid ${$active ? BRAND.primaryBorderHover : 'rgba(255,255,255,0.08)'};
    strong { font-size: 14px; font-weight: 600; color: ${$active ? BRAND.primaryTextOnDark : '#e2e8f0'}; }
    span { font-size: 12px; color: #64748b; }
    &:hover {
      border-color: ${BRAND.primaryBorder};
      background: ${$active ? BRAND.primaryFillDark : 'rgba(255,255,255,0.07)'};
    }
  ` : css`
    background: ${$active ? BRAND.primarySoft : '#ffffff'};
    border: 1px solid ${$active ? BRAND.primaryBorderHover : 'rgba(20, 19, 34, 0.08)'};
    strong { font-size: 14px; font-weight: 600; color: #0f172a; }
    span { font-size: 12px; color: #6b7280; }
    &:hover {
      border-color: ${BRAND.primaryBorder};
      background: ${$active ? BRAND.primarySoftHover : '#f8fafc'};
    }
  `}

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const ModalOptionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 20px; height: 20px; }
`

export const SummaryModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 14px;
  z-index: 1001;
  width: 90%;
  max-width: 1000px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  @media (max-width: 768px) {
    width: 100%;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 32px);
    border-radius: 12px;
  }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(15, 15, 20, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: ${SHADOW.modalDark};
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: #ffffff;
    border: 1px solid rgba(20, 19, 34, 0.06);
    box-shadow: ${SHADOW.modal};
  `}
`

export const SummarySubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

export const SummaryTabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-bottom: 1px solid rgba(37, 99, 235, 0.1);
    background: #fafbff;
  `}
`

export const SummaryTab = styled.button<{ $active: boolean }>`
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    color ${MOTION.fast};
  display: flex;
  align-items: center;
  gap: 8px;
  ${({ theme, $active }) => theme.mode === 'dark' ? css`
    background: ${$active ? BRAND.primarySoftDark : 'transparent'};
    border: 1px solid ${$active ? BRAND.primaryBorderHover : 'rgba(255,255,255,0.07)'};
    color: ${$active ? BRAND.primaryTextOnDark : '#64748b'};
    &:hover { border-color: ${BRAND.primaryBorder}; background: ${$active ? BRAND.primaryFillDark : 'rgba(255,255,255,0.05)'}; }
  ` : css`
    background: ${$active ? BRAND.primarySoft : '#ffffff'};
    border: 1px solid ${$active ? BRAND.primaryBorderHover : 'rgba(20, 19, 34, 0.08)'};
    color: ${$active ? BRAND.primaryHover : '#64748b'};
    &:hover { border-color: ${BRAND.primaryBorder}; background: ${$active ? BRAND.primarySoftHover : '#f8fafc'}; }
  `}

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const SummaryContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(37, 99, 235, 0.04); }
  &::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.3); }
`

export const TimelineContainer = styled.div`
  position: relative;
  padding-left: 32px;

  &::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0.25) 50%, rgba(37, 99, 235, 0.2) 100%);
    border-radius: 999px;
  }
`

/* 평면 톤 — hover lift box-shadow 변화 제거. 도트 외곽 링은 surface 무관 단색 사용. */
export const TimelineEventCard = styled.div<{ $depth: number }>`
  position: relative;
  padding: 14px 16px;
  margin-bottom: 16px;
  margin-left: ${({ $depth }) => $depth * 24}px;
  border-radius: 12px;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast};
  ${({ theme, $depth }) => theme.mode === 'dark' ? css`
    background: ${$depth === 0 ? BRAND.primarySoftDark : 'rgba(255,255,255,0.04)'};
    border: 1px solid rgba(37, 99, 235, 0.15);
    &:hover { border-color: ${BRAND.primaryBorder}; }
  ` : css`
    background: ${$depth === 0 ? BRAND.primarySoft : '#ffffff'};
    border: 1px solid rgba(37, 99, 235, 0.15);
    box-shadow: ${SHADOW.xs};
    &:hover { border-color: ${BRAND.primaryBorder}; }
  `}

  &::before {
    content: '';
    position: absolute;
    left: -32px;
    top: 24px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $depth }) => ($depth === 0 ? BRAND.primary : 'transparent')};
    border: 3px solid
      ${({ $depth }) => ($depth === 0 ? BRAND.primary : BRAND.primaryBorderHover)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const TimelineEventDate = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 6px;
`

export const TimelineEventTitle = styled.h4`
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TimelineEventSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TimelineImportance = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(37, 99, 235, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#2563eb'
    }
  }};
`

export const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const TreeNodeWrapper = styled.div<{ $depth: number }>`
  margin-left: ${({ $depth }) => $depth * 32}px;
  position: relative;

  ${({ $depth }) => $depth > 0 && `
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 20px;
      width: 12px;
      height: 2px;
      background: rgba(37, 99, 235, 0.25);
    }

    &::after {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 50%;
      width: 2px;
      background: rgba(37, 99, 235, 0.15);
    }
  `}
`

/* 평면 톤 — hover translateX/box-shadow lift 모두 제거. 보더 컬러만 변화. */
export const TreeNodeCard = styled.div<{
  $depth: number
  $importance: 'critical' | 'major' | 'notable'
}>`
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast};
  border: 1.5px solid ${({ $importance }) => {
    switch ($importance) {
      case 'critical':
        return 'rgba(239, 68, 68, 0.3)'
      case 'major':
        return 'rgba(251, 191, 36, 0.35)'
      default:
        return 'rgba(37, 99, 235, 0.2)'
    }
  }};
  ${({ theme, $depth }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$depth === 0
            ? BRAND.primarySoftDark
            : 'rgba(255,255,255,0.04)'};
          &:hover {
            border-color: ${BRAND.primaryBorderHover};
          }
        `
      : css`
          background: ${$depth === 0 ? BRAND.primarySoft : '#ffffff'};
          box-shadow: ${SHADOW.xs};
          &:hover {
            border-color: ${BRAND.primaryBorderHover};
            background: #fafbfd;
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const TreeNodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

export const TreeNodeTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  flex: 1;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TreeImportanceBadge = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(37, 99, 235, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#2563eb'
    }
  }};
`

export const TreeNodeDate = styled.div`
  font-size: 12px;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 6px;
`

export const TreeNodeSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TreeNodeChildren = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const SummaryIconButton = styled.button`
  border: none;
  background: ${BRAND.primarySoftHover};
  padding: 4px 6px;
  border-radius: 6px;
  color: ${BRAND.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast};
  flex-shrink: 0;
  margin-left: 6px;

  &:hover {
    background: ${BRAND.primaryFill};
    color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 평면 톤 — hover translateY 제거. */
export const ViewAllHierarchyButton = styled.button`
  border-radius: 8px;
  padding: 10px 14px;
  color: ${BRAND.primary};
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  width: 100%;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid ${BRAND.primaryBorder};
          &:hover {
            background: ${BRAND.primarySoftDark};
            border-color: ${BRAND.primaryBorderHover};
          }
        `
      : css`
          background: ${BRAND.primarySoft};
          border: 1px solid ${BRAND.primaryBorder};
          &:hover {
            background: ${BRAND.primarySoftHover};
            border-color: ${BRAND.primaryBorderHover};
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
