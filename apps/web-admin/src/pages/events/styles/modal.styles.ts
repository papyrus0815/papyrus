/**
 * Modal Styled Components
 * 모달 관련 스타일 — ledger polish 톤(평면, transform/lift 제거).
 */
import styled, { css } from 'styled-components'

import { glassCardMixin } from '@/shared/styles/mixins'

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
  ${({ theme }) => glassCardMixin(theme)}
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 16px;
  z-index: 1001;
  width: 90%;
  max-width: 480px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  ${({ theme }) => glassCardMixin(theme)}
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 16px;
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
`

export const SummarySubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
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
  /* 소비처가 onSelectNode를 주면 as="button"으로 승격된다(tree-view). 버튼 기본 표면·
     정렬·폰트를 지워 div일 때와 픽셀이 같게 유지한다. */
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  &:is(button) {
    cursor: pointer;
  }
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
