/**
 * 인물 등록 뷰 모달(PersonRegisterViewModal)과 동일한 시각·레이어 스펙의 셸.
 * 공용 @/shared/ui/modal(glass 16px)과 구분 — 배경/블러/22px/그림자가 다름.
 */
import React from 'react'

import { motion } from 'framer-motion'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export const PersonRegisterModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.38);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(10px);
`

export const PersonRegisterModalBox = styled(motion.div)<{
  /** 기본: min(1200px, 96vw) — 좁은 폼은 min(520px, 96vw) 등 */
  $maxWidth?: string
  /** 기본 560px — 짧은 폼은 auto */
  $minHeight?: string
  /**
   * 지정 시 `height: min(값, 92vh)` 로 바깥 박스 높이 고정(탭 전환 등).
   * 콘텐츠는 `PersonRegisterModalFormScroll` 안에서만 스크롤.
   */
  $height?: string
}>`
  width: ${({ $maxWidth }) => $maxWidth ?? 'min(1200px, 96vw)'};
  max-height: min(92vh, 1200px);
  ${({ $height, $minHeight }) =>
    $height
      ? `
    height: min(${$height}, 92vh);
    min-height: min(${$height}, 92vh);
  `
      : `
    min-height: ${$minHeight ?? '560px'};
  `}
  border-radius: 22px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
    background: rgba(20, 20, 20, 0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  `
      : `
    background: #ffffff;
    box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.2);
  `}
`

export const PersonRegisterModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  flex-shrink: 0;
`

export const PersonRegisterModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
`

export const PersonRegisterModalCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PersonRegisterModalFormScrollBase = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
    border-radius: 3px;
  }
`

export const PersonRegisterModalFormScroll = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>((props, ref) => (
  <PersonRegisterModalFormScrollBase ref={ref} {...props} />
))

/** 스크롤 밖 하단 고정 — `PersonRegisterModalBox` flex 열에서 `FormScroll` 아래 */
export const PersonRegisterModalStickyFooter = styled.div`
  flex-shrink: 0;
  padding: 20px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`

/** person-register-modal.tsx FormDesc와 동일 */
export const PersonRegisterModalFormDesc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const PersonRegisterModalField = styled.div`
  margin-bottom: 20px;
`

export const PersonRegisterModalLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
`

/** person-register-modal.tsx FormActions와 동일 */
export const PersonRegisterModalFormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const PersonRegisterModalPrimaryBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const PersonRegisterModalCancelBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

/** person-register-modal Input과 동일한 테두리·반경 (textarea) */
export const PersonRegisterModalTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
