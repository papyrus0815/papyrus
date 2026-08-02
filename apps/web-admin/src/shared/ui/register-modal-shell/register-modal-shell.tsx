/**
 * 등록 폼 모달의 공용 셸 — 배경/블러/그림자 톤이 정해진 정제 스타일.
 * 공용 @/shared/ui/modal(glass 16px)과 구분 — 22px radius·맥시멈 그림자 톤다운.
 *
 * 사용처: 인물·군주·정당·내각·관직·역대수반 등 등록 모달이 외곽 통일을 위해 import.
 * (export 심볼명에 'PersonRegisterModal*' 접두가 남아 있는 건 legacy — 의미는 "등록 모달 공용".)
 */
import React from 'react'

import { motion } from 'framer-motion'
import styled from 'styled-components'

import { glassCardMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'

export const PersonRegisterModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

export const PersonRegisterModalBox = styled(motion.div)<{
  /** 기본: min(960px, 96vw) — 좁은 폼은 min(520px, 96vw) 등 */
  $maxWidth?: string
  /** 기본 560px — 짧은 폼은 auto */
  $minHeight?: string
  /**
   * 지정 시 `height: min(값, 90vh)` 로 바깥 박스 높이 고정(탭 전환 등).
   * 콘텐츠는 `PersonRegisterModalFormScroll` 안에서만 스크롤.
   */
  $height?: string
  /**
   * ≤768px에서 화면을 꽉 채운다(opt-in).
   *
   * 기본값(`min(960px,96vw)` + `max-height:90vh` + 오버레이 padding 24px)은 390×844에서
   * 본문 세로가 약 630px밖에 안 남아 **같은 폼의 페이지 판(716px)보다 좁아진다**.
   * 긴 폼을 모바일에서 다룰 모달은 이 옵션을 켜서 페이지보다 넓은 지면을 확보한다.
   * `dvh`를 쓰는 이유 — 모바일 주소창 높이만큼 하단 푸터가 잘리기 때문.
   */
  $fullBleedOnMobile?: boolean
}>`
  ${({ theme }) => glassCardMixin(theme)}
  width: ${({ $maxWidth }) => $maxWidth ?? 'min(960px, 96vw)'};
  max-height: 90vh;
  ${({ $height, $minHeight }) =>
    $height
      ? `
    height: min(${$height}, 90vh);
    min-height: min(${$height}, 90vh);
  `
      : `
    min-height: ${$minHeight ?? '560px'};
  `}
  border-radius: 16px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${({ $fullBleedOnMobile }) =>
    $fullBleedOnMobile
      ? `
    @media (max-width: 768px) {
      width: 100vw;
      height: 100dvh;
      min-height: 100dvh;
      max-height: none;
      border-radius: 0;
      border: none;
    }
  `
      : ''}
`

export const PersonRegisterModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

export const PersonRegisterModalTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.005em;
`

export const PersonRegisterModalCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color 0.12s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PersonRegisterModalFormScrollBase = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px;
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
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`

export const PersonRegisterModalFormDesc = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const PersonRegisterModalField = styled.div`
  margin-bottom: 18px;
`

export const PersonRegisterModalLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`

export const PersonRegisterModalFormActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const PersonRegisterModalPrimaryBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const PersonRegisterModalCancelBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** person-register-modal Input과 동일한 테두리·반경 (textarea) — 정제 톤 */
export const PersonRegisterModalTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
